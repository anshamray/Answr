import { asyncHandler } from '../middleware/asyncHandler.js';
import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import { badRequest, notFound } from '../utils/httpError.js';
import {
  sendSuccess,
  sendCreated
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
export const addQuestion = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const quiz = await getOwnedQuiz(quizId, req.user.userId);
  if (!quiz) {
    throw notFound('Quiz not found');
  }

  const maxOrderQuestion = await Question.findOne({ quizId })
    .sort({ order: -1 })
    .select('order');
  const nextOrder = maxOrderQuestion ? maxOrderQuestion.order + 1 : 0;

  const {
    type,
    text,
    textToReadAloud,
    mediaUrls,
    mediaUrl,
    mediaType,
    audioLanguage,
    timeLimit,
    points,
    answers,
    allowMultipleAnswers,
    allowMultipleCorrectAnswers,
    allowPartialPoints,
    sliderConfig,
    pinConfig,
    scaleConfig,
    brainstormConfig,
    revealMediaUrl
  } = req.body;

  if (!type) {
    throw badRequest('Question type is required');
  }

  const question = new Question({
    quizId,
    type,
    text,
    textToReadAloud,
    mediaUrls,
    mediaUrl,
    mediaType,
    revealMediaUrl,
    audioLanguage,
    timeLimit,
    points,
    order: nextOrder,
    answers,
    allowMultipleAnswers,
    allowMultipleCorrectAnswers,
    allowPartialPoints,
    sliderConfig,
    pinConfig,
    scaleConfig,
    brainstormConfig
  });

  try {
    await question.save();
  } catch (error) {
    if (error.name === 'QuestionValidationError' || error.name === 'ValidationError') {
      throw badRequest(error.message);
    }
    throw error;
  }

  if (question.mediaUrl) {
    await linkMediaToQuiz(question.mediaUrl, quizId);
  }
  if (Array.isArray(question.mediaUrls)) {
    for (const url of question.mediaUrls) {
      if (url) {
        await linkMediaToQuiz(url, quizId);
      }
    }
  }
  if (question.revealMediaUrl) {
    await linkMediaToQuiz(question.revealMediaUrl, quizId);
  }

  quiz.questions.push(question._id);
  await quiz.save();
  sendCreated(res, 'Question added', { question });
});

/**
 * Update a question
 * PUT /api/questions/:id
 */
export const updateQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owned = await getOwnedQuestion(id, req.user.userId);
  if (!owned) {
    throw notFound('Question not found');
  }

  const { question } = owned;
  const updateableFields = [
    'type',
    'text',
    'textToReadAloud',
    'mediaUrls',
    'mediaUrl',
    'mediaType',
    'revealMediaUrl',
    'audioLanguage',
    'timeLimit',
    'points',
    'answers',
    'allowMultipleAnswers',
    'allowMultipleCorrectAnswers',
    'allowPartialPoints',
    'sliderConfig',
    'pinConfig',
    'scaleConfig',
    'brainstormConfig'
  ];

  for (const field of updateableFields) {
    if (req.body[field] !== undefined) {
      question[field] = req.body[field];
    }
  }

  try {
    await question.save();
  } catch (error) {
    if (error.name === 'QuestionValidationError' || error.name === 'ValidationError') {
      throw badRequest(error.message);
    }
    throw error;
  }

  if (req.body.mediaUrl) {
    await linkMediaToQuiz(question.mediaUrl, question.quizId);
  }
  if (Array.isArray(req.body.mediaUrls)) {
    for (const url of req.body.mediaUrls) {
      if (url) {
        await linkMediaToQuiz(url, question.quizId);
      }
    }
  }
  if (req.body.revealMediaUrl) {
    await linkMediaToQuiz(question.revealMediaUrl, question.quizId);
  }

  sendSuccess(res, { message: 'Question updated', data: { question } });
});

/**
 * Delete a question
 * DELETE /api/questions/:id
 */
export const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owned = await getOwnedQuestion(id, req.user.userId);
  if (!owned) {
    throw notFound('Question not found');
  }

  const { question, quiz } = owned;
  quiz.questions = quiz.questions.filter(
    (qId) => qId.toString() !== question._id.toString()
  );
  await quiz.save();
  await question.deleteOne();
  sendSuccess(res, { message: 'Question deleted' });
});

/**
 * Reorder questions within a quiz
 * PUT /api/quizzes/:quizId/questions/reorder
 *
 * Body: { questionIds: ['id1', 'id2', 'id3'] }
 * The order of IDs in the array determines the new order (0, 1, 2, ...)
 */
export const reorderQuestions = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { questionIds } = req.body;

  if (!Array.isArray(questionIds)) {
    throw badRequest('questionIds must be an array');
  }

  const quiz = await getOwnedQuiz(quizId, req.user.userId);
  if (!quiz) {
    throw notFound('Quiz not found');
  }

  const existingIds = quiz.questions.map((id) => id.toString());
  const providedIds = questionIds.map((id) => id.toString());
  const invalidIds = providedIds.filter((id) => !existingIds.includes(id));
  if (invalidIds.length > 0) {
    throw badRequest(`Invalid question IDs: ${invalidIds.join(', ')}`);
  }

  const bulkOps = providedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, quizId },
      update: { $set: { order: index } }
    }
  }));

  if (bulkOps.length > 0) {
    await Question.bulkWrite(bulkOps);
  }

  quiz.questions = providedIds;
  await quiz.save();

  const questions = await Question.find({ quizId })
    .sort({ order: 1 });

  sendSuccess(res, { message: 'Questions reordered', data: { questions } });
});

/**
 * Get a single question by ID
 * GET /api/questions/:id
 */
export const getQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const owned = await getOwnedQuestion(id, req.user.userId);
  if (!owned) {
    throw notFound('Question not found');
  }

  sendSuccess(res, { message: 'Question retrieved', data: { question: owned.question } });
});

/**
 * List all questions for a quiz
 * GET /api/quizzes/:quizId/questions
 */
export const listQuestions = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const quiz = await getOwnedQuiz(quizId, req.user.userId);
  if (!quiz) {
    throw notFound('Quiz not found');
  }

  const questions = await Question.find({ quizId })
    .sort({ order: 1 });

  sendSuccess(res, { message: 'Questions retrieved', data: { questions } });
});
