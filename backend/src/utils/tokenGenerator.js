import crypto from 'crypto';

/**
 * Generate a secure random token (256-bit)
 * @returns {string} Hex-encoded token
 */
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256
 * @param {string} token - Plain token to hash
 * @returns {string} Hashed token
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Timing-safe comparison of two tokens
 * @param {string} a - First token (hashed)
 * @param {string} b - Second token (hashed)
 * @returns {boolean} True if tokens match
 */
export function compareTokens(a, b) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
