import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { createVerificationToken } from './emailController.js';
import { sendEmail } from '../services/emailService.js';
import { verifyEmailTemplate } from '../templates/emails/verifyEmail.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendServerError
} from '../utils/responseHelper.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Register a new moderator account
 * POST /api/auth/register
 */
export async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return sendBadRequest(res, 'Email, password, and name are required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendConflict(res, 'Email already registered');
    }

    // Create user (emailVerified defaults to false for local users)
    const user = new User({ email, password, name });
    await user.save();

    // Generate verification token and send email
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
      console.error('Failed to send verification email:', emailError);
      // Continue registration even if email fails
    }

    // Generate auth token
    const token = generateToken({ userId: user._id, email: user.email, role: user.role });

    sendCreated(res, 'Registration successful. Please check your email to verify your account.', { token, user });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return sendBadRequest(res, messages.join(', '));
    }

    // Handle duplicate key error (shouldn't happen due to earlier check, but just in case)
    if (error.code === 11000) {
      return sendConflict(res, 'Email already registered');
    }

    sendServerError(res, 'Registration failed');
  }
}

/**
 * Login with email and password
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password, rememberMe } = req.body;

    // Validate required fields
    if (!email || !password) {
      return sendBadRequest(res, 'Email and password are required');
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return sendUnauthorized(res, 'Invalid credentials');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendUnauthorized(res, 'Invalid credentials');
    }

    // Generate token with expiration based on rememberMe
    // rememberMe: 30 days, otherwise: 3 hours
    const expiresIn = rememberMe ? '30d' : '3h';
    const token = generateToken({ userId: user._id, email: user.email, role: user.role }, expiresIn);

    sendSuccess(res, { message: 'Login successful', data: { token, user } });
  } catch (error) {
    console.error('Login error:', error);
    sendServerError(res, 'Login failed');
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    sendSuccess(res, { message: 'User retrieved', data: { user } });
  } catch (error) {
    console.error('Get me error:', error);
    sendServerError(res, 'Failed to get user');
  }
}

/**
 * Update user display name
 * PUT /api/auth/update-name
 */
export async function updateName(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return sendBadRequest(res, 'Name is required');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    user.name = name.trim();
    await user.save();

    sendSuccess(res, { message: 'Name updated successfully', data: { user } });
  } catch (error) {
    console.error('Update name error:', error);
    sendServerError(res, 'Failed to update name');
  }
}

/**
 * Update user email (requires password confirmation)
 * PUT /api/auth/update-email
 */
export async function updateEmail(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !email.trim()) {
      return sendBadRequest(res, 'Email is required');
    }

    if (!password) {
      return sendBadRequest(res, 'Password is required to change email');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // OAuth users cannot change email this way
    if (user.provider !== 'local') {
      return sendBadRequest(res, 'Email changes are managed through your OAuth provider');
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendUnauthorized(res, 'Invalid password');
    }

    // Check if new email is already taken
    const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
    if (existingUser) {
      return sendConflict(res, 'Email already in use');
    }

    // Update email and reset verification status
    user.email = email.toLowerCase().trim();
    user.emailVerified = false;
    await user.save();

    // Send verification email to new address
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
      console.error('Failed to send verification email:', emailError);
    }

    sendSuccess(res, { message: 'Email updated. Please verify your new email address.', data: { user } });
  } catch (error) {
    console.error('Update email error:', error);
    sendServerError(res, 'Failed to update email');
  }
}

/**
 * Update user password
 * PUT /api/auth/update-password
 */
export async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return sendBadRequest(res, 'Current password is required');
    }

    if (!newPassword) {
      return sendBadRequest(res, 'New password is required');
    }

    if (newPassword.length < 6) {
      return sendBadRequest(res, 'Password must be at least 6 characters');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // OAuth users cannot change password
    if (user.provider !== 'local') {
      return sendBadRequest(res, 'Password changes are managed through your OAuth provider');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendUnauthorized(res, 'Current password is incorrect');
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    sendSuccess(res, { message: 'Password changed successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    sendServerError(res, 'Failed to update password');
  }
}
