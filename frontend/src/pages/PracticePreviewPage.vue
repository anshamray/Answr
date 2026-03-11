<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';

import AppHeader from '../components/AppHeader.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelButton from '../components/PixelButton.vue';

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const creating = ref(false);
const error = ref('');
const sessionId = ref('');
const pin = ref('');

// Delay rendering of the player iframe slightly so the host control page
// has time to connect its websocket and register the in-memory session.
const showPlayerFrame = ref(false);

const quizId = computed(() => route.params.id);

const hostUrl = computed(() => {
  if (!sessionId.value) return '';
  // Normal moderator control page, marked as practice via query param
  return `/session/${sessionId.value}/control?practice=1`;
});

const playerUrl = computed(() => {
  if (!pin.value) return '';
  // Normal player join flow with PIN and practice flag
  const encodedPin = encodeURIComponent(pin.value);
  return `/play?pin=${encodedPin}&practice=1`;
});

async function createPracticeSession() {
  try {
    creating.value = true;
    error.value = '';

    const res = await fetch(apiUrl('/api/sessions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({
        quizId: quizId.value,
        practice: true
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to create practice session');
    }

    const json = await res.json();
    const session = json.data?.session;

    sessionId.value = session?.id || session?._id || '';
    pin.value = session?.pin || '';

    if (!sessionId.value || !pin.value) {
      throw new Error('Missing session data for practice preview');
    }

    // Give the host iframe a brief head start before we render the player
    // iframe so that the websocket-backed session exists when the player
    // performs its PIN check.
    setTimeout(() => {
      showPlayerFrame.value = true;
    }, 1500);
  } catch (err) {
    error.value = err.message || 'Failed to create practice session';
  } finally {
    creating.value = false;
  }
}

function goBackToEditor() {
  router.push(`/quiz/${quizId.value}/edit`);
}

onMounted(() => {
  // If session + pin were already provided (e.g. by a redirect), reuse them.
  const initialSessionId = route.query.sessionId;
  const initialPin = route.query.pin;

  if (typeof initialSessionId === 'string' && typeof initialPin === 'string') {
    sessionId.value = initialSessionId;
    pin.value = initialPin;
    // Assume host will connect quickly; still delay player iframe slightly.
    setTimeout(() => {
      showPlayerFrame.value = true;
    }, 1000);
    return;
  }

  createPracticeSession();
});
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <AppHeader />

    <main class="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-4">
      <!-- Top bar -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="p-2 text-muted-foreground hover:text-primary transition"
            @click="goBackToEditor"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div class="space-y-1">
            <h1 class="text-lg font-bold">
              {{ t('quizEditor.previewAsPlayer') || 'Practice preview' }}
            </h1>
            <p class="text-xs text-muted-foreground">
              See the host screen and a phone-sized player side by side. This run is marked as practice and does not count towards quiz stats.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <PixelBadge v-if="pin" variant="primary" class="font-mono">
            PIN: {{ pin }}
          </PixelBadge>
          <PixelBadge variant="secondary">
            Practice
          </PixelBadge>
        </div>
      </div>

      <!-- Error state -->
      <div v-if="error" class="max-w-md">
        <PixelCard class="border-destructive text-destructive space-y-3">
          <p class="text-sm font-medium">
            {{ error }}
          </p>
          <PixelButton variant="outline" size="sm" @click="createPracticeSession" :disabled="creating">
            {{ creating ? t('common.loading') : 'Retry creating practice session' }}
          </PixelButton>
        </PixelCard>
      </div>

      <!-- Loading -->
      <div v-if="creating && !sessionId" class="flex-1 flex items-center justify-center py-12">
        <p class="text-muted-foreground text-sm">
          {{ t('common.loading') }}
        </p>
      </div>

      <!-- Side-by-side preview -->
      <div
        v-if="sessionId && pin"
        class="grid gap-4 items-stretch"
        :class="'lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]'"
      >
        <!-- Host / moderator view -->
        <PixelCard class="!p-3 lg:!p-4 flex flex-col min-h-[420px]">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Host view
            </span>
            <span class="text-[11px] text-muted-foreground">
              {{ t('quizEditor.previewHostHint') || 'Exactly what you will see when hosting live.' }}
            </span>
          </div>
          <div class="relative flex-1 border-[3px] border-black bg-black/5 overflow-auto">
            <iframe
              v-if="hostUrl"
              :src="hostUrl"
              title="Host preview"
              class="w-full h-full border-0 bg-white"
            ></iframe>
          </div>
        </PixelCard>

        <!-- Player / phone view -->
        <PixelCard class="!p-3 flex flex-col min-h-[420px]">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Player view
            </span>
            <span class="text-[11px] text-muted-foreground">
              Tap answers here as if on your phone.
            </span>
          </div>
          <div class="flex-1 flex items-center justify-center">
            <div class="relative w-full max-w-xs aspect-[9/19] rounded-[32px] border-[6px] border-black overflow-hidden shadow-[0_0_0_2px_rgba(0,0,0,0.6)] bg-black">
              <div class="absolute inset-[6px] rounded-[26px] overflow-hidden bg-white">
                <iframe
                  v-if="playerUrl && showPlayerFrame"
                  :src="playerUrl"
                  title="Player preview"
                  class="w-full h-full border-0"
                ></iframe>
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-xs text-muted-foreground"
                >
                  {{ t('common.loading') }}
                </div>
              </div>
            </div>
          </div>
        </PixelCard>
      </div>
    </main>
  </div>
</template>

