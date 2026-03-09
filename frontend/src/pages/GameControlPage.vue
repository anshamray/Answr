<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { getSocket, connectSocket } from '../lib/socket.js';
import { apiUrl } from '../lib/api.js';
import { STORAGE_KEYS, ANSWER_COLORS } from '../constants/index.js';

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
const playerAnswers = ref({});
const leaderboard = ref([]);
let endGameRedirectTimer = null;

// Intro phase: 'intro' (question only) -> 'answering' (answers visible) -> handled by status='reveal'
const phase = ref('answering');
const introCountdown = ref(3);
let introInterval = null;

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

const isSliderQuestion = computed(() =>
  currentQuestion.value?.type === 'slider' ||
  (currentQuestion.value?.sliderConfig?.min != null && currentQuestion.value?.sliderConfig?.max != null)
);
const isSortQuestion = computed(() => currentQuestion.value?.type === 'sort');
const isPinAnswerQuestion = computed(() => currentQuestion.value?.type === 'pin-answer');
const isTypeAnswerQuestion = computed(() => currentQuestion.value?.type === 'type-answer');
const pinQuestionMediaUrl = computed(() => {
  const url = currentQuestion.value?.mediaUrl;
  if (!url) return null;

  const full = apiUrl(url);
  return pin.value ? `${full}${full.includes('?') ? '&' : '?'}sessionPin=${pin.value}` : full;
});

const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1);
const questionNumber = computed(() => currentIndex.value + 1);
const totalQuestions = computed(() => questions.value.length);
const showCorrect = computed(() => status.value === 'reveal');

const totalDistributionAnswers = computed(() =>
  Object.values(answerDistribution.value).reduce((s, c) => s + c, 0)
);

const sliderConfig = computed(() => currentQuestion.value?.sliderConfig || {
  min: 0,
  max: 100,
  correctValue: 50,
  margin: 'medium',
  unit: ''
});

const sliderEntries = computed(() =>
  Object.entries(answerDistribution.value)
    .map(([rawValue, count]) => ({
      rawValue,
      value: Number(rawValue),
      count
    }))
    .filter((entry) => Number.isFinite(entry.value) && entry.count > 0)
    .sort((a, b) => a.value - b.value)
);

const sliderAcceptedRange = computed(() => {
  const config = sliderConfig.value;
  const margins = {
    none: 0,
    low: 0.05,
    medium: 0.1,
    high: 0.2,
    max: 0.5
  };
  const range = Math.max(1, (config.max ?? 100) - (config.min ?? 0));
  const tolerance = range * (margins[config.margin] || 0);

  return {
    min: Math.max(config.min ?? 0, (config.correctValue ?? 0) - tolerance),
    max: Math.min(config.max ?? 100, (config.correctValue ?? 0) + tolerance)
  };
});

const sliderAverageValue = computed(() => {
  if (sliderEntries.value.length === 0 || totalDistributionAnswers.value === 0) return null;

  const weightedTotal = sliderEntries.value.reduce((sum, entry) => sum + (entry.value * entry.count), 0);
  return Math.round((weightedTotal / totalDistributionAnswers.value) * 10) / 10;
});

const hasSliderAcceptedRangeWidth = computed(() =>
  Math.abs(sliderAcceptedRange.value.max - sliderAcceptedRange.value.min) > 0.001
);

