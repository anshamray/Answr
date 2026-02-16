<script setup>
import { ref, onMounted, onUnmounted, computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';
import { apiUrl } from '../lib/api.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import QRCode from '../components/QRCode.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';
import PixelCheck from '../components/icons/PixelCheck.vue';

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
const copied = ref(false);

// Quick Settings
const showLeaderboard = ref(true);
const musicEnabled = ref(true);
const allowLateJoins = ref(false);

const sessionId = route.params.id;

const guestToken = sessionStorage.getItem('guestToken');
const isGuest = !auth.isAuthenticated && !!guestToken;

const playerCount = computed(() => players.value.length);

// Generate the join URL for QR code
const joinUrl = computed(() => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/play?pin=${pin.value}`;
});

async function fetchSession() {
  try {
    let url = apiUrl(`/api/sessions/${sessionId}`);
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
  // Save settings to sessionStorage for use in GameControlPage
  sessionStorage.setItem('gameSettings', JSON.stringify({
    showLeaderboard: showLeaderboard.value,
    musicEnabled: musicEnabled.value,
    allowLateJoins: allowLateJoins.value
  }));
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
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

onMounted(fetchSession);

onUnmounted(() => {
  cleanup();
});

const playerAvatars = ['🎮', '🔥', '⭐', '💪', '🎯', '🚀', '⚡', '💎', '👑', '🎉', '🎸', '🌟'];
function getAvatar(index) {
  return playerAvatars[index % playerAvatars.length];
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
    <!-- Loading -->
    <div v-if="status === 'loading'" class="h-full flex items-center justify-center">
      <p class="text-muted-foreground text-lg">Loading session...</p>
    </div>

    <!-- Error -->
    <div v-else-if="status === 'error'" class="h-full flex flex-col items-center justify-center">
      <p class="text-destructive text-lg mb-4">{{ error }}</p>
      <router-link to="/" class="text-primary hover:underline">Back to Home</router-link>
    </div>

    <!-- Lobby -->
    <div v-else class="p-4 lg:p-6">
      <div class="max-w-7xl mx-auto">
        <!-- PIN Display -->
        <div class="mb-8">
          <PixelCard variant="primary" class="text-center space-y-6">
            <div class="flex items-center justify-center gap-4">
              <h1 class="text-2xl lg:text-4xl font-bold">{{ quizTitle }}</h1>
            </div>

            <div class="grid md:grid-cols-[1fr,auto] gap-8 items-center py-8 bg-white border-[3px] border-black">
              <div class="text-center">
                <div class="text-xl font-medium text-muted-foreground mb-4">Join at answr.ing</div>
                <div class="text-6xl lg:text-[7rem] font-bold text-primary leading-none mb-6 pixel-font" style="letter-spacing: 0.2em;">
                  {{ pin }}
                </div>
                <button
                  class="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
                  @click="copyPin"
                >
                  <svg v-if="!copied" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <PixelCheck v-else :size="20" class="text-primary" />
                  {{ copied ? 'Copied!' : 'Copy PIN' }}
                </button>
              </div>

              <!-- QR Code -->
              <div class="flex flex-col items-center gap-3 px-8 border-l-2 border-border">
                <div class="text-sm font-medium text-muted-foreground">Scan to Join</div>
                <QRCode :data="joinUrl" :size="192" />
              </div>
            </div>

            <div class="flex items-center justify-center gap-8 text-xl lg:text-2xl">
              <div class="flex items-center gap-3">
                <PixelUsers class="text-primary" :size="32" />
                <span class="font-bold">{{ playerCount }}</span>
                <span class="text-muted-foreground">Players</span>
              </div>
              <div class="w-px h-12 bg-border"></div>
              <div class="flex items-center gap-3">
                <span class="font-bold text-secondary">{{ questionCount }}</span>
                <span class="text-muted-foreground">Questions</span>
              </div>
            </div>
          </PixelCard>
        </div>

        <div class="grid lg:grid-cols-3 gap-8">
          <!-- Players List -->
          <div class="lg:col-span-2">
            <PixelCard class="space-y-4">
              <h2 class="text-2xl font-bold flex items-center gap-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Players in Lobby
              </h2>

              <div v-if="playerCount === 0" class="text-center text-muted-foreground/50 py-12">
                Waiting for players to join...
              </div>

              <div v-else class="grid sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                <div
                  v-for="(player, index) in players"
                  :key="player.id"
                  class="flex items-center gap-3 p-4 bg-white border-2 border-border hover:border-primary transition-all"
                >
                  <span class="text-3xl">{{ getAvatar(index) }}</span>
                  <div class="flex-1">
                    <div class="font-bold">{{ player.nickname || player.name || 'Player' }}</div>
                    <div class="text-xs text-muted-foreground">Just joined</div>
                  </div>
                  <PixelCheck class="text-success" :size="20" />
                </div>
              </div>
            </PixelCard>
          </div>

          <!-- Controls -->
          <div class="space-y-4">
            <PixelButton
              variant="primary"
              class="w-full text-xl lg:text-2xl py-6 lg:py-8"
              :disabled="starting"
              @click="startGame"
            >
              <svg class="inline mr-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {{ starting ? 'Starting...' : 'Start Game' }}
            </PixelButton>

            <PixelCard class="space-y-3">
              <h3 class="font-bold">Quick Settings</h3>
              <label class="flex items-center gap-3 cursor-pointer select-none">
                <input
                  v-model="showLeaderboard"
                  type="checkbox"
                  class="w-5 h-5 accent-primary"
                />
                <span class="text-sm">Show leaderboard</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer select-none">
                <input
                  v-model="musicEnabled"
                  type="checkbox"
                  class="w-5 h-5 accent-primary"
                />
                <span class="text-sm">Music &amp; sounds</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer select-none">
                <input
                  v-model="allowLateJoins"
                  type="checkbox"
                  class="w-5 h-5 accent-primary"
                />
                <span class="text-sm">Allow late joins</span>
              </label>
            </PixelCard>

            <button
              class="w-full text-sm text-destructive hover:underline"
              @click="endSession"
            >
              Cancel Session
            </button>
          </div>
        </div>

        <p v-if="isGuest" class="text-muted-foreground/50 text-xs mt-6 text-center">Guest session — no login required</p>
      </div>
    </div>
  </div>
</template>
