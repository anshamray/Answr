<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { getSocket } from '../lib/socket.js';

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
  <div class="min-h-screen flex flex-col items-center justify-center bg-white px-4">
    <h1 class="text-4xl font-bold mb-2">{{ game.playerName || 'Player' }}</h1>
    <p class="text-gray-500 mb-8">You're in! Waiting for the host to start...</p>

    <div class="animate-pulse text-6xl mb-8">...</div>

    <p class="text-gray-300 text-sm">PIN: <span class="font-mono font-bold">{{ game.pin }}</span></p>
  </div>
</template>
