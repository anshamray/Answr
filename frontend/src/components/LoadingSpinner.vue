<script setup>
defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  text: String
});
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4">
    <div
      class="border-4 border-primary border-t-transparent rounded-full animate-spin"
      :class="{
        'w-6 h-6': size === 'sm',
        'w-12 h-12': size === 'md',
        'w-16 h-16': size === 'lg'
      }"
    ></div>
    <p v-if="text" class="text-muted-foreground">{{ text }}</p>
  </div>
</template>
