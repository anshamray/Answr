<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

const router = useRouter();
const auth = useAuthStore();

function handleLogout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- Header -->
    <header class="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">Answr</h1>
      <div class="flex items-center gap-4">
        <span class="text-gray-500 text-sm">{{ auth.user?.name || auth.user?.email }}</span>
        <button
          class="text-sm text-gray-400 hover:text-black transition"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-3xl mx-auto px-6 py-10">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold">My Quizzes</h2>
        <button
          class="bg-black text-white px-5 py-2 rounded-lg font-semibold hover:bg-gray-800 transition"
        >
          + New Quiz
        </button>
      </div>

      <p class="text-gray-400 text-center py-16">No quizzes yet. Create your first one!</p>
    </main>
  </div>
</template>