const top5 = computed(() => leaderboard.value.slice(0, 5));
const answerTextById = computed(() => new Map(
  (currentQuestion.value?.answers || []).map((answer) => [String(answer._id), answer.text])
));
const correctSortOrderIds = computed(() => {
  if (!isSortQuestion.value) return [];

  return [...(currentQuestion.value?.answers || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((answer) => String(answer._id));
});
const correctSortKey = computed(() => correctSortOrderIds.value.join(','));
const sortAnswerEntries = computed(() => {
  if (!isSortQuestion.value) return [];

  return Object.entries(answerDistribution.value)
    .map(([rawOrder, count]) => {
      const orderIds = rawOrder.split(',').filter(Boolean);
      return {
        rawOrder,
        orderIds,
        count,
        isCorrect: rawOrder === correctSortKey.value
      };
    })
    .filter((entry) => entry.orderIds.length > 0 && entry.count > 0)
    .sort((a, b) => b.count - a.count);
});
const topSortAnswerEntries = computed(() => sortAnswerEntries.value.slice(0, 4));

// Use shared answer colors from constants
const barBg = ANSWER_COLORS.BAR_COLORS;
const barLabels = ANSWER_COLORS.LABELS;
const answerGradients = ANSWER_COLORS.MODERATOR_GRADIENTS;

function questionAllowsMultipleAnswers(question = currentQuestion.value) {
  if (!question) return false;
  if (question.allowMultipleAnswers) return true;
  return (question.answers || []).filter((answer) => answer.isCorrect).length > 1;
}

function normalizeTextAnswer(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function parsePinAnswer(answerId) {
  if (answerId == null) return null;

  let parsed = answerId;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  const x = Number(parsed?.x);
  const y = Number(parsed?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    x: Math.min(Math.max(x, 0), 100),
    y: Math.min(Math.max(y, 0), 100)
  };
}

function isPinAnswerCorrect(coords) {
  const config = currentQuestion.value?.pinConfig;
  if (!coords || config?.x == null || config?.y == null) return false;

  const dx = coords.x - Number(config.x);
  const dy = coords.y - Number(config.y);
  const distance = Math.sqrt((dx ** 2) + (dy ** 2));
  return distance <= Number(config.radius || 10);
}

function getSelectedAnswerIds(answerId) {
  if (answerId == null) return [];
  if (Array.isArray(answerId)) {
    return answerId.map((id) => String(id));
  }
  return [String(answerId)];
}

function getAnswerDistributionKeys(answerId, question = currentQuestion.value) {
  const qType = question?.type || 'multiple-choice';
  if (answerId == null) return [];

  if (qType === 'sort') {
    return [getSelectedAnswerIds(answerId).join(',')];
  }

  if (qType === 'type-answer') {
    const normalized = normalizeTextAnswer(answerId);
    return normalized ? [normalized] : [];
  }

  if (questionAllowsMultipleAnswers(question)) {
    return getSelectedAnswerIds(answerId);
  }

  if (Array.isArray(answerId)) {
    return [answerId.map((id) => String(id)).join(',')];
  }

  return [String(answerId)];
}

function rebuildAnswerDistribution() {
  const nextDistribution = {};

  for (const answerId of Object.values(playerAnswers.value)) {
    for (const key of getAnswerDistributionKeys(answerId)) {
      nextDistribution[key] = (nextDistribution[key] || 0) + 1;
    }
  }

  answerDistribution.value = nextDistribution;
}

const acceptedTypeAnswers = computed(() => {
  if (!isTypeAnswerQuestion.value) return [];

  return (currentQuestion.value?.answers || [])
    .map((answer) => String(answer.text || '').trim())
    .filter(Boolean);
});

const acceptedTypeAnswerSet = computed(() => new Set(
  acceptedTypeAnswers.value.map((answer) => normalizeTextAnswer(answer))
));

const textAnswerEntries = computed(() => {
  if (!isTypeAnswerQuestion.value) return [];

  const groupedAnswers = new Map();

  for (const rawAnswer of Object.values(playerAnswers.value)) {
    const text = String(rawAnswer || '').trim();
    const normalized = normalizeTextAnswer(text);
    if (!normalized) continue;

    const existingEntry = groupedAnswers.get(normalized);
    if (existingEntry) {
      existingEntry.count += 1;
      continue;
    }

    groupedAnswers.set(normalized, {
      key: normalized,
      text,
      count: 1,
      isCorrect: acceptedTypeAnswerSet.value.has(normalized)
    });
  }

  return Array.from(groupedAnswers.values())
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }));
});

const pinAnswerEntries = computed(() => {
  if (!isPinAnswerQuestion.value) return [];

  return Object.entries(playerAnswers.value)
    .map(([playerId, answerId], index) => {
      const coords = parsePinAnswer(answerId);
      if (!coords) return null;

      return {
        playerId,
        coords,
        isCorrect: isPinAnswerCorrect(coords),
        label: index + 1
      };
    })
    .filter(Boolean);
});

function getCount(answerId) {
  return answerDistribution.value[answerId] || 0;
}

function getBarWidth(answerId) {
  const count = getCount(answerId);
  const max = Math.max(1, ...Object.values(answerDistribution.value));
  return `${Math.max((count / max) * 100, 4)}%`;
}

function getPercentage(answerId) {
  const total = questionAllowsMultipleAnswers()
    ? answersReceived.value
    : totalDistributionAnswers.value;
  if (total === 0) return 0;
  return Math.round((getCount(answerId) / total) * 100);
}

