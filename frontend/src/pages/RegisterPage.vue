<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelInput from '../components/PixelInput.vue';

const router = useRouter();
const auth = useAuthStore();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const agreedToTerms = ref(false);
const error = ref('');

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function handleRegister() {
  error.value = '';

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match';
    return;
  }

  try {
    await auth.register(name.value, email.value, password.value);
    router.push('/dashboard');
  } catch (e) {
    error.value = e.message;
  }
}

function signUpWithGoogle() {
  window.location.href = `${API_URL}/api/auth/google`;
}

function signUpWithGitHub() {
  window.location.href = `${API_URL}/api/auth/github`;
}
</script>

<template>
  <div class="h-screen flex items-center justify-center px-4 py-3 bg-gradient-to-br from-primary/10 to-secondary/10">
    <div class="w-full max-w-md flex flex-col max-h-full">
      <div class="text-center mb-3">
        <h1 class="text-2xl font-bold pixel-font text-primary mb-1">Answr</h1>
        <p class="text-muted-foreground text-sm">Host quizzes, engage your audience</p>
      </div>

      <PixelCard class="space-y-3 !p-4 flex-1 min-h-0">
        <!-- Tab Switcher -->
        <div class="grid grid-cols-2 gap-1 p-1 bg-muted">
          <router-link
            to="/login"
            class="py-2 text-sm font-medium text-center hover:bg-white transition-all"
          >
            Sign In
          </router-link>
          <div
            class="py-2 text-sm font-medium text-center bg-primary text-white border-2 border-black cursor-default"
          >
            Sign Up
          </div>
        </div>

        <form class="space-y-3" @submit.prevent="handleRegister">
          <PixelInput
            v-model="name"
            type="text"
            label="Full Name"
            placeholder="John Doe"
            required
            :error="!!error"
            class="[&_input]:py-2"
          />
          <PixelInput
            v-model="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            required
            :error="!!error"
            class="[&_input]:py-2"
          />
          <div class="grid grid-cols-2 gap-3">
            <PixelInput
              v-model="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              required
              :error="!!error"
              class="[&_input]:py-2"
            />
            <PixelInput
              v-model="confirmPassword"
              type="password"
              label="Confirm"
              placeholder="••••••••"
              required
              :error="!!error"
              class="[&_input]:py-2"
            />
          </div>

          <div class="text-xs text-muted-foreground">
            <label class="flex items-start gap-2 cursor-pointer">
              <input v-model="agreedToTerms" type="checkbox" class="w-4 h-4 mt-0.5" />
              <span>
                I agree to the <button type="button" class="text-primary hover:underline">Terms</button> and <button type="button" class="text-primary hover:underline">Privacy Policy</button>
              </span>
            </label>
          </div>

          <p v-if="error" class="text-destructive text-sm font-medium">{{ error }}</p>

          <PixelButton type="submit" variant="primary" class="w-full py-3">
            Create Account
          </PixelButton>
        </form>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t-2 border-border"></div>
          </div>
          <div class="relative flex justify-center text-xs">
            <span class="px-3 bg-card text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <!-- Social logins -->
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="flex items-center justify-center gap-2 py-2 text-sm border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors font-medium"
            @click="signUpWithGoogle"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
          <button
            type="button"
            class="flex items-center justify-center gap-2 py-2 text-sm border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors font-medium"
            @click="signUpWithGitHub"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>
      </PixelCard>

      <p class="mt-3 text-center">
        <router-link to="/" class="text-sm text-muted-foreground hover:text-primary">&larr; Back to Home</router-link>
      </p>
    </div>
  </div>
</template>
