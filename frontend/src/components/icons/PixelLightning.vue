<script setup>
defineProps({
  size: { type: Number, default: 24 }
});
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="2" width="4" height="4" fill="currentColor"/>
    <rect x="6" y="6" width="4" height="4" fill="currentColor"/>
    <rect x="10" y="6" width="4" height="4" fill="currentColor"/>
    <rect x="6" y="10" width="4" height="4" fill="currentColor"/>
    <rect x="2" y="14" width="4" height="4" fill="currentColor"/>
    <rect x="6" y="14" width="4" height="4" fill="currentColor"/>
    <rect x="10" y="14" width="4" height="4" fill="currentColor"/>
    <rect x="14" y="14" width="4" height="4" fill="currentColor"/>
    <rect x="10" y="18" width="4" height="4" fill="currentColor"/>
    <rect x="14" y="18" width="4" height="4" fill="currentColor"/>
    <rect x="14" y="22" width="4" height="4" fill="currentColor"/>
  </svg>
</template>
