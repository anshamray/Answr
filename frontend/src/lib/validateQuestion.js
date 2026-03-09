/**
 * Client-side question validation that mirrors backend Question model pre-validate hook.
 * Returns an array of i18n keys (with params) for each validation error found.
 */

const TEXT_OPTIONAL_TYPES = ['brainstorm', 'scale', 'nps-scale'];

/**
 * Validate a single question object.
 * @param {Object} question
 * @param {Function} t - vue-i18n translate function
 * @returns {string[]} Array of translated error messages (empty = valid)
 */
export function validateQuestion(question, t) {
  const errors = [];
  const type = question.type;
  const answers = question.answers || [];
  const answerCount = answers.length;

  // 1. text required for most types
  if (!TEXT_OPTIONAL_TYPES.includes(type)) {
    if (!question.text || question.text.trim().length === 0) {
      errors.push(t('questionValidation.textRequired', { type }));
    }
  }

  // 2. Per-type validation
  switch (type) {
    case 'multiple-choice': {
      if (answerCount < 2 || answerCount > 6) {
        errors.push(t('questionValidation.mcAnswerCount'));
      }
      if (!answers.some(a => a.isCorrect === true)) {
        errors.push(t('questionValidation.mcNeedsCorrect'));
      }
      break;
    }
    case 'true-false': {
      if (answerCount !== 2) {
        errors.push(t('questionValidation.tfAnswerCount'));
      }
      break;
    }
    case 'type-answer': {
      if (answerCount < 1 || answerCount > 10) {
        errors.push(t('questionValidation.taAnswerCount'));
      }
      if (answers.some(a => a.text && a.text.length > 20)) {
        errors.push(t('questionValidation.taAnswerLength'));
      }
      break;
    }
    case 'sort': {
      if (answerCount < 3 || answerCount > 4) {
        errors.push(t('questionValidation.sortAnswerCount'));
      }
      break;
    }
    case 'quiz-audio': {
      if (!question.audioLanguage) {
        errors.push(t('questionValidation.audioLanguageRequired'));
      }
      break;
    }
    case 'slider': {
      if (!question.sliderConfig || question.sliderConfig.min == null || question.sliderConfig.max == null) {
        errors.push(t('questionValidation.sliderConfigRequired'));
      } else if (question.sliderConfig.min >= question.sliderConfig.max) {
        errors.push(t('questionValidation.sliderMinMax'));
      }
      break;
    }
    case 'pin-answer': {
      if (!question.mediaUrl) {
        errors.push(t('questionValidation.pinImageRequired'));
      }
      if (!question.pinConfig || question.pinConfig.x == null || question.pinConfig.y == null) {
        errors.push(t('questionValidation.pinConfigRequired'));
      }
      break;
    }
    case 'poll': {
      if (answerCount < 2 || answerCount > 6) {
        errors.push(t('questionValidation.pollAnswerCount'));
      }
      break;
    }
    case 'brainstorm': {
      if (!question.brainstormConfig || question.brainstormConfig.maxIdeas == null) {
        errors.push(t('questionValidation.brainstormConfigRequired'));
      }
      break;
    }
    case 'drop-pin': {
      if (!question.mediaUrl) {
        errors.push(t('questionValidation.dropPinImageRequired'));
      }
      break;
    }
    case 'scale': {
      if (!question.scaleConfig || !question.scaleConfig.scaleType) {
        errors.push(t('questionValidation.scaleConfigRequired'));
      }
      break;
    }
    case 'nps-scale': {
      if (!question.scaleConfig || !question.scaleConfig.scaleType) {
        errors.push(t('questionValidation.npsScaleConfigRequired'));
      }
      break;
    }
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
