/**
 * WS-4: Game Broadcast Events
 *
 * Server-side question timer, answer scoring, and leaderboard computation.
 * These run on the server to ensure authoritative timing and fair scoring.
 *
 * Scoring is delegated to utils/scoring.js (WS-5).
 */

import Participant from '../models/Participant.js';
import Session from '../models/Session.js';
import Submission from '../models/Submission.js';
import { calculateScore, DEFAULT_SCORING_CONFIG, getStreakBonus } from '../utils/scoring.js';

import {
  broadcastTimer,
  broadcastQuestionEnd,
  broadcastLeaderboard,
  broadcastQuestionIntro,
  broadcastQuestionStart,
  INTRO_DURATION
} from './gameEvents.js';

// ─── Timer ──────────────────────────────────────────────────────────────

/**
 * Start the server-side question timer with an intro phase.
 *
 * Flow:
 * 1. Emits `game:questionIntro` immediately (host and players see intro countdown)
 * 2. After INTRO_DURATION (3s), emits `game:questionStart` (answers can be shown)
 * 3. Starts the actual answer timer, emitting `game:timer` every second
 * 4. Auto-ends the question when timer reaches 0
 *
 * @param {import('socket.io').Server} io
 * @param {string} sessionPin
 * @param {object} session - in-memory session object
 */
export function startQuestionTimer(io, sessionPin, session) {
  clearQuestionTimer(session);

  const timeLimit = session.currentTimeLimit || 30;
  session.questionTimeRemaining = timeLimit;

  // Emit intro event immediately
  broadcastQuestionIntro(io, sessionPin, {
    questionNumber: (session.currentQuestionIndex ?? 0) + 1,
    totalQuestions: session.totalQuestions || 1,
    countdownSeconds: Math.ceil(INTRO_DURATION / 1000)
  });

  // After intro duration, signal that answers can be shown and start the timer
  session.introTimer = setTimeout(() => {
    session.introTimer = null;

    // Signal end of intro phase - answers can now be shown
    broadcastQuestionStart(io, sessionPin);

    // Start the actual answer timer
    session.questionTimer = setInterval(() => {
      session.questionTimeRemaining--;
      broadcastTimer(io, sessionPin, session.questionTimeRemaining);

      if (session.questionTimeRemaining <= 0) {
        clearQuestionTimer(session);
        endCurrentQuestion(io, sessionPin, session);
      }
    }, 1000);
  }, INTRO_DURATION);
}

/**
 * Stop the question timer (and intro timer if still running) for a session.
 * @param {object} session
 */
export function clearQuestionTimer(session) {
  if (session.introTimer) {
    clearTimeout(session.introTimer);
    session.introTimer = null;
  }
  if (session.questionTimer) {
    clearInterval(session.questionTimer);
    session.questionTimer = null;
  }
}

// ─── End question (score + broadcast) ───────────────────────────────────

/**
 * End the current question: score answers, broadcast `game:questionEnd`
 * and `game:leaderboard`.  Idempotent — safe to call more than once.
 *
 * @param {import('socket.io').Server} io
 * @param {string} sessionPin
 * @param {object} session
 */
export function endCurrentQuestion(io, sessionPin, session) {
  if (session.questionEnded) return;
  session.questionEnded = true;

  const isCollectOpinions = session.mode === 'collect-opinions';

  // 1. Score all submitted answers for this question (competitive mode only)
  if (!isCollectOpinions) {
    scoreCurrentQuestion(session);
  }

  // 1b. Persist results for this question so analytics survives restarts
  persistQuestionResults(sessionPin, session).catch((err) => {
    console.error('Failed to persist question results:', err);
  });

  // 2. Tell every client which answers were correct (empty for collect-opinions)
  broadcastQuestionEnd(io, sessionPin, {
    correctAnswerIds: isCollectOpinions ? [] : (session.currentCorrectAnswerIds || [])
  });

  // 3. Compute and broadcast the leaderboard (competitive mode only)
  if (!isCollectOpinions) {
    const leaderboard = computeLeaderboard(session);
    broadcastLeaderboard(io, sessionPin, leaderboard);
  }
}

// ─── Scoring ────────────────────────────────────────────────────────────

