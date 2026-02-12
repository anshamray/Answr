import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz
} from '../controllers/quizController.js';

const router = Router();

// All quiz routes require authentication
router.use(authenticate);

// GET /api/quizzes - List user's quizzes
router.get('/', listQuizzes);

// GET /api/quizzes/:id - Get quiz with questions
router.get('/:id', getQuiz);

// POST /api/quizzes - Create quiz
router.post('/', createQuiz);

// PUT /api/quizzes/:id - Update quiz
router.put('/:id', updateQuiz);

// DELETE /api/quizzes/:id - Delete quiz
router.delete('/:id', deleteQuiz);

export default router;
