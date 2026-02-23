<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import UserDropdown from '../components/UserDropdown.vue';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const quizzes = ref([]);
const favoriteQuizzes = ref([]);
const loading = ref(true);
const error = ref('');
const actionError = ref(''); // Error for quiz actions (start, publish, delete)
const filter = ref('all');
const view = ref('grid');
const publishDialogQuiz = ref(null);
const unpublishDialogQuiz = ref(null);
const favoritesLoading = ref(false);

async function fetchQuizzes() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch(apiUrl('/api/quizzes'), {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) throw new Error(t('errors.failedToLoadQuizzes'));
    const json = await res.json();
    quizzes.value = json.data?.quizzes ?? json.data ?? [];
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function fetchFavorites() {
  favoritesLoading.value = true;
  try {
    const res = await fetch(apiUrl('/api/favorites'), {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) throw new Error(t('errors.failedToLoadFavorites'));
    const json = await res.json();
    favoriteQuizzes.value = json.data?.quizzes ?? [];
  } catch (err) {
    actionError.value = err.message;
  } finally {
    favoritesLoading.value = false;
  }
}

function handleFilterChange(newFilter) {
  filter.value = newFilter;
  if (newFilter === 'favorites' && favoriteQuizzes.value.length === 0) {
    fetchFavorites();
  }
}

function viewLibraryQuiz(quizId) {
  router.push(`/library/${quizId}`);
}

async function startSession(quizId) {
  actionError.value = '';
  try {
    const res = await fetch(apiUrl('/api/sessions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ quizId })
    });
    if (!res.ok) throw new Error(t('errors.failedToStartSession'));
    const json = await res.json();
    const session = json.data?.session;
    router.push(`/session/${session._id || session.id}/lobby`);
  } catch (err) {
    actionError.value = err.message;
  }
}

function editQuiz(quizId) {
  router.push(`/quiz/${quizId}/edit`);
}

function openPublishDialog(quizId) {
  actionError.value = '';
  const quiz = quizzes.value.find(q => (q._id || q.id) === quizId);
  const qCount = quiz?.questionCount ?? quiz?.questions?.length ?? 0;
  if (qCount < 1) {
    actionError.value = t('dashboard.needOneQuestion');
    return;
  }
  publishDialogQuiz.value = quiz;
}

function closePublishDialog() {
  publishDialogQuiz.value = null;
}

async function confirmPublish() {
  const quiz = publishDialogQuiz.value;
  if (!quiz) return;
  const quizId = quiz._id || quiz.id;
  actionError.value = '';
  try {
    const tags = Array.isArray(quiz.tags) ? quiz.tags : [];
    const res = await fetch(apiUrl(`/api/library/publish/${quizId}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ tags })
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message || t('errors.failedToPublish'));
    }
    const q = quizzes.value.find(q => (q._id || q.id) === quizId);
    if (q) q.isPublished = true;
    closePublishDialog();
  } catch (err) {
    actionError.value = err.message;
  }
}

function openUnpublishDialog(quizId) {
  unpublishDialogQuiz.value = quizzes.value.find(q => (q._id || q.id) === quizId);
}

function closeUnpublishDialog() {
  unpublishDialogQuiz.value = null;
}

async function confirmUnpublish() {
  const quiz = unpublishDialogQuiz.value;
  if (!quiz) return;
  const quizId = quiz._id || quiz.id;
  actionError.value = '';
  try {
    const res = await fetch(apiUrl(`/api/library/unpublish/${quizId}`), {
      method: 'PUT',
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message || t('errors.failedToUnpublish'));
    }
    const q = quizzes.value.find(q => (q._id || q.id) === quizId);
    if (q) q.isPublished = false;
    closeUnpublishDialog();
  } catch (err) {
    actionError.value = err.message;
  }
}

async function deleteQuiz(quizId) {
  if (!confirm(t('dashboard.deleteConfirm'))) return;
  actionError.value = '';
  try {
    const res = await fetch(apiUrl(`/api/quizzes/${quizId}`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) throw new Error(t('errors.failedToDelete'));
    quizzes.value = quizzes.value.filter(q => (q._id || q.id) !== quizId);
  } catch (err) {
    actionError.value = err.message;
  }
}

function handleLogout() {
  auth.logout();
  router.push('/');
}

function createNewQuiz() {
  router.push('/quiz/new/edit');
}

const totalPlays = computed(() =>
  quizzes.value.reduce((sum, q) => sum + (q.playCount || 0), 0)
);

const favoritesCount = computed(() => favoriteQuizzes.value.length);

const verificationSending = ref(false);
const verificationSent = ref(false);
const verificationError = ref('');

async function resendVerification() {
  verificationSending.value = true;
  verificationError.value = '';
  try {
    await auth.resendVerification();
    verificationSent.value = true;
  } catch (err) {
    verificationError.value = err.message;
  } finally {
    verificationSending.value = false;
  }
}

onMounted(fetchQuizzes);
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
            <span class="text-xl font-bold text-primary pixel-font">Answr</span>
          </router-link>
        </div>
        <div class="flex items-center gap-4">
          <router-link to="/library" class="text-sm text-muted-foreground hover:text-primary transition">{{ t('nav.library') }}</router-link>
          <router-link to="/dashboard" class="text-sm text-primary font-medium">{{ t('nav.dashboard') }}</router-link>
          <LanguageSwitcher />
          <UserDropdown />
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Email Verification Banner -->
      <div
        v-if="auth.user && !auth.user.emailVerified"
        class="bg-warning/10 border-2 border-warning p-4 flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div class="flex-1">
          <p class="font-medium text-warning-foreground">
            {{ t('verification.pleaseVerify') }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ t('verification.checkInbox') }}
          </p>
          <p v-if="verificationError" class="text-sm text-destructive mt-1">{{ verificationError }}</p>
          <p v-if="verificationSent" class="text-sm text-success mt-1">{{ t('verification.emailSent') }}</p>
        </div>
        <button
          class="px-4 py-2 bg-warning text-warning-foreground font-medium border-2 border-black hover:opacity-90 transition disabled:opacity-50"
          :disabled="verificationSending || verificationSent"
          @click="resendVerification"
        >
          <template v-if="verificationSending">{{ t('verification.sending') }}</template>
          <template v-else-if="verificationSent">{{ t('verification.sent') }}</template>
          <template v-else>{{ t('verification.resendEmail') }}</template>
        </button>
      </div>

      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold mb-2">{{ t('dashboard.title') }}</h1>
          <p class="text-muted-foreground">{{ t('dashboard.subtitle') }}</p>
        </div>

        <PixelButton variant="primary" class="text-lg" @click="createNewQuiz">
          <svg class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {{ t('dashboard.createNewQuiz') }}
        </PixelButton>
      </div>

      <!-- Stats -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <PixelCard variant="primary" class="text-center">
          <div class="text-4xl font-bold text-primary">{{ quizzes.length }}</div>
          <div class="text-sm text-muted-foreground">{{ t('dashboard.totalQuizzes') }}</div>
        </PixelCard>
        <PixelCard variant="secondary" class="text-center">
          <div class="text-4xl font-bold text-secondary">{{ totalPlays }}</div>
          <div class="text-sm text-muted-foreground">{{ t('dashboard.totalPlays') }}</div>
        </PixelCard>
        <PixelCard variant="accent" class="text-center">
          <div class="text-4xl font-bold text-accent">{{ quizzes.reduce((s, q) => s + (q.questionCount || q.questions?.length || 0), 0) }}</div>
          <div class="text-sm text-muted-foreground">{{ t('dashboard.totalQuestions') }}</div>
        </PixelCard>
        <PixelCard class="text-center">
          <div class="text-4xl font-bold text-success">{{ quizzes.filter(q => q.isPublished).length }}</div>
          <div class="text-sm text-muted-foreground">{{ t('dashboard.published') }}</div>
        </PixelCard>
        <PixelCard class="text-center cursor-pointer hover:border-accent transition-colors" @click="handleFilterChange('favorites')">
          <div class="text-4xl font-bold text-accent">{{ favoritesCount }}</div>
          <div class="text-sm text-muted-foreground">{{ t('dashboard.favorites') }}</div>
        </PixelCard>
      </div>

      <!-- Filters -->
      <div class="flex items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          <button
            class="px-4 py-2 border-2 font-medium transition-colors"
            :class="filter === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:bg-primary/5'"
            @click="handleFilterChange('all')"
          >
            {{ t('dashboard.filterAll') }}
          </button>
          <button
            class="px-4 py-2 border-2 font-medium transition-colors"
            :class="filter === 'published' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:bg-primary/5'"
            @click="handleFilterChange('published')"
          >
            {{ t('dashboard.filterPublished') }}
          </button>
          <button
            class="px-4 py-2 border-2 font-medium transition-colors"
            :class="filter === 'draft' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:bg-primary/5'"
            @click="handleFilterChange('draft')"
          >
            {{ t('dashboard.filterPrivate') }}
          </button>
          <button
            class="px-4 py-2 border-2 font-medium transition-colors flex items-center gap-2"
            :class="filter === 'favorites' ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent hover:bg-accent/5'"
            @click="handleFilterChange('favorites')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="filter === 'favorites' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {{ t('dashboard.favorites') }}
          </button>
        </div>

        <div class="flex gap-2">
          <button
            class="p-2 border-2"
            :class="view === 'grid' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'"
            @click="view = 'grid'"
          >
            <div class="grid grid-cols-2 gap-1">
              <div class="w-2 h-2 bg-current"></div><div class="w-2 h-2 bg-current"></div>
              <div class="w-2 h-2 bg-current"></div><div class="w-2 h-2 bg-current"></div>
            </div>
          </button>
          <button
            class="p-2 border-2"
            :class="view === 'list' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary'"
            @click="view = 'list'"
          >
            <div class="space-y-1">
              <div class="w-6 h-1 bg-current"></div><div class="w-6 h-1 bg-current"></div><div class="w-6 h-1 bg-current"></div>
            </div>
          </button>
        </div>
      </div>

      <!-- Action Error Toast -->
      <div
        v-if="actionError"
        class="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 border-2 border-black pixel-shadow z-50"
      >
        <div class="flex items-center gap-3">
          <span>{{ actionError }}</span>
          <button @click="actionError = ''" class="hover:opacity-80">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading && filter !== 'favorites'" class="text-center py-20 text-muted-foreground text-lg">{{ t('common.loading') }}</div>

      <!-- Error -->
      <div v-else-if="error && filter !== 'favorites'" class="text-center py-20 text-destructive">{{ error }}</div>

      <!-- Favorites Section -->
      <div v-else-if="filter === 'favorites'">
        <div v-if="favoritesLoading" class="text-center py-20 text-muted-foreground text-lg">{{ t('dashboard.loadingFavorites') }}</div>

        <div v-else-if="favoriteQuizzes.length === 0">
          <PixelCard class="text-center py-16 space-y-6">
            <div class="inline-flex items-center justify-center w-24 h-24 bg-accent/10 border-2 border-accent">
              <svg class="text-accent" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <h3 class="text-2xl font-bold mb-2">{{ t('dashboard.noFavoritesTitle') }}</h3>
              <p class="text-muted-foreground max-w-md mx-auto">
                {{ t('dashboard.noFavoritesSubtitle') }}
              </p>
            </div>
            <router-link to="/library">
              <PixelButton variant="primary" class="text-lg">
                {{ t('landing.browseLibrary') }}
              </PixelButton>
            </router-link>
          </PixelCard>
        </div>

        <div v-else :class="view === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'">
          <PixelCard
            v-for="quiz in favoriteQuizzes"
            :key="quiz.id"
            class="space-y-4 hover:border-accent transition-all group cursor-pointer"
            @click="viewLibraryQuiz(quiz.id)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-xl font-bold mb-2 group-hover:text-accent transition-colors">
                  {{ quiz.title }}
                </h3>
                <p class="text-sm text-muted-foreground line-clamp-2 mb-2">{{ quiz.description || t('common.noDescription') }}</p>
                <div class="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{{ t('common.by') }} {{ quiz.author }}</span>
                  <span>·</span>
                  <span>{{ t('common.plays', quiz.playCount || 0) }}</span>
                </div>
              </div>
              <svg class="text-accent shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>

            <div v-if="quiz.tags?.length" class="flex flex-wrap gap-2">
              <span
                v-for="tag in quiz.tags.slice(0, 3)"
                :key="tag"
                class="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium"
              >{{ tag }}</span>
            </div>

            <div class="flex items-center justify-between pt-2 border-t-2 border-border">
              <span class="text-xs text-muted-foreground">{{ quiz.category || 'General' }}</span>
              <PixelButton variant="accent" size="sm" @click.stop="viewLibraryQuiz(quiz.id)">
                <svg class="inline mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {{ t('common.play') }}
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="quizzes.length === 0">
        <PixelCard class="text-center py-16 space-y-6">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-primary/10 border-2 border-primary">
            <svg class="text-primary" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div>
            <h3 class="text-2xl font-bold mb-2">{{ t('dashboard.noQuizzesTitle') }}</h3>
            <p class="text-muted-foreground max-w-md mx-auto">
              {{ t('dashboard.noQuizzesSubtitle') }}
            </p>
          </div>
          <PixelButton variant="primary" class="text-lg" @click="createNewQuiz">
            <svg class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ t('dashboard.createFirstQuiz') }}
          </PixelButton>
        </PixelCard>
      </div>

      <!-- Quiz Grid -->
      <div v-else-if="filter !== 'favorites'" :class="view === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'">
        <template v-for="quiz in quizzes" :key="quiz._id || quiz.id">
          <PixelCard
            v-if="filter === 'all' || (filter === 'published' && quiz.isPublished) || (filter === 'draft' && !quiz.isPublished)"
            class="space-y-4 hover:border-primary transition-all group"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {{ quiz.title }}
                </h3>
                <div class="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{{ t('common.questions', quiz.questionCount || quiz.questions?.length || 0) }}</span>
                  <span>·</span>
                  <span>{{ t('common.plays', quiz.playCount || 0) }}</span>
                </div>
              </div>
              <PixelBadge :variant="quiz.isPublished ? 'success' : 'warning'">
                {{ quiz.isPublished ? t('dashboard.published') : t('dashboard.private') }}
              </PixelBadge>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <PixelButton variant="primary" size="sm" class="flex-1 min-w-0" @click="startSession(quiz._id || quiz.id)">
                <svg class="inline mr-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {{ t('common.start') }}
              </PixelButton>
              <button
                class="p-2 border-2 border-border hover:border-secondary hover:bg-secondary/10 transition-colors"
                @click="editQuiz(quiz._id || quiz.id)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                class="p-2 border-2 border-border hover:border-destructive hover:bg-destructive/10 transition-colors"
                @click="deleteQuiz(quiz._id || quiz.id)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>

            <div class="pt-2 border-t-2 border-border">
              <PixelButton
                v-if="!quiz.isPublished"
                variant="secondary"
                size="sm"
                class="w-full"
                @click="openPublishDialog(quiz._id || quiz.id)"
                :title="t('dashboard.publishToLibrary')"
              >
                {{ t('dashboard.publish') }}
              </PixelButton>
              <PixelButton
                v-else
                variant="outline"
                size="sm"
                class="w-full"
                @click="openUnpublishDialog(quiz._id || quiz.id)"
              >
                {{ t('dashboard.unpublish') }}
              </PixelButton>
            </div>
          </PixelCard>
        </template>
      </div>
    </main>

    <!-- Publish Dialog -->
    <div
      v-if="publishDialogQuiz"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      @click.self="closePublishDialog"
    >
      <div class="bg-white border-[3px] border-black pixel-shadow max-w-lg w-full p-6 space-y-4">
        <h3 class="text-xl font-bold">{{ t('dashboard.publishToLibrary') }}</h3>
        <p class="text-muted-foreground">
          {{ t('dashboard.publishDescription') }}
        </p>
        <div
          v-if="!publishDialogQuiz.description?.trim() || !publishDialogQuiz.tags?.length"
          class="p-4 border-2 border-warning bg-warning/10 text-warning"
        >
          <p class="text-sm font-medium">
            <template v-if="!publishDialogQuiz.description?.trim() && !publishDialogQuiz.tags?.length">
              {{ t('dashboard.needDescriptionAndTags') }}
            </template>
            <template v-else-if="!publishDialogQuiz.description?.trim()">
              {{ t('dashboard.needDescription') }}
            </template>
            <template v-else>
              {{ t('dashboard.needTags') }}
            </template>
          </p>
        </div>
        <div class="space-y-3 border-2 border-border p-4 bg-muted/30">
          <div>
            <span class="text-xs font-medium text-muted-foreground">{{ t('dashboard.titleLabel') }}</span>
            <p class="font-medium">{{ publishDialogQuiz.title || t('dashboard.untitledQuiz') }}</p>
          </div>
          <div v-if="publishDialogQuiz.description">
            <span class="text-xs font-medium text-muted-foreground">{{ t('dashboard.descriptionLabel') }}</span>
            <p class="text-sm">{{ publishDialogQuiz.description }}</p>
          </div>
          <div v-if="publishDialogQuiz.tags?.length">
            <span class="text-xs font-medium text-muted-foreground">{{ t('dashboard.tagsLabel') }}</span>
            <p class="text-sm">
              <span
                v-for="tag in publishDialogQuiz.tags"
                :key="tag"
                class="inline-block bg-primary/10 text-primary px-2 py-0.5 mr-1 mb-1 text-xs"
              >
                {{ tag }}
              </span>
            </p>
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          <PixelButton variant="outline" size="sm" @click="editQuiz(publishDialogQuiz._id || publishDialogQuiz.id); closePublishDialog()">
            {{ t('common.edit') }}
          </PixelButton>
          <PixelButton variant="primary" size="sm" @click="confirmPublish">
            {{ t('dashboard.publish') }}
          </PixelButton>
          <PixelButton variant="outline" size="sm" @click="closePublishDialog">
            {{ t('common.cancel') }}
          </PixelButton>
        </div>
      </div>
    </div>

    <!-- Unpublish Dialog -->
    <div
      v-if="unpublishDialogQuiz"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      @click.self="closeUnpublishDialog"
    >
      <div class="bg-white border-[3px] border-black pixel-shadow max-w-lg w-full p-6 space-y-4">
        <h3 class="text-xl font-bold">{{ t('dashboard.unpublishTitle') }}</h3>
        <p class="text-muted-foreground">
          {{ t('dashboard.unpublishDescription') }}
        </p>
        <p class="font-medium">{{ unpublishDialogQuiz.title || t('dashboard.untitledQuiz') }}</p>
        <div class="flex gap-2">
          <PixelButton variant="outline" size="sm" @click="confirmUnpublish">
            {{ t('dashboard.unpublish') }}
          </PixelButton>
          <PixelButton variant="primary" size="sm" @click="closeUnpublishDialog">
            {{ t('common.cancel') }}
          </PixelButton>
        </div>
      </div>
    </div>
  </div>
</template>
