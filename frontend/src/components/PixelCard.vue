<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'secondary', 'accent'].includes(v)
  }
});
</script>

<template>
  <div
    class="border-[3px] border-black pixel-shadow p-6"
    :class="{
      'bg-card border-border': variant === 'default',
      'bg-primary/10 border-primary': variant === 'primary',
      'bg-secondary/10 border-secondary': variant === 'secondary',
      'bg-accent/10 border-accent': variant === 'accent'
    }"
  >
    <slot />
  </div>
</template>
