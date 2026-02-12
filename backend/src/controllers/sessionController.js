import Participant from '../models/Participant.js';
import Quiz from '../models/Quiz.js';
import Session from '../models/Session.js';
import { generateUniquePin } from '../utils/pinGenerator.js';

/**
 * Create a new game session
 * POST /api/sessions
 */
export async function createSession(req, res) {
  try {
    const { quizId } = req.body;

    if (!quizId) {
      return res.status(400).json({ error: 'quizId is required' });
    }

    // Verify quiz exists and belongs to the user
    const quiz = await Quiz.findOne({
      _id: quizId,
      moderatorId: req.user.userId
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const pin = await generateUniquePin();

    const session = new Session({
      quizId,
      moderatorId: req.user.userId,
      pin
    });

    await session.save();

    res.status(201).json({
      message: 'Session created',
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
    res.status(500).json({ error: 'Failed to create session' });
  }
}

/**
 * Get session details
 * GET /api/sessions/:id
 */
export async function getSession(req, res) {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      moderatorId: req.user.userId
    }).populate('participants');

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
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
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status === 'finished') {
      return res.status(409).json({ error: 'Session already finished' });
    }

    session.status = 'finished';
    session.finishedAt = new Date();
    await session.save();

    res.json({ message: 'Session ended', session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
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
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'finished') {
      return res.status(400).json({ error: 'Session is not finished yet' });
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

    res.json({
      sessionId: session._id,
      quizTitle: session.quizId?.title || '',
      pin: session.pin,
      status: session.status,
      totalParticipants: rankings.length,
      finishedAt: session.finishedAt,
      rankings
    });
  } catch (error) {
    console.error('Get session results error:', error);
    res.status(500).json({ error: 'Failed to fetch session results' });
  }
}
