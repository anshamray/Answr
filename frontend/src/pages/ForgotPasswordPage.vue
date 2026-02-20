<script setup>
import { ref } from 'vue';
import { apiUrl } from '../lib/api.js';

import PixelCard from '../components/PixelCard.vue';
import PixelButton from '../components/PixelButton.vue';
import PixelInput from '../components/PixelInput.vue';

const email = ref('');
const status = ref('form'); // 'form', 'loading', 'sent', 'error'
const errorMessage = ref('');

async function handleSubmit() {
  if (!email.value) {
    errorMessage.value = 'Please enter your email address';
    status.value = 'error';
    return;
  }

  status.value = 'loading';
  errorMessage.value = '';

  try {
    const res = await fetch(apiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    });

    const data = await res.json();

    if (!res.ok) {
      status.value = 'error';
      errorMessage.value = data.error || 'Failed to send reset email';
      return;
    }

    status.value = 'sent';
  } catch (err) {
    status.value = 'error';
    errorMessage.value = 'An error occurred. Please try again.';
  }
}

function resetForm() {
  status.value = 'form';
  email.value = '';
  errorMessage.value = '';
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary/10 to-secondary/10">
    <div class="w-full max-w-md">
      <div class="text-center mb-6">
        <h1 class="text-2xl font-bold pixel-font text-primary mb-1">Answr</h1>
      </div>

      <PixelCard class="p-6">
        <!-- Form -->
        <div v-if="status === 'form' || status === 'loading' || status === 'error'" class="space-y-4">
          <div class="text-center">
            <h2 class="text-xl font-bold mb-2">Reset your password</h2>
            <p class="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <PixelInput
              v-model="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
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
              <template v-if="status === 'loading'">Sending...</template>
              <template v-else>Send Reset Link</template>
            </PixelButton>
          </form>

          <div class="text-center">
            <router-link to="/login" class="text-sm text-primary hover:underline">
              Back to Sign In
            </router-link>
          </div>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'sent'" class="space-y-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-success/10 border-2 border-success mx-auto">
            <svg class="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">Check your email</h2>
          <p class="text-muted-foreground">
            If an account exists with <strong>{{ email }}</strong>, you will receive a password reset link shortly.
          </p>
          <div class="flex gap-2 justify-center pt-2">
            <PixelButton variant="outline" @click="resetForm">
              Try another email
            </PixelButton>
            <router-link to="/login">
              <PixelButton variant="primary">
                Back to Sign In
              </PixelButton>
            </router-link>
          </div>
        </div>
      </PixelCard>

      <p class="mt-4 text-center">
        <router-link to="/" class="text-sm text-muted-foreground hover:text-primary">&larr; Back to Home</router-link>
      </p>
    </div>
  </div>
</template>
