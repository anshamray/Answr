# Kahood 🎮

Eine Open-Source Quiz-Plattform als datenschutzfreundliche Alternative zu Kahoot.

## 🎯 Projektziel

Entwicklung einer webbasierten Echtzeit-Quizplattform für Bildungseinrichtungen, Unternehmen und private Anwendungen mit Fokus auf Datenschutz und Anpassbarkeit.

## 🏗️ Projektstruktur

```
kahood/
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
git clone https://github.com/anshamray/Kahood.git
cd Kahood

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
- [Lastenheft](./docs/Kahood_Lastenheft.docx) - Anforderungsdokument
- [API-Dokumentation](./docs/API.md) - REST & WebSocket Spezifikation
- [Architektur](./docs/Architektur.md) - Systemarchitektur
- [Projektstruktur](./docs/Projektstruktur.md) - Ordnerstruktur
- [Quickstart](./docs/QUICKSTART.md) - Schnelleinstieg

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Commit deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE)

## 👥 Team

- Entwickelt im Rahmen eines Programmierkurses
- Kontakt: [GitHub Issues](https://github.com/anshamray/Kahood/issues)

## 🗺️ Roadmap

- [ ] **Phase 1**: Projekt-Setup & Grundstruktur
- [ ] **Phase 2**: Backend API & Datenbank
- [ ] **Phase 3**: WebSocket Integration
- [ ] **Phase 4**: Frontend Grundgerüst
- [ ] **Phase 5**: Moderator-Interface
- [ ] **Phase 6**: Spieler-Interface
- [ ] **Phase 7**: Testing & Bug-Fixes
- [ ] **Phase 8**: Deployment & Dokumentation
