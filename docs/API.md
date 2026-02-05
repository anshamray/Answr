# Kahood API Specification

Based on the requirements from the Lastenheft, this document defines the REST API endpoints and WebSocket events.

## Base URL

- **REST API**: `http://localhost:3000/api`
- **WebSocket**: `ws://localhost:3000`

---

## Authentication

All moderator endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## REST API Endpoints

### 1. Authentication (fBV1, fBV3)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new moderator | No |
| POST | `/api/auth/login` | Login moderator | No |
| POST | `/api/auth/logout` | Logout moderator | Yes |
| GET | `/api/auth/me` | Get current user | Yes |

#### POST `/api/auth/register`
```json
// Request
{
  "name": "string",
  "email": "string",
  "password": "string"
}

// Response 201
{
  "id": "string",
  "name": "string",
  "email": "string",
  "token": "string"
}
```

#### POST `/api/auth/login`
```json
// Request
{
  "email": "string",
  "password": "string"
}

// Response 200
{
  "id": "string",
  "name": "string",
  "email": "string",
  "token": "string"
}
```

---

### 2. Quiz Management (fQV1, fQV2, fQV3)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/quizzes` | List all quizzes for current moderator | Yes |
| GET | `/api/quizzes/:id` | Get single quiz with questions | Yes |
| POST | `/api/quizzes` | Create new quiz | Yes |
| PUT | `/api/quizzes/:id` | Update quiz | Yes |
| DELETE | `/api/quizzes/:id` | Delete quiz | Yes |

#### POST `/api/quizzes`
```json
// Request
{
  "title": "string",
  "description": "string",
  "category": "string (optional)"
}

// Response 201
{
  "id": "string",
  "moderatorId": "string",
  "title": "string",
  "description": "string",
  "category": "string",
  "createdAt": "ISO8601",
  "questions": []
}
```

#### GET `/api/quizzes/:id`
```json
// Response 200
{
  "id": "string",
  "moderatorId": "string",
  "title": "string",
  "description": "string",
  "category": "string",
  "createdAt": "ISO8601",
  "questions": [
    {
      "id": "string",
      "type": "multiple-choice | true-false | slider | puzzle | free-text",
      "text": "string",
      "mediaUrl": "string (optional)",
      "timeLimit": 30,
      "order": 1,
      "answers": [
        {
          "id": "string",
          "text": "string",
          "isCorrect": true
        }
      ]
    }
  ]
}
```

---

### 3. Question Management (fFA1, fFA2, fFA3, fFA4)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/quizzes/:quizId/questions` | List all questions | Yes |
| POST | `/api/quizzes/:quizId/questions` | Add question to quiz | Yes |
| PUT | `/api/questions/:id` | Update question | Yes |
| DELETE | `/api/questions/:id` | Delete question | Yes |
| PUT | `/api/quizzes/:quizId/questions/reorder` | Reorder questions | Yes |

#### POST `/api/quizzes/:quizId/questions`
```json
// Request
{
  "type": "multiple-choice | true-false | slider | puzzle | free-text",
  "text": "What is 2 + 2?",
  "mediaUrl": "string (optional)",
  "timeLimit": 30,
  "order": 1,
  "answers": [
    { "text": "3", "isCorrect": false },
    { "text": "4", "isCorrect": true },
    { "text": "5", "isCorrect": false },
    { "text": "6", "isCorrect": false }
  ]
}

// Response 201
{
  "id": "string",
  "quizId": "string",
  "type": "multiple-choice",
  "text": "What is 2 + 2?",
  "mediaUrl": null,
  "timeLimit": 30,
  "order": 1,
  "answers": [...]
}
```

---

### 4. Media Upload (fFA2, fFA5)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/media/upload` | Upload image (max 2MB, jpg/png/gif) | Yes |
| DELETE | `/api/media/:id` | Delete uploaded media | Yes |

#### POST `/api/media/upload`
```
// Request: multipart/form-data
file: <binary>

// Response 201
{
  "id": "string",
  "url": "/media/abc123.png",
  "filename": "question-image.png",
  "size": 102400,
  "mimeType": "image/png"
}
```

---

### 5. Session Management (fSZ1, fSZ2, fSZ6)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/sessions` | Create new game session | Yes |
| GET | `/api/sessions/:id` | Get session details | Yes |
| DELETE | `/api/sessions/:id` | End session manually | Yes |
| GET | `/api/sessions/:id/results` | Get final results & statistics | Yes |

#### POST `/api/sessions`
```json
// Request
{
  "quizId": "string"
}

// Response 201
{
  "id": "string",
  "quizId": "string",
  "pin": "apple-banana-cherry",  // Word-based PIN (fSZ2)
  "status": "lobby",
  "createdAt": "ISO8601",
  "expiresAt": "ISO8601"  // +2 hours (fSZ6)
}
```

#### GET `/api/sessions/:id/results` (fPA4, fPA5)
```json
// Response 200
{
  "sessionId": "string",
  "quizTitle": "string",
  "totalQuestions": 10,
  "participants": [
    {
      "rank": 1,
      "name": "Player1",
      "avatar": "🦊",
      "score": 9500,
      "correctAnswers": 9,
      "avgResponseTime": 4.2
    }
  ],
  "questionStats": [
    {
      "questionId": "string",
      "questionText": "What is 2+2?",
      "correctPercentage": 85,
      "avgResponseTime": 3.8,
      "answerDistribution": {
        "answer1Id": 2,
        "answer2Id": 17,
        "answer3Id": 1,
        "answer4Id": 0
      }
    }
  ]
}
```

---

### 6. Health & Monitoring

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check endpoint | No |

