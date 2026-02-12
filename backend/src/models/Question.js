import mongoose from 'mongoose';

/**
 * Question types supported (MVP + future Kahoot-style types).
 * See docs/QuestionTypes.md for full mapping.
 */
export const QUESTION_TYPES = [
  'multiple-choice',
  'true-false',
  'type-answer',
  'puzzle',
  'quiz-audio',
  'slider',
  'pin-answer',
  'poll',
  'word-cloud',
  'brainstorm',
  'drop-pin',
  'open-ended',
  'scale',
  'nps-scale'
];

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
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  textToReadAloud: {
    type: String,
    default: '',
    trim: true,
    maxlength: 120
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio'],
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
  // Slider: min, max, unit, correct value, margin
  sliderConfig: {
    min: Number,
    max: Number,
    unit: { type: String, maxlength: 20 },
    correctValue: Number,
    margin: { type: String, enum: ['none', 'low', 'medium', 'high', 'max'] }
  },
  // Pin Answer / Drop Pin: correct area on image
  pinConfig: {
    x: Number,
    y: Number,
    radius: Number
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

/**
 * Validate answer count based on question type.
 * - multiple-choice: 2–6 answers required
 * - true-false: exactly 2 answers required
 *
 * pre('validate') is a Mongoose middleware hook that runs BEFORE the
 * built-in schema validation (required, enum, min/max, etc.).
 * It has access to `this` (the full document), so we can apply
 * different rules depending on the question type.
 */
questionSchema.pre('validate', function (next) {
  const answerCount = this.answers ? this.answers.length : 0;

  if (this.type === 'multiple-choice') {
    if (answerCount < 2 || answerCount > 6) {
      return next(new Error('Multiple-choice questions require between 2 and 6 answers'));
    }
  }

  if (this.type === 'true-false') {
    if (answerCount !== 2) {
      return next(new Error('True/false questions require exactly 2 answers'));
    }
  }

  next();
});

export default mongoose.model('Question', questionSchema);
