<script setup>
import { ref, watch, computed } from 'vue';

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

// Image container ref for click positioning
const imageContainer = ref(null);

// Drag state
const isDragging = ref(false);

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
  if (!imageContainer.value) return;

  const rect = imageContainer.value.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  // Clamp to 0-100
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

// Computed radius in pixels for preview (assuming ~400px image width)
const radiusPreviewStyle = computed(() => {
  return {
    width: `${localPinConfig.value.radius * 2}%`,
    height: `${localPinConfig.value.radius * 2}%`,
    left: `${localPinConfig.value.x}%`,
    top: `${localPinConfig.value.y}%`,
    transform: 'translate(-50%, -50%)'
  };
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
      <div
        v-if="localMediaUrl"
        ref="imageContainer"
        class="relative border-2 border-border cursor-crosshair overflow-hidden"
        @click="handleImageClick"
      >
        <img
          :src="localMediaUrl"
          alt="Pin answer image"
          class="w-full max-h-96 object-contain"
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
          :style="{
            left: `${localPinConfig.x}%`,
            top: `${localPinConfig.y}%`,
            transform: 'translate(-50%, -100%)'
          }"
          @mousedown="startDrag"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#10B981" stroke="#065F46" stroke-width="2" class="drop-shadow-md">
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

      <div v-else class="border-2 border-dashed border-border p-8 text-center">
        <svg class="mx-auto mb-3 text-muted-foreground" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
        </svg>
        <p class="text-sm text-muted-foreground mb-3">Upload an image to mark the correct location</p>
        <input
          type="text"
          placeholder="Paste image URL"
          class="w-full max-w-sm mx-auto px-3 py-2 border-2 border-border text-sm focus:border-primary focus:outline-none"
          @blur="updateMediaUrl($event.target.value)"
        />
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
