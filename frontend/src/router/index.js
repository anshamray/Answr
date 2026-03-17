import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import {
  getPersistedPlayerRoute,
  hasPersistedPlayerSession,
  readPersistedPlayerSession,
  clearPersistedPlayerSession
} from '../lib/playerSession.js';

import LandingPage from '../pages/LandingPage.vue';
import LoginPage from '../pages/LoginPage.vue';
import RegisterPage from '../pages/RegisterPage.vue';
import OAuthCallbackPage from '../pages/OAuthCallbackPage.vue';
import VerifyEmailPage from '../pages/VerifyEmailPage.vue';
import ForgotPasswordPage from '../pages/ForgotPasswordPage.vue';
import ResetPasswordPage from '../pages/ResetPasswordPage.vue';
import TermsPage from '../pages/TermsPage.vue';
import PrivacyPage from '../pages/PrivacyPage.vue';
import DashboardPage from '../pages/DashboardPage.vue';
import AccountPage from '../pages/AccountPage.vue';
import QuizEditPage from '../pages/QuizEditPage.vue';
import QuizPreviewPage from '../pages/QuizPreviewPage.vue';
import PracticePreviewPage from '../pages/PracticePreviewPage.vue';
import LibraryPage from '../pages/LibraryPage.vue';
import LibraryDetailPage from '../pages/LibraryDetailPage.vue';
import SessionLobbyPage from '../pages/SessionLobbyPage.vue';
import GameControlPage from '../pages/GameControlPage.vue';
import SessionResultsPage from '../pages/SessionResultsPage.vue';
import AnalyticsPage from '../pages/AnalyticsPage.vue';
import SessionAnalyticsPage from '../pages/SessionAnalyticsPage.vue';
import PlayerJoinPage from '../pages/PlayerJoinPage.vue';
import PlayerProfilePage from '../pages/PlayerProfilePage.vue';
import PlayerLobbyPage from '../pages/PlayerLobbyPage.vue';
import PlayerGamePage from '../pages/PlayerGamePage.vue';
import PlayerResultsPage from '../pages/PlayerResultsPage.vue';
import AdminPage from '../pages/AdminPage.vue';

const routes = [
  // Public
  { path: '/', component: LandingPage },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/oauth/callback', component: OAuthCallbackPage },
  { path: '/verify-email', component: VerifyEmailPage },
  { path: '/forgot-password', component: ForgotPasswordPage },
  { path: '/reset-password', component: ResetPasswordPage },
  { path: '/terms', component: TermsPage },
  { path: '/privacy', component: PrivacyPage },

  // Library (public, no auth required)
  { path: '/library', component: LibraryPage },
  { path: '/library/:id', component: LibraryDetailPage },

  // Moderator (auth required — or guest token for sessions started from library)
  { path: '/dashboard', component: DashboardPage, meta: { requiresAuth: true } },
  { path: '/admin', component: AdminPage, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/account', component: AccountPage, meta: { requiresAuth: true } },
  { path: '/analytics', component: AnalyticsPage, meta: { requiresAuth: true } },
  { path: '/analytics/:sessionId', component: SessionAnalyticsPage, meta: { requiresAuth: true } },
  { path: '/quiz/:id/edit', component: QuizEditPage, meta: { requiresAuth: true } },
  { path: '/quiz/:id/preview', component: QuizPreviewPage, meta: { requiresAuth: true } },
  { path: '/quiz/:id/practice-preview', component: PracticePreviewPage, meta: { requiresAuth: true } },
  { path: '/session/:id/lobby', component: SessionLobbyPage, meta: { requiresGuestOrAuth: true } },
  { path: '/session/:id/control', component: GameControlPage, meta: { requiresGuestOrAuth: true } },
  { path: '/session/:id/results', component: SessionResultsPage, meta: { requiresGuestOrAuth: true } },

  // Player (no auth)
  { path: '/play', component: PlayerJoinPage },
  { path: '/play/profile', component: PlayerProfilePage },
  { path: '/play/lobby', component: PlayerLobbyPage },
  { path: '/play/game', component: PlayerGamePage },
  { path: '/play/results', component: PlayerResultsPage },

  // Legacy /auth link support (redirect to login)
  { path: '/auth', redirect: '/login' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    return { top: 0, left: 0 };
  }
});

// Navigation guard: redirect to /login if auth is required but missing.
// Routes with `requiresGuestOrAuth` also accept a guest session token
// (stored in sessionStorage by LibraryDetailPage when starting as guest).
router.beforeEach((to) => {
  // Player join flow:
  // - If user explicitly navigates with a PIN (e.g. QR code `/play?pin=123456`),
  //   do NOT auto-redirect to a previously persisted player route (like results).
  // - If the PIN differs from the persisted session PIN, drop the old session.
  if (to.path === '/play') {
    const incomingPin = typeof to.query?.pin === 'string' ? to.query.pin.trim() : '';
    if (incomingPin) {
      const persisted = readPersistedPlayerSession();
      const persistedPin = typeof persisted?.pin === 'string' ? persisted.pin.trim() : '';
      if (persistedPin && persistedPin !== incomingPin) {
        clearPersistedPlayerSession();
      }
    } else if (hasPersistedPlayerSession()) {
      const persistedRoute = getPersistedPlayerRoute();
      if (persistedRoute && persistedRoute !== to.path) {
        return { path: persistedRoute };
      }
    }
  }

  if (to.meta.requiresAuth) {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }

  if (to.meta.requiresAdmin) {
    const auth = useAuthStore();
    if (!auth.isAuthenticated || auth.user?.role !== 'admin') {
      return { path: '/dashboard' };
    }
  }

  if (to.meta.requiresGuestOrAuth) {
    const auth = useAuthStore();
    const hasGuestToken = !!sessionStorage.getItem('guestToken');
    if (!auth.isAuthenticated && !hasGuestToken) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }
});

export default router;
