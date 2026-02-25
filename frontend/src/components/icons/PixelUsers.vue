<script setup>
defineProps({
  size: { type: Number, default: 24 }
});
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="7" width="3" height="3" fill="currentColor"/>
    <rect x="4" y="11" width="3" height="3" fill="currentColor"/>
    <rect x="1" y="14" width="3" height="3" fill="currentColor"/>
    <rect x="4" y="14" width="3" height="3" fill="currentColor"/>
    <rect x="7" y="14" width="3" height="3" fill="currentColor"/>
    <rect x="14" y="7" width="3" height="3" fill="currentColor"/>
    <rect x="14" y="11" width="3" height="3" fill="currentColor"/>
    <rect x="11" y="14" width="3" height="3" fill="currentColor"/>
    <rect x="14" y="14" width="3" height="3" fill="currentColor"/>
    <rect x="17" y="14" width="3" height="3" fill="currentColor"/>
  </svg>
</template>
