<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  answers: {
    type: Array,
    default: () => [
      { text: '', order: 0 },
      { text: '', order: 1 },
      { text: '', order: 2 }
    ]
  }
});

const emit = defineEmits(['update:answers']);

// Local copy
const localAnswers = ref([...props.answers]);

// Drag state
const dragIndex = ref(null);

// Watch for external changes
watch(() => props.answers, (newVal) => {
  localAnswers.value = [...newVal];
}, { deep: true });

function updateAnswerText(index, text) {
  localAnswers.value[index] = {
    ...localAnswers.value[index],
    text
  };
  emit('update:answers', localAnswers.value);
}

function addAnswer() {
  if (localAnswers.value.length >= 4) return;

  localAnswers.value.push({
    text: '',
    order: localAnswers.value.length
  });
  emit('update:answers', localAnswers.value);
}

function removeAnswer(index) {
  if (localAnswers.value.length <= 3) return;

  localAnswers.value.splice(index, 1);
  // Re-assign order values
  localAnswers.value = localAnswers.value.map((a, i) => ({
    ...a,
    order: i
  }));
  emit('update:answers', localAnswers.value);
}

// Drag and drop handlers
function onDragStart(index) {
  dragIndex.value = index;
}

function onDragOver(event) {
  event.preventDefault();
}

function onDrop(index) {
  if (dragIndex.value === null || dragIndex.value === index) return;

  const items = [...localAnswers.value];
  const [removed] = items.splice(dragIndex.value, 1);
  items.splice(index, 0, removed);

  // Update order values
  localAnswers.value = items.map((a, i) => ({
    ...a,
    order: i
  }));

  dragIndex.value = null;
  emit('update:answers', localAnswers.value);
}

function onDragEnd() {
  dragIndex.value = null;
}

// Move item up/down
function moveUp(index) {
  if (index === 0) return;
  const items = [...localAnswers.value];
  [items[index - 1], items[index]] = [items[index], items[index - 1]];
  localAnswers.value = items.map((a, i) => ({ ...a, order: i }));
  emit('update:answers', localAnswers.value);
}

function moveDown(index) {
  if (index >= localAnswers.value.length - 1) return;
  const items = [...localAnswers.value];
  [items[index], items[index + 1]] = [items[index + 1], items[index]];
  localAnswers.value = items.map((a, i) => ({ ...a, order: i }));
  emit('update:answers', localAnswers.value);
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted-foreground mb-4">
      Arrange items in the correct order. The order shown here is the correct answer - players will see them shuffled.
    </p>

    <div class="space-y-2">
      <div
        v-for="(answer, index) in localAnswers"
        :key="index"
        class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 bg-white border-2 border-border hover:border-primary transition-colors cursor-move"
        :class="{ 'border-primary bg-primary/5': dragIndex === index }"
        draggable="true"
        @dragstart="onDragStart(index)"
        @dragover="onDragOver($event)"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <!-- Drag handle -->
        <div class="flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="8" y2="6.01" /><line x1="8" y1="12" x2="8" y2="12.01" /><line x1="8" y1="18" x2="8" y2="18.01" />
            <line x1="16" y1="6" x2="16" y2="6.01" /><line x1="16" y1="12" x2="16" y2="12.01" /><line x1="16" y1="18" x2="16" y2="18.01" />
          </svg>
        </div>

        <!-- Order number -->
        <div class="w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-bold text-sm flex-shrink-0">
          {{ index + 1 }}
        </div>

        <!-- Answer text + counter -->
        <div class="flex-1 min-w-0 space-y-1">
          <input
            :value="answer.text"
            @input="updateAnswerText(index, $event.target.value)"
            type="text"
            placeholder="Enter item text..."
            maxlength="200"
            class="w-full px-3 py-2 border-2 border-border bg-white focus:border-primary focus:outline-none"
          />
          <div class="flex justify-end">
            <span class="text-[11px] leading-tight text-muted-foreground">
              {{ answer.text?.length || 0 }}/200
            </span>
          </div>
        </div>

        <!-- Move buttons (alternative to drag) -->
        <div class="flex flex-col gap-1">
          <button
            @click="moveUp(index)"
            :disabled="index === 0"
            class="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          <button
            @click="moveDown(index)"
            :disabled="index === localAnswers.length - 1"
            class="p-1 text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        <!-- Remove button -->
        <button
          v-if="localAnswers.length > 3"
          @click="removeAnswer(index)"
          class="p-2 text-muted-foreground hover:text-destructive transition-colors"
          title="Remove item"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Add item button -->
    <button
      v-if="localAnswers.length < 4"
      @click="addAnswer"
      class="w-full py-3 border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Add Item ({{ localAnswers.length }}/4)
    </button>

    <div class="bg-muted/50 p-4 border-2 border-border">
      <h4 class="text-sm font-medium mb-2">How it works:</h4>
      <ul class="text-xs text-muted-foreground space-y-1">
        <li>- Players will see these items in a random order</li>
        <li>- They must drag to rearrange them in the correct order</li>
        <li>- The order shown above is the correct sequence</li>
      </ul>
    </div>
  </div>
</template>
