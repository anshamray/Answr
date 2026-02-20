<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiUrl } from '../lib/api.js';

import PixelCard from '../components/PixelCard.vue';
import PixelButton from '../components/PixelButton.vue';

const route = useRoute();
const router = useRouter();

const status = ref('verifying'); // 'verifying', 'success', 'error'
const errorMessage = ref('');

async function verifyEmail() {
  const token = route.query.token;

  if (!token) {
    status.value = 'error';
    errorMessage.value = 'No verification token provided';
    return;
  }

  try {
    const res = await fetch(apiUrl('/api/auth/verify-email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    const data = await res.json();

    if (!res.ok) {
      status.value = 'error';
      errorMessage.value = data.error || 'Verification failed';
      return;
    }

    status.value = 'success';
  } catch (err) {
    status.value = 'error';
    errorMessage.value = 'An error occurred. Please try again.';
  }
}

function goToLogin() {
  router.push('/login');
}

function goToDashboard() {
  router.push('/dashboard');
}

onMounted(verifyEmail);
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary/10 to-secondary/10">
    <div class="w-full max-w-md">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold pixel-font text-primary mb-1">Answr</h1>
      </div>

      <PixelCard class="text-center p-8">
        <!-- Verifying -->
        <div v-if="status === 'verifying'" class="space-y-4">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border-2 border-primary">
            <svg class="w-8 h-8 text-primary animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Verifying your email...</h2>
          <p class="text-muted-foreground">Please wait while we confirm your email address.</p>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'success'" class="space-y-4">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-success/10 border-2 border-success">
            <svg class="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Email Verified!</h2>
          <p class="text-muted-foreground">Your email has been successfully verified. You can now use all features.</p>
          <div class="flex gap-2 justify-center pt-2">
            <PixelButton variant="primary" @click="goToDashboard">
              Go to Dashboard
            </PixelButton>
            <PixelButton variant="outline" @click="goToLogin">
              Sign In
            </PixelButton>
          </div>
        </div>

        <!-- Error -->
        <div v-else class="space-y-4">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 border-2 border-destructive">
            <svg class="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Verification Failed</h2>
          <p class="text-muted-foreground">{{ errorMessage }}</p>
          <div class="flex gap-2 justify-center pt-2">
            <PixelButton variant="primary" @click="goToLogin">
              Back to Login
            </PixelButton>
          </div>
        </div>
      </PixelCard>

      <p class="mt-4 text-center">
        <router-link to="/" class="text-sm text-muted-foreground hover:text-primary">&larr; Back to Home</router-link>
      </p>
    </div>
  </div>
</template>
