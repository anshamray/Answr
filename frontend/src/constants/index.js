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
    'bg-gradient-to-br from-answer-a to-answer-a-dark text-white',
    // B
    'bg-gradient-to-br from-answer-b to-answer-b-dark text-white',
    // C
    'bg-gradient-to-br from-answer-c to-answer-c-dark text-white',
    // D
    'bg-gradient-to-br from-answer-d to-answer-d-dark text-black',
    // E
    'bg-gradient-to-br from-answer-e to-answer-e-dark text-white',
    // F
    'bg-gradient-to-br from-answer-f to-answer-f-dark text-white'
  ],

  // Bar colors for answer distribution chart
  BAR_COLORS: [
    'bg-answer-a',  // A
    'bg-answer-b',  // B
    'bg-answer-c',  // C
    'bg-answer-d',  // D
    'bg-answer-e',  // E
    'bg-answer-f'   // F
  ],

  // Gradients for moderator view
  MODERATOR_GRADIENTS: [
    // A
    'from-answer-a to-answer-a-dark',
    // B
    'from-answer-b to-answer-b-dark',
    // C
    'from-answer-c to-answer-c-dark',
    // D
    'from-answer-d to-answer-d-dark',
    // E
    'from-answer-e to-answer-e-dark',
    // F
    'from-answer-f to-answer-f-dark'
  ],

  // Answer labels (A, B, C, D, E, F)
  LABELS: ['A', 'B', 'C', 'D', 'E', 'F']
};

// PIN validation
export const PIN_REGEX = /^\d{6}$/;

// Player answer limits
export const ANSWER_LIMITS = {
  WORD_CLOUD_MAX_LENGTH: 60,
  TYPE_ANSWER_MAX_LENGTH: 50
};
