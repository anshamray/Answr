import { ref } from 'vue';
import { STORAGE_KEYS } from '../constants/index.js';

const DEFAULT_GAME_SETTINGS = {
  showLeaderboard: true,
  musicEnabled: true,
  allowLateJoins: false
};

export function useGameSettings() {
  const gameSettings = ref({ ...DEFAULT_GAME_SETTINGS });

  function loadGameSettings() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEYS.GAME_SETTINGS);
      if (!stored) {
        gameSettings.value = { ...DEFAULT_GAME_SETTINGS };
        return;
      }

      const parsed = JSON.parse(stored);
      gameSettings.value = {
        ...DEFAULT_GAME_SETTINGS,
        ...parsed
      };
    } catch {
      gameSettings.value = { ...DEFAULT_GAME_SETTINGS };
    }
  }

  function saveGameSettings() {
    try {
      sessionStorage.setItem(STORAGE_KEYS.GAME_SETTINGS, JSON.stringify(gameSettings.value));
    } catch {
      // Ignore storage errors (e.g. disabled cookies)
    }
  }

  function updateGameSettings(partial) {
    gameSettings.value = {
      ...gameSettings.value,
      ...partial
    };
    saveGameSettings();
  }

  return {
    gameSettings,
    loadGameSettings,
    saveGameSettings,
    updateGameSettings
  };
}

