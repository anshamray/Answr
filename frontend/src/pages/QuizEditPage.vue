<script setup>
import { useRoute } from 'vue-router';

import PixelButton from '../components/PixelButton.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div class="flex items-center gap-4">
          <router-link to="/dashboard" class="text-muted-foreground hover:text-primary transition">&larr;</router-link>
          <h1 class="text-xl font-bold">Edit Quiz</h1>
        </div>
        <PixelButton variant="primary" size="sm">Save</PixelButton>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="border-[3px] border-border pixel-shadow bg-card p-12 text-center">
        <p class="text-muted-foreground">
          Quiz editor for ID: {{ route.params.id }}
        </p>
      </div>
    </main>
  </div>
</template>
