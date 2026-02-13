<script setup>
import { ref, watch } from 'vue';
import MultipleChoiceEditor from './MultipleChoiceEditor.vue';

const props = defineProps({
  answers: {
    type: Array,
    default: () => [
      { text: 'Answer 1', isCorrect: true },
      { text: 'Answer 2', isCorrect: false }
    ]
  },
  language: {
    type: String,
    default: 'en'
  },
  textToRead: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:answers', 'update:language', 'update:textToRead']);

// Available languages for text-to-speech
const languages = [
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'en-GB', name: 'English (UK)', flag: 'EN' },
  { code: 'de', name: 'German', flag: 'DE' },
  { code: 'fr', name: 'French', flag: 'FR' },
  { code: 'es', name: 'Spanish', flag: 'ES' },
  { code: 'it', name: 'Italian', flag: 'IT' },
  { code: 'pt', name: 'Portuguese', flag: 'PT' },
  { code: 'nl', name: 'Dutch', flag: 'NL' },
  { code: 'pl', name: 'Polish', flag: 'PL' },
  { code: 'ru', name: 'Russian', flag: 'RU' },
  { code: 'ja', name: 'Japanese', flag: 'JA' },
  { code: 'zh', name: 'Chinese', flag: 'ZH' },
  { code: 'ko', name: 'Korean', flag: 'KO' }
];

const localLanguage = ref(props.language);
const localTextToRead = ref(props.textToRead);

watch(() => props.language, (newVal) => {
  localLanguage.value = newVal;
});

watch(() => props.textToRead, (newVal) => {
  localTextToRead.value = newVal;
});

function updateLanguage(lang) {
  localLanguage.value = lang;
  emit('update:language', lang);
}

function updateTextToRead() {
  emit('update:textToRead', localTextToRead.value);
}

function handleAnswersUpdate(answers) {
  emit('update:answers', answers);
}

// Play preview (browser TTS)
function playPreview() {
  const text = localTextToRead.value || 'This text will be read aloud to the players.';
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = localLanguage.value;
  speechSynthesis.cancel(); // Stop any current speech
  speechSynthesis.speak(utterance);
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted-foreground">
      The question text will be read aloud to players. Choose a language and configure multiple choice answers.
    </p>

    <!-- Language Selection -->
    <div>
      <label class="block text-sm font-medium mb-2">Language</label>
      <div class="grid grid-cols-4 sm:grid-cols-6 gap-2">
        <button
          v-for="lang in languages"
          :key="lang.code"
          @click="updateLanguage(lang.code)"
          class="p-2 border-2 text-center transition-all"
          :class="localLanguage === lang.code
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border hover:border-primary'"
        >
          <div class="font-bold text-xs">{{ lang.flag }}</div>
          <div class="text-[10px] text-muted-foreground truncate">{{ lang.name }}</div>
        </button>
      </div>
    </div>

    <!-- Text to Read Aloud -->
    <div>
      <label class="block text-sm font-medium mb-2">
        Text to Read Aloud
        <span class="text-xs text-muted-foreground font-normal">(optional - uses question text if empty)</span>
      </label>
      <div class="flex gap-2">
        <textarea
          v-model="localTextToRead"
          placeholder="Enter text to be read aloud (leave empty to use question text)..."
          class="flex-1 px-4 py-3 border-2 border-border bg-white focus:border-primary focus:outline-none resize-none"
          rows="2"
          maxlength="120"
          @blur="updateTextToRead"
        ></textarea>
        <button
          @click="playPreview"
          class="px-4 py-2 border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center gap-2"
          title="Preview audio"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      </div>
      <p class="text-xs text-muted-foreground mt-1">
        Click the play button to preview how it sounds (using browser text-to-speech)
      </p>
    </div>

    <!-- Answers (reuse MultipleChoiceEditor) -->
    <div>
      <label class="block text-sm font-medium mb-2">Answer Options</label>
      <MultipleChoiceEditor
        :answers="answers"
        :allow-multiple="false"
        @update:answers="handleAnswersUpdate"
      />
    </div>

    <div class="bg-muted/50 p-4 border-2 border-border">
      <h4 class="text-sm font-medium mb-2">How it works:</h4>
      <ul class="text-xs text-muted-foreground space-y-1">
        <li>- The question text is read aloud when the question appears</li>
        <li>- Players see the answer options but not the question text</li>
        <li>- Useful for language learning, listening comprehension, or accessibility</li>
      </ul>
    </div>
  </div>
</template>
