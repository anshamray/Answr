import { disconnectSocket } from '../lib/socket.js';

const SESSION_RECOVERY_ERROR_CODES = new Set([
  'NOT_FOUND',
  'SESSION_EXPIRED',
  'SESSION_NOT_FOUND'
]);

export function usePlayerReconnect({ socket, game, router }) {
  let shouldReconnect = !socket.connected;
  let reconnectPending = false;

  function resetToJoinPage() {
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

    reconnectPending = true;
    socket.emit('player:reconnect', {
      sessionId: game.sessionId,
      oldPlayerId: game.playerId
    });
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

    reconnectPending = false;
    shouldReconnect = false;
    game.setSession(data);
  }

  function handlePlayerError(data) {
    if (!reconnectPending) return;

    reconnectPending = false;

    if (SESSION_RECOVERY_ERROR_CODES.has(data?.code)) {
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
    window.removeEventListener('focus', handlePageShow);
    window.removeEventListener('pageshow', handlePageShow);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    maybeRecoverSession,
    cleanup
  };
}
