<script setup>
import MultipleChoiceEditor from './MultipleChoiceEditor.vue';

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

function handleUpdate(answers) {
  emit('update:answers', answers);
}
</script>

<template>
  <div class="space-y-3">
    <MultipleChoiceEditor
      :answers="answers"
      :allow-multiple="allowMultiple"
      mode="poll"
      @update:answers="handleUpdate"
    />

    <p class="text-xs text-muted-foreground">
      Polls have no correct answer. Use them to collect opinions or quick check-ins.
    </p>
  </div>
</template>

