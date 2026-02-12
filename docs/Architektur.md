# Answr – System Architecture

## 1. System Architecture

High-level overview of all layers, services, and communication protocols.

```mermaid
graph TB
  subgraph Client ["Client Layer (Port 5173)"]
    MOD_UI["🎛️ Moderator Interface<br/><i>Quiz CRUD, Session Control,<br/>Leaderboard</i>"]
    PLAYER_UI["🎮 Player Interface<br/><i>Join via PIN, Answer Questions,<br/>See Results</i>"]
  end

  subgraph Server ["Server Layer (Port 3000)"]
    EXPRESS["Express.js"]

    subgraph REST ["REST API"]
      AUTH_R["/api/auth"]
      QUIZ_R["/api/quizzes"]
      QUESTION_R["/api/questions<br/><i>(planned)</i>"]
      SESSION_R["/api/sessions<br/><i>(planned)</i>"]
    end

    subgraph WS ["Socket.io WebSocket"]
      PLAYER_EVT["Player Events<br/><i>join, answer, reconnect</i>"]
      MOD_EVT["Moderator Events<br/><i>join, start, next, pause,<br/>resume, kick, end</i>"]
      GAME_EVT["Game Broadcast<br/><i>question, timer, leaderboard,<br/>questionEnd, end</i>"]
    end

    subgraph MW ["Middleware"]
      JWT_AUTH["JWT Auth"]
      SANITIZE["Sanitize Body"]
      VALIDATE["Validate Body"]
    end

    SESSION_MEM["In-Memory Session Store<br/><i>Map&lt;pin, SessionState&gt;</i>"]
  end

  subgraph DB ["Database Layer"]
    MONGO[("MongoDB 7<br/>(Port 27017)")]
    USERS_COL["users"]
    QUIZZES_COL["quizzes"]
    QUESTIONS_COL["questions"]
  end

  MOD_UI -- "HTTP/REST + JWT" --> EXPRESS
  PLAYER_UI -- "HTTP/REST" --> EXPRESS
  MOD_UI -- "WebSocket" --> WS
  PLAYER_UI -- "WebSocket" --> WS

  EXPRESS --> MW --> REST
  REST --> MONGO
  WS --> SESSION_MEM

  MONGO --- USERS_COL
  MONGO --- QUIZZES_COL
  MONGO --- QUESTIONS_COL

  classDef clientStyle fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
  classDef serverStyle fill:#fff3e0,stroke:#e65100,color:#bf360c
  classDef dbStyle fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
  classDef wsStyle fill:#fce4ec,stroke:#c62828,color:#b71c1c

  class MOD_UI,PLAYER_UI clientStyle
  class EXPRESS,JWT_AUTH,SANITIZE,VALIDATE,SESSION_MEM serverStyle
  class AUTH_R,QUIZ_R,QUESTION_R,SESSION_R serverStyle
  class PLAYER_EVT,MOD_EVT,GAME_EVT wsStyle
  class MONGO,USERS_COL,QUIZZES_COL,QUESTIONS_COL dbStyle
```

### Infrastructure (Docker Compose)

| Service   | Image     | Port  | Notes                        |
|-----------|-----------|-------|------------------------------|
| `mongo`   | mongo:7   | 27017 | Persistent volume            |
| `backend` | Node.js   | 3000  | Depends on `mongo`           |
| Frontend  | Vite dev  | 5173  | Runs locally (not in Docker) |

---

## 2. API Route Map

All implemented and planned REST endpoints.

