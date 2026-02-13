import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  const pin = ref(null);
  const playerId = ref(null);
  const sessionId = ref(null);
  const playerName = ref('');
  const playerEmoji = ref('');
  const status = ref(null); // 'lobby' | 'playing' | 'paused' | 'finished'
  const players = ref([]);
  const currentQuestion = ref(null);
  const leaderboard = ref([]);
  const answerResult = ref(null);

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
  }

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
    setSession,
    reset
  };
});
