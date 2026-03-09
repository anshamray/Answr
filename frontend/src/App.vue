<script setup>
import { computed } from 'vue';
import {
  clearDebugLogs,
  debugLogState,
  setDebugPanelOpen
} from './lib/debugLog.js';

const fatalLog = computed(() =>
  debugLogState.logs.find((entry) => entry.id === debugLogState.fatalLogId) || null
);

const hasLogs = computed(() => debugLogState.logs.length > 0);

function toggleDebugPanel() {
  setDebugPanelOpen(!debugLogState.panelOpen);
}
</script>

<template>
  <router-view />

  <div
    v-if="fatalLog"
    class="fixed inset-0 z-[100] overflow-auto bg-background/95 p-4 sm:p-6"
  >
    <div class="mx-auto max-w-3xl border-[3px] border-destructive bg-white p-4 pixel-shadow space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-bold text-destructive">App Error</h1>
          <p class="text-sm text-muted-foreground">
            The app crashed. Recent logs are shown below so you can debug on mobile.
          </p>
        </div>
        <button
          class="border-2 border-black px-3 py-2 text-sm font-bold bg-muted"
          @click="clearDebugLogs"
        >
          Clear
        </button>
      </div>

      <div class="space-y-3">
        <div
          v-for="entry in debugLogState.logs"
          :key="entry.id"
          class="border-2 border-black bg-card p-3"
        >
          <div class="flex flex-wrap items-center gap-2 text-xs font-bold uppercase">
            <span class="bg-destructive px-2 py-1 text-white">{{ entry.level }}</span>
            <span class="bg-muted px-2 py-1">{{ entry.source }}</span>
            <span class="text-muted-foreground">{{ entry.timestamp }}</span>
          </div>
          <p class="mt-2 font-bold break-words">{{ entry.message }}</p>
          <p v-if="entry.details" class="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {{ entry.details }}
          </p>
          <pre v-if="entry.stack" class="mt-2 overflow-auto whitespace-pre-wrap break-words bg-muted p-2 text-xs">{{ entry.stack }}</pre>
        </div>
      </div>
    </div>
  </div>

  <button
    v-else-if="hasLogs"
    class="fixed bottom-4 right-4 z-[90] border-[3px] border-black bg-warning px-4 py-3 font-bold pixel-shadow"
    @click="toggleDebugPanel"
  >
    Show Logs ({{ debugLogState.logs.length }})
  </button>

  <div
    v-if="!fatalLog && debugLogState.panelOpen && hasLogs"
    class="fixed inset-0 z-[95] bg-black/60 p-4"
    @click.self="setDebugPanelOpen(false)"
  >
    <div class="mx-auto max-w-3xl border-[3px] border-black bg-white p-4 pixel-shadow space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold">Debug Logs</h2>
          <p class="text-sm text-muted-foreground">Latest app and socket errors from this session.</p>
        </div>
        <div class="flex gap-2">
          <button
            class="border-2 border-black px-3 py-2 text-sm font-bold bg-muted"
            @click="clearDebugLogs"
          >
            Clear
          </button>
          <button
            class="border-2 border-black px-3 py-2 text-sm font-bold bg-primary text-white"
            @click="setDebugPanelOpen(false)"
          >
            Close
          </button>
        </div>
      </div>

      <div class="max-h-[70vh] overflow-auto space-y-3">
        <div
          v-for="entry in debugLogState.logs"
          :key="entry.id"
          class="border-2 border-black bg-card p-3"
        >
          <div class="flex flex-wrap items-center gap-2 text-xs font-bold uppercase">
            <span class="bg-destructive px-2 py-1 text-white">{{ entry.level }}</span>
            <span class="bg-muted px-2 py-1">{{ entry.source }}</span>
            <span class="text-muted-foreground">{{ entry.timestamp }}</span>
          </div>
          <p class="mt-2 font-bold break-words">{{ entry.message }}</p>
          <p v-if="entry.details" class="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {{ entry.details }}
          </p>
          <pre v-if="entry.stack" class="mt-2 overflow-auto whitespace-pre-wrap break-words bg-muted p-2 text-xs">{{ entry.stack }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
