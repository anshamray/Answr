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
  replaySessionStateToSocket,
  getOrInitPlayers,
  createBotPlayerEntry
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

/**
 * Ensure that a practice session has a set of virtual bot players.
 * Bots are stored in the in-memory session just like real players but have
 * no socket connection. They are used only for practice runs.
 *
 * @param {object} session
 * @param {number} count
 */
function ensurePracticeBots(session, count = 6) {
  if (!session || !session.isPractice) return;

  const players = getOrInitPlayers(session);

  // If bots already exist, do nothing
  if (Array.from(players.values()).some((p) => p && p.isBot)) {
    return;
  }

  for (let i = 0; i < count; i++) {
    const label = `Demo Player ${i + 1}`;
    const { id, player } = createBotPlayerEntry(label);
    players.set(id, player);
  }
}

/**
 * Schedule simulated answers from bot players for the current question
 * in a practice session. Answers are spread across the question duration
 * and emitted using the same events as real players.
 *
 * @param {import('socket.io').Server} io
 * @param {string} sessionPin
 * @param {object} session
 */
function schedulePracticeBotAnswers(io, sessionPin, session) {
  if (!session || !session.isPractice) return;
  if (!session.currentQuestionId || !session.currentQuestionPayload) return;

  const players = session.players ? Array.from(session.players.values()) : [];
  const bots = players.filter((p) => p && p.isBot);
  if (bots.length === 0) return;

  const questionId = session.currentQuestionId;
  const questionType = session.currentQuestionType || 'multiple-choice';
  const timeLimitSec = session.currentTimeLimit || 30;
  const options = Array.isArray(session.currentQuestionPayload.options)
    ? session.currentQuestionPayload.options
    : [];
  const correctIds = Array.isArray(session.currentCorrectAnswerIds)
    ? new Set(session.currentCorrectAnswerIds.map(String))
    : new Set();

  const sliderConfig = session.currentSliderConfig || null;
  const pinConfig = session.currentPinConfig || null;
  const acceptedAnswers = session.currentAcceptedAnswers || null;

  const now = Date.now();
  const minDelayMs = 4000; // Wait for intro to finish
  const maxDelayMs = Math.max(minDelayMs + 2000, timeLimitSec * 1000 - 500);

  function chooseAnswerForBot(botIndex) {
    // Probability of a correct answer: vary a bit per bot
    const baseChance = 0.55;
    const variance = (botIndex % 3) * 0.1; // 0, 0.1, 0.2
    const chanceCorrect = Math.min(0.9, Math.max(0.2, baseChance + variance));
    const shouldBeCorrect = Math.random() < chanceCorrect;

    if (questionType === 'slider' && sliderConfig) {
      const { min = 0, max = 100, correctValue = (min + max) / 2 } = sliderConfig;
      if (shouldBeCorrect) {
        // Pick a value near the correct one
        const spread = (max - min) * 0.05;
        const value = correctValue + (Math.random() - 0.5) * 2 * spread;
        return String(Math.min(max, Math.max(min, Math.round(value))));
      }
      // Clearly wrong: far from correct
      const farSide = Math.random() < 0.5 ? min : max;
      return String(farSide);
    }

    if (questionType === 'sort' && options.length > 0) {
      const sorted = [...options].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const correctOrder = sorted.map((o) => String(o.id));
      if (shouldBeCorrect) {
        return correctOrder;
      }
      // Wrong: shuffle order slightly
      const wrongOrder = [...correctOrder];
      if (wrongOrder.length > 1) {
        const i = 0;
        const j = 1;
        [wrongOrder[i], wrongOrder[j]] = [wrongOrder[j], wrongOrder[i]];
      }
      return wrongOrder;
    }

    if (questionType === 'pin-answer' && pinConfig && typeof pinConfig.x === 'number' && typeof pinConfig.y === 'number') {
      const radius = Number(pinConfig.radius || 10);
      if (shouldBeCorrect) {
        // Point within the radius
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius * 0.7;
        const x = pinConfig.x + Math.cos(angle) * r;
        const y = pinConfig.y + Math.sin(angle) * r;
        return JSON.stringify({
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y))
        });
      }
      // Clearly wrong: far away
      const farAngle = Math.random() * Math.PI * 2;
      const r = radius * 2.5;
      const x = pinConfig.x + Math.cos(farAngle) * r;
      const y = pinConfig.y + Math.sin(farAngle) * r;
      return JSON.stringify({
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      });
    }

    if (questionType === 'type-answer' && Array.isArray(acceptedAnswers) && acceptedAnswers.length > 0) {
      if (shouldBeCorrect) {
        const idx = Math.floor(Math.random() * acceptedAnswers.length);
        return String(acceptedAnswers[idx] || '').trim();
      }
      // Roughly wrong answer
      return 'demo answer';
    }

    // Multiple-choice / true-false / poll / default
    const correctOptions = options.filter((o) => correctIds.has(String(o.id)));
    const wrongOptions = options.filter((o) => !correctIds.has(String(o.id)));

    if (session.currentAllowMultipleAnswers) {
      const selected = [];
      const pool = shouldBeCorrect ? correctOptions : options;
      for (const opt of pool) {
        if (Math.random() < 0.4) {
          selected.push(String(opt.id));
        }
      }
      if (selected.length === 0 && pool.length > 0) {
        selected.push(String(pool[0].id));
      }
      return selected;
    }

    if (shouldBeCorrect && correctOptions.length > 0) {
      const idx = Math.floor(Math.random() * correctOptions.length);
      return String(correctOptions[idx].id);
    }

    if (wrongOptions.length > 0) {
      const idx = Math.floor(Math.random() * wrongOptions.length);
      return String(wrongOptions[idx].id);
    }

    // Fallback: any option id
    if (options.length > 0) {
      const idx = Math.floor(Math.random() * options.length);
      return String(options[idx].id);
    }

    return null;
  }

  if (!session.answers) {
    session.answers = new Map();
  }
  if (!session.answers.has(questionId)) {
    session.answers.set(questionId, new Map());
  }
  const questionAnswers = session.answers.get(questionId);

  bots.forEach((bot, index) => {
    const delay = Math.floor(
      minDelayMs + Math.random() * Math.max(1000, maxDelayMs - minDelayMs)
    );

    setTimeout(() => {
      // Skip if question already ended or session changed
      if (!session || session.questionEnded || session.currentQuestionId !== questionId) {
        return;
      }

      const answerId = chooseAnswerForBot(index);
      if (!answerId) return;

      const submittedAt = new Date(now + delay);
      const timeTakenMs = Math.max(0, submittedAt.getTime() - now);

      questionAnswers.set(bot.id, {
        playerId: bot.id,
        questionId,
        answerId,
        timeTaken: timeTakenMs,
        submittedAt
      });

      const answerCount = questionAnswers.size;

      io.to(sessionPin).emit(PLAYER_EVENTS.ANSWER_RECEIVED, {
        questionId,
        answerCount
      });

      const hostSocketId = session.hostSocketId;
      if (hostSocketId) {
        io.to(hostSocketId).emit(PLAYER_EVENTS.ANSWER_DETAIL, {
          playerId: bot.id,
          questionId,
          answerId,
          answerCount
        });
      }
    }, delay);
  });
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

      // Look up the backing DB session (if any) so we can detect practice runs.
      let dbSession = null;
      if (sessionPin) {
        dbSession = await Session.findOne({ pin: sessionPin }).select('quizId isPractice mode isAnonymous showLiveResultsToPlayers');
      }

      let session = activeSessions.get(sessionPin);

      // Create a new session if it does not exist yet
      if (!session) {
        session = {
          pin: sessionPin,
          quizId: typeof quizId === 'string' ? quizId : dbSession?.quizId?.toString(),
          hostSocketId: socket.id,
          status: 'lobby',
          currentQuestionIndex: 0,
          players: new Map(),
          answers: new Map(),
          isPractice: !!dbSession?.isPractice,
          mode: dbSession?.mode || 'competitive',
          isAnonymous: !!dbSession?.isAnonymous,
          showLiveResultsToPlayers: dbSession?.showLiveResultsToPlayers !== undefined
            ? !!dbSession.showLiveResultsToPlayers
            : true
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
        } else if (dbSession?.quizId) {
          session.quizId = dbSession.quizId.toString();
        }

        if (typeof session.isPractice !== 'boolean') {
          session.isPractice = !!dbSession?.isPractice;
        }
        if (!session.mode) {
          session.mode = dbSession?.mode || 'competitive';
        }
        if (session.isAnonymous === undefined) {
          session.isAnonymous = !!dbSession?.isAnonymous;
        }
        if (session.showLiveResultsToPlayers === undefined) {
          session.showLiveResultsToPlayers = dbSession?.showLiveResultsToPlayers !== undefined
            ? !!dbSession.showLiveResultsToPlayers
            : true;
        }
      }

      // For practice sessions started from the editor, ensure demo bot
      // players exist so the lobby and charts feel alive.
      ensurePracticeBots(session);

      // Track moderator context on the socket
      socket.data.sessionPin = sessionPin;
      socket.data.isModerator = true;

      // Join the room
      socket.join(sessionPin);

      // Acknowledge to the moderator
      socket.emit(MODERATOR_EVENTS.JOINED, {
        sessionId: sessionPin,
        quizId: session.quizId ?? null,
        status: session.status,
        mode: session.mode || 'competitive'
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
        status: 'playing',
        mode: session.mode || 'competitive'
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

        // For practice runs, simulate a handful of bot answers so that
        // answer counters, distributions and leaderboards look realistic.
        schedulePracticeBotAnswers(io, sessionPin, session);
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

      schedulePracticeBotAnswers(io, sessionPin, session);
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

      // Persist final session state to the database so analytics can
      // correctly show status and duration. We look up by PIN because
      // the WebSocket layer does not know the DB id.
      const finishedAt = new Date();
      Session.findOneAndUpdate(
        { pin: sessionPin },
        {
          $set: {
            status: 'finished',
            finishedAt
          },
          // Backfill startedAt if for some reason it was never set
          $setOnInsert: {
            startedAt: session.startedAt || null
          }
        },
        { upsert: false }
      ).catch((err) => {
        console.error('Failed to persist finished session state:', err);
      });

      // Compute real final leaderboard with all player scores
      const finalResults = computeFinalResults(session);

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

