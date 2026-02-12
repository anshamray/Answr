<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore } from '../stores/gameStore.js';
import { getSocket } from '../lib/socket.js';

const router = useRouter();
const game = useGameStore();

const selectedAnswer = ref(null);
const submitted = ref(false);
const timeRemaining = ref(null);
const timedOut = ref(false);
const questionEnded = ref(false);
const correctAnswerIds = ref([]);
const leaderboard = ref([]);
const pointsEarned = ref(null);      // points earned this question (from leaderboard delta)

let timerInterval = null;
let previousScore = 0;

const question = computed(() => game.currentQuestion);
const options = computed(() => question.value?.options || []);

// Did the player pick a correct answer?
const wasCorrect = computed(() => {
  if (!selectedAnswer.value || correctAnswerIds.value.length === 0) return null;
  return correctAnswerIds.value.includes(selectedAnswer.value.id);
});

// Find the player's own leaderboard entry
const myEntry = computed(() =>
  leaderboard.value.find((e) => e.playerId === game.playerId)
);

const top5 = computed(() => leaderboard.value.slice(0, 5));

const answerLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
const answerColors = [
  'border-red-400 hover:bg-red-50',
  'border-blue-400 hover:bg-blue-50',
  'border-yellow-400 hover:bg-yellow-50',
  'border-green-400 hover:bg-green-50',
  'border-purple-400 hover:bg-purple-50',
  'border-orange-400 hover:bg-orange-50'
];
const answerSelectedColors = [
  'border-red-500 bg-red-100',
  'border-blue-500 bg-blue-100',
  'border-yellow-500 bg-yellow-100',
  'border-green-500 bg-green-100',
  'border-purple-500 bg-purple-100',
  'border-orange-500 bg-orange-100'
];

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

// ─── Local timer (fallback; synced by game:timer from server) ───────────

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

// ─── Socket listeners ───────────────────────────────────────────────────

function setup() {
  const socket = getSocket();
  if (!socket) {
    router.push('/');
    return;
  }

  // Start local timer for the first question
  startTimer();

  // Server-authoritative timer — overrides local countdown
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
    // Snapshot score before next question for delta calc
    if (myEntry.value) {
      previousScore = myEntry.value.score;
    }

    // Next question arrived — reset everything
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

    // Calculate points earned this question
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
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Header -->
    <header class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <span class="text-sm text-gray-400">
        Q{{ question?.questionNumber || '?' }} / {{ question?.totalQuestions || '?' }}
      </span>
      <span
        v-if="timeRemaining != null && !questionEnded"
        class="text-lg font-mono font-bold tabular-nums"
        :class="timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-600'"
      >
        {{ timeRemaining }}s
      </span>
      <span v-else-if="questionEnded" class="text-sm font-semibold text-gray-400">
        Time's up
      </span>
    </header>

    <!-- ── Active question (answering phase) ────────────────────── -->
    <template v-if="!questionEnded">
      <!-- Question -->
      <div class="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <h1 class="text-2xl font-bold text-center mb-6 max-w-lg">
          {{ question?.text || 'Waiting for question...' }}
        </h1>

        <div v-if="timedOut && !submitted" class="mb-6 text-center">
          <p class="text-xl font-bold text-red-400">Time's up!</p>
        </div>
        <div v-else-if="submitted" class="mb-6 text-center">
          <p class="text-green-600 font-semibold">Answer submitted!</p>
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
          class="border-2 rounded-xl py-5 px-4 text-lg font-semibold transition flex items-center gap-3"
          :class="[
            selectedAnswer?.index === i
              ? answerSelectedColors[i % answerSelectedColors.length]
              : answerColors[i % answerColors.length],
            submitted && selectedAnswer?.index !== i ? 'opacity-40' : '',
            submitted || timedOut ? 'pointer-events-none' : 'active:scale-95'
          ]"
          :disabled="submitted || timedOut"
          @click="selectAnswer(option.id, i)"
        >
          <span class="w-8 h-8 rounded-full bg-white border-2 border-current flex items-center justify-center text-sm font-bold shrink-0">
            {{ answerLabels[i] }}
          </span>
          <span class="text-left flex-1">{{ option.text }}</span>
        </button>
      </div>
    </template>

    <!-- ── Question ended (results + leaderboard) ────────────────── -->
    <template v-else>
      <div class="flex-1 flex flex-col items-center justify-center px-6 py-6">

        <!-- Correct / Wrong / No answer feedback -->
        <div class="mb-6 text-center">
          <div v-if="submitted && wasCorrect === true">
            <p class="text-4xl font-bold text-green-600 mb-1">Correct!</p>
            <p v-if="pointsEarned != null" class="text-lg text-green-500 font-semibold">+{{ pointsEarned }} pts</p>
          </div>
          <div v-else-if="submitted && wasCorrect === false">
            <p class="text-4xl font-bold text-red-500 mb-1">Wrong!</p>
            <p class="text-lg text-gray-400">+0 pts</p>
          </div>
          <div v-else>
            <p class="text-3xl font-bold text-gray-400 mb-1">No answer</p>
            <p class="text-lg text-gray-300">+0 pts</p>
          </div>
        </div>

        <!-- Answer reveal (correct highlighted) -->
        <div
          class="grid grid-cols-2 gap-2 w-full max-w-md mb-8"
          :class="options.length <= 2 ? 'grid-cols-1' : ''"
        >
          <div
            v-for="(option, i) in options"
            :key="option.id"
            class="border-2 rounded-lg py-3 px-3 text-sm font-semibold flex items-center gap-2"
            :class="correctAnswerIds.includes(option.id)
              ? 'border-green-400 bg-green-50'
              : 'border-gray-200 opacity-40'"
          >
            <span class="w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
              {{ answerLabels[i] }}
            </span>
            <span class="flex-1 text-left truncate">{{ option.text }}</span>
            <span v-if="correctAnswerIds.includes(option.id)" class="text-green-600 font-bold">&#10003;</span>
          </div>
        </div>

        <!-- Your position -->
        <div v-if="myEntry" class="text-center mb-6">
          <p class="text-gray-400 text-sm">Your position</p>
          <p class="text-3xl font-bold text-gray-800">#{{ myEntry.position }}</p>
          <p class="text-sm font-mono text-gray-500">{{ myEntry.score }} pts total</p>
        </div>

        <!-- Top 5 leaderboard -->
        <div v-if="top5.length > 0" class="w-full max-w-xs">
          <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 text-center">Top Players</h3>
          <div class="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div
              v-for="entry in top5"
              :key="entry.playerId"
              class="flex items-center gap-3 px-4 py-2 border-b border-gray-100 last:border-b-0"
              :class="entry.playerId === game.playerId ? 'bg-indigo-50' : ''"
            >
              <span class="text-sm font-bold w-5 text-center"
                    :class="entry.position <= 3 ? 'text-yellow-500' : 'text-gray-400'">
                {{ entry.position <= 3 ? ['🥇','🥈','🥉'][entry.position - 1] : entry.position }}
              </span>
              <span class="flex-1 text-sm font-medium truncate"
                    :class="entry.playerId === game.playerId ? 'text-indigo-700' : 'text-gray-700'">
                {{ entry.playerId === game.playerId ? 'You' : entry.nickname }}
              </span>
              <span class="text-xs font-mono text-gray-400">{{ entry.score }}</span>
            </div>
          </div>
        </div>

        <!-- Waiting for next question -->
        <p class="text-gray-400 text-sm animate-pulse mt-6">Waiting for next question...</p>
      </div>
    </template>
  </div>
</template>
