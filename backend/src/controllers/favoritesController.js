import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendServerError
} from '../utils/responseHelper.js';

/**
 * List user's favorite quizzes
 * GET /api/favorites
 */
export async function listFavorites(req, res) {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'favorites',
        match: { isPublished: true },
        select: 'title description category tags isOfficial playCount publishedAt moderatorId',
        populate: { path: 'moderatorId', select: 'name' }
      });

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    const quizzes = (user.favorites || []).filter(Boolean).map(q => ({
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
  } catch (error) {
    console.error('List favorites error:', error);
    sendServerError(res, 'Failed to fetch favorites');
  }
}

/**
 * Add a quiz to favorites
 * POST /api/favorites/:quizId
 */
export async function addFavorite(req, res) {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findOne({
      _id: quizId,
      isPublished: true
    });

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found in library');
    }

    await User.findByIdAndUpdate(
      req.user.userId,
      { $addToSet: { favorites: quizId } }
    );

    sendSuccess(res, {
      message: 'Quiz added to favorites',
      data: { quizId }
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    sendServerError(res, 'Failed to add favorite');
  }
}

/**
 * Remove a quiz from favorites
 * DELETE /api/favorites/:quizId
 */
export async function removeFavorite(req, res) {
  try {
    const { quizId } = req.params;

    await User.findByIdAndUpdate(
      req.user.userId,
      { $pull: { favorites: quizId } }
    );

    sendSuccess(res, {
      message: 'Quiz removed from favorites',
      data: { quizId }
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    sendServerError(res, 'Failed to remove favorite');
  }
}
