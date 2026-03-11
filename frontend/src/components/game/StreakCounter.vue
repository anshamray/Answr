<script setup>
import { computed, ref, watch } from 'vue';
import { useGameStore } from '../../stores/gameStore.js';

const gameStore = useGameStore();

const isAnimating = ref(false);

// Watch for streak changes to trigger animation
watch(() => gameStore.currentStreak, (newStreak, oldStreak) => {
  if (newStreak > oldStreak && newStreak >= 2) {
    isAnimating.value = true;
    setTimeout(() => {
      isAnimating.value = false;
    }, 600);
  }
});

const streakEmoji = computed(() => {
  const streak = gameStore.currentStreak;
  if (streak >= 3) return '\u{1F525}'; // 🔥 for hot streaks
  if (streak >= 2) return '\u{2B50}'; // ⭐ for early streaks
  return '';
});

const showStreak = computed(() => gameStore.currentStreak >= 2);
</script>

<template>
  <Transition name="streak">
    <div
      v-if="showStreak"
      class="streak-counter"
      :class="{ 'animate-pulse-fast': isAnimating }"
    >
      <span class="streak-emoji">{{ streakEmoji }}</span>
      <div class="streak-info">
        <span class="streak-number">{{ gameStore.currentStreak }}</span>
        <span v-if="gameStore.streakLabel" class="streak-label">{{ gameStore.streakLabel }}</span>
      </div>
      <span v-if="gameStore.lastStreakMultiplier > 1" class="streak-multiplier">
        {{ gameStore.lastStreakMultiplier }}x
      </span>
    </div>
  </Transition>
</template>

<style scoped>
.streak-counter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
  border: 3px solid black;
  box-shadow: 4px 4px 0px rgba(0, 0, 0, 0.1);
  color: white;
  font-weight: bold;
}

.streak-emoji {
  font-size: 1.5rem;
  line-height: 1;
  min-width: 1.5rem;
  text-align: center;
}

.streak-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.streak-number {
  font-size: 1.25rem;
  font-family: var(--font-pixel), monospace;
}

.streak-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.streak-multiplier {
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  font-size: 0.875rem;
  font-family: var(--font-pixel), monospace;
}

/* Animation */
.animate-pulse-fast {
  animation: pulse-fast 0.3s ease-in-out 2;
}

@keyframes pulse-fast {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Transitions */
.streak-enter-active {
  animation: streak-in 0.4s ease-out;
}

.streak-leave-active {
  animation: streak-out 0.3s ease-in;
}

@keyframes streak-in {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes streak-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
}
</style>
