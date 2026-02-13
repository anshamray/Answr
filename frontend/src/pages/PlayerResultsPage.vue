<script setup>
import { useGameStore } from '../stores/gameStore.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';
import PixelStar from '../components/icons/PixelStar.vue';

const game = useGameStore();
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-background px-4">
    <PixelStar class="text-warning mb-4" :size="64" />
    <h1 class="text-4xl font-bold mb-2 text-foreground">Game Over!</h1>
    <p class="text-muted-foreground mb-8">Final results</p>

    <PixelCard class="w-full max-w-sm text-center space-y-4 mb-8">
      <p class="text-muted-foreground text-sm">Your rank and score will appear here</p>
    </PixelCard>

    <router-link to="/">
      <PixelButton variant="primary" size="lg">Play Again</PixelButton>
    </router-link>
  </div>
</template>
