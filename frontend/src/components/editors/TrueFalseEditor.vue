<script setup>
import { computed } from 'vue';

const props = defineProps({
  answers: {
    type: Array,
    default: () => [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false }
    ]
  }
});

const emit = defineEmits(['update:answers']);

// Computed to find which one is correct
const correctAnswer = computed(() => {
  const trueAnswer = props.answers.find(a => a.text === 'True');
  return trueAnswer?.isCorrect ? 'True' : 'False';
});

function setCorrect(value) {
  const newAnswers = [
    { text: 'True', isCorrect: value === 'True' },
    { text: 'False', isCorrect: value === 'False' }
  ];
  emit('update:answers', newAnswers);
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted-foreground mb-4">
      Select which answer is correct:
    </p>

    <div class="grid grid-cols-2 gap-4">
      <!-- True Button -->
      <button
        @click="setCorrect('True')"
        class="p-6 border-[3px] transition-all text-center"
        :class="correctAnswer === 'True'
          ? 'bg-success border-success text-white pixel-shadow'
          : 'bg-white border-border hover:border-success text-foreground'"
      >
        <div class="flex flex-col items-center gap-3">
          <div
            class="w-16 h-16 flex items-center justify-center rounded-full"
            :class="correctAnswer === 'True' ? 'bg-white/20' : 'bg-success/10'"
          >
            <svg
              width="32" height="32" viewBox="0 0 24 24" fill="none"
              :stroke="correctAnswer === 'True' ? 'white' : 'currentColor'"
              stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
              :class="correctAnswer === 'True' ? '' : 'text-success'"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span class="text-xl font-bold">True</span>
          <span
            v-if="correctAnswer === 'True'"
            class="text-xs bg-white/20 px-2 py-1"
          >
            Correct Answer
          </span>
        </div>
      </button>

      <!-- False Button -->
      <button
        @click="setCorrect('False')"
        class="p-6 border-[3px] transition-all text-center"
        :class="correctAnswer === 'False'
          ? 'bg-destructive border-destructive text-white pixel-shadow'
          : 'bg-white border-border hover:border-destructive text-foreground'"
      >
        <div class="flex flex-col items-center gap-3">
          <div
            class="w-16 h-16 flex items-center justify-center rounded-full"
            :class="correctAnswer === 'False' ? 'bg-white/20' : 'bg-destructive/10'"
          >
            <svg
              width="32" height="32" viewBox="0 0 24 24" fill="none"
              :stroke="correctAnswer === 'False' ? 'white' : 'currentColor'"
              stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
              :class="correctAnswer === 'False' ? '' : 'text-destructive'"
            >
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <span class="text-xl font-bold">False</span>
          <span
            v-if="correctAnswer === 'False'"
            class="text-xs bg-white/20 px-2 py-1"
          >
            Correct Answer
          </span>
        </div>
      </button>
    </div>
  </div>
</template>
