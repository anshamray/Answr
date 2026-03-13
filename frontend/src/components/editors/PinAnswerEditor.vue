<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { uploadMedia } from '../../lib/mediaService.js';
import { authMediaUrl } from '../../lib/api.js';
import { useAuthStore } from '../../stores/authStore.js';

const auth = useAuthStore();

const props = defineProps({
  mediaUrl: {
    type: String,
    default: ''
  },
  pinConfig: {
    type: Object,
    default: () => ({
      x: 50,
      y: 50,
      radius: 10
    })
  }
});

const emit = defineEmits(['update:mediaUrl', 'update:pinConfig']);

// Local state
const localMediaUrl = ref(props.mediaUrl);
const localPinConfig = ref({ ...props.pinConfig });

// Upload state
const fileInputRef = ref(null);
const isUploading = ref(false);
const uploadProgress = ref(0);
const fileError = ref('');
const isDragOver = ref(false);

// Image container ref for click positioning
const imageContainer = ref(null);
const imageElement = ref(null);

// Drag state
const isDragging = ref(false);

// Get actual image bounds within container (handles object-contain)
function getImageBounds() {
  if (!imageElement.value || !imageContainer.value) return null;

  const img = imageElement.value;
  const container = imageContainer.value;

  const containerRect = container.getBoundingClientRect();
  const imgNaturalRatio = img.naturalWidth / img.naturalHeight;
  const containerRatio = containerRect.width / containerRect.height;

  let imgWidth, imgHeight, imgLeft, imgTop;

  if (imgNaturalRatio > containerRatio) {
    // Image is wider - fits width, has vertical padding
    imgWidth = containerRect.width;
    imgHeight = containerRect.width / imgNaturalRatio;
    imgLeft = containerRect.left;
    imgTop = containerRect.top + (containerRect.height - imgHeight) / 2;
  } else {
    // Image is taller - fits height, has horizontal padding
    imgHeight = containerRect.height;
    imgWidth = containerRect.height * imgNaturalRatio;
    imgLeft = containerRect.left + (containerRect.width - imgWidth) / 2;
    imgTop = containerRect.top;
  }

  return { left: imgLeft, top: imgTop, width: imgWidth, height: imgHeight };
}

// Watch for external changes
watch(() => props.mediaUrl, (newVal) => {
  localMediaUrl.value = newVal;
});

watch(() => props.pinConfig, (newVal) => {
  localPinConfig.value = { ...newVal };
}, { deep: true });

// Radius options
const radiusOptions = [5, 10, 15, 20, 25, 30];

function updateMediaUrl(url) {
  localMediaUrl.value = url;
  emit('update:mediaUrl', url);
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

async function handleFile(file) {
  if (!file) return;
  fileError.value = '';

  if (!file.type.startsWith('image/')) {
    fileError.value = 'Please select an image file';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    fileError.value = 'Image must be less than 5MB';
    return;
  }

  isUploading.value = true;
  uploadProgress.value = 0;
  try {
    const result = await uploadMedia(file, (progress) => {
      uploadProgress.value = progress;
    });
    updateMediaUrl(result.url);
  } catch (err) {
    fileError.value = err.message || 'Upload failed';
  } finally {
    isUploading.value = false;
  }
}

function handleFileSelect(event) {
  handleFile(event.target.files[0]);
  event.target.value = '';
}

function handleDrop(event) {
  event.preventDefault();
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) handleFile(file);
}

