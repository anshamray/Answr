<script setup>
import { useRoute } from 'vue-router';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelStar from '../components/icons/PixelStar.vue';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col items-center justify-center px-4">
    <PixelStar class="text-warning mb-4" :size="64" />
    <h1 class="text-4xl font-bold mb-2 text-foreground">Results</h1>
    <p class="text-muted-foreground mb-8">Session: {{ route.params.id }}</p>

    <PixelCard class="w-full max-w-md text-center space-y-4 mb-8">
      <p class="text-muted-foreground">Leaderboard will appear here</p>
    </PixelCard>

    <router-link to="/dashboard">
      <PixelButton variant="primary" size="lg">Back to Dashboard</PixelButton>
    </router-link>
  </div>
</template>
