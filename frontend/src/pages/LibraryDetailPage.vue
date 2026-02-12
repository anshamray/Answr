<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const quiz = ref(null);
const loading = ref(true);
const error = ref('');
const starting = ref(false);
const startError = ref('');

async function fetchQuiz() {
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch(`/api/library/${route.params.id}`);
    if (!res.ok) throw new Error('Quiz not found');

    const data = await res.json();
    quiz.value = data.quiz;
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
    // Include auth token if available (logged-in user)
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/library/${route.params.id}/start`, {
      method: 'POST',
      headers
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to start quiz');
    }

    const data = await res.json();
    const session = data.session;

    // Store guest token if present (unauthenticated user)
    if (session.guestToken) {
      sessionStorage.setItem('guestToken', session.guestToken);
      sessionStorage.setItem('guestSessionId', session.id);
    }

    // Navigate to the lobby page
    router.push(`/session/${session.id}/lobby`);
  } catch (err) {
    startError.value = err.message;
  } finally {
    starting.value = false;
  }
}

const typeLabels = {
  'multiple-choice': 'Multiple Choice',
  'true-false': 'True / False',
  'type-answer': 'Type Answer',
  'puzzle': 'Puzzle',
  'quiz-audio': 'Audio Quiz',
  'slider': 'Slider',
  'pin-answer': 'Pin Answer',
  'poll': 'Poll',
  'word-cloud': 'Word Cloud',
  'brainstorm': 'Brainstorm',
  'drop-pin': 'Drop Pin',
  'open-ended': 'Open Ended',
  'scale': 'Scale',
  'nps-scale': 'NPS Scale'
};

onMounted(fetchQuiz);
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <router-link to="/library" class="text-sm text-gray-500 hover:text-black transition flex items-center gap-1">
          <span>&larr;</span> Back to Library
        </router-link>
        <router-link to="/" class="text-2xl font-bold tracking-tight hover:opacity-70 transition">Answr</router-link>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-gray-400 text-lg">Loading...</div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <p class="text-red-500 text-lg mb-4">{{ error }}</p>
        <router-link to="/library" class="text-indigo-600 hover:underline">Back to Library</router-link>
      </div>

      <!-- Quiz Detail -->
      <div v-else-if="quiz">
        <!-- Title & Meta -->
        <div class="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
          <div class="flex items-start justify-between mb-3">
            <h1 class="text-2xl font-bold text-gray-900">{{ quiz.title }}</h1>
            <span
              v-if="quiz.isOfficial"
              class="ml-3 shrink-0 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full"
            >Official</span>
          </div>
          <p v-if="quiz.description" class="text-gray-500 mb-4">{{ quiz.description }}</p>

          <div class="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
            <span>by <strong class="text-gray-600">{{ quiz.author }}</strong></span>
            <span v-if="quiz.category">{{ quiz.category }}</span>
            <span>{{ quiz.questionCount }} question{{ quiz.questionCount !== 1 ? 's' : '' }}</span>
            <span>{{ quiz.playCount }} plays</span>
          </div>

          <div v-if="quiz.tags?.length" class="flex flex-wrap gap-1.5 mb-5">
            <span
              v-for="tag in quiz.tags"
              :key="tag"
              class="bg-gray-100 text-gray-500 text-xs px-2.5 py-1 rounded-full"
            >{{ tag }}</span>
          </div>

          <!-- Start button -->
          <button
            class="w-full sm:w-auto bg-indigo-600 text-white text-lg font-semibold px-8 py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            :disabled="starting || quiz.questionCount === 0"
            @click="startQuiz"
          >
            {{ starting ? 'Starting...' : 'Start Quiz' }}
          </button>
          <p v-if="quiz.questionCount === 0" class="text-sm text-gray-400 mt-2">This quiz has no questions yet.</p>
          <p v-if="startError" class="text-sm text-red-500 mt-2">{{ startError }}</p>
        </div>

        <!-- Question preview list -->
        <h2 class="text-lg font-semibold text-gray-700 mb-3">Questions</h2>
        <div class="space-y-2">
          <div
            v-for="(q, i) in quiz.questions"
            :key="q.id"
            class="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4"
          >
            <span class="text-sm font-mono text-gray-400 w-6 text-right shrink-0">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-gray-800 truncate">{{ q.text || '(no text)' }}</p>
              <div class="flex gap-3 text-xs text-gray-400 mt-0.5">
                <span>{{ typeLabels[q.type] || q.type }}</span>
                <span>{{ q.timeLimit }}s</span>
                <span v-if="q.points">{{ q.points }} pts</span>
                <span v-if="q.answerCount">{{ q.answerCount }} answers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
