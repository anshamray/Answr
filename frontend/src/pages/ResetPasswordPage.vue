<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { apiUrl } from '../lib/api.js';

import PixelButton from '../components/PixelButton.vue';
import PixelInput from '../components/PixelInput.vue';
import AuthLayout from '../components/AuthLayout.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const status = ref('validating'); // 'validating', 'form', 'loading', 'success', 'error', 'invalid'
const errorMessage = ref('');

async function validateToken() {
  const token = route.query.token;

  if (!token) {
    status.value = 'invalid';
    errorMessage.value = t('errors.somethingWentWrong');
    return;
  }

  try {
    const res = await fetch(apiUrl(`/api/auth/check-reset-token/${token}`));
    const data = await res.json();

    if (!res.ok) {
      status.value = 'invalid';
      errorMessage.value = data.error || t('errors.somethingWentWrong');
      return;
    }

    status.value = 'form';
  } catch (err) {
    status.value = 'invalid';
    errorMessage.value = t('errors.somethingWentWrong');
  }
}

async function handleSubmit() {
  errorMessage.value = '';

  if (!password.value || password.value.length < 6) {
    errorMessage.value = t('validation.passwordMinLength');
    status.value = 'error';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errorMessage.value = t('validation.passwordsNoMatch');
    status.value = 'error';
    return;
  }

  status.value = 'loading';

  try {
    const res = await fetch(apiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: route.query.token,
        password: password.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      status.value = 'error';
      errorMessage.value = data.error || t('errors.somethingWentWrong');
      return;
    }

    status.value = 'success';
  } catch (err) {
    status.value = 'error';
    errorMessage.value = t('errors.somethingWentWrong');
  }
}

function goToLogin() {
  router.push('/login');
}

function goToForgotPassword() {
  router.push('/forgot-password');
}

onMounted(validateToken);
</script>

<template>
  <AuthLayout>
    <template #default>
        <!-- Validating token -->
        <div v-if="status === 'validating'" class="space-y-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border-2 border-primary mx-auto">
            <svg class="w-8 h-8 text-primary animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">{{ t('common.loading') }}</h2>
        </div>

        <!-- Invalid token -->
        <div v-else-if="status === 'invalid'" class="space-y-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 border-2 border-destructive mx-auto">
            <svg class="w-8 h-8 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">{{ t('errors.somethingWentWrong') }}</h2>
          <p class="text-muted-foreground">{{ errorMessage }}</p>
          <div class="flex gap-2 justify-center pt-2">
            <PixelButton variant="primary" @click="goToForgotPassword">
              {{ t('forgotPassword.sendResetLink') }}
            </PixelButton>
          </div>
        </div>

        <!-- Form -->
        <div v-else-if="status === 'form' || status === 'loading' || status === 'error'" class="space-y-4">
          <div class="text-center">
            <h2 class="text-xl font-bold mb-2">{{ t('resetPassword.title') }}</h2>
            <p class="text-sm text-muted-foreground">
              {{ t('resetPassword.subtitle') }}
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <PixelInput
              v-model="password"
              type="password"
              :label="t('resetPassword.newPassword')"
              :placeholder="t('auth.passwordPlaceholder')"
              required
              :error="status === 'error'"
              :disabled="status === 'loading'"
            />
            <PixelInput
              v-model="confirmPassword"
              type="password"
              :label="t('resetPassword.confirmNewPassword')"
              :placeholder="t('auth.passwordPlaceholder')"
              required
              :error="status === 'error'"
              :disabled="status === 'loading'"
            />

            <p v-if="errorMessage" class="text-destructive text-sm font-medium">{{ errorMessage }}</p>

            <PixelButton
              type="submit"
              variant="primary"
              class="w-full"
              :disabled="status === 'loading'"
            >
              <template v-if="status === 'loading'">{{ t('resetPassword.resetting') }}</template>
              <template v-else>{{ t('resetPassword.resetPassword') }}</template>
            </PixelButton>
          </form>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'success'" class="space-y-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-success/10 border-2 border-success mx-auto">
            <svg class="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">{{ t('resetPassword.success') }}</h2>
          <p class="text-muted-foreground">
            {{ t('resetPassword.redirecting') }}
          </p>
          <div class="pt-2">
            <PixelButton variant="primary" @click="goToLogin">
              {{ t('auth.signIn') }}
            </PixelButton>
          </div>
        </div>
    </template>

    <template #footer>
      <router-link to="/" class="text-sm text-muted-foreground hover:text-primary">
        &larr; {{ t('common.backToHome') }}
      </router-link>
    </template>
  </AuthLayout>
</template>
