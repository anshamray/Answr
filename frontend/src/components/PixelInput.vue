<script setup>
defineProps({
  label: String,
  modelValue: [String, Number],
  type: { type: String, default: 'text' },
  placeholder: String,
  maxlength: [String, Number],
  inputmode: String,
  autofocus: Boolean,
  required: Boolean,
  disabled: Boolean,
  error: Boolean
});

defineEmits(['update:modelValue']);
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="font-medium text-foreground">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :inputmode="inputmode"
      :autofocus="autofocus"
      :required="required"
      :disabled="disabled"
      class="px-4 py-3 border-[3px] border-black bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/30 transition-all"
      :class="{ 'border-destructive': error }"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>
