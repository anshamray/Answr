import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
  sendConflict,
  sendServerError
} from '../utils/responseHelper.js';

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

    // Create user
    const user = new User({ email, password, name });
    await user.save();

    // Generate token
    const token = generateToken({ userId: user._id, email: user.email, role: user.role });

    sendCreated(res, 'Registration successful', { token, user });
  } catch (error) {
    console.error('Registration error:', error);
    sendServerError(res, 'Registration failed');
  }
}

/**
 * Login with email and password
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

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

    // Generate token
    const token = generateToken({ userId: user._id, email: user.email, role: user.role });

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
