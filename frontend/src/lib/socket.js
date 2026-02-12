import { io } from 'socket.io-client';

let socket = null;

/**
 * Connect to the WebSocket server.
 * @param {string} url - Server URL (default: http://localhost:3000)
 * @param {object} opts - Extra Socket.io options (e.g. auth headers)
 * @returns {import('socket.io-client').Socket}
 */
export function connectSocket(url = 'http://localhost:3000', opts = {}) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(url, {
    transports: ['websocket'],
    autoConnect: true,
    ...opts
  });

  return socket;
}

/**
 * Get the current socket instance.
 * Returns null if not connected.
 * @returns {import('socket.io-client').Socket | null}
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect and clear the socket instance.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
