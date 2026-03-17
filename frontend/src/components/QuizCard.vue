<script setup>
import PixelCard from './PixelCard.vue';
import PixelBadge from './PixelBadge.vue';
import PixelButton from './PixelButton.vue';
import PixelUsers from './icons/PixelUsers.vue';

const props = defineProps({
  quiz: {
    type: Object,
    required: true
  },
  variant: {
    type: String,
    default: 'library' // 'library' | 'dashboard-detailed' | 'dashboard-compact'
  },
  showPlayButton: {
    type: Boolean,
    default: false
  },
  playLabel: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['play', 'edit', 'delete', 'publish', 'unpublish', 'click']);

function handleClick() {
  emit('click', props.quiz);
}
</script>

<template>
  <PixelCard
    v-if="variant === 'library'"
    class="space-y-3 hover:border-primary transition-all cursor-pointer h-full flex flex-col"
    @click="handleClick"
  >
    <div class="flex items-start justify-between">
      <h3 class="text-xl font-bold transition">{{ quiz.title }}</h3>
      <div class="flex items-center gap-2 ml-2 shrink-0">
        <svg
          v-if="quiz.isFavorited"
          class="text-accent"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          />
        </svg>
        <PixelBadge v-if="quiz.isOfficial" variant="primary">Official</PixelBadge>
      </div>
    </div>
    <p class="text-sm text-muted-foreground line-clamp-2">
      {{ quiz.description || 'No description yet' }}
    </p>

    <div v-if="quiz.tags?.length" class="flex flex-wrap items-center gap-2">
      <span
        v-for="tag in quiz.tags.slice(0, 3)"
        :key="tag"
        class="inline-flex items-center px-2 py-1 bg-muted text-muted-foreground text-xs font-medium leading-none whitespace-nowrap"
      >
        {{ tag }}
      </span>
    </div>

    <div
      class="flex items-center justify-between pt-2 border-t-2 border-border text-xs text-muted-foreground mt-auto"
    >
      <span>{{ quiz.author }}</span>
      <span class="flex items-center gap-1">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {{ quiz.playCount?.toLocaleString() || 0 }}
      </span>
    </div>
  </PixelCard>

  <PixelCard
    v-else-if="variant === 'dashboard-detailed'"
    class="transition-all group flex flex-col"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <h3
          class="text-xl font-bold mb-2 hover:text-primary transition-colors cursor-pointer"
          @click="emit('click', quiz)"
        >
          {{ quiz.title }}
        </h3>
        <div class="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{{ quiz.questionCount || quiz.questions?.length || 0 }} questions</span>
          <span>·</span>
          <span>{{ quiz.playCount || 0 }} plays</span>
        </div>
      </div>
      <div class="flex flex-col items-end gap-1">
        <PixelBadge :variant="quiz.isPublished ? 'success' : 'warning'">
          {{ quiz.isPublished ? 'Published' : 'Private' }}
        </PixelBadge>
      </div>
    </div>

    <div class="mt-4 pt-4 border-t-2 border-border space-y-4 flex-1 flex flex-col">
      <div class="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
        <span v-if="quiz.description">{{ quiz.description }}</span>
        <span v-else class="italic">No description yet</span>
      </div>

      <div class="flex flex-wrap gap-4 text-sm min-h-[1.25rem]">
        <div v-if="quiz.category" class="flex items-center gap-1">
          <svg
            class="w-4 h-4 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
            />
          </svg>
          <span class="text-muted-foreground">{{ quiz.category }}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 min-h-[1.75rem]">
        <span
          v-for="tag in (quiz.tags || [])"
          :key="tag"
          class="inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-xs font-medium leading-none whitespace-nowrap"
        >
          {{ tag }}
        </span>
      </div>

      <div class="mt-auto space-y-2 pt-2">
        <div class="flex items-center gap-2">
          <PixelButton variant="primary" size="sm" class="flex-1 min-w-0" @click.stop="emit('play', quiz)">
            <svg
              class="inline mr-1"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {{ playLabel || 'Start' }}
          </PixelButton>
          <button
            class="min-h-[44px] min-w-[44px] flex items-center justify-center border-[3px] border-black bg-white hover:border-secondary hover:bg-secondary/10 transition-colors"
            @click.stop="emit('edit', quiz)"
            title="Edit"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
              />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            class="min-h-[44px] min-w-[44px] flex items-center justify-center border-[3px] border-black bg-white hover:border-destructive hover:bg-destructive/10 transition-colors"
            @click.stop="emit('delete', quiz)"
            title="Delete"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
          </button>
        </div>

        <div class="pt-2 border-top-2 border-border">
          <PixelButton
            v-if="!quiz.isPublished"
            variant="secondary"
            size="sm"
            class="w-full"
            @click.stop="emit('publish', quiz)"
          >
            Publish
          </PixelButton>
          <PixelButton
            v-else
            variant="outline"
            size="sm"
            class="w-full"
            @click.stop="emit('unpublish', quiz)"
          >
            Unpublish
          </PixelButton>
        </div>
      </div>
    </div>
  </PixelCard>

  <PixelCard
    v-else-if="variant === 'dashboard-compact'"
    class="transition-all group !p-4"
  >
    <div class="flex items-start justify-between gap-2 mb-3">
      <h3
        class="flex-1 font-bold hover:text-primary transition-colors cursor-pointer line-clamp-1"
        @click="emit('click', quiz)"
      >
        {{ quiz.title }}
      </h3>
      <PixelBadge :variant="quiz.isPublished ? 'success' : 'warning'" class="shrink-0">
        {{ quiz.isPublished ? 'Published' : 'Private' }}
      </PixelBadge>
    </div>

    <div class="flex items-center gap-3 text-sm text-muted-foreground mb-3">
      <span>{{ quiz.questionCount || quiz.questions?.length || 0 }} questions</span>
      <span>·</span>
      <span>{{ quiz.playCount || 0 }} plays</span>
    </div>

    <div class="flex items-center gap-2">
      <PixelButton variant="primary" size="sm" class="flex-1" @click.stop="emit('play', quiz)">
        <svg
          class="inline mr-1"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {{ playLabel || 'Start' }}
      </PixelButton>
      <button
        class="p-2 border-2 border-black bg-white hover:bg-secondary/10 transition-colors"
        @click.stop="emit('edit', quiz)"
        title="Edit"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
          />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        class="p-2 border-2 border-black bg-white hover:bg-destructive/10 transition-colors"
        @click.stop="emit('delete', quiz)"
        title="Delete"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="3 6 5 6 21 6" />
          <path
            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          />
        </svg>
      </button>
    </div>
  </PixelCard>
</template>

