import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';

import LandingPage from '../pages/LandingPage.vue';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';
import DashboardPage from '../pages/DashboardPage.vue';
import QuizEditPage from '../pages/QuizEditPage.vue';
import SessionLobbyPage from '../pages/SessionLobbyPage.vue';
import GameControlPage from '../pages/GameControlPage.vue';
import SessionResultsPage from '../pages/SessionResultsPage.vue';
import PlayerJoinPage from '../pages/PlayerJoinPage.vue';
import PlayerLobbyPage from '../pages/PlayerLobbyPage.vue';
import PlayerGamePage from '../pages/PlayerGamePage.vue';
import PlayerResultsPage from '../pages/PlayerResultsPage.vue';

const routes = [
  // Public
  { path: '/', component: LandingPage },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },

  // Moderator (auth required)
  { path: '/dashboard', component: DashboardPage, meta: { requiresAuth: true } },
  { path: '/quiz/:id/edit', component: QuizEditPage, meta: { requiresAuth: true } },
  { path: '/session/:id/lobby', component: SessionLobbyPage, meta: { requiresAuth: true } },
  { path: '/session/:id/control', component: GameControlPage, meta: { requiresAuth: true } },
  { path: '/session/:id/results', component: SessionResultsPage, meta: { requiresAuth: true } },

  // Player (no auth)
  { path: '/play', component: PlayerJoinPage },
  { path: '/play/lobby', component: PlayerLobbyPage },
  { path: '/play/game', component: PlayerGamePage },
  { path: '/play/results', component: PlayerResultsPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard: redirect to /login if auth is required but missing
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }
});

export default router;