function handleDragOver(event) {
  event.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave() {
  isDragOver.value = false;
}

function updatePinConfig() {
  emit('update:pinConfig', localPinConfig.value);
}

// Handle click on image to set pin position
function handleImageClick(event) {
  if (!imageContainer.value || isDragging.value) return;

  updatePinFromEvent(event);
}

// Update pin position from mouse event
function updatePinFromEvent(event) {
  const bounds = getImageBounds();
  if (!bounds) return;

  const x = ((event.clientX - bounds.left) / bounds.width) * 100;
  const y = ((event.clientY - bounds.top) / bounds.height) * 100;

  // Clamp to 0-100 (keeps pin within actual image)
  localPinConfig.value.x = Math.max(0, Math.min(100, Math.round(x * 10) / 10));
  localPinConfig.value.y = Math.max(0, Math.min(100, Math.round(y * 10) / 10));

  updatePinConfig();
}

// Drag handlers for the pin
function startDrag(event) {
  event.preventDefault();
  event.stopPropagation();
  isDragging.value = true;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(event) {
  if (!isDragging.value) return;
  updatePinFromEvent(event);
}

function stopDrag() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

// Image dimensions for reactive positioning
const imageDimensions = ref({ offsetX: 0, offsetY: 0, width: 100, height: 100 });

function updateImageDimensions() {
  if (!imageElement.value || !imageContainer.value) return;

  const img = imageElement.value;
  const container = imageContainer.value;
  const containerWidth = container.offsetWidth;
  const containerHeight = container.offsetHeight;

  const imgNaturalRatio = img.naturalWidth / img.naturalHeight;
  const containerRatio = containerWidth / containerHeight;

  let imgWidth, imgHeight, offsetX, offsetY;

  if (imgNaturalRatio > containerRatio) {
    imgWidth = containerWidth;
    imgHeight = containerWidth / imgNaturalRatio;
    offsetX = 0;
    offsetY = (containerHeight - imgHeight) / 2;
  } else {
    imgHeight = containerHeight;
    imgWidth = containerHeight * imgNaturalRatio;
    offsetX = (containerWidth - imgWidth) / 2;
    offsetY = 0;
  }

  imageDimensions.value = {
    offsetX: (offsetX / containerWidth) * 100,
    offsetY: (offsetY / containerHeight) * 100,
    width: (imgWidth / containerWidth) * 100,
    height: (imgHeight / containerHeight) * 100
  };
}

// Computed styles that position relative to actual image bounds
const pinStyle = computed(() => {
  const d = imageDimensions.value;
  const left = d.offsetX + (localPinConfig.value.x / 100) * d.width;
  const top = d.offsetY + (localPinConfig.value.y / 100) * d.height;
  return {
    left: `${left}%`,
    top: `${top}%`,
    transform: 'translate(-50%, -100%)'
  };
});

const radiusPreviewStyle = computed(() => {
  const d = imageDimensions.value;
  const left = d.offsetX + (localPinConfig.value.x / 100) * d.width;
  const top = d.offsetY + (localPinConfig.value.y / 100) * d.height;
  // Use smaller dimension for consistent circle
  const radiusPercent = (localPinConfig.value.radius / 100) * Math.min(d.width, d.height) * 2;
  return {
    width: `${radiusPercent}%`,
    height: `${radiusPercent}%`,
    left: `${left}%`,
    top: `${top}%`,
    transform: 'translate(-50%, -50%)'
  };
});

// Handle window resize
onMounted(() => {
  window.addEventListener('resize', updateImageDimensions);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateImageDimensions);
});
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted-foreground">
      Upload an image and click to set the correct pin location. Players must click within the target area to be correct.
    </p>

    <!-- Image Upload -->
    <div>
      <label class="block text-sm font-medium mb-2">Image (required)</label>
      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
      />

      <!-- Uploading state -->
      <div v-if="isUploading" class="border-2 border-dashed border-primary p-8 text-center">
        <svg class="mx-auto mb-3 text-primary animate-pulse" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p class="text-sm text-muted-foreground mb-2">Uploading...</p>
        <div class="w-full max-w-xs mx-auto bg-border h-2">
          <div class="bg-primary h-full transition-all duration-200" :style="{ width: `${uploadProgress}%` }"></div>
        </div>
        <p class="text-xs text-muted-foreground mt-1">{{ uploadProgress }}%</p>
      </div>

      <!-- Image loaded — interactive pin placement -->
      <div
        v-else-if="localMediaUrl"
        ref="imageContainer"
        class="relative border-2 border-border cursor-crosshair overflow-hidden"
        @click="handleImageClick"
      >
        <img
          ref="imageElement"
          :src="authMediaUrl(localMediaUrl, auth.token)"
          alt="Pin answer image"
          class="w-full max-h-96 object-contain"
          @load="updateImageDimensions"
        />

        <!-- Target area circle -->
        <div
          class="absolute border-4 border-success rounded-full bg-success/20 pointer-events-none"
          :style="radiusPreviewStyle"
        ></div>

        <!-- Pin marker (draggable) -->
        <div
          class="absolute w-8 h-8 cursor-grab active:cursor-grabbing select-none"
          :class="{ 'scale-110': isDragging }"
          :style="pinStyle"
          @mousedown="startDrag"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--success)" stroke="var(--foreground)" stroke-width="2" class="drop-shadow-md">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" fill="white" />
          </svg>
        </div>

        <!-- Remove image button -->
        <button
          @click.stop="updateMediaUrl('')"
          class="absolute top-2 right-2 p-2 bg-destructive text-white hover:bg-destructive/80"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Empty state — upload zone -->
      <div
        v-else
        class="border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
        :class="isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'"
        @click="triggerFileInput"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
      >
        <svg class="mx-auto mb-3 text-muted-foreground" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
        </svg>
        <p class="text-sm text-muted-foreground mb-1">Drag and drop an image, or click to browse</p>
        <p class="text-xs text-muted-foreground">JPG, PNG or GIF — max 5 MB</p>
        <p v-if="fileError" class="text-sm text-destructive mt-2">{{ fileError }}</p>
      </div>
    </div>

    <!-- Pin Configuration -->
    <div v-if="localMediaUrl" class="grid grid-cols-3 gap-4">
      <div>
        <label class="block text-xs text-muted-foreground mb-1">X Position (%)</label>
        <input
          v-model.number="localPinConfig.x"
          type="number"
          min="0"
          max="100"
          step="0.1"
          class="w-full px-3 py-2 border-2 border-border bg-white focus:border-primary focus:outline-none"
          @change="updatePinConfig"
        />
      </div>
      <div>
        <label class="block text-xs text-muted-foreground mb-1">Y Position (%)</label>
        <input
          v-model.number="localPinConfig.y"
          type="number"
          min="0"
          max="100"
          step="0.1"
          class="w-full px-3 py-2 border-2 border-border bg-white focus:border-primary focus:outline-none"
          @change="updatePinConfig"
        />
      </div>
      <div>
        <label class="block text-xs text-muted-foreground mb-1">Target Radius (%)</label>
        <select
          v-model.number="localPinConfig.radius"
          class="w-full px-3 py-2 border-2 border-border bg-white focus:border-primary focus:outline-none"
          @change="updatePinConfig"
        >
          <option v-for="r in radiusOptions" :key="r" :value="r">
            {{ r }}% ({{ r < 10 ? 'Precise' : r < 20 ? 'Medium' : 'Easy' }})
          </option>
        </select>
      </div>
    </div>

    <div class="bg-muted/50 p-4 border-2 border-border">
      <h4 class="text-sm font-medium mb-2">How it works:</h4>
      <ul class="text-xs text-muted-foreground space-y-1">
        <li>- Click on the image or drag the pin to set the correct location</li>
        <li>- The green circle shows the acceptable target area</li>
        <li>- Players must click within this area to be correct</li>
        <li>- Adjust the radius to make it easier or harder</li>
      </ul>
    </div>
  </div>
</template>
