import { Router } from 'express';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/responseHelper.js';

const router = Router();

// Will be set by server.js after socket initialization
// The getter may return either a number (backwards compatibility)
// or an object with { activeSessions, activePlayers, sockets }.
let getSocketStats = () => 0;

/**
 * Set the getter function for active socket/session stats
 * @param {Function} getter - Function that returns either a number (activeSessions)
 *                            or an object with { activeSessions, activePlayers, sockets }
 */
export function setActiveSessionsGetter(getter) {
  getSocketStats = getter;
}

/**
 * GET /api/health
 * Returns server health status including database connection and active sessions
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const isDbConnected = dbState === 1;

  const stats = getSocketStats();

  let activeSessions = 0;
  let activePlayers;
  let sockets;

  if (typeof stats === 'number') {
    activeSessions = stats;
  } else if (stats && typeof stats === 'object') {
    activeSessions = typeof stats.activeSessions === 'number' ? stats.activeSessions : 0;
    if (typeof stats.activePlayers === 'number') {
      activePlayers = stats.activePlayers;
    }
    if (typeof stats.sockets === 'number') {
      sockets = stats.sockets;
    }
  }

  const health = {
    status: isDbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: isDbConnected ? 'connected' : 'disconnected',
    activeSessions
  };

  if (typeof activePlayers === 'number') {
    health.activePlayers = activePlayers;
  }
  if (typeof sockets === 'number') {
    health.sockets = sockets;
  }

  const statusCode = isDbConnected ? 200 : 503;
  sendSuccess(res, { status: statusCode, message: 'Health check', data: health });
});

export default router;
