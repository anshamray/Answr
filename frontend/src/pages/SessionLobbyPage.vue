<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const pin = ref('------');
const quizTitle = ref('');
const quizId = ref(null);
const questionCount = ref(0);
const status = ref('loading');
const error = ref('');
const players = ref([]);
const starting = ref(false);

const sessionId = route.params.id;

const guestToken = sessionStorage.getItem('guestToken');
const isGuest = !auth.isAuthenticated && !!guestToken;

const playerCount = computed(() => players.value.length);

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
    const session = data.data.session;

    pin.value = session.pin;
    quizTitle.value = session.quizId?.title || 'Quiz';
    quizId.value = typeof session.quizId === 'object' ? session.quizId._id : session.quizId;
    questionCount.value = session.quizId?.questions?.length || 0;
    status.value = 'lobby';

    connectAsModerator(session.pin);
  } catch (err) {
    error.value = err.message;
    status.value = 'error';
  }
}

function connectAsModerator(sessionPin) {
  const socket = connectSocket();
  cleanup();

  socket.on('moderator:joined', (data) => {
    console.log('Joined as moderator:', data);
  });

  socket.on('moderator:error', (data) => {
    console.error('Moderator error:', data);
    error.value = data.message || 'Moderator error';
  });

  socket.on('lobby:update', (data) => {
    players.value = data.players || [];
  });

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
  <div class="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-background flex flex-col items-center justify-center px-4">
    <!-- Loading -->
    <template v-if="status === 'loading'">
      <p class="text-muted-foreground text-lg">Loading session...</p>
    </template>

    <!-- Error -->
    <template v-else-if="status === 'error'">
      <p class="text-destructive text-lg mb-4">{{ error }}</p>
      <router-link to="/" class="text-primary hover:underline">Back to Home</router-link>
    </template>

    <!-- Lobby -->
    <template v-else>
      <PixelLogo class="text-primary mb-4" :size="48" />
      <p class="text-muted-foreground text-sm mb-1">{{ quizTitle }}</p>
      <p class="text-muted-foreground/60 text-xs mb-6">Share this PIN with players</p>

      <!-- PIN display -->
      <button
        class="group relative mb-2"
        title="Click to copy"
        @click="copyPin"
      >
        <h1 class="text-7xl font-bold tracking-[0.3em] font-mono tabular-nums text-primary">{{ pin }}</h1>
        <span class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition">
          click to copy
        </span>
      </button>

      <p class="text-muted-foreground/60 text-xs mt-6 mb-8">{{ questionCount }} questions</p>

      <!-- Player list -->
      <div class="w-full max-w-md mb-8">
        <p class="text-center text-muted-foreground text-sm mb-3">
          <span class="font-semibold text-foreground">{{ playerCount }}</span>
          player{{ playerCount !== 1 ? 's' : '' }} joined
        </p>

        <div v-if="playerCount === 0" class="text-center text-muted-foreground/50 py-6">
          Waiting for players to join...
        </div>

        <div v-else class="flex flex-wrap justify-center gap-2">
          <PixelBadge
            v-for="player in players"
            :key="player.id"
            variant="secondary"
          >
            {{ player.nickname || player.name || 'Player' }}
          </PixelBadge>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex gap-3">
        <PixelButton
          variant="primary"
          size="lg"
          :disabled="starting"
          @click="startGame"
        >
          {{ starting ? 'Starting...' : 'Start Game' }}
        </PixelButton>
        <PixelButton
          variant="outline"
          size="lg"
          @click="endSession"
        >
          Cancel
        </PixelButton>
      </div>

      <p v-if="isGuest" class="text-muted-foreground/50 text-xs mt-6">Guest session — no login required</p>
    </template>
  </div>
</template>
