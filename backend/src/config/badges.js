/**
 * Badge Definitions for Gamification
 *
 * Each badge has:
 * - id: Unique identifier
 * - name: Display name
 * - description: How to earn it
 * - emoji: Visual representation
 * - category: 'participation' | 'streak' | 'victory' | 'accuracy'
 * - condition: Function to check if badge should be awarded
 */

export const BADGES = {
  // Participation badges
  first_quiz: {
    id: 'first_quiz',
    name: 'First Steps',
    description: 'Complete your first quiz',
    emoji: '\u{1F3C1}',
    category: 'participation',
    condition: (stats) => stats.quizzesCompleted >= 1
  },
  quiz_enthusiast: {
    id: 'quiz_enthusiast',
    name: 'Quiz Enthusiast',
    description: 'Complete 10 quizzes',
    emoji: '\u{1F4DA}',
    category: 'participation',
    condition: (stats) => stats.quizzesCompleted >= 10
  },
  quiz_master: {
    id: 'quiz_master',
    name: 'Quiz Master',
    description: 'Complete 50 quizzes',
    emoji: '\u{1F3C6}',
    category: 'participation',
    condition: (stats) => stats.quizzesCompleted >= 50
  },
  quiz_legend: {
    id: 'quiz_legend',
    name: 'Quiz Legend',
    description: 'Complete 100 quizzes',
    emoji: '\u{1F451}',
    category: 'participation',
    condition: (stats) => stats.quizzesCompleted >= 100
  },

  // Streak badges
  hot_streak: {
    id: 'hot_streak',
    name: 'Hot Streak',
    description: 'Get 3 correct answers in a row',
    emoji: '\u{1F525}',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 3
  },
  on_fire: {
    id: 'on_fire',
    name: 'On Fire',
    description: 'Get 5 correct answers in a row',
    emoji: '\u{1F525}',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 5
  },
  unstoppable: {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Get 8 correct answers in a row',
    emoji: '\u{1F4A5}',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 8
  },
  perfect_streak: {
    id: 'perfect_streak',
    name: 'Perfect Streak',
    description: 'Get 15 correct answers in a row',
    emoji: '\u{2728}',
    category: 'streak',
    condition: (stats) => stats.maxStreak >= 15
  },

  // Victory badges
  first_win: {
    id: 'first_win',
    name: 'Champion',
    description: 'Win your first quiz',
    emoji: '\u{1F947}',
    category: 'victory',
    condition: (stats) => stats.wins >= 1
  },
  five_wins: {
    id: 'five_wins',
    name: 'Consistent Winner',
    description: 'Win 5 quizzes',
    emoji: '\u{1F3C5}',
    category: 'victory',
    condition: (stats) => stats.wins >= 5
  },
  twenty_wins: {
    id: 'twenty_wins',
    name: 'Quiz Champion',
    description: 'Win 20 quizzes',
    emoji: '\u{1F3C6}',
    category: 'victory',
    condition: (stats) => stats.wins >= 20
  },

  // Accuracy badges
  correct_100: {
    id: 'correct_100',
    name: 'Century',
    description: 'Answer 100 questions correctly',
    emoji: '\u{1F4AF}',
    category: 'accuracy',
    condition: (stats) => stats.correctAnswers >= 100
  },
  correct_500: {
    id: 'correct_500',
    name: 'Knowledge Seeker',
    description: 'Answer 500 questions correctly',
    emoji: '\u{1F9E0}',
    category: 'accuracy',
    condition: (stats) => stats.correctAnswers >= 500
  },
  correct_1000: {
    id: 'correct_1000',
    name: 'Walking Encyclopedia',
    description: 'Answer 1000 questions correctly',
    emoji: '\u{1F4D6}',
    category: 'accuracy',
    condition: (stats) => stats.correctAnswers >= 1000
  },

  // Hosting badges (moderator-focused)
  first_host: {
    id: 'first_host',
    name: 'Host Debut',
    description: 'Host your first quiz session',
    emoji: '\u{1F3AE}',
    category: 'host',
    condition: (stats) => (stats.sessionsHosted || 0) >= 1
  },
  host_5: {
    id: 'host_5',
    name: 'Frequent Host',
    description: 'Host 5 quiz sessions',
    emoji: '\u{1F3C1}',
    category: 'host',
    condition: (stats) => (stats.sessionsHosted || 0) >= 5
  },
  host_20: {
    id: 'host_20',
    name: 'Event Organizer',
    description: 'Host 20 quiz sessions',
    emoji: '\u{1F4AA}',
    category: 'host',
    condition: (stats) => (stats.sessionsHosted || 0) >= 20
  },
  host_50: {
    id: 'host_50',
    name: 'Showrunner',
    description: 'Host 50 quiz sessions',
    emoji: '\u{1F451}',
    category: 'host',
    condition: (stats) => (stats.sessionsHosted || 0) >= 50
  }
};

/**
 * Get all badge definitions as an array
 */
export function getAllBadges() {
  return Object.values(BADGES);
}

/**
 * Get badge by ID
 */
export function getBadgeById(badgeId) {
  return BADGES[badgeId] || null;
}

/**
 * Get badges by category
 */
export function getBadgesByCategory(category) {
  return getAllBadges().filter(b => b.category === category);
}

/**
 * Get badge categories
 */
export const BADGE_CATEGORIES = [
  { id: 'participation', name: 'Participation', description: 'Badges for playing quizzes' },
  { id: 'streak', name: 'Streaks', description: 'Badges for consecutive correct answers' },
  { id: 'victory', name: 'Victory', description: 'Badges for winning quizzes' },
  { id: 'accuracy', name: 'Accuracy', description: 'Badges for correct answers' },
  { id: 'host', name: 'Hosting', description: 'Badges for hosting quiz sessions' }
];
