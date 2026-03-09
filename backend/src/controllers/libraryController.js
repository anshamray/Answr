import crypto from 'crypto';

import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import { mapQuizToLibrarySummary } from '../utils/quizMapper.js';
import { generateUniquePin } from '../utils/pinGenerator.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendServerError
} from '../utils/responseHelper.js';

/**
 * Browse published quizzes in the library
 * GET /api/library
 *
 * Query params:
 *   - search: text search in title/description
 *   - category: filter by category
 *   - tag: filter by tag (can appear multiple times)
 *   - sort: 'newest' | 'popular' | 'title' (default: 'newest')
 *   - official: 'true' to show only official quizzes
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 20, max: 50)
 */
export async function browseLibrary(req, res) {
  try {
    const {
      search,
      category,
      tag,
      sort = 'newest',
      official,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter
    const filter = { isPublished: true };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = { $regex: `^${category}$`, $options: 'i' };
    }

    if (tag) {
      const tags = Array.isArray(tag) ? tag : [tag];
      filter.tags = { $in: tags.map(t => t.toLowerCase()) };
    }

    if (official === 'true') {
      filter.isOfficial = true;
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { playCount: -1, publishedAt: -1 };
        break;
      case 'title':
        sortOption = { title: 1 };
        break;
      case 'newest':
      default:
        sortOption = { publishedAt: -1 };
        break;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [quizzes, total] = await Promise.all([
      Quiz.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .select('title description category tags isOfficial playCount publishedAt moderatorId questions')
        .populate('moderatorId', 'name'),
      Quiz.countDocuments(filter)
    ]);

    // Get user's favorites if authenticated
    let userFavorites = new Set();
    if (req.user) {
      const user = await User.findById(req.user.userId).select('favorites');
      if (user?.favorites) {
        userFavorites = new Set(user.favorites.map(id => id.toString()));
      }
    }

    sendSuccess(res, {
      message: 'Library retrieved',
      data: {
        quizzes: quizzes.map(q =>
          mapQuizToLibrarySummary(q, { isFavorited: userFavorites.has(q._id.toString()) })
        ),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Browse library error:', error);
    sendServerError(res, 'Failed to browse library');
  }
}

/**
 * Get a single library quiz with its questions
 * GET /api/library/:id
 */
export async function getLibraryQuiz(req, res) {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      isPublished: true
    })
      .populate({
        path: 'questions',
        options: { sort: { order: 1 } }
      })
      .populate('moderatorId', 'name');

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found in library');
    }

    // Check if user has favorited this quiz
    let isFavorited = false;
    if (req.user) {
      const user = await User.findById(req.user.userId).select('favorites');
      if (user?.favorites) {
        isFavorited = user.favorites.some(id => id.toString() === quiz._id.toString());
      }
    }

    const summary = mapQuizToLibrarySummary(quiz, { isFavorited });

    sendSuccess(res, {
      message: 'Library quiz retrieved',
      data: {
        quiz: {
          ...summary,
          questions: quiz.questions.map(q => ({
            id: q._id,
            type: q.type,
            text: q.text,
            mediaUrl: q.mediaUrl,
            mediaType: q.mediaType,
            timeLimit: q.timeLimit,
            points: q.points,
            order: q.order,
            answerCount: q.answers?.length || 0
          }))
        }
      }
    });
  } catch (error) {
    console.error('Get library quiz error:', error);
    sendServerError(res, 'Failed to fetch library quiz');
  }
}

/**
 * Clone a library quiz into the user's own collection
 * POST /api/library/:id/clone
 *
 * Requires authentication. Creates a full copy of the quiz
 * and all its questions under the user's account.
 */
export async function cloneLibraryQuiz(req, res) {
  try {
    // Find the published quiz
    const sourceQuiz = await Quiz.findOne({
      _id: req.params.id,
      isPublished: true
    }).populate('questions');

    if (!sourceQuiz) {
      return sendNotFound(res, 'Quiz not found in library');
    }

    // Create a copy of the quiz for the authenticated user
    const clonedQuiz = new Quiz({
      moderatorId: req.user.userId,
      title: sourceQuiz.title,
      description: sourceQuiz.description,
      category: sourceQuiz.category,
      tags: [...sourceQuiz.tags],
      clonedFrom: sourceQuiz._id,
      isPublished: false,
      isOfficial: false
    });

    await clonedQuiz.save();

    // Clone all questions
    const clonedQuestionIds = [];

    for (const question of sourceQuiz.questions) {
      const clonedQuestion = new Question({
        quizId: clonedQuiz._id,
        type: question.type,
        text: question.text,
        textToReadAloud: question.textToReadAloud,
        mediaUrl: question.mediaUrl,
        mediaType: question.mediaType,
        audioLanguage: question.audioLanguage,
        timeLimit: question.timeLimit,
        points: question.points,
        order: question.order,
        answers: question.answers.map(a => ({
          text: a.text,
          imageUrl: a.imageUrl,
          isCorrect: a.isCorrect,
          order: a.order
        })),
        allowMultipleAnswers: question.allowMultipleAnswers,
        sliderConfig: question.sliderConfig,
        pinConfig: question.pinConfig,
        scaleConfig: question.scaleConfig,
        brainstormConfig: question.brainstormConfig
      });

      await clonedQuestion.save();
      clonedQuestionIds.push(clonedQuestion._id);
    }

    // Update quiz with question references
    clonedQuiz.questions = clonedQuestionIds;
    await clonedQuiz.save();

    sendCreated(res, 'Quiz cloned to your collection', {
      quiz: {
        id: clonedQuiz._id,
        title: clonedQuiz.title,
        description: clonedQuiz.description,
        category: clonedQuiz.category,
        questionCount: clonedQuestionIds.length,
        clonedFrom: sourceQuiz._id
      }
    });
  } catch (error) {
    console.error('Clone library quiz error:', error);
    sendServerError(res, 'Failed to clone quiz');
  }
}

