<script setup>
import { useGameStore } from '../stores/gameStore.js';

const game = useGameStore();
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-white">
    <h1 class="text-4xl font-bold mb-2">{{ game.playerName }}</h1>
    <p class="text-gray-500 mb-8">You're in! Waiting for the host to start...</p>

    <div class="animate-pulse text-6xl mb-8">...</div>

    <p class="text-gray-300 text-sm">PIN: {{ game.pin }}</p>
  </div>
</template>
