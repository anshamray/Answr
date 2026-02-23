import { Router } from 'express';

import { authenticate, optionalAuth } from '../middleware/auth.js';
import {
  createSession,
  getSession,
  endSession,
  getSessionResults,
  getSessionHistory,
  getSessionAnalytics,
  exportSessionCSV
} from '../controllers/sessionController.js';

const router = Router();

// GET /api/sessions - session history (requires auth)
router.get('/', authenticate, getSessionHistory);

// GET /api/sessions/:id - supports both JWT auth and ?guestToken= access
router.get('/:id', optionalAuth, getSession);

// All other session routes require full authentication
router.post('/', authenticate, createSession);
router.delete('/:id', authenticate, endSession);
router.get('/:id/results', authenticate, getSessionResults);
router.get('/:id/analytics', authenticate, getSessionAnalytics);
router.get('/:id/export', authenticate, exportSessionCSV);

export default router;
