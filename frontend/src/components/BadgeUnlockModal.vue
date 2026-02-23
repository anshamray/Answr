<script setup>
import { ref, watch } from 'vue';

import PixelButton from './PixelButton.vue';

const props = defineProps({
  badge: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

const isAnimating = ref(false);

watch(() => props.badge, (newBadge) => {
  if (newBadge) {
    isAnimating.value = true;
    // Reset animation after it completes
    setTimeout(() => {
      isAnimating.value = false;
    }, 1000);
  }
});

function handleClose() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="badge-modal">
      <div
        v-if="badge"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
        @click.self="handleClose"
      >
        <div
          class="bg-white border-[3px] border-black pixel-shadow-lg max-w-sm w-full p-8 text-center"
          :class="{ 'animate-bounce-in': isAnimating }"
        >
          <!-- Confetti effect placeholder -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden">
            <div v-for="i in 20" :key="i" class="confetti-piece" :style="{ '--i': i }"></div>
          </div>

          <!-- Badge Icon -->
          <div class="mb-6 relative">
            <div class="text-8xl animate-pulse">{{ badge.emoji }}</div>
            <div class="absolute inset-0 animate-ping opacity-20">
              <span class="text-8xl">{{ badge.emoji }}</span>
            </div>
          </div>

          <!-- Title -->
          <h2 class="text-2xl font-bold pixel-font text-warning mb-2">Badge Unlocked!</h2>

          <!-- Badge Name -->
          <h3 class="text-xl font-bold mb-2">{{ badge.name }}</h3>

          <!-- Description -->
          <p class="text-muted-foreground mb-6">{{ badge.description }}</p>

          <!-- Close Button -->
          <PixelButton variant="primary" @click="handleClose">
            Awesome!
          </PixelButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.badge-modal-enter-active {
  animation: badge-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.badge-modal-leave-active {
  animation: badge-out 0.3s ease-in;
}

@keyframes badge-in {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-10deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes badge-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.8);
  }
}

.animate-bounce-in {
  animation: bounce-in 0.6s ease-out;
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  50% { transform: scale(1.1); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* Simple confetti effect */
.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  top: 0;
  left: calc(var(--i) * 5%);
  background: linear-gradient(
    45deg,
    var(--warning) 0%,
    var(--primary) 50%,
    var(--secondary) 100%
  );
  animation: confetti-fall 2s ease-out calc(var(--i) * 0.1s) forwards;
  opacity: 0;
}

@keyframes confetti-fall {
  0% {
    opacity: 1;
    transform: translateY(-20px) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(400px) rotate(720deg);
  }
}
</style>
