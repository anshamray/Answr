import { io } from 'socket.io-client';

let socket = null;

export function useSocket(url = 'http://localhost:3000') {
  if (!socket) {
    socket = io(url, {
      transports: ['websocket'],
      autoConnect: true
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