/**
 * Score all submitted answers for the current question.
 * Uses the scoring utility (WS-5) for point calculation.
 * Tracks streaks and applies multipliers for consecutive correct answers.
 * Updates each player's cumulative score in place.
 *
 * @param {object} session
 */
function scoreCurrentQuestion(session) {
  const correctIds = new Set(session.currentCorrectAnswerIds || []);
  const timeLimitSec = session.currentTimeLimit || 30;
  const questionId = session.currentQuestionId;

  if (!questionId || !session.answers) return;

  const questionAnswers = session.answers.get(questionId);
  if (!questionAnswers) return;

  // Use session-level scoring config if available, otherwise defaults
  const scoringConfig = session.scoringConfig || DEFAULT_SCORING_CONFIG;

  // Determine the maximum points possible for this question.
  // `session.currentPoints` is the per-question setting:
  // 0 = no points, 1000 = standard, 2000 = double.
  const basePointsSetting = typeof session.currentPoints === 'number'
    ? session.currentPoints
    : scoringConfig.basePoints || DEFAULT_SCORING_CONFIG.basePoints;

  const questionType = session.currentQuestionType || 'multiple-choice';
  const isMultiAnswer = !!session.currentAllowMultipleAnswers && questionType === 'multiple-choice';
  const correctCount = correctIds.size;

  let pointsPossiblePerQuestion = 0;

  if (basePointsSetting <= 0) {
    pointsPossiblePerQuestion = 0;
  } else if (isMultiAnswer && correctCount > 0) {
    // Multi-select questions: standard = 500 per correct answer,
    // double points = 1000 per correct answer.
    const perCorrect = basePointsSetting >= 2000 ? 1000 : 500;
    pointsPossiblePerQuestion = perCorrect * correctCount;
  } else {
    // Single-select and all other scored question types:
    // standard = 1000 points, double = 2000 points.
    pointsPossiblePerQuestion = basePointsSetting;
  }

  // Initialize streak tracking if not present
  if (!session.playerStreaks) {
    session.playerStreaks = new Map();
  }

  const allowPartial = !!session.currentAllowPartialPoints;

  for (const [playerId, answer] of questionAnswers) {
    // Determine correctness based on question type
    let isCorrect = false;
    let correctnessFraction = 0;

    if (questionType === 'slider') {
      // Slider: compare numeric value against correctValue with margin
      const config = session.currentSliderConfig;
      if (config && config.correctValue != null) {
        const playerValue = parseFloat(answer.answerId);
        const margins = { none: 0, low: 0.05, medium: 0.1, high: 0.2, max: 0.5 };
        const marginPct = margins[config.margin] || 0;
        const range = (config.max || 100) - (config.min || 0);
        const tolerance = range * marginPct;
        isCorrect = Math.abs(playerValue - config.correctValue) <= tolerance;
      } else {
        isCorrect = false;
      }
      correctnessFraction = isCorrect ? 1 : 0;
    } else if (questionType === 'sort') {
      // Sort: compare submitted order array against correct order
      if (Array.isArray(answer.answerId) && Array.isArray(session.currentCorrectAnswerIds)) {
        const expected = session.currentCorrectAnswerIds;
        const sameLength = answer.answerId.length === expected.length;
        isCorrect = sameLength && answer.answerId.every((id, i) => id === expected[i]);

        if (allowPartial && sameLength && expected.length > 0) {
          let matches = 0;
          for (let i = 0; i < expected.length; i++) {
            if (answer.answerId[i] === expected[i]) {
              matches++;
            }
          }
          correctnessFraction = matches / expected.length;
        } else {
          correctnessFraction = isCorrect ? 1 : 0;
        }
      } else {
        isCorrect = false;
        correctnessFraction = 0;
      }
    } else if (questionType === 'pin-answer') {
      // Pin: compare {x,y} coordinates against pinConfig within radius
      const config = session.currentPinConfig;
      if (config && config.x != null && config.y != null) {
        let coords;
        try { coords = typeof answer.answerId === 'string' ? JSON.parse(answer.answerId) : answer.answerId; } catch { coords = null; }
        if (coords && coords.x != null && coords.y != null) {
          const dx = coords.x - config.x;
          const dy = coords.y - config.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          isCorrect = distance <= (config.radius || 10);
        } else {
          isCorrect = false;
        }
      } else {
        isCorrect = false;
      }
      correctnessFraction = isCorrect ? 1 : 0;
    } else if (questionType === 'type-answer') {
      // Type-answer: case-insensitive text match against accepted answers
      const accepted = session.currentAcceptedAnswers;
      if (Array.isArray(accepted) && typeof answer.answerId === 'string') {
        const playerText = answer.answerId.trim().toLowerCase();
        isCorrect = accepted.some(a => a.trim().toLowerCase() === playerText);
      } else {
        isCorrect = false;
      }
      correctnessFraction = isCorrect ? 1 : 0;
    } else if (Array.isArray(answer.answerId)) {
      // Multi-answer: player must select ALL correct answers and NO incorrect ones
      const selected = answer.answerId;
      const selectedSet = new Set(selected);
      const allCorrectSelected = [...correctIds].every(id => selectedSet.has(id));
      const noIncorrectSelected = selected.every(id => correctIds.has(id));
      isCorrect = allCorrectSelected && noIncorrectSelected;

      if (allowPartial && isMultiAnswer && correctCount > 0 && noIncorrectSelected) {
        const correctChosen = selected.filter(id => correctIds.has(id)).length;
        correctnessFraction = correctChosen / correctCount;
      } else {
        correctnessFraction = isCorrect ? 1 : 0;
      }
    } else {
      // Single answer: for single-correct questions
      isCorrect = correctIds.has(answer.answerId);
      correctnessFraction = isCorrect ? 1 : 0;
    }

    // Get current streak for player
    let currentStreak = session.playerStreaks.get(playerId) || 0;

    // Update streak based on correctness
    if (isCorrect) {
      currentStreak += 1;
    } else {
      currentStreak = 0;
    }
    session.playerStreaks.set(playerId, currentStreak);

    // Delegate scoring calculation to the utility.
    // Partial points: scale the per-question maximum by correctnessFraction.
    const hasAnyCredit = correctnessFraction > 0 && pointsPossiblePerQuestion > 0;
    const effectivePointsPossible = hasAnyCredit
      ? pointsPossiblePerQuestion * correctnessFraction
      : 0;

    const result = calculateScore({
      isCorrect: hasAnyCredit,
      timeTakenMs: answer.timeTaken || 0,
      timeLimitSec,
      pointsPossible: effectivePointsPossible,
      config: scoringConfig
    });

    // Apply streak multiplier
    const streakBonus = getStreakBonus(currentStreak);
    let finalPoints = result.points;

    if (isCorrect && streakBonus.multiplier > 1.0) {
      finalPoints = Math.round(result.points * streakBonus.multiplier);
    }

    answer.pointsAwarded = finalPoints;
    answer.basePoints = result.points;
    answer.isCorrect = result.isCorrect;
    answer.timeBonus = result.timeBonus;
    answer.streak = currentStreak;
    answer.streakMultiplier = streakBonus.multiplier;
    answer.streakLabel = streakBonus.label;

    // Accumulate into the player's running total
    const player = session.players?.get(playerId);
    if (player) {
      player.score = (player.score || 0) + finalPoints;
      player.currentStreak = currentStreak;
      player.maxStreak = Math.max(player.maxStreak || 0, currentStreak);
    }
  }
}

