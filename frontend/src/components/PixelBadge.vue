<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'accent', 'success', 'warning'].includes(v)
  }
});
</script>

<template>
  <span
    class="inline-block px-3 py-1 text-xs font-bold border-2 border-black"
    :class="{
      'bg-primary text-primary-foreground': variant === 'primary',
      'bg-secondary text-secondary-foreground': variant === 'secondary',
      'bg-accent text-accent-foreground': variant === 'accent',
      'bg-success text-success-foreground': variant === 'success',
      'bg-warning text-warning-foreground': variant === 'warning'
    }"
  >
    <slot />
  </span>
</template>
