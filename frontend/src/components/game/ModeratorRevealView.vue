<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { isExternalVideoUrl, getExternalVideoEmbedUrl } from '../../lib/mediaService.js';

import PixelBadge from '../PixelBadge.vue';
import PixelButton from '../PixelButton.vue';
import PixelCard from '../PixelCard.vue';
import PixelCheck from '../icons/PixelCheck.vue';

const props = defineProps({
  currentQuestion: { type: Object, required: true },
  isLastQuestion: { type: Boolean, required: true },
  answersReceived: { type: Number, required: true },
  playerCount: { type: Number, required: true },
  totalDistributionAnswers: { type: Number, required: true },
  isSliderQuestion: { type: Boolean, required: true },
  isSortQuestion: { type: Boolean, required: true },
  isPinAnswerQuestion: { type: Boolean, required: true },
  isTypeAnswerQuestion: { type: Boolean, required: true },
  isWordCloudQuestion: { type: Boolean, required: true },
  barBg: { type: Array, required: true },
  barLabels: { type: Array, required: true },
  answerGradients: { type: Array, required: true },
  // Helper functions
  getCount: { type: Function, required: true },
  getPercentage: { type: Function, required: true },
  getBarWidth: { type: Function, required: true },
  getCorrectCount: { type: Function, required: true },
  getAccuracyPercentage: { type: Function, required: true },
  getCorrectAnswerLabel: { type: Function, required: true },
  // Computed collections
  acceptedTypeAnswers: { type: Array, required: true },
  textAnswerEntries: { type: Array, required: true },
  wordCloudEntries: { type: Array, required: true },
  correctSortOrderIds: { type: Array, required: true },
  topSortAnswerEntries: { type: Array, required: true },
  answerTextById: { type: Object, required: true },
  pinAnswerEntries: { type: Array, required: true },
  // Slider stats
  sliderConfig: { type: Object, required: true },
  sliderEntries: { type: Array, required: true },
  sliderAverageValue: { type: Number, required: false, default: null },
  hasSliderAcceptedRangeWidth: { type: Boolean, required: true },
  sliderAcceptedRange: { type: Object, required: true },
  getSliderPosition: { type: Function, required: true },
  isSliderValueCorrect: { type: Function, required: true },
  formatSliderValue: { type: Function, required: true },
  formatAcceptedSliderRange: { type: Function, required: true },
  // Player rows + leaderboard
  playerAnswerRows: { type: Array, required: true },
  top5: { type: Array, required: true },
  gameSettings: { type: Object, required: true },
  // Media
  pinQuestionMediaUrl: { type: String, required: false, default: null },
  showPinResultsFullscreen: { type: Boolean, required: true },
  isCollectOpinions: { type: Boolean, required: false, default: false }
});

const emit = defineEmits(['next-question', 'end-button-click', 'toggle-pin-fullscreen']);

const { t } = useI18n();

const isScoredQuestion = computed(() => {
  if (props.isCollectOpinions) return false;
  const points = props.currentQuestion?.points;
  return typeof points === 'number' && points > 0;
});

const hasLeaderboard = computed(() =>
  props.gameSettings.showLeaderboard &&
  props.top5.length > 0 &&
  isScoredQuestion.value
);

const revealMediaUrl = computed(() => props.currentQuestion?.revealMediaUrl || null);
const revealMediaEmbedUrl = computed(() => {
  const url = revealMediaUrl.value;
  if (!url || !isExternalVideoUrl(url)) return null;
  return getExternalVideoEmbedUrl(url);
});

const revealMediaExpanded = ref(false);
</script>

