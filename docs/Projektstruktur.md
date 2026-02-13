# Answr - Projektstruktur

```
answr/
│
├── README.md                      # Haupt-Dokumentation
├── LICENSE                        # MIT Lizenz
├── CONTRIBUTING.md                # Contribution Guidelines
├── .gitignore                     # Git Ignore Regeln
├── docker-compose.yml             # Docker Compose (MongoDB + Backend)
│
├── backend/                       # Node.js Backend
│   ├── package.json              # NPM Dependencies
│   ├── .env.example              # Environment-Variablen Template
│   ├── README.md                 # Backend-Dokumentation
│   │
│   ├── src/
│   │   ├── server.js            # Hauptserver (Express + Socket.io)
│   │   │
│   │   ├── models/              # Mongoose Datenmodelle
│   │   │   ├── User.js         # User/Moderator-Schema
│   │   │   ├── Quiz.js         # Quiz-Schema
│   │   │   ├── Question.js     # Frage-Schema (mit Answers embedded)
│   │   │   ├── Session.js      # Session-Schema (TTL-Index, 2h Ablauf)
│   │   │   ├── Participant.js  # Teilnehmer-Schema
│   │   │   └── Submission.js   # Antwort-Einreichung-Schema
│   │   │
│   │   ├── routes/              # REST API Routes
│   │   │   ├── auth.js         # Authentifizierung
│   │   │   ├── quizzes.js      # Quiz-CRUD
│   │   │   ├── questions.js    # Question-CRUD & Reorder
│   │   │   ├── sessions.js     # Session-Management
│   │   │   └── library.js      # Quiz-Bibliothek (Browse, Clone, Publish)
│   │   │
│   │   ├── controllers/         # Business Logic
│   │   │   ├── authController.js
│   │   │   ├── quizController.js
│   │   │   ├── questionController.js  # Question: Add, Update, Delete, Reorder
│   │   │   ├── sessionController.js
│   │   │   └── libraryController.js   # Library: Browse, Clone, Publish/Unpublish
│   │   │
│   │   ├── socket/              # WebSocket Event-Handler
│   │   │   ├── index.js        # Socket-Initialisierung & Connection-Handling
│   │   │   ├── events.js       # Event-Konstanten (PLAYER_EVENTS, MODERATOR_EVENTS, etc.)
│   │   │   ├── sessionUtils.js # Shared Utilities (getConnectedPlayers, emitError, etc.)
│   │   │   ├── moderatorEvents.js # Moderator-Events (join, start, next, end-question, end)
│   │   │   ├── playerEvents.js    # Spieler-Events (check-pin, join, answer, reconnect)
│   │   │   ├── gameEvents.js      # Broadcast-Helpers (lobby, question, timer, leaderboard)
│   │   │   └── broadcastEvents.js # WS-4: Server-Timer, Scoring, Leaderboard-Berechnung
│   │   │
│   │   ├── middleware/          # Custom Middleware
│   │   │   ├── auth.js         # JWT Verification (authenticate, optionalAuth, requireAdmin)
│   │   │   └── validate.js     # Request Body Validation
│   │   │
│   │   ├── config/              # Konfiguration
│   │   │   └── database.js     # MongoDB Connection
│   │   │
│   │   └── utils/               # Hilfsfunktionen
│   │       ├── pinGenerator.js    # 6-stellige numerische PIN-Generierung
│   │       ├── responseHelper.js  # Konsistente API-Response-Formate
│   │       └── scoring.js         # WS-5: Punkteberechnung (Zeit-Bonus, konfigurierbar)
│   │
│   └── tests/                   # Tests (Jest)
│       ├── quiz.test.js
│       └── session.test.js
│
├── frontend/                     # Vue 3 Frontend (Vite + Tailwind CSS v4)
│   ├── package.json             # NPM Dependencies
│   ├── vite.config.js           # Vite + Tailwind Plugin
│   ├── index.html               # HTML Entry Point
│   ├── README.md                # Frontend-Dokumentation
│   │
│   └── src/
│       ├── main.js              # Vue Entry Point (Pinia + Router)
│       ├── App.vue              # Shell mit <router-view />
│       ├── styles.css           # Tailwind CSS Import
│       │
│       ├── router/
│       │   └── index.js         # Vue Router (Routen + Auth-Guard)
│       │
│       ├── stores/              # Pinia State Management
│       │   ├── authStore.js     # Auth: token, user, login/register/logout
│       │   └── gameStore.js     # Spieler: pin, question, leaderboard
│       │
│       ├── pages/               # Seiten-Komponenten
│       │   ├── LandingPage.vue  # PIN-Eingabe oder Login
│       │   ├── LoginPage.vue    # Moderator Login
│       │   ├── RegisterPage.vue # Moderator Registrierung
│       │   ├── DashboardPage.vue      # Quiz-Übersicht
│       │   ├── QuizEditPage.vue       # Quiz-Editor
│       │   ├── LibraryPage.vue        # Quiz-Bibliothek (Browse, Search, Filter)
│       │   ├── LibraryDetailPage.vue  # Quiz-Detail + Clone
│       │   ├── SessionLobbyPage.vue   # Moderator-Lobby (PIN anzeigen)
│       │   ├── GameControlPage.vue    # Spielsteuerung
│       │   ├── SessionResultsPage.vue # Ergebnisse
│       │   ├── PlayerJoinPage.vue     # Spieler: PIN + Name
│       │   ├── PlayerLobbyPage.vue    # Spieler: Warteraum
│       │   ├── PlayerGamePage.vue     # Spieler: Fragen beantworten
│       │   └── PlayerResultsPage.vue  # Spieler: Endergebnis
│       │
│       └── lib/                 # Services & Utils
│           └── socket.js       # Socket.io Client (connect/disconnect/getSocket)
│
├── docs/                         # Dokumentation
│   ├── Answr_Lastenheft.docx   # Original Lastenheft
│   ├── Architektur.md           # System-Architektur (Mermaid-Diagramme)
│   ├── API.md                   # API-Dokumentation (REST + WebSocket)
│   ├── Projektstruktur.md       # Diese Datei
│   ├── QuestionTypes.md         # Fragetypen-Referenz
│   └── QUICKSTART.md            # Schnelleinstieg
│
└── .github/                      # GitHub Konfiguration
    └── ISSUE_TEMPLATE/
        ├── bug_report.md
        └── feature_request.md
```

