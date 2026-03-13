import Participant from '../models/Participant.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import Submission from '../models/Submission.js';
import Question from '../models/Question.js';
import { badRequest, conflict, notFound, unauthorized } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';
import { generateUniquePin } from '../utils/pinGenerator.js';
import {
  sendSuccess,
  sendCreated
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
export const createSession = asyncHandler(async (req, res) => {
  const { quizId, practice } = req.body;

  if (!quizId) {
    throw badRequest('quizId is required');
  }

  const quiz = await Quiz.findOne({
    _id: quizId,
    moderatorId: req.user.userId
  });
  if (!quiz) {
    throw notFound('Quiz not found');
  }

  const pin = await generateUniquePin();
  const session = new Session({
    quizId,
    moderatorId: req.user.userId,
    pin,
    isPractice: !!practice,
    mode: quiz.mode || 'competitive',
    isAnonymous: !!quiz.isAnonymous,
    showLiveResultsToPlayers: quiz.showLiveResultsToPlayers !== undefined
      ? !!quiz.showLiveResultsToPlayers
      : true
  });

  await session.save();

  if (!session.isPractice) {
    await Quiz.findByIdAndUpdate(quiz._id, { $inc: { playCount: 1 } });
    if (quiz.clonedFrom && quiz.clonedFrom.toString() !== quiz._id.toString()) {
      await Quiz.findByIdAndUpdate(quiz.clonedFrom, { $inc: { playCount: 1 } });
    }
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
});

/**
 * Get session details
 * GET /api/sessions/:id
 *
 * Access control:
 *   - Authenticated moderator: session must belong to req.user.userId
 *   - Guest host: must provide ?guestToken=<token> matching the session
 */
export const getSession = asyncHandler(async (req, res) => {
  const { guestToken } = req.query;
  let session;

  const populateQuiz = {
    path: 'quizId',
    select: 'title questions mode isAnonymous showLiveResultsToPlayers',
    populate: {
      path: 'questions',
      options: { sort: { order: 1 } }
    }
  };

  if (guestToken) {
    session = await Session.findOne({
      _id: req.params.id,
      guestToken
    }).populate('participants').populate(populateQuiz);
  } else if (req.user) {
    session = await Session.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    }).populate('participants').populate(populateQuiz);
  } else {
    throw unauthorized('Authentication or guestToken required');
  }

  if (!session) {
    throw notFound('Session not found');
  }

  const sessionData = session.toObject();
  if ((!sessionData.participants || sessionData.participants.length === 0) && session.status === 'finished') {
    sessionData.participants = await Participant.find({ sessionId: session._id })
      .sort({ score: -1 });
  }

  sendSuccess(res, { message: 'Session retrieved', data: { session: sessionData } });
});

/**
 * End a session (set status to finished)
 * DELETE /api/sessions/:id
 */
export const endSession = asyncHandler(async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.id,
    moderatorId: req.user.userId
  });

  if (!session) {
    throw notFound('Session not found');
  }
  if (session.status === 'finished') {
    throw conflict('Session already finished');
  }

  session.status = 'finished';
  session.finishedAt = new Date();
  await session.save();

  updateHostStats(req.user.userId, { sessionsHostedDelta: 1 }).catch((err) => {
    logger.warn('Failed to update host stats', err);
  });

  sendSuccess(res, { message: 'Session ended', data: { session } });
});

/**
 * Get final statistics for a finished session
 * GET /api/sessions/:id/results
 */
export const getSessionResults = asyncHandler(async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.id,
    moderatorId: req.user.userId
  }).populate('quizId', 'title questions');

  if (!session) {
    throw notFound('Session not found');
  }
  if (session.status !== 'finished') {
    throw badRequest('Session is not finished yet');
  }

  const participants = await Participant.find({ sessionId: session._id })
    .sort({ score: -1 })
    .select('name avatar score createdAt');

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
      mode: session.mode || 'competitive',
      totalParticipants: rankings.length,
      totalQuestions: session.quizId?.questions?.length || 0,
      avgScore,
      finishedAt: session.finishedAt,
      stats: {
        mode: session.mode || 'competitive',
        totalPlayers: rankings.length,
        totalQuestions: session.quizId?.questions?.length || 0,
        avgScore
      },
      rankings
    }
  });
});

/**
 * Get session history for the authenticated user
 * GET /api/sessions
 */
export const getSessionHistory = asyncHandler(async (req, res) => {
  const { page, limit, status, quizId } = req.query;
  const query = { moderatorId: req.user.userId };

  if (status) {
    query.status = status;
  }
  if (quizId) {
    query.quizId = quizId;
  }

  const { page: pageNum, limit: limitNum, skip } = parsePagination({
    page,
    limit,
    defaultLimit: 10,
    maxLimit: 100
  });
  const total = await Session.countDocuments(query);

  const sessions = await Session.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .populate('quizId', 'title')
    .populate('participants', 'name score');

  const sessionList = sessions.map((s) => ({
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
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

/**
 * Get detailed analytics for a session
 * GET /api/sessions/:id/analytics
 */
export const getSessionAnalytics = asyncHandler(async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.id,
    moderatorId: req.user.userId
  })
    .populate('quizId', 'title questions')
    .populate('participants');

  if (!session) {
    throw notFound('Session not found');
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
        .select('text type order answers')
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
            options: Array.isArray(q.answers)
              ? q.answers.map((a) => ({
                id: a._id.toString(),
                text: a.text
              }))
              : [],
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
        mode: session.mode || 'competitive',
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
});

/**
 * Export session data as CSV
 * GET /api/sessions/:id/export
 */
export const exportSessionCSV = asyncHandler(async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.id,
    moderatorId: req.user.userId
  })
    .populate('quizId', 'title')
    .populate('participants');

  if (!session) {
    throw notFound('Session not found');
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
});

/**
 * Permanently delete a session and its related data (participants + submissions).
 * DELETE /api/sessions/:id/permanent
 */
export const deleteSessionPermanently = asyncHandler(async (req, res) => {
  const session = await Session.findOne({
    _id: req.params.id,
    moderatorId: req.user.userId
  }).select('_id status');

  if (!session) {
    throw notFound('Session not found');
  }

  const isActiveSession = session.status === 'playing' || session.status === 'paused';
  const confirmActiveDelete = req.query.confirmActive === 'true';

  if (isActiveSession && !confirmActiveDelete) {
    return res.status(409).json({
      success: false,
      error: 'Session is currently active',
      code: 'SESSION_ACTIVE_CONFIRM_REQUIRED'
    });
  }

  await Submission.deleteMany({ sessionId: session._id });
  await Participant.deleteMany({ sessionId: session._id });
  await Session.deleteOne({ _id: session._id });

  return sendSuccess(res, { message: 'Session deleted', data: { id: req.params.id } });
});
