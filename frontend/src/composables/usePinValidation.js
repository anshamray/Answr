import { ref } from 'vue';
import { connectSocket, getSocket, disconnectSocket } from '../lib/socket.js';
import { TIMING, PIN_REGEX } from '../constants/index.js';

/**
 * Composable for PIN validation logic
 * @returns {Object} PIN validation utilities and state
 */
export function usePinValidation() {
  const loading = ref(false);
  const error = ref('');

  function cleanupListeners() {
    const socket = getSocket();
    if (socket) {
      socket.off('player:pin-valid');
      socket.off('player:pin-invalid');
    }
  }

  /**
   * Validate a PIN input string
   * @param {string} pin - The PIN to validate
   * @returns {{ valid: boolean, error: string }} Validation result
   */
  function validatePinFormat(pin) {
    const trimmed = pin.trim();

    if (!trimmed) {
      return { valid: false, error: 'Enter a PIN first!' };
    }

    if (!PIN_REGEX.test(trimmed)) {
      return { valid: false, error: 'PIN must be exactly 6 digits.' };
    }

    return { valid: true, error: '' };
  }

  /**
   * Check PIN with the server via socket
   * @param {string} pin - The PIN to check
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onValid - Called when PIN is valid
   * @param {Function} callbacks.onInvalid - Called when PIN is invalid
   * @param {Function} callbacks.onError - Called on timeout/error
   */
  function checkPin(pin, { onValid, onInvalid, onError }) {
    const trimmed = pin.trim();

    // Validate format first
    const validation = validatePinFormat(trimmed);
    if (!validation.valid) {
      error.value = validation.error;
      onError?.(validation.error);
      return;
    }

    loading.value = true;
    error.value = '';

    const socket = connectSocket();
    cleanupListeners();

    const timeout = setTimeout(() => {
      loading.value = false;
      const errorMsg = 'Could not reach the server. Is it running?';
      error.value = errorMsg;
      cleanupListeners();
      disconnectSocket();
      onError?.(errorMsg);
    }, TIMING.SOCKET_CONNECTION_TIMEOUT);

    socket.on('player:pin-valid', () => {
      clearTimeout(timeout);
      loading.value = false;
      cleanupListeners();
      disconnectSocket();
      onValid?.(trimmed);
    });

    socket.on('player:pin-invalid', (data) => {
      clearTimeout(timeout);
      loading.value = false;
      const errorMsg = data?.message || 'This PIN does not exist. Did you make it up?';
      error.value = errorMsg;
      cleanupListeners();
      disconnectSocket();
      onInvalid?.(errorMsg);
    });

    const emitCheck = () => {
      socket.emit('player:check-pin', { pin: trimmed });
    };

    if (socket.connected) {
      emitCheck();
    } else {
      socket.once('connect', emitCheck);
    }
  }

  return {
    loading,
    error,
    validatePinFormat,
    checkPin,
    cleanupListeners
  };
}
