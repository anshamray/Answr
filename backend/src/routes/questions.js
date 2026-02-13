import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import {
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getQuestion,
  listQuestions
} from '../controllers/questionController.js';

// mergeParams: true allows access to :quizId from parent router
const router = Router({ mergeParams: true });

// All question routes require authentication
router.use(authenticate);

// ─── Quiz-scoped routes (/api/quizzes/:quizId/questions) ─────────────────────
// These routes are mounted on the quizzes router with mergeParams

// GET /api/quizzes/:quizId/questions - List all questions for a quiz
router.get('/', listQuestions);

// POST /api/quizzes/:quizId/questions - Add question to quiz
router.post('/', addQuestion);

// PUT /api/quizzes/:quizId/questions/reorder - Reorder questions
router.put('/reorder', reorderQuestions);

// ─── Standalone routes (/api/questions/:id) ──────────────────────────────────
// These will be mounted separately for direct question access

export const standaloneRouter = Router();
standaloneRouter.use(authenticate);

// GET /api/questions/:id - Get a single question
standaloneRouter.get('/:id', getQuestion);

// PUT /api/questions/:id - Update question
standaloneRouter.put('/:id', updateQuestion);

// DELETE /api/questions/:id - Delete question
standaloneRouter.delete('/:id', deleteQuestion);

export default router;
