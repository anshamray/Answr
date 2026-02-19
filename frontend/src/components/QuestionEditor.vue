<script setup>
import { ref, computed, watch } from 'vue';
import { apiUrl } from '../lib/api.js';
import MultipleChoiceEditor from './editors/MultipleChoiceEditor.vue';
import TrueFalseEditor from './editors/TrueFalseEditor.vue';
import TypeAnswerEditor from './editors/TypeAnswerEditor.vue';
import SortEditor from './editors/SortEditor.vue';
import SliderEditor from './editors/SliderEditor.vue';
import QuizAudioEditor from './editors/QuizAudioEditor.vue';
import PinAnswerEditor from './editors/PinAnswerEditor.vue';

const props = defineProps({
  question: {
    type: Object,
    required: true
  },
  questionTypeInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update', 'delete', 'error']);

// Local copy of question for editing
const localQuestion = ref({ ...props.question });

// Error state for file validation
const fileError = ref('');

// File input ref
const fileInputRef = ref(null);

// Media section collapsed by default (optional, not often used)
const mediaExpanded = ref(false);

// Time limit options
const timeLimitOptions = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];

// Points options
const pointsOptions = [0, 1000, 2000];

// Scored types that can have points
const scoredTypes = [
  'multiple-choice', 'true-false', 'type-answer',
  'sort', 'quiz-audio', 'slider', 'pin-answer'
];

// Computed
const typeInfo = computed(() =>
  props.questionTypeInfo[localQuestion.value.type] || { label: 'Unknown', color: 'primary' }
);

const isScored = computed(() => scoredTypes.includes(localQuestion.value.type));

const canHaveMultipleAnswers = computed(() =>
  localQuestion.value.type === 'multiple-choice'
);

// Watch for external changes to the question prop
watch(() => props.question, (newVal) => {
  localQuestion.value = { ...newVal };
}, { deep: true });

// Emit update to parent (local state only, no debounce needed)
function emitUpdate() {
  emit('update', { ...localQuestion.value });
}

// Update answers
function updateAnswers(answers) {
  localQuestion.value.answers = answers;
  emitUpdate();
}

// Update slider config
function updateSliderConfig(config) {
  localQuestion.value.sliderConfig = config;
  emitUpdate();
}

// Update pin config
function updatePinConfig(config) {
  localQuestion.value.pinConfig = config;
  emitUpdate();
}

// Handle media URL change
function updateMediaUrl(url) {
  localQuestion.value.mediaUrl = url;
  emitUpdate();
}

// Trigger file input click
function triggerFileInput() {
  fileInputRef.value?.click();
}

// Handle file selection
function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  fileError.value = '';

  // Validate file type
  if (!file.type.startsWith('image/')) {
    fileError.value = 'Please select an image file';
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    fileError.value = 'Image must be smaller than 5MB';
    return;
  }

  // Convert to data URL for preview (will be uploaded on save)
  const reader = new FileReader();
  reader.onload = (e) => {
    updateMediaUrl(e.target.result);
  };
  reader.readAsDataURL(file);
}

