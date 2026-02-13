import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/responseHelper.js';

const router = Router();

// Will be set by server.js after socket initialization
let getActiveSessionCount = () => 0;

/**
 * Set the getter function for active session count
 * @param {Function} getter - Function that returns the number of active sessions
 */
export function setActiveSessionsGetter(getter) {
  getActiveSessionCount = getter;
}

/**
 * GET /api/health
 * Returns server health status including database connection and active sessions
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  const health = {
    status: isDbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: isDbConnected ? 'connected' : 'disconnected',
    activeSessions: getActiveSessionCount()
  };

  const statusCode = isDbConnected ? 200 : 503;
  sendSuccess(res, { status: statusCode, message: 'Health check', data: health });
});

export default router;
