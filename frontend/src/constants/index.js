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
    // A
    'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
    // B
    'bg-gradient-to-br from-sky-500 to-sky-600 text-white',
    // C
    'bg-gradient-to-br from-rose-500 to-rose-600 text-white',
    // D
    'bg-gradient-to-br from-amber-400 to-amber-500 text-black',
    // E
    'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white',
    // F
    'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 text-white'
  ],

  // Bar colors for answer distribution chart
  BAR_COLORS: [
    'bg-purple-500',  // A
    'bg-sky-500',     // B
    'bg-rose-500',    // C
    'bg-amber-400',   // D
    'bg-emerald-500', // E
    'bg-fuchsia-500'  // F
  ],

  // Gradients for moderator view
  MODERATOR_GRADIENTS: [
    // A
    'from-purple-500 to-purple-600',
    // B
    'from-sky-500 to-sky-600',
    // C
    'from-rose-500 to-rose-600',
    // D
    'from-amber-400 to-amber-500',
    // E
    'from-emerald-500 to-emerald-600',
    // F
    'from-fuchsia-500 to-fuchsia-600'
  ],

  // Answer labels (A, B, C, D, E, F)
  LABELS: ['A', 'B', 'C', 'D', 'E', 'F']
};

// PIN validation
export const PIN_REGEX = /^\d{6}$/;
