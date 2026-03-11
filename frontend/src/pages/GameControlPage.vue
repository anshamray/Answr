<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { getSocket, connectSocket } from '../lib/socket.js';
import { apiUrl, authMediaUrl } from '../lib/api.js';
import { isExternalVideoUrl, getExternalVideoEmbedUrl } from '../lib/mediaService.js';
import { STORAGE_KEYS, ANSWER_COLORS } from '../constants/index.js';
import {
  questionAllowsMultipleAnswers,
  normalizeTextAnswer,
  parsePinAnswer,
  getSelectedAnswerIds,
  getAnswerDistributionKeysForQuestion
} from '../lib/answerUtils.js';
import { useSliderQuestion } from '../composables/useSliderQuestion.js';
import { useGameSettings } from '../composables/useGameSettings.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelClock from '../components/icons/PixelClock.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';
import PixelCheck from '../components/icons/PixelCheck.vue';
import ModeratorRevealView from '../components/game/ModeratorRevealView.vue';

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
const playerNameById = ref({});
const leaderboard = ref([]);
const previousLeaderboard = ref([]);
let endGameRedirectTimer = null;

// Intro phase: 'intro' (question only) -> 'answering' (answers visible) -> handled by status='reveal'
const phase = ref('answering');
const introCountdown = ref(3);
let introInterval = null;

// Game settings from lobby (shared with SessionLobbyPage)
const { gameSettings, loadGameSettings } = useGameSettings();

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
const questionMediaUrl = computed(() => {
  const url = currentQuestion.value?.mediaUrl;
  if (!url) return null;
  return authMediaUrl(url, auth.token);
});
const questionMediaEmbedUrl = computed(() => {
  const url = currentQuestion.value?.mediaUrl;
  if (!url || !isExternalVideoUrl(url)) return null;
  return getExternalVideoEmbedUrl(url);
});
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

const sliderConfigSource = computed(() => currentQuestion.value?.sliderConfig || null);

const {
  sliderConfig,
  sliderAcceptedRange,
  hasSliderAcceptedRangeWidth,
  sliderEntries,
  sliderAverageValue,
  getSliderPosition,
  isSliderValueCorrect,
  formatSliderValue,
  formatAcceptedSliderRange
} = useSliderQuestion({
  configRef: sliderConfigSource,
  distributionRef: answerDistribution
});

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

function isPinAnswerCorrect(coords) {
  const config = currentQuestion.value?.pinConfig;
  if (!coords || config?.x == null || config?.y == null) return false;

  const dx = coords.x - Number(config.x);
  const dy = coords.y - Number(config.y);
  const distance = Math.sqrt((dx ** 2) + (dy ** 2));
  return distance <= Number(config.radius || 10);
}

function rebuildAnswerDistribution() {
  const nextDistribution = {};

  for (const answerId of Object.values(playerAnswers.value)) {
    for (const key of getAnswerDistributionKeysForQuestion(currentQuestion.value, answerId)) {
      nextDistribution[key] = (nextDistribution[key] || 0) + 1;
    }
  }

  answerDistribution.value = nextDistribution;
}

