<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelInput from '../components/PixelInput.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const error = ref('');

async function handleLogin() {
  error.value = '';
  try {
    await auth.login(email.value, password.value);
    router.push('/dashboard');
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-secondary/5 to-background px-4">
    <div class="w-full max-w-md">
      <PixelCard class="space-y-6">
        <div class="text-center space-y-3">
          <PixelLogo class="text-primary mx-auto" :size="48" />
          <h1 class="text-3xl font-bold">Welcome Back</h1>
          <p class="text-muted-foreground">Sign in to manage your quizzes</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <PixelInput
            v-model="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            required
            :error="!!error"
          />
          <PixelInput
            v-model="password"
            type="password"
            label="Password"
            placeholder="Your password"
            required
            :error="!!error"
          />

          <p v-if="error" class="text-destructive text-sm font-medium">{{ error }}</p>

          <PixelButton type="submit" variant="primary" class="w-full">
            Login
          </PixelButton>
        </form>

        <div class="pt-4 border-t-2 border-border text-center space-y-3">
          <p class="text-sm text-muted-foreground">
            No account?
            <router-link to="/register" class="text-primary font-semibold hover:underline">Register</router-link>
          </p>
          <router-link to="/" class="text-sm text-muted-foreground hover:text-primary block">
            &larr; Back to Home
          </router-link>
        </div>
      </PixelCard>
    </div>
  </div>
</template>
