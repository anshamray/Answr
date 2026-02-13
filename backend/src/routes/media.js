import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  uploadMedia,
  deleteMedia,
  getMediaInfo,
  serveMedia
} from '../controllers/mediaController.js';

// API routes (require authentication)
export const apiRouter = express.Router();

apiRouter.post('/upload', authenticate, upload.single('file'), (req, res, next) => {
  // Handle multer errors
  if (req.fileValidationError) {
    return res.status(400).json({ success: false, error: req.fileValidationError });
  }
  uploadMedia(req, res, next);
});

apiRouter.delete('/:id', authenticate, deleteMedia);
apiRouter.get('/:id', authenticate, getMediaInfo);

// File serving route (optional auth for access control)
export const serveRouter = express.Router();

serveRouter.get('/:id', optionalAuth, serveMedia);

// Error handler for multer
export function handleUploadError(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: 'File size exceeds 5MB limit' });
  }
  if (err.message === 'Only JPG, PNG, and GIF images are allowed') {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
}
