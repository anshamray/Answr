<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';
import { STORAGE_KEYS } from '../constants/index.js';
import { getLeaderboardAvatar } from '../lib/leaderboardHelpers.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelStar from '../components/icons/PixelStar.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sessionId = route.params.id;
const loading = ref(true);
const error = ref('');
const session = ref(null);
const rankings = ref([]);
const resultStats = ref({
  totalPlayers: null,
  totalQuestions: null,
  avgScore: null
});
let isDisposed = false;

const leaderboard = computed(() => {
  // Prefer rankings from /results endpoint
  if (rankings.value.length > 0) {
    return rankings.value.map((p, i) => ({ ...p, position: p.rank || i + 1 }));
  }
  // Fallback to session.participants
  if (!session.value?.participants) return [];
  return [...session.value.participants]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((p, i) => ({ ...p, position: i + 1 }));
});

const topTen = computed(() => leaderboard.value.slice(0, 10));
const totalPlayers = computed(() => {
  if (typeof resultStats.value.totalPlayers === 'number') {
    return resultStats.value.totalPlayers;
  }
  return leaderboard.value.length;
});
const totalQuestions = computed(() => {
  if (typeof resultStats.value.totalQuestions === 'number') {
    return resultStats.value.totalQuestions;
  }
  return session.value?.quizId?.questions?.length ?? 0;
});
const avgScore = computed(() => {
  if (typeof resultStats.value.avgScore === 'number') {
    return resultStats.value.avgScore;
  }

  if (leaderboard.value.length === 0) return 0;
  const sum = leaderboard.value.reduce((s, p) => s + (p.score || 0), 0);
  return Math.round(sum / leaderboard.value.length);
});

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => null);

  return { res, json };
}

function applyDedicatedResults(data) {
  rankings.value = data?.rankings || [];
  resultStats.value = {
    totalPlayers: data?.stats?.totalPlayers ?? data?.totalParticipants ?? rankings.value.length,
    totalQuestions: data?.stats?.totalQuestions ?? data?.totalQuestions ?? 0,
    avgScore: data?.stats?.avgScore ?? data?.avgScore ?? 0
  };
  session.value = {
    quizId: { title: data?.quizTitle },
    status: data?.status,
    finishedAt: data?.finishedAt
  };
}

function applySessionFallback(sessionData) {
  session.value = sessionData;
  resultStats.value = {
    totalPlayers: sessionData?.participants?.length ?? null,
    totalQuestions: sessionData?.quizId?.questions?.length ?? null,
    avgScore: null
  };
}

async function fetchDedicatedResults(headers) {
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts && !isDisposed; attempt++) {
    const { res, json } = await fetchJson(apiUrl(`/api/sessions/${sessionId}/results`), { headers });

    if (res.ok) {
      applyDedicatedResults(json?.data);
      return true;
    }

    const message = json?.message || json?.error || '';
    const shouldRetry = res.status === 400 && /not finished/i.test(message);

    if (!shouldRetry || attempt === maxAttempts - 1) {
      return false;
    }

    await wait(1000);
  }

  return false;
}

async function fetchSessionFallback(headers, guestToken) {
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts && !isDisposed; attempt++) {
    let url = apiUrl(`/api/sessions/${sessionId}`);
    if (guestToken) {
      url += `?guestToken=${encodeURIComponent(guestToken)}`;
    }

    const { res, json } = await fetchJson(url, { headers });
    if (!res.ok) {
      throw new Error(json?.message || json?.error || 'Failed to load results');
    }

    const sessionData = json?.data?.session;
    const isFinished = sessionData?.status === 'finished';

    if (isFinished || attempt === maxAttempts - 1) {
      applySessionFallback(sessionData);
      return;
    }

    await wait(1000);
  }
}

