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

import { PLAYER_EVENTS, GAME_EVENTS, ERROR_CODES } from './events.js';
import {
  RECONNECT_WINDOW_MS,
  MAX_PLAYERS_PER_SESSION,
  emitPlayerError,
  getOrInitPlayers,
  getConnectedPlayers,
  validateJoinPayload,
  checkSessionState,
  createPlayerEntry,
  replaySessionStateToSocket
} from './sessionUtils.js';
import { broadcastLobbyUpdate } from './gameEvents.js';
import {
  clearQuestionTimer,
  endCurrentQuestion,
  computeLeaderboard,
  computeFinalResults
} from './broadcastEvents.js';

/**
 * Register all player-related Socket.io event handlers (WS-2)
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, any>} activeSessions
 */
export function registerPlayerEvents(io, socket, activeSessions) {
  /**
   * player:check-pin
   * Payload: { pin }
   *
   * Lightweight PIN validation — checks whether a session with the given PIN
   * exists and is in the lobby state.  Does NOT create a player entry.
   * Responds with:
   *   - player:pin-valid   { pin }            on success
   *   - player:pin-invalid { code, message }  on failure
   */
  socket.on(PLAYER_EVENTS.CHECK_PIN, (payload) => {
    try {
      const { pin: rawPin } = payload || {};

      if (!rawPin || typeof rawPin !== 'string') {
        socket.emit(PLAYER_EVENTS.PIN_INVALID, { code: ERROR_CODES.VALIDATION_ERROR, message: 'PIN is required.' });
        return;
      }

      const sessionPin = rawPin.trim();
      const session = activeSessions.get(sessionPin);

      if (!session) {
        socket.emit(PLAYER_EVENTS.PIN_INVALID, { code: ERROR_CODES.PIN_INVALID, message: 'No session found for this PIN.' });
        return;
      }

      // Allow PIN validation if in lobby OR if late joins are enabled during game
      const isInLobby = !session.status || session.status === 'lobby';
      const allowsLateJoin = (session.status === 'playing' || session.status === 'paused') && session.allowLateJoins;

      if (!isInLobby && !allowsLateJoin) {
        socket.emit(PLAYER_EVENTS.PIN_INVALID, { code: ERROR_CODES.QUIZ_IN_PROGRESS, message: 'Game already started.' });
        return;
      }

      socket.emit(PLAYER_EVENTS.PIN_VALID, { pin: sessionPin });
    } catch (error) {
      console.error('Error in player:check-pin handler:', error);
      socket.emit(PLAYER_EVENTS.PIN_INVALID, { code: ERROR_CODES.INTERNAL_ERROR, message: 'An unexpected error occurred.' });
    }
  });

  /**
   * player:join
   * Payload: { pin, name, avatar? }
   */
  socket.on(PLAYER_EVENTS.JOIN, (payload) => {
    try {
      // Validate payload
      const validation = validateJoinPayload(payload);
      if (!validation.valid) {
        emitPlayerError(socket, validation.error.code, validation.error.message);
        return;
      }

      const { pin: sessionPin, name, avatar } = validation;
      const session = activeSessions.get(sessionPin);

      // Check session state
      const stateCheck = checkSessionState(session, MAX_PLAYERS_PER_SESSION);
      if (!stateCheck.canJoin) {
        emitPlayerError(socket, stateCheck.error.code, stateCheck.error.message);
        return;
      }

      // Create player and add to session
      const players = getOrInitPlayers(session);
      const { id: playerId, player } = createPlayerEntry(name, socket.id, avatar);
      players.set(playerId, player);

      // Track session/player on the socket for quick lookup on disconnect
      socket.data.sessionPin = sessionPin;
      socket.data.playerId = playerId;

      // Join the underlying Socket.io room (by PIN)
      socket.join(sessionPin);

      // Notify the joining player
      socket.emit(PLAYER_EVENTS.JOINED, {
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
      emitPlayerError(socket, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred while joining.');
    }
  });

  /**
   * player:update-profile
   * Payload: { name, avatar? }
   *
   * Allows a player to change nickname/avatar while the game is still in the lobby.
   */
  socket.on(PLAYER_EVENTS.UPDATE_PROFILE, (payload) => {
    try {
      const sessionPin = socket.data.sessionPin;
      const playerId = socket.data.playerId;

      if (!sessionPin || !playerId) {
        emitPlayerError(socket, ERROR_CODES.SESSION_EXPIRED, 'You are not part of an active session.');
        return;
      }

      const session = activeSessions.get(sessionPin);
      if (!session || !session.players || !session.players.has(playerId)) {
        emitPlayerError(socket, ERROR_CODES.SESSION_EXPIRED, 'Session no longer available.');
        return;
      }

      // Only allow changes before the game starts (lobby)
      if (session.status && session.status !== 'lobby') {
        emitPlayerError(socket, ERROR_CODES.INVALID_STATE, 'Game already started.');
        return;
      }

      const { name, avatar } = payload || {};
      const nickname = typeof name === 'string' ? name.trim() : '';
      const normalizedAvatar = typeof avatar === 'string' ? avatar : null;

      if (nickname.length < 2) {
        emitPlayerError(socket, ERROR_CODES.VALIDATION_ERROR, 'Name must be at least 2 characters.');
        return;
      }

      if (!normalizedAvatar) {
        emitPlayerError(socket, ERROR_CODES.VALIDATION_ERROR, 'Please select an emoji.');
        return;
      }

      const player = session.players.get(playerId);
      player.nickname = nickname;
      player.avatar = normalizedAvatar;
      player.lastSeenAt = new Date();

      socket.emit(PLAYER_EVENTS.PROFILE_UPDATED, {
        playerId,
        nickname,
        avatar: normalizedAvatar
      });

      const connectedPlayers = getConnectedPlayers(session).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar
      }));

      broadcastLobbyUpdate(io, sessionPin, connectedPlayers);
    } catch (error) {
      console.error('Error in player:update-profile handler:', error);
      emitPlayerError(socket, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred while updating your profile.');
    }
  });

  /**
   * player:answer
   * Payload: { questionId, answerId, timeTaken }
   *
   * For now we only validate & buffer the submission in memory.
   * Scoring and game progression will be handled in WS-3/WS-4 tasks.
   */
  socket.on(PLAYER_EVENTS.ANSWER, (payload) => {
    try {
      const normalizedPayload = payload || {};
      let { questionId } = normalizedPayload;
      const { answerId, timeTaken } = normalizedPayload;

      const sessionPin = socket.data.sessionPin;
      const playerId = socket.data.playerId;

      if (!sessionPin || !playerId) {
        emitPlayerError(socket, ERROR_CODES.SESSION_EXPIRED, 'You are not part of an active session.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      // Fall back to the server's current question ID if the client didn't send one
      if (!questionId || typeof questionId !== 'string') {
        questionId = session?.currentQuestionId;
      }

      // answerId can be a string (single answer) or array of strings (multi-answer)
      if (!questionId || !answerId) {
        emitPlayerError(socket, ERROR_CODES.VALIDATION_ERROR, 'answerId is required.');
        return;
      }

      // Normalize answerId: accept string or array
      const normalizedAnswerId = Array.isArray(answerId) ? answerId : answerId;

      if (Array.isArray(normalizedAnswerId)) {
        if (normalizedAnswerId.length === 0 || !normalizedAnswerId.every(id => typeof id === 'string')) {
          emitPlayerError(socket, ERROR_CODES.VALIDATION_ERROR, 'answerId is required.');
          return;
        }
      } else if (typeof normalizedAnswerId !== 'string') {
        emitPlayerError(socket, ERROR_CODES.VALIDATION_ERROR, 'answerId is required.');
        return;
      }

      if (!session || !session.players || !session.players.has(playerId)) {
        emitPlayerError(socket, ERROR_CODES.SESSION_EXPIRED, 'Session no longer available.');
        return;
      }

      if (session.status && session.status !== 'playing') {
        emitPlayerError(socket, ERROR_CODES.VALIDATION_ERROR, 'You cannot submit an answer right now.');
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
        answerId: normalizedAnswerId,
        timeTaken: numericTimeTaken,
        submittedAt: now
      });

      // Update last seen for the player
      const player = session.players.get(playerId);
      if (player) {
        player.lastSeenAt = now;
      }

      // Simple acknowledgement so the UI can verify the backend received the answer
      socket.emit(PLAYER_EVENTS.ANSWER_ACK, {
        questionId,
        answerId,
        receivedAt: now.toISOString()
      });

      // Notify everyone in the room about the new answer count (no answer details)
      const answerCount = questionAnswers.size;
      io.to(sessionPin).emit(PLAYER_EVENTS.ANSWER_RECEIVED, {
        questionId,
        answerCount
      });

      // Send detailed answer info to host socket only (for distribution tracking)
      const hostSocketId = session.hostSocketId;
      if (hostSocketId) {
        io.to(hostSocketId).emit(PLAYER_EVENTS.ANSWER_DETAIL, {
          playerId,
          questionId,
          answerId,
          answerCount
        });
      }

      // Auto-end question when every connected player has answered
      const connectedCount = getConnectedPlayers(session).length;
      if (connectedCount > 0 && answerCount >= connectedCount && !session.questionEnded) {
        clearQuestionTimer(session);
        endCurrentQuestion(io, sessionPin, session);
      }
    } catch (error) {
      console.error('Error in player:answer handler:', error);
      emitPlayerError(socket, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred while submitting your answer.');
    }
  });

  /**
   * player:reconnect
   * Payload: { sessionId, odlfPlayerId | oldPlayerId }
   *
   * Allows a player to rejoin within a 30s window after disconnect.
   * We tolerate the documented typo `odlfPlayerId` and also accept `oldPlayerId`.
   */
  socket.on(PLAYER_EVENTS.RECONNECT, (payload) => {
    try {
      const { sessionId, odlfPlayerId, oldPlayerId } = payload || {};

      const playerId = odlfPlayerId || oldPlayerId;

      if (!sessionId || typeof sessionId !== 'string' || !playerId || typeof playerId !== 'string') {
        emitPlayerError(socket, ERROR_CODES.VALIDATION_ERROR, 'sessionId and playerId are required for reconnect.');
        return;
      }

      const sessionPin = sessionId.trim();
      const session = activeSessions.get(sessionPin);

      if (!session || !session.players) {
        emitPlayerError(socket, ERROR_CODES.SESSION_EXPIRED, 'Session not found or already finished.');
        return;
      }

      const player = session.players.get(playerId);

      if (!player) {
        emitPlayerError(socket, ERROR_CODES.NOT_FOUND, 'Player not found in this session.');
        return;
      }

      const isSameSocket = player.socketId === socket.id;
      const wasRecentlyDisconnected =
        player.disconnectedAt &&
        (Date.now() - player.disconnectedAt.getTime()) <= RECONNECT_WINDOW_MS;

      // Mobile browsers can keep the old websocket around briefly after
      // lock/unlock or page restore. Allow the new socket to reclaim the
      // player session instead of rejecting it as "already connected".
      if (!isSameSocket && player.isConnected && player.socketId) {
        const previousSocket = io.sockets.sockets.get(player.socketId);
        if (previousSocket) {
          previousSocket.leave(sessionPin);
          previousSocket.data.sessionPin = null;
          previousSocket.data.playerId = null;
          previousSocket.disconnect(true);
        }
      }

      if (!isSameSocket && !player.isConnected && !wasRecentlyDisconnected) {
        emitPlayerError(socket, ERROR_CODES.SESSION_EXPIRED, 'Reconnect window has expired.');
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
      socket.emit(PLAYER_EVENTS.JOINED, {
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
      replaySessionStateToSocket(socket, session);
    } catch (error) {
      console.error('Error in player:reconnect handler:', error);
      emitPlayerError(socket, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred while reconnecting.');
    }
  });
}
