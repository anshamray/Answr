/* eslint-disable no-console */
import { io } from 'socket.io-client';

const DEFAULT_BACKEND_URL = process.env.BACKEND_URL || 'https://answr.ing';
const API_BASE_URL = `${DEFAULT_BACKEND_URL.replace(/\/$/, '')}/api`;

const NUM_SESSIONS = Number(process.env.NUM_SESSIONS || process.argv[2] || 50);
const PLAYERS_PER_SESSION = Number(process.env.PLAYERS_PER_SESSION || process.argv[3] || 100);
const TOTAL_PLAYERS = NUM_SESSIONS * PLAYERS_PER_SESSION;

// Option 1: fixed PIN
const FIXED_PIN = process.env.SESSION_PIN || process.env.PIN || null;

// Option 2: auto-create sessions from a library quiz (no auth required)
const LIBRARY_QUIZ_ID = process.env.LIBRARY_QUIZ_ID || null;

if (!FIXED_PIN && !LIBRARY_QUIZ_ID) {
  console.error('Either SESSION_PIN/PIN or LIBRARY_QUIZ_ID must be provided for the load test.');
  process.exit(1);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createSessionsFromLibraryQuiz() {
  if (!LIBRARY_QUIZ_ID) {
    return [FIXED_PIN];
  }

  console.log(
    `Creating ${NUM_SESSIONS} sessions from library quiz ${LIBRARY_QUIZ_ID} via ${API_BASE_URL}...`
  );

  const pins = [];

  for (let i = 0; i < NUM_SESSIONS; i += 1) {
    try {
      const res = await fetch(`${API_BASE_URL}/library/${LIBRARY_QUIZ_ID}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        console.error(`Failed to create session ${i + 1}/${NUM_SESSIONS}: HTTP ${res.status}`);
        // Small delay to avoid hammering
        await delay(200);
        continue;
      }

      const body = await res.json();
      const pin = body?.data?.session?.pin;

      if (!pin) {
        console.error(`No PIN returned for session ${i + 1}/${NUM_SESSIONS}`);
      } else {
        pins.push(pin);
        console.log(`Created session ${i + 1}/${NUM_SESSIONS} with PIN ${pin}`);
      }
    } catch (err) {
      console.error(`Error creating session ${i + 1}/${NUM_SESSIONS}:`, err.message || err);
    }

    // Throttle session creation slightly
    await delay(100);
  }

  if (pins.length === 0 && FIXED_PIN) {
    console.warn('No sessions could be created, falling back to FIXED_PIN.');
    return [FIXED_PIN];
  }

  return pins;
}

async function run() {
  let connected = 0;
  let joined = 0;
  let errors = 0;

  // Determine which PINs to use
  let pins;
  if (LIBRARY_QUIZ_ID) {
    pins = await createSessionsFromLibraryQuiz();
  } else {
    pins = [FIXED_PIN];
  }

  if (!pins || pins.length === 0) {
    console.error('No valid PINs available for the load test.');
    process.exit(1);
  }

  console.log('Starting WebSocket load test with config:');
  console.log(`Backend URL:      ${DEFAULT_BACKEND_URL}`);
  console.log(`API base URL:     ${API_BASE_URL}`);
  console.log(`Sessions (target):${NUM_SESSIONS}`);
  console.log(`Players/session:  ${PLAYERS_PER_SESSION}`);
  console.log(`Total players:    ${TOTAL_PLAYERS}`);
  console.log(`Using ${pins.length} PIN(s): ${pins.join(', ')}`);

  const sockets = [];

  const startTime = Date.now();

  for (let i = 0; i < TOTAL_PLAYERS; i += 1) {
    const socket = io(DEFAULT_BACKEND_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    sockets.push(socket);

    socket.on('connect', () => {
      connected += 1;

      // Distribute players across sessions
      const sessionIndex = i % pins.length;
      const pin = pins[sessionIndex];

      // 1) Check PIN
      socket.emit('player:check-pin', { pin });

      // 2) Join after short delay with a pseudo-random name
      const playerIndex = Math.floor(i / pins.length);
      const name = `LoadTest_${sessionIndex}_${playerIndex}`;

      setTimeout(() => {
        socket.emit('player:join', { pin, name });
      }, 100 + Math.random() * 400);
    });

    socket.on('player:pin-invalid', (payload) => {
      errors += 1;
      console.warn('PIN invalid:', payload);
    });

    socket.on('player:error', (payload) => {
      errors += 1;
      console.warn('Player error:', payload);
    });

    socket.on('player:joined', () => {
      joined += 1;
    });

    // Spread out connection attempts a bit
    if (i % 100 === 0) {
      await delay(200);
    }
  }

  // Periodically print simple stats
  const statsInterval = setInterval(() => {
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[${elapsedSec}s] connected=${connected}/${TOTAL_PLAYERS}, joined=${joined}, errors=${errors}`
    );
  }, 2000);

  // Run for a fixed duration, then clean up
  const TEST_DURATION_MS = Number(process.env.TEST_DURATION_MS || 60000);
  await delay(TEST_DURATION_MS);

  clearInterval(statsInterval);

  console.log('Load test finished, closing sockets...');
  for (const socket of sockets) {
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
  }

  const totalElapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('=== Summary ===');
  console.log(`Elapsed:    ${totalElapsedSec}s`);
  console.log(`Connected:  ${connected}/${TOTAL_PLAYERS}`);
  console.log(`Joined:     ${joined}`);
  console.log(`Errors:     ${errors}`);
}

run().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});

