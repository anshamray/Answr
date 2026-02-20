<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { apiUrl } from '../lib/api.js';
import { getTypeLabel } from '../lib/questionTypes.js';
import { useAuthStore } from '../stores/authStore.js';
import { STORAGE_KEYS } from '../constants/index.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const quiz = ref(null);
const loading = ref(true);
const error = ref('');
const starting = ref(false);
const startError = ref('');
const showAuthPrompt = ref(false);
const favoriteMessage = ref('');
const isFavorited = ref(false);
const favoriteLoading = ref(false);
const duplicating = ref(false);
const duplicateError = ref('');

async function handleDuplicateAndEdit() {
  if (!auth.isAuthenticated) {
    showAuthPrompt.value = true;
    return;
  }

  duplicating.value = true;
  duplicateError.value = '';

  try {
    const res = await fetch(apiUrl(`/api/library/${route.params.id}/clone`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to clone quiz');
    }

    const json = await res.json();
    const clonedQuizId = json.data?.quiz?.id;

    router.push(`/quiz/${clonedQuizId}/edit`);
  } catch (err) {
    duplicateError.value = err.message;
  } finally {
    duplicating.value = false;
  }
}

async function handleFavoriteClick() {
  if (!auth.isAuthenticated) {
    showAuthPrompt.value = true;
    favoriteMessage.value = '';
    return;
  }

  showAuthPrompt.value = false;
  favoriteLoading.value = true;
  favoriteMessage.value = '';

  try {
    if (isFavorited.value) {
      const success = await auth.removeFavorite(quiz.value.id);
      if (success) {
        isFavorited.value = false;
        favoriteMessage.value = t('libraryDetail.removedFromFavorites');
      } else {
        favoriteMessage.value = t('libraryDetail.failedToRemove');
      }
    } else {
      const success = await auth.addFavorite(quiz.value.id);
      if (success) {
        isFavorited.value = true;
        favoriteMessage.value = t('libraryDetail.addedToFavorites');
      } else {
        favoriteMessage.value = t('libraryDetail.failedToAdd');
      }
    }
  } catch {
    favoriteMessage.value = t('libraryDetail.errorOccurred');
  } finally {
    favoriteLoading.value = false;
  }
}

async function fetchQuiz() {
  loading.value = true;
  error.value = '';

  try {
    const headers = {};
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const res = await fetch(apiUrl(`/api/library/${route.params.id}`), { headers });
    if (!res.ok) throw new Error('Quiz not found');

    const json = await res.json();
    quiz.value = json.data?.quiz ?? null;
    isFavorited.value = quiz.value?.isFavorited ?? false;
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
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(apiUrl(`/api/library/${route.params.id}/start`), {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to start quiz');
    }

    const json = await res.json();
    const session = json.data?.session;

    if (session.guestToken) {
      sessionStorage.setItem(STORAGE_KEYS.GUEST_TOKEN, session.guestToken);
      sessionStorage.setItem(STORAGE_KEYS.GUEST_SESSION_ID, session.id);
    }

    router.push(`/session/${session.id}/lobby`);
  } catch (err) {
    startError.value = err.message;
  } finally {
    starting.value = false;
  }
}

onMounted(fetchQuiz);
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <router-link to="/library" class="text-sm font-medium text-muted-foreground hover:text-primary transition flex items-center gap-1">
          <span class="text-base">←</span> {{ t('libraryDetail.backToLibrary') }}
        </router-link>
        <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
          <span class="text-xl font-bold text-primary pixel-font">Answr</span>
        </router-link>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-8">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">{{ t('common.loading') }}</div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <p class="text-destructive text-lg mb-4">{{ error }}</p>
        <router-link to="/library" class="text-primary hover:underline">{{ t('libraryDetail.backToLibrary') }}</router-link>
      </div>

      <!-- Quiz Detail -->
      <div v-else-if="quiz" class="bg-gradient-to-br from-primary/5 to-secondary/5 -mx-4 px-4 py-8 lg:px-8">
        <div class="max-w-5xl mx-auto">
          <div class="grid lg:grid-cols-3 gap-8">
            <!-- Main Content -->
            <div class="lg:col-span-2 space-y-6">
              <PixelCard class="space-y-6">
                <div>
                  <div class="mb-4">
                    <h1 class="text-3xl lg:text-4xl font-bold">{{ quiz.title }}</h1>
                  </div>

                  <p v-if="quiz.description" class="text-lg text-muted-foreground mb-4">{{ quiz.description }}</p>

                  <div class="flex items-center gap-3 mb-6">
                    <span class="text-3xl">👨‍🏫</span>
                    <div>
                      <div class="text-sm text-muted-foreground">{{ t('libraryDetail.createdBy') }}</div>
                      <div class="font-bold">{{ quiz.author }}</div>
                    </div>
                  </div>

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
                    <div class="text-xl font-extrabold text-foreground">{{ quiz.questionCount || 0 }}</div>
                    <div class="text-sm text-muted-foreground">{{ t('libraryDetail.questions') }}</div>
                  </div>
                  <div>
                    <div class="text-xl font-extrabold text-foreground">{{ quiz.category || 'General' }}</div>
                    <div class="text-sm text-muted-foreground">{{ t('libraryDetail.category') }}</div>
                  </div>
                  <div>
                    <div class="text-xl font-extrabold text-foreground">{{ quiz.isOfficial ? t('libraryDetail.official') : t('libraryDetail.community') }}</div>
                    <div class="text-sm text-muted-foreground">{{ t('libraryDetail.source') }}</div>
                  </div>
                  <div>
                    <div class="text-xl font-extrabold text-foreground">{{ t('libraryDetail.english') }}</div>
                    <div class="text-sm text-muted-foreground">{{ t('libraryDetail.language') }}</div>
                  </div>
                </div>
              </PixelCard>

              <!-- Question Preview -->
              <PixelCard v-if="quiz.questions?.length" class="space-y-4">
                <h2 class="text-2xl font-bold">{{ t('libraryDetail.questionPreview') }}</h2>

                <div class="space-y-3">
                  <div
                    v-for="(q, i) in quiz.questions.slice(0, 5)"
                    :key="q.id"
                    class="flex items-start gap-4 p-5 bg-white border-[3px] border-black"
                  >
                    <div class="w-6 h-6 bg-primary text-white border-2 border-black flex items-center justify-center font-bold text-xs shrink-0">
                      {{ i + 1 }}
                    </div>
                    <div>
                      <div class="font-medium">{{ q.text || t('libraryDetail.noText') }}</div>
                      <div class="text-xs text-muted-foreground">{{ getTypeLabel(q.type) }} · {{ q.timeLimit }}s</div>
                    </div>
                  </div>

                  <div v-if="quiz.questions.length > 5" class="text-center text-sm text-muted-foreground py-3">
                    {{ t('libraryDetail.moreQuestions', { count: quiz.questions.length - 5 }) }}
                  </div>
                </div>
              </PixelCard>
            </div>

            <!-- Sidebar -->
            <div class="lg:col-span-1 space-y-4">
              <PixelCard variant="primary" class="space-y-4 sticky top-24 !bg-primary/20 backdrop-blur-md border border-border">
                <PixelButton
                  variant="primary"
                  class="w-full text-xl py-6 !bg-primary-dark hover:!bg-primary"
                  :disabled="starting || quiz.questionCount === 0"
                  @click="startQuiz"
                >
                  <svg class="inline mr-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  {{ starting ? t('libraryDetail.starting') : t('libraryDetail.startQuiz') }}
                </PixelButton>

                <p v-if="quiz.questionCount === 0" class="text-sm text-muted-foreground">{{ t('libraryDetail.noQuestionsYet') }}</p>
                <p v-if="startError" class="text-sm text-destructive">{{ startError }}</p>

                <div class="pt-4 border-t-2 border-border space-y-3">
                  <button
                    class="w-full flex items-center justify-center gap-2 py-3 border-[3px] border-black bg-white pixel-shadow hover:border-primary hover:bg-primary/5 transition-all font-medium disabled:opacity-50"
                    :disabled="favoriteLoading"
                    @click="handleFavoriteClick"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" :fill="isFavorited ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" :class="isFavorited ? 'text-accent' : ''">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    {{ favoriteLoading ? t('common.loading') : (isFavorited ? t('libraryDetail.savedToFavorites') : t('libraryDetail.saveToFavorites')) }}
                  </button>

                  <button
                    class="w-full flex items-center justify-center gap-2 py-3 border-[3px] border-black bg-white pixel-shadow hover:border-secondary hover:bg-secondary/5 transition-all font-medium disabled:opacity-50"
                    :disabled="duplicating"
                    @click="handleDuplicateAndEdit"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    {{ duplicating ? t('libraryDetail.duplicating') : t('libraryDetail.duplicateAndEdit') }}
                  </button>

                  <p v-if="duplicateError" class="text-sm text-destructive">{{ duplicateError }}</p>

                  <!-- Auth prompt for non-authenticated users -->
                  <div v-if="showAuthPrompt" class="p-3 bg-primary/10 border-2 border-primary text-sm">
                    <p class="text-foreground mb-2">{{ t('libraryDetail.authPrompt') }}</p>
                    <router-link to="/register" class="text-primary font-medium hover:underline">{{ t('libraryDetail.signUpFree') }} &rarr;</router-link>
                  </div>

                  <!-- Feedback for authenticated users -->
                  <p v-if="favoriteMessage" class="text-sm text-muted-foreground">{{ favoriteMessage }}</p>
                </div>
              </PixelCard>

            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
