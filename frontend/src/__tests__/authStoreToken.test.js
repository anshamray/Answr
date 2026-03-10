import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Stub apiRequest so authStore methods that call it won't hit the network.
vi.mock('../lib/api.js', () => ({
  apiRequest: vi.fn()
}));

import { useAuthStore } from '../stores/authStore.js';

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

function createTokenWithExp(expSecondsFromNow) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = { exp: nowSeconds + expSecondsFromNow };
  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${base64}.signature`;
}

describe('authStore token expiry', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock();
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('treats a future-expiry token as authenticated', () => {
    const token = createTokenWithExp(60); // expires in 60 seconds
    localStorage.setItem('token', token);

    const store = useAuthStore();

    expect(store.isAuthenticated).toBe(true);
  });

  it('clears expired token and reports unauthenticated', () => {
    const token = createTokenWithExp(-60); // expired 60 seconds ago
    localStorage.setItem('token', token);

    const store = useAuthStore();

    // First access should detect expiry and clear auth.
    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
  });
});

