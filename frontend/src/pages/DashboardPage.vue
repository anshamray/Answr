<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

import PixelButton from '../components/PixelButton.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';

const router = useRouter();
const auth = useAuthStore();

function handleLogout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
            <PixelLogo class="text-primary" :size="28" />
            <span class="text-xl font-bold text-primary pixel-font">Answr</span>
          </router-link>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-muted-foreground text-sm">{{ auth.user?.name || auth.user?.email }}</span>
          <button
            class="text-sm text-muted-foreground hover:text-destructive transition"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-3xl font-bold">My Quizzes</h2>
        <PixelButton variant="primary">+ New Quiz</PixelButton>
      </div>

      <div class="border-[3px] border-border pixel-shadow bg-card p-12 text-center">
        <p class="text-muted-foreground text-lg">No quizzes yet. Create your first one!</p>
      </div>
    </main>
  </div>
</template>
