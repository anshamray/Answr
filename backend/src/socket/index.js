/**
 * Main Socket Handler
 * Manages WebSocket connections and routes events to appropriate handlers
 */

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
    console.log('Client connected:', socket.id);

    // Register player events (WS-2)
    registerPlayerEvents(io, socket, activeSessions);

    // Register moderator events (WS-3, WS-4)
    registerModeratorEvents(io, socket, activeSessions);

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
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
            console.log(`Player ${playerId} marked disconnected from session ${sessionPin}`);

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

      // Also check if this socket was the host for any session
      for (const [pin, session] of activeSessions) {
        if (session.hostSocketId === socket.id) {
          console.log(`Host disconnected from session ${pin}`);
          io.to(pin).emit(SESSION_EVENTS.HOST_DISCONNECTED);
        }
      }
    });
  });

  console.log('Socket handler initialized');

  return { activeSessions };
}
