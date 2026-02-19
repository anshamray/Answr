import { ref } from 'vue';
import { TIMING } from '../constants/index.js';

/**
 * Composable for shake animation state management
 * @returns {{ shake: Ref<boolean>, triggerShake: Function }}
 */
export function useShakeAnimation() {
  const shake = ref(false);

  function triggerShake() {
    shake.value = true;
    setTimeout(() => {
      shake.value = false;
    }, TIMING.SHAKE_DURATION);
  }

  return { shake, triggerShake };
}
