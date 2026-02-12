import Session from '../models/Session.js';

const PIN_LENGTH = 6;
const PIN_MIN = 100000; // smallest 6-digit number
const PIN_MAX = 999999; // largest 6-digit number
const MAX_ATTEMPTS = 10;

/**
 * Generate a random 6-digit numeric PIN string.
 * @returns {string} e.g. "482917"
 */
export function generatePin() {
  return String(Math.floor(PIN_MIN + Math.random() * (PIN_MAX - PIN_MIN + 1)));
}

/**
 * Generate a unique 6-digit PIN that does not collide with any
 * active session in the database.
 * Retries up to MAX_ATTEMPTS times before throwing.
 *
 * @param {Map} [activeSessions] - Optional in-memory sessions map to also check against
 * @returns {Promise<string>} A unique PIN
 * @throws {Error} If a unique PIN cannot be generated after MAX_ATTEMPTS
 */
export async function generateUniquePin(activeSessions) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const pin = generatePin();

    // Check in-memory sessions (WebSocket layer)
    if (activeSessions && activeSessions.has(pin)) {
      continue;
    }

    // Check database sessions
    const exists = await Session.findOne({ pin });
    if (!exists) return pin;
  }

  throw new Error('Failed to generate unique PIN after ' + MAX_ATTEMPTS + ' attempts');
}
