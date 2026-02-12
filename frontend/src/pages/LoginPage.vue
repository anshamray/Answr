<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

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
  <div class="min-h-screen flex flex-col items-center justify-center bg-white">
    <div class="w-full max-w-sm">
      <h1 class="text-3xl font-bold mb-8 text-center">Login</h1>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <input
          v-model="email"
          type="email"
          placeholder="Email"
          required
          class="w-full border-2 border-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
        />
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          required
          class="w-full border-2 border-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
        />

        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

        <button
          type="submit"
          class="w-full bg-black text-white text-lg font-semibold py-3 rounded-lg hover:bg-gray-800 transition"
        >
          Login
        </button>
      </form>

      <p class="mt-6 text-center text-gray-500">
        No account?
        <router-link to="/register" class="text-black underline">Register</router-link>
      </p>

      <p class="mt-4 text-center">
        <router-link to="/" class="text-gray-400 text-sm hover:text-black">&larr; Back</router-link>
      </p>
    </div>
  </div>
</template>
