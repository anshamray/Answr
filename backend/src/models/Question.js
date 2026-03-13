import mongoose from 'mongoose';

import {
  QUESTION_TYPES,
  getBackendValidationMessages,
  getQuestionValidationErrors
} from '../../../shared/questionTypeSchema.js';

class QuestionValidationError extends Error {
  /**
   * @param {string[]} messages
   * @param {Array<{ code: string, params?: Record<string, any> }>} details
   */
  constructor(messages, details) {
    super(messages.join('; '));
    this.name = 'QuestionValidationError';
    this.messages = messages;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const answerSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
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
  // Optional media that is only shown after the correct answer is revealed
  revealMediaUrl: {
    type: String,
    default: null
  },
  // Optional primary media shown with the question (legacy single URL)
  mediaUrl: {
    type: String,
    default: null
  },
  // Optional multiple media items (images) shown with the question
  mediaUrls: {
    type: [String],
    default: []
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
  // Optional: allow partial points for certain types (e.g. multi-select, sort)
  allowPartialPoints: {
    type: Boolean,
    default: false
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
  allowMultipleCorrectAnswers: {
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
  const structuredErrors = getQuestionValidationErrors(this);

  if (structuredErrors.length > 0) {
    const messages = getBackendValidationMessages(this);
    return next(new QuestionValidationError(messages, structuredErrors));
  }

  next();
});

/**
 * Compound index for efficient queries by quiz and question order.
 * Used when fetching all questions for a quiz in display order.
 */
questionSchema.index({ quizId: 1, order: 1 });

export default mongoose.model('Question', questionSchema);
