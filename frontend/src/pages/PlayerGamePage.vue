<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { getSocket } from '../lib/socket.js';
import { ANSWER_COLORS, AVATARS } from '../constants/index.js';

import PixelBadge from '../components/PixelBadge.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelClock from '../components/icons/PixelClock.vue';
import PixelCheck from '../components/icons/PixelCheck.vue';

const router = useRouter();
const game = useGameStore();

const selectedAnswer = ref(null);
const submitted = ref(false);
const timeRemaining = ref(null);
const timedOut = ref(false);
const questionEnded = ref(false);
const correctAnswerIds = ref([]);
const leaderboard = ref([]);
const pointsEarned = ref(null);

let timerInterval = null;
let previousScore = 0;

const question = computed(() => game.currentQuestion);
const options = computed(() => question.value?.options || []);

const wasCorrect = computed(() => {
  if (!selectedAnswer.value || correctAnswerIds.value.length === 0) return null;
  return correctAnswerIds.value.includes(selectedAnswer.value.id);
});

const myEntry = computed(() =>
  leaderboard.value.find((e) => e.playerId === game.playerId)
);

const top5 = computed(() => leaderboard.value.slice(0, 5));

// Use shared answer colors from constants
const answerBg = ANSWER_COLORS.BUTTON_GRADIENTS;
const answerLabels = ANSWER_COLORS.LABELS;

function selectAnswer(optionId, index) {
  if (submitted.value || timedOut.value) return;
  selectedAnswer.value = { id: optionId, index };
  submitted.value = true;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('player:answer', {
    questionId: question.value?.questionId,
    answerId: optionId,
    timeTaken: question.value?.timeLimit
      ? (question.value.timeLimit - (timeRemaining.value || 0)) * 1000
      : 0
  });
}

