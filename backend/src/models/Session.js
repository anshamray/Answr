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
    default: null   // null for guest-hosted sessions
  },
  // Opaque token that allows a guest (unauthenticated user) to control the
  // session they started.  Null when the host is a logged-in moderator.
  guestToken: {
    type: String,
    default: null
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

/**
 * Compound index for efficient queries by moderator and status.
 * Used when fetching a moderator's active sessions.
 */
sessionSchema.index({ moderatorId: 1, status: 1 });

export default mongoose.model('Session', sessionSchema);
