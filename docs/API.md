# Answr API Specification

Based on the requirements, this document defines the REST API endpoints and WebSocket events.

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

## Response Format

All API responses follow a consistent format:

**Success responses:**
```json
{
  "success": true,
  "message": "Description of what happened",
  "data": { ... }
}
```

**Error responses:**
```json
{
  "success": false,
  "error": "Error description"
}
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
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
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
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
}
```

#### GET `/api/auth/me`
```json
// Response 200
{
  "success": true,
  "message": "User retrieved",
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
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

#### GET `/api/quizzes`
```json
// Response 200
{
  "success": true,
  "message": "Quizzes retrieved",
  "data": {
    "quizzes": [...]
  }
}
```

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
  "success": true,
  "message": "Quiz created",
  "data": {
    "quiz": {
      "id": "string",
      "moderatorId": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "createdAt": "ISO8601",
      "questions": []
    }
  }
}
```

#### GET `/api/quizzes/:id`
```json
// Response 200
{
  "success": true,
  "message": "Quiz retrieved",
  "data": {
    "quiz": {
      "id": "string",
      "moderatorId": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "createdAt": "ISO8601",
      "questions": [
        {
          "id": "string",
          "type": "multiple-choice | true-false | slider | sort | type-answer | poll | ...",
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
  }
}
```

#### PUT `/api/quizzes/:id`
```json
// Response 200
{
  "success": true,
  "message": "Quiz updated",
  "data": {
    "quiz": { ... }
  }
}
```

#### DELETE `/api/quizzes/:id`
```json
// Response 200
{
  "success": true,
  "message": "Quiz deleted"
}
```

---

### 3. Question Management (fFA1, fFA2, fFA3, fFA4)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/quizzes/:quizId/questions` | List all questions for a quiz | Yes |
| GET | `/api/questions/:id` | Get single question | Yes |
| POST | `/api/quizzes/:quizId/questions` | Add question to quiz | Yes |
| PUT | `/api/questions/:id` | Update question | Yes |
| DELETE | `/api/questions/:id` | Delete question | Yes |
| PUT | `/api/quizzes/:quizId/questions/reorder` | Reorder questions | Yes |

#### GET `/api/quizzes/:quizId/questions`
```json
// Response 200
{
  "success": true,
  "message": "Questions retrieved",
  "data": {
    "questions": [...]
  }
}
```

#### Supported Question Types

```
multiple-choice | true-false | type-answer | sort | quiz-audio | slider | pin-answer
poll | word-cloud | brainstorm | drop-pin | open-ended | scale | nps-scale
```

#### Validation Rules by Type

| Type | text | timeLimit | points | answers | Other |
|------|------|-----------|--------|---------|-------|
| multiple-choice | required, 120 | 5–240 | 0/1000/2000 | 2–6, 1+ correct | allowMultipleAnswers |
| true-false | required, 120 | 5–240 | 0/1000/2000 | 2 (fixed) | — |
| type-answer | required, 120 | 20–240 | 0/1000/2000 | 1–4 (max 20 chars) | case-insensitive |
| sort | required, 120 | 20–240 | 0/1000/2000 | 3–4 (ordered) | textToReadAloud |
| quiz-audio | required, 120 | 5–240 | 0/1000/2000 | varies | audioLanguage required |
| slider | required, 120 | 10–240 | 0/1000/2000 | — | sliderConfig required |
| pin-answer | required, 120 | 20–240 | 0/1000/2000 | — | pinConfig + mediaUrl required |
| poll | required, 120 | 5–240 | 0 (no points) | 2–6 | allowMultipleAnswers |
| word-cloud | required, 120 | 20–240 | 0 | — | — |
| brainstorm | optional | 30–240 | 0 | — | brainstormConfig required |
| drop-pin | required, 120 | 20–240 | 0 | — | mediaUrl required |
| open-ended | required, 120 | 20–240 | 0 | — | — |
| scale | optional | — | 0 | — | scaleConfig required |
| nps-scale | optional | — | 0 | — | scaleConfig required |

#### POST `/api/quizzes/:quizId/questions`

