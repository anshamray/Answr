<script setup>
import { computed } from 'vue';
import { apiUrl } from '../lib/api.js';
import { isExternalVideoUrl, getExternalVideoEmbedUrl } from '../lib/mediaService.js';

const props = defineProps({
  mediaUrl: {
    type: String,
    default: null
  },
  mediaUrls: {
    type: Array,
    default: () => []
  },
  authToken: {
    type: String,
    default: ''
  },
  pin: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    default: 'default' // 'default' | 'compact'
  },
  maxHeight: {
    type: String,
    default: 'min(14rem,calc(100vh-24rem))'
  }
});

const primaryUrl = computed(() => props.mediaUrl || props.mediaUrls[0] || null);

const isVideo = computed(() => !!primaryUrl.value && isExternalVideoUrl(primaryUrl.value));
const embedUrl = computed(() => {
  if (!isVideo.value || !primaryUrl.value) return null;
  return getExternalVideoEmbedUrl(primaryUrl.value);
});

const resolvedImageUrls = computed(() => {
  const rawUrls = Array.isArray(props.mediaUrls) && props.mediaUrls.length
    ? props.mediaUrls
    : (props.mediaUrl ? [props.mediaUrl] : []);

  return rawUrls
    .filter(Boolean)
    .map((url) => {
      if (!url.startsWith('/')) {
        return url;
      }
      const full = apiUrl(url);
      if (!props.pin) return full;
      return `${full}${full.includes('?') ? '&' : '?'}sessionPin=${props.pin}`;
    });
});
</script>

<template>
  <div v-if="isVideo && embedUrl" class="flex justify-center">
    <div
      class="w-full border-[3px] border-black bg-black overflow-hidden"
      :class="mode === 'compact' ? 'max-w-xl aspect-video' : 'max-w-3xl aspect-video'"
    >
      <iframe
        :src="embedUrl"
        class="w-full h-full"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>
  </div>
  <div
    v-else-if="resolvedImageUrls && resolvedImageUrls.length"
    class="flex justify-center"
  >
    <div
      class="border-[3px] border-black w-full flex items-center justify-center overflow-hidden bg-black"
      :class="mode === 'compact' ? 'max-w-2xl' : 'max-w-3xl'"
      :style="{ maxHeight }"
    >
      <div
        class="w-full h-full grid gap-2"
        :class="resolvedImageUrls.length === 1 ? 'grid-cols-1' : resolvedImageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'"
      >
        <div
          v-for="url in resolvedImageUrls"
          :key="url"
          class="flex items-center justify-center bg-black"
        >
          <img
            :src="url"
            alt=""
            class="w-full object-contain"
            :style="{ maxHeight }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

