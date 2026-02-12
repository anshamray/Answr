<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col items-center justify-center">
    <p class="text-gray-400 text-sm mb-2">Session PIN</p>
    <h1 class="text-6xl font-bold tracking-widest mb-8">------</h1>

    <p class="text-gray-500 mb-4">Waiting for players to join...</p>
    <p class="text-gray-300 text-sm">Session ID: {{ route.params.id }}</p>

    <div class="mt-12">
      <button
        class="bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition"
      >
        Start Game
      </button>
    </div>
  </div>
</template>
