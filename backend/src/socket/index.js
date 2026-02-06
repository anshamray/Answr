/**
 * Main Socket Handler
 * Manages WebSocket connections and routes events to appropriate handlers
 */

// Placeholder imports for future event handlers
// import { registerPlayerEvents } from './playerEvents.js';
// import { registerModeratorEvents } from './moderatorEvents.js';

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

    // Store reference to activeSessions on socket for use in event handlers
    socket.activeSessions = activeSessions;

    // Register player events (WS-2)
    // registerPlayerEvents(io, socket, activeSessions);

    // Register moderator events (WS-3, WS-4)
    // registerModeratorEvents(io, socket, activeSessions);

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      // Clean up player from any session they were in
      for (const [pin, session] of activeSessions) {
        if (session.players && session.players.has(socket.id)) {
          session.players.delete(socket.id);
          console.log(`Player removed from session ${pin}`);

          // Notify remaining players in the session
          io.to(pin).emit('player:left', {
            playerId: socket.id,
            playerCount: session.players.size
          });
        }

        // If host disconnects, notify players
        if (session.hostSocketId === socket.id) {
          console.log(`Host disconnected from session ${pin}`);
          io.to(pin).emit('session:hostDisconnected');
        }
      }
    });
  });

  console.log('Socket handler initialized');

  return { activeSessions };
}
