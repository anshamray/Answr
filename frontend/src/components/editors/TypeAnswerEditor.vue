<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  answers: {
    type: Array,
    default: () => [{ text: '' }]
  }
});

const emit = defineEmits(['update:answers']);

// Local copy
const localAnswers = ref([...props.answers]);

// Watch for external changes
watch(() => props.answers, (newVal) => {
  localAnswers.value = [...newVal];
}, { deep: true });

function updateAnswer(index, text) {
  localAnswers.value[index] = { text };
  emit('update:answers', localAnswers.value);
}

function addAnswer() {
  if (localAnswers.value.length >= 4) return;
  localAnswers.value.push({ text: '' });
  emit('update:answers', localAnswers.value);
}

function removeAnswer(index) {
  if (localAnswers.value.length <= 1) return;
  localAnswers.value.splice(index, 1);
  emit('update:answers', localAnswers.value);
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted-foreground mb-4">
      Add accepted answers (case-insensitive matching). Players must type one of these exactly.
    </p>

    <div
      v-for="(answer, index) in localAnswers"
      :key="index"
      class="flex items-center gap-3"
    >
      <span class="text-sm font-bold text-muted-foreground w-6">{{ index + 1 }}.</span>

      <input
        :value="answer.text"
        @input="updateAnswer(index, $event.target.value)"
        type="text"
        placeholder="Accepted answer..."
        maxlength="20"
        class="flex-1 px-4 py-3 border-2 border-border bg-white focus:border-primary focus:outline-none font-mono"
      />

      <span class="text-xs text-muted-foreground w-12">
        {{ answer.text?.length || 0 }}/20
      </span>

      <button
        v-if="localAnswers.length > 1"
        @click="removeAnswer(index)"
        class="w-10 h-10 flex items-center justify-center border-2 border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
        title="Remove answer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>

    <button
      v-if="localAnswers.length < 4"
      @click="addAnswer"
      class="w-full py-3 border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add Alternative Answer ({{ localAnswers.length }}/4)
    </button>

    <div class="bg-muted/50 p-4 border-2 border-border">
      <h4 class="text-sm font-medium mb-2">Tips:</h4>
      <ul class="text-xs text-muted-foreground space-y-1">
        <li>- Answers are matched case-insensitively</li>
        <li>- Add common misspellings or abbreviations as alternatives</li>
        <li>- Keep answers short (max 20 characters)</li>
      </ul>
    </div>
  </div>
</template>
