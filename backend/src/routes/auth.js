import { Router } from 'express';

import { register, login, getMe, updateName, updateEmail, updatePassword, deleteAccount, getUserStats, getUserBadges } from '../controllers/authController.js';
import {
  verifyEmail,
  resendVerification,
  forgotPassword,
  checkResetToken,
  resetPassword,
  testEmailConfig
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

// Profile update endpoints (protected)
router.put('/update-name', authenticate, updateName);
router.put('/update-email', authenticate, updateEmail);
router.put('/update-password', authenticate, updatePassword);
router.delete('/delete-account', authenticate, deleteAccount);

// Email verification endpoints
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', authenticate, resendVerification);

// Password reset endpoints
router.post('/forgot-password', forgotPassword);
router.get('/check-reset-token/:token', checkResetToken);
router.post('/reset-password', resetPassword);

// Test endpoint (temporary - remove after debugging)
router.get('/test-email-config', testEmailConfig);

// Stats and badges endpoints (protected)
router.get('/me/stats', authenticate, getUserStats);
router.get('/me/badges', authenticate, getUserBadges);

// OAuth routes (Google, GitHub)
router.use('/', oauthRoutes);

export default router;
