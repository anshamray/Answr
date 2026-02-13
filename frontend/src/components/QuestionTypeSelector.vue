<script setup>
import PixelButton from './PixelButton.vue';

const emit = defineEmits(['select', 'close']);

// Scored question types (test knowledge)
const scoredTypes = [
  {
    type: 'multiple-choice',
    name: 'Multiple Choice',
    description: 'Players select one or more correct answers from 2-6 options',
    icon: 'grid'
  },
  {
    type: 'true-false',
    name: 'True / False',
    description: 'Simple binary choice between true and false',
    icon: 'check'
  },
  {
    type: 'type-answer',
    name: 'Type Answer',
    description: 'Players type their answer, matched against accepted answers',
    icon: 'type'
  },
  {
    type: 'puzzle',
    name: 'Puzzle',
    description: 'Arrange 3-4 items in the correct order',
    icon: 'puzzle'
  },
  {
    type: 'slider',
    name: 'Slider',
    description: 'Players slide to select a numeric value within a range',
    icon: 'sliders'
  },
  {
    type: 'quiz-audio',
    name: 'Audio Quiz',
    description: 'Question is read aloud in selected language',
    icon: 'volume'
  },
  {
    type: 'pin-answer',
    name: 'Pin on Image',
    description: 'Players click on the correct location on an image',
    icon: 'map-pin'
  }
];

// Opinion question types (no points)
const opinionTypes = [
  {
    type: 'poll',
    name: 'Poll',
    description: 'Collect opinions with multiple choice (no correct answer)',
    icon: 'bar-chart',
    comingSoon: true
  },
  {
    type: 'word-cloud',
    name: 'Word Cloud',
    description: 'Collect single-word responses, display as cloud',
    icon: 'cloud',
    comingSoon: true
  },
  {
    type: 'brainstorm',
    name: 'Brainstorm',
    description: 'Players submit ideas, then vote on favorites',
    icon: 'lightbulb',
    comingSoon: true
  },
  {
    type: 'drop-pin',
    name: 'Drop Pin',
    description: 'Players drop pins on an image (no correct answer)',
    icon: 'target',
    comingSoon: true
  },
  {
    type: 'open-ended',
    name: 'Open Ended',
    description: 'Collect free-form text responses',
    icon: 'message',
    comingSoon: true
  },
  {
    type: 'scale',
    name: 'Scale',
    description: 'Rate on a Likert or custom scale',
    icon: 'sliders',
    comingSoon: true
  },
  {
    type: 'nps-scale',
    name: 'NPS Scale',
    description: 'Net Promoter Score (0-10) rating',
    icon: 'trending-up',
    comingSoon: true
  }
];

function selectType(type) {
  emit('select', type);
}

function handleBackdropClick(e) {
  if (e.target === e.currentTarget) {
    emit('close');
  }
}

function getIcon(iconName) {
  const icons = {
    grid: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>`,
    check: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>`,
    type: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" />
    </svg>`,
    puzzle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.743-.952a2.5 2.5 0 0 0-2.5-2.5c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5a2.5 2.5 0 0 0 2.146-1.209.98.98 0 0 1 .952.743c.07.47-.166.8-.276.837l-1.611 1.611a2.41 2.41 0 0 1-1.704.706c-.617 0-1.233-.235-1.704-.706l-1.568-1.568a.98.98 0 0 1-.878-.289c-.322.049-.648-.059-.878-.289l-1.568-1.568A2.41 2.41 0 0 1 7 14.565V9.435c0-.617.235-1.233.706-1.704l1.568-1.568c.47-.47 1.087-.706 1.704-.706h5.13c.617 0 1.233.235 1.704.706l1.568 1.568c.23.23.338.556.289.878z" />
    </svg>`,
    sliders: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>`,
    volume: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>`,
    'map-pin': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>`,
    'bar-chart': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>`,
    cloud: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>`,
    lightbulb: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>`,
    target: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>`,
    message: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>`,
    'trending-up': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>`
  };
  return icons[iconName] || icons.grid;
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    @click="handleBackdropClick"
  >
    <div class="bg-white border-[3px] border-black pixel-shadow max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b-[3px] border-border">
        <div>
          <h2 class="text-2xl font-bold">Add Question</h2>
          <p class="text-sm text-muted-foreground mt-1">Choose a question type to add to your quiz</p>
        </div>
        <button
          @click="$emit('close')"
          class="p-2 text-muted-foreground hover:text-foreground transition"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-8">
        <!-- Knowledge Section (Scored) -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div class="w-3 h-3 bg-primary"></div>
            <h3 class="font-bold text-lg">Test Knowledge</h3>
            <span class="text-xs text-muted-foreground">(Scored)</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="qType in scoredTypes"
              :key="qType.type"
              class="flex items-start gap-4 p-4 border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
              @click="selectType(qType.type)"
            >
              <div
                class="w-12 h-12 flex items-center justify-center bg-primary/10 border-2 border-primary/20 group-hover:border-primary transition-colors flex-shrink-0"
                v-html="getIcon(qType.icon)"
              ></div>
              <div class="flex-1 min-w-0">
                <h4 class="font-bold group-hover:text-primary transition-colors">{{ qType.name }}</h4>
                <p class="text-sm text-muted-foreground mt-1">{{ qType.description }}</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Opinion Section (No Points) -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div class="w-3 h-3 bg-secondary"></div>
            <h3 class="font-bold text-lg">Collect Opinions</h3>
            <span class="text-xs text-muted-foreground">(No Points)</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="qType in opinionTypes"
              :key="qType.type"
              class="flex items-start gap-4 p-4 border-2 border-border transition-all text-left group relative"
              :class="qType.comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:border-secondary hover:bg-secondary/5'"
              :disabled="qType.comingSoon"
              @click="!qType.comingSoon && selectType(qType.type)"
            >
              <div
                class="w-12 h-12 flex items-center justify-center bg-secondary/10 border-2 border-secondary/20 flex-shrink-0"
                :class="{ 'group-hover:border-secondary': !qType.comingSoon }"
                v-html="getIcon(qType.icon)"
              ></div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-bold" :class="{ 'group-hover:text-secondary': !qType.comingSoon }">{{ qType.name }}</h4>
                  <span v-if="qType.comingSoon" class="text-[10px] bg-muted px-2 py-0.5 font-medium">Coming soon</span>
                </div>
                <p class="text-sm text-muted-foreground mt-1">{{ qType.description }}</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t-[3px] border-border bg-muted/30">
        <PixelButton variant="outline" size="sm" @click="$emit('close')">
          Cancel
        </PixelButton>
      </div>
    </div>
  </div>
</template>
