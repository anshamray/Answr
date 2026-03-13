import User from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendEmail } from '../services/emailService.js';
import { resetPasswordTemplate } from '../templates/emails/resetPassword.js';
import { verifyEmailTemplate } from '../templates/emails/verifyEmail.js';
import { generateToken, hashToken, compareTokens } from '../utils/tokenGenerator.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { sendSuccess } from '../utils/responseHelper.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Send verification email to a user
 * @param {Object} user - User document
 * @param {string} plainToken - Unhashed token to include in email
 */
async function sendVerificationEmail(user, plainToken) {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${plainToken}`;
  const { subject, html, text } = verifyEmailTemplate({
    name: user.name,
    verificationUrl
  });

  return sendEmail({
    to: user.email,
    subject,
    html,
    text
  });
}

/**
 * Generate and save verification token for a user
 * @param {Object} user - User document
 * @returns {Promise<string>} Plain token to send in email
 */
export async function createVerificationToken(user) {
  const plainToken = generateToken();
  const hashedToken = hashToken(plainToken);

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);
  await user.save();

  return plainToken;
}

/**
 * Verify email with token
 * POST /api/auth/verify-email
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw badRequest('Verification token is required');
  }

  const hashedToken = hashToken(token);
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() }
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw badRequest('Invalid or expired verification token');
  }

  if (!compareTokens(hashedToken, user.emailVerificationToken)) {
    throw badRequest('Invalid verification token');
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  sendSuccess(res, { message: 'Email verified successfully' });
});

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 * Requires authentication
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw notFound('User not found');
  }

  if (user.emailVerified) {
    throw badRequest('Email is already verified');
  }

  const plainToken = await createVerificationToken(user);
  await sendVerificationEmail(user, plainToken);
  sendSuccess(res, { message: 'Verification email sent' });
});

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw badRequest('Email is required');
  }

  const successResponse = () => {
    sendSuccess(res, {
      message: 'If an account exists with this email, a password reset link has been sent'
    });
  };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.provider !== 'local') {
    return successResponse();
  }

  if (!user.emailVerified) {
    throw badRequest('Please verify your email address first');
  }

  const plainToken = generateToken();
  const hashedToken = hashToken(plainToken);
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY);
  await user.save();

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${plainToken}`;
  const { subject, html, text } = resetPasswordTemplate({
    name: user.name,
    resetUrl
  });

  await sendEmail({
    to: user.email,
    subject,
    html,
    text
  });

  successResponse();
});

/**
 * Check if reset token is valid
 * GET /api/auth/check-reset-token/:token
 */
export const checkResetToken = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    throw badRequest('Token is required');
  }

  const hashedToken = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw badRequest('Invalid or expired reset token');
  }

  if (!compareTokens(hashedToken, user.passwordResetToken)) {
    throw badRequest('Invalid reset token');
  }

  sendSuccess(res, { message: 'Token is valid' });
});

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token) {
    throw badRequest('Reset token is required');
  }

  if (!password || password.length < 6) {
    throw badRequest('Password must be at least 6 characters');
  }

  const hashedToken = hashToken(token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw badRequest('Invalid or expired reset token');
  }

  if (!compareTokens(hashedToken, user.passwordResetToken)) {
    throw badRequest('Invalid reset token');
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendSuccess(res, { message: 'Password reset successfully' });
});
