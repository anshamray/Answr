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

import { MODERATOR_EVENTS, GAME_EVENTS, PLAYER_EVENTS, ERROR_CODES } from './events.js';
import {
  emitModeratorError,
  getConnectedPlayers,
  assertIsHost,
  replaySessionStateToSocket
} from './sessionUtils.js';
import { generateUniquePin } from '../utils/pinGenerator.js';

import {
  broadcastToSession,
  broadcastLobbyUpdate,
  broadcastQuestion,
  broadcastGameEnd
} from './gameEvents.js';

import {
  startQuestionTimer,
  clearQuestionTimer,
  endCurrentQuestion,
  computeLeaderboard,
  computeFinalResults
} from './broadcastEvents.js';

import Session from '../models/Session.js';
import Participant from '../models/Participant.js';
import Submission from '../models/Submission.js';

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
  socket.on(MODERATOR_EVENTS.JOIN, async (payload) => {
    try {
      const { pin, quizId } = payload || {};

      let sessionPin =
        typeof pin === 'string'
          ? pin.trim()
          : '';

      // If no PIN was provided by the client, generate a unique PIN
      // that checks both in-memory sessions AND the database
      if (!sessionPin) {
        sessionPin = await generateUniquePin(activeSessions);
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
        const existingHostSocket = session.hostSocketId
          ? io.sockets.sockets.get(session.hostSocketId)
          : null;
        const hasActiveDifferentHost = (
          session.hostSocketId &&
          session.hostSocketId !== socket.id &&
          existingHostSocket?.connected
        );

        // If a host is already present on another live socket, reject.
        if (session.hostSocketId && session.hostSocketId !== socket.id) {
          if (hasActiveDifferentHost) {
            emitModeratorError(
              socket,
              ERROR_CODES.SESSION_ALREADY_HOSTED,
              'This session already has an active host.'
            );
            return;
          }
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
      socket.emit(MODERATOR_EVENTS.JOINED, {
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
      replaySessionStateToSocket(socket, session);
    } catch (error) {
      console.error('Error in moderator:join handler:', error);
      emitModeratorError(socket, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred while joining.');
    }
  });

  /**
   * moderator:start
   * Payload: { firstQuestion } (optional)
   *
   * - Transitions session status to "playing"
   * - Optionally broadcasts the first question if provided
   */
  socket.on(MODERATOR_EVENTS.START, (payload) => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, ERROR_CODES.SESSION_NOT_FOUND, 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (session.status && session.status !== 'lobby') {
        emitModeratorError(
          socket,
          ERROR_CODES.INVALID_STATE,
          'Quiz can only be started from the lobby state.'
        );
        return;
      }

      session.status = 'playing';
      session.currentQuestionIndex = 0;
      session.startedAt = new Date();

      // Update the database session with startedAt
      Session.findOneAndUpdate(
        { pin: sessionPin },
        { startedAt: session.startedAt, status: 'playing' }
      ).catch(err => console.error('Failed to update session startedAt:', err));

      // Store game settings
      const { settings } = payload || {};
      if (settings && typeof settings === 'object') {
        session.allowLateJoins = !!settings.allowLateJoins;
      }

      // Inform all clients that the game has started
      broadcastToSession(io, sessionPin, GAME_EVENTS.STARTED, {
        status: 'playing'
      });

      const { firstQuestion } = payload || {};

      if (firstQuestion && typeof firstQuestion === 'object') {
        // Store question metadata for scoring & timer
        session.currentQuestionId = firstQuestion.questionId || `q_${session.currentQuestionIndex}`;
        session.currentTimeLimit = firstQuestion.timeLimit || 30;
        session.currentCorrectAnswerIds = Array.isArray(firstQuestion.correctAnswerIds)
          ? firstQuestion.correctAnswerIds
          : [];
        session.totalQuestions = firstQuestion.totalQuestions ?? 1;
        session.questionEnded = false;
        session.currentAllowMultipleAnswers = firstQuestion.allowMultipleAnswers || false;
        session.currentQuestionType = firstQuestion.type || 'multiple-choice';
        session.currentSliderConfig = firstQuestion.sliderConfig || null;
        session.currentPinConfig = firstQuestion.pinConfig || null;
        session.currentAcceptedAnswers = firstQuestion.acceptedAnswers || null;

        const questionPayload = {
          questionId: session.currentQuestionId,
          questionNumber: 1,
          totalQuestions: session.totalQuestions,
          text: firstQuestion.text,
          type: session.currentQuestionType,
          options: firstQuestion.options,
          timeLimit: firstQuestion.timeLimit,
          allowMultipleAnswers: session.currentAllowMultipleAnswers,
          sliderConfig: session.currentSliderConfig,
          mediaUrl: firstQuestion.mediaUrl || null
        };

        session.currentQuestionPayload = questionPayload;
        broadcastQuestion(io, sessionPin, questionPayload);
        startQuestionTimer(io, sessionPin, session);
      }
    } catch (error) {
      console.error('Error in moderator:start handler:', error);
      emitModeratorError(socket, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred while starting.');
    }
  });

  /**
   * moderator:next
   * Payload: { question }
   *
   * The `question` object is forwarded to clients via `game:question`.
   */
  socket.on(MODERATOR_EVENTS.NEXT, (payload) => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, ERROR_CODES.SESSION_NOT_FOUND, 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (!session.status || session.status === 'finished') {
        emitModeratorError(
          socket,
          ERROR_CODES.INVALID_STATE,
          'Cannot advance question for a non-active session.'
        );
        return;
      }

      const { question } = payload || {};

      if (!question || typeof question !== 'object') {
        emitModeratorError(
          socket,
          ERROR_CODES.VALIDATION_ERROR,
          'Question payload is required to advance to the next question.'
        );
        return;
      }

      if (session.currentQuestionId && !session.questionEnded) {
        clearQuestionTimer(session);
        endCurrentQuestion(io, sessionPin, session);
      }

      session.status = 'playing';
      session.currentQuestionIndex = (session.currentQuestionIndex ?? 0) + 1;

      // Store question metadata for scoring & timer
      session.currentQuestionId = question.questionId || `q_${session.currentQuestionIndex}`;
      session.currentTimeLimit = question.timeLimit || 30;
      session.currentCorrectAnswerIds = Array.isArray(question.correctAnswerIds)
        ? question.correctAnswerIds
        : [];
      // Update totalQuestions if provided (might change if quiz was modified)
      if (question.totalQuestions != null) {
        session.totalQuestions = question.totalQuestions;
      }
      session.questionEnded = false;
      session.currentAllowMultipleAnswers = question.allowMultipleAnswers || false;
      session.currentQuestionType = question.type || 'multiple-choice';
      session.currentSliderConfig = question.sliderConfig || null;
      session.currentPinConfig = question.pinConfig || null;
      session.currentAcceptedAnswers = question.acceptedAnswers || null;

      const questionPayload = {
        questionId: session.currentQuestionId,
        questionNumber: question.questionNumber ?? session.currentQuestionIndex,
        totalQuestions: session.totalQuestions || question.totalQuestions,
        text: question.text,
        type: session.currentQuestionType,
        options: question.options,
        timeLimit: question.timeLimit,
        allowMultipleAnswers: session.currentAllowMultipleAnswers,
        sliderConfig: session.currentSliderConfig,
        mediaUrl: question.mediaUrl || null
      };

      session.currentQuestionPayload = questionPayload;
      broadcastQuestion(io, sessionPin, questionPayload);
      startQuestionTimer(io, sessionPin, session);
    } catch (error) {
      console.error('Error in moderator:next handler:', error);
      emitModeratorError(
        socket,
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred while advancing to the next question.'
      );
    }
  });

  /**
   * moderator:end-question
   * Payload: { correctAnswerIds }
   *
   * Signals that the current question is over (timer expired or moderator
   * chose to reveal). Broadcasts `game:questionEnd` with the correct answer
   * IDs so players can see their result.
   */
  socket.on(MODERATOR_EVENTS.END_QUESTION, (payload) => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, ERROR_CODES.SESSION_NOT_FOUND, 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      // Stop the server-side timer (moderator ended early)
      clearQuestionTimer(session);

      // Allow override of correct answer IDs if provided
      if (Array.isArray(payload?.correctAnswerIds) && payload.correctAnswerIds.length > 0) {
        session.currentCorrectAnswerIds = payload.correctAnswerIds;
      }

      // Score answers + broadcast questionEnd + leaderboard
      endCurrentQuestion(io, sessionPin, session);
    } catch (error) {
      console.error('Error in moderator:end-question handler:', error);
      emitModeratorError(socket, ERROR_CODES.INTERNAL_ERROR, 'An unexpected error occurred.');
    }
  });

  /**
   * moderator:pause
   *
   * - Transitions session status to "paused"
   * - Notifies all clients via `game:paused`
   */
  socket.on(MODERATOR_EVENTS.PAUSE, () => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, ERROR_CODES.SESSION_NOT_FOUND, 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (session.status !== 'playing') {
        emitModeratorError(
          socket,
          ERROR_CODES.INVALID_STATE,
          'Game can only be paused while playing.'
        );
        return;
      }

      session.status = 'paused';

      broadcastToSession(io, sessionPin, GAME_EVENTS.PAUSED, {
        status: 'paused'
      });
    } catch (error) {
      console.error('Error in moderator:pause handler:', error);
      emitModeratorError(
        socket,
        ERROR_CODES.INTERNAL_ERROR,
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
  socket.on(MODERATOR_EVENTS.RESUME, () => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, ERROR_CODES.SESSION_NOT_FOUND, 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (session.status !== 'paused') {
        emitModeratorError(
          socket,
          ERROR_CODES.INVALID_STATE,
          'Game can only be resumed from the paused state.'
        );
        return;
      }

      session.status = 'playing';

      broadcastToSession(io, sessionPin, GAME_EVENTS.RESUMED, {
        status: 'playing'
      });
    } catch (error) {
      console.error('Error in moderator:resume handler:', error);
      emitModeratorError(
        socket,
        ERROR_CODES.INTERNAL_ERROR,
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
  socket.on(MODERATOR_EVENTS.KICK, (payload) => {
    try {
      const { playerId } = payload || {};

      if (!playerId || typeof playerId !== 'string') {
        emitModeratorError(socket, ERROR_CODES.VALIDATION_ERROR, 'playerId is required to kick a player.');
        return;
      }

      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, ERROR_CODES.SESSION_NOT_FOUND, 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      if (!session.players || !session.players.has(playerId)) {
        emitModeratorError(socket, ERROR_CODES.NOT_FOUND, 'Player not found in this session.');
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
          playerSocket.emit(PLAYER_EVENTS.KICKED, { reason: 'kicked_by_moderator' });
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
      broadcastToSession(io, sessionPin, PLAYER_EVENTS.REMOVED, {
        playerId,
        playerCount: connectedPlayers.length
      });
    } catch (error) {
      console.error('Error in moderator:kick handler:', error);
      emitModeratorError(
        socket,
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred while kicking the player.'
      );
    }
  });

  /**
   * moderator:end
   *
   * - Persists all submissions to the database
   * - Broadcasts game end to all clients
   * - Cleans up the in-memory session entry
   */
  socket.on(MODERATOR_EVENTS.END, async () => {
    try {
      const sessionPin = socket.data.sessionPin;

      if (!sessionPin) {
        emitModeratorError(socket, ERROR_CODES.SESSION_NOT_FOUND, 'No active session associated with socket.');
        return;
      }

      const session = activeSessions.get(sessionPin);

      if (!assertIsHost(socket, session)) {
        return;
      }

      // Stop any running question timer
      clearQuestionTimer(session);

      if (session.currentQuestionId && !session.questionEnded) {
        endCurrentQuestion(io, sessionPin, session);
      }

      session.status = 'finished';

      // Compute real final leaderboard with all player scores
      const finalResults = computeFinalResults(session);

      // Persist submissions to database before cleanup
      try {
        await persistSessionData(sessionPin, session);
      } catch (persistError) {
        console.error('Failed to persist session data:', persistError);
      }

      broadcastGameEnd(io, sessionPin, finalResults);

      // Clean up the session from memory
      activeSessions.delete(sessionPin);
    } catch (error) {
      console.error('Error in moderator:end handler:', error);
      emitModeratorError(
        socket,
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred while ending the session.'
      );
    }
  });
}

/**
 * Persist in-memory session data (players and submissions) to the database.
 * Called when the game ends to enable analytics.
 *
 * @param {string} sessionPin
 * @param {object} session - in-memory session object
 */
async function persistSessionData(sessionPin, session) {
  // Find the database session by PIN
  const dbSession = await Session.findOne({ pin: sessionPin });
  if (!dbSession) {
    console.warn(`Session ${sessionPin} not found in DB for persistence`);
    return;
  }

  const sessionId = dbSession._id;

  // Update session status and finishedAt
  dbSession.status = 'finished';
  dbSession.finishedAt = new Date();
  await dbSession.save();

  // Create a mapping from in-memory playerId to database participantId
  const playerIdToParticipantId = new Map();

  // Persist or update participants
  if (session.players) {
    for (const [playerId, player] of session.players) {
      // Check if participant already exists (created during join via REST)
      let participant = await Participant.findOne({
        sessionId,
        name: player.nickname
      });

      if (!participant) {
        participant = new Participant({
          sessionId,
          name: player.nickname,
          avatar: player.avatar || '',
          score: player.score || 0,
          isConnected: player.isConnected
        });
        await participant.save();
      } else {
        // Update the existing participant with final score
        participant.score = player.score || 0;
        participant.isConnected = player.isConnected;
        await participant.save();
      }

      playerIdToParticipantId.set(playerId, participant._id);
    }

    // Update session with participant references
    dbSession.participants = Array.from(playerIdToParticipantId.values());
    await dbSession.save();
  }

  // Persist submissions
  if (session.answers) {
    const submissions = [];

    for (const [questionId, questionAnswers] of session.answers) {
      for (const [playerId, answer] of questionAnswers) {
        const participantId = playerIdToParticipantId.get(playerId);
        if (!participantId) continue;

        // Check if submission already exists (avoid duplicates)
        const existingSubmission = await Submission.findOne({
          participantId,
          questionId
        });

        if (!existingSubmission) {
          submissions.push({
            participantId,
            questionId,
            sessionId,
            questionType: answer.questionType || 'multiple-choice',
            answerId: answer.answerId,
            timeTaken: answer.timeTaken || 0,
            pointsAwarded: answer.pointsAwarded || 0,
            isCorrect: answer.isCorrect ?? null
          });
        }
      }
    }

    if (submissions.length > 0) {
      await Submission.insertMany(submissions, { ordered: false }).catch(err => {
        // Ignore duplicate key errors
        if (err.code !== 11000) throw err;
      });
    }
  }

  console.log(`Persisted session ${sessionPin}: ${playerIdToParticipantId.size} participants, ${session.answers?.size || 0} questions`);
}
