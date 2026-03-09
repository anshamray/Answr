/**
 * Shared quiz mapping helpers for controllers.
 *
 * Centralizes the common "quiz summary" DTO shape used by library endpoints
 * and other views so fields stay consistent across the API.
 */

/**
 * Map a Quiz mongoose document (or plain object) to a library summary DTO.
 *
 * Shape:
 * {
 *   id,
 *   title,
 *   description,
 *   category,
 *   tags,
 *   isOfficial,
 *   playCount,
 *   publishedAt,
 *   author,
 *   questionCount,
 *   isFavorited
 * }
 *
 * @param {object} quiz
 * @param {{ isFavorited?: boolean }} [options]
 */
export function mapQuizToLibrarySummary(quiz, options = {}) {
  const { isFavorited = false } = options;

  if (!quiz) return null;

  const questionCount =
    typeof quiz.questionCount === 'number'
      ? quiz.questionCount
      : Array.isArray(quiz.questions)
        ? quiz.questions.length
        : 0;

  return {
    id: quiz._id,
    title: quiz.title,
    description: quiz.description,
    category: quiz.category,
    tags: quiz.tags,
    isOfficial: quiz.isOfficial,
    playCount: quiz.playCount,
    publishedAt: quiz.publishedAt,
    author: quiz.moderatorId?.name || 'Unknown',
    questionCount,
    isFavorited
  };
}

