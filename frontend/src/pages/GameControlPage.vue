<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { getSocket, connectSocket } from '../lib/socket.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelLogo from '../components/icons/PixelLogo.vue';
import PixelClock from '../components/icons/PixelClock.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sessionId = route.params.id;
const guestToken = sessionStorage.getItem('guestToken');

const pin = ref('');
const quizTitle = ref('');
const questions = ref([]);
const currentIndex = ref(-1);
const status = ref('loading');
const error = ref('');
const answersReceived = ref(0);
const playerCount = ref(0);
const timeRemaining = ref(0);
const answerDistribution = ref({});
const leaderboard = ref([]);

const currentQuestion = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= questions.value.length) return null;
  return questions.value[currentIndex.value];
});

const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1);
const questionNumber = computed(() => currentIndex.value + 1);
const totalQuestions = computed(() => questions.value.length);
const showCorrect = computed(() => status.value === 'reveal');

const timerProgress = computed(() => {
  const tl = currentQuestion.value?.timeLimit;
  if (!tl || tl === 0) return 0;
  return (timeRemaining.value / tl) * 100;
});

const totalDistributionAnswers = computed(() =>
  Object.values(answerDistribution.value).reduce((s, c) => s + c, 0)
);

const top5 = computed(() => leaderboard.value.slice(0, 5));

// Branded answer colors
const barBg = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-success', 'bg-warning', 'bg-primary-light'];
const barLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
const podiumColors = ['text-warning', 'text-muted-foreground', 'text-accent'];

function getCount(answerId) {
  return answerDistribution.value[answerId] || 0;
}

function getBarHeight(answerId) {
  const count = getCount(answerId);
  const max = Math.max(1, ...Object.values(answerDistribution.value));
  const pct = (count / max) * 100;
  return `${Math.max(pct, 4)}%`;
}

function getPercentage(answerId) {
  const total = totalDistributionAnswers.value;
  if (total === 0) return 0;
  return Math.round((getCount(answerId) / total) * 100);
}

// ─── Fetch session + quiz questions ─────────────────────────────────────

