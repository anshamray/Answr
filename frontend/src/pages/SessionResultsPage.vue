<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col items-center justify-center">
    <h1 class="text-3xl font-bold mb-8">Results</h1>
    <p class="text-gray-400 mb-4">Session: {{ route.params.id }}</p>

    <p class="text-gray-300 py-12">Leaderboard will appear here</p>

    <router-link
      to="/dashboard"
      class="mt-8 border-2 border-black px-6 py-2 rounded-lg font-semibold hover:bg-black hover:text-white transition"
    >
      Back to Dashboard
    </router-link>
  </div>
</template>
