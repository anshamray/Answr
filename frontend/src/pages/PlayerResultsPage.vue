<script setup>
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore.js';
import { AVATARS } from '../constants/index.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelStar from '../components/icons/PixelStar.vue';

const game = useGameStore();

const leaderboard = computed(() => game.leaderboard || []);

const myEntry = computed(() =>
  leaderboard.value.find((e) => e.playerId === game.playerId)
);

const topThree = computed(() => {
  const top = leaderboard.value.slice(0, 3);
  // Only reorder if we have exactly 3 entries for podium display
  if (top.length < 3) return top;
  // Reorder: 2nd, 1st, 3rd for podium
  return [top[1], top[0], top[2]];
});

const otherPlayers = computed(() => leaderboard.value.slice(3, 10));

function getAvatar(index) {
  return AVATARS.LEADERBOARD_AVATARS[index % AVATARS.LEADERBOARD_AVATARS.length];
}
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

    <div class="max-w-4xl mx-auto space-y-8 relative z-10">
      <!-- Header -->
      <div class="text-center space-y-4">
        <h1 class="text-5xl lg:text-6xl font-bold pixel-font text-primary mb-4">GAME OVER!</h1>
        <p class="text-xl lg:text-2xl text-muted-foreground">Final Results</p>
      </div>

      <!-- Your Result -->
      <PixelCard v-if="myEntry" variant="primary" class="text-center space-y-4">
        <h2 class="text-2xl font-bold">Your Result</h2>
        <div class="flex items-center justify-center gap-8">
          <div>
            <div class="text-sm text-muted-foreground">Rank</div>
            <div class="text-4xl font-bold text-warning">#{{ myEntry.position }}</div>
          </div>
          <div class="w-px h-16 bg-border"></div>
          <div>
            <div class="text-sm text-muted-foreground">Score</div>
            <div class="text-4xl font-bold text-primary">{{ myEntry.score?.toLocaleString() }}</div>
          </div>
        </div>
      </PixelCard>

      <!-- Podium with staggered animations -->
      <div v-if="topThree.length >= 3" class="flex items-end justify-center gap-2 sm:gap-4 lg:gap-6 mb-8">
        <!-- 2nd Place - animates first (delay 0s) -->
        <div class="flex flex-col items-center animate-podium-rise-2">
          <div class="mb-2 sm:mb-4 text-center">
            <div class="text-3xl sm:text-4xl lg:text-6xl mb-1 sm:mb-2">{{ topThree[0]?.avatar || getAvatar(1) }}</div>
            <div class="text-sm sm:text-lg lg:text-xl font-bold truncate max-w-[80px] sm:max-w-[120px]">{{ topThree[0]?.nickname || 'Player' }}</div>
            <div class="text-sm sm:text-lg lg:text-2xl font-bold text-muted-foreground">{{ topThree[0]?.score?.toLocaleString() }}</div>
          </div>
          <div class="w-20 sm:w-24 lg:w-32 h-20 sm:h-24 lg:h-32 bg-gradient-to-t from-muted-foreground to-muted-foreground/70 border-[3px] border-black pixel-shadow-lg flex items-center justify-center">
            <span class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white pixel-font">2</span>
          </div>
        </div>

        <!-- 1st Place - animates last (delay 0.4s) -->
        <div class="flex flex-col items-center mb-4 sm:mb-8 animate-podium-rise-1">
          <PixelStar class="text-warning animate-spin mb-2 sm:mb-4" :size="36" style="animation-duration: 3s;" />
          <div class="mb-2 sm:mb-4 text-center">
            <div class="text-4xl sm:text-5xl lg:text-7xl mb-1 sm:mb-2">{{ topThree[1]?.avatar || getAvatar(0) }}</div>
            <div class="text-base sm:text-xl lg:text-2xl font-bold truncate max-w-[100px] sm:max-w-[140px]">{{ topThree[1]?.nickname || 'Player' }}</div>
            <div class="text-xl sm:text-2xl lg:text-3xl font-bold text-warning">{{ topThree[1]?.score?.toLocaleString() }}</div>
          </div>
          <div class="w-24 sm:w-32 lg:w-40 h-28 sm:h-36 lg:h-48 bg-gradient-to-t from-warning to-warning/70 border-[3px] border-black pixel-shadow-lg flex items-center justify-center">
            <span class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white pixel-font">1</span>
          </div>
        </div>

        <!-- 3rd Place - animates second (delay 0.2s) -->
        <div class="flex flex-col items-center animate-podium-rise-3">
          <div class="mb-2 sm:mb-4 text-center">
            <div class="text-3xl sm:text-4xl lg:text-6xl mb-1 sm:mb-2">{{ topThree[2]?.avatar || getAvatar(2) }}</div>
            <div class="text-sm sm:text-lg lg:text-xl font-bold truncate max-w-[80px] sm:max-w-[120px]">{{ topThree[2]?.nickname || 'Player' }}</div>
            <div class="text-sm sm:text-lg lg:text-2xl font-bold text-accent">{{ topThree[2]?.score?.toLocaleString() }}</div>
          </div>
          <div class="w-20 sm:w-24 lg:w-32 h-14 sm:h-16 lg:h-24 bg-gradient-to-t from-accent to-accent/70 border-[3px] border-black pixel-shadow-lg flex items-center justify-center">
            <span class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white pixel-font">3</span>
          </div>
        </div>
      </div>

      <!-- Full Leaderboard (remaining players) -->
      <PixelCard v-if="otherPlayers.length > 0" class="space-y-4">
        <h2 class="text-2xl font-bold flex items-center gap-2">
          <svg class="text-warning" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          Full Rankings
        </h2>

        <div class="space-y-2">
          <div
            v-for="player in otherPlayers"
            :key="player.playerId"
            class="flex items-center gap-3 p-3 border-2"
            :class="player.playerId === game.playerId ? 'border-primary bg-primary/10' : 'border-border bg-muted'"
          >
            <div class="w-10 h-10 bg-white border-2 border-black flex items-center justify-center font-bold">
              {{ player.position }}
            </div>
            <span class="text-2xl">{{ player.avatar || getAvatar(player.position - 1) }}</span>
            <div class="flex-1">
              <div class="font-bold" :class="player.playerId === game.playerId ? 'text-primary' : ''">
                {{ player.playerId === game.playerId ? 'You' : player.nickname }}
              </div>
              <div class="text-sm text-muted-foreground">{{ player.score?.toLocaleString() }} pts</div>
            </div>
          </div>
        </div>
      </PixelCard>

      <!-- Actions -->
      <div class="flex flex-col gap-3 max-w-sm mx-auto">
        <router-link to="/">
          <PixelButton variant="primary" class="w-full text-lg py-5">
            <svg class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Play Again
          </PixelButton>
        </router-link>
        <router-link to="/library">
          <PixelButton variant="secondary" class="w-full">
            Browse More Quizzes
          </PixelButton>
        </router-link>
      </div>
    </div>
  </div>
</template>
