<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import PixelButton from '../components/PixelButton.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';

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

    const res = await fetch(`/api/library?${params}`);
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
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
          <PixelLogo class="text-primary" :size="28" />
          <span class="text-xl font-bold text-primary pixel-font">Answr</span>
        </router-link>
        <h1 class="text-lg font-bold text-foreground">Quiz Library</h1>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Search & Sort -->
      <div class="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          v-model="search"
          type="text"
          placeholder="Search quizzes..."
          class="flex-1 border-[3px] border-black px-4 py-2.5 text-base focus:outline-none focus:ring-4 focus:ring-primary/30 transition bg-white"
          @input="onSearchInput"
        />
        <select
          v-model="sort"
          class="border-[3px] border-black px-4 py-2.5 text-base bg-white focus:outline-none focus:ring-4 focus:ring-primary/30 transition"
        >
          <option value="newest">Newest</option>
          <option value="popular">Most Played</option>
          <option value="title">A – Z</option>
        </select>
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
        <p class="text-sm text-muted-foreground mb-4">{{ total }} quiz{{ total !== 1 ? 'zes' : '' }} in library</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            v-for="quiz in quizzes"
            :key="quiz.id"
            class="text-left border-[3px] border-black bg-card p-5 pixel-shadow hover:border-primary hover:-translate-y-1 transition-all duration-200 group"
            @click="viewQuiz(quiz.id)"
          >
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-bold text-lg text-foreground group-hover:text-primary transition line-clamp-1">{{ quiz.title }}</h3>
              <PixelBadge v-if="quiz.isOfficial" variant="primary" class="ml-2 shrink-0">Official</PixelBadge>
            </div>
            <p class="text-muted-foreground text-sm mb-3 line-clamp-2">{{ quiz.description || 'No description' }}</p>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>by {{ quiz.author }}</span>
              <div class="flex items-center gap-1">
                <PixelUsers :size="14" />
                <span>{{ quiz.playCount }} plays</span>
              </div>
            </div>
            <div v-if="quiz.tags?.length" class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="tag in quiz.tags.slice(0, 3)"
                :key="tag"
                class="bg-muted text-muted-foreground text-xs px-2 py-0.5 border border-border"
              >{{ tag }}</span>
            </div>
          </button>
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
