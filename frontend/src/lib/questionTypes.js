/**
 * Question type definitions and utilities
 */

export const QUESTION_TYPES = {
  'multiple-choice': { icon: 'grid', label: 'Multiple Choice', color: 'primary' },
  'true-false': { icon: 'check', label: 'True/False', color: 'secondary' },
  'type-answer': { icon: 'type', label: 'Type Answer', color: 'accent' },
  'sort': { icon: 'sort', label: 'Sort', color: 'warning' },
  'slider': { icon: 'sliders', label: 'Slider', color: 'success' },
  'quiz-audio': { icon: 'volume', label: 'Quiz Audio', color: 'primary' },
  'pin-answer': { icon: 'map-pin', label: 'Pin Answer', color: 'secondary' },
  'poll': { icon: 'bar-chart', label: 'Poll', color: 'accent' },
  'word-cloud': { icon: 'cloud', label: 'Word Cloud', color: 'primary' },
  'brainstorm': { icon: 'lightbulb', label: 'Brainstorm', color: 'warning' },
  'drop-pin': { icon: 'target', label: 'Drop Pin', color: 'secondary' },
  'open-ended': { icon: 'message', label: 'Open Ended', color: 'accent' },
  'scale': { icon: 'sliders', label: 'Scale', color: 'success' },
  'nps-scale': { icon: 'trending-up', label: 'NPS Scale', color: 'primary' }
};

/**
 * Get the display label for a question type
 * @param {string} type - The question type key
 * @returns {string} The human-readable label
 */
export function getTypeLabel(type) {
  return QUESTION_TYPES[type]?.label || type;
}

/**
 * Get the color variant for a question type
 * @param {string} type - The question type key
 * @returns {string} The color variant name
 */
export function getTypeColor(type) {
  return QUESTION_TYPES[type]?.color || 'primary';
}

/**
 * Get the icon name for a question type
 * @param {string} type - The question type key
 * @returns {string} The icon name
 */
export function getTypeIcon(type) {
  return QUESTION_TYPES[type]?.icon || 'grid';
}

/**
 * Get full type info for a question type
 * @param {string} type - The question type key
 * @returns {Object} The type info object with icon, label, and color
 */
export function getTypeInfo(type) {
  return QUESTION_TYPES[type] || { icon: 'grid', label: type, color: 'primary' };
}
