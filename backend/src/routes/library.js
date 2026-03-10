import { Router } from 'express';

import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.js';
import {
  browseLibrary,
  getLibraryQuiz,
  cloneLibraryQuiz,
  startLibraryQuiz,
  publishQuiz,
  unpublishQuiz,
  createOfficialQuiz,
  importOfficialQuizzes
} from '../controllers/libraryController.js';

const router = Router();

// --- Public / optional-auth library endpoints ---

// GET /api/library - Browse published quizzes (public, enriched if authenticated)
router.get('/', optionalAuth, browseLibrary);

// GET /api/library/:id - Get a single library quiz detail
router.get('/:id', optionalAuth, getLibraryQuiz);

// POST /api/library/:id/start - Start a library quiz (guest or authenticated)
router.post('/:id/start', optionalAuth, startLibraryQuiz);

// --- Authenticated endpoints ---

// POST /api/library/:id/clone - Clone a library quiz into your collection
router.post('/:id/clone', authenticate, cloneLibraryQuiz);

// PUT /api/library/publish/:id - Publish your quiz to the library
router.put('/publish/:id', authenticate, publishQuiz);

// PUT /api/library/unpublish/:id - Remove your quiz from the library
router.put('/unpublish/:id', authenticate, unpublishQuiz);

// --- Admin-only endpoints ---

// POST /api/library/official - Create an official (admin) quiz
router.post('/official', authenticate, requireAdmin, createOfficialQuiz);

// POST /api/library/import - Bulk import official quizzes as admin
router.post('/import', authenticate, requireAdmin, importOfficialQuizzes);

export default router;
