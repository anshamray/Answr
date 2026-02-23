import mongoose from 'mongoose';

/**
 * Submission schema — stores a participant's answer to a single question.
 *
 * The answer payload is polymorphic: which field(s) are populated depends
 * on the question type.  `questionType` is stored alongside the answer so
 * consumers can interpret the payload without joining back to Question.
 *
 * Mapping:
 *   multiple-choice / true-false / poll  → answerId  (+ answerIds for multi-select)
 *   type-answer / word-cloud / open-ended → textAnswer
 *   slider                                → numericAnswer
 *   pin-answer / drop-pin                 → pinAnswer { x, y }
 *   sort                                  → orderedAnswerIds [ObjectId]
 *   brainstorm                            → textAnswer (idea text)
 *   scale / nps-scale                     → numericAnswer
 *   quiz-audio                            → answerId (same as MC)
 */
const submissionSchema = new mongoose.Schema({
  participantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  isCorrect: {
    type: Boolean,
    default: null
  },
  questionType: {
    type: String,
    required: true,
    trim: true
  },

  // ── Answer payloads (use the one that matches questionType) ───────────

  // For MC, true-false, poll, quiz-audio: single selected answer
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  // For MC / poll with allowMultipleAnswers: multiple selected answers
  answerIds: [{
    type: mongoose.Schema.Types.ObjectId
  }],

  // For type-answer, word-cloud, open-ended, brainstorm: free text
  textAnswer: {
    type: String,
    default: null,
    trim: true
  },

  // For slider, scale, nps-scale: numeric value
  numericAnswer: {
    type: Number,
    default: null
  },

  // For pin-answer, drop-pin: coordinates on image (percentage 0–100)
  pinAnswer: {
    x: { type: Number, min: 0, max: 100 },
    y: { type: Number, min: 0, max: 100 }
  },

  // For sort: answers in the order the player arranged them
  orderedAnswerIds: [{
    type: mongoose.Schema.Types.ObjectId
  }],

  // ── Common fields ─────────────────────────────────────────────────────

  timeTaken: {
    type: Number,
    required: true,
    min: 0
  },
  pointsAwarded: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Fast lookups: all submissions for a question, or all by a participant
submissionSchema.index({ questionId: 1 });
submissionSchema.index({ participantId: 1 });

// Prevent duplicate submissions: one answer per participant per question
submissionSchema.index({ participantId: 1, questionId: 1 }, { unique: true });

export default mongoose.model('Submission', submissionSchema);
