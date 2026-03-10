import Participant from '../models/Participant.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import Submission from '../models/Submission.js';
import Question from '../models/Question.js';
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
import { updateHostStats } from '../services/badgeService.js';

function submissionCountsAsCorrect(submission) {
  if (submission?.isCorrect === true) return true;
  if (submission?.isCorrect === false) return false;

  // Fallback for older/badly persisted rows where correctness was not saved
  // but points were still awarded for a correct answer.
  return (submission?.pointsAwarded || 0) > 0;
}

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

    // Track plays for every quiz session, including private quizzes shown on the dashboard.
    await Quiz.findByIdAndUpdate(quiz._id, { $inc: { playCount: 1 } });

    // If this quiz was cloned from a library quiz, also credit the original source quiz.
    if (quiz.clonedFrom && quiz.clonedFrom.toString() !== quiz._id.toString()) {
      await Quiz.findByIdAndUpdate(quiz.clonedFrom, { $inc: { playCount: 1 } });
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

    const sessionData = session.toObject();

    // Finished sessions may have persisted participants even when the
    // reference array was not populated on the document yet.
    if ((!sessionData.participants || sessionData.participants.length === 0) && session.status === 'finished') {
      sessionData.participants = await Participant.find({ sessionId: session._id })
        .sort({ score: -1 });
    }

    sendSuccess(res, { message: 'Session retrieved', data: { session: sessionData } });
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

    // Update moderator hosting stats and badges (non-blocking for the response)
    updateHostStats(req.user.userId, { sessionsHostedDelta: 1 }).catch((err) => {
      console.error('Failed to update host stats:', err);
    });

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
    }).populate('quizId', 'title questions');

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

    const totalScore = participants.reduce((sum, participant) => sum + (participant.score || 0), 0);
    const avgScore = rankings.length > 0 ? Math.round(totalScore / rankings.length) : 0;

    sendSuccess(res, {
      message: 'Session results retrieved',
      data: {
        sessionId: session._id,
        quizTitle: session.quizId?.title || '',
        pin: session.pin,
        status: session.status,
        totalParticipants: rankings.length,
        totalQuestions: session.quizId?.questions?.length || 0,
        avgScore,
        finishedAt: session.finishedAt,
        stats: {
          totalPlayers: rankings.length,
          totalQuestions: session.quizId?.questions?.length || 0,
          avgScore
        },
        rankings
      }
    });
  } catch (error) {
    console.error('Get session results error:', error);
    sendServerError(res, 'Failed to fetch session results');
  }
}

/**
 * Get session history for the authenticated user
 * GET /api/sessions
 */
