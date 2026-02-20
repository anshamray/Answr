<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'accent', 'success', 'warning'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
});
</script>

<template>
  <span
    class="inline-block font-bold border-[3px] border-black"
    :class="[
      {
        'bg-primary-dark text-primary-foreground': variant === 'primary',
        'bg-secondary text-secondary-foreground': variant === 'secondary',
        'bg-accent text-accent-foreground': variant === 'accent',
        'bg-success text-success-foreground': variant === 'success',
        'bg-warning text-warning-foreground': variant === 'warning'
      },
      {
        'text-xs px-2 py-1': size === 'sm',
        'text-xs px-4 py-1.5': size === 'md',
        'text-sm px-6 py-2': size === 'lg'
      }
    ]"
  >
    <slot />
  </span>
</template>
