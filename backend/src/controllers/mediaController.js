import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { asyncHandler } from '../middleware/asyncHandler.js';
import Media from '../models/Media.js';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';
import {
  sendSuccess,
  sendCreated,
  sendError
} from '../utils/responseHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_UPLOAD_DIR = path.join(__dirname, '../../uploads/media');
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : DEFAULT_UPLOAD_DIR;
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
export const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw badRequest('No file uploaded');
  }

  await ensureUploadDir();
  const { buffer, originalname, mimetype } = req.file;
  const processed = await processImage(buffer, mimetype);
  const ext = getExtension(mimetype);
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.writeFile(filePath, processed.buffer);

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
});

/**
 * Delete media file
 * DELETE /api/media/:id
 */
export const deleteMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const media = await Media.findById(id);
  if (!media) {
    throw notFound('Media not found');
  }

  if (media.uploadedBy.toString() !== req.user.userId) {
    return sendError(res, 403, 'Not authorized to delete this media');
  }

  const filePath = path.join(UPLOAD_DIR, media.filename);
  try {
    await fs.unlink(filePath);
  } catch {
    logger.warn('File not found during deletion', { filePath });
  }

  await media.deleteOne();
  sendSuccess(res, { message: 'Media deleted' });
});

/**
 * Get media metadata
 * GET /api/media/:id
 */
export const getMediaInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const media = await Media.findById(id);
  if (!media) {
    throw notFound('Media not found');
  }

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
});

/**
 * Check if user/session has access to media
 */
async function checkMediaAccess(media, user, sessionPin) {
  // 1. Owner can always access
  if (user && media.uploadedBy.toString() === user.userId) {
    return true;
  }

  // Older media rows may not have been back-linked to the quiz yet.
  // Fall back to the question that references this media URL.
  let quizId = media.quizId;
  if (!quizId) {
    const linkedQuestion = await Question.findOne({
      mediaUrl: `/media/${media._id}`
    }).select('quizId');

    quizId = linkedQuestion?.quizId || null;
  }

  // 2. Media not attached to any quiz yet - only owner can access
  if (!quizId) {
    return false;
  }

  // 3. Quiz is published - anyone can access
  const quiz = await Quiz.findById(quizId);
  if (quiz && quiz.isPublished) {
    return true;
  }

  // 4. Active session with this quiz - players can access
  if (sessionPin) {
    const session = await Session.findOne({
      pin: sessionPin,
      quizId
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
export const serveMedia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sessionPin = req.query.sessionPin;

  const media = await Media.findById(id);
  if (!media) {
    throw notFound('Media not found');
  }

  const canAccess = await checkMediaAccess(media, req.user, sessionPin);
  if (!canAccess) {
    return sendError(res, 403, 'Access denied');
  }

  const filePath = path.join(UPLOAD_DIR, media.filename);
  try {
    await fs.access(filePath);
  } catch {
    throw notFound('Media file not found');
  }

  res.type(media.mimeType);
  res.sendFile(filePath);
});

/**
 * List all media for the authenticated user
 * GET /api/media
 */
export const listMedia = asyncHandler(async (req, res) => {
  const { quizId, search, page = 1, limit = 20 } = req.query;
  const query = { uploadedBy: req.user.userId };

  if (quizId) {
    query.quizId = quizId;
  }
  if (search) {
    query.originalName = { $regex: search, $options: 'i' };
  }

  const { page: pageNum, limit: limitNum, skip } = parsePagination({
    page,
    limit,
    defaultLimit: 20,
    maxLimit: 100
  });
  const total = await Media.countDocuments(query);

  const media = await Media.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .select('filename originalName mimeType size width height quizId createdAt');

  const items = media.map((m) => ({
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
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

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
    logger.warn('Failed to link media to quiz', error);
  }
}
