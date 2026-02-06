# Answr Frontend

Svelte-basiertes Frontend für die Answr Quiz-Plattform.

## Setup

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Frontend läuft auf: http://localhost:5173

## Ordnerstruktur

```
src/
├── main.js             # Entry Point
├── App.svelte          # Haupt-App-Komponente
├── lib/                # Utilities & Services
│   └── socket.js       # WebSocket Service
├── components/         # Wiederverwendbare Komponenten
├── routes/             # Seiten/Views
└── stores/             # Svelte Stores für State Management
```

## Geplante Views

- **Home** - Landing Page mit "Quiz erstellen" / "Quiz beitreten"
- **Moderator Dashboard** - Quiz-Übersicht
- **Quiz Creator** - Quiz erstellen/bearbeiten
- **Game Lobby** - Warte-Bereich vor Spielstart
- **Moderator Control** - Live-Steuerung während des Spiels
- **Player View** - Spieler-Interface für Fragen
- **Results** - Endergebnis & Rangliste

## Geplante Komponenten

- `QuizCard` - Quiz-Vorschau
- `QuestionEditor` - Frage bearbeiten
- `AnswerButton` - Antwort-Button für Spieler
- `Leaderboard` - Ranglisten-Anzeige
- `Timer` - Countdown-Timer
- `PinDisplay` - Session-PIN Anzeige
