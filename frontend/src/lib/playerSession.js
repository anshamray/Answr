const PLAYER_SESSION_STORAGE_KEY = 'playerSession';

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readPersistedPlayerSession() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(PLAYER_SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writePersistedPlayerSession(data) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(PLAYER_SESSION_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage failures so gameplay is not interrupted.
  }
}

export function clearPersistedPlayerSession() {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(PLAYER_SESSION_STORAGE_KEY);
}

export function hasPersistedPlayerSession() {
  const session = readPersistedPlayerSession();
  return !!(session?.sessionId && session?.playerId);
}

export function getPersistedPlayerRoute(session = readPersistedPlayerSession()) {
  if (!session?.sessionId || !session?.playerId) {
    return null;
  }

  if (session.status === 'finished') {
    return '/play/results';
  }

  if (session.status === 'playing' || session.status === 'paused' || session.currentQuestion) {
    return '/play/game';
  }

  if (session.pin) {
    return '/play/lobby';
  }

  return null;
}
