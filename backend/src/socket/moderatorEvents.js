/**
 * Moderator WebSocket Events (WS-3)
 *
 * Handles moderator lifecycle and game control:
 * - Join as session host
 * - Begin quiz
 * - Advance to next question
 * - Pause / resume game
 * - Kick player
 * - End session
 *
 * This builds on the in-memory `activeSessions` Map that is created in
 * `socket/index.js` and also used by `playerEvents.js`.
 */

import {
  broadcastToSession,
  broadcastLobbyUpdate,
  broadcastQuestion,
  broadcastGameEnd
} from './gameEvents.js';

/**
 * Emit a structured moderator error
 * @param {import('socket.io').Socket} socket
 * @param {string} code
 * @param {string} message
 */
function emitModeratorError(socket, code, message) {
  socket.emit('moderator:error', { code, message });
}

/**
 * Ensure only the current host socket can control the session
 * @param {import('socket.io').Socket} socket
 * @param {any} session
 * @returns {boolean}
 */
function assertIsHost(socket, session) {
  if (!session || !session.hostSocketId) {
    emitModeratorError(socket, 'SESSION_NOT_HOSTED', 'No active host for this session.');
    return false;
  }

  if (session.hostSocketId !== socket.id) {
    emitModeratorError(socket, 'NOT_AUTHORIZED', 'Only the session host can perform this action.');
    return false;
  }

  return true;
}

/**
 * Get connected players for lobby updates
 */
function getConnectedPlayers(session) {
  const players = session.players ? Array.from(session.players.values()) : [];
  return players.filter((p) => p.isConnected);
}

/**
 * Register all moderator-related Socket.io event handlers (WS-3)
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Map<string, any>} activeSessions
 */
