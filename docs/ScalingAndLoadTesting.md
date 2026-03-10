## Answr Scaling & Load Testing Guide

This document summarizes the current architecture limits, a phased scaling plan towards ~5,000 concurrent players, and concrete, reproducible load tests (targeting `answr.ing`).

---

## 1. Current Architecture & Realistic Limits

### 1.1. Architecture Snapshot

- **Backend**: Single Node.js + Express + Socket.io server (`backend/src/server.js`)
- **Realtime**: Socket.io with one `io` instance
- **Session state**:
  - In-memory `activeSessions: Map<pin, sessionData>` in `backend/src/socket/index.js`
  - Session data contains:
    - `pin`, `quizId`, `hostSocketId`
    - `status` (`lobby` | `playing` | `paused` | `finished`)
    - `players: Map<playerId, { socketId, nickname, score, isConnected, ... }>`
    - `answers: Map<questionId, Map<playerId, submission>>`
    - Timers and scoring state (`introTimer`, `questionTimer`, `questionTimeRemaining`, etc.)
- **Health endpoint**: `GET /api/health` in `backend/src/routes/health.js`

### 1.2. Hard Limits in Code

- `backend/src/socket/sessionUtils.js`:
  - `MAX_PLAYERS_PER_SESSION = 32`
  - Enforced via `checkSessionState(session, maxPlayers)` for `player:join`.

### 1.3. Realistic Load (Before Scaling)

Rough ballpark on a single Node process (no clustering, no Redis):

- **Safe range**: ~200–500 concurrent players (e.g., 10–15 sessions × 20–30 players)
- Above that, the bottlenecks are:
  - Single Node event loop (timers, scoring, broadcasts)
  - In-memory session state in one process
  - No horizontal scaling (no shared state across instances)

---

## 2. Bottlenecks Overview

### 2.1. Single Socket.io Instance

- Only one Node process with one `io` instance.
- No Socket.io adapter (e.g., Redis) is configured, so:
  - **No horizontal scaling** possible without changing state handling.
  - All WebSocket traffic and broadcasts go through one event loop.

### 2.2. In-Memory Session State

- `activeSessions: Map` holds:
  - Sessions, players, answers, timers, scoring state.
- Implications:
  - Tied to a single process.
  - Memory usage grows with players × sessions.
  - Any crash loses all active game state.

### 2.3. Timers & Scoring per Session

- `broadcastEvents.startQuestionTimer(io, pin, session)`:
  - For each question, sets an intro timer and then a `setInterval` ticking every 1s.
  - Every tick emits `game:timer` to the whole room.
- `broadcastEvents.endCurrentQuestion`:
  - Iterates over all answers for the question.
  - Applies scoring rules and updates player scores + streaks.

With many concurrent sessions and players, this puts load on:

- CPU (Node event loop)
- Network IO (frequent broadcasts)

### 2.4. WebSocket Broadcasts

- Frequent broadcasts per session:
  - `lobby:update`
  - `game:timer` (every second)
  - Answer count updates, leaderboards, question events.
- Many sessions × many players → many small broadcasts.

---

## 3. Phased Scaling Plan (Towards ~5,000 Players)

### Phase 1 – Measure & Stabilize (Current Work)

**Goal**: Understand current behavior under load and gain metrics to make scaling decisions.

1. **Define target**
   - Target: **~5,000 concurrent players**.
   - Example composition: `100 sessions × 50 players` or similar.

2. **Expose basic metrics via `/api/health`**
   - Already implemented in `backend/src/routes/health.js` + `backend/src/server.js`:
     - `status` (`healthy` / `degraded`)
     - `timestamp`
     - `uptime` (seconds)
     - `database` (`connected` / `disconnected`)
     - **`activeSessions`** (number of in-memory sessions)
     - **`activePlayers`** (number of connected players across all sessions)
     - **`sockets`** (number of active Socket.io connections)

3. **Create reproducible WebSocket load tests**
   - `backend/scripts/wsLoadTest.js`:
     - Can auto-create sessions from a **Library quiz** (no auth) via `POST /api/library/:id/start`.
     - Can optionally target a **fixed PIN**.
     - Simulates many players connecting, checking PIN, and joining sessions.