// Get icon for question type
function getIcon(iconName) {
  const icons = {
    grid: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>`,
    check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>`,
    type: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
    </svg>`,
    sort: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="16" width="16" height="4" rx="1" />
      <rect x="6" y="11" width="12" height="4" rx="1" />
      <rect x="8" y="6" width="8" height="4" rx="1" />
      <rect x="10" y="1" width="4" height="4" rx="1" />
    </svg>`,
    sliders: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    </svg>`,
    volume: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>`,
    'map-pin': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>`
  };
  return icons[iconName] || icons.grid;
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <!-- Question Type Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 flex items-center justify-center bg-primary/10 border-2 border-primary"
          v-html="getIcon(typeInfo.icon)"
        ></div>
        <div>
          <h2 class="text-xl font-bold">{{ typeInfo.label }}</h2>
          <p class="text-sm text-muted-foreground">
            {{ isScored ? 'Players earn points for correct answers' : 'Opinion question (no points)' }}
          </p>
        </div>
      </div>

      <button
        @click="$emit('delete', question._id)"
        class="p-2 text-muted-foreground hover:text-destructive transition"
        title="Delete question"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>

    <div class="space-y-6">
      <!-- Question Text -->
      <div class="bg-white border-[3px] border-black pixel-shadow p-6">
        <label class="block text-sm font-medium mb-2">Question Text</label>
        <textarea
          v-model="localQuestion.text"
          placeholder="Enter your question here..."
          class="w-full px-4 py-3 border-2 border-border bg-white text-lg focus:border-primary focus:outline-none resize-none"
          rows="3"
          maxlength="120"
          @input="emitUpdate"
        ></textarea>
        <div class="flex justify-between mt-2">
          <span class="text-xs text-muted-foreground">Maximum 120 characters</span>
          <span class="text-xs text-muted-foreground">{{ localQuestion.text?.length || 0 }}/120</span>
        </div>
      </div>

      <!-- Media Upload (collapsible) -->
      <div class="bg-white border-[3px] border-black pixel-shadow">
        <button
          type="button"
          class="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
          @click="mediaExpanded = !mediaExpanded"
        >
          <span class="text-sm font-medium">
            Media (optional)
            <span v-if="localQuestion.mediaUrl" class="text-muted-foreground font-normal">— 1 image</span>
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="flex-shrink-0 transition-transform"
            :class="{ 'rotate-180': mediaExpanded }"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div v-show="mediaExpanded" class="p-6 pt-0">
          <!-- Hidden file input -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />
          <div class="border-2 border-dashed border-border p-8 text-center hover:border-primary transition-colors">
            <div v-if="localQuestion.mediaUrl" class="relative">
              <img
                :src="apiUrl(localQuestion.mediaUrl)"
                alt="Question media"
                class="max-h-48 mx-auto object-contain"
              />
              <button
                @click="updateMediaUrl('')"
                class="absolute top-2 right-2 p-1 bg-destructive text-white hover:bg-destructive/80"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div v-else class="cursor-pointer" @click="triggerFileInput">
              <svg class="mx-auto mb-3 text-muted-foreground" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              <p class="text-sm text-muted-foreground mb-2">Drag and drop an image, or click to browse</p>
              <p v-if="fileError" class="text-sm text-destructive mb-2">{{ fileError }}</p>
              <input
                type="text"
                placeholder="Or paste an image URL"
                class="w-full max-w-sm mx-auto px-3 py-2 border-2 border-border text-sm focus:border-primary focus:outline-none"
                @click.stop
                @blur="updateMediaUrl($event.target.value)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Type-Specific Editor -->
      <div class="bg-white border-[3px] border-black pixel-shadow p-6">
        <label class="block text-sm font-medium mb-4">Answers</label>

        <!-- Allow Multiple Answers (multiple-choice only) -->
        <div v-if="canHaveMultipleAnswers" class="mb-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="localQuestion.allowMultipleAnswers"
              class="w-5 h-5 border-2 border-border accent-primary"
              @change="emitUpdate"
            />
            <span class="text-sm">Allow multiple answers</span>
          </label>
        </div>

        <MultipleChoiceEditor
          v-if="localQuestion.type === 'multiple-choice'"
          :answers="localQuestion.answers"
          :allow-multiple="localQuestion.allowMultipleAnswers"
          @update:answers="updateAnswers"
        />

        <TrueFalseEditor
          v-else-if="localQuestion.type === 'true-false'"
          :answers="localQuestion.answers"
          @update:answers="updateAnswers"
        />

        <TypeAnswerEditor
          v-else-if="localQuestion.type === 'type-answer'"
          :answers="localQuestion.answers"
          @update:answers="updateAnswers"
        />

        <SortEditor
          v-else-if="localQuestion.type === 'sort'"
          :answers="localQuestion.answers"
          @update:answers="updateAnswers"
        />

        <SliderEditor
          v-else-if="localQuestion.type === 'slider'"
          :config="localQuestion.sliderConfig"
          @update:config="updateSliderConfig"
        />

        <QuizAudioEditor
          v-else-if="localQuestion.type === 'quiz-audio'"
          :answers="localQuestion.answers"
          :language="localQuestion.audioLanguage"
          :text-to-read="localQuestion.textToReadAloud"
          @update:answers="updateAnswers"
          @update:language="(lang) => { localQuestion.audioLanguage = lang; emitUpdate(); }"
          @update:text-to-read="(text) => { localQuestion.textToReadAloud = text; emitUpdate(); }"
        />

        <PinAnswerEditor
          v-else-if="localQuestion.type === 'pin-answer'"
          :media-url="localQuestion.mediaUrl"
          :pin-config="localQuestion.pinConfig"
          @update:media-url="updateMediaUrl"
          @update:pin-config="updatePinConfig"
        />

        <div v-else class="text-center py-8 text-muted-foreground">
          <p>Editor for this question type is coming soon.</p>
        </div>
      </div>

      <!-- Question Settings -->
      <div class="bg-white border-[3px] border-black pixel-shadow p-6">
        <label class="block text-sm font-medium mb-4">Settings</label>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Time Limit -->
          <div>
            <label class="block text-xs text-muted-foreground mb-1">Time Limit</label>
            <select
              v-model.number="localQuestion.timeLimit"
              class="w-full px-3 py-2 border-2 border-border bg-white focus:border-primary focus:outline-none"
              @change="emitUpdate"
            >
              <option v-for="time in timeLimitOptions" :key="time" :value="time">
                {{ time >= 60 ? `${time / 60} min` : `${time} sec` }}
              </option>
            </select>
          </div>

          <!-- Points -->
          <div v-if="isScored">
            <label class="block text-xs text-muted-foreground mb-1">Points</label>
            <select
              v-model.number="localQuestion.points"
              class="w-full px-3 py-2 border-2 border-border bg-white focus:border-primary focus:outline-none"
              @change="emitUpdate"
            >
              <option v-for="pts in pointsOptions" :key="pts" :value="pts">
                {{ pts === 0 ? 'No points' : `${pts} points` }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
