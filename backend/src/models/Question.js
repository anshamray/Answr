import mongoose from 'mongoose';

/**
 * Question types supported.
 * See docs/QuestionTypes.md for full mapping and validation rules.
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

/** Types where `text` is optional (all others: required, max 300 chars). */
const TEXT_OPTIONAL_TYPES = ['brainstorm', 'scale', 'nps-scale'];

/** Types that award points (0 / 1000 / 2000). Opinion types are always 0. */
const SCORED_TYPES = [
  'multiple-choice', 'true-false', 'type-answer',
  'sort', 'quiz-audio', 'slider', 'pin-answer'
];

/** Per-type minimum timeLimit (types not listed default to 5). */
const MIN_TIME_LIMIT = {
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

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const answerSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 75
  },
  imageUrl: {
    type: String,
    default: null
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

const questionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: QUESTION_TYPES
  },
  // Not globally required — enforced per type in pre-validate
  text: {
    type: String,
    default: '',
    trim: true,
    maxlength: 300
  },
  textToReadAloud: {
    type: String,
    default: '',
    trim: true,
    maxlength: 300
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio', null],
    default: null
  },
  audioLanguage: {
    type: String,
    default: null,
    maxlength: 10
  },
  timeLimit: {
    type: Number,
    default: 30,
    min: 5,
    max: 240
  },
  points: {
    type: Number,
    default: 1000,
    enum: [0, 1000, 2000]
  },
  order: {
    type: Number,
    default: 0
  },
  answers: [answerSchema],
  allowMultipleAnswers: {
    type: Boolean,
    default: false
  },

  // Slider-specific
  sliderConfig: {
    min: Number,
    max: Number,
    unit: { type: String, maxlength: 20 },
    correctValue: Number,
    margin: { type: String, enum: ['none', 'low', 'medium', 'high', 'max'] }
  },

  // Pin Answer / Drop Pin: correct area on image
  pinConfig: {
    x: { type: Number, min: 0, max: 100 },
    y: { type: Number, min: 0, max: 100 },
    radius: { type: Number, min: 0 }
  },

  // Scale / NPS
  scaleConfig: {
    scaleType: { type: String, enum: ['likert', 'custom', 'nps'] },
    min: Number,
    max: Number,
    startLabel: String,
    endLabel: String
  },

  // Brainstorm
  brainstormConfig: {
    maxIdeas: { type: Number, min: 1, max: 5 },
    votingTime: Number
  }
}, {
  timestamps: true
});

// ---------------------------------------------------------------------------
// Per-type validation
// ---------------------------------------------------------------------------

/**
 * Comprehensive validation that enforces the rules from QuestionTypes.md
 * for every question type before the document is saved.
 */
