import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  const pin = ref(null);
  const playerId = ref(null);
  const sessionId = ref(null);
  const playerName = ref('');
  const status = ref(null); // 'lobby' | 'playing' | 'paused' | 'finished'
  const players = ref([]);
  const currentQuestion = ref(null);
  const leaderboard = ref([]);
  const answerResult = ref(null);

  function setSession(data) {
    pin.value = data.pin || null;
    playerId.value = data.playerId || null;
    sessionId.value = data.sessionId || null;
  }

  function reset() {
    pin.value = null;
    playerId.value = null;
    sessionId.value = null;
    playerName.value = '';
    status.value = null;
    players.value = [];
    currentQuestion.value = null;
    leaderboard.value = [];
    answerResult.value = null;
  }

  return {
    pin,
    playerId,
    sessionId,
    playerName,
    status,
    players,
    currentQuestion,
    leaderboard,
    answerResult,
    setSession,
    reset
  };
});
