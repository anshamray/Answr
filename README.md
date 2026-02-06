# Answr 🎮

Eine Open-Source Quiz-Plattform als datenschutzfreundliche Alternative zu Kahoot.

## 🎯 Projektziel

Entwicklung einer webbasierten Echtzeit-Quizplattform für Bildungseinrichtungen, Unternehmen und private Anwendungen mit Fokus auf Datenschutz und Anpassbarkeit.

## 🏗️ Projektstruktur

```
answr/
├── backend/          # Node.js/Express Server + Socket.io
├── frontend/         # Svelte Client-Anwendung
├── docs/             # Dokumentation und Lastenheft
└── docker/           # Docker-Konfiguration (später)
```

## 🚀 Quick Start

### Voraussetzungen

- Node.js >= 18.x
- npm >= 9.x
- MongoDB >= 6.x (lokal oder Docker)

### Installation

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

### Entwicklung starten

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

## 📋 Features (geplant)

### MVP (Must-Have)
- ✅ Moderator-Authentifizierung
- ✅ Quiz erstellen/bearbeiten/löschen
- ✅ Multiple-Choice Fragen
- ✅ Spiel-Sessions mit PIN-Code
- ✅ Echtzeit-Spielablauf (WebSocket)
- ✅ Punktesystem mit Zeitbonus
- ✅ Live-Rangliste

### Version 1.1 (Should-Have)
- ⏳ Bilder in Fragen
- ⏳ Variable Zeitlimits
- ⏳ Erweiterte Statistiken
- ⏳ Session-Management

### Future (Could-Have)
- 💡 Weitere Fragetypen (Wahr/Falsch, Schieberegler)
- 💡 Hintergrundmusik & Soundeffekte
- 💡 Export/Import von Quizzen

## 🛠️ Tech Stack

- **Frontend**: Svelte 4 + Vite
- **Backend**: Node.js + Express.js
- **Echtzeit**: Socket.io
- **Datenbank**: MongoDB + Mongoose
- **Authentifizierung**: JWT (optional für MVP)

## 📚 Dokumentation

Siehe [docs/](./docs/) für:
- [Lastenheft](./docs/Answr_Lastenheft.docx) - Anforderungsdokument
- [API-Dokumentation](./docs/API.md) - REST & WebSocket Spezifikation
- [Architektur](./docs/Architektur.md) - Systemarchitektur
- [Projektstruktur](./docs/Projektstruktur.md) - Ordnerstruktur
- [Quickstart](./docs/QUICKSTART.md) - Schnelleinstieg

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE)
