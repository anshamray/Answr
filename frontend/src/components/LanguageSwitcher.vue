<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { setLocale, availableLocales } from '../i18n.js';

const { locale } = useI18n();
const isOpen = ref(false);

const currentLocale = computed(() => {
  return availableLocales.find(l => l.code === locale.value) || availableLocales[0];
});

function selectLocale(code) {
  setLocale(code);
  isOpen.value = false;
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}
</script>

<template>
  <div class="relative" @mouseleave="closeDropdown">
    <button
      type="button"
      class="flex items-center gap-2 px-3 py-2 border-2 border-border hover:border-primary bg-white transition-colors text-sm font-medium"
      @click="toggleDropdown"
    >
      <span :class="`fi fi-${currentLocale.flag}`"></span>
      <span class="hidden sm:inline">{{ currentLocale.code.toUpperCase() }}</span>
      <svg
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': isOpen }"
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

    <div
      v-if="isOpen"
      class="absolute right-0 top-full mt-1 bg-white border-2 border-black shadow-lg z-50 min-w-[140px]"
    >
      <button
        v-for="loc in availableLocales"
        :key="loc.code"
        type="button"
        class="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-primary/10 transition-colors"
        :class="{ 'bg-primary/5 font-medium': loc.code === locale }"
        @click="selectLocale(loc.code)"
      >
        <span :class="`fi fi-${loc.flag}`"></span>
        <span class="text-sm">{{ loc.name }}</span>
      </button>
    </div>
  </div>
</template>
