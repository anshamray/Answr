import { onUnmounted } from 'vue';
import { getSocket } from '../lib/socket.js';

/**
 * Composable for managing socket event listener cleanup
 * @param {string[]} eventNames - Array of event names to clean up on unmount
 * @returns {{ cleanup: Function }} Object with cleanup function
 */
export function useSocketCleanup(eventNames = []) {
  function cleanup() {
    const socket = getSocket();
    if (socket) {
      eventNames.forEach(name => socket.off(name));
    }
  }

  onUnmounted(cleanup);

  return { cleanup };
}
