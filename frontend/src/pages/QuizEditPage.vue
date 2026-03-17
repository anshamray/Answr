<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore.js';
import { apiUrl } from '../lib/api.js';
import { QUESTION_TYPES } from '../lib/questionTypes.js';
import { validateAllQuestions } from '../lib/validateQuestion.js';
import { TIMING } from '../constants/index.js';
import { CATEGORY_OPTIONS } from '../lib/constants/categories.js';

import PixelButton from '../components/PixelButton.vue';
import PixelBadge from '../components/PixelBadge.vue';
import QuestionTypeSelector from '../components/QuestionTypeSelector.vue';
import QuestionEditor from '../components/QuestionEditor.vue';
import QuestionListSidebar from '../components/QuestionListSidebar.vue';
import QuizSettingsSidebar from '../components/QuizSettingsSidebar.vue';

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
  isPublished: false,
  mode: 'competitive', // 'competitive' | 'collect-opinions'
  isAnonymous: false,
  showLiveResultsToPlayers: true
});
const questions = ref([]);
const selectedQuestionId = ref(null);
const showTypeSelector = ref(false);
const showSettings = ref(true); // Right sidebar settings panel
const advancedSettingsExpanded = ref(false); // Foldable "Advanced settings" group
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
// Snapshot of questions as last saved on the server, used to detect changes
const originalQuestionsSnapshot = ref([]);

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

// Helper to check if ID is temporary (local-only)
function isTemporaryId(id) {
  return id && id.startsWith('temp_');
}

// Generate temporary ID for new questions
function generateTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: normalize question objects for deep equality comparison,
// ignoring server-managed metadata like _id, quizId, timestamps, etc.
function normalizeQuestionForDiff(question) {
  if (!question) return null;
  const {
    _id,
    quizId,
    createdAt,
    updatedAt,
    __v,
    ...rest
  } = question;
  // Deep clone to avoid reactive refs affecting comparisons
  return JSON.parse(JSON.stringify(rest));
}

