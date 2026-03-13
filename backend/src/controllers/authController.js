import User from '../models/User.js';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';
import Session from '../models/Session.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { generateToken } from '../middleware/auth.js';
import { createVerificationToken } from './emailController.js';
import { sendEmail } from '../services/emailService.js';
import { verifyEmailTemplate } from '../templates/emails/verifyEmail.js';
import { badRequest, conflict, notFound, unauthorized } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import {
  sendSuccess,
  sendCreated
} from '../utils/responseHelper.js';
import {
  getUserStats as getStats,
  getAllBadgesWithProgress
} from '../services/badgeService.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Register a new moderator account
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    throw badRequest('Email, password, and name are required');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw conflict('Email already registered');
  }

  const user = new User({ email, password, name });
  try {
    await user.save();
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      throw badRequest(messages.join(', '));
    }
    if (error.code === 11000) {
      throw conflict('Email already registered');
    }
    throw error;
  }

  try {
    const plainToken = await createVerificationToken(user);
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
  } catch (emailError) {
    // Email delivery is non-blocking for registration.
    logger.warn('Failed to send verification email', emailError);
  }

  const token = generateToken({ userId: user._id, email: user.email, role: user.role });
  sendCreated(res, 'Registration successful. Please check your email to verify your account.', { token, user });
});

/**
 * Login with email and password
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    throw badRequest('Email and password are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw unauthorized('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw unauthorized('Invalid credentials');
  }

  const expiresIn = rememberMe ? '30d' : '3h';
  const token = generateToken({ userId: user._id, email: user.email, role: user.role }, expiresIn);
  sendSuccess(res, { message: 'Login successful', data: { token, user } });
});

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw notFound('User not found');
  }

  sendSuccess(res, { message: 'User retrieved', data: { user } });
});

/**
 * Update user display name
 * PUT /api/auth/update-name
 */
export const updateName = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    throw badRequest('Name is required');
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    throw notFound('User not found');
  }

  user.name = name.trim();
  await user.save();
  sendSuccess(res, { message: 'Name updated successfully', data: { user } });
});

/**
 * Update user email (requires password confirmation)
 * PUT /api/auth/update-email
 */
export const updateEmail = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    throw badRequest('Email is required');
  }
  if (!password) {
    throw badRequest('Password is required to change email');
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    throw notFound('User not found');
  }
  if (user.provider !== 'local') {
    throw badRequest('Email changes are managed through your OAuth provider');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw unauthorized('Invalid password');
  }

  const nextEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
  if (existingUser) {
    throw conflict('Email already in use');
  }

  user.email = nextEmail;
  user.emailVerified = false;
  await user.save();

  try {
    const plainToken = await createVerificationToken(user);
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
  } catch (emailError) {
    logger.warn('Failed to send verification email', emailError);
  }

  sendSuccess(res, { message: 'Email updated. Please verify your new email address.', data: { user } });
});

/**
 * Update user password
 * PUT /api/auth/update-password
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword) {
    throw badRequest('Current password is required');
  }
  if (!newPassword) {
    throw badRequest('New password is required');
  }
  if (newPassword.length < 6) {
    throw badRequest('Password must be at least 6 characters');
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    throw notFound('User not found');
  }
  if (user.provider !== 'local') {
    throw badRequest('Password changes are managed through your OAuth provider');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw unauthorized('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  sendSuccess(res, { message: 'Password changed successfully' });
});

/**
 * Delete user account and all associated data
 * DELETE /api/auth/delete-account
 */
export const deleteAccount = asyncHandler(async (req, res) => {
  const { confirmText, password } = req.body;

  if (confirmText !== 'DELETE') {
    throw badRequest('Please type DELETE to confirm account deletion');
  }

  const user = await User.findById(req.user.userId);
  if (!user) {
    throw notFound('User not found');
  }

  if (user.provider === 'local') {
    if (!password) {
      throw badRequest('Password is required to delete account');
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw unauthorized('Invalid password');
    }
  }

  const userQuizzes = await Quiz.find({ moderatorId: user._id });
  const quizIds = userQuizzes.map((q) => q._id);

  if (quizIds.length > 0) {
    await Question.deleteMany({ quizId: { $in: quizIds } });
  }
  await Quiz.deleteMany({ moderatorId: user._id });
  await Session.deleteMany({ moderatorId: user._id });
  await User.updateMany(
    { favorites: { $in: quizIds } },
    { $pull: { favorites: { $in: quizIds } } }
  );
  await User.findByIdAndDelete(user._id);

  sendSuccess(res, { message: 'Account deleted successfully' });
});

/**
 * Get user stats
 * GET /api/auth/me/stats
 */
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await getStats(req.user.userId);
  if (!stats) {
    throw notFound('User not found');
  }

  sendSuccess(res, {
    message: 'User stats retrieved',
    data: { stats }
  });
});

/**
 * Get user badges
 * GET /api/auth/me/badges
 */
export const getUserBadges = asyncHandler(async (req, res) => {
  const badges = await getAllBadgesWithProgress(req.user.userId);

  sendSuccess(res, {
    message: 'User badges retrieved',
    data: { badges }
  });
});
