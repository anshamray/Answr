<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';

import LanguageSwitcher from './LanguageSwitcher.vue';
import UserDropdown from './UserDropdown.vue';
import PixelButton from './PixelButton.vue';

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();

const isActive = (path) => route.path === path;
</script>

<template>
  <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition">
          <span class="text-2xl font-bold text-primary pixel-font">Answr</span>
        </router-link>
      </div>

      <!-- Navigation -->
      <div class="flex items-center gap-4">
        <router-link
          to="/library"
          class="text-sm transition"
          :class="isActive('/library') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'"
        >
          {{ t('nav.library') }}
        </router-link>

        <template v-if="auth.isAuthenticated">
          <router-link
            to="/dashboard"
            class="text-sm transition"
            :class="isActive('/dashboard') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'"
          >
            {{ t('nav.dashboard') }}
          </router-link>

          <router-link
            to="/analytics"
            class="text-sm transition"
            :class="isActive('/analytics') || route.path.startsWith('/analytics/') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'"
          >
            {{ t('analytics.navLink') }}
          </router-link>

          <router-link
            v-if="auth.user && auth.user.role === 'admin'"
            to="/admin"
            class="text-sm transition"
            :class="isActive('/admin') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'"
          >
            Admin
          </router-link>
        </template>

        <template v-if="auth.isAuthenticated">
          <UserDropdown />
        </template>
        <template v-else>
          <LanguageSwitcher />
          <router-link to="/auth">
            <PixelButton variant="primary" size="sm">
              {{ t('nav.login') }}
            </PixelButton>
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>
