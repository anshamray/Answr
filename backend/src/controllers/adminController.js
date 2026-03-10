import User from '../models/User.js';
import { sendSuccess, sendServerError } from '../utils/responseHelper.js';

/**
 * Basic admin statistics.
 * GET /api/admin/stats
 *
 * Currently returns:
 * - total number of registered users
 * - total number of admin users
 */
export async function getAdminStats(req, res) {
  try {
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
  } catch (error) {
    console.error('Get admin stats error:', error);
    sendServerError(res, 'Failed to fetch admin stats');
  }
}

