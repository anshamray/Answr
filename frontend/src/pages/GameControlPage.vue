<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col">
    <header class="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">Game Control</h1>
      <span class="text-gray-400 text-sm">Session: {{ route.params.id }}</span>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center">
      <p class="text-gray-400 text-center py-16">Moderator game control panel</p>

      <div class="flex gap-4">
        <button
          class="border-2 border-black px-6 py-2 rounded-lg font-semibold hover:bg-black hover:text-white transition"
        >
          Next Question
        </button>
        <button
          class="border-2 border-gray-300 text-gray-400 px-6 py-2 rounded-lg font-semibold hover:border-black hover:text-black transition"
        >
          End Game
        </button>
      </div>
    </main>
  </div>
</template>
