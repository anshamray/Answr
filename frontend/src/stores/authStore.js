import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiUrl } from '../lib/api.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(null);
  const favorites = ref(new Set());

  function isTokenValid() {
    if (!token.value) return false;
    try {
      const payload = JSON.parse(atob(token.value.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expired - clear it
        token.value = null;
        user.value = null;
        localStorage.removeItem('token');
        return false;
      }
      return true;
    } catch {
      // Invalid token - clear it
      token.value = null;
      user.value = null;
      localStorage.removeItem('token');
      return false;
    }
  }

  const isAuthenticated = computed(() => isTokenValid());

  function setAuth(newToken, userData) {
    token.value = newToken;
    user.value = userData;
    localStorage.setItem('token', newToken);
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    favorites.value = new Set();
    localStorage.removeItem('token');
  }

  async function login(email, password, rememberMe = false) {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    setAuth(data.data.token, data.data.user);
    return data;
  }

  async function register(name, email, password) {
    const res = await fetch(apiUrl('/api/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Registration failed');
    }

    const data = await res.json();
    setAuth(data.data.token, data.data.user);
    return data;
  }

  async function fetchMe(throwOnError = false) {
    if (!token.value) return null;

    const res = await fetch(apiUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${token.value}` }
    });

    if (!res.ok) {
      clearAuth();
      if (throwOnError) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch user');
      }
      return null;
    }

    const data = await res.json();
    user.value = data.data.user;
    return data.data.user;
  }

  function logout() {
    clearAuth();
  }

  async function resendVerification() {
    if (!token.value) return false;

    const res = await fetch(apiUrl('/api/auth/resend-verification'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.value}` }
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to resend verification email');
    }

    return true;
  }

  async function updateName(name) {
    if (!token.value) throw new Error('Not authenticated');

    const res = await fetch(apiUrl('/api/auth/update-name'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      },
      body: JSON.stringify({ name })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to update name');
    }

    user.value = data.data.user;
    return data.data.user;
  }

  async function updateEmail(email, password) {
    if (!token.value) throw new Error('Not authenticated');

    const res = await fetch(apiUrl('/api/auth/update-email'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to update email');
    }

    user.value = data.data.user;
    return data.data.user;
  }

  async function updatePassword(currentPassword, newPassword) {
    if (!token.value) throw new Error('Not authenticated');

    const res = await fetch(apiUrl('/api/auth/update-password'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to update password');
    }

    return true;
  }

  async function deleteAccount(confirmText, password) {
    if (!token.value) throw new Error('Not authenticated');

    const res = await fetch(apiUrl('/api/auth/delete-account'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value}`
      },
      body: JSON.stringify({ confirmText, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete account');
    }

    // Clear auth state after successful deletion
    clearAuth();
    return true;
  }

  async function fetchFavorites() {
    if (!token.value) return;

    try {
      const res = await fetch(apiUrl('/api/favorites'), {
        headers: { Authorization: `Bearer ${token.value}` }
      });

      if (!res.ok) return;

      const data = await res.json();
      const quizzes = data.data?.quizzes ?? [];
      favorites.value = new Set(quizzes.map(q => q.id));
    } catch {
      // Silently fail
    }
  }

  async function addFavorite(quizId) {
    if (!token.value) return false;

    try {
      const res = await fetch(apiUrl(`/api/favorites/${quizId}`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.value}` }
      });

      if (!res.ok) return false;

      favorites.value = new Set([...favorites.value, quizId]);
      return true;
    } catch {
      return false;
    }
  }

  async function removeFavorite(quizId) {
    if (!token.value) return false;

    try {
      const res = await fetch(apiUrl(`/api/favorites/${quizId}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token.value}` }
      });

      if (!res.ok) return false;

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
