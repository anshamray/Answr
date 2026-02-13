<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { getSocket } from '../lib/socket.js';

import PixelLogo from '../components/icons/PixelLogo.vue';
import PixelBadge from '../components/PixelBadge.vue';

const router = useRouter();
const game = useGameStore();

function setup() {
  const socket = getSocket();
  if (!socket) {
    router.push('/');
    return;
  }

  socket.on('game:started', () => {
    game.status = 'playing';
  });

  socket.on('game:question', (data) => {
    game.currentQuestion = data;
    router.push('/play/game');
  });

  socket.on('game:end', () => {
    game.status = 'finished';
    router.push('/play/results');
  });

  socket.on('player:kicked', () => {
    router.push('/');
  });
}

function cleanup() {
  const socket = getSocket();
  if (socket) {
    socket.off('game:started');
    socket.off('game:question');
    socket.off('game:end');
    socket.off('player:kicked');
  }
}

onMounted(setup);
onUnmounted(cleanup);
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/5 to-background px-4">
    <PixelLogo class="text-primary mb-6" :size="48" />
    <h1 class="text-4xl font-bold mb-2 text-foreground">{{ game.playerName || 'Player' }}</h1>
    <p class="text-muted-foreground mb-8">You're in! Waiting for the host to start...</p>

    <div class="flex gap-2 mb-8">
      <div class="w-3 h-3 bg-primary animate-bounce" style="animation-delay: 0s;"></div>
      <div class="w-3 h-3 bg-secondary animate-bounce" style="animation-delay: 0.1s;"></div>
      <div class="w-3 h-3 bg-accent animate-bounce" style="animation-delay: 0.2s;"></div>
    </div>

    <PixelBadge variant="secondary">
      PIN: {{ game.pin }}
    </PixelBadge>
  </div>
</template>