function getCorrectCount() {
  if (!currentQuestion.value) return 0;
  const qType = currentQuestion.value.type || 'multiple-choice';

  if (isSliderQuestion.value) {
    return sliderEntries.value.reduce((sum, entry) => (
      isSliderValueCorrect(entry.value) ? sum + entry.count : sum
    ), 0);
  }

  if (isSortQuestion.value) {
    const answers = Object.values(playerAnswers.value);
    if (answers.length > 0) {
      return answers.reduce((sum, answerId) => (
        getAnswerDistributionKeys(answerId)[0] === correctSortKey.value ? sum + 1 : sum
      ), 0);
    }

    return sortAnswerEntries.value.reduce((sum, entry) => (
      entry.isCorrect ? sum + entry.count : sum
    ), 0);
  }

  if (qType === 'pin-answer') {
    return pinAnswerEntries.value.reduce((sum, entry) => (
      entry.isCorrect ? sum + 1 : sum
    ), 0);
  }

  if (qType === 'type-answer') {
    const answers = Object.values(playerAnswers.value);
    if (answers.length > 0) {
      return answers.reduce((sum, answerId) => (
        acceptedTypeAnswerSet.value.has(normalizeTextAnswer(answerId)) ? sum + 1 : sum
      ), 0);
    }

    return textAnswerEntries.value.reduce((sum, entry) => (
      entry.isCorrect ? sum + entry.count : sum
    ), 0);
  }

  const correctIds = (currentQuestion.value.answers || [])
    .filter((answer) => answer.isCorrect)
    .map((answer) => String(answer._id));
  const answers = Object.values(playerAnswers.value);

  if (answers.length > 0) {
    const correctIdSet = new Set(correctIds);

    return answers.reduce((sum, answerId) => {
      const selectedIds = getSelectedAnswerIds(answerId);

      if (questionAllowsMultipleAnswers()) {
        const selectedIdSet = new Set(selectedIds);
        const isCorrect = selectedIdSet.size === correctIdSet.size &&
          correctIds.every((id) => selectedIdSet.has(id));

        return isCorrect ? sum + 1 : sum;
      }

      return selectedIds.length === 1 && correctIdSet.has(selectedIds[0]) ? sum + 1 : sum;
    }, 0);
  }

  return correctIds.reduce((sum, id) => sum + getCount(id), 0);
}

function getAccuracyPercentage() {
  const total = answersReceived.value || totalDistributionAnswers.value;
  if (total === 0) return 0;
  return Math.round((getCorrectCount() / total) * 100);
}

function getSliderPosition(value) {
  const min = sliderConfig.value.min ?? 0;
  const max = sliderConfig.value.max ?? 100;
  const range = max - min;

  if (range <= 0) return 50;

  const clamped = Math.min(Math.max(value, min), max);
  return ((clamped - min) / range) * 100;
}

function isSliderValueCorrect(value) {
  const accepted = sliderAcceptedRange.value;
  return value >= accepted.min && value <= accepted.max;
}

function formatSliderValue(value) {
  const unit = sliderConfig.value.unit ? ` ${sliderConfig.value.unit}` : '';
  return `${value}${unit}`;
}

function formatSliderRangeValue(value) {
  return `${Math.round(value * 10) / 10}${sliderConfig.value.unit ? ` ${sliderConfig.value.unit}` : ''}`;
}

function formatAcceptedSliderRange() {
  if (!hasSliderAcceptedRangeWidth.value) {
    return formatSliderRangeValue(sliderAcceptedRange.value.min);
  }

  return `${formatSliderRangeValue(sliderAcceptedRange.value.min)} - ${formatSliderRangeValue(sliderAcceptedRange.value.max)}`;
}

function getSortOrderText(orderIds) {
  return orderIds
    .map((id) => answerTextById.value.get(String(id)) || '—')
    .join(' → ');
}

