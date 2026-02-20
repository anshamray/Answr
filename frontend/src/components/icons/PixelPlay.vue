<script setup>
defineProps({
  size: { type: Number, default: 24 }
});
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Pixelated play triangle pointing right -->
    <rect x="6" y="4" width="4" height="4" fill="currentColor"/>
    <rect x="6" y="8" width="4" height="4" fill="currentColor"/>
    <rect x="10" y="8" width="4" height="4" fill="currentColor"/>
    <rect x="6" y="12" width="4" height="4" fill="currentColor"/>
    <rect x="10" y="12" width="4" height="4" fill="currentColor"/>
    <rect x="14" y="12" width="4" height="4" fill="currentColor"/>
    <rect x="6" y="16" width="4" height="4" fill="currentColor"/>
    <rect x="10" y="16" width="4" height="4" fill="currentColor"/>
    <rect x="6" y="20" width="4" height="4" fill="currentColor"/>
  </svg>
</template>
