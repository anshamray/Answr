<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelInput from '../components/PixelInput.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';

const route = useRoute();
const router = useRouter();
const game = useGameStore();

const pin = ref('');
const name = ref('');
const error = ref('');
const loading = ref(false);
const shake = ref(false);

const pinError = 'This PIN does not exist. Did you make it up?';

onMounted(() => {
  if (route.query.pin) {
    pin.value = route.query.pin;
  }
});

onUnmounted(() => {
  const socket = getSocket();
  if (socket) {
    socket.off('player:joined');
    socket.off('player:error');
  }
});

function triggerShake() {
  shake.value = true;
  setTimeout(() => { shake.value = false; }, 500);
}

function handleJoin() {
  error.value = '';

  const trimmedPin = pin.value.trim();

  if (!trimmedPin) {
    error.value = 'Enter a PIN first!';
    triggerShake();
    return;
  }

  if (!/^\d{6}$/.test(trimmedPin)) {
    error.value = 'PIN must be exactly 6 digits.';
    triggerShake();
    return;
  }

  if (!name.value.trim()) {
    error.value = 'We need your name. Who are you?';
    triggerShake();
    return;
  }

  loading.value = true;

  const socket = connectSocket();

  socket.off('player:joined');
  socket.off('player:error');

  const timeout = setTimeout(() => {
    loading.value = false;
    error.value = 'Could not reach the server. Is it running?';
    triggerShake();
    socket.off('player:joined');
    socket.off('player:error');
  }, 5000);

  socket.on('player:joined', (data) => {
    clearTimeout(timeout);
    loading.value = false;
    game.pin = pin.value.trim();
    game.playerName = name.value.trim();
    game.setSession(data);
    router.push('/play/lobby');
  });

  socket.on('player:error', () => {
    clearTimeout(timeout);
    loading.value = false;
    error.value = pinError;
    triggerShake();
    socket.off('player:joined');
    socket.off('player:error');
  });

  if (socket.connected) {
    socket.emit('player:join', { pin: trimmedPin, name: name.value.trim() });
  } else {
    socket.once('connect', () => {
      socket.emit('player:join', { pin: trimmedPin, name: name.value.trim() });
    });
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-secondary/10 via-primary/5 to-background px-4">
    <div class="w-full max-w-md">
      <PixelCard class="space-y-6">
        <div class="text-center space-y-3">
          <PixelLogo class="text-primary mx-auto" :size="48" />
          <h2 class="text-3xl font-bold">Join a Quiz</h2>
          <p class="text-muted-foreground">Enter the 6-digit PIN from your host</p>
        </div>

        <div
          class="space-y-4"
          :class="{ 'animate-shake': shake }"
        >
          <PixelInput
            v-model="pin"
            inputmode="numeric"
            maxlength="6"
            placeholder="123456"
            label="Game PIN"
            class="text-center text-2xl font-bold tracking-wider"
            :error="!!error"
            @keyup.enter="handleJoin"
          />

          <PixelInput
            v-model="name"
            maxlength="20"
            placeholder="Enter your name"
            label="Your Nickname"
            :error="!!error"
            @keyup.enter="handleJoin"
          />

          <p v-if="error" class="text-sm text-center font-medium text-destructive">
            {{ error }}
          </p>

          <PixelButton
            variant="secondary"
            class="w-full"
            :disabled="loading"
            @click="handleJoin"
          >
            {{ loading ? 'Joining...' : 'Join Game' }}
          </PixelButton>
        </div>

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
