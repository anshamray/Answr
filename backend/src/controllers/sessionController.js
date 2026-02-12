import Participant from '../models/Participant.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import { generateUniquePin } from '../utils/pinGenerator.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendServerError
} from '../utils/responseHelper.js';

/**
 * Create a new game session
 * POST /api/sessions
 */
export async function createSession(req, res) {
  try {
    const { quizId } = req.body;

    if (!quizId) {
      return sendBadRequest(res, 'quizId is required');
    }

    // Verify quiz exists and belongs to the user
    const quiz = await Quiz.findOne({
      _id: quizId,
      moderatorId: req.user.userId
    });

    if (!quiz) {
      return sendNotFound(res, 'Quiz not found');
    }

    const pin = await generateUniquePin();

    const session = new Session({
      quizId,
      moderatorId: req.user.userId,
      pin
    });

    await session.save();

    // Increment play count on source quiz if this is a cloned library quiz
    if (quiz.clonedFrom) {
      await Quiz.findByIdAndUpdate(quiz.clonedFrom, { $inc: { playCount: 1 } });
    }

    // Increment play count on the quiz itself if it's published
    if (quiz.isPublished) {
      quiz.playCount = (quiz.playCount || 0) + 1;
      await quiz.save();
    }

    sendCreated(res, 'Session created', {
      session: {
        id: session._id,
        quizId: session.quizId,
        pin: session.pin,
        status: session.status,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    sendServerError(res, 'Failed to create session');
  }
}

/**
 * Get session details
 * GET /api/sessions/:id
 *
 * Access control:
 *   - Authenticated moderator: session must belong to req.user.userId
 *   - Guest host: must provide ?guestToken=<token> matching the session
 */
export async function getSession(req, res) {
  try {
    const { guestToken } = req.query;

    let session;

    const populateQuiz = {
      path: 'quizId',
      select: 'title questions',
      populate: {
        path: 'questions',
        options: { sort: { order: 1 } }
      }
    };

    if (guestToken) {
      // Guest access via token
      session = await Session.findOne({
        _id: req.params.id,
        guestToken
      }).populate('participants').populate(populateQuiz);
    } else if (req.user) {
      // Authenticated moderator
      session = await Session.findOne({
        _id: req.params.id,
        moderatorId: req.user.userId
      }).populate('participants').populate(populateQuiz);
    } else {
      return sendUnauthorized(res, 'Authentication or guestToken required');
    }

    if (!session) {
      return sendNotFound(res, 'Session not found');
    }

    sendSuccess(res, { message: 'Session retrieved', data: { session } });
  } catch (error) {
    console.error('Get session error:', error);
    sendServerError(res, 'Failed to fetch session');
  }
}

/**
 * End a session (set status to finished)
 * DELETE /api/sessions/:id
 */
export async function endSession(req, res) {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    });

    if (!session) {
      return sendNotFound(res, 'Session not found');
    }

    if (session.status === 'finished') {
      return sendConflict(res, 'Session already finished');
    }

    session.status = 'finished';
    session.finishedAt = new Date();
    await session.save();

    sendSuccess(res, { message: 'Session ended', data: { session } });
  } catch (error) {
    console.error('End session error:', error);
    sendServerError(res, 'Failed to end session');
  }
}

/**
 * Get final statistics for a finished session
 * GET /api/sessions/:id/results
 */
export async function getSessionResults(req, res) {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    }).populate('quizId', 'title');

    if (!session) {
      return sendNotFound(res, 'Session not found');
    }

    if (session.status !== 'finished') {
      return sendBadRequest(res, 'Session is not finished yet');
    }

    // Get all participants sorted by score descending
    const participants = await Participant.find({ sessionId: session._id })
      .sort({ score: -1 })
      .select('name avatar score createdAt');

    // Build ranked results
    const rankings = participants.map((p, index) => ({
      rank: index + 1,
      name: p.name,
      avatar: p.avatar,
      score: p.score
    }));

    sendSuccess(res, {
      message: 'Session results retrieved',
      data: {
        sessionId: session._id,
        quizTitle: session.quizId?.title || '',
        pin: session.pin,
        status: session.status,
        totalParticipants: rankings.length,
        finishedAt: session.finishedAt,
        rankings
      }
    });
  } catch (error) {
    console.error('Get session results error:', error);
    sendServerError(res, 'Failed to fetch session results');
  }
}
