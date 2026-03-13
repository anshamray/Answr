<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import AppHeader from '../components/AppHeader.vue';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const sessions = ref([]);
const loading = ref(true);
const error = ref('');
const actionError = ref('');
const filter = ref('all'); // 'all' | 'finished' | 'lobby'
const page = ref(1);
const pagination = ref({ total: 0, pages: 0 });

async function fetchSessions() {
  loading.value = true;
  error.value = '';

  try {
    const params = new URLSearchParams();
    params.set('page', page.value);
    params.set('limit', '10');

    if (filter.value !== 'all') {
      params.set('status', filter.value);
    }

    const res = await fetch(apiUrl(`/api/sessions?${params.toString()}`), {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!res.ok) throw new Error('Failed to load sessions');

    const json = await res.json();
    sessions.value = json.data?.sessions || [];
    pagination.value = json.data?.pagination || { total: 0, pages: 0 };
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function viewAnalytics(sessionId) {
  router.push(`/analytics/${sessionId}`);
}

async function deleteSession(sessionId) {
  if (!confirm(t('analytics.deleteConfirm'))) return;
  actionError.value = '';
  try {
    const res = await fetch(apiUrl(`/api/sessions/${sessionId}/permanent`), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));

      if (res.status === 409 && json.code === 'SESSION_ACTIVE_CONFIRM_REQUIRED') {
        const allowForceDelete = confirm(t('analytics.deleteActiveConfirm'));
        if (!allowForceDelete) return;

        const forceRes = await fetch(apiUrl(`/api/sessions/${sessionId}/permanent?confirmActive=true`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${auth.token}` }
        });

        if (!forceRes.ok) {
          const forceJson = await forceRes.json().catch(() => ({}));
          throw new Error(forceJson.error || forceJson.message || t('errors.failedToDeleteSession'));
        }
      } else {
        throw new Error(json.error || json.message || t('errors.failedToDeleteSession'));
      }
    }

    sessions.value = sessions.value.filter(s => s.id !== sessionId);

    // If we deleted the last item on a page, step back a page (when possible).
    if (sessions.value.length === 0 && page.value > 1) {
      page.value -= 1;
      await fetchSessions();
    } else {
      // Refresh pagination counts
      await fetchSessions();
    }
  } catch (err) {
    actionError.value = err.message;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(startedAt, finishedAt) {
  if (!startedAt || !finishedAt) return '-';
  const ms = new Date(finishedAt) - new Date(startedAt);
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

const statusVariant = (status) => {
  switch (status) {
    case 'finished': return 'success';
    case 'playing': return 'primary';
    case 'lobby': return 'warning';
    default: return 'secondary';
  }
};

function handleFilterChange(newFilter) {
  filter.value = newFilter;
  page.value = 1;
  fetchSessions();
}

function prevPage() {
  if (page.value > 1) {
    page.value--;
    fetchSessions();
  }
}

function nextPage() {
  if (page.value < pagination.value.pages) {
    page.value++;
    fetchSessions();
  }
}

onMounted(fetchSessions);
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppHeader />

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Page Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold mb-2">{{ t('analytics.title') }}</h1>
          <p class="text-muted-foreground">{{ t('analytics.subtitle') }}</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-2 flex-wrap">
        <button
          class="px-4 py-2 border-2 font-medium transition-colors"
          :class="filter === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'"
          @click="handleFilterChange('all')"
        >
          {{ t('analytics.allSessions') }}
        </button>
        <button
          class="px-4 py-2 border-2 font-medium transition-colors"
          :class="filter === 'finished' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'"
          @click="handleFilterChange('finished')"
        >
          {{ t('analytics.completed') }}
        </button>
        <button
          class="px-4 py-2 border-2 font-medium transition-colors"
          :class="filter === 'lobby' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'"
          @click="handleFilterChange('lobby')"
        >
          {{ t('analytics.inLobby') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">
        {{ t('common.loading') }}
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20 text-destructive">{{ error }}</div>

      <!-- Action Error Toast -->
      <div
        v-if="actionError"
        class="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 border-2 border-black pixel-shadow z-50"
      >
        <div class="flex items-center gap-3">
          <span>{{ actionError }}</span>
          <button @click="actionError = ''" class="hover:opacity-80">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="sessions.length === 0">
        <PixelCard class="text-center py-16 space-y-6">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-primary/10 border-2 border-primary">
            <svg class="text-primary" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
          </div>
          <div>
            <h3 class="text-2xl font-bold mb-2">{{ t('analytics.noSessionsTitle') }}</h3>
            <p class="text-muted-foreground max-w-md mx-auto">
              {{ t('analytics.noSessionsSubtitle') }}
            </p>
          </div>
          <router-link to="/dashboard">
            <PixelButton variant="primary">{{ t('analytics.goToDashboard') }}</PixelButton>
          </router-link>
        </PixelCard>
      </div>

      <!-- Session List -->
      <div v-else class="space-y-4">
        <PixelCard
          v-for="session in sessions"
          :key="session.id"
          class="hover:border-primary transition-all cursor-pointer"
          @click="viewAnalytics(session.id)"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg font-bold truncate">{{ session.quizTitle }}</h3>
                <PixelBadge :variant="statusVariant(session.status)">
                  {{ session.status }}
                </PixelBadge>
              </div>
              <div class="flex items-center gap-4 text-sm text-muted-foreground">
                <span>PIN: {{ session.pin }}</span>
                <span>{{ session.participantCount }} {{ t('analytics.players') }}</span>
                <span>{{ formatDate(session.createdAt) }}</span>
                <span v-if="session.finishedAt">{{ t('analytics.duration') }}: {{ formatDuration(session.startedAt, session.finishedAt) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <PixelButton v-if="session.status === 'finished'" variant="outline" size="sm">
                {{ t('analytics.viewDetails') }}
              </PixelButton>
              <button
                class="min-h-[40px] min-w-[40px] flex items-center justify-center border-[3px] border-black bg-white hover:border-destructive hover:bg-destructive/10 transition-colors"
                type="button"
                :title="t('analytics.deleteSession')"
                @click.stop="deleteSession(session.id)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </PixelCard>

        <!-- Pagination -->
        <div v-if="pagination.pages > 1" class="flex items-center justify-center gap-4 pt-4">
          <PixelButton variant="outline" size="sm" :disabled="page === 1" @click="prevPage">
            {{ t('common.prev') }}
          </PixelButton>
          <span class="text-sm text-muted-foreground">
            {{ t('analytics.pageOf', { current: page, total: pagination.pages }) }}
          </span>
          <PixelButton variant="outline" size="sm" :disabled="page >= pagination.pages" @click="nextPage">
            {{ t('common.next') }}
          </PixelButton>
        </div>
      </div>
    </main>
  </div>
</template>
