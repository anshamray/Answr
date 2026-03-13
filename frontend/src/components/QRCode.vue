<script setup>
import { ref, watch, onMounted } from 'vue';
import QRCodeLib from 'qrcode';

const props = defineProps({
  data: { type: String, default: '' },
  size: { type: Number, default: 200 }
});

const qrDataUrl = ref('');
const error = ref(false);

function getThemeColor(variableName, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return value || fallback;
}

async function generateQR() {
  if (!props.data) {
    qrDataUrl.value = '';
    return;
  }

  try {
    error.value = false;
    const dark = getThemeColor('--foreground', '#1E1B3D');
    const light = getThemeColor('--card', '#FFFFFF');
    qrDataUrl.value = await QRCodeLib.toDataURL(props.data, {
      width: props.size,
      margin: 1,
      color: {
        dark,
        light
      },
      errorCorrectionLevel: 'M'
    });
  } catch {
    error.value = true;
    qrDataUrl.value = '';
  }
}

onMounted(generateQR);
watch(() => props.data, generateQR);
watch(() => props.size, generateQR);
</script>

<template>
  <div
    class="bg-white p-3 border-[4px] border-black pixel-shadow"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    <img
      v-if="qrDataUrl && !error"
      :src="qrDataUrl"
      :alt="'QR Code'"
      class="w-full h-full"
    />
    <div v-else class="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
      <svg class="mx-auto" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="3" height="3" />
        <rect x="18" y="14" width="3" height="3" />
        <rect x="14" y="18" width="3" height="3" />
        <rect x="18" y="18" width="3" height="3" />
      </svg>
    </div>
  </div>
</template>
