<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  answers: {
    type: Array,
    default: () => []
  },
  allowMultiple: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:answers']);

// Local answers copy
const localAnswers = ref([...props.answers]);

// Watch for external changes
watch(() => props.answers, (newVal) => {
  localAnswers.value = [...newVal];
}, { deep: true });

// Answer colors (Kahoot-style)
const answerColors = [
  { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
  { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
  { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-black' },
  { bg: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
  { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white' },
  { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white' }
];

// Shape icons for answers
const shapes = ['triangle', 'diamond', 'circle', 'square', 'pentagon', 'hexagon'];

function getShape(index) {
  const shapeIcons = {
    triangle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,3 22,21 2,21" /></svg>`,
    diamond: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 22,12 12,22 2,12" /></svg>`,
    circle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>`,
    square: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" /></svg>`,
    pentagon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 22,9 19,21 5,21 2,9" /></svg>`,
    hexagon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7" /></svg>`
  };
  return shapeIcons[shapes[index]] || shapeIcons.triangle;
}

function updateAnswer(index, field, value) {
  localAnswers.value[index] = {
    ...localAnswers.value[index],
    [field]: value
  };
  emit('update:answers', localAnswers.value);
}

function toggleCorrect(index) {
  if (props.allowMultiple) {
    // Toggle this answer's isCorrect
    updateAnswer(index, 'isCorrect', !localAnswers.value[index].isCorrect);
  } else {
    // Single correct: set this one to correct, others to false
    localAnswers.value = localAnswers.value.map((a, i) => ({
      ...a,
      isCorrect: i === index
    }));
    emit('update:answers', localAnswers.value);
  }
}

function addAnswer() {
  if (localAnswers.value.length >= 6) return;

  localAnswers.value.push({
    text: `Answer ${localAnswers.value.length + 1}`,
    isCorrect: false
  });
  emit('update:answers', localAnswers.value);
}

function removeAnswer(index) {
  if (localAnswers.value.length <= 2) return;

  localAnswers.value.splice(index, 1);

  // Ensure at least one correct answer
  if (!localAnswers.value.some(a => a.isCorrect)) {
    localAnswers.value[0].isCorrect = true;
  }

  emit('update:answers', localAnswers.value);
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(answer, index) in localAnswers"
      :key="index"
      class="flex items-center gap-3"
    >
      <!-- Color indicator with shape -->
      <div
        class="w-12 h-12 flex items-center justify-center flex-shrink-0 border-2"
        :class="[answerColors[index].bg, answerColors[index].border, answerColors[index].text]"
        v-html="getShape(index)"
      ></div>

      <!-- Answer text input -->
      <input
        :value="answer.text"
        @input="updateAnswer(index, 'text', $event.target.value)"
        type="text"
        placeholder="Enter answer..."
        maxlength="75"
        class="flex-1 px-4 py-3 border-2 border-border bg-white focus:border-primary focus:outline-none"
      />

      <!-- Correct toggle -->
      <button
        @click="toggleCorrect(index)"
        class="w-12 h-12 flex items-center justify-center border-2 transition-all"
        :class="answer.isCorrect
          ? 'bg-success border-success text-white'
          : 'bg-white border-border text-muted-foreground hover:border-success hover:text-success'"
        :title="answer.isCorrect ? 'Correct answer' : 'Mark as correct'"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>

      <!-- Remove button -->
      <button
        v-if="localAnswers.length > 2"
        @click="removeAnswer(index)"
        class="w-12 h-12 flex items-center justify-center border-2 border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
        title="Remove answer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Add answer button -->
    <button
      v-if="localAnswers.length < 6"
      @click="addAnswer"
      class="w-full py-3 border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add Answer ({{ localAnswers.length }}/6)
    </button>

    <p class="text-xs text-muted-foreground">
      Click the checkmark to mark an answer as correct. At least one answer must be correct.
    </p>
  </div>
</template>
