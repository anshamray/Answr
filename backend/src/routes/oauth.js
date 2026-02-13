/**
 * OAuth Routes
 *
 * Handles Google and GitHub OAuth authentication flows.
 * After successful auth, redirects to frontend with JWT token.
 */

import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate JWT for authenticated user
 */
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Handle successful OAuth callback
 */
function handleOAuthCallback(req, res) {
  const user = req.user;

  if (!user) {
    return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
  }

  const token = generateToken(user);

  // Redirect to frontend with token in URL (frontend will store it)
  res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}`);
}

/**
 * Handle OAuth error
 */
function handleOAuthError(err, req, res, next) {
  console.error('OAuth error:', err);
  res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(err.message || 'auth_failed')}`);
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

// GET /api/auth/google - Initiate Google OAuth
router.get('/google',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(501).json({ error: 'Google OAuth not configured' });
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// GET /api/auth/google/callback - Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed` }),
  handleOAuthCallback
);

// ─── GitHub OAuth ────────────────────────────────────────────────────────────

// GET /api/auth/github - Initiate GitHub OAuth
router.get('/github',
  (req, res, next) => {
    if (!process.env.GITHUB_CLIENT_ID) {
      return res.status(501).json({ error: 'GitHub OAuth not configured' });
    }
    next();
  },
  passport.authenticate('github', { scope: ['user:email'] })
);

// GET /api/auth/github/callback - GitHub OAuth callback
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=github_auth_failed` }),
  handleOAuthCallback
);

// ─── OAuth Status ────────────────────────────────────────────────────────────

// GET /api/auth/oauth/status - Check which OAuth providers are enabled
router.get('/oauth/status', (req, res) => {
  res.json({
    google: !!process.env.GOOGLE_CLIENT_ID,
    github: !!process.env.GITHUB_CLIENT_ID
  });
});

export default router;
