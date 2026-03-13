import User from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendSuccess } from '../utils/responseHelper.js';

/**
 * Basic admin statistics.
 * GET /api/admin/stats
 *
 * Currently returns:
 * - total number of registered users
 * - total number of admin users
 */
export const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalAdmins] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' })
  ]);

  sendSuccess(res, {
    message: 'Admin stats retrieved',
    data: {
      totalUsers,
      totalAdmins
    }
  });
});

