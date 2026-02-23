<script setup>
import { ref, onMounted } from 'vue';
import { soundManager } from '../lib/sounds.js';

const enabled = ref(true);

onMounted(() => {
  enabled.value = soundManager.enabled;
  // Preload sounds when component mounts
  soundManager.preload();
});

function toggle() {
  enabled.value = soundManager.toggle();
}
</script>

<template>
  <button
    type="button"
    class="p-2 border-2 transition-all"
    :class="enabled
      ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
      : 'border-border bg-muted text-muted-foreground hover:border-primary/50'"
    :title="enabled ? 'Sound on' : 'Sound off'"
    @click="toggle"
  >
    <!-- Sound on icon -->
    <svg v-if="enabled" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
    <!-- Sound off icon -->
    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  </button>
</template>