function getPlayerName(playerId) {
  return playerNameById.value[playerId] || t('game.player');
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
  const total = questionAllowsMultipleAnswers(currentQuestion.value)
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
      return answers.reduce((sum, answerId) => {
        const key = getAnswerDistributionKeysForQuestion(currentQuestion.value, answerId)[0];
        return key === correctSortKey.value ? sum + 1 : sum;
      }, 0);
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

function isAnswerCorrectForCurrentQuestion(answerId) {
  if (!currentQuestion.value) return false;
  const qType = currentQuestion.value.type || 'multiple-choice';

  if (isSliderQuestion.value) {
    const numeric = Number(Array.isArray(answerId) ? answerId[0] : answerId);
    if (!Number.isFinite(numeric)) return false;
    return isSliderValueCorrect(numeric);
  }

  if (isSortQuestion.value) {
    const key = getAnswerDistributionKeysForQuestion(currentQuestion.value, answerId)[0];
    return key === correctSortKey.value;
  }

  if (qType === 'pin-answer') {
    const coords = parsePinAnswer(answerId);
    return isPinAnswerCorrect(coords);
  }

  if (qType === 'type-answer') {
    return acceptedTypeAnswerSet.value.has(normalizeTextAnswer(answerId));
  }

  const correctIds = (currentQuestion.value.answers || [])
    .filter((answer) => answer.isCorrect)
    .map((answer) => String(answer._id));

  if (correctIds.length === 0) return false;

  const selectedIds = getSelectedAnswerIds(answerId);
  const correctIdSet = new Set(correctIds);

  if (questionAllowsMultipleAnswers()) {
    const selectedIdSet = new Set(selectedIds);
    if (selectedIdSet.size !== correctIdSet.size) return false;
    return correctIds.every((id) => selectedIdSet.has(id));
  }

  return selectedIds.length === 1 && correctIdSet.has(selectedIds[0]);
}

const playerAnswerRows = computed(() => {
  const q = currentQuestion.value;
  if (!q) return [];

  const qType = q.type || 'multiple-choice';

  return Object.entries(playerAnswers.value).map(([playerId, rawAnswer]) => {
    let displayAnswer = '';

    if (isSliderQuestion.value) {
      const numeric = Number(Array.isArray(rawAnswer) ? rawAnswer[0] : rawAnswer);
      displayAnswer = Number.isFinite(numeric) ? formatSliderValue(numeric) : '';
    } else if (isSortQuestion.value) {
      const orderIds = getSelectedAnswerIds(rawAnswer);
      displayAnswer = getSortOrderText(orderIds);
    } else if (qType === 'pin-answer') {
      const coords = parsePinAnswer(rawAnswer);
      displayAnswer = coords
        ? `(${coords.x.toFixed(1)}%, ${coords.y.toFixed(1)}%)`
        : '';
    } else if (qType === 'type-answer') {
      displayAnswer = String(rawAnswer || '');
    } else {
      const selectedIds = getSelectedAnswerIds(rawAnswer);
      if (selectedIds.length > 0) {
        displayAnswer = selectedIds
          .map((id) => answerTextById.value.get(String(id)) || '—')
          .join(', ');
      }
    }

    return {
      playerId,
      name: getPlayerName(playerId),
      answer: displayAnswer,
      isCorrect: isAnswerCorrectForCurrentQuestion(rawAnswer)
    };
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
});

function getAccuracyPercentage() {
  const total = answersReceived.value || totalDistributionAnswers.value;
  if (total === 0) return 0;
  return Math.round((getCorrectCount() / total) * 100);
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

  // Store the last leaderboard snapshot so we can compute per-question deltas
  previousLeaderboard.value = leaderboard.value || [];

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
      for (const key of getAnswerDistributionKeysForQuestion(currentQuestion.value, data.answerId)) {
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
    const rawLeaderboard = data?.leaderboard || [];

    // Compute per-question points earned by diffing against the previous leaderboard snapshot.
    const prevScores = new Map(
      (previousLeaderboard.value || []).map((entry) => [entry.playerId, entry.score || 0])
    );

    leaderboard.value = rawLeaderboard.map((entry) => {
      const prev = prevScores.get(entry.playerId) ?? 0;
      const current = entry.score || 0;
      const delta = current - prev;
      return {
        ...entry,
        delta
      };
    });
  });

  socket.on('game:end', handleGameEnded);

  socket.on('lobby:update', (data) => {
    playerCount.value = data.playerCount || data.players?.length || 0;
    if (Array.isArray(data.players)) {
      const nextMap = {};
      for (const player of data.players) {
        if (player?.id) {
          nextMap[player.id] = player.nickname || t('game.player');
        }
      }
      playerNameById.value = nextMap;
    }
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
    mediaUrl: q.mediaUrl || null,
    mediaType: q.mediaType || null,
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
const showPinResultsFullscreen = ref(false);

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

function handleEndButtonClick() {
  // On the last question (reveal phase), go straight to results without showing the confirmation dialog
  if (isLastQuestion.value && showCorrect.value) {
    endGame();
    return;
  }

  showEndConfirm.value = true;
}

onMounted(() => {
  loadGameSettings();
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

            <PixelCard class="!p-6 lg:!p-10 space-y-4">
              <h1 class="text-2xl lg:text-4xl font-bold leading-tight">
                {{ currentQuestion.text }}
              </h1>
              <div v-if="questionMediaEmbedUrl" class="mt-4 flex justify-center">
                <div class="w-full max-w-3xl aspect-video border-[4px] border-black bg-black overflow-hidden">
                  <iframe
                    :src="questionMediaEmbedUrl"
                    class="w-full h-full"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                </div>
              </div>
              <div v-else-if="questionMediaUrl" class="mt-2 flex justify-center">
                <img
                  :src="questionMediaUrl"
                  :alt="currentQuestion.text"
                  class="border-[4px] border-black max-h-[min(14rem,calc(100vh-24rem))] max-w-full object-contain"
                />
              </div>
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
              <div
                v-if="questionMediaEmbedUrl && currentQuestion.type !== 'pin-answer'"
                class="mt-3 flex justify-center"
              >
                <div class="w-full max-w-3xl aspect-video border-[4px] border-black bg-black overflow-hidden">
                  <iframe
                    :src="questionMediaEmbedUrl"
                    class="w-full h-full"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                </div>
              </div>
              <div
                v-else-if="questionMediaUrl && currentQuestion.type !== 'pin-answer'"
                class="mt-1 flex justify-center"
              >
                <img
                  :src="questionMediaUrl"
                  :alt="currentQuestion.text"
                  class="border-[4px] border-black max-h-[min(14rem,calc(100vh-24rem))] max-w-full object-contain"
                />
              </div>

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
      <ModeratorRevealView
        :current-question="currentQuestion"
        :is-last-question="isLastQuestion"
        :answers-received="answersReceived"
        :player-count="playerCount"
        :total-distribution-answers="totalDistributionAnswers"
        :is-slider-question="isSliderQuestion"
        :is-sort-question="isSortQuestion"
        :is-pin-answer-question="isPinAnswerQuestion"
        :is-type-answer-question="isTypeAnswerQuestion"
        :bar-bg="barBg"
        :bar-labels="barLabels"
        :answer-gradients="answerGradients"
        :get-count="getCount"
        :get-percentage="getPercentage"
        :get-bar-width="getBarWidth"
        :get-correct-count="getCorrectCount"
        :get-accuracy-percentage="getAccuracyPercentage"
        :get-correct-answer-label="getCorrectAnswerLabel"
        :accepted-type-answers="acceptedTypeAnswers"
        :text-answer-entries="textAnswerEntries"
        :correct-sort-order-ids="correctSortOrderIds"
        :top-sort-answer-entries="topSortAnswerEntries"
        :answer-text-by-id="answerTextById"
        :pin-answer-entries="pinAnswerEntries"
        :slider-config="sliderConfig"
        :slider-entries="sliderEntries"
        :slider-average-value="sliderAverageValue"
        :has-slider-accepted-range-width="hasSliderAcceptedRangeWidth"
        :slider-accepted-range="sliderAcceptedRange"
        :get-slider-position="getSliderPosition"
        :is-slider-value-correct="isSliderValueCorrect"
        :format-slider-value="formatSliderValue"
        :format-accepted-slider-range="formatAcceptedSliderRange"
        :player-answer-rows="playerAnswerRows"
        :top5="top5"
        :game-settings="gameSettings"
        :pin-question-media-url="pinQuestionMediaUrl"
        :show-pin-results-fullscreen="showPinResultsFullscreen"
        @next-question="sendNextQuestion"
        @end-button-click="handleEndButtonClick"
        @toggle-pin-fullscreen="showPinResultsFullscreen = true"
      />
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

    <!-- Pin-answer fullscreen image dialog -->
    <Teleport to="body">
      <div
        v-if="showPinResultsFullscreen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        @click.self="showPinResultsFullscreen = false"
      >
        <div class="max-w-5xl w-full px-4">
          <PixelCard class="!p-3 sm:!p-4 bg-black cursor-zoom-out" @click="showPinResultsFullscreen = false">
            <div
              v-if="pinQuestionMediaUrl"
              class="relative mx-auto w-fit max-w-full overflow-hidden"
            >
              <img
                :src="pinQuestionMediaUrl"
                :alt="currentQuestion?.text"
                class="block max-h-[min(90vh,40rem)] max-w-full object-contain"
              />

              <div
                v-if="currentQuestion?.pinConfig"
                class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 border-[3px] border-success bg-success/20 shadow-[3px_3px_0_rgba(0,0,0,0.9)] rotate-45"
                :style="{
                  left: `${currentQuestion.pinConfig.x}%`,
                  top: `${currentQuestion.pinConfig.y}%`,
                  width: `${(currentQuestion.pinConfig.radius || 8) * 2}%`,
                  height: `${(currentQuestion.pinConfig.radius || 8) * 2}%`
                }"
              ></div>
              <div
                v-if="currentQuestion?.pinConfig"
                class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                :style="{ left: `${currentQuestion.pinConfig.x}%`, top: `${currentQuestion.pinConfig.y}%` }"
              >
                <div class="flex h-7 w-7 items-center justify-center border-[3px] border-black bg-success text-xs font-bold text-white shadow-[3px_3px_0_#000] rotate-45">
                  <div class="-rotate-45">
                    ✓
                  </div>
                </div>
              </div>

              <div
                v-for="entry in pinAnswerEntries"
                :key="entry.playerId"
                class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                :style="{ left: `${entry.coords.x}%`, top: `${entry.coords.y}%` }"
              >
                <div
                  class="flex h-6 w-6 items-center justify-center border-[3px] border-black text-[10px] font-bold text-white shadow-[3px_3px_0_#000] rotate-45"
                  :class="entry.isCorrect ? 'bg-success' : 'bg-destructive'"
                >
                  <div class="-rotate-45">
                    {{ entry.label }}
                  </div>
                </div>
              </div>
            </div>
          </PixelCard>
        </div>
      </div>
    </Teleport>
  </div>
</template>
