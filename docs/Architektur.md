# Answr - System-Architektur

## Übersicht

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                     │
│  ┌──────────────┐              ┌──────────────┐    │
│  │  Moderator   │              │   Spieler    │    │
│  │  Interface   │              │  Interface   │    │
│  └──────┬───────┘              └──────┬───────┘    │
│         │                             │             │
│         └─────────────┬───────────────┘             │
│                       │                             │
│                  Vue 3 App                          │
│              (Port 5173 - Dev)                      │
└───────────────────────┼─────────────────────────────┘
                        │
                        │ HTTP/REST + WebSocket
                        │
┌───────────────────────┼─────────────────────────────┐
│                  SERVER LAYER                       │
│              ┌────────▼────────┐                    │
│              │  Express.js     │                    │
│              │  + Socket.io    │                    │
│              │  (Port 3000)    │                    │
│              └────────┬────────┘                    │
│                       │                             │
│         ┌─────────────┼─────────────┐              │
│         │             │             │              │
│    ┌────▼────┐   ┌───▼────┐   ┌───▼────┐         │
│    │  REST   │   │WebSocket│   │ Business│         │
│    │  API    │   │ Handler │   │  Logic  │         │
│    └────┬────┘   └───┬────┘   └───┬────┘         │
│         │            │            │              │
│         └────────────┼────────────┘              │
└──────────────────────┼──────────────────────────────┘
                       │
                       │ Mongoose ODM
                       │
┌──────────────────────┼──────────────────────────────┐
│               DATABASE LAYER                        │
│              ┌───────▼────────┐                     │
│              │   MongoDB      │                     │
│              │                │                     │
│              │  Collections:  │                     │
│              │  - users       │                     │
│              │  - quizzes     │                     │
│              │  - sessions    │                     │
│              │  - questions   │                     │
│              └────────────────┘                     │
└─────────────────────────────────────────────────────┘
```

## Kommunikationsfluss

### HTTP/REST (Statische Operationen)

```
Client → POST /api/quizzes → Server → DB
Client ← 201 Created ← Server ← DB
```

**Verwendung:**
- Authentifizierung
- Quiz CRUD-Operationen
- Session-Setup

### WebSocket (Echtzeit-Operationen)

```
Client ─┬→ emit('submit-answer') → Server
        │                            ↓
        │                        [Process]
        │                            ↓
        ├← on('answer-result') ← Server
        │
        └← on('leaderboard') ←────┘
```

**Verwendung:**
- Spielablauf
- Live-Updates
- Lobby-Management

## Datenmodelle (geplant)

### User (Moderator)
```javascript
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  name: String,
  createdAt: Date
}
```

### Quiz
```javascript
{
  _id: ObjectId,
  moderatorId: ObjectId,
  title: String,
  description: String,
  category: String,
  questions: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### Question
```javascript
{
  _id: ObjectId,
  quizId: ObjectId,
  type: String,  // multiple-choice | true-false | slider | puzzle | type-answer | poll | ...
  text: String,  // max 120 chars
  mediaUrl: String,
  mediaType: String,  // 'image' | 'video' | 'audio'
  timeLimit: Number,  // 5–240 seconds
  points: Number,  // 0 | 1000 | 2000
  order: Number,
  answers: [{
    _id: ObjectId,
    text: String,
    imageUrl: String,
    isCorrect: Boolean,
    order: Number
  }],
  // Type-specific configs (slider, pin, scale, brainstorm) – siehe docs/QuestionTypes.md
  sliderConfig: { min, max, unit, correctValue, margin },
  pinConfig: { x, y, radius },
  scaleConfig: { scaleType, min, max, startLabel, endLabel },
  brainstormConfig: { maxIdeas, votingTime }
}
```
*Vollständige Typen: docs/QuestionTypes.md*

### Session
```javascript
{
  _id: ObjectId,
  quizId: ObjectId,
  pin: String,
  status: 'waiting' | 'active' | 'finished',
  currentQuestionIndex: Number,
  participants: [{
    playerId: String,
    name: String,
    avatar: String,
    score: Number,
    socketId: String
  }],
  startedAt: Date,
  finishedAt: Date
}
```

## WebSocket Events

### Client → Server
- `join-game` - Spieler/Moderator tritt bei
- `start-question` - Moderator startet Frage
- `submit-answer` - Spieler sendet Antwort
- `next-question` - Moderator → nächste Frage
- `end-game` - Moderator beendet Spiel

### Server → Client
- `new-question` - Neue Frage für alle
- `question-ended` - Zeit abgelaufen
- `answer-result` - Feedback für Spieler
- `leaderboard` - Aktualisierte Rangliste
- `player-joined` - Neuer Spieler in Lobby
- `game-finished` - Spiel beendet

## Deployment-Strategie (später)

```
Development:
- Frontend: Vite Dev Server (5173)
- Backend: Nodemon (3000)
- Database: Local MongoDB

Production:
- Frontend: Static Build → CDN/Nginx
- Backend: PM2/Docker → Cloud Server
- Database: MongoDB Atlas / Self-hosted
```

## Sicherheit

- [ ] HTTPS/WSS in Production
- [ ] JWT für Moderator-Auth (optional)
- [ ] Input Validation
- [ ] Rate Limiting
- [ ] CORS Configuration
- [ ] Password Hashing (bcrypt)

## Skalierung (Future)

- [ ] Redis für Session-State
- [ ] Load Balancer
- [ ] Horizontal Scaling
- [ ] CDN für Static Assets
