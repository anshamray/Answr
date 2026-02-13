import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null);
  const user = ref(null);

  const isAuthenticated = computed(() => !!token.value);

  function setAuth(newToken, userData) {
    token.value = newToken;
    user.value = userData;
    localStorage.setItem('token', newToken);
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
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
    const res = await fetch('/api/auth/register', {
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

    const res = await fetch('/api/auth/me', {
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

  return {
    token,
    user,
    isAuthenticated,
    login,
    register,
    fetchMe,
    logout
  };
});
