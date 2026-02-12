<script setup>
import { ref, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';

const router = useRouter();
const game = useGameStore();

const pin = ref('');
const name = ref('');
const error = ref('');
const loading = ref(false);
const step = ref('pin'); // 'pin' → enter PIN, 'name' → enter name + join
const shake = ref(false);

function triggerShake() {
  shake.value = true;
  setTimeout(() => { shake.value = false; }, 500);
}

/**
 * Clean up all socket listeners we registered.
 */
function cleanupSocket() {
  const socket = getSocket();
  if (socket) {
    socket.off('player:joined');
    socket.off('player:error');
  }
}

onUnmounted(() => {
  cleanupSocket();
});

/**
 * Step 1: Validate PIN format, then check with the backend
 * by emitting a temporary player:join with a placeholder name.
 * If the PIN is invalid the server responds with player:error immediately.
 * If valid, we disconnect, move to step 2 and do the real join with the name.
 */
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

  // PIN is valid — session exists. Disconnect and ask for name.
  socket.on('player:joined', () => {
    clearTimeout(timeout);
    loading.value = false;
    cleanupSocket();
    disconnectSocket();
    step.value = 'name';
  });

  // PIN is invalid — session does not exist.
  socket.on('player:error', () => {
    clearTimeout(timeout);
    loading.value = false;
    error.value = 'This PIN does not exist. Did you make it up?';
    triggerShake();
    cleanupSocket();
    disconnectSocket();
  });

  // We send a temporary name for the check. The connection is thrown away
  // after this — the real join happens in step 2 with the actual name.
  const emitJoin = () => {
    socket.emit('player:join', { pin: trimmed, name: '__pin_check__' });
  };

  if (socket.connected) {
    emitJoin();
  } else {
    socket.once('connect', emitJoin);
  }
}

/**
 * Step 2: We know the PIN is valid. Connect again and join for real.
 */
function handleJoin() {
  error.value = '';

  if (!name.value.trim()) {
    error.value = 'We need your name. Who are you?';
    triggerShake();
    return;
  }

  loading.value = true;

  const socket = connectSocket();
  const trimmedPin = pin.value.trim();

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
    game.pin = trimmedPin;
    game.playerName = name.value.trim();
    game.setSession(data);
    router.push('/play/lobby');
  });

  socket.on('player:error', () => {
    clearTimeout(timeout);
    loading.value = false;
    error.value = 'This PIN does not exist. Did you make it up?';
    triggerShake();
    step.value = 'pin';
    cleanupSocket();
  });

  const emitJoin = () => {
    socket.emit('player:join', { pin: trimmedPin, name: name.value.trim() });
  };

  if (socket.connected) {
    emitJoin();
  } else {
    socket.once('connect', emitJoin);
  }
}

function goBackToPin() {
  step.value = 'pin';
  error.value = '';
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-white">
    <h1 class="text-5xl font-bold mb-2 tracking-tight">Answr</h1>
    <p class="text-gray-500 mb-12">Real-time quiz platform</p>

    <div
      class="w-full max-w-sm space-y-6"
      :class="{ 'animate-shake': shake }"
    >
      <!-- Step 1: Enter PIN — verified against the backend before proceeding -->
      <div v-if="step === 'pin'" class="space-y-3">
        <input
          v-model="pin"
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="Enter PIN"
          class="w-full text-center text-2xl tracking-widest border-2 border-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
          :class="{ 'border-red-500': error }"
          @keyup.enter="handlePinSubmit"
        />
        <p v-if="error" class="text-sm text-center font-medium text-red-600">
          {{ error }}
        </p>
        <button
          class="w-full bg-black text-white text-lg font-semibold py-3 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          :disabled="loading"
          @click="handlePinSubmit"
        >
          {{ loading ? 'Checking...' : 'Join Game' }}
        </button>
      </div>

      <!-- Step 2: PIN is valid — enter name and join for real -->
      <div v-else class="space-y-3">
        <p class="text-center text-gray-400 text-sm">
          PIN: <span class="font-mono font-bold text-black">{{ pin }}</span>
          <button class="ml-2 text-gray-400 underline text-xs hover:text-black" @click="goBackToPin">change</button>
        </p>
        <input
          v-model="name"
          type="text"
          maxlength="20"
          placeholder="Your name"
          autofocus
          class="w-full text-center text-xl border-2 border-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
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

      <!-- Divider + Host button (only on PIN step) -->
      <template v-if="step === 'pin'">
        <div class="flex items-center gap-4">
          <hr class="flex-1 border-gray-300" />
          <span class="text-gray-400 text-sm">or</span>
          <hr class="flex-1 border-gray-300" />
        </div>

        <router-link
          to="/login"
          class="block w-full text-center border-2 border-black text-black text-lg font-semibold py-3 rounded-lg hover:bg-black hover:text-white transition"
        >
          Host a Quiz
        </router-link>
      </template>
    </div>
  </div>
</template>

<style scoped>
/*
 * Shake animation — wobbles the form left-right when an error occurs.
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
