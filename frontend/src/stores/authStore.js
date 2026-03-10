import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiRequest } from '../lib/api.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(null);
  const favorites = ref(new Set());

  // Cache decoded token payload + exp to avoid re‑decoding on every access.
  const tokenPayload = ref(null);
  const tokenExpiresAt = ref(null);

  function decodeToken(currentToken) {
    if (!currentToken) {
      tokenPayload.value = null;
      tokenExpiresAt.value = null;
      return;
    }

    try {
      const payload = JSON.parse(atob(currentToken.split('.')[1]));
      tokenPayload.value = payload;
      tokenExpiresAt.value = payload.exp ? payload.exp * 1000 : null;
    } catch {
      tokenPayload.value = null;
      tokenExpiresAt.value = null;
    }
  }

  // Decode on initial load
  decodeToken(token.value);

  function isTokenValid() {
    if (!token.value) return false;

    // If decoding failed earlier, treat as invalid and clear.
    if (!tokenPayload.value) {
      clearAuth();
      return false;
    }

    if (tokenExpiresAt.value && tokenExpiresAt.value < Date.now()) {
      clearAuth();
      return false;
    }

    return true;
  }

  const isAuthenticated = computed(() => isTokenValid());

  function setAuth(newToken, userData) {
    token.value = newToken;
    user.value = userData;
    localStorage.setItem('token', newToken);
    decodeToken(newToken);
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    favorites.value = new Set();
    tokenPayload.value = null;
    tokenExpiresAt.value = null;
    localStorage.removeItem('token');
  }

  async function login(email, password, rememberMe = false) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe })
    });

    setAuth(data.data.token, data.data.user);
    return data;
  }

  async function register(name, email, password) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });

    setAuth(data.data.token, data.data.user);
    return data;
  }

  async function fetchMe(throwOnError = false) {
    if (!token.value) return null;

    try {
      const data = await apiRequest('/api/auth/me', {}, token.value);
      user.value = data.data.user;
      return data.data.user;
    } catch (error) {
      clearAuth();
      if (throwOnError) {
        throw error;
      }
      return null;
    }
  }

  function logout() {
    clearAuth();
  }

  async function resendVerification() {
    if (!token.value) return false;

    await apiRequest('/api/auth/resend-verification', {
      method: 'POST'
    }, token.value);

    return true;
  }

  async function updateName(name) {
    if (!token.value) throw new Error('Not authenticated');

    const data = await apiRequest('/api/auth/update-name', {
      method: 'PUT',
      body: JSON.stringify({ name })
    }, token.value);

    user.value = data.data.user;
    return data.data.user;
  }

  async function updateEmail(email, password) {
    if (!token.value) throw new Error('Not authenticated');

    const data = await apiRequest('/api/auth/update-email', {
      method: 'PUT',
      body: JSON.stringify({ email, password })
    }, token.value);

    user.value = data.data.user;
    return data.data.user;
  }

  async function updatePassword(currentPassword, newPassword) {
    if (!token.value) throw new Error('Not authenticated');

    await apiRequest('/api/auth/update-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    }, token.value);

    return true;
  }

  async function deleteAccount(confirmText, password) {
    if (!token.value) throw new Error('Not authenticated');

    await apiRequest('/api/auth/delete-account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmText, password })
    }, token.value);

    // Clear auth state after successful deletion
    clearAuth();
    return true;
  }

  async function fetchFavorites() {
    if (!token.value) return;

    try {
      const data = await apiRequest('/api/favorites', {}, token.value);
      const quizzes = data.data?.quizzes ?? [];
      favorites.value = new Set(quizzes.map((q) => q.id));
    } catch {
      // Silently fail
    }
  }

  async function addFavorite(quizId) {
    if (!token.value) return false;

    try {
      await apiRequest(`/api/favorites/${quizId}`, {
        method: 'POST'
      }, token.value);

      favorites.value = new Set([...favorites.value, quizId]);
      return true;
    } catch {
      return false;
    }
  }

  async function removeFavorite(quizId) {
    if (!token.value) return false;

    try {
      await apiRequest(`/api/favorites/${quizId}`, {
        method: 'DELETE'
      }, token.value);

      const newSet = new Set(favorites.value);
      newSet.delete(quizId);
      favorites.value = newSet;
      return true;
    } catch {
      return false;
    }
  }

  function isFavorited(quizId) {
    return favorites.value.has(quizId);
  }

  return {
    token,
    user,
    favorites,
    isAuthenticated,
    login,
    register,
    fetchMe,
    logout,
    resendVerification,
    updateName,
    updateEmail,
    updatePassword,
    deleteAccount,
    fetchFavorites,
    addFavorite,
    removeFavorite,
    isFavorited
  };
});
