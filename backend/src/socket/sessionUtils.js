/**
 * Shared Socket Session Utilities
 *
 * Common functions used across player and moderator event handlers.
 * Eliminates code duplication and provides consistent behavior.
 */

import { PLAYER_EVENTS, MODERATOR_EVENTS, ERROR_CODES } from './events.js';

// ─── Constants ──────────────────────────────────────────────────────────────

export const RECONNECT_WINDOW_MS = 30_000;
export const MAX_PLAYERS_PER_SESSION = 32;

// ─── Error Emitters ─────────────────────────────────────────────────────────

/**
 * Emit a structured player error
 * @param {import('socket.io').Socket} socket
 * @param {string} code
 * @param {string} message
 */
export function emitPlayerError(socket, code, message) {
  socket.emit(PLAYER_EVENTS.ERROR, { code, message });
}

/**
 * Emit a structured moderator error
 * @param {import('socket.io').Socket} socket
 * @param {string} code
 * @param {string} message
 */
export function emitModeratorError(socket, code, message) {
  socket.emit(MODERATOR_EVENTS.ERROR, { code, message });
}

// ─── Player Utilities ───────────────────────────────────────────────────────

/**
 * Generate a stable player id that can survive reconnects.
 * Client receives this via `player:joined` and must send it on reconnect.
 * @returns {string}
 */
export function generatePlayerId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Safely get or initialize the players Map for a session
 * @param {object} session
 * @returns {Map}
 */
export function getOrInitPlayers(session) {
  if (!session.players) {
    session.players = new Map();
  }
  return session.players;
}

/**
 * Get connected players for lobby updates
 * @param {object} session
 * @returns {Array}
 */
export function getConnectedPlayers(session) {
  const players = session.players ? Array.from(session.players.values()) : [];
  return players.filter((p) => p.isConnected);
}

// ─── Authorization ──────────────────────────────────────────────────────────

/**
 * Ensure only the current host socket can control the session
 * @param {import('socket.io').Socket} socket
 * @param {object} session
 * @returns {boolean}
 */
export function assertIsHost(socket, session) {
  if (!session || !session.hostSocketId) {
    emitModeratorError(socket, ERROR_CODES.SESSION_NOT_HOSTED, 'No active host for this session.');
    return false;
  }

  if (session.hostSocketId !== socket.id) {
    emitModeratorError(socket, ERROR_CODES.NOT_AUTHORIZED, 'Only the session host can perform this action.');
    return false;
  }

  return true;
}

// ─── Join Validation Helpers ────────────────────────────────────────────────

/**
 * Validate the payload for player:join
 * @param {object} payload
 * @returns {{ valid: boolean, error?: { code: string, message: string }, pin?: string, name?: string, avatar?: string|null }}
 */
export function validateJoinPayload(payload) {
  const { pin, name, avatar } = payload || {};

  if (!pin || typeof pin !== 'string' || !name || typeof name !== 'string') {
    return {
      valid: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'PIN and name are required.' }
    };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return {
      valid: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Name must not be empty.' }
    };
  }

  return {
    valid: true,
    pin: pin.trim(),
    name: trimmedName,
    avatar: typeof avatar === 'string' ? avatar : null
  };
}

/**
 * Check if a session allows joining
 * @param {object|undefined} session
 * @param {number} maxPlayers
 * @returns {{ canJoin: boolean, isLateJoin?: boolean, error?: { code: string, message: string } }}
 */
export function checkSessionState(session, maxPlayers) {
  if (!session) {
    return {
      canJoin: false,
      error: { code: ERROR_CODES.PIN_INVALID, message: 'No session found for this PIN.' }
    };
  }

  const connectedCount = getConnectedPlayers(session).length;
  if (connectedCount >= maxPlayers) {
    return {
      canJoin: false,
      error: { code: ERROR_CODES.SESSION_FULL, message: 'This session is already full.' }
    };
  }

  // Session is in lobby — normal join allowed
  if (!session.status || session.status === 'lobby') {
    return { canJoin: true, isLateJoin: false };
  }

  // Game in progress — check if late joins are allowed
  if ((session.status === 'playing' || session.status === 'paused') && session.allowLateJoins) {
    return { canJoin: true, isLateJoin: true };
  }

  // Game finished or late joins disabled
  return {
    canJoin: false,
    error: { code: ERROR_CODES.QUIZ_IN_PROGRESS, message: 'Game already started. Joining is closed.' }
  };
}

/**
 * Create a new player entry for a session
 * @param {string} name
 * @param {string} socketId
 * @param {string|null} avatar
 * @returns {{ id: string, player: object }}
 */
export function createPlayerEntry(name, socketId, avatar) {
  const playerId = generatePlayerId();
  const now = new Date();

  const player = {
    id: playerId,
    socketId,
    nickname: name,
    avatar,
    score: 0,
    isConnected: true,
    joinedAt: now,
    lastSeenAt: now,
    disconnectedAt: null
  };

  return { id: playerId, player };
}
