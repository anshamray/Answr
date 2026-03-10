import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('../lib/playerSession.js', () => {
  return {
    readPersistedPlayerSession: () => null,
    writePersistedPlayerSession: vi.fn(),
    clearPersistedPlayerSession: vi.fn()
  };
});

// Import after mocking
import { writePersistedPlayerSession } from '../lib/playerSession.js';
import { useGameStore } from '../stores/gameStore.js';

function createLocalStorageMock() {
  let store = {};
  return {
    getItem(key) {
      return store[key] ?? null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
}

describe('gameStore persistence', () => {
  beforeEach(() => {
    // Provide a simple localStorage polyfill for Node environment.
    globalThis.localStorage = createLocalStorageMock();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('debounces persistence and writes expected shape', async () => {
    const store = useGameStore();

    store.setSession({ pin: '123456', playerId: 'p1', sessionId: 's1' });
    store.playerName = 'Alice';
    store.playerEmoji = '😀';

    // Fast consecutive changes should only lead to one write after debounce.
    store.status = 'lobby';
    store.status = 'playing';

    expect(writePersistedPlayerSession).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(writePersistedPlayerSession).toHaveBeenCalledTimes(1);
    const payload = writePersistedPlayerSession.mock.calls[0][0];
    expect(payload).toMatchObject({
      pin: '123456',
      playerId: 'p1',
      sessionId: 's1',
      playerName: 'Alice',
      playerEmoji: '😀',
      status: 'playing'
    });
  });
});

