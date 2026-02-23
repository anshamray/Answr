<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { apiUrl } from '../lib/api.js';
import { useAuthStore } from '../stores/authStore.js';
import { TIMING } from '../constants/index.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';
import PixelStar from '../components/icons/PixelStar.vue';
import AppHeader from '../components/AppHeader.vue';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const quizzes = ref([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
const sort = ref('newest');
const page = ref(1);
const totalPages = ref(1);
const total = ref(0);

let debounceTimer = null;

async function fetchLibrary() {
  loading.value = true;
  error.value = '';

  try {
    const params = new URLSearchParams();
    if (search.value.trim()) params.set('search', search.value.trim());
    params.set('sort', sort.value);
    params.set('page', page.value);
    params.set('limit', '12');

    const headers = {};
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const res = await fetch(apiUrl(`/api/library?${params}`), { headers });
    if (!res.ok) throw new Error(t('errors.failedToLoadLibrary'));

    const json = await res.json();
    quizzes.value = json.data?.quizzes ?? [];
    totalPages.value = json.data?.pagination?.totalPages ?? 1;
    total.value = json.data?.pagination?.total ?? 0;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    fetchLibrary();
  }, TIMING.SEARCH_DEBOUNCE_DELAY);
}

watch(sort, () => {
  page.value = 1;
  fetchLibrary();
});

function goToPage(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  fetchLibrary();
}

function viewQuiz(id) {
  router.push(`/library/${id}`);
}

onMounted(fetchLibrary);
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppHeader />

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Header -->
      <div class="space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 class="text-4xl font-bold mb-2">{{ t('library.title') }}</h1>
            <p class="text-muted-foreground">{{ t('library.subtitle') }}</p>
          </div>

          <router-link :to="auth.isAuthenticated ? '/dashboard' : '/login'">
            <PixelButton variant="primary">
              <svg class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {{ t('library.createQuiz') }}
            </PixelButton>
          </router-link>
        </div>

        <!-- Search and Filter -->
        <div class="flex flex-col sm:flex-row gap-3">
          <div class="flex-1 relative">
            <svg class="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="search"
              type="text"
              :placeholder="t('library.searchPlaceholder')"
              class="w-full pl-12 pr-4 py-3 border-[3px] border-black focus:outline-none focus:ring-4 focus:ring-primary/30 bg-white"
              @input="onSearchInput"
            />
          </div>

          <select
            v-model="sort"
            class="px-6 py-3 border-[3px] border-black bg-white focus:outline-none focus:ring-4 focus:ring-primary/30"
          >
            <option value="popular">{{ t('library.sortPopular') }}</option>
            <option value="newest">{{ t('library.sortNewest') }}</option>
            <option value="title">{{ t('library.sortTitle') }}</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">{{ t('common.loading') }}</div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20 text-destructive">{{ error }}</div>

      <!-- Empty -->
      <div v-else-if="quizzes.length === 0" class="text-center py-20">
        <p class="text-muted-foreground text-lg mb-2">{{ t('library.noResults') }}</p>
        <p class="text-muted-foreground/60 text-sm">{{ t('library.noResultsHint') }}</p>
      </div>

      <!-- Quiz Grid -->
      <div v-else>
        <!-- Featured Section (if we have quizzes marked as official) -->
        <div v-if="quizzes.some(q => q.isOfficial)" class="mb-8">
          <div class="flex items-center gap-2 mb-4">
            <PixelStar class="text-warning" :size="24" />
            <h2 class="text-2xl font-bold">{{ t('library.featured') }}</h2>
          </div>

          <div class="grid md:grid-cols-2 gap-6">
            <button
              v-for="quiz in quizzes.filter(q => q.isOfficial)"
              :key="'featured-' + quiz.id"
              class="text-left"
              @click="viewQuiz(quiz.id)"
            >
              <PixelCard variant="primary" class="space-y-4 hover:-translate-y-2 transition-all cursor-pointer h-full">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="text-2xl font-bold mb-2">{{ quiz.title }}</h3>
                    <p class="text-muted-foreground mb-3">{{ quiz.description || t('common.noDescription') }}</p>
                  </div>
                  <div class="flex items-center gap-2 ml-2 shrink-0">
                    <svg v-if="quiz.isFavorited" class="text-accent" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <PixelBadge variant="warning">
                      <PixelStar class="inline mr-1" :size="10" />
                      {{ t('library.featured') }}
                    </PixelBadge>
                  </div>
                </div>

                <div v-if="quiz.tags?.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in quiz.tags.slice(0, 3)"
                    :key="tag"
                    class="px-3 py-1 bg-primary/10 border border-primary text-primary text-xs font-medium"
                  >{{ tag }}</span>
                </div>

                <div class="flex items-center justify-between pt-3 border-t-2 border-border">
                  <div class="flex items-center gap-4 text-sm text-muted-foreground">
                    <span class="flex items-center gap-1">
                      <PixelUsers :size="16" />
                      {{ quiz.playCount?.toLocaleString() || 0 }}
                    </span>
                    <span>{{ t('common.questions', quiz.questionCount || 0) }}</span>
                  </div>
                  <PixelButton variant="primary" size="sm">{{ t('common.play') }}</PixelButton>
                </div>
              </PixelCard>
            </button>
          </div>
        </div>

        <!-- All Quizzes -->
        <div>
          <h2 class="text-2xl font-bold mb-4">{{ t('library.allQuizzes') }}</h2>
          <p class="text-sm text-muted-foreground mb-4">{{ t('library.quizzesInLibrary', total) }}</p>

          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="quiz in quizzes"
              :key="quiz.id"
              class="text-left"
              @click="viewQuiz(quiz.id)"
            >
              <PixelCard class="space-y-3 hover:border-primary transition-all cursor-pointer h-full">
                <div class="flex items-start justify-between">
                  <h3 class="text-xl font-bold group-hover:text-primary transition">{{ quiz.title }}</h3>
                  <div class="flex items-center gap-2 ml-2 shrink-0">
                    <svg v-if="quiz.isFavorited" class="text-accent" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <PixelBadge v-if="quiz.isOfficial" variant="primary">{{ t('library.official') }}</PixelBadge>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground line-clamp-2">{{ quiz.description || t('common.noDescription') }}</p>

                <div v-if="quiz.tags?.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in quiz.tags.slice(0, 3)"
                    :key="tag"
                    class="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium"
                  >{{ tag }}</span>
                </div>

                <div class="flex items-center justify-between pt-2 border-t-2 border-border text-xs text-muted-foreground">
                  <span>{{ t('common.by') }} {{ quiz.author }}</span>
                  <span class="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {{ quiz.playCount?.toLocaleString() || 0 }}
                  </span>
                </div>
              </PixelCard>
            </button>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 mt-8">
          <PixelButton
            variant="outline"
            size="sm"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >{{ t('common.prev') }}</PixelButton>
          <span class="text-sm text-muted-foreground font-medium">{{ page }} / {{ totalPages }}</span>
          <PixelButton
            variant="outline"
            size="sm"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >{{ t('common.next') }}</PixelButton>
        </div>
      </div>
    </main>
  </div>
</template>
