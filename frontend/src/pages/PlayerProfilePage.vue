<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '../stores/gameStore.js';
import { connectSocket, getSocket } from '../lib/socket.js';
import { useShakeAnimation } from '../composables/useShakeAnimation.js';
import { useSocketCleanup } from '../composables/useSocketCleanup.js';
import { TIMING, AVATARS } from '../constants/index.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();

const nickname = ref(game.playerName || '');
const selectedEmoji = ref(game.playerEmoji || '');
const showAnswerText = ref(game.playerSettings?.showAnswerText ?? true);
const error = ref('');
const loading = ref(false);
const { shake, triggerShake } = useShakeAnimation();
const { cleanup: cleanupSocket } = useSocketCleanup(['player:joined', 'player:profile-updated', 'player:error']);

const emojiOptions = AVATARS.PROFILE_EMOJIS;
const isEditingExistingPlayer = computed(() => !!game.playerId && !!game.sessionId);

onMounted(() => {
  // If no PIN is stored, redirect back to home
  if (!game.pin) {
    router.push('/');
  }
});

onUnmounted(() => {
  cleanupSocket();
});

function handleJoin() {
  error.value = '';

  if (nickname.value.trim().length < 2) {
    error.value = t('game.nameMinLength');
    triggerShake();
    return;
  }

  if (!selectedEmoji.value) {
    error.value = t('game.selectEmojiError');
    triggerShake();
    return;
  }

  loading.value = true;
  const socket = connectSocket();
  cleanupSocket();

  const timeout = setTimeout(() => {
    loading.value = false;
    error.value = t('game.serverError');
    triggerShake();
    cleanupSocket();
  }, TIMING.SOCKET_CONNECTION_TIMEOUT);

  function applyLocalSettingsAndGoToLobby() {
    game.playerName = nickname.value.trim();
    game.playerEmoji = selectedEmoji.value;
    game.setPlayerSetting('showAnswerText', showAnswerText.value);
    // Ensure lobby-only actions are available until we receive game:started
    game.status = 'lobby';
    router.push('/play/lobby');
  }

  socket.on('player:joined', (data) => {
    clearTimeout(timeout);
    loading.value = false;
    game.setSession(data);
    applyLocalSettingsAndGoToLobby();
  });

  socket.on('player:profile-updated', () => {
    clearTimeout(timeout);
    loading.value = false;
    applyLocalSettingsAndGoToLobby();
  });

  socket.on('player:error', (data) => {
    clearTimeout(timeout);
    loading.value = false;
    error.value = data?.message || t('errors.somethingWentWrong');
    triggerShake();
    cleanupSocket();
  });

  const emit = () => {
    if (isEditingExistingPlayer.value) {
      socket.emit('player:update-profile', {
        name: nickname.value.trim(),
        avatar: selectedEmoji.value
      });
      return;
    }

    socket.emit('player:join', {
      pin: game.pin,
      name: nickname.value.trim(),
      avatar: selectedEmoji.value
    });
  };

  if (socket.connected) {
    emit();
  } else {
    socket.once('connect', emit);
  }
}

function goBack() {
  if (isEditingExistingPlayer.value) {
    router.push('/play/lobby');
    return;
  }

  game.reset();
  router.push('/');
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-4 bg-gradient-to-br from-primary/10 to-accent/10">
    <div class="w-full max-w-lg" :class="{ 'animate-shake': shake }">
      <div class="flex justify-end mb-3">
        <LanguageSwitcher />
      </div>
      <PixelCard class="space-y-6">
        <div class="text-center">
          <!-- PIN display -->
          <p class="text-sm text-muted-foreground mb-4">
            {{ t('game.joiningWithPin') }} <span class="font-mono font-bold text-foreground">{{ game.pin }}</span>
          </p>
          <div class="inline-flex items-center justify-center w-20 h-20 bg-primary/20 border-2 border-primary mb-4">
            <span v-if="selectedEmoji" class="text-5xl">{{ selectedEmoji }}</span>
            <svg v-else class="text-primary" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold mb-2">{{ t('game.createProfile') }}</h2>
          <p class="text-muted-foreground">{{ t('game.chooseAppearance') }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-foreground">{{ t('game.yourNickname') }}</label>
          <input
            v-model="nickname"
            type="text"
            maxlength="20"
            :placeholder="t('game.enterYourName')"
            class="w-full px-6 py-4 text-center text-2xl font-medium border-[3px] border-black focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all bg-white"
            autofocus
          />
          <p class="text-xs text-muted-foreground text-center">
            {{ t('game.charactersCount', { count: nickname.length }) }}
          </p>
        </div>

        <div class="space-y-3">
          <label class="block text-sm font-medium text-foreground">{{ t('game.chooseEmoji') }}</label>
          <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-64 overflow-y-auto p-2 bg-muted border-2 border-border">
            <button
              v-for="emoji in emojiOptions"
              :key="emoji"
              class="text-2xl sm:text-3xl p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all hover:scale-110"
              :class="selectedEmoji === emoji
                ? 'bg-primary border-2 border-black pixel-shadow scale-110'
                : 'hover:bg-white border-2 border-transparent'"
              @click="selectedEmoji = emoji"
            >
              {{ emoji }}
            </button>
          </div>
          <p v-if="!selectedEmoji" class="text-xs text-muted-foreground text-center">
            {{ t('game.selectEmoji') }}
          </p>
        </div>

        <!-- Display Settings -->
        <div class="space-y-2 pt-4 border-t-2 border-border">
          <label class="text-sm font-medium text-foreground">{{ t('game.displaySettings') }}</label>
          <label class="flex items-center gap-3 cursor-pointer select-none p-3 bg-muted border-2 border-border">
            <input
              v-model="showAnswerText"
              type="checkbox"
              class="w-5 h-5 accent-primary"
            />
            <div>
              <span class="text-sm font-medium">{{ t('game.showAnswerText') }}</span>
              <p class="text-xs text-muted-foreground">{{ t('game.showAnswerTextHint') }}</p>
            </div>
          </label>
        </div>

        <!-- Preview -->
        <PixelCard v-if="selectedEmoji && nickname.trim()" variant="primary" class="text-center">
          <div class="text-sm text-muted-foreground mb-2">{{ t('game.preview') }}</div>
          <div class="flex items-center justify-center gap-3">
            <span class="text-5xl">{{ selectedEmoji }}</span>
            <span class="text-2xl font-bold">{{ nickname }}</span>
          </div>
        </PixelCard>

        <!-- Error message -->
        <p v-if="error" class="text-sm text-center font-medium text-destructive">
          {{ error }}
        </p>

        <PixelButton
          variant="primary"
          class="w-full text-lg py-5"
          :disabled="nickname.trim().length < 2 || !selectedEmoji || loading"
          @click="handleJoin"
        >
          <svg v-if="!loading" class="inline mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          {{ loading ? t('game.joining') : (isEditingExistingPlayer ? t('game.saveProfile') : t('landing.joinGame')) }}
        </PixelButton>

        <button
          class="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
          :disabled="loading"
          @click="goBack"
        >
          &larr; {{ isEditingExistingPlayer ? t('game.backToLobby') : t('game.changePin') }}
        </button>
      </PixelCard>
    </div>
  </div>
</template>
