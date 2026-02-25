<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '../stores/gameStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { useShakeAnimation } from '../composables/useShakeAnimation.js';
import { usePinValidation } from '../composables/usePinValidation.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import PixelStar from '../components/icons/PixelStar.vue';
import PixelLightning from '../components/icons/PixelLightning.vue';
import PixelUsers from '../components/icons/PixelUsers.vue';
import PixelCheck from '../components/icons/PixelCheck.vue';
import PixelClock from '../components/icons/PixelClock.vue';
import PixelPlay from '../components/icons/PixelPlay.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import UserDropdown from '../components/UserDropdown.vue';

const { t } = useI18n();
const router = useRouter();
const game = useGameStore();
const auth = useAuthStore();

const pin = ref('');
const selectedAnswer = ref(null);
const heroAnswers = ['Paris', 'London', 'Rome', 'Berlin'];
const { shake, triggerShake } = useShakeAnimation();
const { loading, error, checkPin, cleanupListeners } = usePinValidation();

onMounted(() => {
  // Fetch user info if authenticated
  if (auth.isAuthenticated && !auth.user) {
    auth.fetchMe();
  }
});

onUnmounted(() => {
  cleanupListeners();
  if (answerTimeout) clearTimeout(answerTimeout);
});

let answerTimeout = null;

function selectAnswer(city) {
  if (!selectedAnswer.value) {
    selectedAnswer.value = city;
    answerTimeout = setTimeout(() => {
      selectedAnswer.value = null;
    }, 2000);
  }
}

