import { getQuestionValidationErrors } from '../../shared/questionTypeSchema.js';

/**
 * Client-side question validation that mirrors the shared
 * `shared/questionTypeSchema.js` rules (also used by the backend model).
 * Returns translated messages using the provided vue-i18n `t` function.
 */

/**
 * Validate a single question object.
 * @param {Object} question
 * @param {Function} t - vue-i18n translate function
 * @returns {string[]} Array of translated error messages (empty = valid)
 */
export function validateQuestion(question, t) {
  const errors = [];

  const structuredErrors = getQuestionValidationErrors(question);

  for (const error of structuredErrors) {
    const { code, params } = error;
    if (code === 'textRequired') {
      errors.push(t(`questionValidation.${code}`, { type: question.type, ...(params || {}) }));
      continue;
    }

    // Only use translation keys that exist in the frontend i18n bundle.
    // Unknown codes fall back to the raw code for easier debugging.
    const key = `questionValidation.${code}`;
    errors.push(t(key, params || {}));
  }

  return errors;
}

/**
 * Validate all questions in a quiz.
 * @param {Object[]} questions
 * @param {Function} t - vue-i18n translate function
 * @returns {{ valid: boolean, errors: Array<{ index: number, questionId: string, errors: string[] }> }}
 */
export function validateAllQuestions(questions, t) {
  const results = [];
  for (let i = 0; i < questions.length; i++) {
    const errs = validateQuestion(questions[i], t);
    if (errs.length > 0) {
      results.push({ index: i, questionId: questions[i]._id, errors: errs });
    }
  }
  return { valid: results.length === 0, errors: results };
}
