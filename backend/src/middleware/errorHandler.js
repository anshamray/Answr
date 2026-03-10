import { logger } from '../utils/logger.js';
import { sendBadRequest, sendServerError } from '../utils/responseHelper.js';

/**
 * Central Express error-handling middleware.
 *
 * This is a safety net for unhandled errors. Most controllers already
 * catch and respond explicitly; this middleware ensures that anything
 * thrown or passed to `next(err)` is converted into a consistent
 * JSON error response.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  logger.error('Unhandled error in request', {
    method: req.method,
    path: req.originalUrl,
    error: err && err.stack ? err.stack : err
  });

  // Special-case structured validation errors
  if (err && err.name === 'QuestionValidationError') {
    return sendBadRequest(res, err.message);
  }

  // Fallback: generic 500
  return sendServerError(res, 'Internal server error');
}

