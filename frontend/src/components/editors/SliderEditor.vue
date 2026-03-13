<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  config: {
    type: Object,
    default: () => ({
      min: 0,
      max: 100,
      correctValue: 50,
      unit: '',
      margin: 'medium'
    })
  }
});

const emit = defineEmits(['update:config']);

// Local config copy
const localConfig = ref({ ...props.config });

// Watch for external changes
watch(() => props.config, (newVal) => {
  localConfig.value = { ...newVal };
}, { deep: true });

// Margin options with pixel icons
const marginOptions = [
  { value: 'none', label: 'EXACT', bars: 1 },
  { value: 'low', label: 'LOW', bars: 2 },
  { value: 'medium', label: 'MEDIUM', bars: 3 },
  { value: 'high', label: 'HIGH', bars: 4 },
  { value: 'max', label: 'MAX', bars: 5 }
];

// Computed preview of tolerance range
const toleranceRange = computed(() => {
  const range = localConfig.value.max - localConfig.value.min;
  const margins = {
    none: 0,
    low: 0.05,
    medium: 0.1,
    high: 0.2,
    max: 0.5
  };
  const margin = margins[localConfig.value.margin] || 0;
  const tolerance = range * margin;
  const rawMinAccepted = Math.max(localConfig.value.min, localConfig.value.correctValue - tolerance);
  const rawMaxAccepted = Math.min(localConfig.value.max, localConfig.value.correctValue + tolerance);
  let minAccepted = Math.ceil(rawMinAccepted);
  let maxAccepted = Math.floor(rawMaxAccepted);

  if (maxAccepted < minAccepted) {
    const nearestValid = Math.min(
      localConfig.value.max,
      Math.max(localConfig.value.min, Math.round(localConfig.value.correctValue))
    );
    minAccepted = nearestValid;
    maxAccepted = nearestValid;
  }

  return {
    min: minAccepted,
    max: maxAccepted
  };
});

// Computed slider position (for preview)
const sliderPosition = computed(() => {
  const range = localConfig.value.max - localConfig.value.min;
  if (range === 0) return 50;
  return ((localConfig.value.correctValue - localConfig.value.min) / range) * 100;
});

// Tolerance range positions
const toleranceStart = computed(() => {
  const range = localConfig.value.max - localConfig.value.min;
  if (range === 0) return 0;
  return ((toleranceRange.value.min - localConfig.value.min) / range) * 100;
});

const toleranceWidth = computed(() => {
  const range = localConfig.value.max - localConfig.value.min;
  if (range === 0) return 100;
  return ((toleranceRange.value.max - toleranceRange.value.min) / range) * 100;
});

function updateConfig() {
  emit('update:config', localConfig.value);
}

// Interactive slider drag
const sliderTrack = ref(null);
const isDragging = ref(false);

function startDrag(e) {
  isDragging.value = true;
  updateFromMouse(e);
  window.addEventListener('mousemove', updateFromMouse);
  window.addEventListener('mouseup', stopDrag);
}

function updateFromMouse(e) {
  if (!sliderTrack.value) return;
  const rect = sliderTrack.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const range = localConfig.value.max - localConfig.value.min;
  localConfig.value.correctValue = Math.round(localConfig.value.min + x * range);
  updateConfig();
}

function stopDrag() {
  isDragging.value = false;
  window.removeEventListener('mousemove', updateFromMouse);
  window.removeEventListener('mouseup', stopDrag);
}
</script>

