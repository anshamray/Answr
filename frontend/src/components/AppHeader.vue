<script setup>
import { computed, ref } from 'vue';
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

const isMobileMenuOpen = ref(false);
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};
</script>

<template>
  <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center gap-3">
          <router-link to="/" class="flex items-center gap-2 hover:opacity-80 transition" @click="closeMobileMenu">
            <span class="text-2xl font-bold text-primary pixel-font">Answr</span>
          </router-link>
        </div>

        <!-- Desktop navigation -->
        <div class="hidden md:flex items-center gap-4">
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
            <router-link to="/login">
              <PixelButton variant="primary" size="sm">
                {{ t('nav.login') }}
              </PixelButton>
            </router-link>
          </template>
        </div>

        <!-- Mobile actions -->
        <div class="flex items-center gap-3 md:hidden">
          <LanguageSwitcher v-if="!auth.isAuthenticated" />
          <button
            type="button"
            class="inline-flex items-center justify-center rounded border-[3px] border-black bg-white px-2 py-1"
            @click="toggleMobileMenu"
          >
            <span class="sr-only">Toggle navigation</span>
            <span class="flex flex-col gap-[3px]">
              <span
                class="h-[2px] w-5 bg-black transition-transform"
                :class="isMobileMenuOpen ? 'translate-y-[5px] rotate-45' : ''"
              />
              <span
                class="h-[2px] w-5 bg-black transition-opacity"
                :class="isMobileMenuOpen ? 'opacity-0' : 'opacity-100'"
              />
              <span
                class="h-[2px] w-5 bg-black transition-transform"
                :class="isMobileMenuOpen ? '-translate-y-[5px] -rotate-45' : ''"
              />
            </span>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="isMobileMenuOpen" class="md:hidden border-t-[3px] border-black bg-white">
        <nav class="flex flex-col px-4 py-3 space-y-2">
          <router-link
            to="/library"
            class="text-sm py-1"
            :class="isActive('/library') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'"
            @click="closeMobileMenu"
          >
            {{ t('nav.library') }}
          </router-link>

          <template v-if="auth.isAuthenticated">
            <router-link
              to="/dashboard"
              class="text-sm py-1"
              :class="isActive('/dashboard') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'"
              @click="closeMobileMenu"
            >
              {{ t('nav.dashboard') }}
            </router-link>

            <router-link
              to="/analytics"
              class="text-sm py-1"
              :class="isActive('/analytics') || route.path.startsWith('/analytics/') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'"
              @click="closeMobileMenu"
            >
              {{ t('analytics.navLink') }}
            </router-link>

            <router-link
              v-if="auth.user && auth.user.role === 'admin'"
              to="/admin"
              class="text-sm py-1"
              :class="isActive('/admin') ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'"
              @click="closeMobileMenu"
            >
              Admin
            </router-link>

            <div class="pt-2 border-t border-border">
              <UserDropdown />
            </div>
          </template>

          <template v-else>
            <div class="pt-2 space-y-2">
              <router-link to="/login" class="block" @click="closeMobileMenu">
                <PixelButton variant="primary" size="sm" class="w-full">
                  {{ t('nav.login') }}
                </PixelButton>
              </router-link>
            </div>
          </template>
        </nav>
      </div>
    </div>
  </header>
</template>
