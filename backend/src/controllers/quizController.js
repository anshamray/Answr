import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendServerError
} from '../utils/responseHelper.js';

/**
 * List all quizzes belonging to the authenticated user
 * GET /api/quizzes
 */
export async function listQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find({ moderatorId: req.user.userId })
      .sort({ updatedAt: -1 })
      .lean();

    const quizIds = quizzes.map(q => q._id);
    const sessionCounts = quizIds.length > 0
      ? await Session.aggregate([
        { $match: { quizId: { $in: quizIds } } },
        { $group: { _id: '$quizId', count: { $sum: 1 } } }
      ])
      : [];
    const sessionCountMap = new Map(
      sessionCounts.map(entry => [entry._id.toString(), entry.count])
    );

    // Add questionCount and ensure playCount for display (exclude questions array to keep payload small)
    const enriched = quizzes.map(({ questions, ...q }) => ({
      ...q,
      questionCount: (questions || []).length,
      playCount: Math.max(q.playCount ?? 0, sessionCountMap.get(q._id.toString()) ?? 0)
    }));

    sendSuccess(res, { message: 'Quizzes retrieved', data: { quizzes: enriched } });
  } catch (error) {
    console.error('List quizzes error:', error);
    sendServerError(res, 'Failed to fetch quizzes');
  }
}

/**
 * Get a single quiz with its questions populated
 * GET /api/quizzes/:id
 */
export async function getQuiz(req, res) {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    }).populate({
      path: 'questions',
      options: { sort: { order: 1 } }
    });

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    sendSuccess(res, { message: 'Quiz retrieved', data: { quiz } });
  } catch (error) {
    console.error('Get quiz error:', error);
    sendServerError(res, 'Failed to fetch quiz');
  }
}

/**
 * Create a new quiz
 * POST /api/quizzes
 */
export async function createQuiz(req, res) {
  try {
    const { title, description, category, tags, language, mode } = req.body;

    if (!title) {
      return sendBadRequest(res, 'Title is required');
    }

    const quiz = new Quiz({
      moderatorId: req.user.userId,
      title,
      description: description || '',
      category: category || '',
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      language: language || 'en',
      mode: mode === 'collect-opinions' ? 'collect-opinions' : 'competitive'
    });

    await quiz.save();

    sendCreated(res, 'Quiz created', { quiz });
  } catch (error) {
    console.error('Create quiz error:', error);
    sendServerError(res, 'Failed to create quiz');
  }
}

/**
 * Update an existing quiz
 * PUT /api/quizzes/:id
 */
export async function updateQuiz(req, res) {
  try {
    const { title, description, category, tags, language, mode } = req.body;

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    });

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    // Only update fields that are provided
    if (title !== undefined) quiz.title = title;
    if (description !== undefined) quiz.description = description;
    if (category !== undefined) quiz.category = category;
    if (tags !== undefined) quiz.tags = Array.isArray(tags) ? tags.slice(0, 10) : [];
    if (language !== undefined) quiz.language = language;
    if (mode !== undefined) {
      quiz.mode = mode === 'collect-opinions' ? 'collect-opinions' : 'competitive';
    }

    await quiz.save();

    sendSuccess(res, { message: 'Quiz updated', data: { quiz } });
  } catch (error) {
    console.error('Update quiz error:', error);
    sendServerError(res, 'Failed to update quiz');
  }
}

/**
 * Delete a quiz and all its associated questions
 * DELETE /api/quizzes/:id
 */
export async function deleteQuiz(req, res) {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    });

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    // Delete all questions belonging to this quiz
    await Question.deleteMany({ quizId: quiz._id });

    // Delete the quiz itself
    await quiz.deleteOne();

    sendSuccess(res, { message: 'Quiz deleted' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    sendServerError(res, 'Failed to delete quiz');
  }
}