<template>
  <div class="space-y-2">
    <!-- Interactive Slider Preview -->
    <div class="border-2 border-black bg-gradient-to-b from-gray-50 to-gray-100 p-3 pixel-shadow">
      <div class="text-center mb-2">
        <span class="text-2xl font-bold text-primary">
          {{ localConfig.correctValue }}
        </span>
      </div>

      <!-- Pixel Slider Track -->
      <div
        ref="sliderTrack"
        class="relative h-6 cursor-pointer select-none"
        @mousedown="startDrag"
      >
        <!-- Track background -->
        <div class="absolute inset-0 flex items-center">
          <div class="w-full h-3 bg-gray-300 border-2 border-black relative overflow-hidden">
            <div class="absolute inset-0 opacity-20" style="background-image: repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px);"></div>
          </div>
        </div>

        <!-- Tolerance zone -->
        <div
          class="absolute top-1/2 -translate-y-1/2 h-3 bg-success/40 border-y-2 border-success"
          :style="{ left: `${toleranceStart}%`, width: `${toleranceWidth}%` }"
        ></div>

        <!-- Pixel markers -->
        <div class="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
          <template v-for="i in 11" :key="i">
            <div class="w-0.5 h-1.5 bg-black/30"></div>
          </template>
        </div>

        <!-- Slider Handle -->
        <div
          class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform"
          :class="{ 'scale-110': isDragging }"
          :style="{ left: `${sliderPosition}%` }"
        >
          <div class="w-4 h-4 bg-primary border-2 border-black rotate-45"></div>
        </div>
      </div>

      <!-- Min/Max Labels -->
      <div class="flex justify-between mt-1 text-xs font-bold">
        <span class="bg-black text-white px-1.5 py-0.5">{{ localConfig.min }}</span>
        <span class="bg-black text-white px-1.5 py-0.5">{{ localConfig.max }}</span>
      </div>
    </div>

    <!-- Configuration Row: Min / Correct / Max -->
    <div class="grid grid-cols-3 gap-2">
      <!-- Min Value -->
      <div class="border-2 border-black p-2 bg-white pixel-shadow">
        <label class="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Min</label>
        <div class="flex items-center gap-1">
          <button
            class="w-6 h-6 bg-gray-200 border border-black text-sm font-bold hover:bg-gray-300 active:translate-y-px"
            @click="localConfig.min--; updateConfig()"
          >-</button>
          <input
            v-model.number="localConfig.min"
            type="number"
            class="w-full px-1 py-1 border-2 border-black bg-white text-center text-sm font-bold focus:border-primary focus:outline-none"
            @change="updateConfig"
          />
          <button
            class="w-6 h-6 bg-gray-200 border border-black text-sm font-bold hover:bg-gray-300 active:translate-y-px"
            @click="localConfig.min++; updateConfig()"
          >+</button>
        </div>
      </div>

      <!-- Correct Value -->
      <div class="border-2 border-primary p-2 bg-primary/5 pixel-shadow">
        <label class="block text-[10px] font-bold text-primary mb-1 uppercase">Correct</label>
        <div class="flex items-center gap-1">
          <button
            class="w-6 h-6 bg-primary text-white border border-black text-sm font-bold hover:brightness-110 active:translate-y-px"
            @click="localConfig.correctValue = Math.max(localConfig.min, localConfig.correctValue - 1); updateConfig()"
          >-</button>
          <input
            v-model.number="localConfig.correctValue"
            type="number"
            :min="localConfig.min"
            :max="localConfig.max"
            class="w-full px-1 py-1 border-2 border-primary bg-white text-center text-sm font-bold focus:outline-none"
            @change="updateConfig"
          />
          <button
            class="w-6 h-6 bg-primary text-white border border-black text-sm font-bold hover:brightness-110 active:translate-y-px"
            @click="localConfig.correctValue = Math.min(localConfig.max, localConfig.correctValue + 1); updateConfig()"
          >+</button>
        </div>
      </div>

      <!-- Max Value -->
      <div class="border-2 border-black p-2 bg-white pixel-shadow">
        <label class="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Max</label>
        <div class="flex items-center gap-1">
          <button
            class="w-6 h-6 bg-gray-200 border border-black text-sm font-bold hover:bg-gray-300 active:translate-y-px"
            @click="localConfig.max--; updateConfig()"
          >-</button>
          <input
            v-model.number="localConfig.max"
            type="number"
            class="w-full px-1 py-1 border-2 border-black bg-white text-center text-sm font-bold focus:border-primary focus:outline-none"
            @change="updateConfig"
          />
          <button
            class="w-6 h-6 bg-gray-200 border border-black text-sm font-bold hover:bg-gray-300 active:translate-y-px"
            @click="localConfig.max++; updateConfig()"
          >+</button>
        </div>
      </div>
    </div>

    <!-- Tolerance Selection -->
    <div class="border-2 border-black p-2 bg-white pixel-shadow">
      <label class="block text-[10px] font-bold text-foreground mb-1.5 uppercase">Tolerance Level</label>

      <div class="flex gap-1">
        <button
          v-for="option in marginOptions"
          :key="option.value"
          class="flex-1 p-1.5 border-2 transition-all text-center"
          :class="localConfig.margin === option.value
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-black bg-white text-foreground hover:bg-primary/5'"
          @click="localConfig.margin = option.value; updateConfig()"
        >
          <!-- Pixel bars indicator -->
          <div class="flex justify-center gap-px mb-0.5">
            <div
              v-for="bar in 5"
              :key="bar"
              class="w-1 h-2.5 border transition-colors"
              :class="bar <= option.bars
                ? (localConfig.margin === option.value ? 'bg-primary border-primary' : 'bg-foreground border-foreground')
                : 'bg-transparent border-border'"
            ></div>
          </div>
          <div class="text-[9px] font-bold">{{ option.label }}</div>
        </button>
      </div>

      <!-- Tolerance info -->
      <div class="mt-1.5 px-2 py-1 bg-primary/10 border-2 border-black flex items-center justify-between text-xs">
        <span class="text-foreground font-medium">Accepted:</span>
        <span class="text-primary font-bold font-mono">
          {{ toleranceRange.min }} – {{ toleranceRange.max }}
        </span>
      </div>
    </div>
  </div>
</template>
