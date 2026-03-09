<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { getSocket, connectSocket } from '../lib/socket.js';
import { apiUrl } from '../lib/api.js';
import { TIMING, STORAGE_KEYS, ANSWER_COLORS } from '../constants/index.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelClock from '../components/icons/PixelClock.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';
import PixelCheck from '../components/icons/PixelCheck.vue';

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sessionId = route.params.id;
const guestToken = sessionStorage.getItem(STORAGE_KEYS.GUEST_TOKEN);

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

// Intro phase: 'intro' (question only) -> 'answering' (answers visible) -> handled by status='reveal'
const phase = ref('answering');

// Game settings from lobby
const gameSettings = ref({
  showLeaderboard: true,
  musicEnabled: true,
  allowLateJoins: false
});

// Load settings from sessionStorage
function loadSettings() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.GAME_SETTINGS);
    if (stored) {
      gameSettings.value = { ...gameSettings.value, ...JSON.parse(stored) };
    }
  } catch {
    // Settings not found or invalid, use defaults
  }
}

const currentQuestion = computed(() => {
  if (currentIndex.value < 0 || currentIndex.value >= questions.value.length) return null;
  return questions.value[currentIndex.value];
});

const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1);
const questionNumber = computed(() => currentIndex.value + 1);
const totalQuestions = computed(() => questions.value.length);
const showCorrect = computed(() => status.value === 'reveal');

const totalDistributionAnswers = computed(() =>
  Object.values(answerDistribution.value).reduce((s, c) => s + c, 0)
);

const top5 = computed(() => leaderboard.value.slice(0, 5));

// Use shared answer colors from constants
const barBg = ANSWER_COLORS.BAR_COLORS;
const barLabels = ANSWER_COLORS.LABELS;
const answerGradients = ANSWER_COLORS.MODERATOR_GRADIENTS;

function getCount(answerId) {
  return answerDistribution.value[answerId] || 0;
}

function getBarWidth(answerId) {
  const count = getCount(answerId);
  const max = Math.max(1, ...Object.values(answerDistribution.value));
  return `${Math.max((count / max) * 100, 4)}%`;
}

function getPercentage(answerId) {
  const total = totalDistributionAnswers.value;
  if (total === 0) return 0;
  return Math.round((getCount(answerId) / total) * 100);
}

function getCorrectCount() {
  if (!currentQuestion.value) return 0;
  const correctIds = (currentQuestion.value.answers || []).filter(a => a.isCorrect).map(a => a._id);
  return correctIds.reduce((sum, id) => sum + getCount(id), 0);
}

// ─── Fetch session + quiz questions ─────────────────────────────────────

async function fetchSession() {
  try {
    let url = apiUrl(`/api/sessions/${sessionId}`);
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

    // Wait for socket to join the room before starting
    await ensureSocket(session.pin);
    sendFirstQuestion();
  } catch (err) {
    error.value = err.message;
    status.value = 'error';
  }
}

// ─── WebSocket ──────────────────────────────────────────────────────────

function ensureSocket(sessionPin) {
  return new Promise((resolve) => {
    let socket = getSocket();

    if (!socket || !socket.connected) {
      socket = connectSocket();
    }

    attachListeners(socket);

    // Listen for join confirmation before resolving
    socket.once('moderator:joined', () => {
      resolve();
    });

    const doJoin = () => {
      socket.emit('moderator:join', { pin: sessionPin });
    };

    if (socket.connected) doJoin();
    else socket.once('connect', doJoin);
  });
}

