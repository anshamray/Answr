# Answr - Projektstruktur

```
answr/
│
├── README.md                      # Haupt-Dokumentation
├── LICENSE                        # MIT Lizenz
├── CONTRIBUTING.md                # Contribution Guidelines
├── .gitignore                     # Git Ignore Regeln
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
│   │   │   ├── Quiz.js         # Quiz-Schema
│   │   │   ├── Session.js      # Session-Schema
│   │   │   └── User.js         # User-Schema (optional)
│   │   │
│   │   ├── routes/              # REST API Routes
│   │   │   ├── auth.js         # Authentifizierung
│   │   │   ├── quizzes.js      # Quiz-Management
│   │   │   └── sessions.js     # Session-Management
│   │   │
│   │   ├── controllers/         # Business Logic
│   │   │   ├── quizController.js
│   │   │   └── sessionController.js
│   │   │
│   │   ├── middleware/          # Custom Middleware
│   │   │   └── auth.js         # JWT Verification
│   │   │
│   │   ├── config/              # Konfiguration
│   │   │   └── database.js     # MongoDB Connection
│   │   │
│   │   └── utils/               # Hilfsfunktionen
│   │       ├── pinGenerator.js # Wortbasierte PINs
│   │       └── scoreCalculator.js
│   │
│   └── tests/                   # Tests (Jest)
│       ├── quiz.test.js
│       └── session.test.js
│
├── frontend/                     # Vue 3 Frontend (Vite)
│   ├── package.json             # NPM Dependencies
│   ├── vite.config.js           # Vite Konfiguration
│   ├── index.html               # HTML Entry Point
│   ├── README.md                # Frontend-Dokumentation
│   │
│   └── src/
│       ├── main.js              # Vue App Entry Point
│       ├── App.vue              # Haupt-Komponente
│       ├── styles.css           # Globale Styles
│       │
│       └── lib/                 # Services & Utils
│           └── socket.js       # WebSocket Service
│
├── docs/                         # Dokumentation
│   ├── Answr_Lastenheft.docx   # Original Lastenheft
│   ├── Architektur.md           # System-Architektur
│   └── API.md                   # API-Dokumentation (bald)
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
Vue 3 Frontend mit Vite als Build-Tool. Hier lebt die Client-App für Moderator- und Spieler-Interface.

### `/docs`
Projektdokumentation, Lastenheft und Architektur-Diagramme.

### `/.github`
GitHub-spezifische Dateien wie Issue-Templates.

## Nächste Schritte

1. ✅ Grundstruktur erstellt
2. ✅ Dependencies installieren (`npm install`)
3. ✅ MongoDB Setup (`src/config/database.js`)
4. ✅ User-Model implementiert
5. ✅ Auth API Endpoints (`/api/auth/*`)
6. [ ] Quiz/Session Datenmodelle
7. [ ] Quiz/Session API Endpoints
8. [ ] WebSocket Events
9. [ ] Frontend Komponenten
10. [ ] Testing
11. [ ] Deployment

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
