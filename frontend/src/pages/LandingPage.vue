<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
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

const router = useRouter();
const game = useGameStore();
const auth = useAuthStore();

const pin = ref('');
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
});

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
            <a href="#features" class="font-medium text-foreground hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" class="font-medium text-foreground hover:text-primary transition-colors">How It Works</a>
            <router-link to="/library" class="font-medium text-foreground hover:text-primary transition-colors">Library</router-link>
          </div>

          <div class="flex items-center gap-3">
            <template v-if="auth.isAuthenticated">
              <router-link to="/dashboard">
                <PixelButton variant="primary" size="sm">Dashboard</PixelButton>
              </router-link>
            </template>
            <template v-else>
              <router-link to="/login" class="hidden sm:inline-flex">
                <PixelButton variant="outline" size="sm">Login</PixelButton>
              </router-link>
              <router-link to="/login">
                <PixelButton variant="primary" size="sm">Host Quiz</PixelButton>
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
              <PixelBadge variant="accent">Open Source</PixelBadge>
              <PixelBadge variant="secondary">v1.0</PixelBadge>
            </div>

            <h1 class="text-5xl lg:text-7xl font-bold leading-tight">
              Live Quizzes,
              <br />
              <span class="text-primary">Level Up</span> the
              <br />
              <span class="text-secondary">Energy</span>
            </h1>

            <p class="text-xl text-muted-foreground max-w-lg">
              Real-time multiplayer quiz platform for classrooms, teams, and communities.
              Create, host, and play engaging quizzes that feel like a game.
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
                placeholder="Enter 6-digit PIN"
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
                {{ loading ? 'Checking...' : 'Join Game' }}
              </PixelButton>
            </div>

            <!-- Or actions -->
            <template>
              <div class="flex items-center gap-4 max-w-sm">
                <hr class="flex-1 border-border" />
                <span class="text-muted-foreground text-sm">or</span>
                <hr class="flex-1 border-border" />
              </div>
              <div class="flex flex-col sm:flex-row gap-3 max-w-sm">
                <router-link to="/library" class="flex-1">
                  <PixelButton variant="primary" class="w-full">Browse Library</PixelButton>
                </router-link>
                <router-link to="/login" class="flex-1">
                  <PixelButton variant="outline" class="w-full">Host a Quiz</PixelButton>
                </router-link>
              </div>
            </template>
          </div>

          <!-- Right — Hero Card Illustration -->
          <div class="relative hidden lg:block">
            <PixelCard variant="primary" class="transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="pixel-font text-sm text-primary">QUESTION 5/10</span>
                  <PixelClock class="text-accent" :size="24" />
                </div>
                <h3 class="text-2xl font-bold">What's the capital of France?</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-4 bg-primary/20 border-2 border-primary font-medium cursor-pointer hover:bg-primary/30 transition-colors">
                    Paris
                  </div>
                  <div class="p-4 bg-white border-2 border-border font-medium cursor-pointer hover:bg-muted transition-colors">
                    London
                  </div>
                  <div class="p-4 bg-white border-2 border-border font-medium cursor-pointer hover:bg-muted transition-colors">
                    Rome
                  </div>
                  <div class="p-4 bg-white border-2 border-border font-medium cursor-pointer hover:bg-muted transition-colors">
                    Berlin
                  </div>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <PixelUsers :size="20" />
                    <span class="font-medium">48 players</span>
                  </div>
                  <div class="text-muted-foreground">15s remaining</div>
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
          <PixelBadge variant="primary" class="mb-4">Features</PixelBadge>
          <h2 class="text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to <span class="text-primary">Engage</span>
          </h2>
          <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for educators, trainers, and teams who want to make learning interactive and fun
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-primary/20 flex items-center justify-center">
              <PixelPlay class="text-primary" :size="32" />
            </div>
            <h3 class="text-xl font-bold">Real-Time Play</h3>
            <p class="text-muted-foreground">
              Lightning-fast responses with WebSocket technology. Everyone plays together, in perfect sync.
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-secondary/20 flex items-center justify-center">
              <PixelUsers class="text-secondary" :size="32" />
            </div>
            <h3 class="text-xl font-bold">Unlimited Players</h3>
            <p class="text-muted-foreground">
              Scale from 5 to 5,000 players. Perfect for classrooms, conferences, or company-wide events.
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-accent/20 flex items-center justify-center">
              <PixelStar class="text-accent" :size="32" />
            </div>
            <h3 class="text-xl font-bold">14 Question Types</h3>
            <p class="text-muted-foreground">
              Multiple choice, true/false, slider, sort, and many more. Flexibility for every learning style.
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-success/20 flex items-center justify-center">
              <PixelCheck class="text-success" :size="32" />
            </div>
            <h3 class="text-xl font-bold">Live Leaderboard</h3>
            <p class="text-muted-foreground">
              Dynamic scoring based on speed and accuracy. Watch the competition heat up in real-time.
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-warning/20 flex items-center justify-center">
              <PixelClock class="text-warning" :size="32" />
            </div>
            <h3 class="text-xl font-bold">Server Timer</h3>
            <p class="text-muted-foreground">
              Authoritative server-side countdown. No cheating, perfectly synchronized across all devices.
            </p>
          </PixelCard>

          <PixelCard class="space-y-4 hover:transform hover:-translate-y-2 transition-all duration-300">
            <div class="w-12 h-12 bg-primary/20 flex items-center justify-center">
              <PixelCheck class="text-primary" :size="32" />
            </div>
            <h3 class="text-xl font-bold">Privacy First</h3>
            <p class="text-muted-foreground">
              Open-source and self-hostable. Your data, your rules. No tracking, no ads, fully transparent.
            </p>
          </PixelCard>
        </div>
      </div>
    </section>

    <!-- ── How It Works ──────────────────────────────────────────────── -->
    <section id="how-it-works" class="py-20 lg:py-32 bg-gradient-to-br from-secondary/5 to-primary/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <PixelBadge variant="secondary" class="mb-4">How It Works</PixelBadge>
          <h2 class="text-4xl lg:text-5xl font-bold mb-4">
            Three Steps to <span class="text-secondary">Epic Quizzes</span>
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
          <div class="space-y-4 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-primary text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
              1
            </div>
            <h3 class="text-2xl font-bold">Create Your Quiz</h3>
            <p class="text-muted-foreground">
              Build your quiz in minutes with our intuitive editor. Add questions, set timers, customize scoring.
            </p>
          </div>

          <div class="space-y-4 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-secondary text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
              2
            </div>
            <h3 class="text-2xl font-bold">Share the PIN</h3>
            <p class="text-muted-foreground">
              Get a unique 6-digit PIN. Players join from any device in seconds. No accounts required.
            </p>
          </div>

          <div class="space-y-4 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-accent text-white text-2xl font-bold border-[3px] border-black pixel-shadow">
              3
            </div>
            <h3 class="text-2xl font-bold">Play & Compete</h3>
            <p class="text-muted-foreground">
              Launch the game and watch the excitement unfold. Real-time answers, instant feedback, live leaderboard.
            </p>
          </div>
        </div>

        <div class="text-center mt-12">
          <router-link to="/login">
            <PixelButton variant="primary" size="lg">Start Creating</PixelButton>
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
            Ready to Transform Your Quizzes?
          </h2>
          <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join educators and teams using Answr to make learning engaging,
            collaborative, and fun.
          </p>
          <div class="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <router-link to="/register">
              <PixelButton variant="primary" size="lg">Get Started Free</PixelButton>
            </router-link>
            <a href="https://github.com" target="_blank" rel="noopener">
              <PixelButton variant="outline" size="lg">View on GitHub</PixelButton>
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
              <span class="text-xl font-bold pixel-font text-primary">Answr</span>
            </div>
            <p class="text-sm text-muted-foreground">
              Open-source quiz platform for modern teams and classrooms.
            </p>
          </div>

          <div>
            <h4 class="font-bold mb-3">Product</h4>
            <div class="space-y-2 text-sm text-muted-foreground">
              <a href="#features" class="block hover:text-primary cursor-pointer">Features</a>
              <router-link to="/library" class="block hover:text-primary">Library</router-link>
              <a href="#how-it-works" class="block hover:text-primary cursor-pointer">How It Works</a>
            </div>
          </div>

          <div>
            <h4 class="font-bold mb-3">Resources</h4>
            <div class="space-y-2 text-sm text-muted-foreground">
              <div class="hover:text-primary cursor-pointer">Documentation</div>
              <div class="hover:text-primary cursor-pointer">API Reference</div>
              <div class="hover:text-primary cursor-pointer">GitHub</div>
            </div>
          </div>

          <div>
            <h4 class="font-bold mb-3">Get Started</h4>
            <div class="space-y-2 text-sm text-muted-foreground">
              <router-link to="/register" class="block hover:text-primary">Create Account</router-link>
              <router-link to="/login" class="block hover:text-primary">Login</router-link>
              <router-link to="/library" class="block hover:text-primary">Browse Quizzes</router-link>
            </div>
          </div>
        </div>

        <div class="border-t-2 border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Answr. Open source under MIT License.</p>
        </div>
      </div>
    </footer>
  </div>
</template>
