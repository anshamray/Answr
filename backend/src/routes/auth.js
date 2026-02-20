import { Router } from 'express';

import { register, login, getMe } from '../controllers/authController.js';
import {
  verifyEmail,
  resendVerification,
  forgotPassword,
  checkResetToken,
  resetPassword
} from '../controllers/emailController.js';
import { authenticate } from '../middleware/auth.js';
import oauthRoutes from './oauth.js';

const router = Router();

// POST /api/auth/register - Create moderator account
router.post('/register', register);

// POST /api/auth/login - Login, return JWT
router.post('/login', login);

// GET /api/auth/me - Get current user (protected)
router.get('/me', authenticate, getMe);

// Email verification endpoints
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authenticate, resendVerification);

// Password reset endpoints
router.post('/forgot-password', forgotPassword);
router.get('/check-reset-token/:token', checkResetToken);
router.post('/reset-password', resetPassword);

// OAuth routes (Google, GitHub)
router.use('/', oauthRoutes);

export default router;