function getCorrectAnswerLabel() {
  const q = currentQuestion.value;
  if (!q) return '?';
  const qType = q.type || 'multiple-choice';

  if (isSliderQuestion.value && q.sliderConfig) {
    return q.sliderConfig.correctValue + (q.sliderConfig.unit ? ' ' + q.sliderConfig.unit : '');
  }
  if (qType === 'sort') {
    return getSortOrderText(correctSortOrderIds.value);
  }
  if (qType === 'pin-answer') {
    const pc = q.pinConfig;
    return pc ? `(${Math.round(pc.x)}%, ${Math.round(pc.y)}%)` : '📍';
  }
  if (qType === 'type-answer') {
    return (q.answers || []).map(a => a.text).join(' / ');
  }

  return q.answers.map((a, i) => a.isCorrect ? barLabels[i] : null).filter(Boolean).join(', ') || '?';
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

function rejoinModeratorSession() {
  const socket = getSocket();
  if (!socket || !pin.value) return;

  socket.emit('moderator:join', { pin: pin.value });
}

function handleModeratorQuestion(data) {
  const nextQuestionId = data?.questionId ? String(data.questionId) : null;
  if (!nextQuestionId) return;

  const previousQuestionId = currentQuestion.value?._id
    ? String(currentQuestion.value._id)
    : null;
  const nextIndex = questions.value.findIndex((question) => String(question._id) === nextQuestionId);

  if (nextIndex === -1) return;

  currentIndex.value = nextIndex;

  if (previousQuestionId !== nextQuestionId) {
    answersReceived.value = 0;
    answerDistribution.value = {};
    playerAnswers.value = {};
    leaderboard.value = [];
    status.value = 'question';
    phase.value = 'intro';
  } else if (status.value === 'loading') {
    status.value = 'question';
  }

  if (data?.timeLimit != null) {
    timeRemaining.value = data.timeLimit;
  }
}

function startIntroCountdown(seconds = 3) {
  stopIntroCountdown();
  introCountdown.value = seconds;

  introInterval = window.setInterval(() => {
    introCountdown.value--;
    if (introCountdown.value <= 0) {
      stopIntroCountdown();
    }
  }, 1000);
}

function stopIntroCountdown() {
  if (introInterval) {
    window.clearInterval(introInterval);
    introInterval = null;
  }
}

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
  socket.off('connect', rejoinModeratorSession);
  socket.off('player:answer:detail');
  socket.off('player:answer:received');
  socket.off('game:question');
  socket.off('game:timer');
  socket.off('game:questionIntro');
  socket.off('game:questionStart');
  socket.off('game:questionEnd');
  socket.off('game:leaderboard');
  socket.off('game:end', handleGameEnded);
  socket.off('lobby:update');

  socket.on('connect', rejoinModeratorSession);

  socket.on('game:question', handleModeratorQuestion);

  socket.on('game:questionIntro', (data) => {
    phase.value = 'intro';
    startIntroCountdown(data?.countdownSeconds || 3);
  });

  socket.on('game:questionStart', () => {
    stopIntroCountdown();
    phase.value = 'answering';
  });

  socket.on('player:answer:detail', (data) => {
    if (data?.playerId) {
      playerAnswers.value = {
        ...playerAnswers.value,
        [data.playerId]: data.answerId
      };
      rebuildAnswerDistribution();
    } else if (data?.answerId != null) {
      const nextDistribution = { ...answerDistribution.value };
      for (const key of getAnswerDistributionKeys(data.answerId)) {
        nextDistribution[key] = (nextDistribution[key] || 0) + 1;
      }
      answerDistribution.value = nextDistribution;
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
      if (phase.value === 'intro') {
        stopIntroCountdown();
        phase.value = 'answering';
      }
      if (status.value === 'loading') {
        status.value = 'question';
      }
      timeRemaining.value = data.remaining;
    }
  });

  socket.on('game:questionEnd', () => {
    stopIntroCountdown();
    if (status.value === 'question') {
      status.value = 'reveal';
    }
  });

  socket.on('game:leaderboard', (data) => {
    leaderboard.value = data?.leaderboard || [];
  });

  socket.on('game:end', handleGameEnded);

  socket.on('lobby:update', (data) => {
    playerCount.value = data.playerCount || data.players?.length || 0;
  });
}

function clearEndGameRedirectTimer() {
  if (endGameRedirectTimer) {
    window.clearTimeout(endGameRedirectTimer);
    endGameRedirectTimer = null;
  }
}

function navigateToResults() {
  if (router.currentRoute.value.path !== `/session/${sessionId}/control`) {
    return;
  }

  clearEndGameRedirectTimer();
  router.push(`/session/${sessionId}/results`);
}

function handleGameEnded() {
  status.value = 'ended';
  showEndConfirm.value = false;
  navigateToResults();
}

