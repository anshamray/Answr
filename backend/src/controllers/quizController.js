import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import Participant from '../models/Participant.js';
import Submission from '../models/Submission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { badRequest, notFound } from '../utils/httpError.js';
import {
  sendSuccess,
  sendCreated
} from '../utils/responseHelper.js';

/**
 * List all quizzes belonging to the authenticated user
 * GET /api/quizzes
 */
export const listQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find({ moderatorId: req.user.userId })
    .sort({ updatedAt: -1 })
    .lean();

  const quizIds = quizzes.map((q) => q._id);
  const sessionCounts = quizIds.length > 0
    ? await Session.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { _id: '$quizId', count: { $sum: 1 } } }
    ])
    : [];
  const sessionCountMap = new Map(
    sessionCounts.map((entry) => [entry._id.toString(), entry.count])
  );

  const enriched = quizzes.map(({ questions, ...q }) => ({
    ...q,
    questionCount: (questions || []).length,
    playCount: Math.max(q.playCount ?? 0, sessionCountMap.get(q._id.toString()) ?? 0)
  }));

  sendSuccess(res, { message: 'Quizzes retrieved', data: { quizzes: enriched } });
});

/**
 * Get a single quiz with its questions populated
 * GET /api/quizzes/:id
 */
export const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({
    _id: req.params.id,
    moderatorId: req.user.userId
  }).populate({
    path: 'questions',
    options: { sort: { order: 1 } }
  });

  if (!quiz) {
    throw notFound('Quiz not found');
  }

  sendSuccess(res, { message: 'Quiz retrieved', data: { quiz } });
});

/**
 * Create a new quiz
 * POST /api/quizzes
 */
export const createQuiz = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    tags,
    language,
    mode,
    isAnonymous,
    showLiveResultsToPlayers
  } = req.body;

  if (!title) {
    throw badRequest('Title is required');
  }

  const quiz = new Quiz({
    moderatorId: req.user.userId,
    title,
    description: description || '',
    category: category || '',
    tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
    language: language || 'en',
    mode: mode === 'collect-opinions' ? 'collect-opinions' : 'competitive',
    isAnonymous: !!isAnonymous,
    showLiveResultsToPlayers: showLiveResultsToPlayers !== undefined ? !!showLiveResultsToPlayers : true
  });

  await quiz.save();
  sendCreated(res, 'Quiz created', { quiz });
});

/**
 * Update an existing quiz
 * PUT /api/quizzes/:id
 */
export const updateQuiz = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    category,
    tags,
    language,
    mode,
    isAnonymous,
    showLiveResultsToPlayers
  } = req.body;

  const quiz = await Quiz.findOne({
    _id: req.params.id,
    moderatorId: req.user.userId
  });

  if (!quiz) {
    throw notFound('Quiz not found');
  }

  if (title !== undefined) quiz.title = title;
  if (description !== undefined) quiz.description = description;
  if (category !== undefined) quiz.category = category;
  if (tags !== undefined) quiz.tags = Array.isArray(tags) ? tags.slice(0, 10) : [];
  if (language !== undefined) quiz.language = language;
  if (mode !== undefined) {
    quiz.mode = mode === 'collect-opinions' ? 'collect-opinions' : 'competitive';
  }
  if (isAnonymous !== undefined) {
    quiz.isAnonymous = !!isAnonymous;
  }
  if (showLiveResultsToPlayers !== undefined) {
    quiz.showLiveResultsToPlayers = !!showLiveResultsToPlayers;
  }

  await quiz.save();
  sendSuccess(res, { message: 'Quiz updated', data: { quiz } });
});

/**
 * Delete a quiz and all associated data (questions + analytics history)
 * DELETE /api/quizzes/:id
 */
export const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({
    _id: req.params.id,
    moderatorId: req.user.userId
  });

  if (!quiz) {
    throw notFound('Quiz not found');
  }

  await Question.deleteMany({ quizId: quiz._id });
  const sessions = await Session.find({ quizId: quiz._id }).select('_id').lean();
  const sessionIds = sessions.map((session) => session._id);

  if (sessionIds.length > 0) {
    await Submission.deleteMany({ sessionId: { $in: sessionIds } });
    await Participant.deleteMany({ sessionId: { $in: sessionIds } });
    await Session.deleteMany({ _id: { $in: sessionIds } });
  }

  await quiz.deleteOne();
  sendSuccess(res, { message: 'Quiz and associated analytics deleted' });
});
