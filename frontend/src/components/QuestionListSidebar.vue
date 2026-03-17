<script setup>
import { useI18n } from 'vue-i18n';

const props = defineProps({
  questions: {
    type: Array,
    required: true
  },
  selectedQuestionId: {
    type: [String, null],
    default: null
  },
  questionTypeInfo: {
    type: Object,
    required: true
  },
  dragIndex: {
    type: Number,
    default: null
  },
  dropTargetIndex: {
    type: Number,
    default: null
  },
  isTemporaryId: {
    type: Function,
    required: true
  },
  getQuestionPreview: {
    type: Function,
    required: true
  }
});

const emit = defineEmits([
  'open-type-selector',
  'select',
  'duplicate',
  'delete',
  'dragstart',
  'dragover',
  'dragleave',
  'drop',
  'dragend'
]);

const { t } = useI18n();
</script>

<template>
  <aside class="w-full lg:w-64 shrink-0 border-b-[3px] lg:border-b-0 lg:border-r-[3px] border-black bg-white flex flex-col">
    <div class="p-4 border-b-[3px] border-border">
      <button
        type="button"
        class="w-full inline-flex items-center justify-center gap-2 border-[3px] border-black bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:brightness-110 transition"
        @click="emit('open-type-selector')"
      >
        <svg class="inline" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {{ t('quizEditor.addQuestion') }}
      </button>
    </div>

    <!-- Question List -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="questions.length === 0" class="p-6 text-center">
        <div class="w-16 h-16 mx-auto mb-4 bg-primary/10 border-2 border-primary flex items-center justify-center">
          <svg class="text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">{{ t('quizEditor.noQuestionsYet') }}</p>
        <p class="text-xs text-muted-foreground mt-1">{{ t('quizEditor.clickToStart') }}</p>
      </div>

      <div
        v-for="(question, index) in questions"
        :key="question._id"
        class="group cursor-pointer"
        draggable="true"
        @dragstart="emit('dragstart', index, $event)"
        @dragover="emit('dragover', index, $event)"
        @dragleave="emit('dragleave')"
        @drop="emit('drop', index)"
        @dragend="emit('dragend')"
      >
        <div
          class="w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors"
          :class="{
            'bg-primary/10 border-l-4 border-l-primary': selectedQuestionId === question._id,
            'border-l-4 border-l-warning': isTemporaryId(question._id) && selectedQuestionId !== question._id,
            'opacity-50': dragIndex === index,
            'border-t-2 border-t-primary': dropTargetIndex === index && dragIndex !== index
          }"
          @click="emit('select', question._id)"
        >
          <div class="flex items-start gap-2">
            <svg class="shrink-0 mt-1 text-muted-foreground/50 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/>
              <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
              <circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/>
            </svg>
            <span class="text-sm font-bold text-muted-foreground min-w-[20px]">
              {{ index + 1 }}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="inline-flex items-center px-1.5 py-0.5 rounded-none border border-border text-[10px] uppercase tracking-wide"
                  :class="`bg-${questionTypeInfo[question.type]?.color || 'primary'}/10 text-${questionTypeInfo[question.type]?.color || 'primary'}`"
                >
                  {{ questionTypeInfo[question.type]?.label || question.type }}
                </span>
                <span v-if="isTemporaryId(question._id)" class="text-[10px] text-warning">
                  {{ t('quizEditor.new') }}
                </span>
              </div>
              <p class="text-sm text-foreground truncate">
                {{ getQuestionPreview(question) }}
              </p>
            </div>
          </div>

          <!-- Hover actions -->
          <div class="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              class="p-1 text-muted-foreground hover:text-primary"
              :title="t('quizEditor.duplicate')"
              @click.stop="emit('duplicate', question._id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button
              class="p-1 text-muted-foreground hover:text-destructive"
              :title="t('common.delete')"
              @click.stop="emit('delete', question._id)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

