import { io } from 'socket.io-client';

// TODO: WebSocket Service für Echtzeit-Kommunikation
//
// Funktionen:
// - connect() - Verbindung aufbauen
// - disconnect() - Verbindung trennen
// - joinGame(sessionId, playerId) - Spiel beitreten
// - submitAnswer(data) - Antwort senden
// - onNewQuestion(callback) - Event-Listener für neue Fragen
// - onLeaderboard(callback) - Event-Listener für Rangliste

let socket = null;

export const socketService = {
  connect(url = 'http://localhost:3000') {
    socket = io(url);
    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
    }
  }
};
