<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import AppHeader from '../components/AppHeader.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const sessionData = ref(null);
const summary = ref(null);
const participants = ref([]);
const questions = ref([]);
const loading = ref(true);
const error = ref('');
const activeTab = ref('overview'); // 'overview' | 'participants' | 'questions'

async function fetchAnalytics() {
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch(apiUrl(`/api/sessions/${route.params.sessionId}/analytics`), {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!res.ok) throw new Error('Failed to load analytics');

    const json = await res.json();
    sessionData.value = json.data?.session || null;
    summary.value = json.data?.summary || null;
    participants.value = json.data?.participants || [];
    questions.value = json.data?.questions || [];
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function downloadCSV() {
  try {
    const res = await fetch(apiUrl(`/api/sessions/${route.params.sessionId}/export`), {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${sessionData.value?.pin || 'data'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
  }
}

function formatDuration(ms) {
  if (!ms) return '-';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getAccuracyColor(accuracy) {
  if (accuracy >= 80) return 'text-success';
  if (accuracy >= 50) return 'text-warning';
  return 'text-destructive';
}

onMounted(fetchAnalytics);
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppHeader />

    <!-- Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-20 text-muted-foreground text-lg">
        {{ t('common.loading') }}
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20 text-destructive">{{ error }}</div>

      <!-- Content -->
      <template v-else-if="sessionData">
        <!-- Page Header -->
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold mb-2">{{ sessionData.quizTitle }}</h1>
            <div class="flex items-center gap-3 text-muted-foreground">
              <span>PIN: <span class="font-mono font-bold">{{ sessionData.pin }}</span></span>
              <span>|</span>
              <span>{{ formatDate(sessionData.startedAt) }}</span>
              <span>|</span>
              <span>{{ t('analytics.duration') }}: {{ formatDuration(sessionData.duration) }}</span>
            </div>
          </div>
          <PixelButton variant="secondary" @click="downloadCSV">
            <svg class="inline mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {{ t('analytics.exportCsv') }}
          </PixelButton>
        </div>

        <!-- Summary Stats -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <PixelCard variant="primary" class="text-center">
            <div class="text-4xl font-bold text-primary">{{ summary?.totalParticipants || 0 }}</div>
            <div class="text-sm text-muted-foreground">{{ t('analytics.totalParticipants') }}</div>
          </PixelCard>
          <PixelCard variant="secondary" class="text-center">
            <div class="text-4xl font-bold text-secondary">{{ summary?.avgScore || 0 }}</div>
            <div class="text-sm text-muted-foreground">{{ t('analytics.averageScore') }}</div>
          </PixelCard>
          <PixelCard variant="accent" class="text-center">
            <div class="text-4xl font-bold" :class="getAccuracyColor(summary?.avgAccuracy || 0)">
              {{ summary?.avgAccuracy || 0 }}%
            </div>
            <div class="text-sm text-muted-foreground">{{ t('analytics.averageAccuracy') }}</div>
          </PixelCard>
          <PixelCard class="text-center">
            <div class="text-4xl font-bold text-foreground">{{ summary?.totalQuestions || 0 }}</div>
            <div class="text-sm text-muted-foreground">{{ t('analytics.questions') }}</div>
          </PixelCard>
        </div>

        <!-- Tabs -->
        <div class="flex gap-2 border-b-2 border-border">
          <button
            class="px-4 py-2 font-medium transition-colors border-b-2 -mb-[2px]"
            :class="activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'"
            @click="activeTab = 'overview'"
          >
            {{ t('analytics.overview') }}
          </button>
          <button
            class="px-4 py-2 font-medium transition-colors border-b-2 -mb-[2px]"
            :class="activeTab === 'participants' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'"
            @click="activeTab = 'participants'"
          >
            {{ t('analytics.participants') }} ({{ participants.length }})
          </button>
          <button
            class="px-4 py-2 font-medium transition-colors border-b-2 -mb-[2px]"
            :class="activeTab === 'questions' ? 'border-primary text-primary' : 'border-transparent hover:text-primary'"
            @click="activeTab = 'questions'"
          >
            {{ t('analytics.questions') }} ({{ questions.length }})
          </button>
        </div>

        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="grid lg:grid-cols-2 gap-6">
          <!-- Top Players -->
          <PixelCard>
            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
              <svg class="text-warning" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              {{ t('gameControl.top5') }}
            </h3>
            <div class="space-y-2">
              <div
                v-for="(player, index) in participants.slice(0, 5)"
                :key="player.id"
                class="flex items-center gap-3 p-2 border-2 border-border"
              >
                <div class="w-8 h-8 flex items-center justify-center font-bold"
                     :class="index < 3 ? 'bg-warning text-warning-foreground' : 'bg-muted'">
                  {{ index + 1 }}
                </div>
                <div class="flex-1">
                  <div class="font-medium">{{ player.name }}</div>
                  <div class="text-xs text-muted-foreground">{{ player.accuracy }}% {{ t('analytics.accuracy') }}</div>
                </div>
                <div class="text-lg font-bold">{{ player.score }}</div>
              </div>
            </div>
          </PixelCard>

          <!-- Question Performance -->
          <PixelCard>
            <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
              <svg class="text-secondary" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
              </svg>
              {{ t('analytics.questionAccuracy') }}
            </h3>
            <div class="space-y-3">
              <div
                v-for="(q, index) in questions.slice(0, 5)"
                :key="q.questionId"
                class="space-y-1"
              >
                <div class="flex items-center justify-between text-sm">
                  <span class="truncate flex-1 mr-2">Q{{ index + 1 }}: {{ q.text }}</span>
                  <span :class="getAccuracyColor(q.accuracy)" class="font-bold">{{ q.accuracy }}%</span>
                </div>
                <div class="w-full bg-border h-2">
                  <div
                    class="h-full transition-all"
                    :class="q.accuracy >= 80 ? 'bg-success' : q.accuracy >= 50 ? 'bg-warning' : 'bg-destructive'"
                    :style="{ width: `${q.accuracy}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </PixelCard>
        </div>

        <!-- Participants Tab -->
        <div v-if="activeTab === 'participants'">
          <PixelCard>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b-2 border-border">
                    <th class="text-left p-3 font-bold">{{ t('analytics.rank') }}</th>
                    <th class="text-left p-3 font-bold">{{ t('analytics.player') }}</th>
                    <th class="text-right p-3 font-bold">{{ t('analytics.score') }}</th>
                    <th class="text-right p-3 font-bold">{{ t('analytics.correct') }}</th>
                    <th class="text-right p-3 font-bold">{{ t('analytics.accuracy') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(player, index) in participants"
                    :key="player.id"
                    class="border-b border-border hover:bg-muted/30"
                  >
                    <td class="p-3">
                      <span class="w-8 h-8 inline-flex items-center justify-center font-bold"
                            :class="index < 3 ? 'bg-warning text-warning-foreground' : 'bg-muted'">
                        {{ index + 1 }}
                      </span>
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-2">
                        <span class="text-xl">{{ player.avatar || '' }}</span>
                        <span class="font-medium">{{ player.name }}</span>
                      </div>
                    </td>
                    <td class="p-3 text-right font-bold">{{ player.score }}</td>
                    <td class="p-3 text-right">{{ player.correctCount }} / {{ player.totalAnswered }}</td>
                    <td class="p-3 text-right">
                      <span :class="getAccuracyColor(player.accuracy)" class="font-bold">
                        {{ player.accuracy }}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </PixelCard>
        </div>

        <!-- Questions Tab -->
        <div v-if="activeTab === 'questions'" class="space-y-4">
          <PixelCard
            v-for="(q, index) in questions"
            :key="q.questionId"
          >
            <div class="flex items-start justify-between gap-4 mb-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <PixelBadge variant="primary">Q{{ index + 1 }}</PixelBadge>
                  <span class="text-xs text-muted-foreground uppercase">{{ q.type }}</span>
                </div>
                <h4 class="text-lg font-medium">{{ q.text }}</h4>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold" :class="getAccuracyColor(q.accuracy)">
                  {{ q.accuracy }}%
                </div>
                <div class="text-xs text-muted-foreground">{{ t('analytics.accuracy') }}</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 text-center">
              <div class="p-3 bg-muted/30 border-2 border-border">
                <div class="text-xl font-bold">{{ q.totalAnswers }}</div>
                <div class="text-xs text-muted-foreground">{{ t('session.answers') }}</div>
              </div>
              <div class="p-3 bg-success/10 border-2 border-success">
                <div class="text-xl font-bold text-success">{{ q.correctCount }}</div>
                <div class="text-xs text-muted-foreground">{{ t('analytics.correct') }}</div>
              </div>
              <div class="p-3 bg-muted/30 border-2 border-border">
                <div class="text-xl font-bold">{{ Math.round(q.avgTime / 1000) }}s</div>
                <div class="text-xs text-muted-foreground">{{ t('analytics.avgResponseTime') }}</div>
              </div>
            </div>
          </PixelCard>
        </div>
      </template>
    </main>
  </div>
</template>
