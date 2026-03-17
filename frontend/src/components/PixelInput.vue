<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  label: String,
  modelValue: [String, Number],
  type: { type: String, default: 'text' },
  placeholder: String,
  maxlength: [String, Number],
  inputmode: String,
  autofocus: Boolean,
  required: Boolean,
  disabled: Boolean,
  error: Boolean,
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
});

const emit = defineEmits(['update:modelValue']);

const showPassword = ref(false);
const isPassword = computed(() => props.type === 'password');
const inputType = computed(() => (isPassword.value && showPassword.value ? 'text' : props.type));

function togglePassword() {
  showPassword.value = !showPassword.value;
}

function onInput(event) {
  emit('update:modelValue', event.target.value);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="font-medium text-foreground">{{ label }}</label>
    <div class="relative">
      <input
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :inputmode="inputmode"
        :autofocus="autofocus"
        :required="required"
        :disabled="disabled"
        class="border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all w-full"
        :class="[
          { 'border-destructive': error },
          {
            'px-3 py-2 text-sm': size === 'sm',
            'px-4 py-3': size === 'md',
            'px-6 py-4 text-lg': size === 'lg'
          },
          isPassword ? 'pr-10' : ''
        ]"
        @input="onInput"
      />
      <button
        v-if="isPassword"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
        @click="togglePassword"
      >
        <span class="sr-only">
          {{ showPassword ? 'Hide password' : 'Show password' }}
        </span>
        <svg
          v-if="!showPassword"
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 9.88A3 3 0 0 1 14.12 14.12" />
          <path d="M9.88 9.88A3 3 0 0 0 9.88 14.12" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      </button>
    </div>
  </div>
</template>
