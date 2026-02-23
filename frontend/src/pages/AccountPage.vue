<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';

import PixelButton from '../components/PixelButton.vue';
import PixelCard from '../components/PixelCard.vue';
import PixelBadge from '../components/PixelBadge.vue';
import LanguageSwitcher from '../components/LanguageSwitcher.vue';
import UserDropdown from '../components/UserDropdown.vue';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

// Section collapse state
const expandedSection = ref(null);

function toggleSection(section) {
  expandedSection.value = expandedSection.value === section ? null : section;
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

onMounted(() => {
  if (!auth.user) {
    auth.fetchMe();
  }
});
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
          <LanguageSwitcher />
          <UserDropdown />
        </div>
      </div>
    </header>

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
    </main>
  </div>
</template>