/**
 * Publish a quiz to the library
 * PUT /api/quizzes/:id/publish
 *
 * Requires authentication. Only the quiz owner can publish.
 * Quiz must have at least 1 question.
 */
export async function publishQuiz(req, res) {
  try {
    const { tags } = req.body;

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    }).populate('questions');

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    if (quiz.isPublished) {
      return sendConflict(res, 'Quiz is already published');
    }

    // Require at least 1 question to publish
    if (!quiz.questions || quiz.questions.length === 0) {
      return sendBadRequest(res, 'Quiz must have at least 1 question to be published');
    }

    quiz.isPublished = true;
    quiz.publishedAt = new Date();

    if (tags && Array.isArray(tags)) {
      quiz.tags = tags.map(t => t.trim().toLowerCase()).filter(Boolean);
    }

    await quiz.save();

    sendSuccess(res, {
      message: 'Quiz published to library',
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          isPublished: quiz.isPublished,
          publishedAt: quiz.publishedAt,
          tags: quiz.tags
        }
      }
    });
  } catch (error) {
    console.error('Publish quiz error:', error);
    sendServerError(res, 'Failed to publish quiz');
  }
}

/**
 * Unpublish a quiz (remove from library)
 * PUT /api/quizzes/:id/unpublish
 *
 * Requires authentication. Only the quiz owner can unpublish.
 */
export async function unpublishQuiz(req, res) {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    });

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    if (!quiz.isPublished) {
      return sendConflict(res, 'Quiz is not published');
    }

    quiz.isPublished = false;
    quiz.publishedAt = null;

    await quiz.save();

    sendSuccess(res, {
      message: 'Quiz removed from library',
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          isPublished: quiz.isPublished
        }
      }
    });
  } catch (error) {
    console.error('Unpublish quiz error:', error);
    sendServerError(res, 'Failed to unpublish quiz');
  }
}

/**
 * Create an official quiz (admin only)
 * POST /api/library/official
 *
 * Creates a quiz marked as official and immediately published.
 */
export async function createOfficialQuiz(req, res) {
  try {
    const { title, description, category, tags } = req.body;

    if (!title) {
      return sendBadRequest(res, 'Title is required');
    }

    const quiz = new Quiz({
      moderatorId: req.user.userId,
      title,
      description: description || '',
      category: category || '',
      tags: tags ? tags.map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      isPublished: true,
      isOfficial: true,
      publishedAt: new Date()
    });

    await quiz.save();

    sendCreated(res, 'Official quiz created', { quiz });
  } catch (error) {
    console.error('Create official quiz error:', error);
    sendServerError(res, 'Failed to create official quiz');
  }
}

/**
 * Start a library quiz as a guest (no login required).
 * POST /api/library/:id/start
 *
 * Creates a new session for the published quiz and returns
 * a guestToken that acts as the moderator credential for this session.
 * If the caller is authenticated the session is bound to their account instead.
 */
export async function startLibraryQuiz(req, res) {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      isPublished: true
    });

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found in library');
    }

    // Must have at least 1 question
    if (!quiz.questions || quiz.questions.length === 0) {
      return sendBadRequest(res, 'This quiz has no questions and cannot be started');
    }

    const pin = await generateUniquePin();

    // If the request comes from a logged-in user, link the session to them.
    // Otherwise create a guest session with an opaque token.
    const isAuthenticated = !!req.user;
    const guestToken = isAuthenticated ? null : crypto.randomBytes(32).toString('hex');

    const session = new Session({
      quizId: quiz._id,
      moderatorId: isAuthenticated ? req.user.userId : null,
      guestToken,
      pin
    });

    await session.save();

    // Increment play count on the source quiz
    await Quiz.findByIdAndUpdate(quiz._id, { $inc: { playCount: 1 } });

    sendCreated(res, 'Session created', {
      session: {
        id: session._id,
        quizId: session.quizId,
        pin: session.pin,
        status: session.status,
        guestToken: guestToken,   // null when authenticated
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('Start library quiz error:', error);
    sendServerError(res, 'Failed to start quiz');
  }
}
