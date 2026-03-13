/**
 * Shared constants for the Answr frontend application
 */

// Timing constants (in milliseconds)
export const TIMING = {
  SHAKE_DURATION: 500,
  COPY_FEEDBACK_DURATION: 2000,
  SAVE_STATUS_RESET: 2000,
  SOCKET_CONNECTION_TIMEOUT: 5000,
  SEARCH_DEBOUNCE_DELAY: 300,
  REDIRECT_DELAY: 3000,
  DOTS_ANIMATION_INTERVAL: 500
};

// Storage keys for localStorage/sessionStorage
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  GUEST_TOKEN: 'guestToken',
  GUEST_SESSION_ID: 'guestSessionId',
  GAME_SETTINGS: 'gameSettings'
};

// Avatar and emoji collections
export const AVATARS = {
  // 48 profile emojis for player selection
  PROFILE_EMOJIS: [
    '👑', '🔥', '⭐', '💪', '🎯', '🚀', '⚡', '💎',
    '🎨', '🎭', '🎪', '🎸', '🎮', '🎲', '🏆', '🎵',
    '🌟', '✨', '💫', '🌈', '🦄', '🐉', '🦋', '🌸',
    '🍕', '🍔', '🍣', '🍩', '🍿', '🧁', '🍦', '🌮',
    '⚽', '🏀', '🎾', '⚾', '🏐', '🎱', '🏓', '🎳',
    '🤖', '👾', '🛸', '🪐', '🌙', '☀️', '🌊', '🏔️'
  ],

  // Leaderboard avatars (used when player avatar is not available)
  LEADERBOARD_AVATARS: ['👑', '⭐', '🔥', '💪', '🎯', '🚀', '⚡', '💎', '🎮', '🌟'],

  // Lobby player avatars
  LOBBY_AVATARS: ['🎮', '🔥', '⭐', '💪', '🎯', '🚀', '⚡', '💎', '👑', '🎉', '🎸', '🌟'],

  // Medal emojis for top 3 positions
  MEDALS: ['🥇', '🥈', '🥉']
};

// Answer display colors and gradients
export const ANSWER_COLORS = {
  // Gradients for answer buttons (player view)
  BUTTON_GRADIENTS: [
    'bg-gradient-to-br from-red-500 to-red-600 text-white',
    'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
    'bg-gradient-to-br from-yellow-400 to-yellow-500 text-black',
    'bg-gradient-to-br from-green-500 to-green-600 text-white',
    'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
    'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
  ],

  // Bar colors for answer distribution chart
  BAR_COLORS: ['bg-red-500', 'bg-blue-500', 'bg-yellow-400', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'],

  // Gradients for moderator view
  MODERATOR_GRADIENTS: [
    'from-primary to-primary-dark',
    'from-secondary to-secondary-dark',
    'from-accent to-accent-dark',
    'from-warning to-warning/80'
  ],

  // Answer labels (A, B, C, D, E, F)
  LABELS: ['A', 'B', 'C', 'D', 'E', 'F']
};

// PIN validation
export const PIN_REGEX = /^\d{6}$/;
