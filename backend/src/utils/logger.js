/**
 * Minimal logger abstraction for the backend.
 *
 * Currently wraps console but gives us a single place to
 * tune formatting, log levels or swap implementations later.
 */

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

const envLevel = process.env.LOG_LEVEL || 'info';
const activeLevelIndex = LOG_LEVELS.indexOf(envLevel) === -1 ? 1 : LOG_LEVELS.indexOf(envLevel);

function log(level, ...args) {
  const levelIndex = LOG_LEVELS.indexOf(level);
  if (levelIndex === -1 || levelIndex < activeLevelIndex) return;

  const timestamp = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === 'debug' ? 'log' : level](`[${timestamp}] [${level.toUpperCase()}]`, ...args);
}

export const logger = {
  debug: (...args) => log('debug', ...args),
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args)
};