questionSchema.pre('validate', function (next) {
  const errors = [];
  const type = this.type;
  const answerCount = this.answers ? this.answers.length : 0;

  // ── 1. text: required for most types ──────────────────────────────────
  if (!TEXT_OPTIONAL_TYPES.includes(type)) {
    if (!this.text || this.text.trim().length === 0) {
      errors.push(`"text" is required for type "${type}"`);
    }
  }

  // ── 2. points: opinion types must be 0 ────────────────────────────────
  if (!SCORED_TYPES.includes(type) && this.points !== 0) {
    errors.push(`Points must be 0 for opinion type "${type}"`);
  }

  // ── 3. timeLimit minimum per type ─────────────────────────────────────
  const minTime = MIN_TIME_LIMIT[type];
  if (minTime !== undefined && this.timeLimit < minTime) {
    errors.push(`timeLimit for "${type}" must be at least ${minTime}s (got ${this.timeLimit}s)`);
  }

  // ── 4. Per-type answer / config validation ────────────────────────────

  switch (type) {
    // ─── multiple-choice ───────────────────────────────────────────────
    case 'multiple-choice': {
      if (answerCount < 2 || answerCount > 6) {
        errors.push('Multiple-choice requires 2–6 answers');
      }
      const hasCorrect = this.answers?.some(a => a.isCorrect === true);
      if (!hasCorrect) {
        errors.push('Multiple-choice requires at least 1 correct answer');
      }
      break;
    }

    // ─── true-false ────────────────────────────────────────────────────
    case 'true-false': {
      if (answerCount !== 2) {
        errors.push('True/false requires exactly 2 answers');
      }
      break;
    }

    // ─── type-answer ───────────────────────────────────────────────────
    case 'type-answer': {
      if (answerCount < 1 || answerCount > 4) {
        errors.push('Type-answer requires 1–4 accepted answers');
      }
      // Enforce 20-char max for type-answer answers
      const tooLong = this.answers?.filter(a => a.text && a.text.length > 20);
      if (tooLong?.length) {
        errors.push('Type-answer: answer text must be 20 characters or fewer');
      }
      break;
    }

    // ─── sort ──────────────────────────────────────────────────────────
    case 'sort': {
      if (answerCount < 3 || answerCount > 4) {
        errors.push('Sort requires 3–4 answers');
      }
      break;
    }

    // ─── quiz-audio ────────────────────────────────────────────────────
    case 'quiz-audio': {
      if (!this.audioLanguage) {
        errors.push('quiz-audio requires audioLanguage');
      }
      break;
    }

    // ─── slider ────────────────────────────────────────────────────────
    case 'slider': {
      if (!this.sliderConfig || this.sliderConfig.min == null || this.sliderConfig.max == null) {
        errors.push('Slider requires sliderConfig with min and max');
      } else if (this.sliderConfig.min >= this.sliderConfig.max) {
        errors.push('sliderConfig.min must be less than sliderConfig.max');
      }
      break;
    }

    // ─── pin-answer ────────────────────────────────────────────────────
    case 'pin-answer': {
      if (!this.mediaUrl) {
        errors.push('pin-answer requires mediaUrl (image)');
      }
      if (!this.pinConfig || this.pinConfig.x == null || this.pinConfig.y == null) {
        errors.push('pin-answer requires pinConfig with x and y coordinates');
      }
      break;
    }

    // ─── poll ──────────────────────────────────────────────────────────
    case 'poll': {
      if (answerCount < 2 || answerCount > 6) {
        errors.push('Poll requires 2–6 answer options');
      }
      break;
    }

    // ─── word-cloud ────────────────────────────────────────────────────
    case 'word-cloud': {
      // No answers or special config required
      break;
    }

    // ─── brainstorm ────────────────────────────────────────────────────
    case 'brainstorm': {
      if (!this.brainstormConfig || this.brainstormConfig.maxIdeas == null) {
        errors.push('Brainstorm requires brainstormConfig with maxIdeas');
      }
      break;
    }

    // ─── drop-pin ──────────────────────────────────────────────────────
    case 'drop-pin': {
      if (!this.mediaUrl) {
        errors.push('drop-pin requires mediaUrl (image)');
      }
      break;
    }

    // ─── open-ended ────────────────────────────────────────────────────
    case 'open-ended': {
      // No answers or special config required
      break;
    }

    // ─── scale ─────────────────────────────────────────────────────────
    case 'scale': {
      if (!this.scaleConfig || !this.scaleConfig.scaleType) {
        errors.push('Scale requires scaleConfig with scaleType');
      }
      break;
    }

    // ─── nps-scale ─────────────────────────────────────────────────────
    case 'nps-scale': {
      if (!this.scaleConfig || !this.scaleConfig.scaleType) {
        errors.push('NPS Scale requires scaleConfig with scaleType');
      }
      break;
    }
  }

  // ── Return errors ─────────────────────────────────────────────────────
  if (errors.length > 0) {
    return next(new Error(errors.join('; ')));
  }

  next();
});

/**
 * Compound index for efficient queries by quiz and question order.
 * Used when fetching all questions for a quiz in display order.
 */
questionSchema.index({ quizId: 1, order: 1 });

export default mongoose.model('Question', questionSchema);