**Multiple-choice example:**
```json
// Request
{
  "type": "multiple-choice",
  "text": "What is 2 + 2?",
  "mediaUrl": null,
  "timeLimit": 30,
  "points": 1000,
  "order": 1,
  "allowMultipleAnswers": false,
  "answers": [
    { "text": "3", "isCorrect": false },
    { "text": "4", "isCorrect": true },
    { "text": "5", "isCorrect": false },
    { "text": "6", "isCorrect": false }
  ]
}
```

**Slider example:**
```json
{
  "type": "slider",
  "text": "What year was the Eiffel Tower built?",
  "timeLimit": 30,
  "points": 1000,
  "order": 2,
  "sliderConfig": {
    "min": 1800,
    "max": 1950,
    "unit": "year",
    "correctValue": 1889,
    "margin": "medium"
  }
}
```

**Pin-answer example:**
```json
{
  "type": "pin-answer",
  "text": "Where is Paris on this map?",
  "mediaUrl": "/media/europe-map.png",
  "mediaType": "image",
  "timeLimit": 30,
  "points": 1000,
  "order": 3,
  "pinConfig": {
    "x": 48,
    "y": 32,
    "radius": 5
  }
}
```

**Scale example (opinion, no points):**
```json
{
  "type": "scale",
  "text": "How satisfied are you?",
  "points": 0,
  "order": 4,
  "scaleConfig": {
    "scaleType": "likert",
    "min": 1,
    "max": 5,
    "startLabel": "Very unsatisfied",
    "endLabel": "Very satisfied"
  }
}
```

**Brainstorm example (opinion, text optional):**
```json
{
  "type": "brainstorm",
  "text": "",
  "timeLimit": 60,
  "points": 0,
  "order": 5,
  "brainstormConfig": {
    "maxIdeas": 3,
    "votingTime": 30
  }
}
```

**Response (all types):**
```json
// Response 201
{
  "success": true,
  "message": "Question added",
  "data": {
    "question": {
      "id": "string",
      "quizId": "string",
      "type": "multiple-choice",
      "text": "What is 2 + 2?",
      "mediaUrl": null,
      "timeLimit": 30,
      "points": 1000,
      "order": 1,
      "answers": [...],
      "allowMultipleAnswers": false,
      "sliderConfig": null,
      "pinConfig": null,
      "scaleConfig": null,
      "brainstormConfig": null
    }
  }
}
```

#### GET `/api/questions/:id`
```json
// Response 200
{
  "success": true,
  "message": "Question retrieved",
  "data": {
    "question": { ... }
  }
}
```

#### PUT `/api/questions/:id`
```json
// Request (partial update allowed)
{
  "text": "Updated question text",
  "timeLimit": 45,
  "answers": [...]
}

// Response 200
{
  "success": true,
  "message": "Question updated",
  "data": {
    "question": { ... }
  }
}
```

#### DELETE `/api/questions/:id`
```json
// Response 200
{
  "success": true,
  "message": "Question deleted"
}
```

#### PUT `/api/quizzes/:quizId/questions/reorder`
```json
// Request
{
  "questionIds": ["questionId3", "questionId1", "questionId2"]
}

// Response 200
{
  "success": true,
  "message": "Questions reordered",
  "data": {
    "questions": [...]
  }
}
```

---

### 4. Media Upload (fFA2, fFA5)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/media/upload` | Upload image (max 5MB, jpg/png/gif) | Yes |
| GET | `/api/media/:id` | Get media metadata | Yes |
| DELETE | `/api/media/:id` | Delete uploaded media | Yes |
| GET | `/media/:id` | Serve media file (access-controlled) | Optional |

#### POST `/api/media/upload`
```json
// Request: multipart/form-data
// Field name: "file"
// Allowed types: image/jpeg, image/png, image/gif
// Max size: 5MB

// Response 201
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "string",
    "url": "/media/abc123.png",
    "filename": "question-image.png",
    "size": 102400,
    "mimeType": "image/png"
  }
}
```

#### GET `/api/media/:id`
```json
// Response 200
{
  "success": true,
  "message": "Media info retrieved",
  "data": {
    "id": "string",
    "url": "/media/abc123.png",
    "filename": "question-image.png",
    "mimeType": "image/png",
    "size": 102400,
    "uploadedBy": "userId",
    "createdAt": "ISO8601"
  }
}
```