function attachListeners(socket) {
  // Remove any existing listeners first to avoid duplicates
  socket.off('player:answer:detail');
  socket.off('player:answer:received');
  socket.off('game:timer');
  socket.off('game:questionIntro');
  socket.off('game:questionStart');
  socket.off('game:questionEnd');
  socket.off('game:leaderboard');
  socket.off('lobby:update');

  socket.on('game:questionIntro', () => {
    phase.value = 'intro';
  });

  socket.on('game:questionStart', () => {
    phase.value = 'answering';
  });

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
    socket.off('game:questionIntro');
    socket.off('game:questionStart');
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
  phase.value = 'intro';

  const q = currentQuestion.value;
  if (!q) return;

  timeRemaining.value = q.timeLimit || 30;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('moderator:start', {
    firstQuestion: buildQuestionPayload(q),
    settings: {
      allowLateJoins: gameSettings.value.allowLateJoins
    }
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
  phase.value = 'intro';

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
  }, TIMING.REDIRECT_DELAY);
}

onMounted(() => {
  loadSettings();
  fetchSession();
});
onUnmounted(cleanup);
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col">
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white px-4 py-2 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-base font-bold text-primary pixel-font">Answr</span>
        <div>
          <h1 class="text-base font-bold text-foreground">{{ quizTitle }}</h1>
          <p class="text-xs text-muted-foreground font-mono">PIN: {{ pin }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <PixelBadge variant="primary" class="text-sm">Q {{ questionNumber }} / {{ totalQuestions }}</PixelBadge>
        <PixelBadge variant="secondary" class="text-sm">
          <PixelUsers :size="12" class="inline mr-1" />
          {{ playerCount }}
        </PixelBadge>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="status === 'loading'" class="flex-1 flex items-center justify-center">
      <p class="text-muted-foreground text-lg">{{ t('gameControl.loadingQuestions') }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="status === 'error'" class="flex-1 flex flex-col items-center justify-center">
      <p class="text-destructive text-lg mb-4">{{ error }}</p>
      <router-link to="/" class="text-primary hover:underline">{{ t('common.backToHome') }}</router-link>
    </div>

    <!-- Game ended -->
    <div v-else-if="status === 'ended'" class="flex-1 flex flex-col items-center justify-center">
      <h2 class="text-4xl font-bold mb-3 text-primary pixel-font">{{ t('gameControl.gameOver') }}</h2>
      <p class="text-muted-foreground">{{ t('gameControl.redirecting') }}</p>
    </div>

    <!-- ── Question phase ─────────────────────────────────────────── -->
    <template v-else-if="currentQuestion && !showCorrect">
      <!-- Intro Phase: Show question only, no answers -->
      <template v-if="phase === 'intro'">
        <main class="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/20 to-secondary/20">
          <div class="max-w-4xl w-full text-center space-y-8">
            <PixelBadge variant="primary" class="text-xl px-6 py-3">
              {{ t('gameControl.questionOf', { current: questionNumber, total: totalQuestions }) }}
            </PixelBadge>

            <PixelCard class="!p-8 lg:!p-12">
              <h1 class="text-2xl lg:text-4xl font-bold leading-tight">
                {{ currentQuestion.text }}
              </h1>
            </PixelCard>

            <div class="text-2xl text-muted-foreground animate-pulse">
              {{ t('gameControl.getReady') }}
            </div>
          </div>
        </main>

        <footer class="border-t-[3px] border-black bg-white px-4 py-3 flex justify-center gap-3">
          <PixelButton variant="outline" @click="endGame">{{ t('gameControl.endGame') }}</PixelButton>
        </footer>
      </template>

      <!-- Answering Phase: Show question + answers + timer -->
      <template v-else>
        <main class="flex-1 p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-secondary/10">
          <div class="max-w-7xl mx-auto space-y-4">
            <!-- Question Header -->
            <div class="flex items-center justify-between">
              <PixelBadge variant="primary" class="text-base px-4 py-2">
                {{ t('gameControl.questionOf', { current: questionNumber, total: totalQuestions }) }}
              </PixelBadge>

              <div class="flex items-center gap-4">
                <div
                  class="px-4 py-2 border-[3px] border-black text-white"
                  :class="timeRemaining > 10 ? 'bg-success' : timeRemaining > 5 ? 'bg-warning' : 'bg-destructive animate-pulse'"
                >
                  <div class="flex items-center gap-2">
                    <PixelClock :size="20" />
                    <span class="text-2xl lg:text-3xl font-bold pixel-font">{{ timeRemaining }}</span>
                  </div>
                </div>

                <div class="text-right">
                  <div class="text-xl lg:text-2xl font-bold">{{ answersReceived }}/{{ playerCount }}</div>
                  <div class="text-xs text-muted-foreground">{{ t('gameControl.answered') }}</div>
                </div>
              </div>
            </div>

            <!-- Question -->
            <PixelCard class="space-y-4 !p-4 lg:!p-6">
              <h1 class="text-2xl lg:text-3xl font-bold leading-tight">
                {{ currentQuestion.text }}
              </h1>

              <div class="grid grid-cols-2 gap-3">
                <div
                  v-for="(answer, i) in currentQuestion.answers"
                  :key="answer._id"
                  class="group relative p-4 lg:p-5 text-white border-[3px] border-black pixel-shadow transition-all"
                  :class="'bg-gradient-to-br ' + (answerGradients[i] || answerGradients[0])"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 lg:w-12 lg:h-12 bg-white/20 border-2 border-white flex items-center justify-center text-lg lg:text-xl font-bold pixel-font">
                      {{ barLabels[i] }}
                    </div>
                    <span class="text-xl lg:text-2xl font-bold">{{ answer.text }}</span>
                  </div>
                  <div class="absolute top-2 right-2">
                    <PixelUsers class="text-white/50" :size="20" />
                  </div>
                </div>
              </div>
            </PixelCard>
          </div>
        </main>

        <!-- Controls -->
        <footer class="border-t-[3px] border-black bg-white px-4 py-3 flex justify-center gap-3">
          <PixelButton variant="primary" @click="revealAnswer">{{ t('gameControl.revealAnswer') }}</PixelButton>
          <PixelButton variant="outline" @click="endGame">{{ t('gameControl.endGame') }}</PixelButton>
        </footer>
      </template>
    </template>

    <!-- ── Reveal phase ─────────────────────────────────────────── -->
    <template v-else-if="currentQuestion && showCorrect">
      <main class="flex-1 p-3 sm:p-4 bg-gradient-to-br from-success/10 via-primary/5 to-secondary/5">
        <div class="max-w-7xl mx-auto space-y-4">
          <!-- Header -->
          <div class="flex items-center justify-between flex-wrap gap-3">
            <PixelBadge variant="success" class="text-base px-4 py-2">
              <PixelCheck class="inline mr-2" :size="16" />
              {{ t('gameControl.correctAnswer') }}: {{ barLabels[currentQuestion.answers.findIndex(a => a.isCorrect)] || '?' }}
            </PixelBadge>

            <PixelButton
              v-if="!isLastQuestion"
              variant="primary"
              class="text-lg px-6 py-3"
              @click="sendNextQuestion"
            >
              {{ t('gameControl.nextQuestion') }}
              <svg class="inline ml-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </PixelButton>
          </div>

          <div class="grid gap-4" :class="gameSettings.showLeaderboard && top5.length > 0 ? 'lg:grid-cols-3' : ''">
            <!-- Answer Distribution -->
            <div class="space-y-4" :class="gameSettings.showLeaderboard && top5.length > 0 ? 'lg:col-span-2' : ''">
              <PixelCard class="space-y-3 !p-4">
                <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>

                <div class="space-y-2">
                  <div v-for="(answer, i) in currentQuestion.answers" :key="answer._id" class="space-y-1">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div
                          class="w-8 h-8 text-white border-2 border-black flex items-center justify-center font-bold text-sm pixel-font"
                          :class="barBg[i % barBg.length]"
                        >
                          {{ barLabels[i] }}
                        </div>
                        <span class="text-base font-bold">{{ answer.text }}</span>
                        <PixelBadge v-if="answer.isCorrect" variant="success" class="ml-1 text-xs">
                          <PixelCheck class="inline mr-1" :size="10" />
                          {{ t('session.correct') }}
                        </PixelBadge>
                      </div>
                      <div class="text-right">
                        <span class="text-lg font-bold">{{ getCount(answer._id) }}</span>
                        <span class="text-xs text-muted-foreground ml-1">({{ getPercentage(answer._id) }}%)</span>
                      </div>
                    </div>

                    <div class="relative h-4 bg-muted border-2 border-border">
                      <div
                        class="absolute left-0 top-0 h-full transition-all duration-1000 ease-out"
                        :class="[barBg[i % barBg.length], answer.isCorrect ? 'border-2 border-success' : '']"
                        :style="{ width: getBarWidth(answer._id) }"
                      />
                    </div>
                  </div>
                </div>
              </PixelCard>

              <div class="grid grid-cols-3 gap-3">
                <PixelCard class="text-center !p-3">
                  <div class="text-2xl font-bold text-success">{{ getCorrectCount() }}</div>
                  <div class="text-xs text-muted-foreground">{{ t('gameControl.gotItRight') }}</div>
                </PixelCard>
                <PixelCard class="text-center !p-3">
                  <div class="text-2xl font-bold text-primary">{{ answersReceived }}</div>
                  <div class="text-xs text-muted-foreground">{{ t('gameControl.answered') }}</div>
                </PixelCard>
                <PixelCard class="text-center !p-3">
                  <div class="text-2xl font-bold text-accent">
                    {{ totalDistributionAnswers > 0 ? Math.round((getCorrectCount() / totalDistributionAnswers) * 100) : 0 }}%
                  </div>
                  <div class="text-xs text-muted-foreground">{{ t('gameControl.accuracy') }}</div>
                </PixelCard>
              </div>
            </div>

            <!-- Leaderboard -->
            <div v-if="gameSettings.showLeaderboard && top5.length > 0" class="lg:col-span-1">
              <PixelCard variant="primary" class="space-y-2 !p-4">
                <div class="flex items-center gap-2">
                  <svg class="text-warning" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  <h3 class="text-xl font-bold">{{ t('gameControl.top5') }}</h3>
                </div>

                <div class="space-y-2">
                  <div
                    v-for="entry in top5"
                    :key="entry.playerId"
                    class="flex items-center gap-2 p-2 border-2"
                    :class="
                      entry.position === 1 ? 'border-warning bg-warning/10' :
                      entry.position === 2 ? 'border-muted-foreground/30 bg-muted-foreground/5' :
                      entry.position === 3 ? 'border-accent/30 bg-accent/5' :
                      'border-border bg-white'
                    "
                  >
                    <div
                      class="flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold border-2 border-black text-sm"
                      :class="
                        entry.position === 1 ? 'bg-warning text-warning-foreground' :
                        entry.position === 2 ? 'bg-muted-foreground text-white' :
                        entry.position === 3 ? 'bg-accent text-accent-foreground' :
                        'bg-muted text-muted-foreground'
                      "
                    >
                      {{ entry.position }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="font-bold text-sm truncate">{{ entry.nickname }}</div>
                    </div>
                    <div class="text-sm font-bold text-muted-foreground">
                      {{ entry.score?.toLocaleString() }}
                    </div>
                  </div>
                </div>
              </PixelCard>
            </div>
          </div>
        </div>
      </main>

      <!-- Controls -->
      <footer class="border-t-[3px] border-black bg-white px-4 py-3 flex justify-center gap-3">
        <PixelButton
          v-if="!isLastQuestion"
          variant="primary"
          @click="sendNextQuestion"
        >
          {{ t('gameControl.nextQuestion') }}
        </PixelButton>
        <PixelButton
          variant="outline"
          @click="endGame"
        >
          {{ isLastQuestion ? t('gameControl.finishGame') : t('gameControl.endGame') }}
        </PixelButton>
      </footer>
    </template>
  </div>
</template>
