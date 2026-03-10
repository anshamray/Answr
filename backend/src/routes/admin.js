import { Router } from 'express';

import { authenticate, requireAdmin } from '../middleware/auth.js';
import { getAdminStats } from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, requireAdmin);

// GET /api/admin/stats - basic admin dashboard statistics
router.get('/stats', getAdminStats);

export default router;