#### DELETE `/api/media/:id`
```json
// Response 200
{
  "success": true,
  "message": "Media deleted"
}
```

#### GET `/media/:id` (File Serving)

Serves the actual media file with access control. If the media is linked to a question, any authenticated user or players in an active session using that quiz can access it. Orphan files (not linked to questions) are only accessible by the uploader.

```
// Response 200
// Content-Type: image/png (or appropriate mime type)
// Body: binary file data

// Response 404 (media not found)
{
  "success": false,
  "error": "Media not found"
}

// Response 403 (access denied)
{
  "success": false,
  "error": "Access denied"
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
  "success": true,
  "message": "Session created",
  "data": {
    "session": {
      "id": "string",
      "quizId": "string",
      "pin": "483912",
      "status": "lobby",
      "createdAt": "ISO8601",
      "expiresAt": "ISO8601"
    }
  }
}
```

#### GET `/api/sessions/:id`
```json
// Response 200
{
  "success": true,
  "message": "Session retrieved",
  "data": {
    "session": {
      "id": "string",
      "quizId": { ... },
      "pin": "483912",
      "status": "lobby",
      "participants": [...],
      "createdAt": "ISO8601",
      "expiresAt": "ISO8601"
    }
  }
}
```

#### DELETE `/api/sessions/:id`
```json
// Response 200
{
  "success": true,
  "message": "Session ended",
  "data": {
    "session": { ... }
  }
}
```

#### GET `/api/sessions/:id/results` (fPA4, fPA5)
```json
// Response 200
{
  "success": true,
  "message": "Session results retrieved",
  "data": {
    "sessionId": "string",
    "quizTitle": "string",
    "pin": "483912",
    "status": "finished",
    "totalParticipants": 10,
    "finishedAt": "ISO8601",
    "rankings": [
      {
        "rank": 1,
        "name": "Player1",
        "avatar": "🦊",
        "score": 9500
      }
    ]
  }
}
```

---

### 6. Quiz Library

The Library allows users to browse, clone, and run public quizzes. Quizzes can be published by users or created as "official" quizzes by admins.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/library` | Browse published quizzes | No (optional) |
| GET | `/api/library/:id` | Get library quiz detail | No (optional) |
| POST | `/api/library/:id/start` | Start a library quiz (guest or auth) | No (optional) |
| POST | `/api/library/:id/clone` | Clone quiz to own collection | Yes |
| PUT | `/api/quizzes/:id/publish` | Publish own quiz to library | Yes |
| PUT | `/api/quizzes/:id/unpublish` | Remove own quiz from library | Yes |
| POST | `/api/library/official` | Create official quiz | Yes (Admin) |

#### GET `/api/library`

Browse published quizzes with search, filtering, and sorting.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | — | Text search in title/description |
| `category` | string | — | Filter by category |
| `tag` | string | — | Filter by tag (can repeat for multiple) |
| `sort` | string | `newest` | `newest`, `popular`, or `title` |
| `official` | string | — | `true` to show only official quizzes |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 50) |

```json
// Response 200
{
  "success": true,
  "message": "Library retrieved",
  "data": {
    "quizzes": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "category": "string",
        "tags": ["math", "algebra"],
        "isOfficial": false,
        "playCount": 42,
        "publishedAt": "ISO8601",
        "author": "Author Name"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 85,
      "totalPages": 5
    }
  }
}
```

#### GET `/api/library/:id`

Get full details of a published quiz (questions are summarized, answers not exposed).

```json
// Response 200
{
  "success": true,
  "message": "Library quiz retrieved",
  "data": {
    "quiz": {
      "id": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "tags": ["math"],
      "isOfficial": true,
      "playCount": 100,
      "publishedAt": "ISO8601",
      "author": "Admin",
      "questionCount": 10,
      "questions": [
        {
          "id": "string",
          "type": "multiple-choice",
          "text": "What is 2+2?",
          "mediaUrl": null,
          "mediaType": null,
          "timeLimit": 30,
          "points": 1000,
          "order": 1,
          "answerCount": 4
        }
      ]
    }
  }
}
```

#### POST `/api/library/:id/start`

Start a library quiz directly — works as guest (no login) or as an authenticated user.
Creates a new session with a 6-digit PIN. When called without auth a `guestToken` is returned
that acts as the session-specific moderator credential.

```json
// Response 201
{
  "success": true,
  "message": "Session created",
  "data": {
    "session": {
      "id": "string",
      "quizId": "string",
      "pin": "483912",
      "status": "lobby",
      "guestToken": "string (null when authenticated)",
      "createdAt": "ISO8601",
      "expiresAt": "ISO8601"
    }
  }
}
```

#### POST `/api/library/:id/clone`

Clone a library quiz into the authenticated user's own quiz collection. Creates copies of the quiz and all its questions.

```json
// Response 201
{
  "success": true,
  "message": "Quiz cloned to your collection",
  "data": {
    "quiz": {
      "id": "string",
      "title": "string",
      "description": "string",
      "category": "string",
      "questionCount": 10,
      "clonedFrom": "string (original quiz ID)"
    }
  }
}
```

#### PUT `/api/quizzes/:id/publish`

Publish one of your own quizzes to the public library. The quiz must have at least 1 question.

```json
// Request
{
  "tags": ["math", "algebra", "grade-10"]
}

