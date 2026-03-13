/**
 * Structured application error used by controllers/services.
 */
export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function badRequest(message) {
  return new HttpError(400, message);
}

export function unauthorized(message) {
  return new HttpError(401, message);
}

export function notFound(message) {
  return new HttpError(404, message);
}

export function conflict(message) {
  return new HttpError(409, message);
}

