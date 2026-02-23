<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import UserDropdown from '../components/UserDropdown.vue';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const sessions = ref([]);
const loading = ref(true);
const error = ref('');
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
    <!-- Header -->
    <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
            <span class="text-xl font-bold text-primary pixel-font">Answr</span>
          </router-link>
        </div>
        <div class="flex items-center gap-4">
          <router-link to="/library" class="text-sm text-muted-foreground hover:text-primary transition">{{ t('nav.library') }}</router-link>
          <router-link to="/dashboard" class="text-sm text-muted-foreground hover:text-primary transition">{{ t('nav.dashboard') }}</router-link>
          <router-link to="/analytics" class="text-sm text-primary font-medium">Analytics</router-link>
          <LanguageSwitcher />
          <UserDropdown />
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Page Header -->
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-bold mb-2">Session Analytics</h1>
          <p class="text-muted-foreground">Review performance data from your quiz sessions</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-2 flex-wrap">
        <button
          class="px-4 py-2 border-2 font-medium transition-colors"
          :class="filter === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'"
          @click="handleFilterChange('all')"
        >
          All Sessions
        </button>
        <button
          class="px-4 py-2 border-2 font-medium transition-colors"
          :class="filter === 'finished' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'"
          @click="handleFilterChange('finished')"
        >
          Completed
        </button>
        <button
          class="px-4 py-2 border-2 font-medium transition-colors"
          :class="filter === 'lobby' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'"
          @click="handleFilterChange('lobby')"
        >
          In Lobby
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">
        {{ t('common.loading') }}
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20 text-destructive">{{ error }}</div>

      <!-- Empty State -->
      <div v-else-if="sessions.length === 0">
        <PixelCard class="text-center py-16 space-y-6">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-primary/10 border-2 border-primary">
            <svg class="text-primary" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
          </div>
          <div>
            <h3 class="text-2xl font-bold mb-2">No sessions yet</h3>
            <p class="text-muted-foreground max-w-md mx-auto">
              Run a quiz session to see analytics data here
            </p>
          </div>
          <router-link to="/dashboard">
            <PixelButton variant="primary">Go to Dashboard</PixelButton>
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
                <span>{{ session.participantCount }} players</span>
                <span>{{ formatDate(session.createdAt) }}</span>
                <span v-if="session.finishedAt">Duration: {{ formatDuration(session.startedAt, session.finishedAt) }}</span>
              </div>
            </div>
            <PixelButton v-if="session.status === 'finished'" variant="outline" size="sm">
              View Details
            </PixelButton>
          </div>
        </PixelCard>

        <!-- Pagination -->
        <div v-if="pagination.pages > 1" class="flex items-center justify-center gap-4 pt-4">
          <PixelButton variant="outline" size="sm" :disabled="page === 1" @click="prevPage">
            {{ t('common.prev') }}
          </PixelButton>
          <span class="text-sm text-muted-foreground">
            Page {{ page }} of {{ pagination.pages }}
          </span>
          <PixelButton variant="outline" size="sm" :disabled="page >= pagination.pages" @click="nextPage">
            {{ t('common.next') }}
          </PixelButton>
        </div>
      </div>
    </main>
  </div>
</template>
