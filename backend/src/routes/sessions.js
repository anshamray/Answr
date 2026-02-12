import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import {
  createSession,
  getSession,
  endSession,
  getSessionResults
} from '../controllers/sessionController.js';

const router = Router();

// All session routes require authentication
router.use(authenticate);

// POST /api/sessions - Create session with 6-digit PIN
router.post('/', createSession);

// GET /api/sessions/:id - Get session details
router.get('/:id', getSession);

// DELETE /api/sessions/:id - End session
router.delete('/:id', endSession);

// GET /api/sessions/:id/results - Get final statistics
router.get('/:id/results', getSessionResults);

export default router;