// Response 200
{
  "success": true,
  "message": "Quiz published to library",
  "data": {
    "quiz": {
      "id": "string",
      "title": "string",
      "isPublished": true,
      "publishedAt": "ISO8601",
      "tags": ["math", "algebra", "grade-10"]
    }
  }
}
```

#### PUT `/api/quizzes/:id/unpublish`

Remove your quiz from the public library.

```json
// Response 200
{
  "success": true,
  "message": "Quiz removed from library",
  "data": {
    "quiz": {
      "id": "string",
      "title": "string",
      "isPublished": false
    }
  }
}
```

#### POST `/api/library/official` *(Admin only)*

Create a quiz that is immediately published and marked as official.

```json
// Request
{
  "title": "Official Math Quiz",
  "description": "Basic algebra questions",
  "category": "Mathematics",
  "tags": ["math", "official"]
}

// Response 201
{
  "success": true,
  "message": "Official quiz created",
  "data": {
    "quiz": {
      "id": "string",
      "moderatorId": "string",
      "title": "Official Math Quiz",
      "description": "Basic algebra questions",
      "category": "Mathematics",
      "tags": ["math", "official"],
      "isPublished": true,
      "isOfficial": true,
      "publishedAt": "ISO8601",
      "playCount": 0
    }
  }
}
```

---

### 7. Health & Monitoring

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check endpoint | No |

#### GET `/api/health`

Returns server health status. Returns HTTP 200 when healthy, HTTP 503 when degraded (e.g., database disconnected).

```json
// Response 200 (healthy)
{
  "success": true,
  "message": "Health check",
  "data": {
    "status": "healthy",
    "timestamp": "ISO8601",
    "uptime": 3600,
    "database": "connected",
    "activeSessions": 5
  }
}

