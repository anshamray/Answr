<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'accent', 'success', 'destructive', 'outline'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  disabled: Boolean
});
</script>

<template>
  <button
    :disabled="disabled"
    class="pixel-btn font-medium transition-all duration-200 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed border-[3px] border-black"
    :class="[
      {
        'bg-primary text-primary-foreground hover:bg-primary-dark pixel-shadow': variant === 'primary',
        'bg-secondary text-secondary-foreground hover:bg-secondary-dark pixel-shadow': variant === 'secondary',
        'bg-accent text-accent-foreground hover:bg-accent-dark pixel-shadow': variant === 'accent',
        'bg-success text-success-foreground hover:brightness-110 pixel-shadow': variant === 'success',
        'bg-destructive text-destructive-foreground hover:brightness-110 pixel-shadow': variant === 'destructive',
        'bg-white text-foreground hover:bg-muted border-foreground pixel-shadow': variant === 'outline'
      },
      {
        'px-4 py-2.5 text-sm min-h-[44px]': size === 'sm',
        'px-6 py-3 text-base': size === 'md',
        'px-8 py-4 text-lg': size === 'lg'
      }
    ]"
  >
    <slot />
  </button>
</template>