```mermaid
graph LR
  API["/api"]

  API --> AUTH["/auth"]
  AUTH --> AUTH_REG["POST /register<br/>🔓 Public<br/><i>Create account</i>"]
  AUTH --> AUTH_LOG["POST /login<br/>🔓 Public<br/><i>Login, get JWT</i>"]
  AUTH --> AUTH_ME["GET /me<br/>🔒 Auth<br/><i>Current user</i>"]

  API --> QUIZ["/quizzes"]
  QUIZ --> Q_LIST["GET /<br/>🔒 Auth<br/><i>List user's quizzes</i>"]
  QUIZ --> Q_GET["GET /:id<br/>🔒 Auth<br/><i>Quiz + questions</i>"]
  QUIZ --> Q_CREATE["POST /<br/>🔒 Auth<br/><i>Create quiz</i>"]
  QUIZ --> Q_UPDATE["PUT /:id<br/>🔒 Auth<br/><i>Update quiz</i>"]
  QUIZ --> Q_DELETE["DELETE /:id<br/>🔒 Auth<br/><i>Delete quiz + questions</i>"]

  API --> QUESTIONS["/questions<br/><i>(planned)</i>"]
  QUESTIONS --> QN_ADD["POST /quizzes/:quizId/questions<br/>🔒 Auth"]
  QUESTIONS --> QN_UPDATE["PUT /questions/:id<br/>🔒 Auth"]
  QUESTIONS --> QN_DELETE["DELETE /questions/:id<br/>🔒 Auth"]
  QUESTIONS --> QN_REORDER["PUT /quizzes/:quizId/questions/reorder<br/>🔒 Auth"]

  API --> SESSIONS["/sessions<br/><i>(planned)</i>"]
  SESSIONS --> S_CREATE["POST /<br/>🔒 Auth<br/><i>Create session</i>"]
  SESSIONS --> S_GET["GET /:id<br/>🔒 Auth<br/><i>Session details</i>"]
  SESSIONS --> S_DELETE["DELETE /:id<br/>🔒 Auth<br/><i>End session</i>"]
  SESSIONS --> S_RESULTS["GET /:id/results<br/>🔒 Auth<br/><i>Final stats</i>"]

  API --> HEALTH["GET /health<br/>🔓 Public<br/><i>(planned)</i>"]

  classDef implemented fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20
  classDef planned fill:#fff9c4,stroke:#f9a825,color:#f57f17

  class AUTH_REG,AUTH_LOG,AUTH_ME implemented
  class Q_LIST,Q_GET,Q_CREATE,Q_UPDATE,Q_DELETE implemented
  class QN_ADD,QN_UPDATE,QN_DELETE,QN_REORDER planned
  class S_CREATE,S_GET,S_DELETE,S_RESULTS planned
  class HEALTH planned
```

**Legend:** 🟩 Implemented &nbsp; 🟨 Planned

---

## 3. WebSocket Event Flow

Complete game lifecycle — from lobby creation to final leaderboard.

```mermaid
sequenceDiagram
  participant M as 🎛️ Moderator
  participant S as ⚙️ Server
  participant P as 🎮 Player(s)

  Note over M,P: ── Phase 1: Session Setup ──

  M->>S: moderator:join { pin?, quizId? }
  S-->>M: moderator:joined { sessionId, pin, status }
  Note right of S: Session created in memory<br/>PIN generated (6-digit)

  Note over M,P: ── Phase 2: Lobby ──

  P->>S: player:join { pin, name, avatar? }
  S-->>P: player:joined { playerId, sessionId }
  S-->>M: lobby:update { players[], playerCount }
  S-->>P: lobby:update { players[], playerCount }

  Note right of S: Max 32 players per session

  loop More players join
    P->>S: player:join { pin, name, avatar? }
    S-->>M: lobby:update { players[], playerCount }
    S-->>P: lobby:update { players[], playerCount }
  end

  Note over M,P: ── Phase 3: Game Start ──

  M->>S: moderator:start { firstQuestion? }
  S-->>M: game:started { status: 'playing' }
  S-->>P: game:started { status: 'playing' }

  Note over M,P: ── Phase 4: Question Loop ──

  rect rgb(240, 248, 255)
    M->>S: moderator:next { question }
    S-->>M: game:question { questionNumber, text, options, timeLimit }
    S-->>P: game:question { questionNumber, text, options, timeLimit }

    loop Timer ticks
      S-->>M: game:timer { remaining }
      S-->>P: game:timer { remaining }
    end

    P->>S: player:answer { questionId, answerId, timeTaken }
    S-->>P: player:answer:ack { questionId, answerId, receivedAt }

    S-->>M: game:questionEnd { correctAnswer }
    S-->>P: game:questionEnd { correctAnswer }

    S-->>M: game:leaderboard { leaderboard[] }
    S-->>P: game:leaderboard { leaderboard[] }
  end

  Note over M,P: Repeat for each question

  Note over M,P: ── Phase 5: Game End ──

  M->>S: moderator:end
  S-->>M: game:end { leaderboard[], stats }
  S-->>P: game:end { leaderboard[], stats }
  Note right of S: Session cleaned up

  Note over M,P: ── Optional: Pause / Resume ──

  M->>S: moderator:pause
  S-->>M: game:paused { status: 'paused' }
  S-->>P: game:paused { status: 'paused' }

  M->>S: moderator:resume
  S-->>M: game:resumed { status: 'playing' }
  S-->>P: game:resumed { status: 'playing' }

  Note over M,P: ── Optional: Player Disconnect & Reconnect ──

  P--xS: (disconnect)
  S-->>M: player:left { playerId, playerCount }
  P->>S: player:reconnect { sessionId, oldPlayerId }
  Note right of S: 30s reconnect window

  Note over M,P: ── Optional: Kick Player ──

  M->>S: moderator:kick { playerId }
  S-->>P: player:kicked { reason }
  S-->>M: player:removed { playerId, playerCount }
```