async function fetchResults() {
  loading.value = true;
  error.value = '';

  try {
    const headers = {};
    const authToken = auth.token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const guestToken = sessionStorage.getItem(STORAGE_KEYS.GUEST_TOKEN);

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (authToken) {
      const loadedDedicatedResults = await fetchDedicatedResults(headers);
      if (loadedDedicatedResults || isDisposed) {
        return;
      }
    }

    await fetchSessionFallback(headers, guestToken);
  } catch (err) {
    error.value = err.message;
  } finally {
    if (!isDisposed) {
      loading.value = false;
    }
  }
}

onMounted(fetchResults);
onUnmounted(() => {
  isDisposed = true;
});
</script>

<template>
  <div class="min-h-screen p-4 lg:p-6 bg-gradient-to-br from-warning/20 via-primary/10 to-secondary/10 relative">
    <!-- Celebration effects -->
    <div class="absolute top-10 left-10 animate-bounce pointer-events-none">
      <PixelStar class="text-warning" :size="64" />
    </div>
    <div class="absolute top-20 right-20 animate-pulse pointer-events-none" style="animation-delay: 0.5s;">
      <PixelStar class="text-primary" :size="56" />
    </div>
    <div class="absolute bottom-20 left-1/4 animate-bounce pointer-events-none" style="animation-delay: 1s;">
      <PixelStar class="text-secondary" :size="48" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="h-full flex items-center justify-center">
      <p class="text-muted-foreground text-lg">Loading results...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="h-full flex flex-col items-center justify-center">
      <p class="text-destructive text-lg mb-4">{{ error }}</p>
      <router-link to="/dashboard" class="text-primary hover:underline">Back to Dashboard</router-link>
    </div>

    <div v-else class="max-w-6xl mx-auto space-y-8 relative z-10">
      <!-- Header -->
      <div class="text-center space-y-4">
        <h1 class="text-5xl lg:text-6xl font-bold pixel-font text-primary mb-4">GAME OVER!</h1>
        <p class="text-xl lg:text-2xl text-muted-foreground">{{ session?.quizId?.title || 'Quiz Results' }}</p>
      </div>

      <!-- Rankings are only shown in the right-hand column -->

      <!-- Stats + Final Rankings -->
      <div class="grid lg:grid-cols-2 gap-6">
        <div class="space-y-6">
          <PixelCard variant="primary" class="space-y-4">
            <h3 class="text-xl font-bold">Quiz Stats</h3>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Total Players</span>
                <span class="text-2xl font-bold text-primary">{{ totalPlayers }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Questions</span>
                <span class="text-2xl font-bold text-secondary">{{ totalQuestions }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Avg. Score</span>
                <span class="text-2xl font-bold text-accent">{{ avgScore.toLocaleString() }}</span>
              </div>
            </div>
          </PixelCard>

          <div class="flex flex-col gap-3">
            <router-link to="/dashboard">
              <PixelButton variant="primary" class="w-full text-lg py-5">
                Back to Dashboard
              </PixelButton>
            </router-link>
            <router-link to="/library">
              <PixelButton variant="secondary" class="w-full">
                Browse Library
              </PixelButton>
            </router-link>
            <router-link to="/" class="text-center text-muted-foreground hover:text-primary transition-colors">
              Exit to Home
            </router-link>
          </div>
        </div>

        <PixelCard v-if="topTen.length > 0" class="space-y-4">
          <h2 class="text-2xl font-bold flex items-center gap-2">
            <svg class="text-warning" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
            Final Rankings
          </h2>

          <div class="space-y-2">
            <div
              v-for="player in topTen"
              :key="player.playerId || player.name"
              class="flex items-center gap-3 p-3 bg-muted border-2 border-border"
            >
              <div class="w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-bold">
                {{ player.position }}
              </div>
              <span class="text-2xl">{{ getLeaderboardAvatar(player.avatar, player.position) }}</span>
              <div class="flex-1">
                <div class="font-bold">{{ player.name || player.nickname || 'Player' }}</div>
                <div class="text-sm text-muted-foreground">{{ (player.score || 0).toLocaleString() }} pts</div>
              </div>
            </div>
          </div>
        </PixelCard>
      </div>
    </div>
  </div>
</template>
