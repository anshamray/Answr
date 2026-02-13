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

const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');

async function handleRegister() {
  error.value = '';
  try {
    await auth.register(name.value, email.value, password.value);
    router.push('/dashboard');
  } catch (e) {
    error.value = e.message;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-secondary/5 via-primary/5 to-background px-4">
    <div class="w-full max-w-md">
      <PixelCard class="space-y-6">
        <div class="text-center space-y-3">
          <PixelLogo class="text-primary mx-auto" :size="48" />
          <h1 class="text-3xl font-bold">Create Account</h1>
          <p class="text-muted-foreground">Start creating and hosting quizzes</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleRegister">
          <PixelInput
            v-model="name"
            type="text"
            label="Name"
            placeholder="Your name"
            required
            :error="!!error"
          />
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
            placeholder="Choose a password"
            required
            :error="!!error"
          />

          <p v-if="error" class="text-destructive text-sm font-medium">{{ error }}</p>

          <PixelButton type="submit" variant="primary" class="w-full">
            Create Account
          </PixelButton>
        </form>

        <div class="pt-4 border-t-2 border-border text-center space-y-3">
          <p class="text-sm text-muted-foreground">
            Already have an account?
            <router-link to="/login" class="text-primary font-semibold hover:underline">Login</router-link>
          </p>
          <router-link to="/" class="text-sm text-muted-foreground hover:text-primary block">
            &larr; Back to Home
          </router-link>
        </div>
      </PixelCard>
    </div>
  </div>
</template>
