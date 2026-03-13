/**
 * OAuth Routes
 *
 * Handles Google and GitHub OAuth authentication flows.
 * After successful auth, redirects to frontend with JWT token.
 */

import crypto from 'crypto';

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';

import { logger } from '../utils/logger.js';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_EXPIRES_IN = '7d';
const OAUTH_CODE_TTL_MS = 2 * 60 * 1000;
const oauthCodeStore = new Map();

function generateOAuthCode() {
  return crypto.randomBytes(32).toString('hex');
}

function storeOAuthToken(token) {
  const now = Date.now();
  for (const [key, value] of oauthCodeStore.entries()) {
    if (!value?.expiresAt || value.expiresAt < now) {
      oauthCodeStore.delete(key);
    }
  }

  const code = generateOAuthCode();
  oauthCodeStore.set(code, {
    token,
    expiresAt: now + OAUTH_CODE_TTL_MS
  });
  return code;
}

function consumeOAuthToken(code) {
  if (!code) return null;
  const entry = oauthCodeStore.get(code);
  oauthCodeStore.delete(code);
  if (!entry) return null;
  if (!entry.expiresAt || entry.expiresAt < Date.now()) {
    return null;
  }
  return entry.token;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

/**
 * Generate JWT for authenticated user
 */
function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Handle successful OAuth callback
 */
function handleOAuthCallback(req, res) {
  if (!req.user) {
    return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
  }

  let token;
  try {
    token = generateToken(req.user);
  } catch (error) {
    logger.error('OAuth token generation failed', error);
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_token_failed`);
  }

  // Use one-time exchange codes instead of exposing JWT in the URL.
  const code = storeOAuthToken(token);
  res.redirect(`${FRONTEND_URL}/oauth/callback?code=${code}`);
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

// POST /api/auth/oauth/exchange - Exchange one-time OAuth code for JWT
router.post('/oauth/exchange', (req, res) => {
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!code) {
    return res.status(400).json({ success: false, error: 'OAuth code is required' });
  }

  const token = consumeOAuthToken(code);
  if (!token) {
    return res.status(400).json({ success: false, error: 'Invalid or expired OAuth code' });
  }

  return res.json({
    success: true,
    message: 'OAuth code exchanged',
    data: { token }
  });
});

export const __testing = {
  storeOAuthToken,
  consumeOAuthToken,
  oauthCodeStore
};

export default router;
