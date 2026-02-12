<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { getSocket, connectSocket } from '../lib/socket.js';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sessionId = route.params.id;
const guestToken = sessionStorage.getItem('guestToken');

const pin = ref('');
const quizTitle = ref('');
const questions = ref([]);
const currentIndex = ref(-1);
const status = ref('loading');       // 'loading' | 'question' | 'reveal' | 'ended' | 'error'
const error = ref('');
const answersReceived = ref(0);
const playerCount = ref(0);
const timeRemaining = ref(0);
const answerDistribution = ref({});  // { answerId: count }
const leaderboard = ref([]);         // [{ position, playerId, nickname, score }]

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

// Kahoot-style colors
const barBg = ['bg-red-500', 'bg-blue-500', 'bg-amber-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
const barLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
const podiumColors = ['text-yellow-500', 'text-gray-400', 'text-amber-700'];

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
    const session = data.session;

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
  // Host-only: includes answerId for distribution tracking
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

  // Room-wide answer count (fallback)
  socket.on('player:answer:received', (data) => {
    if (data?.answerCount != null) {
      answersReceived.value = data.answerCount;
    }
  });

  // Server-side timer ticks — authoritative countdown
  socket.on('game:timer', (data) => {
    if (data?.remaining != null) {
      timeRemaining.value = data.remaining;
    }
  });

  // Server ended the question (timer expired or scoring complete)
  socket.on('game:questionEnd', () => {
    if (status.value === 'question') {
      status.value = 'reveal';
    }
  });

  // Leaderboard after each question
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
  // Strip isCorrect from options (players must not see it)
  const options = (q.answers || []).map((a) => ({
    id: a._id,
    text: a.text,
    imageUrl: a.imageUrl || null
  }));

  // Collect correct answer IDs for server-side scoring
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

  // Initialize timer display before first server tick arrives
  timeRemaining.value = q.timeLimit || 30;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('moderator:start', {
    firstQuestion: buildQuestionPayload(q)
  });
}