function areQuestionsEqual(a, b) {
  const normA = normalizeQuestionForDiff(a);
  const normB = normalizeQuestionForDiff(b);
  if (normA === null || normB === null) return false;
  return JSON.stringify(normA) === JSON.stringify(normB);
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
      language: loadedQuiz.language || 'en',
      mode: loadedQuiz.mode || 'competitive',
      isAnonymous: loadedQuiz.isAnonymous ?? false,
      showLiveResultsToPlayers: loadedQuiz.showLiveResultsToPlayers ?? true
    };
    questions.value = quiz.value.questions || [];
    // Take a deep snapshot of the questions as they exist on the server.
    originalQuestionsSnapshot.value = JSON.parse(JSON.stringify(questions.value));
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
        revealMediaUrl: '',
        allowMultipleCorrectAnswers: false,
        answers: [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false }
        ]
      };
    case 'true-false':
      return {
        ...base,
        revealMediaUrl: '',
        answers: [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false }
        ]
      };
    case 'type-answer':
      return {
        ...base,
        timeLimit: 30,
        revealMediaUrl: '',
        answers: [{ text: '' }]
      };
    case 'sort':
      return {
        ...base,
        timeLimit: 30,
        revealMediaUrl: '',
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
        revealMediaUrl: '',
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
        revealMediaUrl: '',
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
        revealMediaUrl: '',
        pinConfig: { x: 50, y: 50, radius: 10 }
      };
    // Opinion types (no points)
    case 'poll':
      return {
        ...base,
        points: 0,
        revealMediaUrl: '',
        answers: [
          { text: '' },
          { text: '' }
        ]
      };
    case 'word-cloud':
      return { ...base, points: 0, timeLimit: 30, revealMediaUrl: '' };
    case 'brainstorm':
      return {
        ...base,
        points: 0,
        timeLimit: 60,
        revealMediaUrl: '',
        brainstormConfig: { maxIdeas: 3, votingTime: 30 }
      };
    case 'drop-pin':
      return {
        ...base,
        points: 0,
        timeLimit: 30,
        mediaUrl: '/placeholder-image.jpg',
        revealMediaUrl: ''
      };
    case 'open-ended':
      return { ...base, points: 0, timeLimit: 60, revealMediaUrl: '' };
    case 'scale':
      return {
        ...base,
        points: 0,
        revealMediaUrl: '',
        scaleConfig: { scaleType: 'likert', min: 1, max: 5, startLabel: 'Disagree', endLabel: 'Agree' }
      };
    case 'nps-scale':
      return {
        ...base,
        points: 0,
        revealMediaUrl: '',
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
          tags: quiz.value.tags,
          mode: quiz.value.mode || 'competitive',
          isAnonymous: quiz.value.isAnonymous,
          showLiveResultsToPlayers: quiz.value.showLiveResultsToPlayers
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
        tags: quiz.value.tags,
        mode: quiz.value.mode || 'competitive',
        isAnonymous: quiz.value.isAnonymous,
        showLiveResultsToPlayers: quiz.value.showLiveResultsToPlayers
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

    // Step 3: Create new questions and update only those existing questions
    // whose content actually changed since the last successful save.
    const updatedQuestions = [];
    const originalById = new Map(
      (originalQuestionsSnapshot.value || []).map(q => [q._id, q])
    );

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
        const original = originalById.get(_id);

        if (!original || !areQuestionsEqual(question, original)) {
          // Update existing question only if it actually changed
          const data = await apiFetch(`/api/questions/${_id}`, {
            method: 'PUT',
            body: JSON.stringify(questionData)
          });
          updatedQuestions.push(data.data.question);
        } else {
          // Question is unchanged; reuse the original server copy
          updatedQuestions.push(original);
        }
      }
    }

    // Preserve current question selection (stay on same question after save)
    const selectedIndex = questions.value.findIndex(q => q._id === selectedQuestionId.value);

    // Persist the sidebar order after creates/updates so reloads keep the dragged order.
    if (updatedQuestions.length > 0) {
      await apiFetch(`/api/quizzes/${quiz.value._id}/questions/reorder`, {
        method: 'PUT',
        body: JSON.stringify({
          questionIds: updatedQuestions.map(question => question._id)
        })
      });
    }

    // Keep the local questions array in sync with exactly what we just saved.
    questions.value = updatedQuestions;
    // Refresh the snapshot to represent the latest server state.
    originalQuestionsSnapshot.value = JSON.parse(JSON.stringify(updatedQuestions));

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

// Open combined host + player practice preview for this quiz
async function openPlayerPreview() {
  // Ensure quiz exists on the server so preview has an ID to work with
  if (!quiz.value._id) {
    await saveAll();
    if (!quiz.value._id) {
      // Save failed; error toast will already be shown
      return;
    }
  }
  router.push(`/quiz/${quiz.value._id}/practice-preview`);
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
              {{ t('quizEditor.previewAsPlayer') }}
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
    <div v-else class="flex-1 flex flex-col lg:flex-row overflow-hidden min-w-0">
      <!-- Sidebar: Question List -->
      <QuestionListSidebar
        :questions="questions"
        :selected-question-id="selectedQuestionId"
        :question-type-info="questionTypeInfo"
        :drag-index="dragIndex"
        :drop-target-index="dropTargetIndex"
        :is-temporary-id="isTemporaryId"
        :get-question-preview="getQuestionPreview"
        @open-type-selector="showTypeSelector = true"
        @select="selectedQuestionId = $event"
        @duplicate="duplicateQuestion"
        @delete="deleteQuestion"
        @dragstart="onDragStart"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @dragend="onDragEnd"
      />

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
      <QuizSettingsSidebar
        v-model:show-settings="showSettings"
        :quiz="quiz"
        @dirty="hasUnsavedChanges = true"
      />
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
