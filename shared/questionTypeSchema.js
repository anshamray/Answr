/**
 * Canonical question type schema and validation rules.
 *
 * This module is shared between:
 * - Backend: `backend/src/models/Question.js` (Mongoose pre-validate hook)
 * - Frontend: `frontend/src/lib/validateQuestion.js` (client-side validation)
 *
 * Any rule changes should be made here so both sides stay in sync.
 */

export const QUESTION_TYPES = [
  // Test knowledge (scored)
  'multiple-choice',
  'true-false',
  'type-answer',
  'sort',
  'quiz-audio',
  'slider',
  'pin-answer',
  // Collect opinions (no points)
  'poll',
  'word-cloud',
  'brainstorm',
  'drop-pin',
  'open-ended',
  'scale',
  'nps-scale'
];

// Types where `text` is optional (all others: required, max 300 chars).
export const TEXT_OPTIONAL_TYPES = ['brainstorm', 'scale', 'nps-scale'];

// Types that award points (0 / 1000 / 2000). Opinion types are always 0.
export const SCORED_TYPES = [
  'multiple-choice',
  'true-false',
  'type-answer',
  'sort',
  'quiz-audio',
  'slider',
  'pin-answer'
];

// Per-type minimum timeLimit (types not listed default to 5).
export const MIN_TIME_LIMIT = {
  'multiple-choice': 5,
  'true-false':      5,
  'type-answer':     20,
  'sort':            20,
  'quiz-audio':      5,
  'slider':          10,
  'pin-answer':      20,
  'poll':            5,
  'word-cloud':      20,
  'brainstorm':      30,
  'drop-pin':        20,
  'open-ended':      20
  // scale, nps-scale: no timeLimit enforced
};

/**
 * Compute structured validation errors for a question-like object.
 *
 * The returned errors use stable `code` keys that the frontend can translate
 * (e.g. `questionValidation[code]`), while the backend can convert them to
 * human-readable error messages.
 *
 * @param {object} question - Plain object or Mongoose document
 * @returns {Array<{ code: string, params?: Record<string, any> }>}
 */
export function getQuestionValidationErrors(question) {
  const errors = [];
  if (!question) return errors;

  const type = question.type;
  const answers = question.answers || [];
  const answerCount = answers.length;
  const timeLimit = typeof question.timeLimit === 'number' ? question.timeLimit : 0;

  // ── 1. text: required for most types ─────────────────────────────────────
  if (!TEXT_OPTIONAL_TYPES.includes(type)) {
    const text = (question.text || '').trim();
    if (!text) {
      errors.push({ code: 'textRequired', params: { type } });
    }
  }

  // ── 2. points: opinion types must be 0 (backend-only rule) ───────────────
  // Frontend may still show warnings, but we keep code so backend can enforce.
  if (!SCORED_TYPES.includes(type) && typeof question.points === 'number' && question.points !== 0) {
    errors.push({ code: 'pointsMustBeZeroForOpinionType', params: { type } });
  }

  // ── 3. timeLimit minimum per type ────────────────────────────────────────
  const minTime = MIN_TIME_LIMIT[type];
  if (minTime !== undefined && timeLimit < minTime) {
    errors.push({ code: 'timeLimitTooLow', params: { type, minTime, timeLimit } });
  }

  // ── 4. Per-type answer / config validation ───────────────────────────────
  switch (type) {
    case 'multiple-choice': {
      if (answerCount < 2 || answerCount > 6) {
        errors.push({ code: 'mcAnswerCount' });
      }
      const correctCount = answers.filter(a => a && a.isCorrect === true).length;
      if (correctCount === 0) {
        errors.push({ code: 'mcNeedsCorrect' });
      }
      const allowsMultipleCorrect = !!question.allowMultipleCorrectAnswers || !!question.allowMultipleAnswers;
      if (correctCount > 1 && !allowsMultipleCorrect) {
        errors.push({ code: 'mcMultipleCorrectRequiresFlag' });
      }
      break;
    }

    case 'true-false': {
      if (answerCount !== 2) {
        errors.push({ code: 'tfAnswerCount' });
      }
      break;
    }

    case 'type-answer': {
      if (answerCount < 1 || answerCount > 10) {
        errors.push({ code: 'taAnswerCount' });
      }
      const tooLong = answers.some(a => a && typeof a.text === 'string' && a.text.length > 20);
      if (tooLong) {
        errors.push({ code: 'taAnswerLength' });
      }
      break;
    }

    case 'sort': {
      if (answerCount < 3 || answerCount > 4) {
        errors.push({ code: 'sortAnswerCount' });
      }
      break;
    }

    case 'quiz-audio': {
      if (!question.audioLanguage) {
        errors.push({ code: 'audioLanguageRequired' });
      }
      break;
    }

    case 'slider': {
      const cfg = question.sliderConfig || {};
      if (cfg.min == null || cfg.max == null) {
        errors.push({ code: 'sliderConfigRequired' });
      } else if (cfg.min >= cfg.max) {
        errors.push({ code: 'sliderMinMax' });
      }
      break;
    }

    case 'pin-answer': {
      if (!question.mediaUrl) {
        errors.push({ code: 'pinImageRequired' });
      }
      const pin = question.pinConfig || {};
      if (pin.x == null || pin.y == null) {
        errors.push({ code: 'pinConfigRequired' });
      }
      break;
    }

    case 'poll': {
      if (answerCount < 2 || answerCount > 6) {
        errors.push({ code: 'pollAnswerCount' });
      }
      break;
    }

    case 'brainstorm': {
      const cfg = question.brainstormConfig || {};
      if (cfg.maxIdeas == null) {
        errors.push({ code: 'brainstormConfigRequired' });
      }
      break;
    }

    case 'drop-pin': {
      if (!question.mediaUrl) {
        errors.push({ code: 'dropPinImageRequired' });
      }
      break;
    }

    case 'scale': {
      const cfg = question.scaleConfig || {};
      if (!cfg.scaleType) {
        errors.push({ code: 'scaleConfigRequired' });
      }
      break;
    }

    case 'nps-scale': {
      const cfg = question.scaleConfig || {};
      if (!cfg.scaleType) {
        errors.push({ code: 'npsScaleConfigRequired' });
      }
      break;
    }

    // word-cloud, open-ended: currently no extra constraints
    default:
      break;
  }

  return errors;
}

