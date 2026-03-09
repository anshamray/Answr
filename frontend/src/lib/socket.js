import { io } from 'socket.io-client';
import { apiBase } from './api.js';
import { addDebugLog } from './debugLog.js';

let socket = null;

const defaultSocketUrl = apiBase || 'http://localhost:3000';

function attachDebugListeners(activeSocket) {
  activeSocket.on('connect', () => {
    addDebugLog({
      level: 'info',
      source: 'socket',
      message: 'Socket connected'
    });
  });

  activeSocket.on('disconnect', (reason) => {
    addDebugLog({
      level: 'warning',
      source: 'socket',
      message: 'Socket disconnected',
      details: reason || ''
    });
  });

  activeSocket.on('connect_error', (error) => {
    addDebugLog({
      level: 'warning',
      source: 'socket',
      message: error?.message || 'Socket connection failed',
      details: error?.description ? String(error.description) : '',
      stack: error?.stack || ''
    });
  });

  activeSocket.on('error', (error) => {
    addDebugLog({
      level: 'warning',
      source: 'socket',
      message: typeof error === 'string' ? error : error?.message || 'Socket error',
      details: typeof error === 'object' && error ? JSON.stringify(error, null, 2) : ''
    });
  });

  activeSocket.on('player:error', (data) => {
    addDebugLog({
      level: 'warning',
      source: 'player',
      message: data?.message || 'Player error',
      details: data?.code ? `Code: ${data.code}` : ''
    });
  });
}

/**
 * Connect to the WebSocket server.
 * @param {string} url - Server URL (default: VITE_API_URL or http://localhost:3000)
 * @param {object} opts - Extra Socket.io options (e.g. auth headers)
 * @returns {import('socket.io-client').Socket}
 */
export function connectSocket(url = defaultSocketUrl, opts = {}) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(url, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 15000,
    ...opts
  });

  attachDebugListeners(socket);

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
