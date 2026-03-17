<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  maxWidth: {
    type: String,
    default: 'max-w-lg'
  },
  showClose: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

function close() {
  emit('update:modelValue', false);
  emit('close');
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    close();
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="pixel-modal-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        @click="handleBackdropClick"
      >
        <div
          class="bg-white border-[3px] border-black pixel-shadow w-full max-h-[85vh] overflow-hidden flex flex-col"
          :class="maxWidth"
          @click.stop
        >
          <header
            v-if="title || showClose"
            class="flex items-center justify-between px-4 py-3 border-b-[3px] border-border"
          >
            <h2 v-if="title" class="text-lg font-bold">
              {{ title }}
            </h2>
            <button
              v-if="showClose"
              type="button"
              class="ml-auto p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="close"
            >
              <span class="sr-only">Close</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <section class="flex-1 overflow-y-auto">
            <slot />
          </section>

          <footer v-if="$slots.footer" class="px-4 py-3 border-t-[3px] border-border bg-muted/30">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.pixel-modal-fade-enter-active,
.pixel-modal-fade-leave-active {
  transition: opacity 0.18s ease-out;
}

.pixel-modal-fade-enter-from,
.pixel-modal-fade-leave-to {
  opacity: 0;
}
</style>