export async function getSessionHistory(req, res) {
  try {
    const { page = 1, limit = 10, status, quizId } = req.query;

    const query = { moderatorId: req.user.userId };

    if (status) {
      query.status = status;
    }

    if (quizId) {
      query.quizId = quizId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Session.countDocuments(query);

    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('quizId', 'title')
      .populate('participants', 'name score');

    const sessionList = sessions.map(s => ({
      id: s._id,
      quizTitle: s.quizId?.title || 'Deleted Quiz',
      pin: s.pin,
      status: s.status,
      participantCount: s.participants?.length || 0,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      createdAt: s.createdAt
    }));

    sendSuccess(res, {
      message: 'Session history retrieved',
      data: {
        sessions: sessionList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get session history error:', error);
    sendServerError(res, 'Failed to fetch session history');
  }
}

/**
 * Get detailed analytics for a session
 * GET /api/sessions/:id/analytics
 */
export async function getSessionAnalytics(req, res) {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    })
      .populate('quizId', 'title questions')
      .populate('participants');

    if (!session) {
      return sendNotFound(res, 'Session not found');
    }

    // Get all submissions for this session
    const submissions = await Submission.find({ sessionId: session._id })
      .populate('questionId', 'text type')
      .lean();

    // Calculate summary stats
    const participants = session.participants || [];
    const totalParticipants = participants.length;
    const totalScore = participants.reduce((sum, p) => sum + (p.score || 0), 0);
    const avgScore = totalParticipants > 0 ? Math.round(totalScore / totalParticipants) : 0;

    const totalCorrect = submissions.filter(submissionCountsAsCorrect).length;
    const totalAnswers = submissions.length;
    const avgAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

    // Duration calculation
    let durationMs = 0;
    if (session.startedAt && session.finishedAt) {
      durationMs = new Date(session.finishedAt) - new Date(session.startedAt);
    }

    // Build participant details
    const participantQuizQuestionIds = Array.isArray(session.quizId?.questions)
      ? session.quizId.questions
      : [];
    const totalQuizQuestions = participantQuizQuestionIds.length;

    const participantDetails = participants.map(p => {
      const playerSubmissions = submissions.filter(
        s => s.participantId.toString() === p._id.toString()
      );
      const correctCount = playerSubmissions.filter(submissionCountsAsCorrect).length;

      // Per-player accuracy is measured against total quiz questions so
      // "50% accuracy" clearly means "answered half of all questions correctly".
      const denominator = totalQuizQuestions || playerSubmissions.length;
      const accuracy = denominator > 0
        ? Math.round((correctCount / denominator) * 100)
        : 0;

      const totalAnswered = playerSubmissions.length;
      const skippedCount = Math.max((totalQuizQuestions || 0) - totalAnswered, 0);

      return {
        id: p._id,
        name: p.name,
        avatar: p.avatar,
        score: p.score || 0,
        correctCount,
        totalAnswered,
        totalQuestions: totalQuizQuestions,
        skippedCount,
        accuracy
      };
    }).sort((a, b) => b.score - a.score);

    // Build question-level stats including questions with zero submissions
    const questionStats = [];
    const questionMap = new Map();

    // Initialize stats for all quiz questions so unanswered questions still appear
    const quizQuestionIds = Array.isArray(session.quizId?.questions)
      ? session.quizId.questions
      : [];

    if (quizQuestionIds.length > 0) {
      const quizQuestions = await Question.find({ _id: { $in: quizQuestionIds } })
        .select('text type order')
        .lean();

      quizQuestions
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((q) => {
          const qId = q._id.toString();
          const baseStat = {
            questionId: qId,
            text: q.text || 'Unknown',
            type: q.type || 'unknown',
            totalAnswers: 0,
            correctCount: 0,
            totalTime: 0,
            answerDistribution: {},
            order: q.order ?? 0
          };
          questionMap.set(qId, baseStat);
          questionStats.push(baseStat);
        });
    }

    // Fold submissions into the pre-initialized question stats
    for (const sub of submissions) {
      if (!sub.questionId) continue;

      const qId = sub.questionId._id.toString();

      if (!questionMap.has(qId)) {
        // Fallback for legacy data where question isn't part of the quiz anymore
        questionMap.set(qId, {
          questionId: qId,
          text: sub.questionId.text || 'Unknown',
          type: sub.questionId.type || 'unknown',
          totalAnswers: 0,
          correctCount: 0,
          totalTime: 0,
          answerDistribution: {},
          order: 0
        });
        questionStats.push(questionMap.get(qId));
      }

      const stat = questionMap.get(qId);
      stat.totalAnswers++;
      if (submissionCountsAsCorrect(sub)) stat.correctCount++;
      stat.totalTime += sub.timeTaken || 0;

      // Track answer distribution
      const answerId = sub.answerId?.toString() || 'none';
      stat.answerDistribution[answerId] = (stat.answerDistribution[answerId] || 0) + 1;
    }

    // Finalize per-question aggregates
    questionStats.forEach((stat) => {
      stat.accuracy = stat.totalAnswers > 0
        ? Math.round((stat.correctCount / stat.totalAnswers) * 100)
        : 0;
      stat.avgTime = stat.totalAnswers > 0
        ? Math.round(stat.totalTime / stat.totalAnswers)
        : 0;
      // Remove helper field from response
      delete stat.order;
    });

    sendSuccess(res, {
      message: 'Session analytics retrieved',
      data: {
        session: {
          id: session._id,
          quizTitle: session.quizId?.title || 'Deleted Quiz',
          pin: session.pin,
          status: session.status,
          startedAt: session.startedAt,
          finishedAt: session.finishedAt,
          duration: durationMs
        },
        summary: {
          totalParticipants,
          avgScore,
          avgAccuracy,
          totalQuestions: questionStats.length
        },
        participants: participantDetails,
        questions: questionStats
      }
    });
  } catch (error) {
    console.error('Get session analytics error:', error);
    sendServerError(res, 'Failed to fetch session analytics');
  }
}

/**
 * Export session data as CSV
 * GET /api/sessions/:id/export
 */
export async function exportSessionCSV(req, res) {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    })
      .populate('quizId', 'title')
      .populate('participants');

    if (!session) {
      return sendNotFound(res, 'Session not found');
    }

    const submissions = await Submission.find({ sessionId: session._id })
      .populate('questionId', 'text')
      .populate('participantId', 'name');

    // Build CSV content
    const lines = [];
    lines.push('Player,Question,Answer Correct,Points,Time (ms)');

    for (const sub of submissions) {
      const playerName = sub.participantId?.name || 'Unknown';
      const questionText = (sub.questionId?.text || 'Unknown').replace(/,/g, ';');
      const isCorrect = sub.isCorrect ? 'Yes' : 'No';
      const points = sub.pointsAwarded || 0;
      const time = sub.timeTaken || 0;

      lines.push(`"${playerName}","${questionText}",${isCorrect},${points},${time}`);
    }

    // Summary section
    lines.push('');
    lines.push('Summary');
    lines.push(`Quiz,${session.quizId?.title || 'Unknown'}`);
    lines.push(`PIN,${session.pin}`);
    lines.push(`Total Players,${session.participants?.length || 0}`);
    lines.push(`Started,${session.startedAt || ''}`);
    lines.push(`Finished,${session.finishedAt || ''}`);

    const csv = lines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="session-${session.pin}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export session CSV error:', error);
    sendServerError(res, 'Failed to export session data');
  }
}
