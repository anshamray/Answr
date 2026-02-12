<script setup>
import { useGameStore } from '../stores/gameStore.js';

const game = useGameStore();
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-white">
    <h1 class="text-3xl font-bold mb-2">Game Over!</h1>
    <p class="text-gray-500 mb-8">Final results</p>

    <p class="text-gray-300 py-12">Your rank and score will appear here</p>

    <router-link
      to="/"
      class="mt-8 border-2 border-black px-6 py-2 rounded-lg font-semibold hover:bg-black hover:text-white transition"
    >
      Play Again
    </router-link>
  </div>
</template>
