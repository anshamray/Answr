<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-white">
    <header class="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <router-link to="/dashboard" class="text-gray-400 hover:text-black">&larr;</router-link>
        <h1 class="text-xl font-bold">Edit Quiz</h1>
      </div>
      <button
        class="bg-black text-white px-5 py-2 rounded-lg font-semibold hover:bg-gray-800 transition"
      >
        Save
      </button>
    </header>

    <main class="max-w-3xl mx-auto px-6 py-10">
      <p class="text-gray-400 text-center py-16">
        Quiz editor for ID: {{ route.params.id }}
      </p>
    </main>
  </div>
</template>
