<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { apiUrl } from '../lib/api.js';
import { getTypeLabel } from '../lib/questionTypes.js';
import { useAuthStore } from '../stores/authStore.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import AppHeader from '../components/AppHeader.vue';

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const quiz = ref(null);
const loading = ref(true);
const error = ref('');
const starting = ref(false);
const startError = ref('');
const practiceStarting = ref(false);
const practiceError = ref('');

async function fetchQuiz() {
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch(apiUrl(`/api/quizzes/${route.params.id}`), {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) throw new Error('Quiz not found');

    const json = await res.json();
    quiz.value = json.data?.quiz ?? null;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function startQuiz() {
  starting.value = true;
  startError.value = '';

  try {
    const res = await fetch(apiUrl('/api/sessions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ quizId: route.params.id })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to start quiz');
    }

    const json = await res.json();
    const session = json.data?.session;
    router.push(`/session/${session._id || session.id}/lobby`);
  } catch (err) {
    startError.value = err.message;
  } finally {
    starting.value = false;
  }
}

async function startPracticeRun() {
  practiceStarting.value = true;
  practiceError.value = '';

  try {
    const res = await fetch(apiUrl('/api/sessions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ quizId: route.params.id })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to start practice run');
    }

    const json = await res.json();
    const session = json.data?.session;

    if (!session?.pin) {
      throw new Error('Missing session PIN for practice run');
    }

    // Open a new tab in the normal player flow with the practice PIN prefilled.
    const practiceUrl = `/play?pin=${session.pin}&practice=1`;
    window.open(practiceUrl, '_blank', 'noopener,noreferrer');

    // Keep the current tab as the moderator host in the usual lobby.
    router.push(`/session/${session._id || session.id}/lobby`);
  } catch (err) {
    practiceError.value = err.message;
  } finally {
    practiceStarting.value = false;
  }
}

function editQuiz() {
  router.push(`/quiz/${route.params.id}/edit`);
}

function goBack() {
  router.push('/dashboard');
}

function resolveMediaUrl(url) {
  if (!url) return null;
  if (!url.startsWith('/')) return url;
  return apiUrl(url);
}

onMounted(fetchQuiz);
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppHeader />

    <main class="max-w-5xl mx-auto px-4 py-8">
      <!-- Back button -->
      <button
        @click="goBack"
        class="flex items-center gap-2 text-muted-foreground hover:text-primary transition mb-6"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        {{ t('account.backToDashboard') }}
      </button>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">{{ t('common.loading') }}</div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <p class="text-destructive text-lg mb-4">{{ error }}</p>
        <router-link to="/dashboard" class="text-primary hover:underline">{{ t('account.backToDashboard') }}</router-link>
      </div>

      <!-- Quiz Detail -->
      <div v-else-if="quiz" class="space-y-6">
        <div class="grid lg:grid-cols-3 gap-8">
          <!-- Main Content -->
          <div class="lg:col-span-2 space-y-6">
            <PixelCard class="space-y-6">
              <div>
                <div class="flex items-start justify-between mb-4">
                  <h1 class="text-3xl lg:text-4xl font-bold">{{ quiz.title }}</h1>
                  <PixelBadge :variant="quiz.isPublished ? 'success' : 'warning'">
                    {{ quiz.isPublished ? t('dashboard.published') : t('dashboard.private') }}
                  </PixelBadge>
                </div>

                <p v-if="quiz.description" class="text-lg text-muted-foreground mb-4">{{ quiz.description }}</p>
                <p v-else class="text-lg text-muted-foreground italic mb-4">{{ t('common.noDescription') }}</p>

                <div v-if="quiz.tags?.length" class="flex flex-wrap items-start gap-2">
                  <PixelBadge v-for="tag in quiz.tags" :key="tag" variant="primary">{{ tag }}</PixelBadge>
                </div>
              </div>

              <div class="flex flex-wrap justify-start gap-8 py-6 border-y-2 border-border">
                <div>
                  <div class="text-xl font-extrabold text-foreground">{{ quiz.playCount?.toLocaleString() || 0 }}</div>
                  <div class="text-sm text-muted-foreground">{{ t('libraryDetail.timesPlayed') }}</div>
                </div>
                <div>
                  <div class="text-xl font-extrabold text-foreground">{{ quiz.questions?.length || 0 }}</div>
                  <div class="text-sm text-muted-foreground">{{ t('libraryDetail.questions') }}</div>
                </div>
                <div>
                  <div class="text-xl font-extrabold text-foreground">{{ quiz.category || 'General' }}</div>
                  <div class="text-sm text-muted-foreground">{{ t('libraryDetail.category') }}</div>
                </div>
                <div>
                  <div class="text-xl font-extrabold text-foreground">{{ quiz.language?.toUpperCase() || 'EN' }}</div>
                  <div class="text-sm text-muted-foreground">{{ t('libraryDetail.language') }}</div>
                </div>
              </div>
            </PixelCard>

            <!-- Questions with Answers -->
            <PixelCard v-if="quiz.questions?.length" class="space-y-4">
              <h2 class="text-2xl font-bold">{{ t('libraryDetail.questionPreview') }}</h2>

              <div class="space-y-4">
                <div
                  v-for="(q, i) in quiz.questions"
                  :key="q._id || q.id"
                  class="p-5 bg-white border-[3px] border-black"
                >
                  <div class="flex items-start gap-4 mb-4">
                    <div class="w-8 h-8 bg-primary text-white border-2 border-black flex items-center justify-center font-bold text-sm shrink-0">
                      {{ i + 1 }}
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-lg mb-1">{{ q.text || t('libraryDetail.noText') }}</div>
                      <div class="text-xs text-muted-foreground">
                        <PixelBadge variant="secondary" class="mr-2">{{ getTypeLabel(q.type) }}</PixelBadge>
                        {{ q.timeLimit }}s
                      </div>
                    </div>
                  </div>

                  <!-- Answers for multiple-choice, true-false -->
                  <div v-if="q.answers?.length" class="ml-12 space-y-2">
                    <div
                      v-for="(answer, ai) in q.answers"
                      :key="ai"
                      class="flex items-center gap-3 p-2 border-2"
                      :class="answer.isCorrect ? 'border-success bg-success/10' : 'border-border'"
                    >
                      <span
                        class="w-6 h-6 flex items-center justify-center border-2 border-current text-xs font-bold shrink-0"
                        :class="answer.isCorrect ? 'bg-success text-white border-success' : 'bg-white'"
                      >
                        {{ String.fromCharCode(65 + ai) }}
                      </span>
                      <span :class="answer.isCorrect ? 'font-medium' : ''">{{ answer.text }}</span>
                      <svg
                        v-if="answer.isCorrect"
                        class="w-5 h-5 text-success ml-auto shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>

                  <!-- Slider config -->
                  <div
                    v-else-if="q.sliderConfig"
                    class="ml-12 mt-1 border-2 border-black bg-gradient-to-b from-muted/40 to-muted/70 px-4 py-3 pixel-shadow"
                  >
                    <div class="flex items-center justify-between gap-3 mb-2">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide bg-black text-white border border-white">
                        {{ t('questionTypes.slider') || 'Slider' }}
                      </span>
                      <span class="text-xs text-muted-foreground font-mono">
                        {{ q.timeLimit }}s
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-sm font-semibold">
                      <div class="flex flex-col">
                        <span class="text-[11px] text-muted-foreground uppercase">Range</span>
                        <span class="inline-flex items-center gap-1 font-mono">
                          <span class="px-2 py-0.5 bg-black text-white text-xs">
                            {{ q.sliderConfig.min }}
                          </span>
                          <span class="text-xs text-muted-foreground">–</span>
                          <span class="px-2 py-0.5 bg-black text-white text-xs">
                            {{ q.sliderConfig.max }}
                          </span>
                        </span>
                      </div>
                      <div class="flex flex-col items-end">
                        <span class="text-[11px] text-muted-foreground uppercase">Correct</span>
                        <span class="px-2 py-0.5 border-2 border-success bg-success/10 text-success text-sm font-bold font-mono">
                          {{ q.sliderConfig.correctValue }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Pin-answer preview -->
                  <div
                    v-else-if="q.type === 'pin-answer' && q.mediaUrl"
                    class="ml-12 mt-1 border-2 border-black bg-black px-3 py-3 pixel-shadow"
                  >
                    <div class="relative w-full max-w-md max-h-64 mx-auto overflow-hidden bg-black border-2 border-white">
                      <img
                        :src="resolveMediaUrl(q.mediaUrl)"
                        :alt="q.text"
                        class="w-full h-full object-contain"
                      />
                      <div
                        v-if="q.pinConfig"
                        class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 border-[3px] border-success bg-success/20 shadow-[3px_3px_0_rgba(0,0,0,0.9)] rotate-45"
                        :style="{
                          left: `${q.pinConfig.x}%`,
                          top: `${q.pinConfig.y}%`,
                          width: `${(q.pinConfig.radius || 8) * 2}%`,
                          height: `${(q.pinConfig.radius || 8) * 2}%`
                        }"
                      />
                      <div
                        v-if="q.pinConfig"
                        class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                        :style="{ left: `${q.pinConfig.x}%`, top: `${q.pinConfig.y}%` }"
                      >
                        <div
                          class="flex h-7 w-7 items-center justify-center border-[3px] border-black bg-success text-xs font-bold text-white shadow-[3px_3px_0_#000] rotate-45"
                        >
                          <div class="-rotate-45">
                            ✓
                          </div>
                        </div>
                      </div>
                    </div>
                    <p class="mt-2 text-[11px] text-muted-foreground text-center">
                      Players must tap inside the highlighted area on the image to be counted as correct.
                    </p>
                  </div>
                </div>
              </div>
            </PixelCard>

            <PixelCard v-else class="text-center py-8">
              <p class="text-muted-foreground">{{ t('libraryDetail.noQuestionsYet') }}</p>
            </PixelCard>
          </div>

          <!-- Sidebar -->
          <div class="lg:col-span-1 space-y-4">
            <PixelCard variant="primary" class="space-y-4 sticky top-24 !bg-primary/20 backdrop-blur-md border border-border">
              <PixelButton
                variant="primary"
                class="w-full text-xl py-6 !bg-primary-dark hover:!bg-primary"
                :disabled="starting || !quiz.questions?.length"
                @click="startQuiz"
              >
                <svg class="inline mr-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {{ starting ? t('libraryDetail.starting') : t('libraryDetail.startQuiz') }}
              </PixelButton>

              <PixelButton
                variant="secondary"
                class="w-full text-sm py-3 mt-2"
                :disabled="practiceStarting || !quiz.questions?.length"
                @click="startPracticeRun"
              >
                {{ practiceStarting ? 'Starting practice run…' : 'Preview as player (single-player)' }}
              </PixelButton>

              <p v-if="!quiz.questions?.length" class="text-sm text-muted-foreground">{{ t('libraryDetail.noQuestionsYet') }}</p>
              <p v-if="startError" class="text-sm text-destructive">{{ startError }}</p>
              <p v-if="practiceError" class="text-sm text-destructive">{{ practiceError }}</p>

              <div class="pt-4 border-t-2 border-border space-y-3">
                <PixelButton
                  variant="secondary"
                  class="w-full"
                  @click="editQuiz"
                >
                  <svg class="inline mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {{ t('common.edit') }}
                </PixelButton>
              </div>
            </PixelCard>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
