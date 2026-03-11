<script setup>
import MultipleChoiceEditor from './MultipleChoiceEditor.vue';
import { useI18n } from 'vue-i18n';

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

const { t } = useI18n();

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
      {{ t('questionEditor.pollHint') }}
    </p>
  </div>
</template>

