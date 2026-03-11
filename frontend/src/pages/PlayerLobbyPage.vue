<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '../stores/gameStore.js';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket.js';
import { usePlayerReconnect } from '../composables/usePlayerReconnect.js';
import { TIMING } from '../constants/index.js';

import PixelCard from '../components/PixelCard.vue';
import PixelCheck from '../components/icons/PixelCheck.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';
import PixelStar from '../components/icons/PixelStar.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();

const dots = ref('.');
const playerCount = ref(0);
const showAnswerText = ref(game.playerSettings?.showAnswerText ?? true);
// Use ref for interval ID to ensure reliable cleanup
const dotsIntervalId = ref(null);
let cleanupReconnect = () => {};

function setup() {
  if (!game.pin || !game.sessionId || !game.playerId) {
    router.replace('/play');
    return;
  }

  const socket = getSocket() || connectSocket();
  const reconnect = usePlayerReconnect({ socket, game, router });
  cleanupReconnect = reconnect.cleanup;

  dotsIntervalId.value = setInterval(() => {
    dots.value = dots.value.length >= 3 ? '.' : dots.value + '.';
  }, TIMING.DOTS_ANIMATION_INTERVAL);

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

  socket.on('lobby:update', (data) => {
    playerCount.value = data.playerCount || data.players?.length || 0;
  });

  reconnect.maybeRecoverSession();
}

function cleanup() {
  if (dotsIntervalId.value) {
    clearInterval(dotsIntervalId.value);
    dotsIntervalId.value = null;
  }
  const socket = getSocket();
  if (socket) {
    socket.off('game:started');
    socket.off('game:question');
    socket.off('game:end');
    socket.off('player:kicked');
    socket.off('lobby:update');
  }
  cleanupReconnect();
}

function leaveGame() {
  cleanup();
  disconnectSocket();
  game.reset();
  router.push('/');
}

watch(showAnswerText, (val) => {
  game.setPlayerSetting('showAnswerText', !!val);
});

onMounted(setup);
onUnmounted(cleanup);
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-4 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 relative overflow-x-hidden">
    <!-- Animated background elements -->
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none">
      <div class="absolute top-1/4 left-1/4 animate-pulse">
        <PixelStar class="text-primary/10" :size="48" />
      </div>
      <div class="absolute top-1/2 right-1/4 animate-bounce" style="animation-delay: 0.5s;">
        <PixelStar class="text-secondary/10" :size="40" />
      </div>
      <div class="absolute bottom-1/4 left-1/3 animate-pulse" style="animation-delay: 1s;">
        <PixelStar class="text-accent/10" :size="56" />
      </div>
    </div>

    <div class="w-full max-w-sm relative z-10">
      <div class="flex justify-end mb-3">
        <LanguageSwitcher />
      </div>
      <PixelCard class="space-y-8 text-center">
        <div class="space-y-4">
          <div class="inline-flex items-center justify-center w-20 h-20 bg-success border-[3px] border-black pixel-shadow animate-bounce">
            <PixelCheck class="text-white" :size="40" />
          </div>

          <div>
            <h1 class="text-4xl font-bold mb-2">{{ t('game.youreIn') }}</h1>
            <p class="text-muted-foreground">{{ t('game.getReady') }}</p>
          </div>
        </div>

        <div class="py-6 px-8 bg-primary/10 border-2 border-primary">
          <div class="text-sm text-muted-foreground mb-2">{{ t('game.playingAs') }}</div>
          <div class="flex items-center justify-center gap-3">
            <span v-if="game.playerEmoji" class="text-4xl">{{ game.playerEmoji }}</span>
            <span class="text-3xl font-bold text-primary">{{ game.playerName || t('game.player') }}</span>
          </div>
        </div>

        <!-- Waiting screen settings -->
        <div class="space-y-3 text-left">
          <label class="flex items-center gap-3 cursor-pointer select-none p-3 bg-muted border-2 border-border">
            <input
              v-model="showAnswerText"
              type="checkbox"
              class="w-5 h-5 accent-primary"
            />
            <div class="min-w-0">
              <span class="text-sm font-medium">{{ t('game.showAnswerText') }}</span>
              <p class="text-xs text-muted-foreground">{{ t('game.showAnswerTextHint') }}</p>
            </div>
          </label>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-center gap-2 text-muted-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span class="font-medium">{{ t('game.waitingForHostToStart') }}{{ dots }}</span>
          </div>

          <div v-if="playerCount > 0" class="flex items-center justify-center gap-4 py-4 border-t-2 border-b-2 border-dashed border-border">
            <PixelUsers class="text-primary" :size="24" />
            <span class="text-2xl font-bold">{{ playerCount }}</span>
            <span class="text-muted-foreground">{{ t('game.playersJoinedCount') }}</span>
          </div>
        </div>

        <div class="text-xs text-muted-foreground pt-4 border-t-2 border-border">
          {{ t('session.pin') }}: <span class="font-bold text-foreground">{{ game.pin }}</span>
        </div>
      </PixelCard>

      <div class="mt-6 text-center">
        <button
          class="text-sm text-muted-foreground hover:text-destructive transition-colors py-3 px-4 min-h-[44px]"
          @click="leaveGame"
        >
          {{ t('game.leaveGame') }}
        </button>
      </div>
    </div>
  </div>
</template>
