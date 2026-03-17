<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { CATEGORY_OPTIONS } from '../lib/constants/categories.js';

const props = defineProps({
  quiz: {
    type: Object,
    required: true
  },
  showSettings: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:showSettings', 'dirty']);

const { t } = useI18n();

const advancedSettingsExpanded = ref(false);
const newTag = ref('');

const categoryOptions = CATEGORY_OPTIONS;

const languageOptions = [
  { value: 'en', label: 'English', flag: 'gb' },
  { value: 'de', label: 'Deutsch', flag: 'de' },
  { value: 'es', label: 'Español', flag: 'es' },
  { value: 'fr', label: 'Français', flag: 'fr' },
  { value: 'it', label: 'Italiano', flag: 'it' },
  { value: 'pt', label: 'Português', flag: 'pt' },
  { value: 'nl', label: 'Nederlands', flag: 'nl' },
  { value: 'pl', label: 'Polski', flag: 'pl' },
  { value: 'ru', label: 'Русский', flag: 'ru' },
  { value: 'ja', label: '日本語', flag: 'jp' },
  { value: 'zh', label: '中文', flag: 'cn' },
  { value: 'ko', label: '한국어', flag: 'kr' }
];

const modeOptions = [
  {
    value: 'competitive',
    label: 'Competitive (scored)'
  },
  {
    value: 'collect-opinions',
    label: 'Collect opinions (no scores)'
  }
];

function markDirty() {
  emit('dirty');
}

function addTag() {
  const tag = newTag.value.trim().toLowerCase();
  if (tag && !props.quiz.tags.includes(tag) && props.quiz.tags.length < 10) {
    props.quiz.tags.push(tag);
    newTag.value = '';
    markDirty();
  }
}

function removeTag(tagToRemove) {
  props.quiz.tags = props.quiz.tags.filter(tag => tag !== tagToRemove);
  markDirty();
}

function handleTagKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTag();
  }
}
</script>

