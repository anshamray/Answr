import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  socketId: {
    type: String,
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  score: {
    type: Number,
    default: 0
  },
  isConnected: {
    type: Boolean,
    default: true
  },
  disconnectedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for fast lookups: all participants in a session
participantSchema.index({ sessionId: 1 });

export default mongoose.model('Participant', participantSchema);
