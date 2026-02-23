<script setup>
import { computed } from 'vue';

const props = defineProps({
  badges: {
    type: Array,
    default: () => []
  },
  showProgress: {
    type: Boolean,
    default: true
  }
});

const sortedBadges = computed(() => {
  // Show earned badges first, then sort by category
  return [...props.badges].sort((a, b) => {
    if (a.earned && !b.earned) return -1;
    if (!a.earned && b.earned) return 1;
    return 0;
  });
});

const earnedCount = computed(() => props.badges.filter(b => b.earned).length);

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
</script>

<template>
  <div class="space-y-4">
    <!-- Summary -->
    <div class="flex items-center justify-between">
      <div class="text-sm text-muted-foreground">
        <span class="font-bold text-foreground">{{ earnedCount }}</span> / {{ badges.length }} badges earned
      </div>
    </div>

    <!-- Badge Grid -->
    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
      <div
        v-for="badge in sortedBadges"
        :key="badge.id"
        class="relative group"
      >
        <!-- Badge Card -->
        <div
          class="aspect-square border-2 flex flex-col items-center justify-center p-2 transition-all"
          :class="badge.earned
            ? 'border-warning bg-warning/10 hover:border-warning hover:bg-warning/20'
            : 'border-border bg-muted/30 opacity-50 grayscale'"
        >
          <!-- Emoji -->
          <span class="text-3xl sm:text-4xl mb-1">{{ badge.emoji }}</span>

          <!-- Name -->
          <span class="text-xs font-bold text-center leading-tight truncate w-full">
            {{ badge.name }}
          </span>

          <!-- Progress bar (for unearned badges) -->
          <div
            v-if="showProgress && !badge.earned && badge.progress !== undefined"
            class="absolute bottom-0 left-0 right-0 h-1 bg-border"
          >
            <div
              class="h-full bg-primary transition-all"
              :style="{ width: `${badge.progress}%` }"
            ></div>
          </div>
        </div>

        <!-- Tooltip -->
        <div
          class="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        >
          <div class="font-bold">{{ badge.name }}</div>
          <div>{{ badge.description }}</div>
          <div v-if="badge.earned" class="text-success-foreground mt-1">
            Earned {{ formatDate(badge.earnedAt) }}
          </div>
          <div v-else-if="badge.progress !== undefined" class="text-muted-foreground mt-1">
            Progress: {{ Math.round(badge.progress) }}%
          </div>
          <!-- Arrow -->
          <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground"></div>
        </div>
      </div>
    </div>
  </div>
</template>
