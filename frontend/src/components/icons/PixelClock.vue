<script setup>
defineProps({
  size: { type: Number, default: 24 }
});
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="8" height="3" fill="currentColor"/>
    <rect x="4" y="8" width="3" height="8" fill="currentColor"/>
    <rect x="17" y="8" width="3" height="8" fill="currentColor"/>
    <rect x="8" y="17" width="8" height="3" fill="currentColor"/>
    <rect x="11" y="8" width="2" height="4" fill="currentColor"/>
    <rect x="11" y="11" width="4" height="2" fill="currentColor"/>
  </svg>
</template>
