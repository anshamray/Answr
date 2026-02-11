import { Router } from 'express';

import { register, login, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register - Create moderator account
router.post('/register', register);

// POST /api/auth/login - Login, return JWT
router.post('/login', login);

// GET /api/auth/me - Get current user (protected)
router.get('/me', authenticate, getMe);

export default router;
