/**
 * Passport OAuth Configuration
 *
 * Configures Google and GitHub OAuth strategies.
 * Requires environment variables:
 * - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 * - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
 * - OAUTH_CALLBACK_URL (base URL for callbacks)
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';

const CALLBACK_BASE = process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000';

/**
 * Find or create user from OAuth profile
 */
async function findOrCreateUser(provider, profile) {
  const email = profile.emails?.[0]?.value;
  const providerId = profile.id;
  const name = profile.displayName || profile.username || email?.split('@')[0] || 'User';
  const avatar = profile.photos?.[0]?.value;

  if (!email) {
    throw new Error('Email not provided by OAuth provider');
  }

  // Check if user exists with this provider ID
  let user = await User.findOne({ provider, providerId });

  if (user) {
    // Ensure OAuth users are marked as verified
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    return user;
  }

  // Check if user exists with this email (link accounts)
  user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    // Update existing user with OAuth info if they used local auth before
    if (user.provider === 'local') {
      user.provider = provider;
      user.providerId = providerId;
      user.emailVerified = true; // OAuth confirms email
      if (avatar) user.avatar = avatar;
      await user.save();
    }
    return user;
  }

  // Create new user (OAuth users are automatically verified)
  user = new User({
    email: email.toLowerCase(),
    name,
    provider,
    providerId,
    avatar,
    emailVerified: true
  });

  await user.save();
  return user;
}

/**
 * Configure Google OAuth Strategy
 */
export function configureGoogleStrategy() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn('Google OAuth not configured: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return false;
  }

  passport.use(new GoogleStrategy({
    clientID,
    clientSecret,
    callbackURL: `${CALLBACK_BASE}/api/auth/google/callback`,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUser('google', profile);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));

  return true;
}

/**
 * Configure GitHub OAuth Strategy
 */
export function configureGitHubStrategy() {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn('GitHub OAuth not configured: missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
    return false;
  }

  passport.use(new GitHubStrategy({
    clientID,
    clientSecret,
    callbackURL: `${CALLBACK_BASE}/api/auth/github/callback`,
    scope: ['user:email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateUser('github', profile);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }));

  return true;
}

/**
 * Initialize all OAuth strategies
 */
export function initializePassport(app) {
  app.use(passport.initialize());

  const googleEnabled = configureGoogleStrategy();
  const githubEnabled = configureGitHubStrategy();

  return { googleEnabled, githubEnabled };
}

export default passport;
