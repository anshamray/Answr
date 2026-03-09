import { disconnectSocket } from '../lib/socket.js';

const SESSION_RECOVERY_ERROR_CODES = new Set([
  'NOT_FOUND',
  'SESSION_EXPIRED',
  'SESSION_NOT_FOUND'
]);
const RECONNECT_RETRY_DELAY_MS = 1500;
const MAX_RECONNECT_ATTEMPTS = 5;

export function usePlayerReconnect({ socket, game, router }) {
  let shouldReconnect = !socket.connected;
  let reconnectPending = false;
  let reconnectAttempts = 0;
  let reconnectTimerId = null;

  function clearReconnectTimer() {
    if (reconnectTimerId) {
      window.clearTimeout(reconnectTimerId);
      reconnectTimerId = null;
    }
  }

  function scheduleReconnectRetry() {
    clearReconnectTimer();
    reconnectTimerId = window.setTimeout(() => {
      reconnectPending = false;
      requestReconnect();
    }, RECONNECT_RETRY_DELAY_MS);
  }

  function resetToJoinPage() {
    clearReconnectTimer();
    disconnectSocket();
    game.reset();
    router.replace('/play');
  }

  function emitReconnect() {
    if (!shouldReconnect || reconnectPending) return;

    if (!game.sessionId || !game.playerId) {
      resetToJoinPage();
      return;
    }

    reconnectAttempts += 1;
    reconnectPending = true;
    socket.emit('player:reconnect', {
      sessionId: game.sessionId,
      oldPlayerId: game.playerId
    });
    scheduleReconnectRetry();
  }

  function handleConnect() {
    emitReconnect();
  }

  function handleDisconnect() {
    shouldReconnect = true;
    reconnectPending = false;
  }

  function handleJoined(data) {
    if (!reconnectPending) return;

    clearReconnectTimer();
    reconnectPending = false;
    shouldReconnect = false;
    reconnectAttempts = 0;
    game.setSession(data);
  }

  function handlePlayerError(data) {
    if (!reconnectPending) return;

    clearReconnectTimer();
    reconnectPending = false;

    if (SESSION_RECOVERY_ERROR_CODES.has(data?.code)) {
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        scheduleReconnectRetry();
        return;
      }

      resetToJoinPage();
    }
  }

  function requestReconnect() {
    if (!game.sessionId || !game.playerId) return;

    shouldReconnect = true;

    if (!socket.connected) {
      socket.connect();
      return;
    }

    emitReconnect();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      requestReconnect();
    }
  }

  function handlePageShow() {
    requestReconnect();
  }

  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  socket.on('player:joined', handleJoined);
  socket.on('player:error', handlePlayerError);
  window.addEventListener('focus', handlePageShow);
  window.addEventListener('pageshow', handlePageShow);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  function maybeRecoverSession() {
    requestReconnect();
  }

  function cleanup() {
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('player:joined', handleJoined);
    socket.off('player:error', handlePlayerError);
    clearReconnectTimer();
    window.removeEventListener('focus', handlePageShow);
    window.removeEventListener('pageshow', handlePageShow);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    maybeRecoverSession,
    cleanup
  };
}
