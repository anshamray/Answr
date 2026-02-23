<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const isOpen = ref(false);
const dropdownRef = ref(null);

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
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div ref="dropdownRef" class="relative">
    <button
      @click="toggle"
      class="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors rounded-sm"
    >
      <span class="max-w-[150px] truncate">{{ auth.user?.name || auth.user?.email }}</span>
      <svg
        :class="['w-4 h-4 transition-transform', isOpen ? 'rotate-180' : '']"
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
        class="absolute right-0 mt-2 w-56 bg-white border-2 border-black shadow-lg z-50"
      >
        <!-- User Info -->
        <div class="px-4 py-3 border-b-2 border-border">
          <p class="text-sm font-medium truncate">{{ auth.user?.name }}</p>
          <p class="text-xs text-muted-foreground truncate">{{ auth.user?.email }}</p>
        </div>

        <!-- Menu Items -->
        <div class="py-1">
          <button
            @click="goToAccount"
            class="w-full flex items-center gap-3 px-4 py-2 text-sm text-left hover:bg-muted/50 transition-colors"
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
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {{ t('nav.accountSettings') }}
          </button>

          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-4 py-2 text-sm text-left text-destructive hover:bg-destructive/10 transition-colors"
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