function startTimer() {
  stopTimer();
  timedOut.value = false;
  const tl = question.value?.timeLimit;
  if (!tl) return;
  timeRemaining.value = tl;
  timerInterval = setInterval(() => {
    timeRemaining.value--;
    if (timeRemaining.value <= 0) {
      stopTimer();
      timedOut.value = true;
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function setup() {
  const socket = getSocket();
  if (!socket) {
    router.push('/');
    return;
  }

  startTimer();

  socket.on('game:timer', (data) => {
    if (data?.remaining != null) {
      timeRemaining.value = data.remaining;
      if (data.remaining <= 0 && !submitted.value) {
        timedOut.value = true;
        stopTimer();
      }
    }
  });

  socket.on('game:question', (data) => {
    if (myEntry.value) {
      previousScore = myEntry.value.score;
    }
    game.currentQuestion = data;
    selectedAnswer.value = null;
    submitted.value = false;
    questionEnded.value = false;
    timedOut.value = false;
    correctAnswerIds.value = [];
    leaderboard.value = [];
    pointsEarned.value = null;
    startTimer();
  });

  socket.on('game:questionEnd', (data) => {
    stopTimer();
    questionEnded.value = true;
    correctAnswerIds.value = data?.correctAnswerIds || [];
  });

  socket.on('game:leaderboard', (data) => {
    leaderboard.value = data?.leaderboard || [];
    const me = leaderboard.value.find((e) => e.playerId === game.playerId);
    if (me) {
      pointsEarned.value = me.score - previousScore;
      previousScore = me.score;
    }
  });

  socket.on('game:end', (data) => {
    stopTimer();
    game.status = 'finished';
    game.leaderboard = data?.leaderboard || [];
    router.push('/play/results');
  });
}

function cleanup() {
  stopTimer();
  const socket = getSocket();
  if (socket) {
    socket.off('game:timer');
    socket.off('game:question');
    socket.off('game:questionEnd');
    socket.off('game:leaderboard');
    socket.off('game:end');
  }
}

onMounted(setup);
onUnmounted(cleanup);
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <!-- Header -->
    <header class="px-4 py-3 border-b-[3px] border-black bg-white flex items-center justify-between">
      <PixelBadge variant="primary">
        Q{{ question?.questionNumber || '?' }} / {{ question?.totalQuestions || '?' }}
      </PixelBadge>
      <div
        v-if="timeRemaining != null && !questionEnded"
        class="flex items-center gap-2 px-4 py-2 border-2 border-black font-bold"
        :class="timeRemaining <= 5 ? 'bg-destructive text-destructive-foreground animate-pulse' : timeRemaining <= 10 ? 'bg-warning text-warning-foreground' : 'bg-success text-white'"
      >
        <PixelClock :size="16" />
        {{ timeRemaining }}s
      </div>
      <PixelBadge v-else-if="questionEnded" variant="accent">
        Time's up
      </PixelBadge>
    </header>

    <!-- ── Active question ────────────────────── -->
    <template v-if="!questionEnded">
      <div class="flex-1 flex flex-col px-4 py-6 bg-gradient-to-br from-primary/10 to-secondary/10">
        <!-- Question -->
        <PixelCard class="mb-6">
          <h2 class="text-xl sm:text-2xl font-bold leading-tight">
            {{ question?.text || 'Waiting for question...' }}
          </h2>
        </PixelCard>

        <div v-if="timedOut && !submitted" class="mb-6 text-center">
          <p class="text-xl font-bold text-destructive">Time's up!</p>
        </div>
        <div v-else-if="submitted" class="mb-6 text-center">
          <p class="text-success font-bold text-lg">Answer submitted!</p>
        </div>

        <!-- Answer buttons -->
        <div class="flex-1 grid grid-cols-1 gap-4 content-start">
          <button
            v-for="(option, i) in options"
            :key="option.id"
            class="group relative p-6 min-h-[56px] border-[3px] border-black pixel-shadow text-left font-bold text-lg transition-all duration-200"
            :class="[
              answerBg[i % answerBg.length],
              selectedAnswer?.index === i ? 'ring-4 ring-white/50 scale-95' : '',
              submitted && selectedAnswer?.index !== i ? 'opacity-30' : '',
              submitted || timedOut ? 'pointer-events-none' : 'active:translate-x-1 active:translate-y-1 active:shadow-none'
            ]"
            :disabled="submitted || timedOut"
            @click="selectAnswer(option.id, i)"
          >
            <div class="flex items-center gap-3">
              <span class="w-12 h-12 bg-white/20 border-2 border-white flex items-center justify-center text-xl font-bold pixel-font flex-shrink-0">
                {{ answerLabels[i] }}
              </span>
              <span v-if="game.playerSettings.showAnswerText" class="flex-1 text-2xl font-bold">{{ option.text }}</span>
            </div>
          </button>
        </div>

        <!-- Footer -->
        <div class="mt-6 text-center">
          <div class="text-sm text-muted-foreground">
            Playing as <span class="font-bold text-primary">{{ game.playerName || 'Player' }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ── Question ended (results) ────────────────── -->
    <template v-else>
      <div class="flex-1 flex flex-col items-center justify-center px-4 py-6 bg-gradient-to-br from-success/20 to-primary/20">
        <div class="w-full max-w-sm space-y-6">
          <!-- Feedback -->
          <div class="text-center space-y-4">
            <div v-if="submitted && wasCorrect === true">
              <div class="inline-flex items-center justify-center w-24 h-24 bg-success border-[3px] border-black pixel-shadow-lg animate-bounce mb-4">
                <PixelCheck class="text-white" :size="48" />
              </div>
              <h2 class="text-4xl font-bold text-success mb-2">Correct!</h2>
              <p class="text-xl text-muted-foreground">Nice work!</p>
            </div>
            <div v-else-if="submitted && wasCorrect === false">
              <div class="inline-flex items-center justify-center w-24 h-24 bg-destructive border-[3px] border-black pixel-shadow-lg mb-4">
                <svg class="text-white" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2 class="text-4xl font-bold text-destructive mb-2">Wrong!</h2>
              <p class="text-xl text-muted-foreground">Better luck next time</p>
            </div>
            <div v-else>
              <div class="inline-flex items-center justify-center w-24 h-24 bg-muted border-[3px] border-black pixel-shadow-lg mb-4">
                <svg class="text-muted-foreground" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 class="text-3xl font-bold text-muted-foreground mb-2">No answer</h2>
              <p class="text-lg text-muted-foreground/60">+0 pts</p>
            </div>
          </div>

          <!-- Score details -->
          <PixelCard v-if="submitted" class="space-y-4">
            <div class="flex items-center justify-between py-4 border-b-2 border-border">
              <span class="text-muted-foreground">Points Earned</span>
              <span class="text-3xl font-bold" :class="wasCorrect ? 'text-primary' : 'text-muted-foreground'">
                +{{ pointsEarned ?? 0 }}
              </span>
            </div>

            <div v-if="myEntry" class="flex items-center justify-between py-4">
              <span class="text-muted-foreground">Your Rank</span>
              <div class="flex items-center gap-2">
                <span class="text-2xl font-bold text-warning">#{{ myEntry.position }}</span>
              </div>
            </div>
          </PixelCard>

          <!-- Total score -->
          <PixelCard v-if="myEntry" variant="primary" class="text-center">
            <div class="text-sm text-muted-foreground mb-1">Total Score</div>
            <div class="text-5xl font-bold text-primary">{{ myEntry.score?.toLocaleString() }}</div>
          </PixelCard>

          <!-- Answer reveal -->
          <div
            class="grid gap-2 w-full"
            :class="options.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'"
          >
            <div
              v-for="(option, i) in options"
              :key="option.id"
              class="border-[3px] py-3 px-3 text-sm font-bold flex items-center gap-2"
              :class="correctAnswerIds.includes(option.id)
                ? 'border-success bg-success/10 text-success'
                : 'border-border opacity-40'"
            >
              <span class="w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 border-2 border-current">
                {{ answerLabels[i] }}
              </span>
              <span class="flex-1 text-left truncate">{{ option.text }}</span>
              <span v-if="correctAnswerIds.includes(option.id)" class="text-success font-bold">&#10003;</span>
            </div>
          </div>

          <!-- Top 5 leaderboard -->
          <PixelCard v-if="top5.length > 0" class="w-full">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 text-center">Top Players</h3>
            <div class="space-y-1">
              <div
                v-for="entry in top5"
                :key="entry.playerId"
                class="flex items-center gap-3 px-3 py-2 border-2"
                :class="entry.playerId === game.playerId ? 'border-primary bg-primary/10' : 'border-border'"
              >
                <span class="text-sm font-bold w-5 text-center"
                      :class="entry.position <= 3 ? 'text-warning' : 'text-muted-foreground'">
                  {{ entry.position <= 3 ? AVATARS.MEDALS[entry.position - 1] : entry.position }}
                </span>
                <span class="flex-1 text-sm font-medium truncate"
                      :class="entry.playerId === game.playerId ? 'text-primary' : 'text-foreground'">
                  {{ entry.playerId === game.playerId ? 'You' : entry.nickname }}
                </span>
                <span class="text-xs font-mono text-muted-foreground">{{ entry.score }}</span>
              </div>
            </div>
          </PixelCard>

          <p class="text-muted-foreground text-sm animate-pulse text-center">Waiting for next question...</p>
        </div>
      </div>
    </template>
  </div>
</template>