function handlePinSubmit() {
  checkPin(pin.value, {
    onValid: (validPin) => {
      game.pin = validPin;
      router.push('/play/profile');
    },
    onInvalid: () => {
      triggerShake();
    },
    onError: () => {
      triggerShake();
    }
  });
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- ── Navigation ────────────────────────────────────────────────── -->
    <nav class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-3">
            <span class="text-2xl font-bold text-primary pixel-font">Answr</span>
          </div>

          <div class="hidden md:flex items-center gap-6">
            <a href="#features" class="font-medium text-foreground hover:text-primary transition-colors">{{ t('nav.features') }}</a>
            <a href="#how-it-works" class="font-medium text-foreground hover:text-primary transition-colors">{{ t('nav.howItWorks') }}</a>
            <router-link to="/library" class="font-medium text-foreground hover:text-primary transition-colors">{{ t('nav.library') }}</router-link>
          </div>

          <div class="flex items-center gap-4">
            <template v-if="auth.isAuthenticated">
              <router-link to="/dashboard" class="text-sm text-muted-foreground hover:text-primary transition">{{ t('nav.dashboard') }}</router-link>
              <UserDropdown />
            </template>
            <template v-else>
              <LanguageSwitcher />
              <router-link to="/login" class="hidden sm:inline-flex">
                <PixelButton variant="outline" size="sm">{{ t('nav.login') }}</PixelButton>
              </router-link>
              <router-link to="/login">
                <PixelButton variant="primary" size="sm">{{ t('nav.hostQuiz') }}</PixelButton>
              </router-link>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <!-- ── Hero Section ──────────────────────────────────────────────── -->
    <section class="relative overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 border-b-[3px] border-black">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-28">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Left — Text + Join Form -->
          <div class="space-y-8">
            <div class="inline-flex items-center gap-2">
              <PixelBadge variant="accent">{{ t('landing.heroTagline') }}</PixelBadge>
              <PixelBadge variant="secondary">{{ t('landing.heroVersion') }}</PixelBadge>
            </div>

            <h1 class="text-5xl lg:text-7xl font-bold leading-tight">
              {{ t('landing.heroTitle1') }}
              <br />
              <span class="text-primary">{{ t('landing.heroTitle2') }}</span> {{ t('landing.heroTitle3') }}
              <br />
              <span class="text-secondary">{{ t('landing.heroTitle4') }}</span>
            </h1>

            <p class="text-xl text-muted-foreground max-w-lg">
              {{ t('landing.heroSubtitle') }}
            </p>

            <!-- Join Form (inline in hero) -->
            <div
              class="w-full max-w-sm space-y-3"
              :class="{ 'animate-shake': shake }"
            >
              <input
                v-model="pin"
                type="text"
                inputmode="numeric"
                maxlength="6"
                :placeholder="t('landing.pinPlaceholder')"
                class="w-full text-center text-2xl tracking-widest border-[3px] border-black px-4 py-3 focus:outline-none focus:ring-4 focus:ring-primary/30"
                :class="{ 'border-destructive': error }"
                @keyup.enter="handlePinSubmit"
              />
              <p v-if="error" class="text-sm text-center font-medium text-destructive">
                {{ error }}
              </p>
              <PixelButton
                variant="secondary"
                class="w-full"
                :disabled="loading"
                @click="handlePinSubmit"
              >
                {{ loading ? t('landing.checking') : t('landing.joinGame') }}
              </PixelButton>
            </div>

            <!-- Or actions -->
            <template>
              <div class="flex items-center gap-4 max-w-sm">
                <hr class="flex-1 border-border" />
                <span class="text-muted-foreground text-sm">{{ t('common.or') }}</span>
                <hr class="flex-1 border-border" />
              </div>
              <div class="flex flex-col sm:flex-row gap-3 max-w-sm">
                <router-link to="/library" class="flex-1">
                  <PixelButton variant="primary" class="w-full">{{ t('landing.browseLibrary') }}</PixelButton>
                </router-link>
                <router-link to="/login" class="flex-1">
                  <PixelButton variant="outline" class="w-full">{{ t('landing.hostAQuiz') }}</PixelButton>
                </router-link>
              </div>
            </template>
          </div>

          <!-- Right — Hero Card Illustration -->
          <div class="relative hidden lg:block">
            <PixelCard variant="primary" class="transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="pixel-font text-sm text-primary">{{ t('landing.questionCounter', { current: 5, total: 10 }) }}</span>
                </div>
                <h3 class="text-2xl font-bold">{{ t('landing.questionExample') }}</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div
                    v-for="city in heroAnswers"
                    :key="city"
                    class="p-4 border-2 font-medium cursor-pointer transition-colors"
                    :class="selectedAnswer === city
                      ? (city === 'Paris' ? 'bg-green-200 border-green-600' : 'bg-red-200 border-red-500')
                      : 'bg-white border-border hover:bg-primary/20 hover:border-primary'"
                    @click="selectAnswer(city)"
                  >
                    {{ city }}
                  </div>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <PixelUsers class="shrink-0 translate-y-px" :size="18" />
                    <span class="font-medium">{{ t('common.players', 48) }}</span>
                  </div>
                  <div class="flex items-center gap-1 text-muted-foreground">
                    <PixelClock class="text-accent" :size="16" />
                    <span>{{ t('landing.remaining', { seconds: 15 }) }}</span>
                  </div>
                </div>
              </div>
            </PixelCard>

            <!-- Floating elements -->
            <div class="absolute -top-6 -right-6 animate-bounce">
              <PixelStar class="text-warning" :size="48" />
            </div>
            <div class="absolute -bottom-4 -left-4 animate-pulse">
              <PixelLightning class="text-accent" :size="36" />
            </div>
          </div>
        </div>
      </div>

      <!-- Gradient decoration -->
      <div class="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-r from-primary via-secondary to-accent opacity-50"></div>
    </section>

    <!-- ── Features Section ──────────────────────────────────────────── -->
    <section id="features" class="py-20 lg:py-32 border-b-[3px] border-black">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <PixelBadge variant="primary" class="mb-4">{{ t('nav.features') }}</PixelBadge>
          <h2 class="text-4xl lg:text-5xl font-bold mb-4">
            {{ t('landing.featuresTitle', { highlight: '' }) }} <span class="text-primary">{{ t('landing.featuresHighlight') }}</span>
          </h2>
          <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
            {{ t('landing.featuresSubtitle') }}
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-primary/20 flex items-center justify-center">
              <PixelPlay class="text-primary" :size="32" />
            </div>
            <h3 class="text-xl font-bold">{{ t('landing.featureRealTime') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.featureRealTimeDesc') }}
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-secondary/20 flex items-center justify-center">
              <PixelUsers class="text-secondary" :size="32" />
            </div>
            <h3 class="text-xl font-bold">{{ t('landing.featureUnlimitedPlayers') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.featureUnlimitedPlayersDesc') }}
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-accent/20 flex items-center justify-center">
              <PixelStar class="text-accent" :size="32" />
            </div>
            <h3 class="text-xl font-bold">{{ t('landing.featureQuestionTypes') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.featureQuestionTypesDesc') }}
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-success/20 flex items-center justify-center">
              <PixelCheck class="text-success" :size="32" />
            </div>
            <h3 class="text-xl font-bold">{{ t('landing.featureLiveLeaderboard') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.featureLiveLeaderboardDesc') }}
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-warning/20 flex items-center justify-center">
              <PixelClock class="text-warning" :size="32" />
            </div>
            <h3 class="text-xl font-bold">{{ t('landing.featureServerTimer') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.featureServerTimerDesc') }}
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-primary/20 flex items-center justify-center">
              <PixelCheck class="text-primary" :size="32" />
            </div>
            <h3 class="text-xl font-bold">{{ t('landing.featurePrivacy') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.featurePrivacyDesc') }}
            </p>
          </PixelCard>
        </div>
      </div>
    </section>

    <!-- ── How It Works ──────────────────────────────────────────────── -->
    <section id="how-it-works" class="py-20 lg:py-32 bg-gradient-to-br from-secondary/5 to-primary/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <PixelBadge variant="secondary" class="mb-4">{{ t('nav.howItWorks') }}</PixelBadge>
          <h2 class="text-4xl lg:text-5xl font-bold mb-4">
            {{ t('landing.howItWorksTitle', { highlight: '' }) }} <span class="text-secondary">{{ t('landing.howItWorksHighlight') }}</span>
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="space-y-4 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-primary text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
              1
            </div>
            <h3 class="text-2xl font-bold">{{ t('landing.step1Title') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.step1Desc') }}
            </p>
          </div>

          <div class="space-y-4 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-secondary text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
              2
            </div>
            <h3 class="text-2xl font-bold">{{ t('landing.step2Title') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.step2Desc') }}
            </p>
          </div>

          <div class="space-y-4 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-accent text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
              3
            </div>
            <h3 class="text-2xl font-bold">{{ t('landing.step3Title') }}</h3>
            <p class="text-muted-foreground">
              {{ t('landing.step3Desc') }}
            </p>
          </div>
        </div>

        <div class="text-center mt-12">
          <router-link to="/login">
            <PixelButton variant="primary" size="lg">{{ t('landing.startCreating') }}</PixelButton>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ── CTA Section ───────────────────────────────────────────────── -->
    <section class="py-20 lg:py-32 border-t-[3px] border-black">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <PixelCard variant="primary" class="space-y-6">
          <PixelStar class="text-primary mx-auto" :size="64" />
          <h2 class="text-4xl lg:text-5xl font-bold">
            {{ t('landing.ctaTitle') }}
          </h2>
          <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
            {{ t('landing.ctaSubtitle') }}
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <router-link to="/register">
              <PixelButton variant="primary" size="lg">{{ t('landing.getStartedFree') }}</PixelButton>
            </router-link>
            <a href="https://github.com" target="_blank" rel="noopener">
              <PixelButton variant="outline" size="lg">{{ t('landing.viewOnGitHub') }}</PixelButton>
            </a>
          </div>
        </PixelCard>
      </div>
    </section>

    <!-- ── Footer ────────────────────────────────────────────────────── -->
    <footer class="border-t-[3px] border-black bg-white py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid md:grid-cols-4 gap-8 mb-8">
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl font-bold pixel-font text-primary">Answr</span>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ t('landing.footerTagline') }}
            </p>
          </div>

          <div>
            <h4 class="font-bold mb-3">{{ t('landing.footerProduct') }}</h4>
            <div class="space-y-2 text-sm text-muted-foreground">
              <a href="#features" class="block hover:text-primary cursor-pointer">{{ t('nav.features') }}</a>
              <router-link to="/library" class="block hover:text-primary">{{ t('nav.library') }}</router-link>
              <a href="#how-it-works" class="block hover:text-primary cursor-pointer">{{ t('nav.howItWorks') }}</a>
            </div>
          </div>

          <div>
            <h4 class="font-bold mb-3">{{ t('landing.footerResources') }}</h4>
            <div class="space-y-2 text-sm text-muted-foreground">
              <div class="hover:text-primary cursor-pointer">{{ t('landing.footerDocumentation') }}</div>
              <div class="hover:text-primary cursor-pointer">{{ t('landing.footerApiReference') }}</div>
              <div class="hover:text-primary cursor-pointer">GitHub</div>
            </div>
          </div>

          <div>
            <h4 class="font-bold mb-3">{{ t('landing.footerGetStarted') }}</h4>
            <div class="space-y-2 text-sm text-muted-foreground">
              <router-link to="/register" class="block hover:text-primary">{{ t('landing.footerCreateAccount') }}</router-link>
              <router-link to="/login" class="block hover:text-primary">{{ t('nav.login') }}</router-link>
              <router-link to="/library" class="block hover:text-primary">{{ t('landing.footerBrowseQuizzes') }}</router-link>
            </div>
          </div>
        </div>

        <div class="border-t-2 border-border pt-8 text-center text-sm text-muted-foreground">
          <p>{{ t('landing.footerCopyright') }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>
