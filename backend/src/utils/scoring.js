/**
 * WS-5: Scoring Utility
 *
 * Calculates points based on correctness and response time.
 * Configurable base points and wrong‑answer behaviour.
 *
 * Kahoot‑style scoring formula (for correct answers):
 *
 * - If the player answers in < 0.5s: always award full pointsPossible.
 * - Otherwise:
 *   let r = responseTime / questionTimer
 *   let v = 1 - (r / 2)
 *   points = round(pointsPossible * v)
 *
 * Or, expressed as:
 *   ⌊ ( 1 - (( responseTime / questionTimer ) / 2 )) × pointsPossible ⌉
 */

// ─── Default Configuration ───────────────────────────────────────────────────

export const DEFAULT_SCORING_CONFIG = {
  basePoints: 1000,        // Maximum points for instant correct answer
  wrongAnswerPoints: 0     // Points for incorrect answers
};

// ─── Streak Configuration ────────────────────────────────────────────────────

export const STREAK_CONFIG = {
  thresholds: [
    { streak: 2, multiplier: 1.1, label: 'Hot!' },
    { streak: 3, multiplier: 1.2, label: 'On Fire!' },
    { streak: 5, multiplier: 1.3, label: 'Unstoppable!' },
    { streak: 8, multiplier: 1.5, label: 'LEGENDARY!' }
  ]
};

/**
 * Get the streak multiplier and label for a given streak count.
 *
 * @param {number} streak - Current streak count
 * @returns {{ multiplier: number, label: string | null }}
 */
export function getStreakBonus(streak) {
  if (!streak || streak < 2) {
    return { multiplier: 1.0, label: null };
  }

  // Find the highest applicable threshold
  let applicable = { multiplier: 1.0, label: null };

  for (const threshold of STREAK_CONFIG.thresholds) {
    if (streak >= threshold.streak) {
      applicable = { multiplier: threshold.multiplier, label: threshold.label };
    } else {
      break;
    }
  }

  return applicable;
}

// ─── Score Calculation ───────────────────────────────────────────────────────

/**
 * Calculate points for a single answer submission.
 *
 * @param {Object} params
 * @param {boolean} params.isCorrect - Whether the answer is correct
 * @param {number} params.timeTakenMs - Time taken to answer in milliseconds
 * @param {number} params.timeLimitSec - Question time limit in seconds
 * @param {number} [params.pointsPossible] - Maximum points possible for this answer
 * @param {Object} [params.config] - Optional scoring configuration override
 * @returns {{ points: number, timeBonus: number, isCorrect: boolean }}
 */
export function calculateScore({ isCorrect, timeTakenMs, timeLimitSec, pointsPossible, config = {} }) {
  const {
    wrongAnswerPoints = DEFAULT_SCORING_CONFIG.wrongAnswerPoints
  } = config;

  const maxPoints = typeof pointsPossible === 'number' && pointsPossible >= 0
    ? pointsPossible
    : DEFAULT_SCORING_CONFIG.basePoints;

  // Wrong answer = configured wrong answer points (default 0)
  if (!isCorrect) {
    return {
      points: wrongAnswerPoints,
      timeBonus: 0,
      isCorrect: false
    };
  }

  // Convert time taken to seconds and clamp to valid range
  const timeTakenSec = Math.max(0, (timeTakenMs || 0) / 1000);
  const effectiveTimeLimit = Math.max(0.5, timeLimitSec || 30);

  // Fast answers (< 0.5s) always receive full points
  if (timeTakenSec < 0.5) {
    return {
      points: Math.round(maxPoints),
      timeBonus: 1,
      isCorrect: true
    };
  }

  // Core formula:
  // r = responseTime / questionTimer
  // v = 1 - (r / 2)
  // points = round(pointsPossible * v)
  const r = Math.min(1, timeTakenSec / effectiveTimeLimit);
  const timeBonus = 1 - (r / 2);

  let points = Math.round(maxPoints * timeBonus);
  if (!Number.isFinite(points) || points < 0) {
    points = 0;
  }

  return {
    points,
    timeBonus,
    isCorrect: true
  };
}

/**
 * Calculate scores for multiple answers to the same question.
 *
 * @param {Array<{ playerId: string, answerId: string, timeTakenMs: number }>} answers
 * @param {Set<string>|Array<string>} correctAnswerIds - IDs of correct answers
 * @param {number} timeLimitSec - Question time limit in seconds
 * @param {Object} [config] - Optional scoring configuration
 * @param {number} [pointsPossible] - Maximum points possible for this question
 * @returns {Map<string, { playerId: string, points: number, timeBonus: number, isCorrect: boolean }>}
 */
export function calculateScoresForQuestion(answers, correctAnswerIds, timeLimitSec, config = {}, pointsPossible) {
  const correctSet = correctAnswerIds instanceof Set
    ? correctAnswerIds
    : new Set(correctAnswerIds);

  const results = new Map();

  for (const answer of answers) {
    const isCorrect = correctSet.has(answer.answerId);
    const result = calculateScore({
      isCorrect,
      timeTakenMs: answer.timeTakenMs || answer.timeTaken,
      timeLimitSec,
      pointsPossible,
      config
    });

    results.set(answer.playerId, {
      playerId: answer.playerId,
      ...result
    });
  }

  return results;
}

/**
 * Create a scoring configuration with custom values.
 * Merges provided options with defaults.
 *
 * @param {Object} options
 * @param {number} [options.basePoints] - Maximum points for instant correct answer
 * @param {number} [options.minCorrectPoints] - Minimum points for correct answer
 * @param {number} [options.timeFactor] - Time bonus multiplier (1 = linear, >1 = steeper decay)
 * @param {number} [options.wrongAnswerPoints] - Points for wrong answers
 * @returns {Object}
 */
export function createScoringConfig(options = {}) {
  return {
    ...DEFAULT_SCORING_CONFIG,
    ...options
  };
}

/**
 * Validate a scoring configuration.
 *
 * @param {Object} config
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateScoringConfig(config) {
  const errors = [];

  if (typeof config.basePoints !== 'number' || config.basePoints < 0) {
    errors.push('basePoints must be a non-negative number');
  }

  if (typeof config.minCorrectPoints !== 'number' || config.minCorrectPoints < 0) {
    errors.push('minCorrectPoints must be a non-negative number');
  }

  if (config.minCorrectPoints > config.basePoints) {
    errors.push('minCorrectPoints cannot exceed basePoints');
  }

  if (typeof config.timeFactor !== 'number' || config.timeFactor <= 0) {
    errors.push('timeFactor must be a positive number');
  }

  if (typeof config.wrongAnswerPoints !== 'number') {
    errors.push('wrongAnswerPoints must be a number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
