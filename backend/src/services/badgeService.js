/**
 * Badge Service
 *
 * Handles badge checking, awarding, and user stats updates.
 */

import User from '../models/User.js';
import { BADGES, getAllBadges, getBadgeById } from '../config/badges.js';

/**
 * Check and award badges based on current user stats.
 * Returns array of newly awarded badge IDs.
 *
 * @param {string} userId - User ID
 * @param {object} stats - Current user stats
 * @returns {Promise<string[]>} - Array of newly awarded badge IDs
 */
export async function checkAndAwardBadges(userId, stats) {
  const user = await User.findById(userId);
  if (!user) return [];

  const existingBadgeIds = new Set(
    (user.stats?.badges || []).map(b => b.badgeId)
  );

  const newBadges = [];

  for (const badge of getAllBadges()) {
    // Skip if already earned
    if (existingBadgeIds.has(badge.id)) continue;

    // Check condition
    if (badge.condition(stats)) {
      newBadges.push({
        badgeId: badge.id,
        earnedAt: new Date()
      });
    }
  }

  // Award new badges
  if (newBadges.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $push: { 'stats.badges': { $each: newBadges } }
    });
  }

  return newBadges.map(b => b.badgeId);
}

/**
 * Update user stats after completing a quiz session.
 *
 * @param {string} userId - User ID
 * @param {object} sessionResults - Results from the session
 * @returns {Promise<{ stats: object, newBadges: string[] }>}
 */
export async function updateUserStats(userId, sessionResults) {
  if (!userId) return { stats: null, newBadges: [] };

  const user = await User.findById(userId);
  if (!user) return { stats: null, newBadges: [] };

  // Initialize stats if needed
  if (!user.stats) {
    user.stats = {
      quizzesCompleted: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      wins: 0,
      maxStreak: 0,
      sessionsHosted: 0,
      badges: []
    };
  }

  // Update stats
  user.stats.quizzesCompleted = (user.stats.quizzesCompleted || 0) + 1;
  user.stats.correctAnswers = (user.stats.correctAnswers || 0) + (sessionResults.correctAnswers || 0);
  user.stats.totalAnswers = (user.stats.totalAnswers || 0) + (sessionResults.totalAnswers || 0);

  if (sessionResults.won) {
    user.stats.wins = (user.stats.wins || 0) + 1;
  }

  if (sessionResults.maxStreak > (user.stats.maxStreak || 0)) {
    user.stats.maxStreak = sessionResults.maxStreak;
  }

  await user.save();

  // Check for new badges
  const newBadges = await checkAndAwardBadges(userId, user.stats);

  return { stats: user.stats, newBadges };
}

/**
 * Get user's earned badges with full badge info.
 *
 * @param {string} userId - User ID
 * @returns {Promise<object[]>} - Array of badge objects with earnedAt
 */
export async function getUserBadges(userId) {
  const user = await User.findById(userId);
  if (!user || !user.stats?.badges) return [];

  return user.stats.badges.map(userBadge => {
    const badgeInfo = getBadgeById(userBadge.badgeId);
    return {
      ...badgeInfo,
      earnedAt: userBadge.earnedAt
    };
  }).filter(b => b.id); // Filter out any badges that don't exist in config
}

/**
 * Get user's stats.
 *
 * @param {string} userId - User ID
 * @returns {Promise<object>} - User stats
 */
export async function getUserStats(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  const stats = user.stats || {
    quizzesCompleted: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    wins: 0,
    maxStreak: 0,
    sessionsHosted: 0,
    badges: []
  };

  // Calculate accuracy
  const accuracy = stats.totalAnswers > 0
    ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100)
    : 0;

  return {
    ...stats,
    accuracy,
    badgeCount: stats.badges?.length || 0
  };
}

/**
 * Get all available badges with user's progress.
 *
 * @param {string} userId - User ID
 * @returns {Promise<object[]>} - All badges with earned status
 */
