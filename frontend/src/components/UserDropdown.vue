<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { setLocale, availableLocales } from '../i18n.js';

const { t, locale } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const isOpen = ref(false);
const dropdownRef = ref(null);

const initials = computed(() => {
  const name = auth.user?.name || auth.user?.email || '';
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

const currentLocale = computed(() => {
  return availableLocales.find(l => l.code === locale.value) || availableLocales[0];
});

function selectLocale(code) {
  setLocale(code);
}

function toggle() {
  isOpen.value = !isOpen.value;
}

function close() {
  isOpen.value = false;
}

function goToAccount() {
  close();
  router.push('/account');
}

function goToAnalytics() {
  close();
  router.push('/analytics');
}

function handleLogout() {
  close();
  auth.logout();
  router.push('/');
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  // Fetch user data if authenticated but not loaded yet
  if (auth.isAuthenticated && !auth.user) {
    auth.fetchMe();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <button
      @click="toggle"
      class="flex items-center gap-2 hover:opacity-80 transition-opacity"
      :title="auth.user?.name || auth.user?.email"
    >
      <!-- Avatar with initials -->
      <div class="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold border-2 border-black">
        {{ initials }}
      </div>
      <svg
        :class="['w-4 h-4 text-muted-foreground transition-transform', isOpen ? 'rotate-180' : '']"
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

    <Transition
      enter-active-class="transition ease-out duration-100"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition ease-in duration-75"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 mt-2 w-60 bg-white border-2 border-black shadow-lg z-50"
      >
        <!-- User Info -->
        <div class="px-4 py-3 border-b-2 border-border bg-muted/30">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold border-2 border-black shrink-0">
              {{ initials }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ auth.user?.name }}</p>
              <p class="text-xs text-muted-foreground truncate">{{ auth.user?.email }}</p>
            </div>
          </div>
        </div>

        <!-- Menu Items -->
        <div class="py-1">
          <button
            @click="goToAnalytics"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors"
          >
            <svg
              class="w-4 h-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
            </svg>
            {{ t('analytics.navLink') }}
          </button>

          <button
            @click="goToAccount"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors"
          >
            <svg
              class="w-4 h-4 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {{ t('nav.accountSettings') }}
          </button>

          <!-- Language Selector -->
          <div class="px-4 py-2">
            <div class="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              {{ t('nav.language') }}
            </div>
            <div class="flex gap-1">
              <button
                v-for="loc in availableLocales"
                :key="loc.code"
                type="button"
                class="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm border-2 transition-colors"
                :class="loc.code === locale ? 'border-primary bg-primary/10 font-medium' : 'border-border hover:border-primary'"
                @click="selectLocale(loc.code)"
              >
                <span>{{ loc.flag }}</span>
                <span>{{ loc.code.toUpperCase() }}</span>
              </button>
            </div>
          </div>

          <div class="border-t border-border my-1"></div>

          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-destructive hover:bg-destructive/10 transition-colors"
          >
            <svg
              class="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
