<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiUrl } from '../lib/api.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';
import PixelStar from '../components/icons/PixelStar.vue';

const router = useRouter();

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

    const res = await fetch(apiUrl(`/api/library?${params}`));
    if (!res.ok) throw new Error('Failed to load library');

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
  }, 300);
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
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
          <span class="text-xl font-bold text-primary pixel-font">Answr</span>
        </router-link>
        <div class="flex items-center gap-3">
          <router-link to="/login">
            <PixelButton variant="outline" size="sm">Sign In</PixelButton>
          </router-link>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Header -->
      <div class="space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 class="text-4xl font-bold mb-2">Quiz Library</h1>
            <p class="text-muted-foreground">Discover thousands of community-created quizzes</p>
          </div>

          <router-link to="/login">
            <PixelButton variant="primary">
              <svg class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Quiz
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
              placeholder="Search quizzes..."
              class="w-full pl-12 pr-4 py-3 border-[3px] border-black focus:outline-none focus:ring-4 focus:ring-primary/30 bg-white"
              @input="onSearchInput"
            />
          </div>

          <select
            v-model="sort"
            class="px-6 py-3 border-[3px] border-black bg-white focus:outline-none focus:ring-4 focus:ring-primary/30"
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="title">A – Z</option>
          </select>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">Loading...</div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20 text-destructive">{{ error }}</div>

      <!-- Empty -->
      <div v-else-if="quizzes.length === 0" class="text-center py-20">
        <p class="text-muted-foreground text-lg mb-2">No quizzes found</p>
        <p class="text-muted-foreground/60 text-sm">Try a different search or check back later.</p>
      </div>

      <!-- Quiz Grid -->
      <div v-else>
        <!-- Featured Section (if we have quizzes marked as official) -->
        <div v-if="quizzes.some(q => q.isOfficial)" class="mb-8">
          <div class="flex items-center gap-2 mb-4">
            <PixelStar class="text-warning" :size="24" />
            <h2 class="text-2xl font-bold">Featured Quizzes</h2>
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
                    <p class="text-muted-foreground mb-3">{{ quiz.description || 'No description' }}</p>
                  </div>
                  <PixelBadge variant="warning" class="ml-2 shrink-0">
                    <PixelStar class="inline mr-1" :size="10" />
                    Featured
                  </PixelBadge>
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
                    <span>{{ quiz.questionCount || 0 }} questions</span>
                  </div>
                  <PixelButton variant="primary" size="sm">Play</PixelButton>
                </div>
              </PixelCard>
            </button>
          </div>
        </div>

        <!-- All Quizzes -->
        <div>
          <h2 class="text-2xl font-bold mb-4">All Quizzes</h2>
          <p class="text-sm text-muted-foreground mb-4">{{ total }} quiz{{ total !== 1 ? 'zes' : '' }} in library</p>

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
                  <PixelBadge v-if="quiz.isOfficial" variant="primary" class="ml-2 shrink-0">Official</PixelBadge>
                </div>
                <p class="text-sm text-muted-foreground line-clamp-2">{{ quiz.description || 'No description' }}</p>

                <div v-if="quiz.tags?.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in quiz.tags.slice(0, 3)"
                    :key="tag"
                    class="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium"
                  >{{ tag }}</span>
                </div>

                <div class="flex items-center justify-between pt-2 border-t-2 border-border text-xs text-muted-foreground">
                  <span>by {{ quiz.author }}</span>
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
          >Prev</PixelButton>
          <span class="text-sm text-muted-foreground font-medium">{{ page }} / {{ totalPages }}</span>
          <PixelButton
            variant="outline"
            size="sm"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >Next</PixelButton>
        </div>
      </div>
    </main>
  </div>
</template>
