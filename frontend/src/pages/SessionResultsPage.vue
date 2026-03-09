<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';
import { AVATARS, STORAGE_KEYS } from '../constants/index.js';

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

const topThree = computed(() => {
  const top = leaderboard.value.slice(0, 3);
  // Only reorder if we have exactly 3 entries for podium display
  if (top.length < 3) return top;
  return [top[1], top[0], top[2]];
});

const otherPlayers = computed(() => leaderboard.value.slice(3, 10));
const totalPlayers = computed(() => leaderboard.value.length);
const avgScore = computed(() => {
  if (totalPlayers.value === 0) return 0;
  const sum = leaderboard.value.reduce((s, p) => s + (p.score || 0), 0);
  return Math.round(sum / totalPlayers.value);
});

async function fetchResults() {
  loading.value = true;
  try {
    const headers = {};
    const guestToken = sessionStorage.getItem(STORAGE_KEYS.GUEST_TOKEN);

    if (auth.isAuthenticated) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    // Try the dedicated results endpoint first
    if (auth.isAuthenticated) {
      try {
        const resultsRes = await fetch(apiUrl(`/api/sessions/${sessionId}/results`), { headers });
        if (resultsRes.ok) {
          const resultsJson = await resultsRes.json();
          const data = resultsJson.data;
          rankings.value = data?.rankings || [];
          session.value = {
            quizId: { title: data?.quizTitle },
            status: data?.status,
            finishedAt: data?.finishedAt
          };
          return;
        }
      } catch {
        // Fall through to regular session endpoint
      }
    }

    // Fallback: use the general session endpoint
    let url = apiUrl(`/api/sessions/${sessionId}`);
    if (guestToken) url += `?guestToken=${encodeURIComponent(guestToken)}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Failed to load results');

    const json = await res.json();
    session.value = json.data?.session;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function getAvatar(index) {
  return AVATARS.LEADERBOARD_AVATARS[index % AVATARS.LEADERBOARD_AVATARS.length];
}

onMounted(fetchResults);
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

      <!-- Podium -->
      <div v-if="topThree.length >= 3" class="flex items-end justify-center gap-4 lg:gap-6 mb-12">
        <!-- 2nd Place -->
        <div class="flex flex-col items-center">
          <div class="mb-4 text-center">
            <div class="text-4xl lg:text-6xl mb-2">{{ topThree[0]?.avatar || getAvatar(1) }}</div>
            <div class="text-lg lg:text-xl font-bold truncate max-w-[120px]">{{ topThree[0]?.name || 'Player' }}</div>
            <div class="text-lg lg:text-2xl font-bold text-muted-foreground">{{ (topThree[0]?.score || 0).toLocaleString() }}</div>
          </div>
          <div class="w-24 lg:w-32 h-24 lg:h-32 bg-gradient-to-t from-muted-foreground to-muted-foreground/70 border-[3px] border-black pixel-shadow-lg flex items-center justify-center">
            <span class="text-4xl lg:text-5xl font-bold text-white pixel-font">2</span>
          </div>
        </div>

        <!-- 1st Place -->
        <div class="flex flex-col items-center mb-8">
          <PixelStar class="text-warning animate-spin mb-4" :size="48" style="animation-duration: 3s;" />
          <div class="mb-4 text-center">
            <div class="text-5xl lg:text-7xl mb-2">{{ topThree[1]?.avatar || getAvatar(0) }}</div>
            <div class="text-xl lg:text-2xl font-bold truncate max-w-[140px]">{{ topThree[1]?.name || 'Player' }}</div>
            <div class="text-2xl lg:text-3xl font-bold text-warning">{{ (topThree[1]?.score || 0).toLocaleString() }}</div>
          </div>
          <div class="w-32 lg:w-40 h-36 lg:h-48 bg-gradient-to-t from-warning to-warning/70 border-[3px] border-black pixel-shadow-lg flex items-center justify-center">
            <span class="text-5xl lg:text-6xl font-bold text-white pixel-font">1</span>
          </div>
        </div>

        <!-- 3rd Place -->
        <div class="flex flex-col items-center">
          <div class="mb-4 text-center">
            <div class="text-4xl lg:text-6xl mb-2">{{ topThree[2]?.avatar || getAvatar(2) }}</div>
            <div class="text-lg lg:text-xl font-bold truncate max-w-[120px]">{{ topThree[2]?.name || 'Player' }}</div>
            <div class="text-lg lg:text-2xl font-bold text-accent">{{ (topThree[2]?.score || 0).toLocaleString() }}</div>
          </div>
          <div class="w-24 lg:w-32 h-16 lg:h-24 bg-gradient-to-t from-accent to-accent/70 border-[3px] border-black pixel-shadow-lg flex items-center justify-center">
            <span class="text-4xl lg:text-5xl font-bold text-white pixel-font">3</span>
          </div>
        </div>
      </div>

      <!-- Leaderboard for fewer than 3 players -->
      <PixelCard v-if="leaderboard.length > 0 && leaderboard.length < 3" class="space-y-4">
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
            v-for="player in leaderboard"
            :key="player.playerId || player.name"
            class="flex items-center gap-3 p-3 bg-muted border-2 border-border"
          >
            <div class="w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-bold">
              {{ player.position }}
            </div>
            <span class="text-2xl">{{ player.avatar || getAvatar(player.position - 1) }}</span>
            <div class="flex-1">
              <div class="font-bold">{{ player.name || player.nickname || 'Player' }}</div>
              <div class="text-sm text-muted-foreground">{{ (player.score || 0).toLocaleString() }} pts</div>
            </div>
          </div>
        </div>
      </PixelCard>

      <!-- Full Leaderboard + Stats -->
      <div class="grid lg:grid-cols-2 gap-6">
        <PixelCard v-if="otherPlayers.length > 0" class="space-y-4">
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
              v-for="player in otherPlayers"
              :key="player.playerId || player.name"
              class="flex items-center gap-3 p-3 bg-muted border-2 border-border"
            >
              <div class="w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-bold">
                {{ player.position }}
              </div>
              <span class="text-2xl">{{ player.avatar || getAvatar(player.position - 1) }}</span>
              <div class="flex-1">
                <div class="font-bold">{{ player.name || player.nickname || 'Player' }}</div>
                <div class="text-sm text-muted-foreground">{{ (player.score || 0).toLocaleString() }} pts</div>
              </div>
            </div>
          </div>
        </PixelCard>

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
                <span class="text-2xl font-bold text-secondary">{{ session?.quizId?.questions?.length || '?' }}</span>
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
      </div>
    </div>
  </div>
</template>
