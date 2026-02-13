<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { getSocket } from '../lib/socket.js';

import PixelBadge from '../components/PixelBadge.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelClock from '../components/icons/PixelClock.vue';

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

// Branded answer colors using the theme palette
const answerBg = [
  'bg-primary text-primary-foreground border-primary-dark',
  'bg-secondary text-secondary-foreground border-secondary-dark',
  'bg-accent text-accent-foreground border-accent-dark',
  'bg-warning text-warning-foreground border-warning',
  'bg-success text-success-foreground border-success',
  'bg-primary-light text-primary-foreground border-primary'
];

const answerLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

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
        class="flex items-center gap-2 px-3 py-1 border-2 border-black font-bold text-sm"
        :class="timeRemaining <= 5 ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'"
      >
        <PixelClock :size="14" />
        {{ timeRemaining }}s
      </div>
      <PixelBadge v-else-if="questionEnded" variant="accent">
        Time's up
      </PixelBadge>
    </header>

    <!-- ── Active question ────────────────────── -->
    <template v-if="!questionEnded">
      <div class="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-4">
        <h1 class="text-2xl font-bold text-center mb-6 max-w-lg text-foreground">
          {{ question?.text || 'Waiting for question...' }}
        </h1>

        <div v-if="timedOut && !submitted" class="mb-6 text-center">
          <p class="text-xl font-bold text-destructive">Time's up!</p>
        </div>
        <div v-else-if="submitted" class="mb-6 text-center">
          <p class="text-success font-bold text-lg">Answer submitted!</p>
        </div>
      </div>

      <!-- Answer buttons -->
      <div
        class="grid grid-cols-2 gap-3 p-4"
        :class="options.length <= 2 ? 'grid-cols-1 max-w-sm mx-auto w-full' : ''"
      >
        <button
          v-for="(option, i) in options"
          :key="option.id"
          class="group relative p-5 border-[3px] border-black pixel-shadow text-left font-bold text-lg transition-all duration-200"
          :class="[
            answerBg[i % answerBg.length],
            selectedAnswer?.index === i ? 'ring-4 ring-white/50 scale-95' : '',
            submitted && selectedAnswer?.index !== i ? 'opacity-30' : '',
            submitted || timedOut ? 'pointer-events-none' : 'hover:-translate-y-1 hover:pixel-shadow-lg active:translate-y-0 active:shadow-none'
          ]"
          :disabled="submitted || timedOut"
          @click="selectAnswer(option.id, i)"
        >
          <div class="flex items-center gap-3">
            <span class="w-8 h-8 border-2 border-current/30 flex items-center justify-center text-sm font-bold shrink-0 bg-black/10">
              {{ answerLabels[i] }}
            </span>
            <span class="flex-1">{{ option.text }}</span>
          </div>
        </button>
      </div>
    </template>

    <!-- ── Question ended (results) ────────────────── -->
    <template v-else>
      <div class="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6">
        <!-- Feedback -->
        <div class="mb-6 text-center">
          <div v-if="submitted && wasCorrect === true">
            <p class="text-4xl font-bold text-success mb-1">Correct!</p>
            <p v-if="pointsEarned != null" class="text-lg text-success font-semibold">+{{ pointsEarned }} pts</p>
          </div>
          <div v-else-if="submitted && wasCorrect === false">
            <p class="text-4xl font-bold text-destructive mb-1">Wrong!</p>
            <p class="text-lg text-muted-foreground">+0 pts</p>
          </div>
          <div v-else>
            <p class="text-3xl font-bold text-muted-foreground mb-1">No answer</p>
            <p class="text-lg text-muted-foreground/60">+0 pts</p>
          </div>
        </div>

        <!-- Answer reveal -->
        <div
          class="grid grid-cols-2 gap-2 w-full max-w-md mb-8"
          :class="options.length <= 2 ? 'grid-cols-1' : ''"
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

        <!-- Your position -->
        <div v-if="myEntry" class="text-center mb-6">
          <p class="text-muted-foreground text-sm">Your position</p>
          <p class="text-3xl font-bold text-primary">#{{ myEntry.position }}</p>
          <p class="text-sm font-mono text-muted-foreground">{{ myEntry.score }} pts total</p>
        </div>

        <!-- Top 5 leaderboard -->
        <PixelCard v-if="top5.length > 0" class="w-full max-w-xs">
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
                {{ entry.position <= 3 ? ['🥇','🥈','🥉'][entry.position - 1] : entry.position }}
              </span>
              <span class="flex-1 text-sm font-medium truncate"
                    :class="entry.playerId === game.playerId ? 'text-primary' : 'text-foreground'">
                {{ entry.playerId === game.playerId ? 'You' : entry.nickname }}
              </span>
              <span class="text-xs font-mono text-muted-foreground">{{ entry.score }}</span>
            </div>
          </div>
        </PixelCard>

        <p class="text-muted-foreground text-sm animate-pulse mt-6">Waiting for next question...</p>
      </div>
    </template>
  </div>
</template>