// ─── Persistence Helpers ──────────────────────────────────────────────────

/**
 * Persist submissions for the current question to the database.
 * This is called every time a question ends so analytics data is durable
 * even if the server restarts before the session finishes.
 *
 * @param {string} sessionPin
 * @param {object} session
 */
async function persistQuestionResults(sessionPin, session) {
  try {
    // Practice sessions are for preview only; skip persistence to keep
    // analytics and exports focused on real games.
    if (session?.isPractice) {
      return;
    }

    const questionId = session.currentQuestionId;
    if (!questionId || !session.answers) return;

    const questionAnswers = session.answers.get(questionId);
    if (!questionAnswers || questionAnswers.size === 0) return;

    const dbSession = await Session.findOne({ pin: sessionPin });
    if (!dbSession) {
      console.warn(`Session ${sessionPin} not found in DB for question persistence`);
      return;
    }

    const sessionId = dbSession._id;

    // Map in‑memory player ids to Participant documents.
    const playerIdToParticipantId = new Map();

    if (session.players) {
      for (const [playerId, player] of session.players) {
        if (!player) continue;

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
          // Keep participant score roughly in sync during the game
          participant.score = player.score || participant.score || 0;
          participant.isConnected = player.isConnected;
          await participant.save();
        }

        playerIdToParticipantId.set(playerId, participant._id);
      }

      // Ensure the session has up‑to‑date participant references
      dbSession.participants = Array.from(playerIdToParticipantId.values());
      await dbSession.save();
    }

    // Upsert one submission per (participant, question)
    const questionType = session.currentQuestionType || 'multiple-choice';

    for (const [playerId, answer] of questionAnswers) {
      const participantId = playerIdToParticipantId.get(playerId);
      if (!participantId) continue;

      const baseUpdate = {
        sessionId,
        questionType: answer.questionType || questionType,
        timeTaken: answer.timeTaken || 0,
        pointsAwarded: answer.pointsAwarded || 0,
        isCorrect: typeof answer.isCorrect === 'boolean' ? answer.isCorrect : null
      };

      // Populate typed answer fields based on question type
      const rawAnswer = answer.answerId;

      if (Array.isArray(rawAnswer)) {
        // Multi-select or sort type
        if (questionType === 'sort') {
          baseUpdate.orderedAnswerIds = rawAnswer;
        } else {
          baseUpdate.answerIds = rawAnswer;
        }
      } else if (typeof rawAnswer === 'string' || rawAnswer == null) {
        if (questionType === 'slider' || questionType === 'scale' || questionType === 'nps-scale') {
          const num = Number(rawAnswer);
          if (Number.isFinite(num)) {
            baseUpdate.numericAnswer = num;
          }
        } else if (questionType === 'type-answer' || questionType === 'word-cloud' || questionType === 'open-ended' || questionType === 'brainstorm') {
          baseUpdate.textAnswer = typeof rawAnswer === 'string' ? rawAnswer : null;
        } else if (questionType === 'pin-answer' || questionType === 'drop-pin') {
          let coords = null;
          try {
            coords = typeof rawAnswer === 'string' ? JSON.parse(rawAnswer) : rawAnswer;
          } catch {
            coords = null;
          }
          if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
            baseUpdate.pinAnswer = {
              x: coords.x,
              y: coords.y
            };
          }
        } else {
          // Default: single-choice style questions
          baseUpdate.answerId = rawAnswer || null;
        }
      } else {
        // Non-string object payloads (e.g. pin-answer sent as object)
        if (questionType === 'pin-answer' || questionType === 'drop-pin') {
          const coords = rawAnswer;
          if (coords && typeof coords.x === 'number' && typeof coords.y === 'number') {
            baseUpdate.pinAnswer = {
              x: coords.x,
              y: coords.y
            };
          }
        }
      }

      await Submission.findOneAndUpdate(
        { participantId, questionId },
        { $set: baseUpdate },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error('persistQuestionResults error:', error);
  }
}

// ─── Leaderboard ────────────────────────────────────────────────────────

/**
 * Compute a full leaderboard sorted by score (descending).
 * Includes every player so each client can find their own position.
 * Includes streak information for gamification.
 *
 * @param {object} session
 * @returns {Array<{ position: number, playerId: string, nickname: string, score: number, streak: number }>}
 */
export function computeLeaderboard(session) {
  if (!session.players) return [];

  const players = Array.from(session.players.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  return players.map((p, i) => ({
    position: i + 1,
    playerId: p.id,
    nickname: p.nickname,
    score: p.score || 0,
    streak: p.currentStreak || 0,
    maxStreak: p.maxStreak || 0
  }));
}

/**
 * Compute final game results (all players ranked) for `game:end`.
 *
 * @param {object} session
 * @returns {{ leaderboard: Array, stats: object }}
 */
export function computeFinalResults(session) {
  const leaderboard = computeLeaderboard(session);

  return {
    leaderboard,
    stats: {
      totalPlayers: leaderboard.length,
      totalQuestions: (session.currentQuestionIndex ?? 0) + 1,
      reason: 'game_complete',
      mode: session.mode || 'competitive'
    }
  };
}