function cleanup() {
  clearEndGameRedirectTimer();
  stopIntroCountdown();

  const socket = getSocket();
  if (socket) {
    socket.off('connect', rejoinModeratorSession);
    socket.off('player:answer:detail');
    socket.off('player:answer:received');
    socket.off('game:question');
    socket.off('game:timer');
    socket.off('game:questionIntro');
    socket.off('game:questionStart');
    socket.off('game:questionEnd');
    socket.off('game:leaderboard');
    socket.off('game:end', handleGameEnded);
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

  const qType = q.type || 'multiple-choice';

  const payload = {
    questionId: q._id,
    questionNumber: questionNumber.value,
    totalQuestions: totalQuestions.value,
    text: q.text,
    type: qType,
    options,
    timeLimit: q.timeLimit,
    correctAnswerIds,
    allowMultipleAnswers: q.allowMultipleAnswers || correctAnswerIds.length > 1,
    sliderConfig: q.sliderConfig || null
  };

  // Sort: correctAnswerIds = IDs in correct order (by answer.order field)
  if (qType === 'sort') {
    payload.correctAnswerIds = [...(q.answers || [])]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((a) => a._id);
    // Shuffle options so players don't see the correct order
    payload.options = shuffleArray([...payload.options]);
  }

  // Pin-answer: include mediaUrl for image display and pinConfig for scoring
  if (qType === 'pin-answer') {
    payload.mediaUrl = q.mediaUrl || null;
    payload.pinConfig = q.pinConfig || null;
  }

  // Type-answer: send accepted answers for server scoring
  if (qType === 'type-answer') {
    payload.acceptedAnswers = (q.answers || []).map((a) => a.text);
  }

  return payload;
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sendFirstQuestion() {
  currentIndex.value = 0;
  answersReceived.value = 0;
  answerDistribution.value = {};
  playerAnswers.value = {};
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
  playerAnswers.value = {};
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

const showEndConfirm = ref(false);

function endGame() {
  const socket = getSocket();
  if (socket) {
    socket.emit('moderator:end');
  }
  status.value = 'ended';
  showEndConfirm.value = false;

  clearEndGameRedirectTimer();
  endGameRedirectTimer = window.setTimeout(() => {
    if (status.value === 'ended') {
      navigateToResults();
    }
  }, 10000);
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

            <div class="space-y-3">
              <div
                class="text-7xl lg:text-9xl font-bold pixel-font transition-all duration-300"
                :class="introCountdown > 0 ? 'text-primary scale-100' : 'text-success scale-110'"
              >
                {{ introCountdown > 0 ? introCountdown : 'GO!' }}
              </div>
              <div class="text-2xl text-muted-foreground animate-pulse">
                {{ t('gameControl.getReady') }}
              </div>
            </div>
          </div>
        </main>

        <footer class="border-t-[3px] border-black bg-white px-4 py-3 flex justify-center gap-3">
          <PixelButton variant="outline" @click="showEndConfirm = true">{{ t('gameControl.endGame') }}</PixelButton>
        </footer>
      </template>

      <!-- Answering Phase: Show question + answers + timer -->
      <template v-else>
        <main
          class="flex-1 p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-secondary/10"
          :class="currentQuestion.type === 'pin-answer' ? 'overflow-hidden' : ''"
        >
          <div
            class="max-w-7xl mx-auto space-y-4"
            :class="currentQuestion.type === 'pin-answer' ? 'flex h-full flex-col' : ''"
          >
            <!-- Question Header -->
            <div class="flex items-center justify-between" :class="currentQuestion.type === 'pin-answer' ? 'shrink-0' : ''">
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
            <PixelCard
              class="space-y-4 !p-4 lg:!p-6"
              :class="currentQuestion.type === 'pin-answer' ? 'flex min-h-0 flex-1 flex-col overflow-hidden !p-3 lg:!p-4' : ''"
            >
              <h1 class="text-2xl lg:text-3xl font-bold leading-tight">
                {{ currentQuestion.text }}
              </h1>

              <!-- MC / True-False / Poll: answer grid -->
              <div v-if="currentQuestion.answers && currentQuestion.answers.length > 0 && ![ 'pin-answer', 'type-answer', 'sort' ].includes(currentQuestion.type) && !isSliderQuestion" class="grid grid-cols-2 gap-3">
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

              <!-- Slider: show visual slider on presenter screen -->
              <div v-else-if="isSliderQuestion" class="flex flex-col items-center gap-4 py-4">
                <div class="text-5xl lg:text-7xl font-bold pixel-font text-primary">?</div>
                <div class="w-full max-w-lg px-4">
                  <div class="w-full h-4 bg-muted border-2 border-black rounded-none relative">
                    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-primary border-2 border-black"></div>
                  </div>
                  <div class="flex justify-between text-base font-bold text-muted-foreground mt-2">
                    <span>{{ currentQuestion.sliderConfig?.min ?? 0 }}</span>
                    <span></span>
                    <span>{{ currentQuestion.sliderConfig?.max ?? 100 }}{{ currentQuestion.sliderConfig?.unit ? ' ' + currentQuestion.sliderConfig.unit : '' }}</span>
                  </div>
                </div>
              </div>

              <!-- Sort: show sorting mode instead of fake option bars -->
              <div v-else-if="isSortQuestion" class="space-y-4 py-2">
                <div class="text-center text-lg text-muted-foreground">
                  ↕ {{ t('gameControl.playersSorting') }}
                </div>
                <div class="grid gap-2 sm:grid-cols-2">
                  <div
                    v-for="answer in currentQuestion.answers"
                    :key="answer._id"
                    class="border-[3px] border-black bg-white px-4 py-3 font-bold text-base"
                  >
                    {{ answer.text }}
                  </div>
                </div>
              </div>

              <!-- Type-answer: show hint -->
              <div v-else-if="currentQuestion.type === 'type-answer'" class="text-center text-lg text-muted-foreground py-4">
                ⌨️ {{ t('gameControl.playersTyping') }}
              </div>

              <!-- Pin-answer: show image -->
              <div v-else-if="currentQuestion.type === 'pin-answer'" class="flex min-h-0 flex-1 flex-col space-y-3 py-1">
                <div class="text-center text-lg text-muted-foreground">
                  📍 {{ t('gameControl.playersPinning') }}
                </div>
                <div class="mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center justify-center overflow-hidden border-[3px] border-black bg-white">
                  <img
                    v-if="pinQuestionMediaUrl"
                    :src="pinQuestionMediaUrl"
                    :alt="currentQuestion.text"
                    class="block h-full max-h-[min(24rem,calc(100vh-19rem))] w-full object-contain"
                  />
                  <div v-else class="flex min-h-48 items-center justify-center px-6 py-10 text-center text-muted-foreground">
                    {{ t('playerGame.imageNotAvailable') }}
                  </div>
                </div>
              </div>
            </PixelCard>
          </div>
        </main>

        <!-- Controls -->
        <footer class="border-t-[3px] border-black bg-white px-4 py-3 flex justify-center gap-3">
          <PixelButton variant="primary" @click="revealAnswer">{{ t('gameControl.revealAnswer') }}</PixelButton>
          <PixelButton variant="outline" @click="showEndConfirm = true">{{ t('gameControl.endGame') }}</PixelButton>
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
              {{ t('gameControl.correctAnswer') }}: {{ getCorrectAnswerLabel() }}
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
              <PixelCard v-if="currentQuestion.answers && currentQuestion.answers.length > 0 && ![ 'pin-answer', 'type-answer', 'sort' ].includes(currentQuestion.type) && !isSliderQuestion" class="space-y-3 !p-4">
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

              <!-- Slider results -->
              <PixelCard v-else-if="isSliderQuestion" class="space-y-4 !p-4">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
                  <PixelBadge variant="secondary" class="text-xs">
                    {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
                  </PixelBadge>
                </div>

                <div class="space-y-4">
                  <div class="relative px-2 pt-10 pb-8">
                    <div
                      v-if="hasSliderAcceptedRangeWidth"
                      class="absolute top-1/2 h-4 -translate-y-1/2 border-2 border-success bg-success/20"
                      :style="{
                        left: `${getSliderPosition(sliderAcceptedRange.min)}%`,
                        width: `${Math.max(getSliderPosition(sliderAcceptedRange.max) - getSliderPosition(sliderAcceptedRange.min), 2)}%`
                      }"
                    />

                    <div class="relative h-4 border-2 border-black bg-muted">
                      <div
                        class="absolute top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 bg-success border border-black"
                        :style="{ left: `${getSliderPosition(sliderConfig.correctValue ?? 0)}%` }"
                      />

                      <div
                        v-for="entry in sliderEntries"
                        :key="entry.rawValue"
                        class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                        :style="{ left: `${getSliderPosition(entry.value)}%` }"
                      >
                        <div
                          class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-bold border-2 border-black whitespace-nowrap"
                          :class="isSliderValueCorrect(entry.value) ? 'bg-success text-white' : 'bg-white text-foreground'"
                        >
                          {{ entry.count }} x {{ formatSliderValue(entry.value) }}
                        </div>
                        <div
                          class="h-6 w-6 border-2 border-black rotate-45"
                          :class="isSliderValueCorrect(entry.value) ? 'bg-success' : 'bg-primary'"
                        />
                      </div>
                    </div>

                    <div class="mt-3 flex justify-between text-sm font-bold text-muted-foreground">
                      <span>{{ formatSliderValue(sliderConfig.min ?? 0) }}</span>
                      <span></span>
                      <span>{{ formatSliderValue(sliderConfig.max ?? 100) }}</span>
                    </div>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-3">
                    <PixelCard class="text-center !p-3">
                      <div class="text-sm text-muted-foreground">{{ t('gameControl.correctAnswer') }}</div>
                      <div class="text-xl font-bold text-success">{{ formatSliderValue(sliderConfig.correctValue ?? 0) }}</div>
                    </PixelCard>
                    <PixelCard class="text-center !p-3">
                      <div class="text-sm text-muted-foreground">{{ t('gameControl.averageAnswer') }}</div>
                      <div class="text-xl font-bold text-primary">
                        {{ sliderAverageValue == null ? '—' : formatSliderValue(sliderAverageValue) }}
                      </div>
                    </PixelCard>
                    <PixelCard class="text-center !p-3">
                      <div class="text-sm text-muted-foreground">{{ t('gameControl.acceptedRange') }}</div>
                      <div class="text-lg font-bold text-accent">
                        {{ formatAcceptedSliderRange() }}
                      </div>
                    </PixelCard>
                  </div>
                </div>
              </PixelCard>

              <PixelCard v-else-if="isSortQuestion" class="space-y-4 !p-4">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
                  <PixelBadge variant="secondary" class="text-xs">
                    {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
                  </PixelBadge>
                </div>

                <div class="grid gap-4 lg:grid-cols-2">
                  <div class="space-y-3">
                    <h3 class="text-sm font-bold uppercase text-muted-foreground">
                      {{ t('gameControl.correctOrder') }}
                    </h3>
                    <div class="space-y-2">
                      <div
                        v-for="(answerId, index) in correctSortOrderIds"
                        :key="answerId"
                        class="flex items-center gap-3 border-[3px] border-success bg-success/10 px-3 py-3"
                      >
                        <div class="w-8 h-8 bg-success text-white border-2 border-black flex items-center justify-center font-bold pixel-font">
                          {{ index + 1 }}
                        </div>
                        <div class="font-bold text-base">
                          {{ answerTextById.get(answerId) || '—' }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-3">
                    <h3 class="text-sm font-bold uppercase text-muted-foreground">
                      {{ t('gameControl.commonOrders') }}
                    </h3>
                    <div v-if="topSortAnswerEntries.length > 0" class="space-y-2">
                      <div
                        v-for="entry in topSortAnswerEntries"
                        :key="entry.rawOrder"
                        class="border-[3px] px-3 py-3 space-y-2"
                        :class="entry.isCorrect ? 'border-success bg-success/10' : 'border-black bg-white'"
                      >
                        <div class="flex items-center justify-between gap-3">
                          <PixelBadge :variant="entry.isCorrect ? 'success' : 'secondary'" class="text-[11px]">
                            {{ entry.isCorrect ? t('gameControl.exactMatches') : t('gameControl.commonOrder') }}
                          </PixelBadge>
                          <div class="text-right">
                            <span class="text-lg font-bold">{{ entry.count }}</span>
                            <span class="text-xs text-muted-foreground ml-1">
                              ({{ Math.round((entry.count / Math.max(totalDistributionAnswers, 1)) * 100) }}%)
                            </span>
                          </div>
                        </div>
                        <div class="space-y-1">
                          <div
                            v-for="(answerId, index) in entry.orderIds"
                            :key="`${entry.rawOrder}-${answerId}-${index}`"
                            class="flex items-center gap-2 text-sm"
                          >
                            <span class="w-6 h-6 border-2 border-black bg-muted flex items-center justify-center font-bold pixel-font text-xs">
                              {{ index + 1 }}
                            </span>
                            <span class="font-medium">{{ answerTextById.get(answerId) || '—' }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="border-[3px] border-dashed border-border bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                      {{ t('gameControl.noSortSubmissions') }}
                    </div>
                  </div>
                </div>
              </PixelCard>

              <PixelCard v-else-if="isPinAnswerQuestion" class="space-y-4 !p-4">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
                  <PixelBadge variant="secondary" class="text-xs">
                    {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
                  </PixelBadge>
                </div>

                <div class="flex flex-wrap gap-2 text-xs font-bold">
                  <PixelBadge variant="success" class="text-[11px]">
                    {{ t('gameControl.correctArea') }}
                  </PixelBadge>
                  <PixelBadge variant="secondary" class="text-[11px]">
                    {{ t('gameControl.playerPins') }}: {{ pinAnswerEntries.length }}
                  </PixelBadge>
                </div>

                <div class="border-[3px] border-black bg-white p-2 sm:p-3">
                  <div v-if="pinQuestionMediaUrl" class="relative mx-auto w-fit max-w-full">
                    <img
                      :src="pinQuestionMediaUrl"
                      :alt="currentQuestion.text"
                      class="block max-h-[min(34rem,calc(100vh-26rem))] max-w-full object-contain"
                    />

                    <div
                      v-if="currentQuestion.pinConfig"
                      class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-success bg-success/20 shadow-[0_0_0_3px_rgba(255,255,255,0.8)]"
                      :style="{
                        left: `${currentQuestion.pinConfig.x}%`,
                        top: `${currentQuestion.pinConfig.y}%`,
                        width: `${(currentQuestion.pinConfig.radius || 10) * 2}%`,
                        height: `${(currentQuestion.pinConfig.radius || 10) * 2}%`
                      }"
                    ></div>
                    <div
                      v-if="currentQuestion.pinConfig"
                      class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                      :style="{ left: `${currentQuestion.pinConfig.x}%`, top: `${currentQuestion.pinConfig.y}%` }"
                    >
                      <div class="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-success text-sm font-bold text-white shadow-lg">
                        ✓
                      </div>
                    </div>

                    <div
                      v-for="entry in pinAnswerEntries"
                      :key="entry.playerId"
                      class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                      :style="{ left: `${entry.coords.x}%`, top: `${entry.coords.y}%` }"
                    >
                      <div
                        class="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white text-xs font-bold text-white shadow-lg"
                        :class="entry.isCorrect ? 'bg-success' : 'bg-destructive'"
                      >
                        {{ entry.label }}
                      </div>
                    </div>
                  </div>

                  <div v-else class="flex min-h-48 items-center justify-center px-6 py-10 text-center text-muted-foreground">
                    {{ t('playerGame.imageNotAvailable') }}
                  </div>
                </div>

                <div v-if="pinAnswerEntries.length === 0" class="border-[3px] border-dashed border-border bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                  {{ t('gameControl.noPinSubmissions') }}
                </div>
              </PixelCard>

              <PixelCard v-else-if="isTypeAnswerQuestion" class="space-y-4 !p-4">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
                  <PixelBadge variant="secondary" class="text-xs">
                    {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
                  </PixelBadge>
                </div>

                <div class="space-y-3">
                  <h3 class="text-sm font-bold uppercase text-muted-foreground">
                    {{ t('gameControl.acceptedAnswers') }}
                  </h3>
                  <div class="flex flex-wrap gap-2">
                    <PixelBadge
                      v-for="answer in acceptedTypeAnswers"
                      :key="answer"
                      variant="success"
                      class="text-xs"
                    >
                      {{ answer }}
                    </PixelBadge>
                  </div>
                </div>

                <div class="space-y-3">
                  <h3 class="text-sm font-bold uppercase text-muted-foreground">
                    {{ t('gameControl.submittedAnswers') }}
                  </h3>

                  <div v-if="textAnswerEntries.length > 0" class="space-y-2">
                    <div
                      v-for="entry in textAnswerEntries"
                      :key="entry.key"
                      class="flex items-center justify-between gap-3 border-[3px] px-3 py-3"
                      :class="entry.isCorrect ? 'border-success bg-success/10' : 'border-black bg-white'"
                    >
                      <div class="min-w-0">
                        <div class="font-bold break-words">{{ entry.text }}</div>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <PixelBadge :variant="entry.isCorrect ? 'success' : 'secondary'" class="text-[11px]">
                          {{ entry.isCorrect ? t('session.correct') : t('gameControl.answered') }}
                        </PixelBadge>
                        <div class="text-right">
                          <span class="text-lg font-bold">{{ entry.count }}</span>
                          <span class="text-xs text-muted-foreground ml-1">
                            ({{ Math.round((entry.count / Math.max(answersReceived, 1)) * 100) }}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="border-[3px] border-dashed border-border bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                    {{ t('gameControl.noTypeSubmissions') }}
                  </div>
                </div>
              </PixelCard>

              <!-- Non-MC types: simple results summary -->
              <PixelCard v-else class="space-y-3 !p-4">
                <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
                <p class="text-muted-foreground">{{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}</p>
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
                    {{ getAccuracyPercentage() }}%
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
          @click="showEndConfirm = true"
        >
          {{ isLastQuestion ? t('gameControl.finishGame') : t('gameControl.endGame') }}
        </PixelButton>
      </footer>
    </template>
    <!-- End game confirmation dialog -->
    <Teleport to="body">
      <div v-if="showEndConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showEndConfirm = false">
        <PixelCard class="!p-6 max-w-sm w-full mx-4 space-y-4">
          <h2 class="text-xl font-bold text-center">{{ t('gameControl.endGameConfirmTitle') }}</h2>
          <p class="text-muted-foreground text-center">{{ t('gameControl.endGameConfirmText') }}</p>
          <div class="flex gap-3 justify-center">
            <PixelButton variant="outline" @click="showEndConfirm = false">{{ t('common.cancel') }}</PixelButton>
            <PixelButton variant="destructive" @click="endGame">{{ t('gameControl.endGame') }}</PixelButton>
          </div>
        </PixelCard>
      </div>
    </Teleport>
  </div>
</template>
