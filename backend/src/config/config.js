import { logger } from '../utils/logger.js';

/**
 * Central environment/config validation.
 *
 * This is intentionally lightweight and only checks for
 * values that are strictly required for the backend to run.
 * Optional integrations (like OAuth providers) are handled
 * in their own modules.
 */

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET'
];

/**
 * Validate critical environment variables.
 * Exits the process with code 1 if validation fails.
 */
export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing.join(', '));
    // Fail fast so we do not start in a broken state
    process.exit(1);
  }

  if (!process.env.CORS_ORIGIN) {
    logger.warn('CORS_ORIGIN not set; defaulting to http://localhost:5173');
  }
}

