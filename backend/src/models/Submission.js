import mongoose from 'mongoose';

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
  answerId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
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
