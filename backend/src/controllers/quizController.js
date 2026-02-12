import Question from '../models/Question.js';
import Quiz from '../models/Quiz.js';

/**
 * List all quizzes belonging to the authenticated user
 * GET /api/quizzes
 */
export async function listQuizzes(req, res) {
  try {
    const quizzes = await Quiz.find({ moderatorId: req.user.userId })
      .sort({ updatedAt: -1 })
      .select('-questions');

    res.json({ quizzes });
  } catch (error) {
    console.error('List quizzes error:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
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
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Failed to fetch quiz' });
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
      return res.status(400).json({ error: 'Title is required' });
    }

    const quiz = new Quiz({
      moderatorId: req.user.userId,
      title,
      description: description || '',
      category: category || ''
    });

    await quiz.save();

    res.status(201).json({
      message: 'Quiz created',
      quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Failed to create quiz' });
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
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Only update fields that are provided
    if (title !== undefined) quiz.title = title;
    if (description !== undefined) quiz.description = description;
    if (category !== undefined) quiz.category = category;

    await quiz.save();

    res.json({
      message: 'Quiz updated',
      quiz
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Failed to update quiz' });
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
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Delete all questions belonging to this quiz
    await Question.deleteMany({ quizId: quiz._id });

    // Delete the quiz itself
    await quiz.deleteOne();

    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
}
