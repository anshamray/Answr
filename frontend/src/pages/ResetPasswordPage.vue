<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiUrl } from '../lib/api.js';

import PixelCard from '../components/PixelCard.vue';
import PixelButton from '../components/PixelButton.vue';
import PixelInput from '../components/PixelInput.vue';

const route = useRoute();
const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const status = ref('validating'); // 'validating', 'form', 'loading', 'success', 'error', 'invalid'
const errorMessage = ref('');

async function validateToken() {
  const token = route.query.token;

  if (!token) {
    status.value = 'invalid';
    errorMessage.value = 'No reset token provided';
    return;
  }

  try {
    const res = await fetch(apiUrl(`/api/auth/check-reset-token/${token}`));
    const data = await res.json();

    if (!res.ok) {
      status.value = 'invalid';
      errorMessage.value = data.error || 'Invalid or expired reset token';
      return;
    }

    status.value = 'form';
  } catch (err) {
    status.value = 'invalid';
    errorMessage.value = 'Failed to validate reset token';
  }
}

async function handleSubmit() {
  errorMessage.value = '';

  if (!password.value || password.value.length < 6) {
    errorMessage.value = 'Password must be at least 6 characters';
    status.value = 'error';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match';
    status.value = 'error';
    return;
  }

  status.value = 'loading';

  try {
    const res = await fetch(apiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: route.query.token,
        password: password.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      status.value = 'error';
      errorMessage.value = data.error || 'Failed to reset password';
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

function goToForgotPassword() {
  router.push('/forgot-password');
}

onMounted(validateToken);
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary/10 to-secondary/10">
    <div class="w-full max-w-md">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold pixel-font text-primary mb-1">Answr</h1>
      </div>

      <PixelCard class="p-6">
        <!-- Validating token -->
        <div v-if="status === 'validating'" class="space-y-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border-2 border-primary mx-auto">
            <svg class="w-8 h-8 text-primary animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Validating...</h2>
          <p class="text-muted-foreground">Please wait while we validate your reset link.</p>
        </div>

        <!-- Invalid token -->
        <div v-else-if="status === 'invalid'" class="space-y-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 border-2 border-destructive mx-auto">
            <svg class="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Invalid Reset Link</h2>
          <p class="text-muted-foreground">{{ errorMessage }}</p>
          <div class="flex gap-2 justify-center pt-2">
            <PixelButton variant="primary" @click="goToForgotPassword">
              Request New Link
            </PixelButton>
          </div>
        </div>

        <!-- Form -->
        <div v-else-if="status === 'form' || status === 'loading' || status === 'error'" class="space-y-4">
          <div class="text-center">
            <h2 class="text-xl font-bold mb-2">Set new password</h2>
            <p class="text-sm text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <PixelInput
              v-model="password"
              type="password"
              label="New Password"
              placeholder="At least 6 characters"
              required
              :error="status === 'error'"
              :disabled="status === 'loading'"
            />
            <PixelInput
              v-model="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Repeat your password"
              required
              :error="status === 'error'"
              :disabled="status === 'loading'"
            />

            <p v-if="errorMessage" class="text-destructive text-sm font-medium">{{ errorMessage }}</p>

            <PixelButton
              type="submit"
              variant="primary"
              class="w-full"
              :disabled="status === 'loading'"
            >
              <template v-if="status === 'loading'">Resetting...</template>
              <template v-else>Reset Password</template>
            </PixelButton>
          </form>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'success'" class="space-y-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-success/10 border-2 border-success mx-auto">
            <svg class="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Password Reset!</h2>
          <p class="text-muted-foreground">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <div class="pt-2">
            <PixelButton variant="primary" @click="goToLogin">
              Sign In
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
