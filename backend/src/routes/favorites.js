import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  listFavorites,
  addFavorite,
  removeFavorite
} from '../controllers/favoritesController.js';

const router = Router();

// GET /api/favorites - List user's favorite quizzes
router.get('/', authenticate, listFavorites);

// POST /api/favorites/:quizId - Add a quiz to favorites
router.post('/:quizId', authenticate, addFavorite);

// DELETE /api/favorites/:quizId - Remove a quiz from favorites
router.delete('/:quizId', authenticate, removeFavorite);

export default router;
