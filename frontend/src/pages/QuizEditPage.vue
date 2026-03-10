<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';
import { QUESTION_TYPES } from '../lib/questionTypes.js';
import { validateAllQuestions } from '../lib/validateQuestion.js';
import { TIMING } from '../constants/index.js';

import PixelButton from '../components/PixelButton.vue';
import PixelBadge from '../components/PixelBadge.vue';
import QuestionTypeSelector from '../components/QuestionTypeSelector.vue';
import QuestionEditor from '../components/QuestionEditor.vue';

const { t } = useI18n();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

// State
const quiz = ref({
  _id: null,
  title: '',
  description: '',
  category: '',
  language: 'en',
  tags: [],
  isPublished: false
});
const newTag = ref('');
const questions = ref([]);
const selectedQuestionId = ref(null);
const showTypeSelector = ref(false);
const showSettings = ref(true); // Right sidebar settings panel
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const saveStatus = ref(''); // 'saved', 'saving', 'error'

// Animated saving dots
const saveDots = ref(0);
let saveDotsInterval = null;

function startSaveDots() {
  saveDots.value = 1;
  saveDotsInterval = setInterval(() => {
    saveDots.value = (saveDots.value % 3) + 1;
  }, 400);
}

function stopSaveDots() {
  clearInterval(saveDotsInterval);
  saveDotsInterval = null;
  saveDots.value = 0;
}

const saveButtonText = computed(() => {
  if (saving.value) {
    return t('quizEditor.saveQuiz') + '.'.repeat(saveDots.value);
  }
  return t('quizEditor.saveQuiz');
});

// Track changes for "unsaved" indicator
const hasUnsavedChanges = ref(false);
const deletedQuestionIds = ref([]); // Track questions to delete on save
const fieldValidationErrors = ref({}); // { [questionId]: string }

// Drag-and-drop reordering
const dragIndex = ref(null);
const dropTargetIndex = ref(null);

function syncQuestionOrders() {
  questions.value = questions.value.map((question, index) => ({
    ...question,
    order: index
  }));
}

function onDragStart(index, event) {
  dragIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
}

function onDragOver(index, event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  dropTargetIndex.value = index;
}

function onDragLeave() {
  dropTargetIndex.value = null;
}

function onDrop(index) {
  const from = dragIndex.value;
  if (from !== null && from !== index) {
    const moved = questions.value.splice(from, 1)[0];
    questions.value.splice(index, 0, moved);
    syncQuestionOrders();
    hasUnsavedChanges.value = true;
  }
  dragIndex.value = null;
  dropTargetIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
  dropTargetIndex.value = null;
}

// Computed
const isNewQuiz = computed(() => route.params.id === 'new');
const questionCount = computed(() => questions.value.length);
const selectedQuestion = computed(() =>
  questions.value.find(q => q._id === selectedQuestionId.value)
);

// Question type icons and info - use shared definitions
const questionTypeInfo = QUESTION_TYPES;

// Category options
const categoryOptions = [
  { value: '', labelKey: 'quizEditor.selectCategory' },
  { value: 'General', labelKey: 'quizEditor.categoryGeneral' },
  { value: 'Science', labelKey: 'quizEditor.categoryScience' },
  { value: 'History', labelKey: 'quizEditor.categoryHistory' },
  { value: 'Geography', labelKey: 'quizEditor.categoryGeography' },
  { value: 'Art', labelKey: 'quizEditor.categoryArt' },
  { value: 'Music', labelKey: 'quizEditor.categoryMusic' },
  { value: 'Sports', labelKey: 'quizEditor.categorySports' },
  { value: 'Technology', labelKey: 'quizEditor.categoryTechnology' },
  { value: 'Literature', labelKey: 'quizEditor.categoryLiterature' },
  { value: 'Movies', labelKey: 'quizEditor.categoryMovies' },
  { value: 'TV Shows', labelKey: 'quizEditor.categoryTVShows' },
  { value: 'Food', labelKey: 'quizEditor.categoryFood' },
  { value: 'Nature', labelKey: 'quizEditor.categoryNature' },
  { value: 'Math', labelKey: 'quizEditor.categoryMath' },
  { value: 'Language', labelKey: 'quizEditor.categoryLanguage' },
  { value: 'Other', labelKey: 'quizEditor.categoryOther' }
];

