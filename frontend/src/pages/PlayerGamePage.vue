<script setup>
import { useGameStore } from '../stores/gameStore.js';

const game = useGameStore();
</script>

<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Question area -->
    <div class="flex-1 flex flex-col items-center justify-center px-6">
      <p class="text-gray-400 text-sm mb-4">Question</p>
      <h1 class="text-2xl font-bold text-center mb-12">
        {{ game.currentQuestion?.text || 'Waiting for question...' }}
      </h1>
    </div>

    <!-- Answer buttons -->
    <div class="grid grid-cols-2 gap-3 p-4">
      <button
        class="border-2 border-black rounded-lg py-6 text-lg font-semibold hover:bg-black hover:text-white transition"
      >
        A
      </button>
      <button
        class="border-2 border-black rounded-lg py-6 text-lg font-semibold hover:bg-black hover:text-white transition"
      >
        B
      </button>
      <button
        class="border-2 border-black rounded-lg py-6 text-lg font-semibold hover:bg-black hover:text-white transition"
      >
        C
      </button>
      <button
        class="border-2 border-black rounded-lg py-6 text-lg font-semibold hover:bg-black hover:text-white transition"
      >
        D
      </button>
    </div>
  </div>
</template>
