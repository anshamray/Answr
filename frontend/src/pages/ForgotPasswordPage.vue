<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiUrl } from '../lib/api.js';

import PixelButton from '../components/PixelButton.vue';
import PixelInput from '../components/PixelInput.vue';
import AuthLayout from '../components/AuthLayout.vue';

const { t } = useI18n();

const email = ref('');
const status = ref('form'); // 'form', 'loading', 'sent', 'error'
const errorMessage = ref('');

async function handleSubmit() {
  if (!email.value) {
    errorMessage.value = t('validation.enterEmail');
    status.value = 'error';
    return;
  }

  status.value = 'loading';
  errorMessage.value = '';

  try {
    const res = await fetch(apiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    });

    const data = await res.json();

    if (!res.ok) {
      status.value = 'error';
      errorMessage.value = data.error || t('errors.somethingWentWrong');
      return;
    }

    status.value = 'sent';
  } catch (err) {
    status.value = 'error';
    errorMessage.value = t('errors.somethingWentWrong');
  }
}

function resetForm() {
  status.value = 'form';
  email.value = '';
  errorMessage.value = '';
}
</script>

<template>
  <AuthLayout>
    <template #default>
        <!-- Form -->
        <div v-if="status === 'form' || status === 'loading' || status === 'error'" class="space-y-4">
          <div class="text-center">
            <h2 class="text-xl font-bold mb-2">{{ t('forgotPassword.title') }}</h2>
            <p class="text-sm text-muted-foreground">
              {{ t('forgotPassword.subtitle') }}
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <PixelInput
              v-model="email"
              type="email"
              :label="t('auth.email')"
              :placeholder="t('auth.emailPlaceholder')"
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
              <template v-if="status === 'loading'">{{ t('forgotPassword.sending') }}</template>
              <template v-else>{{ t('forgotPassword.sendResetLink') }}</template>
            </PixelButton>
          </form>

          <div class="text-center">
            <router-link to="/login" class="text-sm text-primary hover:underline">
              {{ t('forgotPassword.backToLogin') }}
            </router-link>
          </div>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'sent'" class="space-y-4 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-success/10 border-2 border-success mx-auto">
            <svg class="w-8 h-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h2 class="text-xl font-bold">{{ t('forgotPassword.checkEmail') }}</h2>
          <p class="text-muted-foreground">
            {{ t('forgotPassword.resetLinkSent') }}
          </p>
          <div class="flex gap-2 justify-center pt-2">
            <PixelButton variant="outline" @click="resetForm">
              {{ t('auth.email') }}
            </PixelButton>
            <router-link to="/login">
              <PixelButton variant="primary">
                {{ t('forgotPassword.backToLogin') }}
              </PixelButton>
            </router-link>
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
