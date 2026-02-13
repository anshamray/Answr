<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';

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
    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/library/${route.params.id}/start`, {
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
      sessionStorage.setItem('guestToken', session.guestToken);
      sessionStorage.setItem('guestSessionId', session.id);
    }

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
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <router-link to="/library" class="text-sm text-muted-foreground hover:text-primary transition flex items-center gap-1">
          <span>&larr;</span> Back to Library
        </router-link>
        <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
          <PixelLogo class="text-primary" :size="28" />
          <span class="text-xl font-bold text-primary pixel-font">Answr</span>
        </router-link>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">Loading...</div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <p class="text-destructive text-lg mb-4">{{ error }}</p>
        <router-link to="/library" class="text-primary hover:underline">Back to Library</router-link>
      </div>

      <!-- Quiz Detail -->
      <div v-else-if="quiz">
        <!-- Title & Meta -->
        <PixelCard class="mb-6 space-y-4">
          <div class="flex items-start justify-between">
            <h1 class="text-2xl font-bold text-foreground">{{ quiz.title }}</h1>
            <PixelBadge v-if="quiz.isOfficial" variant="primary" class="ml-3 shrink-0">Official</PixelBadge>
          </div>
          <p v-if="quiz.description" class="text-muted-foreground">{{ quiz.description }}</p>

          <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>by <strong class="text-foreground">{{ quiz.author }}</strong></span>
            <span v-if="quiz.category">{{ quiz.category }}</span>
            <span>{{ quiz.questionCount }} question{{ quiz.questionCount !== 1 ? 's' : '' }}</span>
            <span>{{ quiz.playCount }} plays</span>
          </div>

          <div v-if="quiz.tags?.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in quiz.tags"
              :key="tag"
              class="bg-muted text-muted-foreground text-xs px-2.5 py-1 border border-border"
            >{{ tag }}</span>
          </div>

          <!-- Start button -->
          <PixelButton
            variant="primary"
            size="lg"
            class="w-full sm:w-auto"
            :disabled="starting || quiz.questionCount === 0"
            @click="startQuiz"
          >
            {{ starting ? 'Starting...' : 'Start Quiz' }}
          </PixelButton>
          <p v-if="quiz.questionCount === 0" class="text-sm text-muted-foreground">This quiz has no questions yet.</p>
          <p v-if="startError" class="text-sm text-destructive">{{ startError }}</p>
        </PixelCard>

        <!-- Question preview list -->
        <h2 class="text-lg font-bold text-foreground mb-3">Questions</h2>
        <div class="space-y-2">
          <div
            v-for="(q, i) in quiz.questions"
            :key="q.id"
            class="bg-card border-[3px] border-border px-4 py-3 flex items-center gap-4 hover:border-primary/50 transition"
          >
            <span class="text-sm font-mono text-muted-foreground w-6 text-right shrink-0">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-foreground truncate">{{ q.text || '(no text)' }}</p>
              <div class="flex gap-3 text-xs text-muted-foreground mt-0.5">
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
