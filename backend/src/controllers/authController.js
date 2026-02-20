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