export function registerModeratorEvents(io, socket, activeSessions) {
  /**
   * moderator:join
   * Payload: { pin, quizId }
   *
   * - Creates a new in-memory session if it does not exist yet
   * - Marks this socket as the host for the session
   * - Joins the underlying Socket.io room identified by the PIN
   */
  socket.on('moderator:join', (payload) => {
    try {
      const { pin, quizId } = payload || {};

      if (!pin || typeof pin !== 'string') {
        emitModeratorError(socket, 'VALIDATION_ERROR', 'Session PIN is required.');
        return;
      }

      const sessionPin = pin.trim();

      if (!sessionPin) {
        emitModeratorError(socket, 'VALIDATION_ERROR', 'Session PIN must not be empty.');
        return;
      }

      let session = activeSessions.get(sessionPin);

      // Create a new session if it does not exist yet
      if (!session) {
        session = {
          pin: sessionPin,
          quizId: typeof quizId === 'string' ? quizId : undefined,
          hostSocketId: socket.id,
          status: 'lobby',
          currentQuestionIndex: 0,
          players: new Map(),
          answers: new Map()
        };
        activeSessions.set(sessionPin, session);
      } else {
        // If a host is already present and it's not this socket, reject
        if (session.hostSocketId && session.hostSocketId !== socket.id) {
          emitModeratorError(
            socket,
            'SESSION_ALREADY_HOSTED',
            'This session already has an active host.'
          );
          return;
        }

        // (Re)assign hostSocketId to this socket (e.g. on reconnect)
        session.hostSocketId = socket.id;

        if (typeof quizId === 'string') {
          session.quizId = quizId;
        }
      }

      // Track moderator context on the socket
      socket.data.sessionPin = sessionPin;
      socket.data.isModerator = true;

      // Join the room
      socket.join(sessionPin);

      // Acknowledge to the moderator
      socket.emit('moderator:joined', {
        sessionId: sessionPin,
        quizId: session.quizId ?? null,
        status: session.status
      });

      // Optionally send current lobby state to moderator
      const connectedPlayers = getConnectedPlayers(session).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar
      }));

      broadcastLobbyUpdate(io, sessionPin, connectedPlayers);
    } catch (error) {
      console.error('Error in moderator:join handler:', error);
      emitModeratorError(socket, 'INTERNAL_ERROR', 'An unexpected error occurred while joining.');
    }
  });

  /**
   * moderator:start
   * Payload: { firstQuestion } (optional)
   *
   * - Transitions session status to "playing"
   * - Optionally broadcasts the first question if provided
   */
  socket.on('moderator:start', (payload) => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, 'SESSION_NOT_FOUND', 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (session.status && session.status !== 'lobby') {
        emitModeratorError(
          socket,
          'INVALID_STATE',
          'Quiz can only be started from the lobby state.'
        );
        return;
      }

      session.status = 'playing';
      session.currentQuestionIndex = 0;

      // Inform all clients that the game has started
      broadcastToSession(io, sessionPin, 'game:started', {
        status: 'playing'
      });

      const { firstQuestion } = payload || {};

      if (firstQuestion && typeof firstQuestion === 'object') {
        const questionPayload = {
          questionNumber: 1,
          totalQuestions: firstQuestion.totalQuestions ?? firstQuestion.totalQuestions ?? 1,
          text: firstQuestion.text,
          options: firstQuestion.options,
          timeLimit: firstQuestion.timeLimit
        };

        broadcastQuestion(io, sessionPin, questionPayload);
      }
    } catch (error) {
      console.error('Error in moderator:start handler:', error);
      emitModeratorError(socket, 'INTERNAL_ERROR', 'An unexpected error occurred while starting.');
    }
  });

  /**
   * moderator:next
   * Payload: { question }
   *
   * The `question` object is forwarded to clients via `game:question`.
   */
  socket.on('moderator:next', (payload) => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, 'SESSION_NOT_FOUND', 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (!session.status || session.status === 'finished') {
        emitModeratorError(
          socket,
          'INVALID_STATE',
          'Cannot advance question for a non-active session.'
        );
        return;
      }

      const { question } = payload || {};

      if (!question || typeof question !== 'object') {
        emitModeratorError(
          socket,
          'VALIDATION_ERROR',
          'Question payload is required to advance to the next question.'
        );
        return;
      }

      session.status = 'playing';
      session.currentQuestionIndex = (session.currentQuestionIndex ?? 0) + 1;

      const questionPayload = {
        questionNumber: question.questionNumber ?? session.currentQuestionIndex,
        totalQuestions: question.totalQuestions,
        text: question.text,
        options: question.options,
        timeLimit: question.timeLimit
      };

      broadcastQuestion(io, sessionPin, questionPayload);
    } catch (error) {
      console.error('Error in moderator:next handler:', error);
      emitModeratorError(
        socket,
        'INTERNAL_ERROR',
        'An unexpected error occurred while advancing to the next question.'
      );
    }
  });

  /**
   * moderator:pause
   *
   * - Transitions session status to "paused"
   * - Notifies all clients via `game:paused`
   */
  socket.on('moderator:pause', () => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, 'SESSION_NOT_FOUND', 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (session.status !== 'playing') {
        emitModeratorError(
          socket,
          'INVALID_STATE',
          'Game can only be paused while playing.'
        );
        return;
      }

      session.status = 'paused';

      broadcastToSession(io, sessionPin, 'game:paused', {
        status: 'paused'
      });
    } catch (error) {
      console.error('Error in moderator:pause handler:', error);
      emitModeratorError(
        socket,
        'INTERNAL_ERROR',
        'An unexpected error occurred while pausing the game.'
      );
    }
  });

  /**
   * moderator:resume
   *
   * - Transitions session status back to "playing"
   * - Notifies all clients via `game:resumed`
   */
  socket.on('moderator:resume', () => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, 'SESSION_NOT_FOUND', 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (session.status !== 'paused') {
        emitModeratorError(
          socket,
          'INVALID_STATE',
          'Game can only be resumed from the paused state.'
        );
        return;
      }

      session.status = 'playing';

      broadcastToSession(io, sessionPin, 'game:resumed', {
        status: 'playing'
      });
    } catch (error) {
      console.error('Error in moderator:resume handler:', error);
      emitModeratorError(
        socket,
        'INTERNAL_ERROR',
        'An unexpected error occurred while resuming the game.'
      );
    }
  });

  /**
   * moderator:kick
   * Payload: { playerId }
   *
   * - Marks the player as disconnected
   * - Removes them from the lobby and emits updated lobby state
   */
  socket.on('moderator:kick', (payload) => {
    try {
      const { playerId } = payload || {};

      if (!playerId || typeof playerId !== 'string') {
        emitModeratorError(socket, 'VALIDATION_ERROR', 'playerId is required to kick a player.');
        return;
      }

      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, 'SESSION_NOT_FOUND', 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (!session.players || !session.players.has(playerId)) {
        emitModeratorError(socket, 'NOT_FOUND', 'Player not found in this session.');
        return;
      }

      const player = session.players.get(playerId);

      // Try to disconnect player socket from the room
      if (player && player.socketId) {
        const playerSocket = io.sockets.sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.leave(sessionPin);
          playerSocket.data.sessionPin = null;
          playerSocket.data.playerId = null;
          playerSocket.emit('player:kicked', { reason: 'kicked_by_moderator' });
        }
      }

      session.players.delete(playerId);

      const connectedPlayers = getConnectedPlayers(session).map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar
      }));

      broadcastLobbyUpdate(io, sessionPin, connectedPlayers);

      // Inform remaining clients that a player was removed
      broadcastToSession(io, sessionPin, 'player:removed', {
        playerId,
        playerCount: connectedPlayers.length
      });
    } catch (error) {
      console.error('Error in moderator:kick handler:', error);
      emitModeratorError(
        socket,
        'INTERNAL_ERROR',
        'An unexpected error occurred while kicking the player.'
      );
    }
  });

  /**
   * moderator:end
   *
   * - Broadcasts game end to all clients
   * - Cleans up the in-memory session entry
   */
  socket.on('moderator:end', () => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, 'SESSION_NOT_FOUND', 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      session.status = 'finished';

      // For WS-3 we do not yet calculate a real leaderboard; send minimal shape
      const finalResults = {
        leaderboard: [],
        stats: {
          reason: 'ended_by_moderator'
        }
      };

      broadcastGameEnd(io, sessionPin, finalResults);

      // Finally remove the session from memory
      activeSessions.delete(sessionPin);
    } catch (error) {
      console.error('Error in moderator:end handler:', error);
      emitModeratorError(
        socket,
        'INTERNAL_ERROR',
        'An unexpected error occurred while ending the session.'
      );
    }
  });
}