// Response 503 (degraded)
{
  "success": true,
  "message": "Health check",
  "data": {
    "status": "degraded",
    "timestamp": "ISO8601",
    "uptime": 3600,
    "database": "disconnected",
    "activeSessions": 0
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"healthy"` or `"degraded"` |
| `timestamp` | string | ISO8601 timestamp |
| `uptime` | number | Server uptime in seconds |
| `database` | string | `"connected"` or `"disconnected"` |
| `activeSessions` | number | Count of in-memory active game sessions |

---

## WebSocket Events

Connection: `io.connect('http://localhost:3000')`

### Event Constants

All WebSocket events are defined as constants in `backend/src/socket/events.js`:

```javascript
// Player Events
PLAYER_EVENTS.CHECK_PIN      // 'player:check-pin'
PLAYER_EVENTS.JOIN           // 'player:join'
PLAYER_EVENTS.ANSWER         // 'player:answer'
PLAYER_EVENTS.RECONNECT      // 'player:reconnect'
PLAYER_EVENTS.PIN_VALID      // 'player:pin-valid'
PLAYER_EVENTS.PIN_INVALID    // 'player:pin-invalid'
PLAYER_EVENTS.JOINED         // 'player:joined'
PLAYER_EVENTS.ANSWER_ACK     // 'player:answer:ack'
PLAYER_EVENTS.ANSWER_RECEIVED // 'player:answer:received'
PLAYER_EVENTS.ANSWER_DETAIL  // 'player:answer:detail'
PLAYER_EVENTS.KICKED         // 'player:kicked'
PLAYER_EVENTS.LEFT           // 'player:left'
PLAYER_EVENTS.REMOVED        // 'player:removed'
PLAYER_EVENTS.ERROR          // 'player:error'

// Moderator Events
MODERATOR_EVENTS.JOIN        // 'moderator:join'
MODERATOR_EVENTS.START       // 'moderator:start'
MODERATOR_EVENTS.NEXT        // 'moderator:next'
MODERATOR_EVENTS.END_QUESTION // 'moderator:end-question'
MODERATOR_EVENTS.PAUSE       // 'moderator:pause'
MODERATOR_EVENTS.RESUME      // 'moderator:resume'
MODERATOR_EVENTS.KICK        // 'moderator:kick'
MODERATOR_EVENTS.END         // 'moderator:end'
MODERATOR_EVENTS.JOINED      // 'moderator:joined'
MODERATOR_EVENTS.ERROR       // 'moderator:error'

// Game Events
GAME_EVENTS.STARTED          // 'game:started'
GAME_EVENTS.QUESTION         // 'game:question'
GAME_EVENTS.TIMER            // 'game:timer'
GAME_EVENTS.QUESTION_END     // 'game:questionEnd'
GAME_EVENTS.LEADERBOARD      // 'game:leaderboard'
GAME_EVENTS.PAUSED           // 'game:paused'
GAME_EVENTS.RESUMED          // 'game:resumed'
GAME_EVENTS.END              // 'game:end'

// Lobby Events
LOBBY_EVENTS.UPDATE          // 'lobby:update'

// Session Events
SESSION_EVENTS.HOST_DISCONNECTED // 'session:hostDisconnected'

// Error Codes
ERROR_CODES.VALIDATION_ERROR
ERROR_CODES.PIN_INVALID
ERROR_CODES.SESSION_NOT_FOUND
ERROR_CODES.SESSION_EXPIRED
ERROR_CODES.SESSION_FULL
ERROR_CODES.SESSION_NOT_HOSTED
ERROR_CODES.SESSION_ALREADY_HOSTED
ERROR_CODES.QUIZ_IN_PROGRESS
ERROR_CODES.INVALID_STATE
ERROR_CODES.NOT_AUTHORIZED
ERROR_CODES.NOT_FOUND
ERROR_CODES.INTERNAL_ERROR
```

### Player Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `player:check-pin` | `{ pin }` | Lightweight PIN validation (no player created) |
| `player:join` | `{ pin, name, avatar? }` | Join session with PIN (fSZ3, fBV2) |
| `player:answer` | `{ questionId?, answerId, timeTaken }` | Submit answer (fSA4). `questionId` falls back to server's current question if omitted. |
| `player:reconnect` | `{ sessionId, oldPlayerId }` | Reconnect after disconnect (fSA7, 30s window) |

### Player Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `player:pin-valid` | `{ pin }` | PIN check succeeded — session exists and is in lobby |
| `player:pin-invalid` | `{ code, message }` | PIN check failed — invalid PIN or game in progress |
| `player:joined` | `{ playerId, sessionId }` | Confirm join success |
| `player:answer:ack` | `{ questionId, answerId, receivedAt }` | Server acknowledged the answer |
| `player:kicked` | `{ reason }` | Player was removed (fSZ5) |
| `player:error` | `{ code, message }` | Error occurred |

### Room-wide Events (Server → All Clients in Session)

| Event | Payload | Description |
|-------|---------|-------------|
| `player:answer:received` | `{ questionId, answerCount }` | New answer count (no answer details, safe for all clients) |

### Host-only Events (Server → Moderator Socket)

| Event | Payload | Description |
|-------|---------|-------------|
| `player:answer:detail` | `{ questionId, answerId, answerCount }` | Per-answer detail for distribution tracking (sent only to host) |

### Moderator Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `moderator:join` | `{ pin?, quizId? }` | Join/create session as moderator. If no `pin`, server generates one. |
| `moderator:start` | `{ firstQuestion }` | Start the quiz (fSA1). Broadcasts `game:started` + `game:question`. Starts server timer. |
| `moderator:next` | `{ question }` | Advance to next question (fSA1). Broadcasts `game:question`. Starts server timer. |
| `moderator:end-question` | `{ correctAnswerIds? }` | End current question early (Reveal). Stops timer, triggers scoring + leaderboard. |
| `moderator:pause` | — | Pause game (fSA5) |
| `moderator:resume` | — | Resume game (fSA5) |
| `moderator:kick` | `{ playerId }` | Remove player (fSZ5) |
| `moderator:end` | — | End session. Broadcasts final leaderboard, cleans up session. |

#### Question payload shape (used in `moderator:start` and `moderator:next`)

```json
{
  "questionId": "string (MongoDB _id)",
  "questionNumber": 1,
  "totalQuestions": 10,
  "text": "What is the capital of France?",
  "options": [
    { "id": "answerId1", "text": "Paris" },
    { "id": "answerId2", "text": "London" }
  ],
  "timeLimit": 30,
  "correctAnswerIds": ["answerId1"]
}
```

> **Note:** `correctAnswerIds` are stored server-side for scoring but **never** broadcast to players. The `options` array deliberately omits `isCorrect`.

### Moderator Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `moderator:joined` | `{ sessionId, quizId, status }` | Confirm moderator joined |
| `moderator:error` | `{ code, message }` | Moderator action failed |

### Game Broadcast Events (Server → All Clients) — WS-4

| Event | Payload | Description |
|-------|---------|-------------|
| `lobby:update` | `{ players: [...], playerCount }` | Lobby player list updated (fSZ4) |
| `game:started` | `{ status: 'playing' }` | Game has started |
| `game:question` | `{ questionId, questionNumber, totalQuestions, text, options, timeLimit }` | New question broadcast (fSA2). `questionId` is the MongoDB `_id`. |
| `game:timer` | `{ remaining }` | Server-authoritative timer tick, every second (fSA3) |
| `game:questionEnd` | `{ correctAnswerIds }` | Question ended — correct answers revealed (fSA6). Fired when: timer expires, moderator reveals, or all players answered. |
| `game:leaderboard` | `{ leaderboard }` | Leaderboard after each question (fPA3). Full ranked list of all players. |
| `game:paused` | `{ status: 'paused' }` | Game paused |
| `game:resumed` | `{ status: 'playing' }` | Game resumed |
| `game:end` | `{ leaderboard, stats }` | Quiz finished with final results (fPA4) |

#### `game:leaderboard` / `game:end` leaderboard entry shape

```json
[
  { "position": 1, "playerId": "p_xxx", "nickname": "Alice", "score": 2000 },
  { "position": 2, "playerId": "p_yyy", "nickname": "Bob",   "score": 1500 }
]
```

#### `game:end` stats shape

```json
{
  "totalPlayers": 5,
  "totalQuestions": 10,
  "reason": "game_complete"
}
```

### Question Auto-End Triggers

The server automatically ends the current question (scores answers, broadcasts `game:questionEnd` + `game:leaderboard`) when any of these conditions is met:

1. **Server timer expires** — countdown reaches 0
2. **Moderator clicks Reveal** — `moderator:end-question` event
3. **All connected players answered** — checked after each `player:answer`

All three paths are idempotent (a `questionEnded` flag prevents double-scoring).

### Connection Events

| Event | Description |
|-------|-------------|
| `connect` | Socket connected |
| `disconnect` | Socket disconnected (30s reconnect window starts) |

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
  // Library fields
  isPublished: Boolean (default: false),
  isOfficial: Boolean (default: false),
  publishedAt: Date,
  playCount: Number (default: 0),
  tags: [String],
  clonedFrom: ObjectId (ref: Quiz, nullable),
  createdAt: Date,
  updatedAt: Date
}
```

### Question
```javascript
{
  _id: ObjectId,
  quizId: ObjectId (ref: Quiz),
  type: Enum [
    'multiple-choice', 'true-false', 'type-answer', 'sort',
    'quiz-audio', 'slider', 'pin-answer',
    'poll', 'word-cloud', 'brainstorm', 'drop-pin',
    'open-ended', 'scale', 'nps-scale'
  ],
  text: String,           // max 120 chars; required for most types, optional for brainstorm/scale/nps-scale
  textToReadAloud: String, // for Sort, Quiz+Audio; max 120 chars
  mediaUrl: String,
  mediaType: String,       // 'image' | 'video' | 'audio'
  audioLanguage: String,   // for quiz-audio; e.g. 'en', 'de'
  timeLimit: Number,       // 5–240 seconds; minimum varies by type
  points: Number,          // 0 | 1000 | 2000; opinion types must be 0
  order: Number,
  answers: [{              // used by MC, true-false, type-answer, sort, poll
    _id: ObjectId,
    text: String,          // max 75 chars (20 for type-answer)
    imageUrl: String,
    isCorrect: Boolean,    // null for opinion types
    order: Number          // for Sort (correct order)
  }],
  allowMultipleAnswers: Boolean,   // for multiple-choice, poll
  sliderConfig: {                  // for slider
    min: Number, max: Number,
    unit: String,                  // max 20 chars
    correctValue: Number,
    margin: Enum ['none','low','medium','high','max']
  },
  pinConfig: {                     // for pin-answer
    x: Number, y: Number,         // 0–100 percentage
    radius: Number                 // tolerance in %
  },
  scaleConfig: {                   // for scale, nps-scale
    scaleType: Enum ['likert','custom','nps'],
    min: Number, max: Number,
    startLabel: String, endLabel: String
  },
  brainstormConfig: {              // for brainstorm
    maxIdeas: Number,              // 1–5
    votingTime: Number             // seconds
  },
  createdAt: Date,
  updatedAt: Date
}

// Indexes
questionSchema.index({ quizId: 1, order: 1 });
```
*Full question type list, validation rules, and per-type constraints: docs/QuestionTypes.md*

### Session
```javascript
{
  _id: ObjectId,
  quizId: ObjectId (ref: Quiz),
  moderatorId: ObjectId (ref: User, nullable),  // null for guest-hosted sessions
  guestToken: String (nullable),                 // opaque token for guest moderator control
  pin: String (unique, 6-digit numeric),
  status: Enum ['lobby', 'playing', 'paused', 'finished'],
  currentQuestionIndex: Number,
  createdAt: Date,
  expiresAt: Date,
  finishedAt: Date
}

// Indexes
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });  // TTL index
sessionSchema.index({ moderatorId: 1, status: 1 });                // Query optimization
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

Polymorphic answer payload — which fields are populated depends on `questionType`.

```javascript
{
  _id: ObjectId,
  participantId: ObjectId (ref: Participant),
  questionId: ObjectId (ref: Question),
  questionType: String,              // copied from Question.type for easy interpretation

  // Answer payloads (use the one matching questionType)
  answerId: ObjectId,                // MC, true-false, poll, quiz-audio (single select)
  answerIds: [ObjectId],             // MC, poll (multi-select via allowMultipleAnswers)
  textAnswer: String,                // type-answer, word-cloud, open-ended, brainstorm
  numericAnswer: Number,             // slider, scale, nps-scale
  pinAnswer: { x: Number, y: Number }, // pin-answer, drop-pin (0–100 %)
  orderedAnswerIds: [ObjectId],      // sort (player's ordering)

  // Common
  timeTaken: Number (ms),
  pointsAwarded: Number,
  createdAt: Date
}
```

**Unique constraint:** one submission per participant per question.

---

## Scoring Algorithm (fPA1, fPA2)

Scoring is handled **server-side** in `broadcastEvents.js` when a question ends.

```javascript
const BASE_POINTS = 1000;
const MIN_CORRECT_POINTS = 100;

function calculatePoints(isCorrect, timeTakenMs, timeLimitSec) {
  if (!isCorrect) return 0;

  const timeTakenSec = Math.max(0, timeTakenMs / 1000);
  const timeBonus = Math.max(0, (timeLimitSec - timeTakenSec) / timeLimitSec);
  const points = Math.round(BASE_POINTS * timeBonus);

  // Guarantee a minimum reward for every correct answer
  return Math.max(points, MIN_CORRECT_POINTS);
}

// Range: 100–1000 for correct answers, 0 for wrong answers
// Fastest correct answer = 1000 pts, slowest = 100 pts
```

Player scores accumulate across questions. The leaderboard is recomputed and broadcast after every question.

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