---

## 4. Screen Flow

Frontend screens and navigation paths (planned Svelte application).

```mermaid
flowchart TD
  START((🌐 App Entry))

  START --> LANDING["Landing Page<br/><i>Join as Player or Moderator</i>"]

  %% Player flow
  LANDING -- "Enter PIN" --> JOIN["Join Screen<br/><i>Enter PIN + Nickname + Avatar</i>"]
  JOIN -- "Valid PIN" --> LOBBY_P["Player Lobby<br/><i>Wait for game to start<br/>See other players</i>"]
  LOBBY_P --> QUESTION["Question Screen<br/><i>See question + options<br/>Countdown timer</i>"]
  QUESTION -- "Submit answer" --> WAITING["Waiting Screen<br/><i>Answer submitted<br/>Wait for others</i>"]
  WAITING --> RESULT["Answer Result<br/><i>Correct/Wrong + Points</i>"]
  RESULT --> LEADERBOARD_P["Leaderboard<br/><i>Current standings<br/>Your rank</i>"]
  LEADERBOARD_P -- "Next question" --> QUESTION
  LEADERBOARD_P -- "Game ends" --> FINAL_P["Final Results<br/><i>Final rank + Total score</i>"]
  FINAL_P --> LANDING

  %% Moderator flow
  LANDING -- "Login" --> LOGIN["Login / Register<br/><i>Email + Password</i>"]
  LOGIN --> DASHBOARD["Dashboard<br/><i>List of quizzes<br/>Create / Edit / Delete</i>"]
  DASHBOARD -- "Create/Edit" --> QUIZ_EDIT["Quiz Editor<br/><i>Title, Description, Category<br/>Add/Edit/Reorder Questions</i>"]
  QUIZ_EDIT --> DASHBOARD
  DASHBOARD -- "Start Session" --> LOBBY_M["Moderator Lobby<br/><i>Show PIN<br/>See joining players<br/>Start Game button</i>"]
  LOBBY_M --> GAME_CTRL["Game Control<br/><i>Current question preview<br/>Next / Pause / Resume / End<br/>Answer stats live</i>"]
  GAME_CTRL -- "Next question" --> GAME_CTRL
  GAME_CTRL -- "End game" --> RESULTS_M["Session Results<br/><i>Final leaderboard<br/>Per-question stats<br/>Export data</i>"]
  RESULTS_M --> DASHBOARD

  %% Styling
  classDef playerScreen fill:#e3f2fd,stroke:#1565c0,color:#0d47a1
  classDef modScreen fill:#fff3e0,stroke:#e65100,color:#bf360c
  classDef sharedScreen fill:#f3e5f5,stroke:#6a1b9a,color:#4a148c
  classDef entryPoint fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20

  class JOIN,LOBBY_P,QUESTION,WAITING,RESULT,LEADERBOARD_P,FINAL_P playerScreen
  class LOGIN,DASHBOARD,QUIZ_EDIT,LOBBY_M,GAME_CTRL,RESULTS_M modScreen
  class LANDING sharedScreen
  class START entryPoint
```

**Legend:** 🟦 Player screens &nbsp; 🟧 Moderator screens &nbsp; 🟪 Shared

---

## Deployment Strategy

```
Development:
  Frontend  → Vite Dev Server (:5173)
  Backend   → Nodemon (:3000)
  Database  → Docker MongoDB (:27017)

Production (planned):
  Frontend  → Static Build → CDN / Nginx
  Backend   → PM2 / Docker → Cloud Server
  Database  → MongoDB Atlas / Self-hosted
```

## Security Checklist

- [x] JWT for Moderator Auth
- [x] Password Hashing (bcrypt)
- [x] CORS Configuration
- [x] Input Sanitization Middleware
- [ ] HTTPS/WSS in Production
- [ ] Rate Limiting
- [ ] Helmet.js Security Headers

## Scaling (Future)

- [ ] Redis for session state (replace in-memory Map)
- [ ] Load Balancer for horizontal scaling
- [ ] Socket.io Redis Adapter for multi-instance WebSocket
- [ ] CDN for static assets
