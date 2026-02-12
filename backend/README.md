# Answr Backend

Node.js/Express Backend mit Socket.io für Echtzeit-Kommunikation.

## Setup

```bash
# Dependencies installieren
npm install

# .env Datei erstellen
cp .env.example .env

# Entwicklungsserver starten
npm run dev
```

## Ordnerstruktur

```
src/
├── server.js              # Hauptserver mit Express & Socket.io
├── config/
│   └── database.js        # MongoDB Connection
├── models/                # Mongoose Datenbank-Modelle
│   ├── User.js            # User/Moderator
│   ├── Quiz.js            # Quiz-Metadaten
│   ├── Question.js        # Fragen (mit embedded Answers)
│   ├── Session.js         # Spiel-Sessions (TTL 2h)
│   ├── Participant.js     # Teilnehmer
│   └── Submission.js      # Antwort-Einreichungen
├── routes/                # REST API Routes
│   ├── auth.js            # /api/auth/*
│   ├── quizzes.js         # /api/quizzes/*
│   └── sessions.js        # /api/sessions/*
├── controllers/           # Business-Logik
│   ├── authController.js
│   ├── quizController.js
│   └── sessionController.js
├── socket/                # WebSocket Event-Handler
│   ├── index.js           # Initialisierung & Connection-Handling
│   ├── moderatorEvents.js # Moderator-Steuerung
│   ├── playerEvents.js    # Spieler-Interaktion
│   └── gameEvents.js      # Broadcast-Helpers
├── middleware/            # Custom Middleware
│   ├── auth.js            # JWT Verification
│   └── validate.js        # Request Body Validation
└── utils/
    └── pinGenerator.js    # 6-stellige numerische PIN-Generierung
```

## API Endpoints

### Authentifizierung ✅
- `POST /api/auth/register` - Moderator Registrierung
- `POST /api/auth/login` - Moderator Login
- `GET /api/auth/me` - Aktueller User (geschützt)

### Quiz-Verwaltung ✅
- `GET /api/quizzes` - Alle Quizze des Users abrufen
- `GET /api/quizzes/:id` - Quiz mit Fragen abrufen
- `POST /api/quizzes` - Quiz erstellen
- `PUT /api/quizzes/:id` - Quiz bearbeiten
- `DELETE /api/quizzes/:id` - Quiz + Fragen löschen

### Session-Verwaltung ✅
- `POST /api/sessions` - Session erstellen (generiert 6-stellige PIN)
- `GET /api/sessions/:id` - Session-Details abrufen
- `DELETE /api/sessions/:id` - Session beenden
- `GET /api/sessions/:id/results` - Endergebnisse & Statistiken

### Question-Verwaltung (geplant)
- `POST /api/quizzes/:quizId/questions` - Frage hinzufügen
- `PUT /api/questions/:id` - Frage bearbeiten
- `DELETE /api/questions/:id` - Frage löschen

## WebSocket Events

### Client → Server (Spieler)
- `player:join` - Session beitreten `{ pin, name, avatar? }`
- `player:answer` - Antwort senden `{ questionId, answerId, timeTaken? }`
- `player:reconnect` - Nach Disconnect neu verbinden `{ sessionId, oldPlayerId }`

### Client → Server (Moderator)
- `moderator:join` - Session als Host erstellen/beitreten `{ pin?, quizId? }`
- `moderator:start` - Spiel starten
- `moderator:next` - Nächste Frage senden `{ question }`
- `moderator:pause` - Spiel pausieren
- `moderator:resume` - Spiel fortsetzen
- `moderator:kick` - Spieler entfernen `{ playerId }`
- `moderator:end` - Session beenden

### Server → Client
- `player:joined` - Beitritt bestätigt `{ playerId, sessionId }`
- `player:answer:ack` - Antwort empfangen
- `player:kicked` - Spieler wurde entfernt
- `player:left` - Spieler hat verlassen
- `lobby:update` - Lobby-Status `{ players[], playerCount }`
- `game:started` - Spiel gestartet
- `game:question` - Neue Frage `{ questionNumber, text, options, timeLimit }`
- `game:timer` - Timer-Update `{ remaining }`
- `game:questionEnd` - Frage beendet `{ correctAnswer }`
- `game:leaderboard` - Rangliste `{ leaderboard[] }`
- `game:paused` / `game:resumed` - Spiel pausiert/fortgesetzt
- `game:end` - Spiel beendet `{ leaderboard[], stats }`
