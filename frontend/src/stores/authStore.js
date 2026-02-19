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

  async function login(email, password) {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
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

  async function fetchMe() {
    if (!token.value) return null;

    const res = await fetch(apiUrl('/api/auth/me'), {
      headers: { Authorization: `Bearer ${token.value}` }
    });

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const data = await res.json();
    user.value = data.data.user;
    return data.data.user;
  }

  function logout() {
    clearAuth();
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
    fetchFavorites,
    addFavorite,
    removeFavorite,
    isFavorited
  };
});