4. **Run tests in increasing steps**
   - Start with a few hundred players, then ~1,000, and finally ~5,000.
   - For each step:
     - Observe `/api/health` (active sessions, players, sockets).
     - Monitor CPU/RAM on the VPS (provider dashboard, `top`, etc.).

> This phase is about **knowing** where current limits are, not yet about changing architecture.

---

### Phase 2 – Low-Hanging Optimizations (Single Node)

**Goal**: Push the single-node architecture as far as is reasonable by reducing avoidable load.  
*(To be done after initial measurements.)*

Ideas:

- Review how often `game:timer` is sent:
  - Option: clients render intermediate seconds locally, server sends fewer authoritative updates (e.g., every 3–5 seconds).
- Debounce/throttle room-wide events:
  - `player:answer:received` can be limited to X events per second per session.
- Ensure session cleanup:
  - Confirm ended/expired sessions are removed from `activeSessions`, including answer maps and player maps.

These changes can lower CPU & network usage without changing the core architecture.

---

### Phase 3 – Prepare for Horizontal Scaling

**Goal**: Decouple session state from a single process and introduce a session store abstraction.

Steps (design, not yet implemented):

1. **Session store abstraction**
   - Introduce something like `sessionStore` with methods:
     - `get(pin)`
     - `set(pin, session)`
     - `update(pin, patch)`
     - `delete(pin)`
   - Initially backed by the existing `activeSessions` Map, but used everywhere instead of accessing `activeSessions` directly.

2. **Redis-based implementation (prototype)**
   - Add Redis as backing store:
     - Keys: `session:<pin>`
     - Value: JSON of session state.
   - Start by mirroring state to Redis before making it the source of truth.

3. **Socket.io Redis Adapter**
   - Use `@socket.io/redis-adapter` (or similar) to allow multiple Node processes to share rooms and broadcast events.
   - Still keep timers on a single node for each session (session ownership via Redis locks).

---

### Phase 4 – Multi-Instance Deployment

**Goal**: Run multiple backend instances behind a load balancer to support higher concurrency.  
*(Future work, after Redis + adapter are in place.)*

High-level steps:

1. **Multiple backend containers**
   - Reuse the existing Docker setup.
   - Run several instances of the backend container, all pointing to:
     - The same MongoDB.
     - The same Redis (for sessions and Socket.io adapter).

2. **Load balancer**
   - Put NGINX / Traefik / cloud LB in front of the instances.
   - Sticky sessions are not required if Socket.io uses Redis adapter correctly.

3. **Timer ownership**
   - Ensure only one process controls timers per session:
     - Use Redis locks or a session owner field in the session data.

4. **Observability & alerts**
   - Expand on `/api/health` and add:
     - Prometheus metrics or at least structured logging.
     - Alerts for high CPU, memory, or error rates.

---

## 4. Health Endpoint Details

### 4.1. Implementation Summary

- **Route**: `GET /api/health`
- **Behavior**:
  - Reads `mongoose.connection.readyState` to derive DB status.
  - Calls a getter previously set in `server.js` to obtain socket/session stats.
  - Returns `HTTP 200` when DB is connected, `HTTP 503` otherwise.

### 4.2. Response Shape (Extended)

Example healthy response:

```json
{
  "success": true,
  "message": "Health check",
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-10T12:00:00.000Z",
    "uptime": 3600,
    "database": "connected",
    "activeSessions": 10,
    "activePlayers": 250,
    "sockets": 260
  }
}
```

During tests, these fields give a quick view of how many sessions/players/sockets are active.

---

## 5. WebSocket Load Test Script

### 5.1. Location & Dependencies

- Script: `backend/scripts/wsLoadTest.js`
- Requires:
  - `socket.io-client` (added to `backend/package.json`)
  - Node 18+ (for `fetch` in Node, or a polyfill if older)

### 5.2. npm Script

In `backend/package.json`:

```json
{
  "scripts": {
    "loadtest": "NODE_ENV=production node scripts/wsLoadTest.js"
  }
}
```