export async function getAllBadgesWithProgress(userId) {
  const user = await User.findById(userId);
  const earnedBadgeIds = new Set(
    (user?.stats?.badges || []).map(b => b.badgeId)
  );

  const stats = user?.stats || {
    quizzesCompleted: 0,
    correctAnswers: 0,
    totalAnswers: 0,
    wins: 0,
    maxStreak: 0,
    sessionsHosted: 0
  };

  return getAllBadges().map(badge => {
    const earned = earnedBadgeIds.has(badge.id);
    const userBadge = (user?.stats?.badges || []).find(b => b.badgeId === badge.id);

    return {
      ...badge,
      earned,
      earnedAt: userBadge?.earnedAt || null,
      progress: calculateBadgeProgress(badge, stats)
    };
  });
}

/**
 * Calculate progress towards a badge (0-100).
 */
function calculateBadgeProgress(badge, stats) {
  // Simple progress calculation based on badge type
  switch (badge.id) {
    case 'first_quiz':
      return Math.min(100, stats.quizzesCompleted * 100);
    case 'quiz_enthusiast':
      return Math.min(100, (stats.quizzesCompleted / 10) * 100);
    case 'quiz_master':
      return Math.min(100, (stats.quizzesCompleted / 50) * 100);
    case 'quiz_legend':
      return Math.min(100, (stats.quizzesCompleted / 100) * 100);
    case 'hot_streak':
      return Math.min(100, (stats.maxStreak / 3) * 100);
    case 'on_fire':
      return Math.min(100, (stats.maxStreak / 5) * 100);
    case 'unstoppable':
      return Math.min(100, (stats.maxStreak / 8) * 100);
    case 'perfect_streak':
      return Math.min(100, (stats.maxStreak / 15) * 100);
    case 'first_win':
      return Math.min(100, stats.wins * 100);
    case 'five_wins':
      return Math.min(100, (stats.wins / 5) * 100);
    case 'twenty_wins':
      return Math.min(100, (stats.wins / 20) * 100);
    case 'correct_100':
      return Math.min(100, (stats.correctAnswers / 100) * 100);
    case 'correct_500':
      return Math.min(100, (stats.correctAnswers / 500) * 100);
    case 'correct_1000':
      return Math.min(100, (stats.correctAnswers / 1000) * 100);
    // Hosting badges
    case 'first_host':
      return Math.min(100, (stats.sessionsHosted || 0) * 100);
    case 'host_5':
      return Math.min(100, ((stats.sessionsHosted || 0) / 5) * 100);
    case 'host_20':
      return Math.min(100, ((stats.sessionsHosted || 0) / 20) * 100);
    case 'host_50':
      return Math.min(100, ((stats.sessionsHosted || 0) / 50) * 100);
    default:
      return 0;
  }
}

/**
 * Update moderator hosting stats after a session.
 *
 * @param {string} userId - Moderator user ID
 * @param {object} hostUpdate - Hosting-related deltas
 * @param {number} hostUpdate.sessionsHostedDelta - How many sessions to add (default 1)
 * @returns {Promise<{ stats: object, newBadges: string[] }>}
 */
export async function updateHostStats(userId, hostUpdate = {}) {
  if (!userId) return { stats: null, newBadges: [] };

  const user = await User.findById(userId);
  if (!user) return { stats: null, newBadges: [] };

  if (!user.stats) {
    user.stats = {
      quizzesCompleted: 0,
      correctAnswers: 0,
      totalAnswers: 0,
      wins: 0,
      maxStreak: 0,
      sessionsHosted: 0,
      badges: []
    };
  }

  const { sessionsHostedDelta = 1 } = hostUpdate;
  if (sessionsHostedDelta !== 0) {
    user.stats.sessionsHosted = (user.stats.sessionsHosted || 0) + sessionsHostedDelta;
  }

  await user.save();

  const newBadges = await checkAndAwardBadges(userId, user.stats);

  return { stats: user.stats, newBadges };
}