## Ordner-Beschreibungen

### `/backend`
Node.js Backend mit Express und Socket.io. Enthält REST API und WebSocket-Logik.

### `/frontend`
Vue 3 Frontend mit Vite, Tailwind CSS, Vue Router und Pinia. Zwei getrennte Flows: Moderator (Auth-geschützt) und Spieler (PIN-basiert).

### `/docs`
Projektdokumentation, Lastenheft und Architektur-Diagramme.

### `/.github`
GitHub-spezifische Dateien wie Issue-Templates.

## Fortschritt

1. ✅ Grundstruktur erstellt
2. ✅ Dependencies installieren (`npm install`)
3. ✅ MongoDB Setup (`src/config/database.js`)
4. ✅ User-Model implementiert
5. ✅ Auth API Endpoints (`/api/auth/*`)
6. ✅ Quiz-Model + CRUD API (`/api/quizzes/*`)
7. ✅ Question-Model (mit Validierung: 2–6 Answers für Multiple-Choice)
8. ✅ Session-Model (TTL-Index, 2h Auto-Ablauf)
9. ✅ Participant-Model
10. ✅ Submission-Model
11. ✅ Session API Endpoints (`/api/sessions/*`)
12. ✅ PIN-Generator Utility (6-stellig numerisch)
13. ✅ WebSocket Events (Moderator, Player, Game)
14. ✅ Quiz Library Backend (Browse, Clone, Publish/Unpublish, Official)
15. ✅ Library API Routes (`/api/library/*`)
16. ✅ Admin-Middleware (`requireAdmin`)
17. ✅ Frontend Seiten (Vue 3 + Tailwind CSS v4)
18. ✅ WS-4: Game Broadcast Events (Server-Timer, Scoring, Leaderboard)
19. ✅ Player-Check-PIN Event (leichtgewichtige PIN-Validierung)
20. ✅ Auto-End bei Timer-Ablauf oder alle Antworten eingegangen
21. ✅ Kahoot-style Antwortverteilung & Leaderboard auf Moderator-Seite
22. ✅ WS-5: Scoring Utility (Punkteberechnung, konfigurierbares Zeit-Bonus-System)
23. ✅ API-5: Question CRUD API Endpoints (Add, Update, Delete, Reorder)
24. [ ] PlayerResultsPage (Endergebnis-Seite)
25. [ ] Testing
26. [ ] Deployment

## Entwicklung starten

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (neues Terminal)
cd frontend
npm install
npm run dev
```
