import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendServerError
} from '../utils/responseHelper.js';
import { linkMediaToQuiz } from './mediaController.js';

/**
 * Helper to verify quiz ownership
 * @param {string} quizId
 * @param {string} userId
 * @returns {Promise<Quiz|null>}
 */
async function getOwnedQuiz(quizId, userId) {
  return Quiz.findOne({ _id: quizId, moderatorId: userId });
}

/**
 * Helper to verify question ownership via its quiz
 * @param {string} questionId
 * @param {string} userId
 * @returns {Promise<{question: Question, quiz: Quiz}|null>}
 */
async function getOwnedQuestion(questionId, userId) {
  const question = await Question.findById(questionId);
  if (!question) return null;

  const quiz = await Quiz.findOne({ _id: question.quizId, moderatorId: userId });
  if (!quiz) return null;

  return { question, quiz };
}

/**
 * Add a question to a quiz
 * POST /api/quizzes/:quizId/questions
 */
export async function addQuestion(req, res) {
  try {
    const { quizId } = req.params;

    // Verify quiz ownership
    const quiz = await getOwnedQuiz(quizId, req.user.userId);
    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    // Calculate order (append to end)
    const maxOrderQuestion = await Question.findOne({ quizId })
      .sort({ order: -1 })
      .select('order');
    const nextOrder = maxOrderQuestion ? maxOrderQuestion.order + 1 : 0;

    // Create the question
    const {
      type,
      text,
      textToReadAloud,
      mediaUrl,
      mediaType,
      audioLanguage,
      timeLimit,
      points,
      answers,
      allowMultipleAnswers,
      sliderConfig,
      pinConfig,
      scaleConfig,
      brainstormConfig
    } = req.body;

    if (!type) {
      return sendBadRequest(res, 'Question type is required');
    }

    const question = new Question({
      quizId,
      type,
      text,
      textToReadAloud,
      mediaUrl,
      mediaType,
      audioLanguage,
      timeLimit,
      points,
      order: nextOrder,
      answers,
      allowMultipleAnswers,
      sliderConfig,
      pinConfig,
      scaleConfig,
      brainstormConfig
    });

    await question.save();

    // Link media to quiz for access control
    if (question.mediaUrl) {
      await linkMediaToQuiz(question.mediaUrl, quizId);
    }

    // Add question to quiz's questions array
    quiz.questions.push(question._id);
    await quiz.save();

    sendCreated(res, 'Question added', { question });
  } catch (error) {
    console.error('Add question error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' || error.message) {
      return sendBadRequest(res, error.message);
    }

    sendServerError(res, 'Failed to add question');
  }
}

/**
 * Update a question
 * PUT /api/questions/:id
 */
export async function updateQuestion(req, res) {
  try {
    const { id } = req.params;

    // Verify ownership via quiz
    const owned = await getOwnedQuestion(id, req.user.userId);
    if (!owned) {
      return sendNotFound(res, 'Question not found');
    }

    const { question } = owned;

    // Fields that can be updated
    const updateableFields = [
      'type',
      'text',
      'textToReadAloud',
      'mediaUrl',
      'mediaType',
      'audioLanguage',
      'timeLimit',
      'points',
      'answers',
      'allowMultipleAnswers',
      'sliderConfig',
      'pinConfig',
      'scaleConfig',
      'brainstormConfig'
    ];

    // Update only provided fields
    for (const field of updateableFields) {
      if (req.body[field] !== undefined) {
        question[field] = req.body[field];
      }
    }

    await question.save();

    // Link media to quiz for access control if mediaUrl was updated
    if (req.body.mediaUrl) {
      await linkMediaToQuiz(question.mediaUrl, question.quizId);
    }

    sendSuccess(res, { message: 'Question updated', data: { question } });
  } catch (error) {
    console.error('Update question error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError' || error.message) {
      return sendBadRequest(res, error.message);
    }

    sendServerError(res, 'Failed to update question');
  }
}

/**
 * Delete a question
 * DELETE /api/questions/:id
 */
export async function deleteQuestion(req, res) {
  try {
    const { id } = req.params;

    // Verify ownership via quiz
    const owned = await getOwnedQuestion(id, req.user.userId);
    if (!owned) {
      return sendNotFound(res, 'Question not found');
    }

    const { question, quiz } = owned;

    // Remove question from quiz's questions array
    quiz.questions = quiz.questions.filter(
      (qId) => qId.toString() !== question._id.toString()
    );
    await quiz.save();

    // Delete the question
    await question.deleteOne();

    sendSuccess(res, { message: 'Question deleted' });
  } catch (error) {
    console.error('Delete question error:', error);
    sendServerError(res, 'Failed to delete question');
  }
}

/**
 * Reorder questions within a quiz
 * PUT /api/quizzes/:quizId/questions/reorder
 *
 * Body: { questionIds: ['id1', 'id2', 'id3'] }
 * The order of IDs in the array determines the new order (0, 1, 2, ...)
 */
export async function reorderQuestions(req, res) {
  try {
    const { quizId } = req.params;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds)) {
      return sendBadRequest(res, 'questionIds must be an array');
    }

    // Verify quiz ownership
    const quiz = await getOwnedQuiz(quizId, req.user.userId);
    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    // Verify all question IDs belong to this quiz
    const existingIds = quiz.questions.map((id) => id.toString());
    const providedIds = questionIds.map((id) => id.toString());

    // Check that provided IDs match quiz questions
    const invalidIds = providedIds.filter((id) => !existingIds.includes(id));
    if (invalidIds.length > 0) {
      return sendBadRequest(res, `Invalid question IDs: ${invalidIds.join(', ')}`);
    }

    // Update order for each question
    const bulkOps = providedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, quizId },
        update: { $set: { order: index } }
      }
    }));

    if (bulkOps.length > 0) {
      await Question.bulkWrite(bulkOps);
    }

    // Update quiz.questions array to reflect new order
    quiz.questions = providedIds;
    await quiz.save();

    // Fetch updated questions in new order
    const questions = await Question.find({ quizId })
      .sort({ order: 1 });

    sendSuccess(res, { message: 'Questions reordered', data: { questions } });
  } catch (error) {
    console.error('Reorder questions error:', error);
    sendServerError(res, 'Failed to reorder questions');
  }
}

/**
 * Get a single question by ID
 * GET /api/questions/:id
 */
export async function getQuestion(req, res) {
  try {
    const { id } = req.params;

    // Verify ownership via quiz
    const owned = await getOwnedQuestion(id, req.user.userId);
    if (!owned) {
      return sendNotFound(res, 'Question not found');
    }

    sendSuccess(res, { message: 'Question retrieved', data: { question: owned.question } });
  } catch (error) {
    console.error('Get question error:', error);
    sendServerError(res, 'Failed to fetch question');
  }
}

/**
 * List all questions for a quiz
 * GET /api/quizzes/:quizId/questions
 */
export async function listQuestions(req, res) {
  try {
    const { quizId } = req.params;

    // Verify quiz ownership
    const quiz = await getOwnedQuiz(quizId, req.user.userId);
    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    const questions = await Question.find({ quizId })
      .sort({ order: 1 });

    sendSuccess(res, { message: 'Questions retrieved', data: { questions } });
  } catch (error) {
    console.error('List questions error:', error);
    sendServerError(res, 'Failed to fetch questions');
  }
}