// Language options with flag-icons country codes
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

// Tag management functions
function addTag() {
  const tag = newTag.value.trim().toLowerCase();
  if (tag && !quiz.value.tags.includes(tag) && quiz.value.tags.length < 10) {
    quiz.value.tags.push(tag);
    newTag.value = '';
    hasUnsavedChanges.value = true;
  }
}

function removeTag(tagToRemove) {
  quiz.value.tags = quiz.value.tags.filter(tag => tag !== tagToRemove);
  hasUnsavedChanges.value = true;
}

function handleTagKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addTag();
  }
}

// Helper to check if ID is temporary (local-only)
function isTemporaryId(id) {
  return id && id.startsWith('temp_');
}

// Generate temporary ID for new questions
function generateTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// API helpers
async function apiFetch(url, options = {}) {
  const res = await fetch(apiUrl(url), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
      ...options.headers
    }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Fetch quiz data
async function fetchQuiz() {
  if (isNewQuiz.value) {
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const data = await apiFetch(`/api/quizzes/${route.params.id}`);
    const loadedQuiz = data.data.quiz;
    // Ensure tags and language have default values for older quizzes
    quiz.value = {
      ...loadedQuiz,
      tags: loadedQuiz.tags || [],
      language: loadedQuiz.language || 'en'
    };
    questions.value = quiz.value.questions || [];
    syncQuestionOrders();

    // Select first question if available
    if (questions.value.length > 0) {
      selectedQuestionId.value = questions.value[0]._id;
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

// Add question locally (no API call)
function addQuestion(type) {
  const defaultData = getDefaultQuestionData(type);
  const tempId = generateTempId();

  const newQuestion = {
    ...defaultData,
    _id: tempId,
    order: questions.value.length
  };

  questions.value.push(newQuestion);
  syncQuestionOrders();
  selectedQuestionId.value = tempId;
  showTypeSelector.value = false;
  hasUnsavedChanges.value = true;
}

// Get default question data based on type
function getDefaultQuestionData(type) {
  const base = {
    type,
    text: '',
    timeLimit: 30,
    points: 1000
  };

  switch (type) {
    case 'multiple-choice':
      return {
        ...base,
        answers: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false }
        ]
      };
    case 'true-false':
      return {
        ...base,
        answers: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false }
        ]
      };
    case 'type-answer':
      return {
        ...base,
        timeLimit: 30,
        answers: [{ text: '' }]
      };
    case 'sort':
      return {
        ...base,
        timeLimit: 30,
        answers: [
          { text: '', order: 0 },
          { text: '', order: 1 },
          { text: '', order: 2 }
        ]
      };
    case 'slider':
      return {
        ...base,
        timeLimit: 20,
        sliderConfig: {
          min: 0,
          max: 100,
          correctValue: 50,
          margin: 'medium'
        }
      };
    case 'quiz-audio':
      return {
        ...base,
        audioLanguage: 'en',
        answers: [
          { text: 'Answer 1', isCorrect: true },
          { text: 'Answer 2', isCorrect: false }
        ]
      };
    case 'pin-answer':
      return {
        ...base,
        timeLimit: 30,
        mediaUrl: '',
        pinConfig: { x: 50, y: 50, radius: 10 }
      };
    // Opinion types (no points)
    case 'poll':
      return {
        ...base,
        points: 0,
        answers: [
          { text: 'Option 1' },
          { text: 'Option 2' }
        ]
      };
    case 'word-cloud':
      return { ...base, points: 0, timeLimit: 30 };
    case 'brainstorm':
      return {
        ...base,
        points: 0,
        timeLimit: 60,
        brainstormConfig: { maxIdeas: 3, votingTime: 30 }
      };
    case 'drop-pin':
      return {
        ...base,
        points: 0,
        timeLimit: 30,
        mediaUrl: '/placeholder-image.jpg'
      };
    case 'open-ended':
      return { ...base, points: 0, timeLimit: 60 };
    case 'scale':
      return {
        ...base,
        points: 0,
        scaleConfig: { scaleType: 'likert', min: 1, max: 5, startLabel: 'Disagree', endLabel: 'Agree' }
      };
    case 'nps-scale':
      return {
        ...base,
        points: 0,
        scaleConfig: { scaleType: 'nps', min: 0, max: 10, startLabel: 'Not likely', endLabel: 'Very likely' }
      };
    default:
      return base;
  }
}

