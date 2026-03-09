import { defineStore } from 'pinia';
import { ref, reactive, watch } from 'vue';
import {
  readPersistedPlayerSession,
  writePersistedPlayerSession,
  clearPersistedPlayerSession
} from '../lib/playerSession.js';

export const useGameStore = defineStore('game', () => {
  const persistedSession = readPersistedPlayerSession();

  const pin = ref(persistedSession?.pin ?? null);
  const playerId = ref(persistedSession?.playerId ?? null);
  const sessionId = ref(persistedSession?.sessionId ?? null);
  const playerName = ref(persistedSession?.playerName ?? '');
  const playerEmoji = ref(persistedSession?.playerEmoji ?? '');
  const status = ref(persistedSession?.status ?? null); // 'lobby' | 'playing' | 'paused' | 'finished'
  const players = ref([]);
  const currentQuestion = ref(persistedSession?.currentQuestion ?? null);
  const leaderboard = ref(Array.isArray(persistedSession?.leaderboard) ? persistedSession.leaderboard : []);
  const answerResult = ref(null);

  // Streak tracking
  const currentStreak = ref(0);
  const maxStreak = ref(0);
  const streakLabel = ref(null);
  const lastPointsEarned = ref(0);
  const lastStreakMultiplier = ref(1.0);

  // Player display settings (persisted to localStorage)
  const defaultSettings = { showAnswerText: true };
  const saved = localStorage.getItem('playerSettings');
  const playerSettings = reactive(
    saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings }
  );

  function setPlayerSetting(key, value) {
    playerSettings[key] = value;
    localStorage.setItem('playerSettings', JSON.stringify(playerSettings));
  }

  function setSession(data) {
    if (data.pin !== undefined) pin.value = data.pin;
    if (data.playerId !== undefined) playerId.value = data.playerId;
    if (data.sessionId !== undefined) sessionId.value = data.sessionId;
  }

  function reset() {
    pin.value = null;
    playerId.value = null;
    sessionId.value = null;
    playerName.value = '';
    playerEmoji.value = '';
    status.value = null;
    players.value = [];
    currentQuestion.value = null;
    leaderboard.value = [];
    answerResult.value = null;
    currentStreak.value = 0;
    maxStreak.value = 0;
    streakLabel.value = null;
    lastPointsEarned.value = 0;
    lastStreakMultiplier.value = 1.0;
  }

  function updateStreak(streak, label, multiplier, points) {
    currentStreak.value = streak;
    maxStreak.value = Math.max(maxStreak.value, streak);
    streakLabel.value = label;
    lastStreakMultiplier.value = multiplier || 1.0;
    lastPointsEarned.value = points || 0;
  }

  function resetStreak() {
    currentStreak.value = 0;
    streakLabel.value = null;
    lastStreakMultiplier.value = 1.0;
  }

  watch(
    [pin, playerId, sessionId, playerName, playerEmoji, status, currentQuestion, leaderboard],
    () => {
      if (!sessionId.value || !playerId.value) {
        clearPersistedPlayerSession();
        return;
      }

      writePersistedPlayerSession({
        pin: pin.value,
        playerId: playerId.value,
        sessionId: sessionId.value,
        playerName: playerName.value,
        playerEmoji: playerEmoji.value,
        status: status.value,
        currentQuestion: currentQuestion.value,
        leaderboard: leaderboard.value
      });
    },
    { deep: true }
  );

  return {
    pin,
    playerId,
    sessionId,
    playerName,
    playerEmoji,
    status,
    players,
    currentQuestion,
    leaderboard,
    answerResult,
    playerSettings,
    currentStreak,
    maxStreak,
    streakLabel,
    lastPointsEarned,
    lastStreakMultiplier,
    setSession,
    setPlayerSetting,
    reset,
    updateStreak,
    resetStreak
  };
});