/**
 * Backend-only helper: convert validation errors into human-readable
 * messages suitable for throwing inside the Mongoose pre-validate hook.
 *
 * @param {object} question
 * @returns {string[]} plain English error messages
 */
export function getBackendValidationMessages(question) {
  const errors = getQuestionValidationErrors(question);

  return errors.map((error) => {
    const { code, params = {} } = error;
    const type = params.type || question.type;

    switch (code) {
      case 'textRequired':
        return `"text" is required for type "${type}"`;
      case 'pointsMustBeZeroForOpinionType':
        return `Points must be 0 for opinion type "${type}"`;
      case 'timeLimitTooLow':
        return `timeLimit for "${type}" must be at least ${params.minTime}s (got ${params.timeLimit}s)`;
      case 'mcAnswerCount':
        return 'Multiple-choice requires 2–6 answers';
      case 'mcNeedsCorrect':
        return 'Multiple-choice requires at least 1 correct answer';
      case 'mcMultipleCorrectRequiresFlag':
        return 'Multiple-choice with more than 1 correct answer requires allowMultipleCorrectAnswers=true';
      case 'tfAnswerCount':
        return 'True/false requires exactly 2 answers';
      case 'taAnswerCount':
        return 'Type-answer requires 1–10 accepted answers';
      case 'taAnswerLength':
        return 'Type-answer: answer text must be 20 characters or fewer';
      case 'sortAnswerCount':
        return 'Sort requires 3–4 answers';
      case 'audioLanguageRequired':
        return 'quiz-audio requires audioLanguage';
      case 'sliderConfigRequired':
        return 'Slider requires sliderConfig with min and max';
      case 'sliderMinMax':
        return 'sliderConfig.min must be less than sliderConfig.max';
      case 'pinImageRequired':
        return 'pin-answer requires mediaUrl (image)';
      case 'pinConfigRequired':
        return 'pin-answer requires pinConfig with x and y coordinates';
      case 'pollAnswerCount':
        return 'Poll requires 2–6 answer options';
      case 'brainstormConfigRequired':
        return 'Brainstorm requires brainstormConfig with maxIdeas';
      case 'dropPinImageRequired':
        return 'drop-pin requires mediaUrl (image)';
      case 'scaleConfigRequired':
        return 'Scale requires scaleConfig with scaleType';
      case 'npsScaleConfigRequired':
        return 'NPS Scale requires scaleConfig with scaleType';
      default:
        return code;
    }
  });
}