// Update question locally (no API call)
function updateQuestion(questionData) {
  const index = questions.value.findIndex(q => q._id === questionData._id);
  if (index !== -1) {
    questions.value[index] = { ...questionData };
    hasUnsavedChanges.value = true;
  }
}

// Delete question locally (no API call)
function deleteQuestion(questionId) {
  if (!confirm(t('quizEditor.deleteConfirm'))) return;

  // If it's a real question (not temp), track for deletion on save
  if (!isTemporaryId(questionId)) {
    deletedQuestionIds.value.push(questionId);
  }

  questions.value = questions.value.filter(q => q._id !== questionId);
  syncQuestionOrders();

  // Select another question if the deleted one was selected
  if (selectedQuestionId.value === questionId) {
    selectedQuestionId.value = questions.value[0]?._id || null;
  }

  hasUnsavedChanges.value = true;
}

// Duplicate question locally
function duplicateQuestion(questionId) {
  const original = questions.value.find(q => q._id === questionId);
  if (!original) return;

  const { _id, createdAt, updatedAt, order, ...questionData } = original;
  const tempId = generateTempId();

  const duplicated = {
    ...questionData,
    _id: tempId,
    order: questions.value.length
  };

  questions.value.push(duplicated);
  syncQuestionOrders();
  selectedQuestionId.value = tempId;
  hasUnsavedChanges.value = true;
}

