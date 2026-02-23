import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import Media from '../models/Media.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendError,
  sendServerError
} from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads/media');
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const JPEG_QUALITY = 80;

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function getExtension(mimeType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif'
  };
  return map[mimeType] || '.jpg';
}

/**
 * Process image with sharp: resize if needed, optimize quality
 */
async function processImage(buffer, mimeType) {
  let processor = sharp(buffer);
  const metadata = await processor.metadata();

  // Skip processing for GIFs (to preserve animation)
  if (mimeType === 'image/gif') {
    return {
      buffer,
      width: metadata.width,
      height: metadata.height
    };
  }

  let width = metadata.width;
  let height = metadata.height;

  // Resize if too large
  if (width > MAX_WIDTH || height > MAX_HEIGHT) {
    const widthRatio = MAX_WIDTH / width;
    const heightRatio = MAX_HEIGHT / height;
    const ratio = Math.min(widthRatio, heightRatio);

    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    processor = processor.resize(width, height, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  // Apply format-specific optimizations
  if (mimeType === 'image/jpeg') {
    processor = processor.jpeg({ quality: JPEG_QUALITY });
  } else if (mimeType === 'image/png') {
    processor = processor.png({ compressionLevel: 9 });
  }

  const processedBuffer = await processor.toBuffer();

  return {
    buffer: processedBuffer,
    width,
    height
  };
}

/**
 * Upload media file
 * POST /api/media/upload
 */
export async function uploadMedia(req, res) {
  try {
    if (!req.file) {
      return sendBadRequest(res, 'No file uploaded');
    }

    await ensureUploadDir();

    const { buffer, originalname, mimetype } = req.file;

    // Process image
    const processed = await processImage(buffer, mimetype);

    // Generate unique filename
    const ext = getExtension(mimetype);
    const filename = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Write file to disk
    await fs.writeFile(filePath, processed.buffer);

    // Create database record
    const media = new Media({
      filename,
      originalName: originalname,
      mimeType: mimetype,
      size: processed.buffer.length,
      width: processed.width,
      height: processed.height,
      uploadedBy: req.user.userId
    });

    await media.save();

    sendCreated(res, 'Media uploaded', {
      media: {
        id: media._id,
        url: `/media/${media._id}`,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: media.size,
        width: media.width,
        height: media.height
      }
    });
  } catch (error) {
    console.error('Upload media error:', error);
    sendServerError(res, 'Failed to process image');
  }
}

/**
 * Delete media file
 * DELETE /api/media/:id
 */
export async function deleteMedia(req, res) {
  try {
    const { id } = req.params;

    const media = await Media.findById(id);
    if (!media) {
      return sendNotFound(res, 'Media not found');
    }

    // Verify ownership
    if (media.uploadedBy.toString() !== req.user.userId) {
      return sendError(res, 403, 'Not authorized to delete this media');
    }

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, media.filename);
    try {
      await fs.unlink(filePath);
    } catch {
      // File might not exist, continue with database deletion
      console.warn('File not found during deletion:', filePath);
    }

    // Delete database record
    await media.deleteOne();

    sendSuccess(res, { message: 'Media deleted' });
  } catch (error) {
    console.error('Delete media error:', error);
    sendServerError(res, 'Failed to delete media');
  }
}

/**
 * Get media metadata
 * GET /api/media/:id
 */
export async function getMediaInfo(req, res) {
  try {
    const { id } = req.params;

    const media = await Media.findById(id);
    if (!media) {
      return sendNotFound(res, 'Media not found');
    }

    // Only owner can view metadata
    if (media.uploadedBy.toString() !== req.user.userId) {
      return sendError(res, 403, 'Not authorized to view this media');
    }

    sendSuccess(res, {
      message: 'Media info retrieved',
      data: {
        media: {
          id: media._id,
          url: `/media/${media._id}`,
          originalName: media.originalName,
          mimeType: media.mimeType,
          size: media.size,
          width: media.width,
          height: media.height,
          quizId: media.quizId,
          createdAt: media.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get media info error:', error);
    sendServerError(res, 'Failed to fetch media info');
  }
}

/**
 * Check if user/session has access to media
 */
async function checkMediaAccess(media, user, sessionPin) {
  // 1. Owner can always access
  if (user && media.uploadedBy.toString() === user.userId) {
    return true;
  }

  // 2. Media not attached to quiz yet - only owner can access
  if (!media.quizId) {
    return false;
  }

  // 3. Quiz is published - anyone can access
  const quiz = await Quiz.findById(media.quizId);
  if (quiz && quiz.isPublished) {
    return true;
  }

  // 4. Active session with this quiz - players can access
  if (sessionPin) {
    const session = await Session.findOne({
      pin: sessionPin,
      quizId: media.quizId
    });
    if (session && session.status !== 'finished') {
      return true;
    }
  }

  return false;
}

/**
 * Serve media file with access control
 * GET /media/:id
 */
export async function serveMedia(req, res) {
  try {
    const { id } = req.params;
    const sessionPin = req.query.sessionPin;

    const media = await Media.findById(id);
    if (!media) {
      return sendNotFound(res, 'Media not found');
    }

    // Check access permissions
    const canAccess = await checkMediaAccess(media, req.user, sessionPin);
    if (!canAccess) {
      return sendError(res, 403, 'Access denied');
    }

    // Stream the file
    const filePath = path.join(UPLOAD_DIR, media.filename);

    try {
      await fs.access(filePath);
    } catch {
      return sendNotFound(res, 'Media file not found');
    }

    res.type(media.mimeType);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve media error:', error);
    sendServerError(res, 'Failed to serve media');
  }
}

/**
 * List all media for the authenticated user
 * GET /api/media
 */
export async function listMedia(req, res) {
  try {
    const { quizId, search, page = 1, limit = 20 } = req.query;

    const query = { uploadedBy: req.user.userId };

    // Filter by quiz if provided
    if (quizId) {
      query.quizId = quizId;
    }

    // Search by original filename
    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Media.countDocuments(query);

    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('filename originalName mimeType size width height quizId createdAt');

    const items = media.map(m => ({
      id: m._id,
      url: `/media/${m._id}`,
      originalName: m.originalName,
      mimeType: m.mimeType,
      size: m.size,
      width: m.width,
      height: m.height,
      quizId: m.quizId,
      createdAt: m.createdAt
    }));

    sendSuccess(res, {
      message: 'Media list retrieved',
      data: {
        media: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('List media error:', error);
    sendServerError(res, 'Failed to fetch media list');
  }
}

/**
 * Link media to a quiz (called when question is created/updated)
 */
export async function linkMediaToQuiz(mediaUrl, quizId) {
  if (!mediaUrl) return;

  // Extract media ID from URL (e.g., "/media/507f1f77..." -> "507f1f77...")
  const match = mediaUrl.match(/\/media\/([a-f0-9]{24})$/i);
  if (!match) return;

  const mediaId = match[1];

  try {
    await Media.findByIdAndUpdate(mediaId, { quizId });
  } catch (error) {
    console.error('Failed to link media to quiz:', error);
  }
}
