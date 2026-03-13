import { computed } from 'vue';

export const DEFAULT_SLIDER_CONFIG = {
  min: 0,
  max: 100,
  correctValue: 50,
  margin: 'medium',
  unit: ''
};

// Must stay in sync with backend scoring logic in
// `backend/src/socket/broadcastEvents.js`
const SLIDER_MARGINS = {
  none: 0,
  low: 0.05,
  medium: 0.1,
  high: 0.2,
  max: 0.5
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Shared helpers for slider questions, used by both the host
 * (`GameControlPage.vue`) and player (`PlayerGamePage.vue`) UIs.
 *
 * @param {object} options
 * @param {import('vue').Ref<object|null|undefined>} options.configRef
 * @param {import('vue').Ref<Record<string, number>>} [options.distributionRef]
 */
export function useSliderQuestion({ configRef, distributionRef }) {
  const sliderConfig = computed(() => {
    const raw = configRef?.value || {};
    return {
      ...DEFAULT_SLIDER_CONFIG,
      ...raw
    };
  });

  const sliderAcceptedRange = computed(() => {
    const config = sliderConfig.value;
    const min = Number(config.min ?? 0);
    const max = Number(config.max ?? 100);
    const safeMin = Math.min(min, max);
    const safeMax = Math.max(min, max);
    const correctValue = Number(config.correctValue ?? 0);
    const range = Math.max(1, safeMax - safeMin);
    const tolerance = range * (SLIDER_MARGINS[config.margin] || 0);
    const rawMinAccepted = Math.max(safeMin, correctValue - tolerance);
    const rawMaxAccepted = Math.min(safeMax, correctValue + tolerance);

    let minAccepted = Math.ceil(rawMinAccepted);
    let maxAccepted = Math.floor(rawMaxAccepted);

    if (maxAccepted < minAccepted) {
      const nearestValid = clamp(Math.round(correctValue), safeMin, safeMax);
      minAccepted = nearestValid;
      maxAccepted = nearestValid;
    }

    return { min: minAccepted, max: maxAccepted };
  });

  const hasSliderAcceptedRangeWidth = computed(
    () => Math.abs(sliderAcceptedRange.value.max - sliderAcceptedRange.value.min) > 0.001
  );

  const sliderEntries = computed(() => {
    if (!distributionRef?.value) return [];

    return Object.entries(distributionRef.value)
      .map(([rawValue, count]) => ({
        rawValue,
        value: Number(rawValue),
        count
      }))
      .filter((entry) => Number.isFinite(entry.value) && entry.count > 0)
      .sort((a, b) => a.value - b.value);
  });

  const totalDistributionAnswers = computed(() => {
    if (!distributionRef?.value) return 0;
    return Object.values(distributionRef.value).reduce((sum, count) => sum + count, 0);
  });

  const sliderAverageValue = computed(() => {
    if (!sliderEntries.value.length || !totalDistributionAnswers.value) return null;

    const weightedTotal = sliderEntries.value
      .reduce((sum, entry) => sum + (entry.value * entry.count), 0);

    return Math.round(weightedTotal / totalDistributionAnswers.value);
  });

  function getSliderPosition(value) {
    const min = sliderConfig.value.min ?? 0;
    const max = sliderConfig.value.max ?? 100;
    const range = max - min;

    if (range <= 0) return 50;

    const clamped = Math.min(Math.max(value, min), max);
    return ((clamped - min) / range) * 100;
  }

  function isSliderValueCorrect(value) {
    const accepted = sliderAcceptedRange.value;
    return value >= accepted.min && value <= accepted.max;
  }

  function formatSliderValue(value) {
    const normalized = Math.round(Number(value) || 0);
    const unit = sliderConfig.value.unit ? ` ${sliderConfig.value.unit}` : '';
    return `${normalized}${unit}`;
  }

  function formatSliderRangeValue(value) {
    return `${Math.round(Number(value) || 0)}${sliderConfig.value.unit ? ` ${sliderConfig.value.unit}` : ''}`;
  }

  function formatAcceptedSliderRange() {
    if (!hasSliderAcceptedRangeWidth.value) {
      return formatSliderRangeValue(sliderAcceptedRange.value.min);
    }

    return `${formatSliderRangeValue(sliderAcceptedRange.value.min)} - ${formatSliderRangeValue(sliderAcceptedRange.value.max)}`;
  }

  return {
    sliderConfig,
    sliderAcceptedRange,
    hasSliderAcceptedRangeWidth,
    sliderEntries,
    totalDistributionAnswers,
    sliderAverageValue,
    getSliderPosition,
    isSliderValueCorrect,
    formatSliderValue,
    formatSliderRangeValue,
    formatAcceptedSliderRange
  };
}