async function fetchSession() {
  try {
    let url = `/api/sessions/${sessionId}`;
    const headers = {};

    if (auth.isAuthenticated) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (guestToken) {
      url += `?guestToken=${encodeURIComponent(guestToken)}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Failed to load session');

    const data = await res.json();
    const session = data.data.session;

    pin.value = session.pin;
    quizTitle.value = session.quizId?.title || 'Quiz';
    questions.value = session.quizId?.questions || [];
    playerCount.value = session.participants?.length || 0;

    ensureSocket(session.pin);
    sendFirstQuestion();
  } catch (err) {
    error.value = err.message;
    status.value = 'error';
  }
}

// ─── WebSocket ──────────────────────────────────────────────────────────

function ensureSocket(sessionPin) {
  let socket = getSocket();

  if (socket && socket.connected) {
    attachListeners(socket);
    return;
  }

  socket = connectSocket();
  attachListeners(socket);

  const doJoin = () => {
    socket.emit('moderator:join', { pin: sessionPin });
  };
  if (socket.connected) doJoin();
  else socket.once('connect', doJoin);
}

function attachListeners(socket) {
  socket.on('player:answer:detail', (data) => {
    if (data?.answerId) {
      answerDistribution.value = {
        ...answerDistribution.value,
        [data.answerId]: (answerDistribution.value[data.answerId] || 0) + 1
      };
    }
    if (data?.answerCount != null) {
      answersReceived.value = data.answerCount;
    }
  });

  socket.on('player:answer:received', (data) => {
    if (data?.answerCount != null) {
      answersReceived.value = data.answerCount;
    }
  });

  socket.on('game:timer', (data) => {
    if (data?.remaining != null) {
      timeRemaining.value = data.remaining;
    }
  });

  socket.on('game:questionEnd', () => {
    if (status.value === 'question') {
      status.value = 'reveal';
    }
  });

  socket.on('game:leaderboard', (data) => {
    leaderboard.value = data?.leaderboard || [];
  });

  socket.on('lobby:update', (data) => {
    playerCount.value = data.playerCount || data.players?.length || 0;
  });
}

function cleanup() {
  const socket = getSocket();
  if (socket) {
    socket.off('player:answer:detail');
    socket.off('player:answer:received');
    socket.off('game:timer');
    socket.off('game:questionEnd');
    socket.off('game:leaderboard');
    socket.off('lobby:update');
  }
}

// ─── Game flow ──────────────────────────────────────────────────────────

function buildQuestionPayload(q) {
  const options = (q.answers || []).map((a) => ({
    id: a._id,
    text: a.text,
    imageUrl: a.imageUrl || null
  }));

  const correctAnswerIds = (q.answers || [])
    .filter((a) => a.isCorrect)
    .map((a) => a._id);

  return {
    questionId: q._id,
    questionNumber: questionNumber.value,
    totalQuestions: totalQuestions.value,
    text: q.text,
    options,
    timeLimit: q.timeLimit,
    correctAnswerIds
  };
}

function sendFirstQuestion() {
  currentIndex.value = 0;
  answersReceived.value = 0;
  answerDistribution.value = {};
  leaderboard.value = [];
  status.value = 'question';

  const q = currentQuestion.value;
  if (!q) return;

  timeRemaining.value = q.timeLimit || 30;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('moderator:start', {
    firstQuestion: buildQuestionPayload(q)
  });
}

function revealAnswer() {
  status.value = 'reveal';

  const socket = getSocket();
  if (socket) {
    socket.emit('moderator:end-question', {});
  }
}

function sendNextQuestion() {
  currentIndex.value++;
  answersReceived.value = 0;
  answerDistribution.value = {};
  leaderboard.value = [];
  status.value = 'question';

  const q = currentQuestion.value;
  if (!q) return;

  timeRemaining.value = q.timeLimit || 30;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('moderator:next', {
    question: buildQuestionPayload(q)
  });
}

function endGame() {
  const socket = getSocket();
  if (socket) {
    socket.emit('moderator:end');
  }
  status.value = 'ended';
  cleanup();

  setTimeout(() => {
    if (auth.isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  }, 3000);
}

onMounted(fetchSession);
onUnmounted(cleanup);
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div class="flex items-center gap-3">
        <PixelLogo class="text-primary" :size="24" />
        <div>
          <h1 class="text-lg font-bold text-foreground">{{ quizTitle }}</h1>
          <p class="text-xs text-muted-foreground font-mono">PIN: {{ pin }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <PixelBadge variant="primary">Q {{ questionNumber }} / {{ totalQuestions }}</PixelBadge>
        <PixelBadge variant="secondary">
          <PixelUsers :size="12" class="inline mr-1" />
          {{ playerCount }}
        </PixelBadge>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="status === 'loading'" class="flex-1 flex items-center justify-center">
      <p class="text-muted-foreground text-lg">Loading questions...</p>
    </div>

    <!-- Error -->
    <div v-else-if="status === 'error'" class="flex-1 flex flex-col items-center justify-center">
      <p class="text-destructive text-lg mb-4">{{ error }}</p>
      <router-link to="/" class="text-primary hover:underline">Back to Home</router-link>
    </div>

    <!-- Game ended -->
    <div v-else-if="status === 'ended'" class="flex-1 flex flex-col items-center justify-center">
      <h2 class="text-4xl font-bold mb-3 text-primary">Game Over!</h2>
      <p class="text-muted-foreground">Redirecting...</p>
    </div>

    <!-- ── Question phase ─────────────────────────────────────────── -->
    <template v-else-if="currentQuestion && !showCorrect">
      <main class="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <!-- Timer -->
        <div class="w-full max-w-md mb-8">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-muted-foreground">Time remaining</span>
            <div
              class="flex items-center gap-2 px-3 py-1 border-2 border-black font-bold"
              :class="timeRemaining <= 5 ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'"
            >
              <PixelClock :size="16" />
              {{ timeRemaining }}s
            </div>
          </div>
          <div class="w-full bg-muted h-3 overflow-hidden border-2 border-black">
            <div
              class="h-full transition-all duration-1000 ease-linear"
              :class="timeRemaining <= 5 ? 'bg-destructive' : 'bg-primary'"
              :style="{ width: timerProgress + '%' }"
            />
          </div>
        </div>

        <!-- Question text -->
        <PixelBadge variant="primary" class="mb-3">Question {{ questionNumber }}</PixelBadge>
        <h2 class="text-2xl font-bold text-center mb-8 max-w-xl text-foreground">
          {{ currentQuestion.text }}
        </h2>

        <!-- Answer preview -->
        <div class="w-full max-w-lg space-y-2 mb-8">
          <div
            v-for="(answer, i) in currentQuestion.answers"
            :key="answer._id"
            class="flex items-center gap-3 border-[3px] border-black px-4 py-3 bg-card"
          >
            <span
              class="w-7 h-7 flex items-center justify-center text-white text-xs font-bold shrink-0"
              :class="barBg[i % barBg.length]"
            >
              {{ barLabels[i] }}
            </span>
            <span class="flex-1 text-foreground font-medium">{{ answer.text }}</span>
          </div>
        </div>

        <!-- Stats -->
        <p class="text-sm text-muted-foreground mb-6">
          {{ answersReceived }} / {{ playerCount }} answer{{ answersReceived !== 1 ? 's' : '' }} received
        </p>
      </main>

      <!-- Controls -->
      <footer class="border-t-[3px] border-black bg-white px-6 py-4 flex justify-center gap-3">
        <PixelButton variant="primary" @click="revealAnswer">Reveal Answer</PixelButton>
        <PixelButton variant="outline" @click="endGame">End Game</PixelButton>
      </footer>
    </template>

    <!-- ── Reveal phase ─────────────────────────────────────────── -->
    <template v-else-if="currentQuestion && showCorrect">
      <main class="flex-1 flex flex-col items-center px-4 sm:px-6 py-8 overflow-auto">
        <PixelBadge variant="primary" class="mb-3">Question {{ questionNumber }}</PixelBadge>
        <h2 class="text-2xl font-bold text-center mb-8 max-w-xl text-foreground">
          {{ currentQuestion.text }}
        </h2>

        <!-- Distribution + Leaderboard -->
        <div class="w-full max-w-5xl flex flex-col lg:flex-row gap-8 mb-8">
          <!-- Distribution chart -->
          <PixelCard class="flex-1 space-y-4">
            <h3 class="text-sm font-bold text-muted-foreground uppercase tracking-wide text-center">Answer Distribution</h3>

            <div class="flex items-end gap-4 px-4" style="height: 160px;">
              <div
                v-for="(answer, i) in currentQuestion.answers"
                :key="answer._id"
                class="flex-1 flex flex-col items-center justify-end h-full"
              >
                <span class="text-sm font-bold text-foreground mb-1">{{ getCount(answer._id) }}</span>
                <div
                  class="w-full transition-all duration-700"
                  :class="barBg[i % barBg.length]"
                  :style="{
                    height: getBarHeight(answer._id),
                    opacity: answer.isCorrect ? 1 : 0.4
                  }"
                />
              </div>
            </div>

            <div class="grid gap-3 mt-3"
                 :style="{ gridTemplateColumns: `repeat(${currentQuestion.answers.length}, 1fr)` }">
              <div
                v-for="(answer, i) in currentQuestion.answers"
                :key="'label-' + answer._id"
                class="flex flex-col items-center text-center px-1"
              >
                <div class="flex items-center gap-1 mb-1">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 text-white text-xs font-bold"
                    :class="barBg[i % barBg.length]"
                  >
                    {{ barLabels[i] }}
                  </span>
                  <span v-if="answer.isCorrect" class="text-success text-lg leading-none">&#10003;</span>
                </div>
                <p class="text-xs font-medium truncate max-w-full"
                   :class="answer.isCorrect ? 'text-success' : 'text-muted-foreground'">
                  {{ answer.text }}
                </p>
                <p class="text-xs text-muted-foreground">{{ getPercentage(answer._id) }}%</p>
              </div>
            </div>

            <p class="text-sm text-muted-foreground text-center">
              {{ answersReceived }} answer{{ answersReceived !== 1 ? 's' : '' }} received
            </p>
          </PixelCard>

          <!-- Leaderboard -->
          <PixelCard v-if="top5.length > 0" class="w-full lg:w-72 shrink-0 space-y-4">
            <h3 class="text-sm font-bold text-muted-foreground uppercase tracking-wide text-center">Leaderboard</h3>
            <div class="space-y-2">
              <div
                v-for="entry in top5"
                :key="entry.playerId"
                class="flex items-center gap-3 px-3 py-2 border-2 border-border"
                :class="entry.position <= 3 ? 'bg-warning/10 border-warning/30' : ''"
              >
                <span
                  class="w-7 h-7 flex items-center justify-center text-sm font-bold"
                  :class="entry.position <= 3
                    ? 'bg-muted ' + podiumColors[entry.position - 1]
                    : 'text-muted-foreground'"
                >
                  {{ entry.position <= 3 ? ['🥇','🥈','🥉'][entry.position - 1] : entry.position }}
                </span>
                <span class="flex-1 font-medium text-foreground truncate">{{ entry.nickname }}</span>
                <span class="text-sm font-mono font-semibold text-muted-foreground">{{ entry.score }}</span>
              </div>
            </div>
          </PixelCard>
        </div>
      </main>

      <!-- Controls -->
      <footer class="border-t-[3px] border-black bg-white px-6 py-4 flex justify-center gap-3">
        <PixelButton
          v-if="!isLastQuestion"
          variant="primary"
          @click="sendNextQuestion"
        >
          Next Question
        </PixelButton>
        <PixelButton
          variant="outline"
          @click="endGame"
        >
          {{ isLastQuestion ? 'Finish Game' : 'End Game' }}
        </PixelButton>
      </footer>
    </template>
  </div>
</template>
