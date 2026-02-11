/**
 * Player WebSocket Events (WS-2)
 *
 * Handles player lifecycle:
 * - Join session with PIN
 * - Submit answers
 * - Reconnect within 30s after disconnect
 *
 * This implementation uses the in-memory `activeSessions` Map that is
 * created in `socket/index.js`.
 *
 * activeSessions structure (per entry):
 * {
 *   pin: string,
 *   quizId?: string,
 *   hostSocketId?: string,
 *   status?: 'lobby' | 'playing' | 'paused' | 'finished',
 *   players: Map<playerId, {
 *     id: string,          // stable player id (used for reconnect)
 *     socketId: string,    // current socket.id (changes on reconnect)
 *     nickname: string,
 *     avatar?: string | null,
 *     score: number,
 *     isConnected: boolean,
 *     joinedAt: Date,
 *     lastSeenAt: Date,
 *     disconnectedAt?: Date | null
 *   }>,
 *   answers?: Map<questionId, Map<playerId, {...submissionData}>>
 * }
 */

import { broadcastLobbyUpdate } from './gameEvents.js';

const RECONNECT_WINDOW_MS = 30_000;
const MAX_PLAYERS_PER_SESSION = 32;

/**
 * Emit a structured player error
 * @param {import('socket.io').Socket} socket
 * @param {string} code
 * @param {string} message
 */
function emitPlayerError(socket, code, message) {
  socket.emit('player:error', { code, message });
}

/**
 * Small helper to generate a stable player id that can survive reconnects.
 * (Client receives this via `player:joined` and must send it on reconnect.)
 */
function generatePlayerId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Safely get or initialize the players Map for a session
 */
function getOrInitPlayers(session) {
  if (!session.players) {
    session.players = new Map();
  }
  return session.players;
}

/**
 * Get connected players for lobby updates
 */
function getConnectedPlayers(session) {
  const players = session.players ? Array.from(session.players.values()) : [];
  return players.filter((p) => p.isConnected);
}

/**
 * Register all player-related Socket.io event handlers (WS-2)
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, any>} activeSessions
 */
