<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';

const router = useRouter();
const game = useGameStore();

const nickname = ref(game.playerName || '');
const selectedEmoji = ref(game.playerEmoji || '');
const error = ref('');
const loading = ref(false);
const shake = ref(false);

const emojiOptions = [
  '👑', '🔥', '⭐', '💪', '🎯', '🚀', '⚡', '💎',
  '🎨', '🎭', '🎪', '🎸', '🎮', '🎲', '🏆', '🎵',
  '🌟', '✨', '💫', '🌈', '🦄', '🐉', '🦋', '🌸',
  '🍕', '🍔', '🍣', '🍩', '🍿', '🧁', '🍦', '🌮',
  '⚽', '🏀', '🎾', '⚾', '🏐', '🎱', '🏓', '🎳',
  '🤖', '👾', '🛸', '🪐', '🌙', '☀️', '🌊', '🏔️'
];

function triggerShake() {
  shake.value = true;
  setTimeout(() => { shake.value = false; }, 500);
}

function cleanupSocket() {
  const socket = getSocket();
  if (socket) {
    socket.off('player:joined');
    socket.off('player:error');
  }
}

onMounted(() => {
  // If no PIN is stored, redirect back to home
  if (!game.pin) {
    router.push('/');
  }
});

onUnmounted(() => {
  cleanupSocket();
});

function handleJoin() {
  error.value = '';

  if (nickname.value.trim().length < 2) {
    error.value = 'Name must be at least 2 characters';
    triggerShake();
    return;
  }

  if (!selectedEmoji.value) {
    error.value = 'Please select an emoji';
    triggerShake();
    return;
  }

  loading.value = true;
  const socket = connectSocket();
  cleanupSocket();

  const timeout = setTimeout(() => {
    loading.value = false;
    error.value = 'Could not reach the server. Try again.';
    triggerShake();
    cleanupSocket();
  }, 5000);

  socket.on('player:joined', (data) => {
    clearTimeout(timeout);
    loading.value = false;
    game.playerName = nickname.value.trim();
    game.playerEmoji = selectedEmoji.value;
    game.setSession(data);
    router.push('/play/lobby');
  });

  socket.on('player:error', (data) => {
    clearTimeout(timeout);
    loading.value = false;
    error.value = data?.message || 'Failed to join. Please try again.';
    triggerShake();
    cleanupSocket();
  });

  const emitJoin = () => {
    socket.emit('player:join', {
      pin: game.pin,
      name: nickname.value.trim(),
      avatar: selectedEmoji.value
    });
  };

  if (socket.connected) {
    emitJoin();
  } else {
    socket.once('connect', emitJoin);
  }
}

function goBack() {
  game.pin = null;
  router.push('/');
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-4 bg-gradient-to-br from-primary/10 to-accent/10">
    <div class="w-full max-w-lg" :class="{ 'animate-shake': shake }">
      <PixelCard class="space-y-6">
        <div class="text-center">
          <!-- PIN display -->
          <p class="text-sm text-muted-foreground mb-4">
            Joining game with PIN: <span class="font-mono font-bold text-foreground">{{ game.pin }}</span>
          </p>
          <div class="inline-flex items-center justify-center w-20 h-20 bg-primary/20 border-2 border-primary mb-4">
            <span v-if="selectedEmoji" class="text-5xl">{{ selectedEmoji }}</span>
            <svg v-else class="text-primary" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold mb-2">Create Your Profile</h2>
          <p class="text-muted-foreground">Choose how you'll appear in the game</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">Your Nickname</label>
          <input
            v-model="nickname"
            type="text"
            maxlength="20"
            placeholder="Enter your name..."
            class="w-full px-6 py-4 text-center text-2xl font-medium border-[3px] border-black focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all bg-white"
            autofocus
          />
          <p class="text-xs text-muted-foreground text-center">
            {{ nickname.length }}/20 characters
          </p>
        </div>

        <div class="space-y-3">
          <label class="block text-sm font-medium text-foreground">Choose Your Emoji</label>
          <div class="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 bg-muted border-2 border-border">
            <button
              v-for="emoji in emojiOptions"
              :key="emoji"
              class="text-3xl p-2 transition-all hover:scale-110"
              :class="selectedEmoji === emoji
                ? 'bg-primary border-2 border-black pixel-shadow scale-110'
                : 'hover:bg-white border-2 border-transparent'"
              @click="selectedEmoji = emoji"
            >
              {{ emoji }}
            </button>
          </div>
          <p v-if="!selectedEmoji" class="text-xs text-muted-foreground text-center">
            Select an emoji to represent you
          </p>
        </div>

        <!-- Preview -->
        <PixelCard v-if="selectedEmoji && nickname.trim()" variant="primary" class="text-center">
          <div class="text-sm text-muted-foreground mb-2">Preview</div>
          <div class="flex items-center justify-center gap-3">
            <span class="text-5xl">{{ selectedEmoji }}</span>
            <span class="text-2xl font-bold">{{ nickname }}</span>
          </div>
        </PixelCard>

        <!-- Error message -->
        <p v-if="error" class="text-sm text-center font-medium text-destructive">
          {{ error }}
        </p>

        <PixelButton
          variant="primary"
          class="w-full text-lg py-5"
          :disabled="nickname.trim().length < 2 || !selectedEmoji || loading"
          @click="handleJoin"
        >
          <svg v-if="!loading" class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {{ loading ? 'Joining...' : 'Join Game' }}
        </PixelButton>

        <button
          class="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
          :disabled="loading"
          @click="goBack"
        >
          &larr; Change PIN
        </button>
      </PixelCard>
    </div>
  </div>
</template>
