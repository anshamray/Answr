import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { notFound } from '../utils/httpError.js';
import {
  sendSuccess
} from '../utils/responseHelper.js';

/**
 * List user's favorite quizzes
 * GET /api/favorites
 */
export const listFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId)
    .populate({
      path: 'favorites',
      match: { isPublished: true },
      select: 'title description category tags isOfficial playCount publishedAt moderatorId',
      populate: { path: 'moderatorId', select: 'name' }
    });

  if (!user) {
    throw notFound('User not found');
  }

  const quizzes = (user.favorites || []).filter(Boolean).map((q) => ({
    id: q._id,
    title: q.title,
    description: q.description,
    category: q.category,
    tags: q.tags,
    isOfficial: q.isOfficial,
    playCount: q.playCount,
    publishedAt: q.publishedAt,
    author: q.moderatorId?.name || 'Unknown',
    isFavorited: true
  }));

  sendSuccess(res, {
    message: 'Favorites retrieved',
    data: { quizzes }
  });
});

/**
 * Add a quiz to favorites
 * POST /api/favorites/:quizId
 */
export const addFavorite = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  const quiz = await Quiz.findOne({
    _id: quizId,
    isPublished: true
  });

  if (!quiz) {
    throw notFound('Quiz not found in library');
  }

  await User.findByIdAndUpdate(
    req.user.userId,
    { $addToSet: { favorites: quizId } }
  );

  sendSuccess(res, {
    message: 'Quiz added to favorites',
    data: { quizId }
  });
});

/**
 * Remove a quiz from favorites
 * DELETE /api/favorites/:quizId
 */
export const removeFavorite = asyncHandler(async (req, res) => {
  const { quizId } = req.params;

  await User.findByIdAndUpdate(
    req.user.userId,
    { $pull: { favorites: quizId } }
  );

  sendSuccess(res, {
    message: 'Quiz removed from favorites',
    data: { quizId }
  });
});