function revealAnswer() {
  // Optimistic UI — switch to reveal immediately
  status.value = 'reveal';

  // Tell the server to stop timer, score, and broadcast
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

  // Initialize timer display before first server tick
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
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div>
        <h1 class="text-lg font-bold text-gray-900">{{ quizTitle }}</h1>
        <p class="text-xs text-gray-400 font-mono">PIN: {{ pin }}</p>
      </div>
      <div class="text-right">
        <span class="text-sm font-semibold text-gray-600">
          Q {{ questionNumber }} / {{ totalQuestions }}
        </span>
        <p class="text-xs text-gray-400">{{ playerCount }} player{{ playerCount !== 1 ? 's' : '' }}</p>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="status === 'loading'" class="flex-1 flex items-center justify-center">
      <p class="text-gray-400 text-lg">Loading questions...</p>
    </div>

    <!-- Error -->
    <div v-else-if="status === 'error'" class="flex-1 flex flex-col items-center justify-center">
      <p class="text-red-500 text-lg mb-4">{{ error }}</p>
      <router-link to="/" class="text-indigo-600 hover:underline">Back to Home</router-link>
    </div>

    <!-- Game ended -->
    <div v-else-if="status === 'ended'" class="flex-1 flex flex-col items-center justify-center">
      <h2 class="text-4xl font-bold mb-3">Game Over!</h2>
      <p class="text-gray-400">Redirecting...</p>
    </div>

    <!-- ── Question phase ─────────────────────────────────────────── -->
    <template v-else-if="currentQuestion && !showCorrect">
      <main class="flex-1 flex flex-col items-center justify-center px-6 py-8">

        <!-- Timer -->
        <div class="w-full max-w-md mb-8">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-500">Time remaining</span>
            <span
              class="text-3xl font-bold font-mono tabular-nums"
              :class="timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-800'"
            >
              {{ timeRemaining }}s
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              class="h-3 rounded-full transition-all duration-1000 ease-linear"
              :class="timeRemaining <= 5 ? 'bg-red-500' : 'bg-indigo-500'"
              :style="{ width: timerProgress + '%' }"
            />
          </div>
        </div>

        <!-- Question text -->
        <p class="text-sm text-gray-400 mb-2">Question {{ questionNumber }}</p>
        <h2 class="text-2xl font-bold text-center mb-8 max-w-xl text-gray-900">
          {{ currentQuestion.text }}
        </h2>

        <!-- Answer preview (neutral, no correct marking) -->
        <div class="w-full max-w-lg space-y-2 mb-8">
          <div
            v-for="(answer, i) in currentQuestion.answers"
            :key="answer._id"
            class="flex items-center gap-3 border-2 border-gray-200 rounded-lg px-4 py-3 bg-white"
          >
            <span
              class="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold shrink-0"
              :class="barBg[i % barBg.length]"
            >
              {{ barLabels[i] }}
            </span>
            <span class="flex-1 text-gray-800">{{ answer.text }}</span>
          </div>
        </div>

        <!-- Stats -->
        <p class="text-sm text-gray-400 mb-6">
          {{ answersReceived }} / {{ playerCount }} answer{{ answersReceived !== 1 ? 's' : '' }} received
        </p>
      </main>

      <!-- Controls -->
      <footer class="bg-white border-t border-gray-200 px-6 py-4 flex justify-center gap-3 shadow-inner">
        <button
          class="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition"
          @click="revealAnswer"
        >
          Reveal Answer
        </button>
        <button
          class="border-2 border-gray-300 text-gray-500 px-6 py-3 rounded-lg text-lg hover:border-red-400 hover:text-red-500 transition"
          @click="endGame"
        >
          End Game
        </button>
      </footer>
    </template>

    <!-- ── Reveal phase (distribution + leaderboard) ─────────────── -->
    <template v-else-if="currentQuestion && showCorrect">
      <main class="flex-1 flex flex-col items-center px-6 py-8 overflow-auto">

        <p class="text-sm text-gray-400 mb-2">Question {{ questionNumber }}</p>
        <h2 class="text-2xl font-bold text-center mb-8 max-w-xl text-gray-900">
          {{ currentQuestion.text }}
        </h2>

        <!-- ── Distribution + Leaderboard side-by-side on wide screens ── -->
        <div class="w-full max-w-5xl flex flex-col lg:flex-row gap-8 mb-8">

          <!-- Distribution chart -->
          <div class="flex-1">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">Answer Distribution</h3>

            <!-- Bar chart -->
            <div class="flex items-end gap-4 px-4" style="height: 160px;">
              <div
                v-for="(answer, i) in currentQuestion.answers"
                :key="answer._id"
                class="flex-1 flex flex-col items-center justify-end h-full"
              >
                <span class="text-sm font-bold text-gray-700 mb-1">{{ getCount(answer._id) }}</span>
                <div
                  class="w-full rounded-t-lg transition-all duration-700"
                  :class="barBg[i % barBg.length]"
                  :style="{
                    height: getBarHeight(answer._id),
                    opacity: answer.isCorrect ? 1 : 0.45
                  }"
                />
              </div>
            </div>

            <!-- Answer labels -->
            <div class="grid gap-3 mt-3"
                 :style="{ gridTemplateColumns: `repeat(${currentQuestion.answers.length}, 1fr)` }">
              <div
                v-for="(answer, i) in currentQuestion.answers"
                :key="'label-' + answer._id"
                class="flex flex-col items-center text-center px-1"
              >
                <div class="flex items-center gap-1 mb-1">
                  <span
                    class="inline-flex items-center justify-center w-6 h-6 rounded text-white text-xs font-bold"
                    :class="barBg[i % barBg.length]"
                  >
                    {{ barLabels[i] }}
                  </span>
                  <span v-if="answer.isCorrect" class="text-green-500 text-lg leading-none">&#10003;</span>
                </div>
                <p class="text-xs font-medium truncate max-w-full"
                   :class="answer.isCorrect ? 'text-green-700' : 'text-gray-600'">
                  {{ answer.text }}
                </p>
                <p class="text-xs text-gray-400">{{ getPercentage(answer._id) }}%</p>
              </div>
            </div>

            <p class="text-sm text-gray-400 mt-4 text-center">
              {{ answersReceived }} answer{{ answersReceived !== 1 ? 's' : '' }} received
            </p>
          </div>

          <!-- Leaderboard -->
          <div v-if="top5.length > 0" class="w-full lg:w-72 shrink-0">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">Leaderboard</h3>
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                v-for="entry in top5"
                :key="entry.playerId"
                class="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0"
              >
                <span
                  class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                  :class="entry.position <= 3
                    ? 'bg-gray-100 ' + podiumColors[entry.position - 1]
                    : 'text-gray-400'"
                >
                  {{ entry.position <= 3 ? ['🥇','🥈','🥉'][entry.position - 1] : entry.position }}
                </span>
                <span class="flex-1 font-medium text-gray-800 truncate">{{ entry.nickname }}</span>
                <span class="text-sm font-mono font-semibold text-gray-500">{{ entry.score }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Controls -->
      <footer class="bg-white border-t border-gray-200 px-6 py-4 flex justify-center gap-3 shadow-inner">
        <button
          v-if="!isLastQuestion"
          class="bg-black text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition"
          @click="sendNextQuestion"
        >
          Next Question
        </button>
        <button
          class="border-2 border-gray-300 text-gray-500 px-6 py-3 rounded-lg text-lg hover:border-red-400 hover:text-red-500 transition"
          @click="endGame"
        >
          {{ isLastQuestion ? 'Finish Game' : 'End Game' }}
        </button>
      </footer>
    </template>
  </div>
</template>
