import { Router } from 'express';

import { authenticate, optionalAuth } from '../middleware/auth.js';
import {
  createSession,
  getSession,
  endSession,
  getSessionResults
} from '../controllers/sessionController.js';

const router = Router();

// GET /api/sessions/:id - supports both JWT auth and ?guestToken= access
router.get('/:id', optionalAuth, getSession);

// All other session routes require full authentication
router.post('/', authenticate, createSession);
router.delete('/:id', authenticate, endSession);
router.get('/:id/results', authenticate, getSessionResults);

export default router;
