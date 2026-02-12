<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';

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
  // Clean up listeners if we leave the page without joining
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

  // PIN must be exactly 6 digits
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

  // Clean up any previous listeners
  socket.off('player:joined');
  socket.off('player:error');

  // Timeout: if no response in 5 seconds, assume server is unreachable
  const timeout = setTimeout(() => {
    loading.value = false;
    error.value = 'Could not reach the server. Is it running?';
    triggerShake();
    socket.off('player:joined');
    socket.off('player:error');
  }, 5000);

  // Listen for success
  socket.on('player:joined', (data) => {
    clearTimeout(timeout);
    loading.value = false;
    game.pin = pin.value.trim();
    game.playerName = name.value.trim();
    game.setSession(data);
    router.push('/play/lobby');
  });

  // Listen for error (e.g. PIN_INVALID — session does not exist)
  socket.on('player:error', () => {
    clearTimeout(timeout);
    loading.value = false;
    error.value = pinError;
    triggerShake();
    socket.off('player:joined');
    socket.off('player:error');
  });

  // Connect handler: emit join once connected
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
  <div class="min-h-screen flex flex-col items-center justify-center bg-white">
    <h1 class="text-3xl font-bold mb-8">Join Game</h1>

    <div
      class="w-full max-w-sm space-y-4 transition-transform"
      :class="{ 'animate-shake': shake }"
    >
      <input
        v-model="pin"
        type="text"
        inputmode="numeric"
        maxlength="6"
        placeholder="Game PIN"
        class="w-full text-center text-2xl tracking-widest border-2 border-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
        :class="{ 'border-red-500': error }"
        @keyup.enter="handleJoin"
      />
      <input
        v-model="name"
        type="text"
        maxlength="20"
        placeholder="Your name"
        class="w-full text-center border-2 border-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
        @keyup.enter="handleJoin"
      />

      <p v-if="error" class="text-sm text-center font-medium text-red-600">
        {{ error }}
      </p>

      <button
        class="w-full bg-black text-white text-lg font-semibold py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
        :disabled="loading"
        @click="handleJoin"
      >
        {{ loading ? 'Joining...' : 'Join' }}
      </button>
    </div>

    <p class="mt-8">
      <router-link to="/" class="text-gray-400 text-sm hover:text-black">&larr; Back</router-link>
    </p>
  </div>
</template>

<style scoped>
/*
 * Shake animation — wobbles the form left-right when an error occurs.
 * Same effect as macOS wrong-password shake.
 * Triggered by toggling the `shake` ref (adds/removes .animate-shake class).
 */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}
.animate-shake {
  animation: shake 0.4s ease-in-out;
}
</style>
