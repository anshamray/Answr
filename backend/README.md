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
├── server.js           # Hauptserver mit Express & Socket.io
├── routes/             # API Route-Handler
├── controllers/        # Business-Logik
├── models/             # Mongoose Datenbank-Modelle
├── middleware/         # Custom Middleware (Auth, etc.)
├── config/             # Konfigurationsdateien
└── utils/              # Hilfsfunktionen
```

## API Endpoints (geplant)

### Authentifizierung
- `POST /api/auth/login` - Moderator Login
- `POST /api/auth/register` - Moderator Registrierung (optional)

### Quiz-Verwaltung
- `GET /api/quizzes` - Alle Quizze abrufen
- `POST /api/quizzes` - Quiz erstellen
- `GET /api/quizzes/:id` - Quiz Details
- `PUT /api/quizzes/:id` - Quiz bearbeiten
- `DELETE /api/quizzes/:id` - Quiz löschen

### Session-Verwaltung
- `POST /api/sessions/start` - Session starten
- `GET /api/sessions/:pin` - Session mit PIN finden
- `POST /api/sessions/:id/join` - Session beitreten

## WebSocket Events

### Client → Server
- `join-game` - Spieler tritt Session bei
- `join-as-moderator` - Moderator tritt Session bei
- `start-question` - Moderator startet Frage
- `submit-answer` - Spieler sendet Antwort

### Server → Client
- `new-question` - Neue Frage wurde gestartet
- `question-ended` - Zeit für Frage ist abgelaufen
- `leaderboard` - Aktualisierte Rangliste
- `player-joined` - Neuer Spieler ist beigetreten