#### GET `/api/health`
```json
// Response 200
{
  "status": "ok",
  "timestamp": "ISO8601",
  "uptime": 3600,
  "database": "connected",
  "activeSessions": 5
}
```

---

## WebSocket Events

Connection: `io.connect('http://localhost:3000')`

### Player Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `player:join` | `{ pin, name, avatar }` | Join session with PIN (fSZ3, fBV2) |
| `player:answer` | `{ questionId, answerId, timeTaken }` | Submit answer (fSA4) |
| `player:reconnect` | `{ sessionId, odlfPlayerId }` | Reconnect after disconnect (fSA7) |

### Player Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `player:joined` | `{ playerId, sessionId }` | Confirm join success |
| `player:kicked` | `{ reason }` | Player was removed (fSZ5) |
| `player:error` | `{ code, message }` | Error occurred |

### Moderator Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `moderator:join` | `{ sessionId, token }` | Join as moderator |
| `moderator:start` | `{ sessionId }` | Start the quiz (fSA1) |
| `moderator:next` | `{ sessionId }` | Show next question (fSA1) |
| `moderator:pause` | `{ sessionId }` | Pause game (fSA5) |
| `moderator:resume` | `{ sessionId }` | Resume game (fSA5) |
| `moderator:kick` | `{ sessionId, playerId }` | Remove player (fSZ5) |
| `moderator:end` | `{ sessionId }` | End session early |

### Game Events (Server → All Clients)

| Event | Payload | Description |
|-------|---------|-------------|
| `lobby:update` | `{ players: [...] }` | Lobby player list updated (fSZ4) |
| `game:starting` | `{ countdown: 5 }` | Game starting countdown |
| `game:question` | `{ question, timeLimit, questionNumber, totalQuestions }` | New question (fSA2) |
| `game:timer` | `{ remaining }` | Timer tick (fSA3) |
| `game:questionEnd` | `{ correctAnswer, explanation }` | Question ended (fSA6) |
| `game:leaderboard` | `{ top5: [...], yourRank, yourScore }` | After-question leaderboard (fPA3) |
| `game:paused` | `{}` | Game paused |
| `game:resumed` | `{}` | Game resumed |
| `game:ended` | `{ finalLeaderboard: [...] }` | Quiz finished (fPA4) |

### Connection Events

| Event | Description |
|-------|-------------|
| `connect` | Socket connected |
| `disconnect` | Socket disconnected |
| `reconnect` | Socket reconnected (30s window - fSA7) |

---

## Data Models (MongoDB Schemas)

### User
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed - tSI1),
  createdAt: Date
}
```

### Quiz
```javascript
{
  _id: ObjectId,
  moderatorId: ObjectId (ref: User),
  title: String,
  description: String,
  category: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Question
```javascript
{
  _id: ObjectId,
  quizId: ObjectId (ref: Quiz),
  type: Enum ['multiple-choice', 'true-false', 'slider', 'puzzle', 'free-text'],
  text: String,
  mediaUrl: String,
  timeLimit: Number (5-300, default: 30),
  order: Number,
  answers: [{
    _id: ObjectId,
    text: String,
    isCorrect: Boolean
  }]
}
```

### Session
```javascript
{
  _id: ObjectId,
  quizId: ObjectId (ref: Quiz),
  moderatorId: ObjectId (ref: User),
  pin: String (unique, word-based),
  status: Enum ['lobby', 'playing', 'paused', 'finished'],
  currentQuestionIndex: Number,
  createdAt: Date,
  expiresAt: Date,
  finishedAt: Date
}
```

### Participant
```javascript
{
  _id: ObjectId,
  sessionId: ObjectId (ref: Session),
  socketId: String,
  name: String,
  avatar: String,
  score: Number (default: 0),
  isConnected: Boolean,
  disconnectedAt: Date,
  joinedAt: Date
}
```

### Submission
```javascript
{
  _id: ObjectId,
  participantId: ObjectId (ref: Participant),
  questionId: ObjectId (ref: Question),
  answerId: ObjectId,
  timeTaken: Number (ms),
  pointsAwarded: Number,
  submittedAt: Date
}
```

---

## Scoring Algorithm (fPA1, fPA2)

```javascript
// Base points for correct answer
const BASE_POINTS = 1000;

// Calculate points based on time
function calculatePoints(isCorrect, timeTaken, timeLimit) {
  if (!isCorrect) return 0;

  const timeBonus = Math.max(0, 1 - (timeTaken / timeLimit));
  const points = Math.round(BASE_POINTS * (0.5 + 0.5 * timeBonus));

  return points; // Range: 500-1000 for correct answers
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `AUTH_INVALID` | 401 | Invalid credentials |
| `FORBIDDEN` | 403 | Not authorized for this resource |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `SESSION_EXPIRED` | 410 | Game session expired |
| `SESSION_FULL` | 403 | Session at max capacity (32 players - tPS1) |
| `QUIZ_IN_PROGRESS` | 409 | Cannot modify quiz during active session |
| `PIN_INVALID` | 404 | No session found with this PIN |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/api/auth/*` | 10 requests/minute |
| `/api/media/upload` | 20 requests/hour |
| All other endpoints | 100 requests/minute |

---

## Requirements Traceability

| Requirement | API Coverage |
|-------------|--------------|
| fBV1 | POST /api/auth/register, POST /api/auth/login |
| fBV2 | WebSocket player:join |
| fBV3 | JWT roles, middleware |
| fQV1-3 | /api/quizzes CRUD |
| fFA1-5 | /api/questions, /api/media |
| fSZ1-6 | /api/sessions, WebSocket lobby events |
| fSA1-7 | WebSocket game events |
| fPA1-5 | Scoring algorithm, GET /api/sessions/:id/results |
| tSI1 | bcrypt password hashing |
| tSI3 | Input validation middleware |
