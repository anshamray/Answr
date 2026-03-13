<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';
import { apiUrl } from '../lib/api.js';
import { TIMING, STORAGE_KEYS, AVATARS } from '../constants/index.js';
import { useGameSettings } from '../composables/useGameSettings.js';
import { isExternalVideoUrl, getExternalVideoEmbedUrl } from '../lib/mediaService.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import QRCode from '../components/QRCode.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';
import PixelCheck from '../components/icons/PixelCheck.vue';

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const pin = ref('------');
const quizTitle = ref('');
const quizId = ref(null);
const questionCount = ref(0);
const quizQuestions = ref([]);
const status = ref('loading');
const error = ref('');
const players = ref([]);
const starting = ref(false);
const copied = ref(false);
const sessionMode = ref('competitive');

// Quick Settings (shared with GameControlPage)
const { gameSettings, loadGameSettings, saveGameSettings } = useGameSettings();

const showLeaderboard = computed({
  get: () => gameSettings.value.showLeaderboard,
  set: (value) => {
    gameSettings.value.showLeaderboard = value;
  }
});

const musicEnabled = computed({
  get: () => gameSettings.value.musicEnabled,
  set: (value) => {
    gameSettings.value.musicEnabled = value;
  }
});

const allowLateJoins = computed({
  get: () => gameSettings.value.allowLateJoins,
  set: (value) => {
    gameSettings.value.allowLateJoins = value;
  }
});

const sessionId = route.params.id;

const guestToken = sessionStorage.getItem(STORAGE_KEYS.GUEST_TOKEN);
const isGuest = !auth.isAuthenticated && !!guestToken;

