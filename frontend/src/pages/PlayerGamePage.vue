<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '../stores/gameStore.js';
import { connectSocket, getSocket } from '../lib/socket.js';
import { usePlayerReconnect } from '../composables/usePlayerReconnect.js';
import { ANSWER_COLORS, AVATARS } from '../constants/index.js';
import { apiUrl } from '../lib/api.js';
import { useSliderQuestion, DEFAULT_SLIDER_CONFIG } from '../composables/useSliderQuestion.js';

import PixelBadge from '../components/PixelBadge.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelClock from '../components/icons/PixelClock.vue';
import PixelCheck from '../components/icons/PixelCheck.vue';
import StreakCounter from '../components/game/StreakCounter.vue';

const { t } = useI18n();

const router = useRouter();
const game = useGameStore();

const selectedAnswer = ref(null);
const selectedAnswers = ref([]); // For multi-answer questions
const submitted = ref(false);
const timeRemaining = ref(null);
const timedOut = ref(false);
const questionEnded = ref(false);
const correctAnswerIds = ref([]);
const leaderboard = ref([]);
const pointsEarned = ref(null);

// Intro phase state
const phase = ref('answering'); // 'intro' | 'answering'
const introCountdown = ref(3);
let introInterval = null;

let timerInterval = null;
let previousScore = 0;
let cleanupReconnect = () => {};

const question = computed(() => game.currentQuestion);
const options = computed(() => question.value?.options || []);
const isMultiAnswer = computed(() => question.value?.allowMultipleAnswers || false);
const isSlider = computed(() =>
  question.value?.type === 'slider' ||
  (question.value?.sliderConfig?.min != null && question.value?.sliderConfig?.max != null)
);
const isSort = computed(() => question.value?.type === 'sort');
const isPinAnswer = computed(() => question.value?.type === 'pin-answer');
const isTypeAnswer = computed(() => question.value?.type === 'type-answer');
const questionMediaUrl = computed(() => {
  const url = question.value?.mediaUrl;
  if (!url) return null;
  const full = apiUrl(url);
  const sessionPin = game.pin;
  return sessionPin ? `${full}${full.includes('?') ? '&' : '?'}sessionPin=${sessionPin}` : full;
});
const sliderConfigSource = computed(() => question.value?.sliderConfig || null);
const { sliderConfig, getSliderPosition } = useSliderQuestion({
  configRef: sliderConfigSource
});

const sliderPosition = computed(() => getSliderPosition(sliderValue.value));

// Slider state
const sliderValue = ref(50);

// Sort state
const sortOrder = ref([]); // IDs in player-chosen order
const draggedSortIndex = ref(null);
const availableItems = computed(() => {
  const ordered = new Set(sortOrder.value);
  return options.value.filter(o => !ordered.has(o.id));
});
const orderedItems = computed(() =>
  sortOrder.value.map(id => options.value.find(o => o.id === id)).filter(Boolean)
);

// Pin-answer state
const pinX = ref(null);
const pinY = ref(null);
const pinImageFailed = ref(false);
const pinMediaUrl = computed(() => {
  const url = question.value?.mediaUrl;
  if (!url) return null;
  const sessionPin = game.pin;
  const full = apiUrl(url);
  return sessionPin ? `${full}${full.includes('?') ? '&' : '?'}sessionPin=${sessionPin}` : full;
});

// Type-answer state
const textAnswer = ref('');

const wasCorrect = computed(() => {
  // For non-MC types, use points earned from leaderboard
  const qType = question.value?.type;
  if (['slider', 'pin-answer', 'type-answer', 'sort'].includes(qType)) {
    if (!submitted.value) return null;
    if (pointsEarned.value == null) return null;
    return pointsEarned.value > 0;
  }
  if (correctAnswerIds.value.length === 0) return null;
  if (isMultiAnswer.value) {
    if (selectedAnswers.value.length === 0) return null;
    const selectedSet = new Set(selectedAnswers.value);
    const allCorrect = correctAnswerIds.value.every(id => selectedSet.has(id));
    const noWrong = selectedAnswers.value.every(id => correctAnswerIds.value.includes(id));
    return allCorrect && noWrong;
  }
  if (!selectedAnswer.value) return null;
  return correctAnswerIds.value.includes(selectedAnswer.value.id);
});

const myEntry = computed(() =>
  leaderboard.value.find((e) => e.playerId === game.playerId)
);

const top5 = computed(() => leaderboard.value.slice(0, 5));

const showFloatingMultiAnswerSubmit = computed(() =>
  !game.playerSettings.showAnswerText &&
  isMultiAnswer.value &&
  !submitted.value &&
  !timedOut.value &&
  selectedAnswers.value.length > 0
);

const shapeAnswerLabelClass = computed(() => (
  options.value.length <= 4
    ? 'text-6xl sm:text-8xl'
    : 'text-4xl sm:text-5xl'
));

// Grid layout for shape buttons based on number of options
const shapeButtonGridClass = computed(() => {
  const count = options.value.length;
  if (count <= 2) return 'grid-cols-2 grid-rows-1';
  if (count <= 4) return 'grid-cols-2 grid-rows-2';
  return 'grid-cols-2 grid-rows-3'; // 5-6 options
});

// Streak helpers (mirroring backend config)
const STREAK_THRESHOLDS = [
  { streak: 2, multiplier: 1.1, label: 'Hot!' },
  { streak: 3, multiplier: 1.2, label: 'On Fire!' },
  { streak: 5, multiplier: 1.3, label: 'Unstoppable!' },
  { streak: 8, multiplier: 1.5, label: 'LEGENDARY!' }
];

