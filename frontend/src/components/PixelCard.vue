<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'primary', 'secondary', 'accent'].includes(v)
  },
  padding: {
    type: String,
    default: 'md',
    validator: (v) => ['none', 'sm', 'md', 'lg'].includes(v)
  }
});
</script>

<template>
  <div
    class="border-[3px] border-black pixel-shadow"
    :class="[
      {
        'bg-card border-border': variant === 'default',
        'bg-primary/10 border-primary': variant === 'primary',
        'bg-secondary/10 border-secondary': variant === 'secondary',
        'bg-accent/10 border-accent': variant === 'accent'
      },
      {
        'p-0': padding === 'none',
        'p-3': padding === 'sm',
        'p-6': padding === 'md',
        'p-8': padding === 'lg'
      }
    ]"
  >
    <slot />
  </div>
</template>
