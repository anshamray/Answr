import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
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
      .select('-questions');

    sendSuccess(res, { message: 'Quizzes retrieved', data: { quizzes } });
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
    const { title, description, category } = req.body;

    if (!title) {
      return sendBadRequest(res, 'Title is required');
    }

    const quiz = new Quiz({
      moderatorId: req.user.userId,
      title,
      description: description || '',
      category: category || ''
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
    const { title, description, category } = req.body;

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