<template>
  <!-- Collapsed state - just the gear icon -->
  <aside
    v-if="!showSettings"
    class="shrink-0 border-l-[3px] border-black bg-white"
  >
    <button
      class="p-4 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
      :title="t('quizEditor.quizSettings')"
      @click="emit('update:showSettings', true)"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  </aside>

  <!-- Expanded state - full settings panel -->
  <aside
    v-else
    class="w-full lg:w-80 shrink-0 border-t-[3px] lg:border-t-0 lg:border-l-[3px] border-black bg-white flex flex-col overflow-y-auto"
  >
    <div class="p-4 border-b-[3px] border-border flex items-center justify-between">
      <span class="flex items-center gap-2 font-bold text-sm">
        <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {{ t('quizEditor.quizSettings') }}
      </span>
      <button
        class="p-1 text-muted-foreground hover:text-foreground transition-colors"
        @click="emit('update:showSettings', false)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <div class="p-4 space-y-5">
      <!-- Quiz Mode -->
      <div>
        <label class="text-xs font-medium text-muted-foreground mb-2 block">
          Quiz mode
        </label>
        <div class="inline-flex rounded-none border-2 border-border bg-muted/40">
          <button
            v-for="option in modeOptions"
            :key="option.value"
            type="button"
            class="px-3 py-1.5 text-xs font-medium border-r-2 border-border last:border-r-0 transition-colors"
            :class="quiz.mode === option.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-white hover:bg-muted/60 text-foreground'"
            @click="() => { if (quiz.mode !== option.value) { quiz.mode = option.value; markDirty(); } }"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="mt-1 text-[11px] text-muted-foreground">
          Use <strong>Collect opinions</strong> for survey-style sessions where players are not ranked by score.
        </p>
      </div>

      <!-- Description -->
      <div>
        <label class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('quizEditor.description') }}</label>
        <textarea
          v-model="quiz.description"
          :placeholder="t('quizEditor.addDescription')"
          class="w-full px-3 py-2 text-sm border-2 border-border bg-white focus:border-primary focus:outline-none resize-none"
          rows="4"
          @input="markDirty"
        ></textarea>
      </div>

      <!-- Category -->
      <div>
        <label class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('quizEditor.category') }}</label>
        <select
          v-model="quiz.category"
          class="w-full px-3 py-2 text-sm border-2 border-border bg-white focus:border-primary focus:outline-none cursor-pointer"
          @change="markDirty"
        >
          <option v-for="option in categoryOptions" :key="option.value" :value="option.value">
            {{ t(option.labelKey) }}
          </option>
        </select>
      </div>

      <!-- Language -->
      <div>
        <label class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('quizEditor.language') }}</label>
        <select
          v-model="quiz.language"
          class="w-full px-3 py-2 text-sm border-2 border-border bg-white focus:border-primary focus:outline-none cursor-pointer"
          @change="markDirty"
        >
          <option
            v-for="lang in languageOptions"
            :key="lang.value"
            :value="lang.value"
          >
            {{ lang.label }}
          </option>
        </select>
        <p class="mt-1 text-[11px] text-muted-foreground">
          {{ t('quizEditor.languageHint') }}
        </p>
      </div>

      <!-- Tags -->
      <div>
        <label class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('quizEditor.tags') }}</label>
        <div class="flex gap-2">
          <input
            v-model="newTag"
            type="text"
            :placeholder="t('quizEditor.addTag')"
            class="flex-1 px-3 py-2 text-sm border-2 border-border bg-white focus:border-primary focus:outline-none"
            :disabled="quiz.tags.length >= 10"
            @keydown="handleTagKeydown"
          />
          <button
            type="button"
            class="px-3 py-2 text-sm border-2 border-border bg-white hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!newTag.trim() || quiz.tags.length >= 10"
            @click="addTag"
          >
            {{ t('quizEditor.addTagButton') }}
          </button>
        </div>
        <!-- Tags display -->
        <div v-if="quiz.tags.length > 0" class="flex flex-wrap gap-2 mt-3">
          <span
            v-for="tag in quiz.tags"
            :key="tag"
            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 border border-primary/30 text-primary"
          >
            {{ tag }}
            <button
              type="button"
              class="hover:text-destructive transition-colors"
              @click="removeTag(tag)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        </div>
        <p v-if="quiz.tags.length >= 10" class="text-xs text-muted-foreground mt-2">
          {{ t('quizEditor.maxTags') }}
        </p>
      </div>

      <!-- Per-quiz defaults explanation -->
      <div class="pt-4 mt-2 border-t border-dashed border-border space-y-2">
        <h4 class="text-xs font-bold text-muted-foreground uppercase tracking-wide">
          {{ t('quizEditor.quizDefaultsTitle') }}
        </h4>
        <p class="text-xs text-muted-foreground">
          {{
            t('quizEditor.quizDefaultsDescription1', {
              timeLimit: 30,
              points: 1000
            })
          }}
        </p>
        <p class="text-[11px] text-muted-foreground">
          {{ t('quizEditor.quizDefaultsDescription2') }}
        </p>
      </div>

      <!-- Advanced / Opinion settings -->
      <div class="mt-4 border border-dashed border-border/70 p-3 space-y-2 bg-muted/20">
        <button
          type="button"
          class="w-full flex items-center justify-between text-left"
          @click="advancedSettingsExpanded = !advancedSettingsExpanded"
        >
          <div class="flex flex-col">
            <span class="text-xs font-semibold uppercase tracking-wide">
              ADVANCED SETTINGS
            </span>
            <span class="text-[11px] text-muted-foreground">
              Opinion settings & privacy (most quizzes don’t need changes)
            </span>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="flex-shrink-0 transition-transform"
            :class="{ 'rotate-180': advancedSettingsExpanded }"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div v-show="advancedSettingsExpanded" class="mt-3 space-y-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">
            Opinion settings
          </label>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input
              v-model="quiz.isAnonymous"
              type="checkbox"
              class="w-4 h-4 border-2 border-border accent-primary"
              @change="markDirty"
            />
            <span>Hide player names in analytics</span>
          </label>
          <label class="flex items-center gap-2 text-xs cursor-pointer">
            <input
              v-model="quiz.showLiveResultsToPlayers"
              type="checkbox"
              class="w-4 h-4 border-2 border-border accent-primary"
              @change="markDirty"
            />
            <span>Show aggregated results on player devices</span>
          </label>
        </div>
      </div>
    </div>
  </aside>
</template>