function getStreakLabel(streak) {
  if (!streak || streak < 2) return null;
  let label = null;
  for (const t of STREAK_THRESHOLDS) {
    if (streak >= t.streak) label = t.label;
  }
  return label;
}

function getStreakMultiplier(streak) {
  if (!streak || streak < 2) return 1.0;
  let multiplier = 1.0;
  for (const t of STREAK_THRESHOLDS) {
    if (streak >= t.streak) multiplier = t.multiplier;
  }
  return multiplier;
}

// Use shared answer colors from constants
const answerBg = ANSWER_COLORS.BUTTON_GRADIENTS;
const answerLabels = ANSWER_COLORS.LABELS;

function selectAnswer(optionId, index) {
  if (submitted.value || timedOut.value) return;

  if (isMultiAnswer.value) {
    // Toggle selection for multi-answer
    const idx = selectedAnswers.value.indexOf(optionId);
    if (idx >= 0) {
      selectedAnswers.value.splice(idx, 1);
    } else {
      selectedAnswers.value.push(optionId);
    }
    return;
  }

  // Single answer — select and submit immediately
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

function submitMultiAnswer() {
  if (submitted.value || timedOut.value || selectedAnswers.value.length === 0) return;
  submitted.value = true;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('player:answer', {
    questionId: question.value?.questionId,
    answerId: selectedAnswers.value,
    timeTaken: question.value?.timeLimit
      ? (question.value.timeLimit - (timeRemaining.value || 0)) * 1000
      : 0
  });
}

function submitSliderAnswer() {
  if (submitted.value || timedOut.value) return;
  submitted.value = true;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('player:answer', {
    questionId: question.value?.questionId,
    answerId: String(sliderValue.value),
    timeTaken: question.value?.timeLimit
      ? (question.value.timeLimit - (timeRemaining.value || 0)) * 1000
      : 0
  });
}

function addToSortOrder(optionId) {
  if (submitted.value || timedOut.value) return;
  if (!sortOrder.value.includes(optionId)) {
    sortOrder.value.push(optionId);
  }
}

function removeFromSortOrder(optionId) {
  if (submitted.value || timedOut.value) return;
  sortOrder.value = sortOrder.value.filter(id => id !== optionId);
}

function moveSortItem(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  if (fromIndex < 0 || toIndex < 0) return;
  if (fromIndex >= sortOrder.value.length || toIndex >= sortOrder.value.length) return;

  const nextOrder = [...sortOrder.value];
  const [movedItem] = nextOrder.splice(fromIndex, 1);
  nextOrder.splice(toIndex, 0, movedItem);
  sortOrder.value = nextOrder;
}

function startSortDrag(index, event) {
  if (submitted.value || timedOut.value || sortOrder.value.length < 2) return;

  draggedSortIndex.value = index;
  event.currentTarget?.setPointerCapture?.(event.pointerId);
}

function updateSortDrag(event) {
  if (draggedSortIndex.value == null) return;

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-sort-index]');
  const targetIndex = Number(target?.dataset?.sortIndex);

  if (Number.isInteger(targetIndex) && targetIndex !== draggedSortIndex.value) {
    moveSortItem(draggedSortIndex.value, targetIndex);
    draggedSortIndex.value = targetIndex;
  }
}

function stopSortDrag(event) {
  if (draggedSortIndex.value == null) return;

  event?.currentTarget?.releasePointerCapture?.(event.pointerId);
  draggedSortIndex.value = null;
}

function submitSortAnswer(force = false) {
  if (submitted.value || timedOut.value || sortOrder.value.length === 0) return;
  if (!force && sortOrder.value.length !== options.value.length) return;
  submitted.value = true;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('player:answer', {
    questionId: question.value?.questionId,
    answerId: sortOrder.value,
    timeTaken: question.value?.timeLimit
      ? (question.value.timeLimit - (timeRemaining.value || 0)) * 1000
      : 0
  });
}

function handlePinClick(event) {
  if (submitted.value || timedOut.value) return;
  const rect = event.currentTarget.getBoundingClientRect();
  pinX.value = ((event.clientX - rect.left) / rect.width) * 100;
  pinY.value = ((event.clientY - rect.top) / rect.height) * 100;
}

function handlePinTouch(event) {
  if (submitted.value || timedOut.value) return;
  event.preventDefault();
  const touch = event.touches[0];
  const rect = event.currentTarget.getBoundingClientRect();
  pinX.value = ((touch.clientX - rect.left) / rect.width) * 100;
  pinY.value = ((touch.clientY - rect.top) / rect.height) * 100;
}

function submitPinAnswer() {
  if (submitted.value || timedOut.value || pinX.value == null) return;
  submitted.value = true;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('player:answer', {
    questionId: question.value?.questionId,
    answerId: JSON.stringify({ x: Math.round(pinX.value * 10) / 10, y: Math.round(pinY.value * 10) / 10 }),
    timeTaken: question.value?.timeLimit
      ? (question.value.timeLimit - (timeRemaining.value || 0)) * 1000
      : 0
  });
}

function submitTypeAnswer() {
  if (submitted.value || timedOut.value || !textAnswer.value.trim()) return;
  submitted.value = true;

  const socket = getSocket();
  if (!socket) return;

  socket.emit('player:answer', {
    questionId: question.value?.questionId,
    answerId: textAnswer.value.trim(),
    timeTaken: question.value?.timeLimit
      ? (question.value.timeLimit - (timeRemaining.value || 0)) * 1000
      : 0
  });
}

