<template>
  <main>
    <h1>🎮 Answr Backend Test</h1>

    <section class="connection">
      <button type="button" @click="connect" :disabled="isConnected">
        1. Verbinden
      </button>
      <button type="button" @click="disconnect" :disabled="!isConnected">
        Trennen
      </button>
      <span class="status" :data-connected="isConnected">
        Status: {{ isConnected ? 'verbunden' : 'getrennt' }}
      </span>
    </section>

    <section class="panel">
      <h2>2. Session anlegen (Moderator)</h2>
      <p class="hint">
        Klick auf „Session anlegen“, der <strong>Backend-Server erzeugt automatisch
        eine 6-stellige Zahlen-PIN</strong> und wir joinen als Moderator.
      </p>

      <div class="pin-display" v-if="sessionPin">
        Aktuelle PIN:
        <span class="pin">{{ sessionPin }}</span>
      </div>

      <label class="field">
        <span>Quiz ID (optional)</span>
        <input v-model="moderatorQuizId" placeholder="Quiz-ID (kann leer bleiben)" />
      </label>

      <div class="buttons">
        <button type="button" @click="createSession" :disabled="!isConnected">
          Session anlegen (PIN vom Backend)
        </button>
        <button type="button" @click="startGame" :disabled="!isConnected || !sessionPin">
          Spiel starten (moderator:start)
        </button>
        <button type="button" @click="nextQuestion" :disabled="!isConnected || !sessionPin">
          Nächste Frage senden (Dummy)
        </button>
        <button type="button" @click="pauseGame" :disabled="!isConnected || !sessionPin">
          Pause
        </button>
        <button type="button" @click="resumeGame" :disabled="!isConnected || !sessionPin">
          Fortsetzen
        </button>
        <button type="button" @click="endSession" :disabled="!isConnected || !sessionPin">
          Session beenden
        </button>
      </div>
    </section>

    <section class="panel">
      <h2>3. Als Spieler beitreten</h2>

      <p class="hint">
        Verwende die gleiche PIN wie oben. Wir füllen sie automatisch aus, wenn du eine Session angelegt hast.
      </p>

      <label class="field">
        <span>Session PIN</span>
        <input
          v-model="playerPin"
          placeholder="6-stellige PIN"
          inputmode="numeric"
          maxlength="6"
        />
      </label>

      <label class="field">
        <span>Name</span>
        <input v-model="playerName" placeholder="Dein Name" />
      </label>

      <label class="field">
        <span>Avatar (optional)</span>
        <input v-model="playerAvatar" placeholder="z.B. 🦊" />
      </label>

      <label class="field">
        <span>Player ID (für Reconnect – wird nach Join gesetzt)</span>
        <input v-model="playerId" placeholder="wird nach player:join gesetzt" />
      </label>

      <div class="buttons">
        <button type="button" @click="joinAsPlayer" :disabled="!isConnected || !playerPin">
          player:join
        </button>
        <button type="button" @click="reconnectPlayer" :disabled="!isConnected || !playerId">
          player:reconnect
        </button>
        <button type="button" @click="sendDummyAnswer" :disabled="!isConnected || !playerId">
          player:answer (Dummy)
        </button>
      </div>
    </section>

    <section class="log-section">
      <h2>Event Log</h2>
      <button type="button" class="small" @click="clearLog">Log leeren</button>
      <pre class="log">
<code v-for="(entry, index) in reversedLog" :key="index">
{{ entry }}
</code>
      </pre>
    </section>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import { useSocket, disconnectSocket } from './lib/socket.js';

const isConnected = ref(false);
const log = ref([]);

const sessionPin = ref('');
const moderatorQuizId = ref('');

const playerPin = ref('');
const playerName = ref('');
const playerAvatar = ref('🦊');
const playerId = ref('');

let socket = null;

function logEvent(label, payload) {
  const time = new Date().toISOString();
  log.value.push(
    `[${time}] ${label}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`
  );
}

const reversedLog = computed(() => [...log.value].reverse());

function connect() {
  if (socket) return;
  socket = useSocket('http://localhost:3000');

  socket.on('connect', () => {
    isConnected.value = true;
    logEvent('connect', { socketId: socket.id });
  });

  socket.on('disconnect', () => {
    isConnected.value = false;
    logEvent('disconnect', {});
  });

  socket.onAny((event, payload) => {
    logEvent(`event:${event}`, payload ?? {});
    if (event === 'player:joined' && payload?.playerId) {
      playerId.value = payload.playerId;
    }
    if (event === 'moderator:joined' && payload?.sessionId) {
      sessionPin.value = payload.sessionId;
      playerPin.value = payload.sessionId;
    }
  });
}

function disconnect() {
  disconnectSocket();
  socket = null;
  isConnected.value = false;
}

function joinAsModerator() {
  if (!socket) return;
  socket.emit('moderator:join', {
    quizId: moderatorQuizId.value || undefined
  });
}

function createSession() {
  if (!socket) return;
  joinAsModerator();
}

function startGame() {
  if (!socket) return;
  socket.emit('moderator:start', {});
}

function nextQuestion() {
  if (!socket) return;
  socket.emit('moderator:next', {
    question: {
      totalQuestions: 3,
      text: 'Dummy-Frage: 2 + 2?',
      options: [
        { id: 'a', text: '3' },
        { id: 'b', text: '4' }
      ],
      timeLimit: 30
    }
  });
}

function pauseGame() {
  if (!socket) return;
  socket.emit('moderator:pause');
}

function resumeGame() {
  if (!socket) return;
  socket.emit('moderator:resume');
}

function endSession() {
  if (!socket) return;
  socket.emit('moderator:end');
}

function joinAsPlayer() {
  if (!socket) return;
  socket.emit('player:join', {
    pin: playerPin.value,
    name: playerName.value,
    avatar: playerAvatar.value || undefined
  });
}

function reconnectPlayer() {
  if (!socket) return;
  socket.emit('player:reconnect', {
    sessionId: playerPin.value,
    odlfPlayerId: playerId.value
  });
}

function sendDummyAnswer() {
  if (!socket) return;
  socket.emit('player:answer', {
    questionId: 'q1',
    answerId: 'b',
    timeTaken: 1500
  });
}

function clearLog() {
  log.value = [];
}

onBeforeUnmount(() => {
  disconnect();
});
</script>

<style scoped>
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 1.5rem;
}

.connection {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  justify-content: center;
}

.status {
  font-size: 0.9rem;
}

.status[data-connected='true'] {
  color: #1a7f37;
}

.status[data-connected='false'] {
  color: #a61b1b;
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.panel {
  background: #fff;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.panel h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.field span {
  font-size: 0.85rem;
  color: #555;
}

.field input {
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 0.9rem;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

button {
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 0.85rem;
}

button:hover:not(:disabled) {
  background: #e5e5e5;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.small {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
}

.log-section {
  background: #fff;
  border-radius: 8px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.log-section h2 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.log {
  margin: 0.5rem 0 0;
  max-height: 260px;
  overflow-y: auto;
  background: #111827;
  color: #e5e7eb;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.log code {
  display: block;
}
</style>