const playerCount = computed(() => players.value.length);
const isCollectOpinions = computed(() => sessionMode.value === 'collect-opinions');
const revealMediaQuestions = computed(() =>
  (quizQuestions.value || []).filter(
    (q) => typeof q?.revealMediaUrl === 'string' && q.revealMediaUrl.trim() !== ''
  )
);
const hasRevealMediaQuestions = computed(() => revealMediaQuestions.value.length > 0);
const expandedRevealQuestionId = ref(null);

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
    quizQuestions.value = session.quizId?.questions || [];
    questionCount.value = quizQuestions.value.length || 0;
    sessionMode.value = session.mode || 'competitive';
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

  socket.on('moderator:joined', () => {
    // Successfully joined as moderator
  });

  socket.on('moderator:error', (data) => {
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
  // Persist settings for use in GameControlPage
  saveGameSettings();
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
  setTimeout(() => { copied.value = false; }, TIMING.COPY_FEEDBACK_DURATION);
}

onMounted(() => {
  loadGameSettings();
  fetchSession();
});

onUnmounted(() => {
  cleanup();
});

function getAvatar(index) {
  return AVATARS.LOBBY_AVATARS[index % AVATARS.LOBBY_AVATARS.length];
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
    <!-- Loading -->
    <div v-if="status === 'loading'" class="h-full flex items-center justify-center">
      <p class="text-muted-foreground text-lg">{{ t('sessionLobby.loadingSession') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="status === 'error'" class="h-full flex flex-col items-center justify-center">
      <p class="text-destructive text-lg mb-4">{{ error }}</p>
      <router-link to="/" class="text-primary hover:underline">{{ t('common.backToHome') }}</router-link>
    </div>

    <!-- Lobby -->
    <div v-else class="p-3 lg:p-4">
      <div class="max-w-7xl mx-auto">
        <!-- PIN Display -->
        <div class="mb-4">
          <PixelCard variant="primary" class="text-center space-y-3">
            <div class="flex items-center justify-center gap-4">
              <h1 class="text-xl lg:text-2xl font-bold">{{ quizTitle }}</h1>
            </div>

            <div class="grid md:grid-cols-[1fr,auto] gap-4 items-center py-4 bg-white border-[3px] border-black">
              <div class="text-center">
                <div class="text-base font-medium text-muted-foreground mb-2">{{ t('sessionLobby.joinAt') }}</div>
                <div
                  class="text-5xl lg:text-6xl font-bold text-primary leading-none mb-3 pixel-font cursor-pointer select-none"
                  style="letter-spacing: 0.2em;"
                  :title="copied ? t('sessionLobby.copied') : t('sessionLobby.copyPin')"
                  :aria-label="copied ? t('sessionLobby.copied') : t('sessionLobby.copyPin')"
                  @click="copyPin"
                >
                  {{ pin }}
                </div>
              </div>

              <!-- QR Code -->
              <div class="flex flex-col items-center gap-2 px-6 border-l-2 border-border">
                <div class="text-xs font-medium text-muted-foreground">{{ t('sessionLobby.scanToJoin') }}</div>
                <QRCode :data="joinUrl" :size="220" />
              </div>
            </div>

            <div class="flex items-center justify-center gap-6 text-base lg:text-lg">
              <template v-if="isCollectOpinions">
                <div class="flex items-center gap-2">
                  <PixelUsers class="text-primary" :size="24" />
                  <span class="font-bold">{{ playerCount }}</span>
                  <span class="text-muted-foreground">
                    participants ready to share opinions
                  </span>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-2">
                  <PixelUsers class="text-primary" :size="24" />
                  <span class="font-bold">{{ playerCount }}</span>
                  <span class="text-muted-foreground">{{ t('sessionLobby.players') }}</span>
                </div>
                <div class="w-px h-8 bg-border"></div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-secondary">{{ questionCount }}</span>
                  <span class="text-muted-foreground">{{ t('libraryDetail.questions') }}</span>
                </div>
              </template>
            </div>
          </PixelCard>
        </div>

        <div v-if="hasRevealMediaQuestions" class="mb-4">
          <PixelCard class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 flex items-center justify-center border-[2px] border-black bg-primary text-primary-foreground text-[10px] font-bold pixel-font">
                  ▶
                </div>
                <div class="flex flex-col">
                  <span class="text-xs font-medium text-muted-foreground">
                    {{ t('gameControl.revealMedia') }}
                  </span>
                  <span class="text-[11px] text-muted-foreground/80">
                    {{ t('sessionLobby.revealMediaHint') }}
                  </span>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div
                v-for="(q, index) in revealMediaQuestions"
                :key="q._id || index"
                class="border border-border bg-white px-3 py-2 text-xs cursor-pointer hover:bg-muted/40"
                @click="expandedRevealQuestionId === (q._id || index) ? expandedRevealQuestionId = null : expandedRevealQuestionId = (q._id || index)"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium truncate">
                      {{ index + 1 }}. {{ q.text || t('sessionLobby.untitledQuestion') }}
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="flex-shrink-0 transition-transform"
                    :class="{ 'rotate-180': expandedRevealQuestionId === (q._id || index) }"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                <div v-if="expandedRevealQuestionId === (q._id || index)" class="mt-2">
                  <div
                    v-if="isExternalVideoUrl(q.revealMediaUrl)"
                    class="w-full max-w-2xl aspect-video border-[3px] border-black bg-black overflow-hidden mx-auto"
                  >
                    <iframe
                      :src="getExternalVideoEmbedUrl(q.revealMediaUrl)"
                      class="w-full h-full"
                      frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    ></iframe>
                  </div>
                  <div
                    v-else
                    class="mt-2 flex justify-center w-full"
                  >
                    <img
                      :src="q.revealMediaUrl"
                      :alt="q.text || `Reveal media ${index + 1}`"
                      class="border-[3px] border-black max-h-48 max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </PixelCard>
        </div>

        <div class="grid lg:grid-cols-3 gap-4">
          <!-- Players List -->
          <div class="lg:col-span-2">
            <PixelCard class="space-y-3">
              <h2 class="text-lg font-bold flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {{ t('sessionLobby.playersInLobby') }}
              </h2>

              <div v-if="playerCount === 0" class="text-center text-muted-foreground/50 py-6">
                {{ t('sessionLobby.waitingForPlayers') }}
              </div>

              <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
                <div
                  v-for="(player, index) in players"
                  :key="player.id"
                  class="flex items-center gap-2 p-2 bg-white border-2 border-border hover:border-primary transition-all"
                >
                  <span class="text-2xl">{{ player.avatar || getAvatar(index) }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-sm truncate">{{ player.nickname || player.name || 'Player' }}</div>
                  </div>
                  <PixelCheck class="text-success shrink-0" :size="16" />
                </div>
              </div>
            </PixelCard>
          </div>

          <!-- Controls -->
          <div class="space-y-3">
            <PixelButton
              variant="primary"
              class="w-full text-lg lg:text-xl py-4 lg:py-5"
              :disabled="starting"
              @click="startGame"
            >
              <svg class="inline mr-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              {{ starting ? t('libraryDetail.starting') : t('sessionLobby.startGame') }}
            </PixelButton>

            <PixelCard class="space-y-2">
              <h3 class="font-bold text-sm">{{ t('sessionLobby.quickSettings') }}</h3>
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  v-model="showLeaderboard"
                  type="checkbox"
                  class="w-4 h-4 accent-primary"
                />
                <span class="text-sm">{{ t('sessionLobby.showLeaderboard') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  v-model="musicEnabled"
                  type="checkbox"
                  class="w-4 h-4 accent-primary"
                />
                <span class="text-sm">{{ t('sessionLobby.musicAndSounds') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  v-model="allowLateJoins"
                  type="checkbox"
                  class="w-4 h-4 accent-primary"
                />
                <span class="text-sm">{{ t('sessionLobby.allowLateJoins') }}</span>
              </label>
            </PixelCard>

            <button
              class="w-full text-xs text-destructive hover:underline"
              @click="endSession"
            >
              {{ t('sessionLobby.cancelSession') }}
            </button>
          </div>
        </div>

        <p v-if="isGuest" class="text-muted-foreground/50 text-xs mt-3 text-center">{{ t('sessionLobby.guestSession') }}</p>
      </div>
    </div>
  </div>
</template>