function getSliderMidpoint(config) {
  const min = Number(config?.min ?? DEFAULT_SLIDER_CONFIG.min);
  const max = Number(config?.max ?? DEFAULT_SLIDER_CONFIG.max);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return Math.round((DEFAULT_SLIDER_CONFIG.min + DEFAULT_SLIDER_CONFIG.max) / 2);
  }

  return Math.round((min + max) / 2);
}

function initializeQuestionState(data = question.value) {
  if (!data) return;

  selectedAnswer.value = null;
  selectedAnswers.value = [];
  submitted.value = false;
  questionEnded.value = false;
  timedOut.value = false;
  correctAnswerIds.value = [];
  leaderboard.value = [];
  pointsEarned.value = null;
  sliderValue.value = getSliderMidpoint(data.sliderConfig);
  sortOrder.value = [];
  draggedSortIndex.value = null;
  pinX.value = null;
  pinY.value = null;
  pinImageFailed.value = false;
  textAnswer.value = '';
  timeRemaining.value = data.timeLimit ?? null;
}

function submitPendingAnswerOnTimeout() {
  if (submitted.value) return;

  if (isMultiAnswer.value && selectedAnswers.value.length > 0) {
    submitMultiAnswer();
    return;
  }

  if (isSlider.value) {
    submitSliderAnswer();
    return;
  }

  if (isSort.value && sortOrder.value.length > 0) {
    submitSortAnswer(true);
    return;
  }

  if (isPinAnswer.value && pinX.value != null) {
    submitPinAnswer();
    return;
  }

  if (isTypeAnswer.value && textAnswer.value.trim()) {
    submitTypeAnswer();
  }
}

function handleTimeout() {
  if (submitted.value) return;

  stopTimer();
  submitPendingAnswerOnTimeout();

  // Preserve the submitted state for partially completed answers that were
  // auto-sent on timeout; only show a pure timeout state when nothing was sent.
  timedOut.value = !submitted.value;
}

function startIntroCountdown(seconds = 3) {
  stopIntroCountdown();
  introCountdown.value = seconds;
  phase.value = 'intro';

  introInterval = setInterval(() => {
    introCountdown.value--;
    if (introCountdown.value <= 0) {
      stopIntroCountdown();
    }
  }, 1000);
}

function stopIntroCountdown() {
  if (introInterval) {
    clearInterval(introInterval);
    introInterval = null;
  }
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
      handleTimeout();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

watch(question, (newQuestion, oldQuestion) => {
  if (!newQuestion) return;
  if (newQuestion.questionId === oldQuestion?.questionId) return;
  initializeQuestionState(newQuestion);
}, { immediate: true });

function setup() {
  if (!game.pin || !game.sessionId || !game.playerId) {
    router.replace('/play');
    return;
  }

  const socket = getSocket() || connectSocket();
  const reconnect = usePlayerReconnect({ socket, game, router });
  cleanupReconnect = reconnect.cleanup;

  // Start intro countdown for initial question
  startIntroCountdown();

  socket.on('game:questionIntro', (data) => {
    // Start the intro countdown (3-2-1-Go!)
    startIntroCountdown(data?.countdownSeconds || 3);
  });

  socket.on('game:questionStart', () => {
    // Intro ended, show answers and start timer
    stopIntroCountdown();
    phase.value = 'answering';
    startTimer();
  });

  socket.on('game:timer', (data) => {
    if (data?.remaining != null) {
      if (phase.value === 'intro') {
        stopIntroCountdown();
        phase.value = 'answering';
      }
      timeRemaining.value = data.remaining;
      if (data.remaining <= 0 && !submitted.value) {
        handleTimeout();
      }
    }
  });

  socket.on('game:question', (data) => {
    if (myEntry.value) {
      previousScore = myEntry.value.score;
    }
    game.currentQuestion = data;
    // Don't start timer here - wait for game:questionStart after intro
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

      // Update streak state
      if (me.streak !== undefined) {
        const streakLabel = getStreakLabel(me.streak);
        const multiplier = getStreakMultiplier(me.streak);
        game.updateStreak(me.streak, streakLabel, multiplier, pointsEarned.value);
      }
    }
  });

  socket.on('game:end', (data) => {
    stopTimer();
    game.status = 'finished';
    game.leaderboard = data?.leaderboard || [];
    router.push('/play/results');
  });

  reconnect.maybeRecoverSession();
}

function cleanup() {
  stopTimer();
  stopIntroCountdown();
  const socket = getSocket();
  if (socket) {
    socket.off('game:timer');
    socket.off('game:question');
    socket.off('game:questionIntro');
    socket.off('game:questionStart');
    socket.off('game:questionEnd');
    socket.off('game:leaderboard');
    socket.off('game:end');
  }
  cleanupReconnect();
}

