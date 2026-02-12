/**
 * WebSocket Event Constants
 *
 * Centralizes all event names to prevent typos and enable IDE autocomplete.
 * Event naming follows the convention: namespace:action
 */

// ─── Player Events ──────────────────────────────────────────────────────────

export const PLAYER_EVENTS = {
  // Client → Server
  CHECK_PIN: 'player:check-pin',
  JOIN: 'player:join',
  ANSWER: 'player:answer',
  RECONNECT: 'player:reconnect',

  // Server → Client
  PIN_VALID: 'player:pin-valid',
  PIN_INVALID: 'player:pin-invalid',
  JOINED: 'player:joined',
  ANSWER_ACK: 'player:answer:ack',
  ANSWER_RECEIVED: 'player:answer:received',
  ANSWER_DETAIL: 'player:answer:detail',
  KICKED: 'player:kicked',
  LEFT: 'player:left',
  REMOVED: 'player:removed',
  ERROR: 'player:error'
};

// ─── Moderator Events ───────────────────────────────────────────────────────

export const MODERATOR_EVENTS = {
  // Client → Server
  JOIN: 'moderator:join',
  START: 'moderator:start',
  NEXT: 'moderator:next',
  END_QUESTION: 'moderator:end-question',
  PAUSE: 'moderator:pause',
  RESUME: 'moderator:resume',
  KICK: 'moderator:kick',
  END: 'moderator:end',

  // Server → Client
  JOINED: 'moderator:joined',
  ERROR: 'moderator:error'
};

// ─── Game Events (Server → All Clients) ─────────────────────────────────────

export const GAME_EVENTS = {
  STARTED: 'game:started',
  QUESTION: 'game:question',
  TIMER: 'game:timer',
  QUESTION_END: 'game:questionEnd',
  LEADERBOARD: 'game:leaderboard',
  PAUSED: 'game:paused',
  RESUMED: 'game:resumed',
  END: 'game:end'
};

// ─── Lobby Events ───────────────────────────────────────────────────────────

export const LOBBY_EVENTS = {
  UPDATE: 'lobby:update'
};

// ─── Session Events ─────────────────────────────────────────────────────────

export const SESSION_EVENTS = {
  HOST_DISCONNECTED: 'session:hostDisconnected'
};

// ─── Error Codes ────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // PIN errors
  PIN_INVALID: 'PIN_INVALID',

  // Session errors
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_FULL: 'SESSION_FULL',
  SESSION_NOT_HOSTED: 'SESSION_NOT_HOSTED',
  SESSION_ALREADY_HOSTED: 'SESSION_ALREADY_HOSTED',

  // State errors
  QUIZ_IN_PROGRESS: 'QUIZ_IN_PROGRESS',
  INVALID_STATE: 'INVALID_STATE',

  // Authorization errors
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};