Run from the `backend` directory:

```bash
cd backend
npm run loadtest
```

### 5.3. Configuration (Environment Variables)

The script supports two modes:

- **Mode A (auto sessions from library quiz)** – recommended.
- **Mode B (fixed PIN)** – fallback.

Common env variables:

- `BACKEND_URL`  
  - Base URL of the backend, e.g. `https://answr.ing`.
  - Default: `https://answr.ing`.
- `NUM_SESSIONS`  
  - Target number of sessions to create/target.
  - Example: `100`.
- `PLAYERS_PER_SESSION`  
  - Target players per session.
  - Example: `50`.
- `TEST_DURATION_MS`  
  - Duration of the test in milliseconds.
  - Example: `60000` (60 seconds).

Mode A specific:

- `LIBRARY_QUIZ_ID`
  - ID of a quiz in the Library (`/api/library/:id`).
  - If set, the script will call `POST /api/library/:id/start` to create new sessions and collect their PINs.

Mode B specific:

- `SESSION_PIN` or `PIN`
  - Fixed session PIN to use directly.
  - No sessions are created via REST; all simulated players target this PIN.

At least one of `LIBRARY_QUIZ_ID` or `SESSION_PIN`/`PIN` must be set.

### 5.4. What the Script Does (High Level)

1. **Determine PINs to use**
   - If `LIBRARY_QUIZ_ID` is set:
     - Calls `POST /api/library/:id/start` up to `NUM_SESSIONS` times.
     - Collects all returned `pin`s.
   - Otherwise:
     - Uses `[SESSION_PIN]` as the only PIN.

2. **Open WebSocket connections**
   - Creates `TOTAL_PLAYERS = NUM_SESSIONS * PLAYERS_PER_SESSION` clients.
   - Each client:
     - Connects to `BACKEND_URL` via `socket.io-client` (`transports: ['websocket']`).
     - On `connect`:
       - Picks a PIN from the list (round-robin).
       - Emits `player:check-pin` with `{ pin }`.
       - After a short random delay, emits `player:join` with `{ pin, name }`, where `name` is something like `LoadTest_<sessionIndex>_<playerIndex>`.

3. **Track metrics**
   - Counts:
     - `connected` (successful socket connections).
     - `joined` (received `player:joined`).
     - `errors` (any `player:pin-invalid` or `player:error`).
   - Logs a status line every 2 seconds:

     ```text
     [5.2s] connected=4300/5000, joined=4200, errors=10
     ```

4. **Shutdown**
   - Waits for `TEST_DURATION_MS`.
   - Clears the status interval.
   - Disconnects all sockets.
   - Prints a summary (elapsed time, final counters).

---

## 6. Step-by-Step: How to Run Load Tests on answr.ing

These steps assume you have switched to a VPS and deployed the app so that `https://answr.ing` points to your backend.

### 6.1. One-Time Setup on Your Local Machine

1. Clone the repo and install backend dependencies:

   ```bash
   git clone https://github.com/anshamray/Answr.git
   cd Answr/backend
   npm install
   ```

2. Ensure `answr.ing` points to the deployed backend and is reachable.

### 6.2. Get a Library Quiz ID

You need at least one Library quiz to start sessions from:

- Option A (UI):
  - In the app, create a quiz and publish it to the Library.
  - Take the quiz ID from the UI (e.g. from a URL or dev tools).

- Option B (API):

  ```bash
  curl https://answr.ing/api/library | jq '.data.quizzes[0].id'
  ```

  Use one of the returned `id`s as `LIBRARY_QUIZ_ID`.

### 6.3. Warm-Up Test (~100 Players)

From `Answr/backend` on your local machine:

```bash
cd backend

export BACKEND_URL="https://answr.ing"
export LIBRARY_QUIZ_ID="<YOUR_LIBRARY_QUIZ_ID>"
export NUM_SESSIONS=5
export PLAYERS_PER_SESSION=20      # 5 * 20 = 100 players
export TEST_DURATION_MS=60000      # 60 seconds

npm run loadtest
```

