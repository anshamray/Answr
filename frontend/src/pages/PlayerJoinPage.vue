<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';

const route = useRoute();
const router = useRouter();
const game = useGameStore();

const pin = ref('');
const error = ref('');
const loading = ref(false);
const shake = ref(false);

function triggerShake() {
  shake.value = true;
  setTimeout(() => { shake.value = false; }, 500);
}

function cleanupSocket() {
  const socket = getSocket();
  if (socket) {
    socket.off('player:pin-valid');
    socket.off('player:pin-invalid');
  }
}

onMounted(() => {
  // Pre-fill PIN from query param if provided
  if (route.query.pin) {
    pin.value = route.query.pin;
    // Auto-submit if PIN looks valid
    if (/^\d{6}$/.test(route.query.pin)) {
      handlePinSubmit();
    }
  }
});

onUnmounted(() => {
  cleanupSocket();
});

function handlePinSubmit() {
  error.value = '';
  const trimmed = pin.value.trim();

  if (!trimmed) {
    error.value = 'Enter a PIN first!';
    triggerShake();
    return;
  }

  if (!/^\d{6}$/.test(trimmed)) {
    error.value = 'PIN must be exactly 6 digits.';
    triggerShake();
    return;
  }

  loading.value = true;
  const socket = connectSocket();
  cleanupSocket();

  const timeout = setTimeout(() => {
    loading.value = false;
    error.value = 'Could not reach the server. Is it running?';
    triggerShake();
    cleanupSocket();
    disconnectSocket();
  }, 5000);

  socket.on('player:pin-valid', () => {
    clearTimeout(timeout);
    loading.value = false;
    cleanupSocket();
    disconnectSocket();
    // Store PIN and redirect to profile page
    game.pin = trimmed;
    router.push('/play/profile');
  });

  socket.on('player:pin-invalid', (data) => {
    clearTimeout(timeout);
    loading.value = false;
    error.value = data?.message || 'This PIN does not exist. Did you make it up?';
    triggerShake();
    cleanupSocket();
    disconnectSocket();
  });

  const emitCheck = () => {
    socket.emit('player:check-pin', { pin: trimmed });
  };

  if (socket.connected) {
    emitCheck();
  } else {
    socket.once('connect', emitCheck);
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-4 bg-gradient-to-br from-secondary/10 to-primary/10">
    <div class="w-full max-w-sm" :class="{ 'animate-shake': shake }">
      <PixelCard class="space-y-6">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-secondary/20 border-2 border-secondary mb-4">
            <svg class="text-secondary" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold mb-2">Join Quiz</h2>
          <p class="text-muted-foreground text-sm">Enter the 6-digit PIN from your host</p>
        </div>

        <div class="space-y-2">
          <input
            v-model="pin"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            class="w-full px-6 py-6 text-center text-4xl font-bold tracking-[0.3em] border-[3px] border-black focus:outline-none focus:ring-4 focus:ring-secondary/30 transition-all bg-white"
            :class="{ 'border-destructive': error }"
            autofocus
            @keyup.enter="handlePinSubmit"
            @input="pin = pin.replace(/\D/g, '')"
          />
          <p v-if="error" class="text-destructive text-sm text-center animate-pulse">{{ error }}</p>
        </div>

        <PixelButton
          variant="secondary"
          class="w-full text-lg py-5"
          :disabled="pin.length !== 6 || loading"
          @click="handlePinSubmit"
        >
          {{ loading ? 'Checking...' : 'Continue' }}
        </PixelButton>

        <div class="pt-4 border-t-2 border-border">
          <p class="text-sm text-center text-muted-foreground">
            No account needed — play from any device
          </p>
        </div>
      </PixelCard>

      <p class="mt-6 text-center">
        <router-link to="/" class="text-sm text-muted-foreground hover:text-primary">&larr; Back to Home</router-link>
      </p>
    </div>
  </div>
</template>
