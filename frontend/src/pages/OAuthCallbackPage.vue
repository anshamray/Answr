<script setup>
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { TIMING, STORAGE_KEYS } from '../constants/index.js';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const error = ref('');
const loading = ref(true);

onMounted(async () => {
  const token = route.query.token;
  const errorParam = route.query.error;

  if (errorParam) {
    error.value = decodeURIComponent(errorParam);
    loading.value = false;
    setTimeout(() => router.push('/login'), TIMING.REDIRECT_DELAY);
    return;
  }

  if (!token) {
    error.value = 'No authentication token received';
    loading.value = false;
    setTimeout(() => router.push('/login'), TIMING.REDIRECT_DELAY);
    return;
  }

  try {
    // Store the token
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    auth.token = token;

    // Fetch user info
    await auth.fetchMe();

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
  <div class="h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
    <div class="text-center">
      <div v-if="loading" class="space-y-4">
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-lg text-muted-foreground">Completing sign in...</p>
      </div>

      <div v-else-if="error" class="space-y-4">
        <div class="text-4xl">&#128533;</div>
        <p class="text-lg text-destructive">{{ error }}</p>
        <p class="text-sm text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  </div>
</template>