In a second terminal, watch health:

```bash
watch -n 5 'curl -s https://answr.ing/api/health | jq'
```

Check that:

- `activeSessions` roughly matches `NUM_SESSIONS`.
- `activePlayers` grows towards `~100`.
- `sockets` is close to `activePlayers` (plus some moderator sockets, etc.).

### 6.4. Medium Test (~1,000 Players)

```bash
export BACKEND_URL="https://answr.ing"
export LIBRARY_QUIZ_ID="<YOUR_LIBRARY_QUIZ_ID>"
export NUM_SESSIONS=20
export PLAYERS_PER_SESSION=50      # 20 * 50 = 1000 players
export TEST_DURATION_MS=60000

npm run loadtest
```

Again monitor:

- `/api/health` (activeSessions, activePlayers, sockets).
- VPS CPU and RAM (provider dashboard or SSH + `top`).

### 6.5. Large Test (~5,000 Players)

```bash
export BACKEND_URL="https://answr.ing"
export LIBRARY_QUIZ_ID="<YOUR_LIBRARY_QUIZ_ID>"
export NUM_SESSIONS=100
export PLAYERS_PER_SESSION=50      # 100 * 50 = 5000 players
export TEST_DURATION_MS=120000     # 120 seconds

npm run loadtest
```

During the test:

- Keep an eye on:
  - `/api/health` output (especially `activePlayers` and `sockets`).
  - CPU (ideally < ~80% sustained) and RAM.
- After the test, note:
  - Final summary from the script:
    - How many connections succeeded?
    - How many `player:joined` events?
    - How many errors?

### 6.6. Alternative: Single Heavy Session (Fixed PIN)

If you want to simulate many players in **one** session instead of many sessions:

1. Start a session manually (e.g. via UI).
2. Note its `PIN` (e.g. `123456`).
3. Run:

   ```bash
   export BACKEND_URL="https://answr.ing"
   export SESSION_PIN="123456"
   export NUM_SESSIONS=1
   export PLAYERS_PER_SESSION=5000   # all players into this one session
   export TEST_DURATION_MS=60000

   npm run loadtest
   ```

This scenario stresses:

- `MAX_PLAYERS_PER_SESSION` (currently 32 → many joins will fail with `SESSION_FULL`).
- Behavior when many players compete for the same room.

---

## 7. Interpreting Test Results (High-Level)

When analyzing results, focus on:

- **Connection success rate**
  - `Connected` vs. `Total` in the script summary.
  - Many failures may indicate network/timeouts or server overload.

- **Join success rate**
  - `Joined` (number of `player:joined` events).
  - Errors:
    - `SESSION_FULL` (expected if `MAX_PLAYERS_PER_SESSION` is hit).
    - `INTERNAL_ERROR` (needs investigation).
    - `PIN_INVALID` (likely session creation problems).

- **Server health**
  - `/api/health` during load:
    - `activeSessions` behaves as expected.
    - `activePlayers` ~ targeted players (minus errors).
    - `sockets` ~ `activePlayers` (plus moderator or extra).
  - CPU and RAM limits:
    - Sustained CPU > 80–90% or memory exhaustion → the current capacity is reached.

From there, you can:

- Record at which combination of `NUM_SESSIONS × PLAYERS_PER_SESSION` the system becomes unstable.
- Use that as baseline, then move into Phase 2 (optimizations) and Phase 3 (Redis + horizontal scaling).

---

## 8. Summary

- The current single-node architecture can likely handle a few hundred to ~1,000 players comfortably; **5,000 players** will push it hard.
- The health endpoint now exposes **sessions**, **players**, and **sockets**, which is essential for evaluating load.
- The `wsLoadTest.js` script allows you to:
  - Auto-create sessions from a Library quiz.
  - Simulate thousands of players joining via WebSockets.
  - Run tests directly against `answr.ing` from your own machine.
- After migrating to a VPS and running these tests, use the collected data to:
  - Tune small optimizations (Phase 2).
  - Plan and implement Redis + Socket.io adapter + multi-instance deployment (Phases 3–4) if needed.

