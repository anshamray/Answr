<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiUrl, authMediaUrl } from '../lib/api.js';
import { uploadMedia } from '../lib/mediaService.js';
import { useAuthStore } from '../stores/authStore.js';

import PixelButton from './PixelButton.vue';

const { t } = useI18n();
const auth = useAuthStore();

const props = defineProps({
  open: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'select']);

const media = ref([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
const selectedIds = ref([]);

// Upload state
const isUploading = ref(false);
const uploadProgress = ref(0);
const uploadError = ref('');
const fileInputRef = ref(null);

async function fetchMedia() {
  loading.value = true;
  error.value = '';

  try {
    const params = new URLSearchParams();
    if (search.value) params.set('search', search.value);

    const res = await fetch(apiUrl(`/api/media?${params.toString()}`), {
      headers: { Authorization: `Bearer ${auth.token}` }
    });

    if (!res.ok) throw new Error('Failed to load media');

    const json = await res.json();
    media.value = json.data?.media || [];
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function handleSelect(item) {
  const id = item.id;
  const idx = selectedIds.value.indexOf(id);
  if (idx !== -1) {
    selectedIds.value.splice(idx, 1);
  } else {
    selectedIds.value.push(id);
  }
}

function confirmSelect() {
  const selected = media.value.filter(m => selectedIds.value.includes(m.id));
  if (!selected.length) return;
  const urls = selected.map(item => item.url);
  emit('select', urls);
  emit('close');
}

function handleClose() {
  selectedIds.value = [];
  emit('close');
}

function triggerUpload() {
  fileInputRef.value?.click();
}

async function handleFileSelect(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  uploadError.value = '';

  // Filter to valid image files under 5MB
  const validFiles = files.filter((file) => {
    if (!file.type.startsWith('image/')) {
      uploadError.value = 'Please select an image file';
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      uploadError.value = 'Image must be smaller than 5MB';
      return false;
    }
    return true;
  });

  if (!validFiles.length) {
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;

  try {
    for (let index = 0; index < validFiles.length; index++) {
      const file = validFiles[index];

      const result = await uploadMedia(file, (percent) => {
        // Scale individual file progress into overall batch progress
        const completedPortion = index / validFiles.length;
        const currentPortion = (percent / 100) / validFiles.length;
        uploadProgress.value = Math.round((completedPortion + currentPortion) * 100);
      });

      // Add to the list and mark it as selected
      media.value.unshift({
        id: result.id,
        url: result.url,
        originalName: result.originalName,
        mimeType: result.mimeType,
        size: result.size,
        width: result.width,
        height: result.height
      });
      if (!selectedIds.value.includes(result.id)) {
        selectedIds.value.push(result.id);
      }
    }
  } catch (err) {
    uploadError.value = err.message || 'Upload failed';
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

onMounted(() => {
  if (props.open) {
    fetchMedia();
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        @click.self="handleClose"
      >
        <div class="bg-white border-[3px] border-black pixel-shadow w-full max-w-3xl max-h-[80vh] flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between p-4 border-b-2 border-border">
            <h2 class="text-xl font-bold">Media Library</h2>
            <button @click="handleClose" class="p-1 hover:bg-muted transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Toolbar -->
          <div class="flex items-center gap-3 p-4 border-b-2 border-border">
            <input
              v-model="search"
              type="text"
              placeholder="Search by filename..."
              class="flex-1 px-3 py-2 border-2 border-border focus:border-primary focus:outline-none"
              @keyup.enter="fetchMedia"
            />
            <PixelButton size="sm" @click="fetchMedia">Search</PixelButton>
            <PixelButton variant="primary" size="sm" @click="triggerUpload" :disabled="isUploading">
              {{ isUploading ? 'Uploading...' : 'Upload' }}
            </PixelButton>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              multiple
              class="hidden"
              @change="handleFileSelect"
            />
          </div>

          <!-- Upload progress -->
          <div v-if="isUploading" class="px-4 py-2 bg-primary/10">
            <div class="flex items-center gap-2 text-sm text-primary">
              <span>Uploading...</span>
              <span>{{ uploadProgress }}%</span>
            </div>
            <div class="w-full bg-border h-1 mt-1">
              <div class="bg-primary h-full transition-all" :style="{ width: `${uploadProgress}%` }"></div>
            </div>
          </div>

          <!-- Error messages -->
          <div v-if="error || uploadError" class="px-4 py-2 bg-destructive/10 text-destructive text-sm">
            {{ error || uploadError }}
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="loading" class="text-center py-8 text-muted-foreground">
              Loading...
            </div>

            <div v-else-if="media.length === 0" class="text-center py-8 text-muted-foreground">
              <svg class="mx-auto mb-3 text-muted-foreground/50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              <p>No images found</p>
              <p class="text-sm">Upload your first image to get started</p>
            </div>

            <div v-else class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              <div
                v-for="item in media"
                :key="item.id"
                class="relative aspect-square border-2 cursor-pointer overflow-hidden transition-all hover:border-primary"
                :class="selectedIds.includes(item.id) ? 'border-primary ring-2 ring-primary/30' : 'border-border'"
                @click="handleSelect(item)"
              >
                <img
                  :src="authMediaUrl(item.url, auth.token)"
                  :alt="item.originalName"
                  class="w-full h-full object-cover"
                />
                <div
                  v-if="selectedIds.includes(item.id)"
                  class="absolute inset-0 bg-primary/20 flex items-center justify-center"
                >
                  <div class="w-6 h-6 bg-primary text-white flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
                <div class="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                  {{ item.originalName }}
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between p-4 border-t-2 border-border bg-muted/30">
            <div class="text-sm text-muted-foreground">
              <template v-if="selectedIds.length">
                {{ selectedIds.length }} selected
              </template>
              <template v-else>
                {{ media.length }} images
              </template>
            </div>
            <div class="flex gap-2">
              <PixelButton variant="outline" size="sm" @click="handleClose">Cancel</PixelButton>
              <PixelButton
                variant="primary"
                size="sm"
                :disabled="!selectedIds.length"
                @click="confirmSelect"
              >
                Select
              </PixelButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