// Save everything to the server
async function saveAll() {
  saving.value = true;
  saveStatus.value = 'saving';
  startSaveDots();
  error.value = '';

  // Client-side validation
  const validation = validateAllQuestions(questions.value, t);
  if (!validation.valid) {
    const firstError = validation.errors[0];
    selectedQuestionId.value = firstError.questionId;
      const label = t('questionValidation.questionNum', { num: firstError.index + 1 });
      error.value = `${label}: ${firstError.errors[0]}`;

      // Surface inline validation hints per question for better UX.
      const map = {};
      for (const item of validation.errors) {
        if (item.errors && item.errors.length > 0 && item.questionId) {
          map[item.questionId] = item.errors[0];
        }
      }
      fieldValidationErrors.value = map;
    saveStatus.value = 'error';
    saving.value = false;
    return;
  }

    // Clear any previous field-level errors once everything validates.
    fieldValidationErrors.value = {};

  try {
    // Step 1: Create quiz if it doesn't exist
    if (!quiz.value._id) {
      const data = await apiFetch('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          title: quiz.value.title || 'Untitled Quiz',
          description: quiz.value.description,
          category: quiz.value.category,
          language: quiz.value.language,
          tags: quiz.value.tags
        })
      });
      // Sync local quiz state with server response (includes generated title)
      quiz.value = data.data.quiz;
      // Update URL without full navigation
      router.replace(`/quiz/${quiz.value._id}/edit`);
    } else {
      // Update quiz metadata
      const updatePayload = {
        description: quiz.value.description,
        category: quiz.value.category,
        language: quiz.value.language,
        tags: quiz.value.tags
      };

      // Only send title if it's non-empty to avoid validation errors
      if (quiz.value.title && quiz.value.title.trim()) {
        updatePayload.title = quiz.value.title.trim();
      }

      await apiFetch(`/api/quizzes/${quiz.value._id}`, {
        method: 'PUT',
        body: JSON.stringify(updatePayload)
      });
    }

    // Step 2: Delete removed questions
    for (const questionId of deletedQuestionIds.value) {
      try {
        await apiFetch(`/api/questions/${questionId}`, {
          method: 'DELETE'
        });
      } catch {
        // Question may already be deleted, continue with other operations
      }
    }
    deletedQuestionIds.value = [];

    // Step 3: Create new questions and update existing ones
    const updatedQuestions = [];
    for (const question of questions.value) {
      const { _id, createdAt, updatedAt, ...questionData } = question;

      if (isTemporaryId(_id)) {
        // Create new question
        const data = await apiFetch(`/api/quizzes/${quiz.value._id}/questions`, {
          method: 'POST',
          body: JSON.stringify(questionData)
        });
        updatedQuestions.push(data.data.question);
      } else {
        // Update existing question
        const data = await apiFetch(`/api/questions/${_id}`, {
          method: 'PUT',
          body: JSON.stringify(questionData)
        });
        updatedQuestions.push(data.data.question);
      }
    }

    // Preserve current question selection (stay on same question after save)
    const selectedIndex = questions.value.findIndex(q => q._id === selectedQuestionId.value);

    // Persist the sidebar order after creates/updates so reloads keep the dragged order.
    if (updatedQuestions.length > 0) {
      const reorderData = await apiFetch(`/api/quizzes/${quiz.value._id}/questions/reorder`, {
        method: 'PUT',
        body: JSON.stringify({
          questionIds: updatedQuestions.map(question => question._id)
        })
      });
      questions.value = reorderData.data.questions;
    } else {
      questions.value = updatedQuestions;
    }

    syncQuestionOrders();

    if (selectedIndex >= 0 && selectedIndex < updatedQuestions.length) {
      selectedQuestionId.value = questions.value[selectedIndex]._id;
    } else if (questions.value.length > 0) {
      // Selected question was deleted or not found; stay near same position or first
      const fallbackIndex = selectedIndex >= 0 ? Math.min(selectedIndex, questions.value.length - 1) : 0;
      selectedQuestionId.value = questions.value[fallbackIndex]._id;
    }

    hasUnsavedChanges.value = false;
    saveStatus.value = 'saved';
    setTimeout(() => {
      if (saveStatus.value === 'saved') saveStatus.value = '';
    }, TIMING.SAVE_STATUS_RESET);
  } catch (err) {
    error.value = err.message;
    saveStatus.value = 'error';
  } finally {
    saving.value = false;
    stopSaveDots();
  }
}

// Get question preview text
function getQuestionPreview(question) {
  if (question.text) {
    return question.text.length > 40
      ? question.text.substring(0, 40) + '...'
      : question.text;
  }
  return t('quizEditor.noQuestionText');
}

// Navigate back (with unsaved changes warning)
function goBack() {
  if (hasUnsavedChanges.value) {
    if (!confirm(t('quizEditor.leaveConfirm'))) {
      return;
    }
  }
  router.push('/dashboard');
}

// Open moderator preview page, then allow "practice as player" from there
async function openPlayerPreview() {
  // Ensure quiz exists on the server so preview has an ID to work with
  if (!quiz.value._id) {
    await saveAll();
    if (!quiz.value._id) {
      // Save failed; error toast will already be shown
      return;
    }
  }
  router.push(`/quiz/${quiz.value._id}/preview`);
}

// Initialize
onMounted(() => {
  fetchQuiz();
});

onUnmounted(() => {
  stopSaveDots();
});
</script>

