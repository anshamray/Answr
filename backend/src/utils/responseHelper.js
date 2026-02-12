/**
 * API Response Helper
 *
 * Provides consistent response format across all API endpoints.
 * All successful responses follow: { success: true, message: '...', data: {...} }
 * All error responses follow: { success: false, error: '...' }
 */

/**
 * Send a success response
 * @param {import('express').Response} res
 * @param {Object} options
 * @param {number} [options.status=200] - HTTP status code
 * @param {string} options.message - Success message
 * @param {Object} [options.data] - Response data
 */
export function sendSuccess(res, { status = 200, message, data }) {
  const response = { success: true, message };
  if (data !== undefined) {
    response.data = data;
  }
  res.status(status).json(response);
}

/**
 * Send a 201 Created response
 * @param {import('express').Response} res
 * @param {string} message - Success message
 * @param {Object} [data] - Response data
 */
export function sendCreated(res, message, data) {
  sendSuccess(res, { status: 201, message, data });
}

/**
 * Send an error response
 * @param {import('express').Response} res
 * @param {number} status - HTTP status code
 * @param {string} error - Error message
 */
export function sendError(res, status, error) {
  res.status(status).json({ success: false, error });
}

/**
 * Send a 400 Bad Request response
 * @param {import('express').Response} res
 * @param {string} error - Error message
 */
export function sendBadRequest(res, error) {
  sendError(res, 400, error);
}

/**
 * Send a 401 Unauthorized response
 * @param {import('express').Response} res
 * @param {string} error - Error message
 */
export function sendUnauthorized(res, error) {
  sendError(res, 401, error);
}

/**
 * Send a 404 Not Found response
 * @param {import('express').Response} res
 * @param {string} error - Error message
 */
export function sendNotFound(res, error) {
  sendError(res, 404, error);
}

/**
 * Send a 409 Conflict response
 * @param {import('express').Response} res
 * @param {string} error - Error message
 */
export function sendConflict(res, error) {
  sendError(res, 409, error);
}

/**
 * Send a 500 Internal Server Error response
 * @param {import('express').Response} res
 * @param {string} error - Error message
 */
export function sendServerError(res, error) {
  sendError(res, 500, error);
}