<template>
  <main class="flex-1 p-3 sm:p-4 bg-gradient-to-br from-success/10 via-primary/5 to-secondary/5">
    <div class="max-w-7xl mx-auto space-y-4">
      <!-- Optional reveal media (collapsed preview card, expandable on click) -->
      <div v-if="revealMediaUrl" class="w-full">
        <PixelCard class="!p-3 sm:!p-4 space-y-2">
          <button
            type="button"
            class="w-full flex items-center justify-between gap-2 text-left"
            @click="revealMediaExpanded = !revealMediaExpanded"
          >
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 flex items-center justify-center border-[2px] border-black bg-primary text-primary-foreground text-xs font-bold pixel-font">
                ▶
              </div>
              <div class="flex flex-col">
                <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {{ t('questionEditor.revealMediaOptional') }}
                </span>
                <span class="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-sm">
                  {{ revealMediaUrl }}
                </span>
              </div>
            </div>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="flex-shrink-0 transition-transform"
              :class="{ 'rotate-180': revealMediaExpanded }"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <div v-if="revealMediaExpanded" class="pt-2">
            <div
              v-if="revealMediaEmbedUrl"
              class="w-full max-w-3xl aspect-video border-[4px] border-black bg-black overflow-hidden mx-auto"
            >
              <iframe
                :src="revealMediaEmbedUrl"
                class="w-full h-full"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
            <div
              v-else
              class="mt-2 flex justify-center w-full"
            >
              <img
                :src="revealMediaUrl"
                :alt="currentQuestion.text"
                class="border-[4px] border-black max-h-[min(18rem,calc(100vh-26rem))] max-w-full object-contain"
              />
            </div>
          </div>
        </PixelCard>
      </div>

      <!-- Header -->
      <div class="flex items-center justify-between flex-wrap gap-3">
        <PixelBadge variant="success" class="text-base px-4 py-2">
          <PixelCheck class="inline mr-2" :size="16" />
          <span v-if="isCollectOpinions">
            Opinions summary
          </span>
          <span v-else>
            {{ t('gameControl.correctAnswer') }}: {{ getCorrectAnswerLabel() }}
          </span>
        </PixelBadge>

        <PixelButton
          v-if="!isLastQuestion"
          variant="primary"
          class="text-lg px-6 py-3"
          @click="emit('next-question')"
        >
          {{ t('gameControl.nextQuestion') }}
          <svg
            class="inline ml-2"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </PixelButton>
      </div>

      <p
        v-if="isCollectOpinions"
        class="text-xs text-muted-foreground mt-1"
      >
        Share results with care – comments may contain sensitive feedback.
      </p>

      <div class="grid gap-4" :class="hasLeaderboard ? 'lg:grid-cols-3' : ''">
        <!-- Answer Distribution / Results -->
        <div class="space-y-4" :class="hasLeaderboard ? 'lg:col-span-2' : ''">
          <!-- MC / TF / Poll distribution -->
          <PixelCard
            v-if="currentQuestion.answers && currentQuestion.answers.length > 0 && !['pin-answer', 'type-answer', 'sort'].includes(currentQuestion.type) && !isSliderQuestion"
            class="space-y-3 !p-4"
          >
            <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>

            <div class="space-y-2">
              <div
                v-for="(answer, i) in currentQuestion.answers"
                :key="answer._id"
                class="space-y-1"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div
                      class="w-8 h-8 text-white border-2 border-black flex items-center justify-center font-bold text-sm pixel-font"
                      :class="barBg[i % barBg.length]"
                    >
                      {{ barLabels[i] }}
                    </div>
                    <span class="text-sm sm:text-base font-bold leading-snug break-words max-w-xs sm:max-w-sm">
                      {{ answer.text }}
                    </span>
                    <PixelBadge v-if="answer.isCorrect" variant="success" class="ml-1 text-xs">
                      <PixelCheck class="inline mr-1" :size="10" />
                      {{ t('session.correct') }}
                    </PixelBadge>
                  </div>
                  <div class="text-right">
                    <span class="text-lg font-bold">{{ getCount(answer._id) }}</span>
                    <span class="text-xs text-muted-foreground ml-1">
                      ({{ getPercentage(answer._id) }}%)
                    </span>
                  </div>
                </div>

                <div class="relative h-4 bg-muted border-2 border-border">
                  <div
                    class="absolute left-0 top-0 h-full transition-all duration-1000 ease-out"
                    :class="[barBg[i % barBg.length], answer.isCorrect ? 'border-2 border-success' : '']"
                    :style="{ width: getBarWidth(answer._id) }"
                  />
                </div>
              </div>
            </div>
          </PixelCard>

          <!-- Slider results -->
          <PixelCard v-else-if="isSliderQuestion" class="space-y-4 !p-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
              <PixelBadge variant="secondary" class="text-xs">
                {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
              </PixelBadge>
            </div>

            <div class="space-y-4">
              <div class="relative px-2 pt-10 pb-8">
                <div
                  v-if="hasSliderAcceptedRangeWidth"
                  class="absolute top-1/2 h-4 -translate-y-1/2 border-2 border-success bg-success/20"
                  :style="{
                    left: `${getSliderPosition(sliderAcceptedRange.min)}%`,
                    width: `${Math.max(
                      getSliderPosition(sliderAcceptedRange.max) -
                        getSliderPosition(sliderAcceptedRange.min),
                      2
                    )}%`
                  }"
                />

                <div class="relative h-4 border-2 border-black bg-muted">
                  <div
                    class="absolute top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 bg-success border border-black"
                    :style="{ left: `${getSliderPosition(sliderConfig.correctValue ?? 0)}%` }"
                  />

                  <div
                    v-for="entry in sliderEntries"
                    :key="entry.rawValue"
                    class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    :style="{ left: `${getSliderPosition(entry.value)}%` }"
                  >
                    <div
                      class="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 text-xs font-bold border-2 border-black whitespace-nowrap"
                      :class="isSliderValueCorrect(entry.value)
                        ? 'bg-success text-white'
                        : 'bg-white text-foreground'"
                    >
                      {{ entry.count }} x {{ formatSliderValue(entry.value) }}
                    </div>
                    <div
                      class="h-6 w-6 border-2 border-black rotate-45"
                      :class="isSliderValueCorrect(entry.value) ? 'bg-success' : 'bg-primary'"
                    />
                  </div>
                </div>

                <div class="mt-3 flex justify-between text-sm font-bold text-muted-foreground">
                  <span>{{ formatSliderValue(sliderConfig.min ?? 0) }}</span>
                  <span></span>
                  <span>{{ formatSliderValue(sliderConfig.max ?? 100) }}</span>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <PixelCard class="text-center !p-3">
                  <div class="text-sm text-muted-foreground">
                    {{ t('gameControl.correctAnswer') }}
                  </div>
                  <div class="text-xl font-bold text-success">
                    {{ formatSliderValue(sliderConfig.correctValue ?? 0) }}
                  </div>
                </PixelCard>
                <PixelCard class="text-center !p-3">
                  <div class="text-sm text-muted-foreground">
                    {{ t('gameControl.averageAnswer') }}
                  </div>
                  <div class="text-xl font-bold text-primary">
                    {{ sliderAverageValue == null ? '—' : formatSliderValue(sliderAverageValue) }}
                  </div>
                </PixelCard>
                <PixelCard class="text-center !p-3">
                  <div class="text-sm text-muted-foreground">
                    {{ t('gameControl.acceptedRange') }}
                  </div>
                  <div class="text-lg font-bold text-accent">
                    {{ formatAcceptedSliderRange() }}
                  </div>
                </PixelCard>
              </div>
            </div>
          </PixelCard>

          <!-- Sort results -->
          <PixelCard v-else-if="isSortQuestion" class="space-y-4 !p-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
              <PixelBadge variant="secondary" class="text-xs">
                {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
              </PixelBadge>
            </div>

            <div class="grid gap-4 lg:grid-cols-2">
              <div class="space-y-3">
                <h3 class="text-sm font-bold uppercase text-muted-foreground">
                  {{ t('gameControl.correctOrder') }}
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="(answerId, index) in correctSortOrderIds"
                    :key="answerId"
                    class="flex items-center gap-3 border-[3px] border-success bg-success/10 px-3 py-3"
                  >
                    <div
                      class="w-8 h-8 bg-success text-white border-2 border-black flex items-center justify-center font-bold pixel-font"
                    >
                      {{ index + 1 }}
                    </div>
                    <div class="font-bold text-sm sm:text-base leading-snug break-words">
                      {{ answerTextById.get(answerId) || '—' }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <h3 class="text-sm font-bold uppercase text-muted-foreground">
                  {{ t('gameControl.commonOrders') }}
                </h3>
                <div v-if="topSortAnswerEntries.length > 0" class="space-y-2">
                  <div
                    v-for="entry in topSortAnswerEntries"
                    :key="entry.rawOrder"
                    class="border-[3px] px-3 py-3 space-y-2"
                    :class="entry.isCorrect ? 'border-success bg-success/10' : 'border-black bg-white'"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <PixelBadge :variant="entry.isCorrect ? 'success' : 'secondary'" class="text-[11px]">
                        {{ entry.isCorrect ? t('gameControl.exactMatches') : t('gameControl.commonOrder') }}
                      </PixelBadge>
                      <div class="text-right">
                        <span class="text-lg font-bold">{{ entry.count }}</span>
                        <span class="text-xs text-muted-foreground ml-1">
                          ({{ Math.round((entry.count / Math.max(totalDistributionAnswers, 1)) * 100) }}%)
                        </span>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <div
                        v-for="(answerId, index) in entry.orderIds"
                        :key="`${entry.rawOrder}-${answerId}-${index}`"
                        class="flex items-center gap-2 text-sm"
                      >
                        <span
                          class="w-6 h-6 border-2 border-black bg-muted flex items-center justify-center font-bold pixel-font text-xs"
                        >
                          {{ index + 1 }}
                        </span>
                        <span class="font-medium leading-snug break-words">
                          {{ answerTextById.get(answerId) || '—' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="border-[3px] border-dashed border-border bg-muted/30 px-4 py-6 text-center text-muted-foreground"
                >
                  {{ t('gameControl.noSortSubmissions') }}
                </div>
              </div>
            </div>
          </PixelCard>

          <!-- Pin-answer results -->
          <PixelCard v-else-if="isPinAnswerQuestion" class="space-y-4 !p-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
              <PixelBadge variant="secondary" class="text-xs">
                {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
              </PixelBadge>
            </div>

            <div class="flex flex-wrap gap-2 text-xs font-bold">
              <PixelBadge variant="success" class="text-[11px]">
                {{ t('gameControl.correctArea') }}
              </PixelBadge>
              <PixelBadge variant="secondary" class="text-[11px]">
                {{ t('gameControl.playerPins') }}: {{ pinAnswerEntries.length }}
              </PixelBadge>
            </div>

            <div class="border-[3px] border-black bg-black p-2 sm:p-3">
              <div
                v-if="pinQuestionMediaUrl"
                class="relative mx-auto w-fit max-w-full overflow-hidden cursor-zoom-in"
                @click="emit('toggle-pin-fullscreen')"
              >
                <img
                  :src="pinQuestionMediaUrl"
                  :alt="currentQuestion.text"
                  class="block max-h-[min(20rem,calc(100vh-26rem))] max-w-full object-contain"
                />

                <div
                  v-if="currentQuestion.pinConfig"
                  class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 border-[3px] border-success bg-success/20 shadow-[3px_3px_0_rgba(0,0,0,0.9)] rotate-45"
                  :style="{
                    left: `${currentQuestion.pinConfig.x}%`,
                    top: `${currentQuestion.pinConfig.y}%`,
                    width: `${(currentQuestion.pinConfig.radius || 8) * 2}%`,
                    height: `${(currentQuestion.pinConfig.radius || 8) * 2}%`
                  }"
                ></div>
                <div
                  v-if="currentQuestion.pinConfig"
                  class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  :style="{ left: `${currentQuestion.pinConfig.x}%`, top: `${currentQuestion.pinConfig.y}%` }"
                >
                  <div
                    class="flex h-7 w-7 items-center justify-center border-[3px] border-black bg-success text-xs font-bold text-white shadow-[3px_3px_0_#000] rotate-45"
                  >
                    <div class="-rotate-45">
                      ✓
                    </div>
                  </div>
                </div>

                <div
                  v-for="entry in pinAnswerEntries"
                  :key="entry.playerId"
                  class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  :style="{ left: `${entry.coords.x}%`, top: `${entry.coords.y}%` }"
                >
                  <div
                    class="flex h-6 w-6 items-center justify-center border-[3px] border-black text-[10px] font-bold text-white shadow-[3px_3px_0_#000] rotate-45"
                    :class="entry.isCorrect ? 'bg-success' : 'bg-destructive'"
                  >
                    <div class="-rotate-45">
                      {{ entry.label }}
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="flex min-h-48 items-center justify-center px-6 py-10 text-center text-muted-foreground"
              >
                {{ t('playerGame.imageNotAvailable') }}
              </div>
            </div>

            <div
              v-if="pinAnswerEntries.length === 0"
              class="border-[3px] border-dashed border-border bg-muted/30 px-4 py-6 text-center text-muted-foreground"
            >
              {{ t('gameControl.noPinSubmissions') }}
            </div>
          </PixelCard>

          <!-- Word cloud results -->
          <PixelCard v-else-if="isWordCloudQuestion" class="space-y-4 !p-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
              <PixelBadge variant="secondary" class="text-xs">
                {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
              </PixelBadge>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-bold uppercase text-muted-foreground">
                {{ t('gameControl.submittedAnswers') }}
              </h3>

              <div v-if="wordCloudEntries.length > 0" class="flex flex-wrap gap-3">
                <div
                  v-for="entry in wordCloudEntries"
                  :key="entry.key"
                  class="px-3 py-2 border-[3px] border-black bg-white shadow-sm flex items-center gap-2"
                >
                  <span class="font-bold text-base md:text-lg break-words">
                    {{ entry.text }}
                  </span>
                  <span class="text-xs text-muted-foreground">
                    ×{{ entry.count }}
                  </span>
                </div>
              </div>

              <div
                v-else
                class="border-[3px] border-dashed border-border bg-muted/30 px-4 py-6 text-center text-muted-foreground"
              >
                {{ t('gameControl.noTypeSubmissions') }}
              </div>
            </div>
          </PixelCard>

          <!-- Type-answer results -->
          <PixelCard v-else-if="isTypeAnswerQuestion" class="space-y-4 !p-4">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
              <PixelBadge variant="secondary" class="text-xs">
                {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
              </PixelBadge>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-bold uppercase text-muted-foreground">
                {{ t('gameControl.acceptedAnswers') }}
              </h3>
              <div class="flex flex-wrap gap-2">
                <PixelBadge
                  v-for="answer in acceptedTypeAnswers"
                  :key="answer"
                  variant="success"
                  class="text-xs"
                >
                  {{ answer }}
                </PixelBadge>
              </div>
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-bold uppercase text-muted-foreground">
                {{ t('gameControl.submittedAnswers') }}
              </h3>

              <div v-if="textAnswerEntries.length > 0" class="space-y-2">
                <div
                  v-for="entry in textAnswerEntries"
                  :key="entry.key"
                  class="flex items-center justify-between gap-3 border-[3px] px-3 py-3"
                  :class="entry.isCorrect ? 'border-success bg-success/10' : 'border-black bg-white'"
                >
                  <div class="min-w-0">
                    <div class="font-bold break-words">{{ entry.text }}</div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <PixelBadge :variant="entry.isCorrect ? 'success' : 'secondary'" class="text-[11px]">
                      {{ entry.isCorrect ? t('session.correct') : t('gameControl.answered') }}
                    </PixelBadge>
                    <div class="text-right">
                      <span class="text-lg font-bold">{{ entry.count }}</span>
                      <span class="text-xs text-muted-foreground ml-1">
                        ({{ Math.round((entry.count / Math.max(answersReceived, 1)) * 100) }}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="border-[3px] border-dashed border-border bg-muted/30 px-4 py-6 text-center text-muted-foreground"
              >
                {{ t('gameControl.noTypeSubmissions') }}
              </div>
            </div>
          </PixelCard>

          <!-- Generic summary -->
          <PixelCard v-else class="space-y-3 !p-4">
            <h2 class="text-xl lg:text-2xl font-bold">{{ t('gameControl.howPlayersAnswered') }}</h2>
            <p class="text-muted-foreground">
              {{ answersReceived }} / {{ playerCount }} {{ t('gameControl.answered') }}
            </p>
          </PixelCard>

          <!-- Summary cards (only for scored questions) -->
          <div v-if="isScoredQuestion" class="grid grid-cols-3 gap-3">
            <PixelCard class="text-center !p-3">
              <div class="text-2xl font-bold text-success">{{ getCorrectCount() }}</div>
              <div class="text-xs text-muted-foreground">{{ t('gameControl.gotItRight') }}</div>
            </PixelCard>
            <PixelCard class="text-center !p-3">
              <div class="text-2xl font-bold text-primary">{{ answersReceived }}</div>
              <div class="text-xs text-muted-foreground">{{ t('gameControl.answered') }}</div>
            </PixelCard>
            <PixelCard class="text-center !p-3">
              <div class="text-2xl font-bold text-accent">
                {{ getAccuracyPercentage() }}%
              </div>
              <div class="text-xs text-muted-foreground">{{ t('gameControl.accuracy') }}</div>
            </PixelCard>
          </div>

          <!-- Per-player answers (only for scored questions) -->
          <PixelCard v-if="isScoredQuestion && playerAnswerRows.length > 0" class="space-y-2 !p-4">
            <h3 class="text-sm font-bold uppercase text-muted-foreground">
              {{ t('gameControl.playerAnswers') }}
            </h3>
            <div class="max-h-64 overflow-y-auto border border-border">
              <table class="w-full text-sm">
                <thead class="bg-muted/60 border-b border-border">
                  <tr>
                    <th class="text-left px-3 py-2 font-semibold w-1/4">
                      {{ t('analytics.player') }}
                    </th>
                    <th class="text-left px-3 py-2 font-semibold">
                      {{ t('session.answer') }}
                    </th>
                    <th class="text-right px-3 py-2 font-semibold w-20">
                      {{ t('session.correct') }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in playerAnswerRows"
                    :key="row.playerId"
                    class="border-b border-border last:border-b-0"
                  >
                    <td class="px-3 py-1.5 font-medium truncate">
                      {{ row.name }}
                    </td>
                    <td class="px-3 py-1.5 text-foreground/90 truncate">
                      {{ row.answer || '—' }}
                    </td>
                    <td class="px-3 py-1.5 text-right">
                      <span
                        v-if="row.isCorrect"
                        class="inline-flex items-center gap-1 text-xs font-semibold text-success"
                      >
                        <PixelCheck :size="12" />
                        {{ t('session.correct') }}
                      </span>
                      <span
                        v-else
                        class="inline-flex items-center gap-1 text-xs font-semibold text-destructive"
                      >
                        ✕
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </PixelCard>
        </div>

        <!-- Leaderboard -->
        <div v-if="hasLeaderboard" class="lg:col-span-1">
          <PixelCard variant="primary" class="space-y-2 !p-4">
            <div class="flex items-center gap-2">
              <svg
                class="text-warning"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              <h3 class="text-xl font-bold">{{ t('gameControl.top5') }}</h3>
            </div>

            <div class="space-y-2">
              <div
                v-for="entry in top5"
                :key="entry.playerId"
                class="flex items-center gap-2 p-2 border-2"
                :class="
                  entry.position === 1
                    ? 'border-warning bg-warning/10'
                    : entry.position === 2
                      ? 'border-muted-foreground/30 bg-muted-foreground/5'
                      : entry.position === 3
                        ? 'border-accent/30 bg-accent/5'
                        : 'border-border bg-white'
                "
              >
                <div
                  class="flex-shrink-0 w-8 h-8 flex items-center justify-center font-bold border-2 border-black text-sm"
                  :class="
                    entry.position === 1
                      ? 'bg-warning text-warning-foreground'
                      : entry.position === 2
                        ? 'bg-muted-foreground text-white'
                        : entry.position === 3
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted text-muted-foreground'
                  "
                >
                  {{ entry.position }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-sm truncate">
                    {{ entry.nickname }}
                  </div>
                </div>
                <div class="text-right text-sm font-bold text-muted-foreground">
                  <div>
                    {{ entry.score?.toLocaleString() }}
                  </div>
                  <div
                    v-if="entry.delta != null"
                    class="text-[11px] font-semibold"
                    :class="entry.delta > 0 ? 'text-emerald-900' : 'text-muted-foreground'"
                  >
                    +{{ (entry.delta || 0).toLocaleString() }}
                  </div>
                </div>
              </div>
            </div>
          </PixelCard>
        </div>
      </div>
    </div>
  </main>

  <!-- Footer controls -->
  <footer class="border-t-[3px] border-black bg-white px-4 py-3 flex justify-center gap-3">
    <PixelButton
      v-if="!isLastQuestion"
      variant="primary"
      @click="emit('next-question')"
    >
      {{ t('gameControl.nextQuestion') }}
    </PixelButton>
    <PixelButton
      variant="outline"
      @click="emit('end-button-click')"
    >
      {{ isLastQuestion ? t('gameControl.showResults') : t('gameControl.endGame') }}
    </PixelButton>
  </footer>
</template>