<template>
  <div class="safari-overflow-fix">
    <div class="min-h-screen bg-background flex flex-col">
      <!-- Header -->
      <header class="border-b-[3px] border-black bg-white sticky top-0 z-50">
        <div class="px-4 sm:px-6 lg:px-8 flex items-center gap-3 h-16 overflow-hidden">
          <!-- Back button -->
          <button
            @click="goBack"
            class="text-muted-foreground hover:text-primary transition p-2 shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>

          <!-- Title input - takes available space -->
          <input
            v-model="quiz.title"
            type="text"
            :placeholder="t('quizEditor.untitledQuiz')"
            class="flex-1 min-w-0 text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0"
            @input="hasUnsavedChanges = true"
          />

          <!-- Right side controls -->
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="hasUnsavedChanges && !saving" class="text-xs text-warning font-medium hidden sm:inline whitespace-nowrap">
              {{ t('quizEditor.unsavedChanges') }}
            </span>

            <span v-if="saveStatus === 'saved'" class="text-sm text-success hidden sm:inline whitespace-nowrap">{{ t('quizEditor.saved') }}</span>
            <span v-else-if="saveStatus === 'error'" class="text-sm text-destructive hidden sm:inline whitespace-nowrap">{{ t('quizEditor.saveFailed') }}</span>

            <PixelBadge variant="secondary" class="whitespace-nowrap">
              {{ questionCount }} {{ questionCount === 1 ? t('quizEditor.question') : t('quizEditor.questions') }}
            </PixelBadge>

            <PixelButton
              variant="outline"
              size="sm"
              class="hidden sm:inline-flex"
              :disabled="saving"
              @click="openPlayerPreview"
            >
              Preview as player
            </PixelButton>

            <PixelButton
              variant="primary"
              size="sm"
              :disabled="saving"
              @click="saveAll"
            >
              {{ saveButtonText }}
            </PixelButton>
          </div>
        </div>
      </header>

    <!-- Loading State -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <p class="text-muted-foreground text-lg">{{ t('quizEditor.loadingQuiz') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error && !quiz._id && !isNewQuiz" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <p class="text-destructive text-lg mb-4">{{ error }}</p>
        <PixelButton variant="outline" @click="fetchQuiz">{{ t('quizEditor.retry') }}</PixelButton>
      </div>
    </div>

    <!-- Main Editor -->
    <div v-else class="flex-1 flex overflow-hidden min-w-0">
      <!-- Sidebar: Question List -->
      <aside class="w-64 shrink-0 border-r-[3px] border-black bg-white flex flex-col">
        <div class="p-4 border-b-[3px] border-border">
          <PixelButton
            variant="primary"
            size="sm"
            class="w-full"
            @click="showTypeSelector = true"
          >
            <svg class="inline mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ t('quizEditor.addQuestion') }}
          </PixelButton>
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
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver(index, $event)"
            @dragleave="onDragLeave"
            @drop="onDrop(index)"
            @dragend="onDragEnd"
          >
            <div
              class="w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors"
              :class="{
                'bg-primary/10 border-l-4 border-l-primary': selectedQuestionId === question._id,
                'border-l-4 border-l-warning': isTemporaryId(question._id) && selectedQuestionId !== question._id,
                'opacity-50': dragIndex === index,
                'border-t-2 border-t-primary': dropTargetIndex === index && dragIndex !== index
              }"
              @click="selectedQuestionId = question._id"
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
                    <PixelBadge
                      :variant="questionTypeInfo[question.type]?.color || 'primary'"
                      class="text-[10px]"
                    >
                      {{ questionTypeInfo[question.type]?.label || question.type }}
                    </PixelBadge>
                    <span v-if="isTemporaryId(question._id)" class="text-[10px] text-warning">{{ t('quizEditor.new') }}</span>
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
                  @click.stop="duplicateQuestion(question._id)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button
                  class="p-1 text-muted-foreground hover:text-destructive"
                  :title="t('common.delete')"
                  @click.stop="deleteQuestion(question._id)"
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

      <!-- Main Content: Question Editor -->
      <main class="flex-1 overflow-y-auto bg-muted/30 min-w-0">
        <div v-if="!selectedQuestion" class="h-full flex items-center justify-center">
          <div class="text-center max-w-md">
            <div class="w-24 h-24 mx-auto mb-6 bg-primary/10 border-2 border-primary flex items-center justify-center">
              <svg class="text-primary" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-2">{{ t('quizEditor.noQuestionSelected') }}</h3>
            <p class="text-muted-foreground mb-6">
              {{ t('quizEditor.selectQuestionHint') }}
            </p>
            <PixelButton variant="primary" @click="showTypeSelector = true">
              <svg class="inline mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {{ t('quizEditor.addFirstQuestion') }}
            </PixelButton>
          </div>
        </div>

        <QuestionEditor
          v-else
          :key="selectedQuestionId"
          :question="selectedQuestion"
          :question-type-info="questionTypeInfo"
          :validation-error="fieldValidationErrors[selectedQuestionId]"
          @update="updateQuestion"
          @delete="deleteQuestion"
        />
      </main>

      <!-- Right Sidebar: Quiz Settings -->
      <!-- Collapsed state - just the gear icon -->
      <aside
        v-if="!showSettings"
        class="shrink-0 border-l-[3px] border-black bg-white"
      >
        <button
          class="p-4 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          :title="t('quizEditor.quizSettings')"
          @click="showSettings = true"
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
        class="w-80 shrink-0 border-l-[3px] border-black bg-white flex flex-col overflow-y-auto"
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
            @click="showSettings = false"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div class="p-4 space-y-5">
          <!-- Description -->
          <div>
            <label class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('quizEditor.description') }}</label>
            <textarea
              v-model="quiz.description"
              :placeholder="t('quizEditor.addDescription')"
              class="w-full px-3 py-2 text-sm border-2 border-border bg-white focus:border-primary focus:outline-none resize-none"
              rows="4"
              @input="hasUnsavedChanges = true"
            ></textarea>
          </div>

          <!-- Category -->
          <div>
            <label class="text-xs font-medium text-muted-foreground mb-2 block">{{ t('quizEditor.category') }}</label>
            <select
              v-model="quiz.category"
              class="w-full px-3 py-2 text-sm border-2 border-border bg-white focus:border-primary focus:outline-none cursor-pointer"
              @change="hasUnsavedChanges = true"
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
              @change="hasUnsavedChanges = true"
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
              This language applies to the quiz title, questions, and what players see when they join.
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
              Quiz defaults
            </h4>
            <p class="text-xs text-muted-foreground">
              New questions start with a <span class="font-semibold">30s time limit</span> and <span class="font-semibold">1000 points</span>.
              You can override time and points for individual questions in their settings.
            </p>
            <p class="text-[11px] text-muted-foreground">
              Shorter time limits make questions feel more intense. Higher points make a question more important for the final leaderboard.
            </p>
          </div>
        </div>
      </aside>
    </div>

    <!-- Question Type Selector Modal -->
    <QuestionTypeSelector
      v-if="showTypeSelector"
      @select="addQuestion"
      @close="showTypeSelector = false"
    />

    <!-- Error Toast -->
    <div
      v-if="error"
      class="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-3 border-2 border-black pixel-shadow"
    >
      <div class="flex items-center gap-3">
        <span>{{ error }}</span>
        <button @click="error = ''" class="hover:opacity-80">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
    </div>
  </div>
</template>

<style scoped>
/* Safari overflow fix: wrapper clips pixel-shadow overflow without breaking flex layout */
.safari-overflow-fix {
  width: 100vw;
  max-width: 100%;
  overflow-x: hidden;
}
</style>
