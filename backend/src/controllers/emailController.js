import User from '../models/User.js';
import { sendEmail } from '../services/emailService.js';
import { verifyEmailTemplate } from '../templates/emails/verifyEmail.js';
import { resetPasswordTemplate } from '../templates/emails/resetPassword.js';
import { generateToken, hashToken, compareTokens } from '../utils/tokenGenerator.js';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendServerError
} from '../utils/responseHelper.js';

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

  await sendEmail({
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
export async function verifyEmail(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return sendBadRequest(res, 'Verification token is required');
    }

    const hashedToken = hashToken(token);

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return sendBadRequest(res, 'Invalid or expired verification token');
    }

    // Verify the token using timing-safe comparison
    if (!compareTokens(hashedToken, user.emailVerificationToken)) {
      return sendBadRequest(res, 'Invalid verification token');
    }

    // Mark email as verified and clear token
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    sendSuccess(res, { message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    sendServerError(res, 'Failed to verify email');
  }
}

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 * Requires authentication
 */
export async function resendVerification(req, res) {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    if (user.emailVerified) {
      return sendBadRequest(res, 'Email is already verified');
    }

    // Generate new token (invalidates old one)
    const plainToken = await createVerificationToken(user);
    await sendVerificationEmail(user, plainToken);

    sendSuccess(res, { message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    sendServerError(res, 'Failed to send verification email');
  }
}

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return sendBadRequest(res, 'Email is required');
    }

    // Always return success to prevent email enumeration
    const successResponse = () => {
      sendSuccess(res, {
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    };

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return successResponse();
    }

    // OAuth users can't reset password
    if (user.provider !== 'local') {
      return successResponse();
    }

    // Require email verification before allowing password reset
    if (!user.emailVerified) {
      return sendBadRequest(res, 'Please verify your email address first');
    }

    // Generate reset token
    const plainToken = generateToken();
    const hashedToken = hashToken(plainToken);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY);
    await user.save();

    // Send reset email
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
  } catch (error) {
    console.error('Forgot password error:', error);
    sendServerError(res, 'Failed to process password reset request');
  }
}

/**
 * Check if reset token is valid
 * GET /api/auth/check-reset-token/:token
 */
export async function checkResetToken(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return sendBadRequest(res, 'Token is required');
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return sendBadRequest(res, 'Invalid or expired reset token');
    }

    // Verify using timing-safe comparison
    if (!compareTokens(hashedToken, user.passwordResetToken)) {
      return sendBadRequest(res, 'Invalid reset token');
    }

    sendSuccess(res, { message: 'Token is valid' });
  } catch (error) {
    console.error('Check reset token error:', error);
    sendServerError(res, 'Failed to validate reset token');
  }
}

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (!token) {
      return sendBadRequest(res, 'Reset token is required');
    }

    if (!password || password.length < 6) {
      return sendBadRequest(res, 'Password must be at least 6 characters');
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return sendBadRequest(res, 'Invalid or expired reset token');
    }

    // Verify using timing-safe comparison
    if (!compareTokens(hashedToken, user.passwordResetToken)) {
      return sendBadRequest(res, 'Invalid reset token');
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendSuccess(res, { message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    sendServerError(res, 'Failed to reset password');
  }
}
