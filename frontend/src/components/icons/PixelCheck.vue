<script setup>
defineProps({
  size: { type: Number, default: 24 }
});
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="18" y="6" width="3" height="3" fill="currentColor"/>
    <rect x="15" y="9" width="3" height="3" fill="currentColor"/>
    <rect x="12" y="12" width="3" height="3" fill="currentColor"/>
    <rect x="9" y="15" width="3" height="3" fill="currentColor"/>
    <rect x="6" y="12" width="3" height="3" fill="currentColor"/>
  </svg>
</template>
