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
import BadgeGrid from '../components/BadgeGrid.vue';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

// Section collapse state
const expandedSection = ref(null);

function toggleSection(section) {
  expandedSection.value = expandedSection.value === section ? null : section;
}

// Stats and badges
const userStats = ref(null);
const userBadges = ref([]);
const statsLoading = ref(false);

async function fetchStatsAndBadges() {
  statsLoading.value = true;
  try {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [statsRes, badgesRes] = await Promise.all([
      fetch(apiUrl('/api/auth/me/stats'), { headers }),
      fetch(apiUrl('/api/auth/me/badges'), { headers })
    ]);

    if (statsRes.ok) {
      const statsData = await statsRes.json();
      userStats.value = statsData.data?.stats || null;
    }

    if (badgesRes.ok) {
      const badgesData = await badgesRes.json();
      userBadges.value = badgesData.data?.badges || [];
    }
  } catch (err) {
    console.error('Failed to fetch stats/badges:', err);
  } finally {
    statsLoading.value = false;
  }
}

// Change Name Form
const nameForm = ref({
  name: '',
  loading: false,
  error: '',
  success: ''
});

async function handleUpdateName() {
  nameForm.value.error = '';
  nameForm.value.success = '';

  if (!nameForm.value.name.trim()) {
    nameForm.value.error = t('account.nameRequired');
    return;
  }

  nameForm.value.loading = true;
  try {
    await auth.updateName(nameForm.value.name.trim());
    nameForm.value.success = t('account.nameUpdated');
    nameForm.value.name = '';
    expandedSection.value = null;
  } catch (err) {
    nameForm.value.error = err.message || t('account.updateFailed');
  } finally {
    nameForm.value.loading = false;
  }
}

// Change Email Form
const emailForm = ref({
  email: '',
  password: '',
  loading: false,
  error: '',
  success: ''
});

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function handleUpdateEmail() {
  emailForm.value.error = '';
  emailForm.value.success = '';

  if (!emailForm.value.email.trim()) {
    emailForm.value.error = t('account.emailRequired');
    return;
  }

  if (!validateEmail(emailForm.value.email.trim())) {
    emailForm.value.error = t('account.invalidEmail');
    return;
  }

  if (!emailForm.value.password) {
    emailForm.value.error = t('account.currentPasswordRequired');
    return;
  }

  emailForm.value.loading = true;
  try {
    await auth.updateEmail(emailForm.value.email.trim(), emailForm.value.password);
    emailForm.value.success = t('account.emailUpdated');
    emailForm.value.email = '';
    emailForm.value.password = '';
    expandedSection.value = null;
  } catch (err) {
    emailForm.value.error = err.message || t('account.updateFailed');
  } finally {
    emailForm.value.loading = false;
  }
}

// Change Password Form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  loading: false,
  error: '',
  success: ''
});

async function handleUpdatePassword() {
  passwordForm.value.error = '';
  passwordForm.value.success = '';

  if (!passwordForm.value.currentPassword) {
    passwordForm.value.error = t('account.currentPasswordRequired');
    return;
  }

  if (!passwordForm.value.newPassword) {
    passwordForm.value.error = t('account.newPasswordRequired');
    return;
  }

  if (passwordForm.value.newPassword.length < 6) {
    passwordForm.value.error = t('account.passwordTooShort');
    return;
  }

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordForm.value.error = t('account.passwordMismatch');
    return;
  }

  passwordForm.value.loading = true;
  try {
    await auth.updatePassword(passwordForm.value.currentPassword, passwordForm.value.newPassword);
    passwordForm.value.success = t('account.passwordUpdated');
    passwordForm.value.currentPassword = '';
    passwordForm.value.newPassword = '';
    passwordForm.value.confirmPassword = '';
    expandedSection.value = null;
  } catch (err) {
    passwordForm.value.error = err.message || t('account.updateFailed');
  } finally {
    passwordForm.value.loading = false;
  }
}

const isOAuthUser = computed(() => auth.user?.provider && auth.user.provider !== 'local');
const providerName = computed(() => {
  if (!auth.user?.provider) return '';
  return auth.user.provider.charAt(0).toUpperCase() + auth.user.provider.slice(1);
});

