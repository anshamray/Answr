<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';

const router = useRouter();
const auth = useAuthStore();

const quizzes = ref([]);
const loading = ref(true);
const error = ref('');
const filter = ref('all');
const view = ref('grid');

async function fetchQuizzes() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/quizzes', {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) throw new Error('Failed to load quizzes');
    const json = await res.json();
    quizzes.value = json.data?.quizzes ?? json.data ?? [];
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function startSession(quizId) {
  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ quizId })
    });
    if (!res.ok) throw new Error('Failed to start session');
    const json = await res.json();
    const session = json.data?.session;
    router.push(`/session/${session._id || session.id}/lobby`);
  } catch (err) {
    alert(err.message);
  }
}

function editQuiz(quizId) {
  router.push(`/quiz/${quizId}/edit`);
}

async function deleteQuiz(quizId) {
  if (!confirm('Are you sure you want to delete this quiz?')) return;
  try {
    const res = await fetch(`/api/quizzes/${quizId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (!res.ok) throw new Error('Failed to delete quiz');
    quizzes.value = quizzes.value.filter(q => (q._id || q.id) !== quizId);
  } catch (err) {
    alert(err.message);
  }
}

function handleLogout() {
  auth.logout();
  router.push('/');
}

function createNewQuiz() {
  router.push('/quiz/new/edit');
}

const totalPlays = ref(0);

onMounted(async () => {
  await fetchQuizzes();
  totalPlays.value = quizzes.value.reduce((sum, q) => sum + (q.playCount || 0), 0);
});
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
          <router-link to="/library" class="text-sm text-muted-foreground hover:text-primary transition">Library</router-link>
          <span class="text-muted-foreground text-sm">{{ auth.user?.name || auth.user?.email }}</span>
          <button
            class="text-sm text-muted-foreground hover:text-destructive transition"
            @click="handleLogout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold mb-2">My Quizzes</h1>
          <p class="text-muted-foreground">Create and manage your quiz collection</p>
        </div>

        <PixelButton variant="primary" class="text-lg" @click="createNewQuiz">
          <svg class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create New Quiz
        </PixelButton>
      </div>

      <!-- Stats -->
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PixelCard variant="primary" class="text-center">
          <div class="text-4xl font-bold text-primary">{{ quizzes.length }}</div>
          <div class="text-sm text-muted-foreground">Total Quizzes</div>
        </PixelCard>
        <PixelCard variant="secondary" class="text-center">
          <div class="text-4xl font-bold text-secondary">{{ totalPlays }}</div>
          <div class="text-sm text-muted-foreground">Total Plays</div>
        </PixelCard>
        <PixelCard variant="accent" class="text-center">
          <div class="text-4xl font-bold text-accent">{{ quizzes.reduce((s, q) => s + (q.questionCount || q.questions?.length || 0), 0) }}</div>
          <div class="text-sm text-muted-foreground">Total Questions</div>
        </PixelCard>
        <PixelCard class="text-center">
          <div class="text-4xl font-bold text-success">{{ quizzes.filter(q => q.isPublished).length }}</div>
          <div class="text-sm text-muted-foreground">Published</div>
        </PixelCard>
      </div>

      <!-- Filters -->
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          <button
            class="px-4 py-2 border-2 font-medium transition-colors"
            :class="filter === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:bg-primary/5'"
            @click="filter = 'all'"
          >
            All
          </button>
          <button
            class="px-4 py-2 border-2 font-medium transition-colors"
            :class="filter === 'published' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:bg-primary/5'"
            @click="filter = 'published'"
          >
            Published
          </button>
          <button
            class="px-4 py-2 border-2 font-medium transition-colors"
            :class="filter === 'draft' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:bg-primary/5'"
            @click="filter = 'draft'"
          >
            Drafts
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

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">Loading...</div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20 text-destructive">{{ error }}</div>

      <!-- Empty State -->
      <div v-else-if="quizzes.length === 0">
        <PixelCard class="text-center py-16 space-y-6">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-primary/10 border-2 border-primary">
            <svg class="text-primary" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div>
            <h3 class="text-2xl font-bold mb-2">No quizzes yet</h3>
            <p class="text-muted-foreground max-w-md mx-auto">
              Create your first quiz and start engaging your audience with interactive questions
            </p>
          </div>
          <PixelButton variant="primary" class="text-lg" @click="createNewQuiz">
            <svg class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Your First Quiz
          </PixelButton>
        </PixelCard>
      </div>

      <!-- Quiz Grid -->
      <div v-else :class="view === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'">
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
                  <span>{{ quiz.questionCount || quiz.questions?.length || 0 }} questions</span>
                  <span>·</span>
                  <span>{{ quiz.playCount || 0 }} plays</span>
                </div>
              </div>
              <PixelBadge :variant="quiz.isPublished ? 'success' : 'warning'">
                {{ quiz.isPublished ? 'published' : 'draft' }}
              </PixelBadge>
            </div>

            <div class="flex items-center gap-2">
              <PixelButton variant="primary" size="sm" class="flex-1" @click="startSession(quiz._id || quiz.id)">
                <svg class="inline mr-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Start
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

            <div class="text-xs text-muted-foreground pt-2 border-t-2 border-border">
              {{ quiz.questionCount || quiz.questions?.length || 0 }} questions
            </div>
          </PixelCard>
        </template>
      </div>
    </main>
  </div>
</template>
