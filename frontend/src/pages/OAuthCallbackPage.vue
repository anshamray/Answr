<script setup>
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { TIMING, STORAGE_KEYS } from '../constants/index.js';
import { apiRequest } from '../lib/api.js';

import LoadingSpinner from '../components/LoadingSpinner.vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const error = ref('');
const loading = ref(true);

onMounted(async () => {
  const code = route.query.code;
  const tokenFromQuery = route.query.token; // legacy fallback for older backends
  const errorParam = route.query.error;

  if (errorParam) {
    error.value = decodeURIComponent(errorParam);
    loading.value = false;
    setTimeout(() => router.push('/login'), TIMING.REDIRECT_DELAY);
    return;
  }

  try {
    let token = null;

    if (typeof code === 'string' && code.trim()) {
      const exchange = await apiRequest('/api/auth/oauth/exchange', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() })
      });
      token = exchange?.data?.token || null;
    } else if (typeof tokenFromQuery === 'string' && tokenFromQuery.trim()) {
      token = tokenFromQuery.trim();
    }

    if (!token) {
      throw new Error('No authentication token received');
    }

    // Store the token
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    auth.token = token;

    // Fetch user info (throw on error to show error message)
    await auth.fetchMe(true);

    // Redirect to dashboard
    router.push('/dashboard');
  } catch (e) {
    error.value = e.message || 'Authentication failed';
    loading.value = false;
    setTimeout(() => router.push('/login'), TIMING.REDIRECT_DELAY);
  }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
    <div class="text-center">
      <div v-if="loading" class="space-y-4">
        <LoadingSpinner text="Completing sign in..." />
      </div>

      <div v-else-if="error" class="space-y-4">
        <div class="text-4xl">&#128533;</div>
        <p class="text-lg text-destructive">{{ error }}</p>
        <p class="text-sm text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  </div>
</template>