// Delete Account
const showDeleteDialog = ref(false);
const deleteForm = ref({
  confirmText: '',
  password: '',
  loading: false,
  error: ''
});

function openDeleteDialog() {
  deleteForm.value = {
    confirmText: '',
    password: '',
    loading: false,
    error: ''
  };
  showDeleteDialog.value = true;
}

function closeDeleteDialog() {
  showDeleteDialog.value = false;
}

async function handleDeleteAccount() {
  deleteForm.value.error = '';

  if (deleteForm.value.confirmText !== 'DELETE') {
    deleteForm.value.error = t('account.deleteAccountConfirmMismatch');
    return;
  }

  if (!isOAuthUser.value && !deleteForm.value.password) {
    deleteForm.value.error = t('account.deleteAccountPasswordRequired');
    return;
  }

  deleteForm.value.loading = true;
  try {
    await auth.deleteAccount(deleteForm.value.confirmText, deleteForm.value.password);
    router.push('/');
  } catch (err) {
    deleteForm.value.error = err.message || t('account.updateFailed');
    deleteForm.value.loading = false;
  }
}

onMounted(() => {
  if (!auth.user) {
    auth.fetchMe();
  }
  fetchStatsAndBadges();
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <AppHeader />

    <!-- Content -->
    <main class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <!-- Back Link -->
      <router-link
        to="/dashboard"
        class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {{ t('account.backToDashboard') }}
      </router-link>

      <!-- Page Title -->
      <h1 class="text-3xl font-bold">{{ t('account.title') }}</h1>

      <!-- Profile Section -->
      <PixelCard class="space-y-4">
        <h2 class="text-lg font-bold">{{ t('account.profileSection') }}</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2 border-b border-border">
            <span class="text-sm text-muted-foreground">{{ t('account.nameLabel') }}</span>
            <span class="font-medium">{{ auth.user?.name }}</span>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-border">
            <span class="text-sm text-muted-foreground">{{ t('account.emailLabel') }}</span>
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ auth.user?.email }}</span>
              <PixelBadge :variant="auth.user?.emailVerified ? 'success' : 'warning'" size="sm">
                {{ auth.user?.emailVerified ? t('account.verifiedBadge') : t('account.notVerifiedBadge') }}
              </PixelBadge>
            </div>
          </div>
        </div>
      </PixelCard>

      <!-- Stats & Achievements Section -->
      <PixelCard class="space-y-6">
        <h2 class="text-lg font-bold">{{ t('account.statsSection') }}</h2>

        <!-- Loading State -->
        <div v-if="statsLoading" class="flex justify-center py-8">
          <div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>

        <!-- Stats Grid -->
        <div v-else-if="userStats" class="space-y-6">
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            <div class="text-center p-4 bg-muted/30 border-2 border-border">
              <div class="text-2xl font-bold text-primary">{{ userStats.quizzesCompleted || 0 }}</div>
              <div class="text-xs text-muted-foreground">{{ t('account.quizzesPlayed') }}</div>
            </div>
            <div class="text-center p-4 bg-muted/30 border-2 border-border">
              <div class="text-2xl font-bold text-success">{{ userStats.wins || 0 }}</div>
              <div class="text-xs text-muted-foreground">{{ t('account.wins') }}</div>
            </div>
            <div class="text-center p-4 bg-muted/30 border-2 border-border">
              <div class="text-2xl font-bold text-warning">{{ userStats.accuracy || 0 }}%</div>
              <div class="text-xs text-muted-foreground">{{ t('account.accuracy') }}</div>
            </div>
            <div class="text-center p-4 bg-muted/30 border-2 border-border">
              <div class="text-2xl font-bold text-secondary">{{ userStats.maxStreak || 0 }}</div>
              <div class="text-xs text-muted-foreground">{{ t('account.bestStreak') }}</div>
            </div>
            <div class="text-center p-4 bg-muted/30 border-2 border-border">
              <div class="text-2xl font-bold text-accent">{{ userStats.sessionsHosted || 0 }}</div>
              <div class="text-xs text-muted-foreground">{{ t('account.sessionsHosted') }}</div>
            </div>
          </div>

          <!-- Badges -->
          <div>
            <h3 class="text-md font-bold mb-4">{{ t('account.badgesSection') }}</h3>
            <BadgeGrid :badges="userBadges" :show-progress="true" />
          </div>
        </div>

        <!-- No Stats Yet -->
        <div v-else class="text-center py-8 text-muted-foreground">
          <p>{{ t('account.noStatsYet') }}</p>
        </div>
      </PixelCard>

      <!-- Change Name Section -->
      <PixelCard>
        <button
          @click="toggleSection('name')"
          class="w-full flex items-center justify-between py-2"
        >
          <h2 class="text-lg font-bold">{{ t('account.changeNameSection') }}</h2>
          <svg
            :class="['w-5 h-5 transition-transform', expandedSection === 'name' ? 'rotate-180' : '']"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div v-if="expandedSection === 'name'" class="pt-4 space-y-4">
          <div v-if="nameForm.error" class="p-3 bg-destructive/10 border-2 border-destructive text-destructive text-sm">
            {{ nameForm.error }}
          </div>
          <div v-if="nameForm.success" class="p-3 bg-success/10 border-2 border-success text-success text-sm">
            {{ nameForm.success }}
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">{{ t('account.nameLabel') }}</label>
            <input
              v-model="nameForm.name"
              type="text"
              :placeholder="auth.user?.name"
              class="w-full px-4 py-3 border-2 border-border focus:border-primary focus:outline-none transition"
            />
          </div>

          <PixelButton
            variant="primary"
            :disabled="nameForm.loading"
            @click="handleUpdateName"
          >
            {{ nameForm.loading ? t('account.saving') : t('account.saveChanges') }}
          </PixelButton>
        </div>
      </PixelCard>

      <!-- Change Email Section -->
      <PixelCard>
        <button
          @click="toggleSection('email')"
          class="w-full flex items-center justify-between py-2"
        >
          <h2 class="text-lg font-bold">{{ t('account.changeEmailSection') }}</h2>
          <svg
            :class="['w-5 h-5 transition-transform', expandedSection === 'email' ? 'rotate-180' : '']"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div v-if="expandedSection === 'email'" class="pt-4 space-y-4">
          <div v-if="isOAuthUser" class="p-3 bg-muted border-2 border-border text-muted-foreground text-sm">
            {{ t('account.oauthPasswordNote', { provider: providerName }) }}
          </div>

          <template v-else>
            <div v-if="emailForm.error" class="p-3 bg-destructive/10 border-2 border-destructive text-destructive text-sm">
              {{ emailForm.error }}
            </div>
            <div v-if="emailForm.success" class="p-3 bg-success/10 border-2 border-success text-success text-sm">
              {{ emailForm.success }}
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">{{ t('account.emailLabel') }}</label>
              <input
                v-model="emailForm.email"
                type="email"
                :placeholder="auth.user?.email"
                class="w-full px-4 py-3 border-2 border-border focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">{{ t('account.currentPassword') }}</label>
              <input
                v-model="emailForm.password"
                type="password"
                class="w-full px-4 py-3 border-2 border-border focus:border-primary focus:outline-none transition"
              />
            </div>

            <PixelButton
              variant="primary"
              :disabled="emailForm.loading"
              @click="handleUpdateEmail"
            >
              {{ emailForm.loading ? t('account.saving') : t('account.saveChanges') }}
            </PixelButton>
          </template>
        </div>
      </PixelCard>

      <!-- Change Password Section -->
      <PixelCard>
        <button
          @click="toggleSection('password')"
          class="w-full flex items-center justify-between py-2"
        >
          <h2 class="text-lg font-bold">{{ t('account.changePasswordSection') }}</h2>
          <svg
            :class="['w-5 h-5 transition-transform', expandedSection === 'password' ? 'rotate-180' : '']"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div v-if="expandedSection === 'password'" class="pt-4 space-y-4">
          <div v-if="isOAuthUser" class="p-3 bg-muted border-2 border-border text-muted-foreground text-sm">
            {{ t('account.oauthPasswordNote', { provider: providerName }) }}
          </div>

          <template v-else>
            <div v-if="passwordForm.error" class="p-3 bg-destructive/10 border-2 border-destructive text-destructive text-sm">
              {{ passwordForm.error }}
            </div>
            <div v-if="passwordForm.success" class="p-3 bg-success/10 border-2 border-success text-success text-sm">
              {{ passwordForm.success }}
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">{{ t('account.currentPassword') }}</label>
              <input
                v-model="passwordForm.currentPassword"
                type="password"
                class="w-full px-4 py-3 border-2 border-border focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">{{ t('account.newPassword') }}</label>
              <input
                v-model="passwordForm.newPassword"
                type="password"
                class="w-full px-4 py-3 border-2 border-border focus:border-primary focus:outline-none transition"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2">{{ t('account.confirmPassword') }}</label>
              <input
                v-model="passwordForm.confirmPassword"
                type="password"
                class="w-full px-4 py-3 border-2 border-border focus:border-primary focus:outline-none transition"
              />
            </div>

            <PixelButton
              variant="primary"
              :disabled="passwordForm.loading"
              @click="handleUpdatePassword"
            >
              {{ passwordForm.loading ? t('account.saving') : t('account.saveChanges') }}
            </PixelButton>
          </template>
        </div>
      </PixelCard>

      <!-- Delete Account Section -->
      <PixelCard class="border-destructive/50">
        <button
          @click="toggleSection('delete')"
          class="w-full flex items-center justify-between py-2"
        >
          <h2 class="text-lg font-bold text-destructive">{{ t('account.deleteAccountSection') }}</h2>
          <svg
            :class="['w-5 h-5 text-destructive transition-transform', expandedSection === 'delete' ? 'rotate-180' : '']"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div v-if="expandedSection === 'delete'" class="pt-4 space-y-4">
          <div class="p-3 bg-destructive/10 border-2 border-destructive/30 text-sm">
            <p class="text-destructive font-medium">{{ t('account.deleteAccountWarning') }}</p>
          </div>

          <PixelButton
            variant="destructive"
            @click="openDeleteDialog"
          >
            {{ t('account.deleteAccountButton') }}
          </PixelButton>
        </div>
      </PixelCard>
    </main>

    <!-- Delete Confirmation Dialog -->
    <div
      v-if="showDeleteDialog"
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      @click.self="closeDeleteDialog"
    >
      <div class="bg-white border-[3px] border-black pixel-shadow max-w-md w-full p-6 space-y-4">
        <h3 class="text-xl font-bold text-destructive">{{ t('account.deleteAccountSection') }}</h3>

        <div class="p-3 bg-destructive/10 border-2 border-destructive/30 text-sm">
          <p class="text-destructive">{{ t('account.deleteAccountWarning') }}</p>
        </div>

        <div v-if="deleteForm.error" class="p-3 bg-destructive/10 border-2 border-destructive text-destructive text-sm">
          {{ deleteForm.error }}
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">{{ t('account.deleteAccountConfirmLabel') }}</label>
          <input
            v-model="deleteForm.confirmText"
            type="text"
            :placeholder="t('account.deleteAccountConfirmPlaceholder')"
            class="w-full px-4 py-3 border-2 border-border focus:border-destructive focus:outline-none transition"
            autocomplete="one-time-code"
            data-lpignore="true"
            data-form-type="other"
          />
        </div>

        <div v-if="!isOAuthUser">
          <label class="block text-sm font-medium mb-2">{{ t('account.currentPassword') }}</label>
          <input
            v-model="deleteForm.password"
            type="password"
            class="w-full px-4 py-3 border-2 border-border focus:border-destructive focus:outline-none transition"
            autocomplete="new-password"
          />
        </div>

        <div class="flex gap-3 pt-2">
          <PixelButton
            variant="outline"
            class="flex-1"
            @click="closeDeleteDialog"
          >
            {{ t('common.cancel') }}
          </PixelButton>
          <PixelButton
            variant="destructive"
            class="flex-1"
            :disabled="deleteForm.loading"
            @click="handleDeleteAccount"
          >
            {{ deleteForm.loading ? t('account.deleting') : t('account.deleteAccountButton') }}
          </PixelButton>
        </div>
      </div>
    </div>
  </div>
</template>
