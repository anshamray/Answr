<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';

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

    const data = await res.json();
    quizzes.value = data.quizzes;
    totalPages.value = data.pagination.totalPages;
    total.value = data.pagination.total;
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
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <router-link to="/" class="text-2xl font-bold tracking-tight hover:opacity-70 transition">Answr</router-link>
        <h1 class="text-lg font-semibold text-gray-700">Quiz Library</h1>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-8">
      <!-- Search & Sort -->
      <div class="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          v-model="search"
          type="text"
          placeholder="Search quizzes..."
          class="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-indigo-500 transition"
          @input="onSearchInput"
        />
        <select
          v-model="sort"
          class="border-2 border-gray-200 rounded-lg px-4 py-2.5 text-base bg-white focus:outline-none focus:border-indigo-500 transition"
        >
          <option value="newest">Newest</option>
          <option value="popular">Most Played</option>
          <option value="title">A – Z</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-gray-400 text-lg">Loading...</div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20 text-red-500">{{ error }}</div>

      <!-- Empty -->
      <div v-else-if="quizzes.length === 0" class="text-center py-20">
        <p class="text-gray-400 text-lg mb-2">No quizzes found</p>
        <p class="text-gray-300 text-sm">Try a different search or check back later.</p>
      </div>

      <!-- Quiz Grid -->
      <div v-else>
        <p class="text-sm text-gray-400 mb-4">{{ total }} quiz{{ total !== 1 ? 'zes' : '' }} in library</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            v-for="quiz in quizzes"
            :key="quiz.id"
            class="text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-md transition group"
            @click="viewQuiz(quiz.id)"
          >
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition line-clamp-1">{{ quiz.title }}</h3>
              <span
                v-if="quiz.isOfficial"
                class="ml-2 shrink-0 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full"
              >Official</span>
            </div>
            <p class="text-gray-500 text-sm mb-3 line-clamp-2">{{ quiz.description || 'No description' }}</p>
            <div class="flex items-center justify-between text-xs text-gray-400">
              <span>by {{ quiz.author }}</span>
              <span>{{ quiz.playCount }} plays</span>
            </div>
            <div v-if="quiz.tags?.length" class="flex flex-wrap gap-1 mt-2">
              <span
                v-for="tag in quiz.tags.slice(0, 3)"
                :key="tag"
                class="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
              >{{ tag }}</span>
            </div>
          </button>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-8">
          <button
            class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-100 disabled:opacity-30 transition"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >Prev</button>
          <span class="text-sm text-gray-500">{{ page }} / {{ totalPages }}</span>
          <button
            class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-100 disabled:opacity-30 transition"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >Next</button>
        </div>
      </div>
    </main>
  </div>
</template>
