/**
 * Main Socket Handler
 * Manages WebSocket connections and routes events to appropriate handlers
 */

import { logger } from '../utils/logger.js';

import { PLAYER_EVENTS, SESSION_EVENTS } from './events.js';
import { registerModeratorEvents } from './moderatorEvents.js';
import { registerPlayerEvents } from './playerEvents.js';

/**
 * Initialize the socket handler
 * @param {Server} io - Socket.io server instance
 * @returns {Object} - Object containing activeSessions Map
 */
export function initializeSocket(io) {
  // Store active sessions in memory (sessionPin -> sessionData)
  // sessionData structure: { pin, quizId, hostSocketId, players: Map, status, currentQuestion, settings }
  const activeSessions = new Map();

  io.on('connection', (socket) => {
    logger.info('Socket client connected', { socketId: socket.id });

    // Register player events (WS-2)
    registerPlayerEvents(io, socket, activeSessions);

    // Register moderator events (WS-3, WS-4)
    registerModeratorEvents(io, socket, activeSessions);

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info('Socket client disconnected', { socketId: socket.id });
      const sessionPin = socket.data?.sessionPin;
      const playerId = socket.data?.playerId;

      // If this socket belonged to a player, mark them as disconnected
      if (sessionPin && playerId) {
        const session = activeSessions.get(sessionPin);
        if (session && session.players && session.players.has(playerId)) {
          const player = session.players.get(playerId);
          if (player && player.socketId === socket.id) {
            player.isConnected = false;
            player.disconnectedAt = new Date();
            logger.info('Player disconnected from session', { playerId, sessionPin });

            const connectedCount = Array.from(session.players.values()).filter(
              (p) => p.isConnected
            ).length;

            // Notify remaining players in the session
            io.to(sessionPin).emit(PLAYER_EVENTS.LEFT, {
              playerId,
              playerCount: connectedCount
            });
          }
        }
      }

      // If this socket was the host for a session, notify clients.
      // We can rely on socket.data.isModerator and sessionPin instead
      // of scanning all sessions.
      if (socket.data?.isModerator && sessionPin) {
        const session = activeSessions.get(sessionPin);
        if (session && session.hostSocketId === socket.id) {
          logger.info('Host disconnected from session', { sessionPin });
          io.to(sessionPin).emit(SESSION_EVENTS.HOST_DISCONNECTED);
        }
      }
    });
  });

  logger.info('Socket handler initialized');

  return { activeSessions };
}
