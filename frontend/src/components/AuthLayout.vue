<script setup>
import LanguageSwitcher from './LanguageSwitcher.vue';
import PixelCard from './PixelCard.vue';

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  }
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-6 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-y-auto">
    <div class="w-full max-w-md flex flex-col">
      <div class="flex justify-end mb-3">
        <LanguageSwitcher />
      </div>
      <div class="text-center mb-3">
        <h1 class="text-2xl font-bold pixel-font text-primary mb-1">Answr</h1>
        <p v-if="subtitle" class="text-muted-foreground text-sm">
          {{ subtitle }}
        </p>
      </div>

      <PixelCard class="space-y-4 !p-4">
        <slot />
      </PixelCard>

      <div class="mt-3 text-center">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>

