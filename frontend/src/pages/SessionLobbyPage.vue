<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const pin = ref('------');
const quizTitle = ref('');
const quizId = ref(null);
const questionCount = ref(0);
const status = ref('loading');   // 'loading' | 'lobby' | 'error'
const error = ref('');
const players = ref([]);
const starting = ref(false);

const sessionId = route.params.id;

// Determine auth method — JWT or guestToken
const guestToken = sessionStorage.getItem('guestToken');
const isGuest = !auth.isAuthenticated && !!guestToken;

const playerCount = computed(() => players.value.length);

/**
 * Fetch session details from the REST API
 */
async function fetchSession() {
  try {
    let url = `/api/sessions/${sessionId}`;
    const headers = {};

    if (auth.isAuthenticated) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (guestToken) {
      url += `?guestToken=${encodeURIComponent(guestToken)}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Session not found');
    }

    const data = await res.json();
    const session = data.session;

    pin.value = session.pin;
    quizTitle.value = session.quizId?.title || 'Quiz';
    quizId.value = typeof session.quizId === 'object' ? session.quizId._id : session.quizId;
    questionCount.value = session.quizId?.questions?.length || 0;
    status.value = 'lobby';

    // Now connect WebSocket as moderator
    connectAsModerator(session.pin);
  } catch (err) {
    error.value = err.message;
    status.value = 'error';
  }
}

/**
 * Connect via WebSocket and register as moderator for this session
 */
function connectAsModerator(sessionPin) {
  const socket = connectSocket();

  // Clean up any old listeners
  cleanup();

  socket.on('moderator:joined', (data) => {
    // Successfully joined as moderator
    console.log('Joined as moderator:', data);
  });

  socket.on('moderator:error', (data) => {
    console.error('Moderator error:', data);
    error.value = data.message || 'Moderator error';
  });

  socket.on('lobby:update', (data) => {
    players.value = data.players || [];
  });

  // Join as moderator once connected
  const doJoin = () => {
    socket.emit('moderator:join', {
      pin: sessionPin,
      quizId: quizId.value
    });
  };

  if (socket.connected) {
    doJoin();
  } else {
    socket.once('connect', doJoin);
  }
}

function cleanup() {
  const socket = getSocket();
  if (socket) {
    socket.off('moderator:joined');
    socket.off('moderator:error');
    socket.off('lobby:update');
  }
}

function startGame() {
  starting.value = true;
  // Navigate to GameControlPage — it will emit moderator:start with the
  // first question so players receive game:started + game:question together.
  router.push(`/session/${sessionId}/control`);
}

function endSession() {
  const socket = getSocket();
  if (socket) {
    socket.emit('moderator:end');
  }
  cleanup();
  disconnectSocket();
  if (auth.isAuthenticated) {
    router.push('/dashboard');
  } else {
    router.push('/');
  }
}

function copyPin() {
  navigator.clipboard?.writeText(pin.value);
}

onMounted(fetchSession);

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col items-center justify-center px-4">
    <!-- Loading -->
    <template v-if="status === 'loading'">
      <p class="text-gray-400 text-lg">Loading session...</p>
    </template>

    <!-- Error -->
    <template v-else-if="status === 'error'">
      <p class="text-red-500 text-lg mb-4">{{ error }}</p>
      <router-link to="/" class="text-indigo-600 hover:underline">Back to Home</router-link>
    </template>

    <!-- Lobby -->
    <template v-else>
      <p class="text-gray-400 text-sm mb-1">{{ quizTitle }}</p>
      <p class="text-gray-400 text-xs mb-4">Share this PIN with players</p>

      <!-- PIN display -->
      <button
        class="group relative mb-2"
        title="Click to copy"
        @click="copyPin"
      >
        <h1 class="text-7xl font-bold tracking-[0.3em] font-mono tabular-nums">{{ pin }}</h1>
        <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition">
          click to copy
        </span>
      </button>

      <p class="text-gray-300 text-xs mt-6 mb-8">{{ questionCount }} questions</p>

      <!-- Player list -->
      <div class="w-full max-w-md mb-8">
        <p class="text-center text-gray-500 text-sm mb-3">
          <span class="font-semibold text-black">{{ playerCount }}</span>
          player{{ playerCount !== 1 ? 's' : '' }} joined
        </p>

        <div v-if="playerCount === 0" class="text-center text-gray-300 py-6">
          Waiting for players to join...
        </div>

        <div v-else class="flex flex-wrap justify-center gap-2">
          <span
            v-for="player in players"
            :key="player.id"
            class="bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full"
          >
            {{ player.nickname || player.name || 'Player' }}
          </span>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex gap-3">
        <button
          class="bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition disabled:opacity-50"
          :disabled="starting"
          @click="startGame"
        >
          {{ starting ? 'Starting...' : 'Start Game' }}
        </button>
        <button
          class="border-2 border-gray-300 text-gray-500 px-6 py-3 rounded-lg text-lg hover:border-red-400 hover:text-red-500 transition"
          @click="endSession"
        >
          Cancel
        </button>
      </div>

      <p v-if="isGuest" class="text-gray-300 text-xs mt-6">Guest session — no login required</p>
    </template>
  </div>
</template>
