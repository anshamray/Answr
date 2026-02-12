/**
 * WS-4: Game Broadcast Events
 *
 * Server-side question timer, answer scoring, and leaderboard computation.
 * These run on the server to ensure authoritative timing and fair scoring.
 *
 * Scoring formula (from project spec):
 *   basePoints = 1000
 *   timeBonus  = (timeLimit − timeTaken) / timeLimit
 *   points     = isCorrect ? round(basePoints × timeBonus) : 0
 *   minimum    = 100 points for any correct answer
 */

import {
  broadcastTimer,
  broadcastQuestionEnd,
  broadcastLeaderboard
} from './gameEvents.js';

const BASE_POINTS = 1000;
const MIN_CORRECT_POINTS = 100;

// ─── Timer ──────────────────────────────────────────────────────────────

/**
 * Start the server-side question timer.
 * Emits `game:timer` every second; auto-ends the question when it reaches 0.
 *
 * @param {import('socket.io').Server} io
 * @param {string} sessionPin
 * @param {object} session - in-memory session object
 */
export function startQuestionTimer(io, sessionPin, session) {
  clearQuestionTimer(session);

  const timeLimit = session.currentTimeLimit || 30;
  session.questionTimeRemaining = timeLimit;

  session.questionTimer = setInterval(() => {
    session.questionTimeRemaining--;
    broadcastTimer(io, sessionPin, session.questionTimeRemaining);

    if (session.questionTimeRemaining <= 0) {
      clearQuestionTimer(session);
      endCurrentQuestion(io, sessionPin, session);
    }
  }, 1000);
}

/**
 * Stop the question timer for a session.
 * @param {object} session
 */
export function clearQuestionTimer(session) {
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

  // 1. Score all submitted answers for this question
  scoreCurrentQuestion(session);

  // 2. Tell every client which answers were correct
  broadcastQuestionEnd(io, sessionPin, {
    correctAnswerIds: session.currentCorrectAnswerIds || []
  });

  // 3. Compute and broadcast the leaderboard
  const leaderboard = computeLeaderboard(session);
  broadcastLeaderboard(io, sessionPin, leaderboard);
}

// ─── Scoring ────────────────────────────────────────────────────────────

/**
 * Score all submitted answers for the current question.
 * Updates each player's cumulative score in place.
 *
 * @param {object} session
 */
function scoreCurrentQuestion(session) {
  const correctIds = new Set(session.currentCorrectAnswerIds || []);
  const timeLimit = session.currentTimeLimit || 30;
  const questionId = session.currentQuestionId;

  if (!questionId || !session.answers) return;

  const questionAnswers = session.answers.get(questionId);
  if (!questionAnswers) return;

  for (const [playerId, answer] of questionAnswers) {
    const isCorrect = correctIds.has(answer.answerId);
    let points = 0;

    if (isCorrect) {
      // timeTaken is in milliseconds from the client
      const timeTakenSec = Math.max(0, (answer.timeTaken || 0) / 1000);
      const timeBonus = Math.max(0, (timeLimit - timeTakenSec) / timeLimit);
      points = Math.round(BASE_POINTS * timeBonus);
      // Guarantee a minimum for every correct answer
      if (points < MIN_CORRECT_POINTS) points = MIN_CORRECT_POINTS;
    }

    answer.pointsAwarded = points;
    answer.isCorrect = isCorrect;

    // Accumulate into the player's running total
    const player = session.players?.get(playerId);
    if (player) {
      player.score = (player.score || 0) + points;
    }
  }
}

// ─── Leaderboard ────────────────────────────────────────────────────────

/**
 * Compute a full leaderboard sorted by score (descending).
 * Includes every player so each client can find their own position.
 *
 * @param {object} session
 * @returns {Array<{ position: number, playerId: string, nickname: string, score: number }>}
 */
export function computeLeaderboard(session) {
  if (!session.players) return [];

  const players = Array.from(session.players.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  return players.map((p, i) => ({
    position: i + 1,
    playerId: p.id,
    nickname: p.nickname,
    score: p.score || 0
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
      reason: 'game_complete'
    }
  };
}
