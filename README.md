# Answr 🎮

Eine Open-Source Quiz-Plattform als datenschutzfreundliche Alternative zu Kahoot.

## 🎯 Projektziel

Entwicklung einer webbasierten Echtzeit-Quizplattform für Bildungseinrichtungen, Unternehmen und private Anwendungen mit Fokus auf Datenschutz und Anpassbarkeit.

## 🏗️ Projektstruktur

```
answr/
├── backend/          # Node.js/Express Server + Socket.io
├── frontend/         # Vue 3 Client-Anwendung (Vite)
├── docs/             # Dokumentation
├── docker-compose.yml# Docker Compose (MongoDB + Backend)
```

## 🚀 Quick Start

### Variante A: Lokale Entwicklung (ohne Docker)

#### Voraussetzungen

- Node.js >= 18.x
- npm >= 9.x
- MongoDB >= 6.x (lokal oder Docker)

#### Installation

```bash
# Repository klonen
git clone https://github.com/anshamray/Answr.git
cd Answr

# Backend installieren
cd backend
npm install

# Frontend installieren
cd ../frontend
npm install
```

#### Entwicklung starten

```bash
# Terminal 1 - Backend starten
cd backend
npm run dev

# Terminal 2 - Frontend starten
cd frontend
npm run dev
```

Backend läuft auf: `http://localhost:3000`  
Frontend läuft auf: `http://localhost:5173`

### Variante B: Mit Docker (MongoDB + Backend)

Wenn du nur einen Befehl für Datenbank + Backend verwenden möchtest, kannst du Docker Compose nutzen.

#### Voraussetzungen

- Docker
- Docker Compose (`docker compose` CLI)

#### Starten

Im Projektroot:

```bash
docker compose up --build
```

- Startet **MongoDB** (Container `answr-mongo`)
- Startet das **Backend** (Container `answr-backend`) auf `http://localhost:3000`

Das Frontend läuft weiterhin lokal über Vite:

```bash
cd frontend
npm install        # einmalig
npm run dev        # http://localhost:5173
```

#### Stoppen

```bash
docker compose down
```

### Code-Qualität (Linting & Formatting)

Im Projekt sind ESLint und Prettier für Backend und Frontend konfiguriert.

```bash
# Backend
cd backend
npm run lint        # ESLint Check
npm run lint:fix    # ESLint mit Auto-Fix
npm run format      # Prettier Check
npm run format:fix  # Prettier Auto-Fix

# Frontend
cd frontend
npm run lint        # ESLint Check
npm run lint:fix
npm run format
npm run format:fix
```

## 📋 Features

### MVP – Backend (Stand: implementiert)
- ✅ Moderator-Authentifizierung (JWT)
- ✅ Quiz CRUD API (`/api/quizzes`)
- ✅ Datenmodelle: Quiz, Question, Session, Participant, Submission
- ✅ Multiple-Choice + True/False Fragen (mit Validierung)
- ✅ Session-Management API mit 6-stelliger PIN (`/api/sessions`)
- ✅ Echtzeit-Spielablauf (Socket.io WebSocket-Events)
- ✅ Session TTL (automatischer Ablauf nach 2 Stunden)

### MVP – Noch offen
- ⏳ Question CRUD API Endpoints
- ⏳ Frontend-Oberfläche (Vue)
- ⏳ Punktesystem mit Zeitbonus (Score-Calculator)
- ⏳ Live-Rangliste im Frontend

### Version 1.1 (Should-Have)
- ⏳ Bilder in Fragen
- ⏳ Variable Zeitlimits
- ⏳ Erweiterte Statistiken
- ⏳ Session Pause/Resume im Frontend

### Future (Could-Have)
- 💡 Weitere Fragetypen (Slider, Sort, Word Cloud, etc.)
- 💡 Hintergrundmusik & Soundeffekte
- 💡 Export/Import von Quizzen

## 🛠️ Tech Stack

- **Frontend**: Vue + Vite
- **Backend**: Node.js + Express.js
- **Echtzeit**: Socket.io
- **Datenbank**: MongoDB + Mongoose
- **Authentifizierung**: JWT (optional für MVP)

## 📚 Dokumentation

Siehe [docs/](./docs/) für:
- [API-Dokumentation](./docs/API.md) - REST & WebSocket Spezifikation
- [Architektur](./docs/Architektur.md) - Systemarchitektur (Mermaid-Diagramme)
- [Projektstruktur](./docs/Projektstruktur.md) - Ordnerstruktur & Fortschritt
- [Fragetypen](./docs/QuestionTypes.md) - Unterstützte Fragetypen
- [Quickstart](./docs/QUICKSTART.md) - Schnelleinstieg

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE)