export function registerPlayerEvents(io, socket, activeSessions) {
  /**
   * player:join
   * Payload: { pin, name, avatar? }
   */
  socket.on('player:join', (payload) => {
    try {
      const { pin, name, avatar } = payload || {};

      if (!pin || typeof pin !== 'string' || !name || typeof name !== 'string') {
        emitPlayerError(socket, 'VALIDATION_ERROR', 'PIN and name are required.');
        return;
      }

      const trimmedName = name.trim();
      if (!trimmedName) {
        emitPlayerError(socket, 'VALIDATION_ERROR', 'Name must not be empty.');
        return;
      }

      const sessionPin = pin.trim();
      const session = activeSessions.get(sessionPin);

      if (!session) {
        emitPlayerError(socket, 'PIN_INVALID', 'No session found for this PIN.');
        return;
      }

      const players = getOrInitPlayers(session);

      // Enforce maximum players per session
      const connectedPlayerCount = getConnectedPlayers(session).length;
      if (connectedPlayerCount >= MAX_PLAYERS_PER_SESSION) {
        emitPlayerError(socket, 'SESSION_FULL', 'This session is already full.');
        return;
      }

      // Optional: only allow joins while in lobby
      if (session.status && session.status !== 'lobby') {
        emitPlayerError(socket, 'QUIZ_IN_PROGRESS', 'Game already started. Joining is closed.');
        return;
      }

      const playerId = generatePlayerId();
      const now = new Date();

      const player = {
        id: playerId,
        socketId: socket.id,
        nickname: trimmedName,
        avatar: typeof avatar === 'string' ? avatar : null,
        score: 0,
        isConnected: true,
        joinedAt: now,
        lastSeenAt: now,
        disconnectedAt: null
      };

      players.set(playerId, player);

      // Track session/player on the socket for quick lookup on disconnect
      socket.data.sessionPin = sessionPin;
      socket.data.playerId = playerId;

      // Join the underlying Socket.io room (by PIN)
      socket.join(sessionPin);

      // Notify the joining player
      socket.emit('player:joined', {
        playerId,
        sessionId: sessionPin
      });

      // Broadcast updated lobby to everyone in the room
      const connectedPlayers = getConnectedPlayers(session).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar
      }));

      broadcastLobbyUpdate(io, sessionPin, connectedPlayers);
    } catch (error) {
      console.error('Error in player:join handler:', error);
      emitPlayerError(socket, 'INTERNAL_ERROR', 'An unexpected error occurred while joining.');
    }
  });

  /**
   * player:answer
   * Payload: { questionId, answerId, timeTaken }
   *
   * For now we only validate & buffer the submission in memory.
   * Scoring and game progression will be handled in WS-3/WS-4 tasks.
   */
  socket.on('player:answer', (payload) => {
    try {
      const { questionId, answerId, timeTaken } = payload || {};

      if (!questionId || typeof questionId !== 'string' || !answerId || typeof answerId !== 'string') {
        emitPlayerError(socket, 'VALIDATION_ERROR', 'questionId and answerId are required.');
        return;
      }

      const sessionPin = socket.data.sessionPin;
      const playerId = socket.data.playerId;

      if (!sessionPin || !playerId) {
        emitPlayerError(socket, 'SESSION_EXPIRED', 'You are not part of an active session.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!session || !session.players || !session.players.has(playerId)) {
        emitPlayerError(socket, 'SESSION_EXPIRED', 'Session no longer available.');
        return;
      }

      if (session.status && session.status !== 'playing') {
        emitPlayerError(socket, 'VALIDATION_ERROR', 'You cannot submit an answer right now.');
        return;
      }

      const now = new Date();
      const numericTimeTaken = typeof timeTaken === 'number' && timeTaken >= 0 ? timeTaken : null;

      if (!session.answers) {
        session.answers = new Map();
      }

      if (!session.answers.has(questionId)) {
        session.answers.set(questionId, new Map());
      }

      const questionAnswers = session.answers.get(questionId);

      // Buffer the submission; later WS tasks will handle scoring & persistence
      questionAnswers.set(playerId, {
        playerId,
        questionId,
        answerId,
        timeTaken: numericTimeTaken,
        submittedAt: now
      });

      // Update last seen for the player
      const player = session.players.get(playerId);
      if (player) {
        player.lastSeenAt = now;
      }

      // We intentionally do not emit anything here yet; game/leaderboard
      // events will be emitted from moderator/game logic in later tasks.
    } catch (error) {
      console.error('Error in player:answer handler:', error);
      emitPlayerError(socket, 'INTERNAL_ERROR', 'An unexpected error occurred while submitting your answer.');
    }
  });

  /**
   * player:reconnect
   * Payload: { sessionId, odlfPlayerId | oldPlayerId }
   *
   * Allows a player to rejoin within a 30s window after disconnect.
   * We tolerate the documented typo `odlfPlayerId` and also accept `oldPlayerId`.
   */
  socket.on('player:reconnect', (payload) => {
    try {
      const { sessionId, odlfPlayerId, oldPlayerId } = payload || {};

      const playerId = odlfPlayerId || oldPlayerId;

      if (!sessionId || typeof sessionId !== 'string' || !playerId || typeof playerId !== 'string') {
        emitPlayerError(socket, 'VALIDATION_ERROR', 'sessionId and playerId are required for reconnect.');
        return;
      }

      const sessionPin = sessionId.trim();
      const session = activeSessions.get(sessionPin);

      if (!session || !session.players) {
        emitPlayerError(socket, 'SESSION_EXPIRED', 'Session not found or already finished.');
        return;
      }

      const player = session.players.get(playerId);

      if (!player) {
        emitPlayerError(socket, 'NOT_FOUND', 'Player not found in this session.');
        return;
      }

      if (player.isConnected) {
        emitPlayerError(socket, 'VALIDATION_ERROR', 'Player is already connected.');
        return;
      }

      if (!player.disconnectedAt) {
        emitPlayerError(socket, 'SESSION_EXPIRED', 'Reconnect window has expired.');
        return;
      }

      const elapsed = Date.now() - player.disconnectedAt.getTime();
      if (elapsed > RECONNECT_WINDOW_MS) {
        emitPlayerError(socket, 'SESSION_EXPIRED', 'Reconnect window has expired.');
        // Optional: clean up player entry once reconnect window is over
        session.players.delete(playerId);
        return;
      }

      // Re-bind player to the new socket
      player.socketId = socket.id;
      player.isConnected = true;
      player.disconnectedAt = null;
      player.lastSeenAt = new Date();

      socket.data.sessionPin = sessionPin;
      socket.data.playerId = playerId;

      socket.join(sessionPin);

      // Notify the reconnecting client using the same event shape as initial join
      socket.emit('player:joined', {
        playerId,
        sessionId: sessionPin
      });

      // Broadcast updated lobby (only connected players)
      const connectedPlayers = getConnectedPlayers(session).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar
      }));

      broadcastLobbyUpdate(io, sessionPin, connectedPlayers);
    } catch (error) {
      console.error('Error in player:reconnect handler:', error);
      emitPlayerError(socket, 'INTERNAL_ERROR', 'An unexpected error occurred while reconnecting.');
    }
  });
}

