import { AVATARS } from '../constants/index.js';

/**
 * Get a display avatar for a leaderboard entry.
 * Falls back to a deterministic emoji when no custom avatar is provided.
 *
 * @param {string|null|undefined} avatar
 * @param {number} indexOrPosition - zero-based index or 1-based position
 */
export function getLeaderboardAvatar(avatar, indexOrPosition) {
  if (avatar) return avatar;

  const index = Math.max(0, (indexOrPosition || 0) - 1);
  const pool = AVATARS.LEADERBOARD_AVATARS;

  if (!Array.isArray(pool) || pool.length === 0) return '👤';
  return pool[index % pool.length];
}

/**
 * Get a rank label for the given position, using medals for top 3 and
 * falling back to numeric positions otherwise.
 *
 * @param {number} position - 1-based rank
 */
export function getRankLabel(position) {
  if (!position || position < 1) return '';

  const medal = AVATARS.MEDALS[position - 1];
  return medal || String(position);
}

