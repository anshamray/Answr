import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  moderatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pin: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    required: true,
    enum: ['lobby', 'playing', 'paused', 'finished'],
    default: 'lobby'
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant'
  }],
  finishedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
  }
}, {
  timestamps: true
});

/**
 * TTL index: MongoDB automatically deletes documents once `expiresAt` is
 * reached. The `expireAfterSeconds: 0` means "delete at the exact Date
 * stored in the field" (no additional delay).
 */
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('Session', sessionSchema);
