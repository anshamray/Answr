import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  moderatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    default: '',
    trim: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],

  // Quiz mode: competitive (scored) vs collect-opinions (survey-style)
  mode: {
    type: String,
    enum: ['competitive', 'collect-opinions'],
    default: 'competitive'
  },

  // Opinion-mode defaults
  isAnonymous: {
    type: Boolean,
    default: false
  },
  showLiveResultsToPlayers: {
    type: Boolean,
    default: true
  },

  // Library fields
  isPublished: {
    type: Boolean,
    default: false
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date,
    default: null
  },
  playCount: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  language: {
    type: String,
    default: 'en',
    enum: ['en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'ru', 'ja', 'zh', 'ko']
  },
  // Original quiz this was cloned from (null if original)
  clonedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient library browsing
quizSchema.index({ isPublished: 1, publishedAt: -1 });
quizSchema.index({ isPublished: 1, playCount: -1 });
quizSchema.index({ tags: 1 });

export default mongoose.model('Quiz', quizSchema);