onMounted(setup);
onUnmounted(cleanup);
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <!-- Header (hidden during shape buttons mode in answering phase) -->
    <header
      v-if="phase === 'intro' || game.playerSettings.showAnswerText || questionEnded || isSlider || isSort || isPinAnswer || isTypeAnswer"
      class="px-4 py-3 border-b-[3px] border-black bg-white flex items-center justify-between"
    >
      <PixelBadge variant="primary">
        Q{{ question?.questionNumber || '?' }} / {{ question?.totalQuestions || '?' }}
      </PixelBadge>
      <div class="flex items-center gap-2">
        <!-- Streak Counter -->
        <StreakCounter v-if="game.currentStreak >= 2 && !questionEnded" />
        <div
          v-if="timeRemaining != null && !questionEnded && phase === 'answering'"
          class="flex items-center gap-2 px-4 py-2 border-2 border-black font-bold"
          :class="timeRemaining <= 5 ? 'bg-destructive text-destructive-foreground animate-pulse' : timeRemaining <= 10 ? 'bg-warning text-warning-foreground' : 'bg-success text-white'"
        >
          <PixelClock :size="16" />
          {{ timeRemaining }}s
        </div>
        <PixelBadge v-if="questionEnded" variant="accent">
          {{ t('playerGame.timesUp') }}
        </PixelBadge>
      </div>
    </header>

    <!-- ── Intro Phase: Question X + Countdown ────────────────────── -->
    <template v-if="!questionEnded && phase === 'intro'">
      <div class="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <div class="text-center space-y-6">
          <PixelBadge variant="primary" class="text-2xl px-6 py-3">
            {{ t('playerGame.question') }} {{ question?.questionNumber || '?' }}
          </PixelBadge>

          <div
            class="text-9xl font-bold pixel-font transition-all duration-300"
            :class="introCountdown > 0 ? 'text-primary scale-100' : 'text-success scale-110'"
          >
            {{ introCountdown > 0 ? introCountdown : 'GO!' }}
          </div>

          <p class="text-xl text-muted-foreground">{{ t('playerGame.getReadyToAnswer') }}</p>
        </div>
      </div>
    </template>

    <!-- ── Active question (answering phase) ────────────────────── -->
    <template v-else-if="!questionEnded && phase === 'answering'">

      <!-- Slider mode -->
      <template v-if="isSlider">
        <div class="flex-1 flex flex-col px-4 py-6 bg-gradient-to-br from-primary/10 to-secondary/10">
          <PixelCard class="mb-4">
            <h2 class="text-xl sm:text-2xl font-bold leading-tight">
              {{ question?.text || t('playerGame.waitingForQuestion') }}
            </h2>
            <div v-if="questionMediaUrl" class="mt-3 flex justify-center">
              <div class="border-[3px] border-black max-h-52 w-full max-w-2xl flex items-center justify-center overflow-hidden bg-black">
                <img
                  :src="questionMediaUrl"
                  :alt="question?.text"
                  class="max-h-full w-full object-contain"
                />
              </div>
            </div>
          </PixelCard>

          <div v-if="timedOut && !submitted" class="mb-6 text-center">
            <p class="text-xl font-bold text-destructive">{{ t('playerGame.timesUp') }}</p>
          </div>
          <div v-else-if="submitted" class="mb-6 text-center">
            <p class="text-success font-bold text-lg">{{ t('playerGame.answerSubmitted') }}: {{ sliderValue }}{{ sliderConfig.unit ? ' ' + sliderConfig.unit : '' }}</p>
          </div>

          <div v-if="!submitted && !timedOut" class="flex-1 flex flex-col items-center justify-center gap-8">
            <div class="text-7xl sm:text-8xl font-bold pixel-font text-primary">
              {{ sliderValue }}<span v-if="sliderConfig.unit" class="text-3xl text-muted-foreground ml-2">{{ sliderConfig.unit }}</span>
            </div>

            <div class="w-full max-w-md px-4">
              <div class="border-[3px] border-black bg-white px-4 py-4 pixel-shadow">
                <div class="relative pt-7">
                  <div
                    class="absolute top-0 -translate-x-1/2 pointer-events-none"
                    :style="{ left: `${sliderPosition}%` }"
                  >
                    <div class="px-2 py-0.5 text-xs font-bold border-2 border-black whitespace-nowrap bg-success text-white">
                      {{ sliderValue }}<span v-if="sliderConfig.unit"> {{ sliderConfig.unit }}</span>
                    </div>
                  </div>

                  <div class="relative h-8">
                    <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div class="h-4 border-2 border-black bg-muted relative overflow-hidden">
                        <div class="absolute inset-0 opacity-25 slider-pixel-grid"></div>
                      </div>
                    </div>

                    <div class="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                      <template v-for="i in 11" :key="i">
                        <div class="w-0.5 h-2 bg-black/40"></div>
                      </template>
                    </div>

                    <input
                      v-model.number="sliderValue"
                      type="range"
                      :min="sliderConfig.min || 0"
                      :max="sliderConfig.max || 100"
                      step="1"
                      class="slider-input absolute inset-0 z-10 h-8 w-full cursor-pointer"
                    />
                  </div>
                </div>

                <div class="flex justify-between text-sm text-muted-foreground mt-3 font-bold">
                  <span class="bg-black px-2 py-1 text-white">{{ sliderConfig.min || 0 }}</span>
                  <span class="bg-black px-2 py-1 text-white">{{ sliderConfig.max || 100 }}</span>
                </div>
              </div>
            </div>

            <button
              class="px-8 py-4 bg-success text-white border-[3px] border-black pixel-shadow font-bold text-xl active:translate-x-1 active:translate-y-1 active:shadow-none"
              @click="submitSliderAnswer"
            >
              {{ t('playerGame.submitAnswer') }}
            </button>
          </div>

          <div class="mt-6 text-center">
            <div class="text-sm text-muted-foreground">
              {{ t('playerGame.playingAs') }} <span class="font-bold text-primary">{{ game.playerName || t('game.player') }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Sort mode -->
      <template v-else-if="isSort">
        <div class="flex-1 flex flex-col px-4 py-4 bg-gradient-to-br from-primary/10 to-secondary/10">
          <PixelCard class="mb-3">
            <h2 class="text-lg sm:text-xl font-bold leading-tight">
              {{ question?.text || t('playerGame.waitingForQuestion') }}
            </h2>
            <div v-if="questionMediaUrl" class="mt-3 flex justify-center">
              <div class="border-[3px] border-black max-h-52 w-full max-w-2xl flex items-center justify-center overflow-hidden bg-black">
                <img
                  :src="questionMediaUrl"
                  :alt="question?.text"
                  class="max-h-full w-full object-contain"
                />
              </div>
            </div>
          </PixelCard>

          <div v-if="timedOut && !submitted" class="mb-4 text-center">
            <p class="text-xl font-bold text-destructive">{{ t('playerGame.timesUp') }}</p>
          </div>
          <div v-else-if="submitted" class="mb-4 text-center">
            <p class="text-success font-bold text-lg">{{ t('playerGame.answerSubmitted') }}</p>
          </div>

          <div v-if="!submitted && !timedOut" class="flex-1 flex flex-col gap-4 overflow-auto">
            <!-- Ordered items -->
            <div v-if="orderedItems.length > 0">
              <div class="mb-2 flex items-center justify-between gap-2">
                <p class="text-xs font-bold text-muted-foreground uppercase">{{ t('playerGame.yourOrder') }}</p>
                <p class="text-[11px] font-bold text-muted-foreground">{{ t('playerGame.dragToReorder') }}</p>
              </div>
              <div class="space-y-2">
                <div
                  v-for="(item, i) in orderedItems"
                  :key="'ordered-' + item.id"
                  :data-sort-index="i"
                  class="w-full p-3 border-[3px] border-success bg-success/10 text-left font-bold text-base flex items-center gap-3 transition-transform touch-none"
                  :class="draggedSortIndex === i ? 'scale-[1.01] ring-4 ring-success/20' : ''"
                  @pointerdown="startSortDrag(i, $event)"
                  @pointermove="updateSortDrag"
                  @pointerup="stopSortDrag"
                  @pointercancel="stopSortDrag"
                >
                  <span class="w-8 h-8 bg-success text-white border-2 border-black flex items-center justify-center font-bold pixel-font flex-shrink-0">
                    {{ i + 1 }}
                  </span>
                  <span class="flex-1">{{ item.text }}</span>
                  <span class="text-muted-foreground text-base select-none">↕</span>
                  <button
                    type="button"
                    class="w-8 h-8 border-2 border-black bg-white text-sm text-muted-foreground flex items-center justify-center"
                    :aria-label="t('playerGame.removeItem')"
                    @pointerdown.stop
                    @click.stop="removeFromSortOrder(item.id)"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <!-- Available items -->
            <div v-if="availableItems.length > 0">
              <p class="text-xs font-bold text-muted-foreground uppercase mb-2">{{ t('playerGame.tapToOrder') }}</p>
              <div class="space-y-2">
                <button
                  v-for="item in availableItems"
                  :key="'available-' + item.id"
                  class="w-full p-3 border-[3px] border-black bg-white pixel-shadow text-left font-bold text-base flex items-center gap-3 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                  @click="addToSortOrder(item.id)"
                >
                  <span class="w-8 h-8 bg-muted border-2 border-black flex items-center justify-center font-bold pixel-font flex-shrink-0">
                    ?
                  </span>
                  <span class="flex-1">{{ item.text }}</span>
                </button>
              </div>
            </div>

            <div v-if="sortOrder.length > 0" class="mt-auto pt-2">
              <button
                class="w-full py-4 bg-success text-white border-[3px] border-black pixel-shadow font-bold text-xl transition-all"
                :class="sortOrder.length === options.length ? 'active:translate-x-1 active:translate-y-1 active:shadow-none' : 'opacity-50 cursor-not-allowed'"
                :disabled="sortOrder.length !== options.length"
                @click="submitSortAnswer"
              >
                {{ t('playerGame.submitAnswer') }} ({{ sortOrder.length }}/{{ options.length }})
              </button>
              <p class="text-sm text-muted-foreground text-center mt-2">
                {{ sortOrder.length === options.length ? t('playerGame.dragToReorder') : t('playerGame.completeOrderToSubmit') }}
              </p>
            </div>
          </div>

          <div class="mt-4 text-center">
            <div class="text-sm text-muted-foreground">
              {{ t('playerGame.playingAs') }} <span class="font-bold text-primary">{{ game.playerName || t('game.player') }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Pin-answer mode -->
      <template v-else-if="isPinAnswer">
        <div class="flex-1 min-h-0 flex flex-col px-4 py-4 bg-gradient-to-br from-primary/10 to-secondary/10">
          <PixelCard class="mb-4">
            <h2 class="text-lg sm:text-xl font-bold leading-tight">
              {{ question?.text || t('playerGame.waitingForQuestion') }}
            </h2>
          </PixelCard>

          <div v-if="timedOut && !submitted" class="mb-4 text-center">
            <p class="text-xl font-bold text-destructive">{{ t('playerGame.timesUp') }}</p>
          </div>
          <div v-else-if="submitted" class="mb-4 text-center">
            <p class="text-success font-bold text-lg">{{ t('playerGame.answerSubmitted') }}</p>
          </div>

          <div v-if="!submitted && !timedOut" class="flex-1 min-h-0 flex flex-col items-center gap-3 overflow-y-auto">
            <p class="text-sm text-muted-foreground font-bold">{{ t('playerGame.tapOnImage') }}</p>
            <div
              class="relative w-full max-w-md max-h-[60vh] border-[3px] border-black cursor-crosshair select-none bg-black overflow-hidden"
              @click="handlePinClick"
              @touchstart="handlePinTouch"
            >
              <img
                v-if="pinMediaUrl && !pinImageFailed"
                :src="pinMediaUrl"
                class="w-full h-auto max-h-[60vh] block object-contain"
                alt="Pin target"
                draggable="false"
                @error="pinImageFailed = true"
              />
              <div v-else class="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                {{ t('playerGame.imageNotAvailable') }}
              </div>
              <!-- Pin marker -->
              <div
                v-if="pinX != null && pinY != null"
                class="absolute w-6 h-6 -ml-3 -mt-3 pointer-events-none"
                :style="{ left: pinX + '%', top: pinY + '%' }"
              >
                <div class="w-6 h-6 bg-destructive border-[3px] border-black shadow-[3px_3px_0_#000] rotate-45"></div>
              </div>
            </div>

            <div
              v-if="pinX != null"
              class="sticky bottom-0 z-10 w-full max-w-md bg-gradient-to-t from-background via-background/95 to-transparent px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
            >
              <button
                class="w-full px-8 py-4 bg-success text-white border-[3px] border-black pixel-shadow font-bold text-xl active:translate-x-1 active:translate-y-1 active:shadow-none"
                @click="submitPinAnswer"
              >
                {{ t('playerGame.submitAnswer') }}
              </button>
            </div>
          </div>

          <div class="mt-4 text-center">
            <div class="text-sm text-muted-foreground">
              {{ t('playerGame.playingAs') }} <span class="font-bold text-primary">{{ game.playerName || t('game.player') }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Type-answer mode -->
      <template v-else-if="isTypeAnswer">
        <div class="flex-1 flex flex-col px-4 py-6 bg-gradient-to-br from-primary/10 to-secondary/10">
          <PixelCard class="mb-4">
            <h2 class="text-xl sm:text-2xl font-bold leading-tight">
              {{ question?.text || t('playerGame.waitingForQuestion') }}
            </h2>
            <div v-if="questionMediaUrl" class="mt-3 flex justify-center">
              <div class="border-[3px] border-black max-h-52 w-full max-w-2xl flex items-center justify-center overflow-hidden bg-black">
                <img
                  :src="questionMediaUrl"
                  :alt="question?.text"
                  class="max-h-full w-full object-contain"
                />
              </div>
            </div>
          </PixelCard>

          <div v-if="timedOut && !submitted" class="mb-6 text-center">
            <p class="text-xl font-bold text-destructive">{{ t('playerGame.timesUp') }}</p>
          </div>
          <div v-else-if="submitted" class="mb-6 text-center">
            <p class="text-success font-bold text-lg">{{ t('playerGame.answerSubmitted') }}: {{ textAnswer }}</p>
          </div>

          <div v-if="!submitted && !timedOut" class="flex-1 flex flex-col items-center justify-center gap-6">
            <input
              v-model="textAnswer"
              type="text"
              :placeholder="t('playerGame.typeYourAnswer')"
              class="w-full max-w-md px-6 py-4 text-2xl font-bold text-center border-[3px] border-black pixel-shadow bg-white focus:outline-none focus:border-primary"
              maxlength="50"
              autocomplete="off"
              @keyup.enter="submitTypeAnswer"
            />

            <button
              class="px-8 py-4 bg-success text-white border-[3px] border-black pixel-shadow font-bold text-xl transition-all"
              :class="textAnswer.trim() ? 'active:translate-x-1 active:translate-y-1 active:shadow-none' : 'opacity-50 cursor-not-allowed'"
              :disabled="!textAnswer.trim()"
              @click="submitTypeAnswer"
            >
              {{ t('playerGame.submitAnswer') }}
            </button>
          </div>

          <div class="mt-6 text-center">
            <div class="text-sm text-muted-foreground">
              {{ t('playerGame.playingAs') }} <span class="font-bold text-primary">{{ game.playerName || t('game.player') }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Shape buttons mode (no answer text) - Full screen grid -->
      <template v-else-if="!game.playerSettings.showAnswerText">
        <div
          class="flex-1 grid gap-2 p-2"
          :class="shapeButtonGridClass"
          :style="showFloatingMultiAnswerSubmit ? { paddingBottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)' } : undefined"
        >
          <button
            v-for="(option, i) in options"
            :key="option.id"
            class="flex items-center justify-center border-[3px] border-black transition-all duration-200"
            :class="[
              answerBg[i % answerBg.length],
              isMultiAnswer
                ? (selectedAnswers.includes(option.id) ? 'ring-4 ring-white/50 scale-90' : '')
                : (selectedAnswer?.index === i ? 'ring-4 ring-white/50 scale-90' : ''),
              !isMultiAnswer && submitted && selectedAnswer?.index !== i ? 'opacity-30' : '',
              (!isMultiAnswer && submitted) || timedOut ? 'pointer-events-none' : 'active:scale-95'
            ]"
            :disabled="(!isMultiAnswer && submitted) || timedOut"
            @click="selectAnswer(option.id, i)"
          >
            <span
              class="font-bold pixel-font leading-none text-white"
              :class="shapeAnswerLabelClass"
            >
              {{ answerLabels[i] }}
            </span>
          </button>
        </div>

        <!-- Multi-answer submit button -->
        <div
          v-if="showFloatingMultiAnswerSubmit"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-20"
          style="bottom: calc(env(safe-area-inset-bottom) + 1rem);"
        >
          <button
            class="min-w-52 px-6 py-3 bg-black text-white border-[3px] border-white pixel-shadow font-bold text-lg active:translate-x-1 active:translate-y-1 active:shadow-none shadow-lg"
            @click="submitMultiAnswer"
          >
            {{ t('playerGame.submitAnswer') }} ({{ selectedAnswers.length }})
          </button>
        </div>

        <!-- Submitted/Timed out overlay -->
        <div
          v-if="submitted || timedOut"
          class="fixed bottom-4 left-1/2 -translate-x-1/2 z-10"
        >
          <PixelBadge :variant="submitted ? 'success' : 'destructive'" class="text-lg px-6 py-3">
            {{ submitted ? t('playerGame.answerSubmitted') : t('playerGame.timesUp') }}
          </PixelBadge>
        </div>
      </template>

      <!-- Normal mode (with answer text) -->
      <template v-else>
        <div class="flex-1 flex flex-col px-4 py-6 bg-gradient-to-br from-primary/10 to-secondary/10">
          <!-- Question -->
          <PixelCard class="mb-4">
            <h2 class="text-xl sm:text-2xl font-bold leading-tight">
              {{ question?.text || t('playerGame.waitingForQuestion') }}
            </h2>
            <div v-if="questionMediaUrl" class="mt-3 flex justify-center">
              <div class="border-[3px] border-black max-h-52 w-full max-w-2xl flex items-center justify-center overflow-hidden bg-black">
                <img
                  :src="questionMediaUrl"
                  :alt="question?.text"
                  class="max-h-full w-full object-contain"
                />
              </div>
            </div>
          </PixelCard>

          <div v-if="timedOut && !submitted" class="mb-6 text-center">
            <p class="text-xl font-bold text-destructive">{{ t('playerGame.timesUp') }}</p>
          </div>
          <div v-else-if="submitted" class="mb-6 text-center">
            <p class="text-success font-bold text-lg">{{ t('playerGame.answerSubmitted') }}</p>
          </div>

          <!-- Answer buttons -->
          <div class="flex-1 grid grid-cols-1 gap-4 content-start">
            <button
              v-for="(option, i) in options"
              :key="option.id"
              class="group relative p-6 min-h-[56px] border-[3px] border-black pixel-shadow text-left font-bold text-lg transition-all duration-200"
              :class="[
                answerBg[i % answerBg.length],
                isMultiAnswer
                  ? (selectedAnswers.includes(option.id) ? 'ring-4 ring-white/50 scale-90' : '')
                  : (selectedAnswer?.index === i ? 'ring-4 ring-white/50 scale-90' : ''),
                !isMultiAnswer && submitted && selectedAnswer?.index !== i ? 'opacity-30' : '',
                (!isMultiAnswer && submitted) || timedOut ? 'pointer-events-none' : 'active:translate-x-1 active:translate-y-1 active:shadow-none'
              ]"
              :disabled="(!isMultiAnswer && submitted) || timedOut"
              @click="selectAnswer(option.id, i)"
            >
              <div class="flex items-center gap-3">
                <span class="w-12 h-12 bg-white/20 border-2 border-white flex items-center justify-center text-xl font-bold pixel-font flex-shrink-0">
                  <template v-if="isMultiAnswer && selectedAnswers.includes(option.id)">✓</template>
                  <template v-else>{{ answerLabels[i] }}</template>
                </span>
                <span class="flex-1 text-2xl font-bold">{{ option.text }}</span>
              </div>
            </button>
          </div>

          <!-- Multi-answer submit button -->
          <div v-if="isMultiAnswer && !submitted && !timedOut" class="mt-4">
            <button
              class="w-full py-4 bg-success text-white border-[3px] border-black pixel-shadow font-bold text-xl transition-all"
              :class="selectedAnswers.length > 0 ? 'active:translate-x-1 active:translate-y-1 active:shadow-none' : 'opacity-50 cursor-not-allowed'"
              :disabled="selectedAnswers.length === 0"
              @click="submitMultiAnswer"
            >
              {{ t('playerGame.submitAnswer') }} ({{ selectedAnswers.length }})
            </button>
            <p class="text-sm text-muted-foreground text-center mt-2">{{ t('playerGame.selectMultiple') }}</p>
          </div>

          <!-- Footer -->
          <div class="mt-6 text-center">
            <div class="text-sm text-muted-foreground">
              {{ t('playerGame.playingAs') }} <span class="font-bold text-primary">{{ game.playerName || t('game.player') }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ── Question ended (results) ────────────────── -->
    <template v-else>
      <div class="flex-1 flex flex-col items-center justify-center px-4 py-6 bg-gradient-to-br from-success/20 to-primary/20">
        <div class="w-full max-w-sm space-y-4">
          <!-- Feedback -->
          <div class="text-center space-y-4">
            <div v-if="submitted && wasCorrect === true">
              <div class="inline-flex items-center justify-center w-24 h-24 bg-success border-[3px] border-black pixel-shadow-lg animate-bounce mb-4">
                <PixelCheck class="text-white" :size="48" />
              </div>
              <h2 class="text-4xl font-bold text-success mb-2">{{ t('playerGame.correct') }}</h2>
              <p class="text-xl text-muted-foreground">{{ t('playerGame.niceWork') }}</p>
            </div>
            <div v-else-if="submitted && wasCorrect === false">
              <div class="inline-flex items-center justify-center w-16 h-16 bg-destructive border-[3px] border-black pixel-shadow mb-4">
                <svg class="text-white" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2 class="text-4xl font-bold text-destructive mb-2">{{ t('playerGame.wrong') }}</h2>
              <p class="text-xl text-muted-foreground">{{ t('playerGame.betterLuckNextTime') }}</p>
            </div>
            <div v-else>
              <div class="inline-flex items-center justify-center w-16 h-16 bg-muted border-[3px] border-black pixel-shadow mb-4">
                <svg class="text-muted-foreground" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h2 class="text-3xl font-bold text-muted-foreground mb-2">{{ t('playerGame.noAnswer') }}</h2>
              <p class="text-lg text-muted-foreground/60">+0 pts</p>
            </div>
          </div>

          <!-- Combined Score Stats (Points, Total, Rank) -->
          <PixelCard v-if="submitted && myEntry" class="!p-4">
            <div class="flex items-center justify-between gap-4">
              <div class="text-center flex-1">
                <div class="text-xs text-foreground/60 mb-1">{{ t('playerGame.points') }}</div>
                <div class="text-2xl font-bold" :class="wasCorrect ? 'text-success' : 'text-muted-foreground'">
                  +{{ pointsEarned ?? 0 }}
                </div>
              </div>
              <div class="w-px h-12 bg-border"></div>
              <div class="text-center flex-1">
                <div class="text-xs text-foreground/60 mb-1">{{ t('playerGame.total') }}</div>
                <div class="text-2xl font-bold text-foreground">{{ myEntry.score?.toLocaleString() }}</div>
              </div>
              <div class="w-px h-12 bg-border"></div>
              <div class="text-center flex-1">
                <div class="text-xs text-foreground/60 mb-1">{{ t('playerGame.rank') }}</div>
                <div class="text-2xl font-bold" :class="wasCorrect ? 'text-warning' : 'text-foreground'">#{{ myEntry.position }}</div>
              </div>
            </div>
          </PixelCard>

          <!-- Answer reveal (MC/TF/Poll only) -->
          <div
            v-if="options.length > 0 && !isSlider && !isSort && !isPinAnswer && !isTypeAnswer"
            class="grid gap-2 w-full"
            :class="options.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'"
          >
            <div
              v-for="(option, i) in options"
              :key="option.id"
              class="border-[3px] py-3 px-3 text-sm font-bold flex items-center gap-2"
              :class="correctAnswerIds.includes(option.id)
                ? 'border-success bg-success text-success-foreground'
                : 'border-border bg-muted/50 text-muted-foreground'"
            >
              <span class="w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 border-2 border-current">
                {{ answerLabels[i] }}
              </span>
              <span class="flex-1 text-left truncate">{{ option.text }}</span>
              <span v-if="correctAnswerIds.includes(option.id)" class="font-bold">&#10003;</span>
            </div>
          </div>

          <!-- Top 5 leaderboard -->
          <PixelCard v-if="top5.length > 0" class="w-full !p-3">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 text-center">{{ t('playerGame.topPlayers') }}</h3>
            <div class="space-y-1">
              <div
                v-for="entry in top5"
                :key="entry.playerId"
                class="flex items-center gap-2 px-2 py-1.5 border-2"
                :class="entry.playerId === game.playerId ? 'border-primary bg-primary/10' : 'border-border'"
              >
                <span
                  class="text-sm font-bold w-5 text-center"
                  :class="entry.position <= 3 ? 'text-warning' : 'text-muted-foreground'"
                >
                  {{ entry.position <= 3 ? AVATARS.MEDALS[entry.position - 1] : entry.position }}
                </span>
                <span
                  class="flex-1 text-sm font-medium truncate"
                  :class="entry.playerId === game.playerId ? 'text-primary' : 'text-foreground'"
                >
                  {{ entry.playerId === game.playerId ? t('game.you') : entry.nickname }}
                </span>
                <span class="text-xs font-mono text-muted-foreground">{{ entry.score }}</span>
              </div>
            </div>
          </PixelCard>

          <div class="text-center">
            <span class="inline-block px-4 py-2 bg-card/90 backdrop-blur-sm border-2 border-border text-foreground text-sm font-medium animate-pulse">
              {{ t('playerGame.waitingForNextQuestion') }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.slider-pixel-grid {
  background-image: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 6px,
    rgba(0, 0, 0, 0.14) 6px,
    rgba(0, 0, 0, 0.14) 12px
  );
}

.slider-input {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  touch-action: pan-x;
}

.slider-input::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  appearance: none;
  height: 16px;
  background: transparent;
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -3px;
  border: 3px solid #000;
  background: rgb(34 197 94);
  box-shadow: 3px 3px 0 #000;
  transform: rotate(45deg);
  border-radius: 0;
}

.slider-input::-moz-range-track {
  height: 16px;
  background: transparent;
  border: 0;
}

.slider-input::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border: 3px solid #000;
  background: rgb(34 197 94);
  box-shadow: 3px 3px 0 #000;
  transform: rotate(45deg);
  border-radius: 0;
}
</style>
