# Answr Quick-Start Guide 🚀

Schnellanleitung zum Einrichten des Projekts.

## Voraussetzungen checken

```bash
# Node.js Version prüfen (sollte >= 18.x sein)
node --version

# npm Version prüfen
npm --version

# MongoDB installiert? (optional für lokale Entwicklung)
mongod --version
```

Falls nicht installiert:
- Node.js: https://nodejs.org/
- MongoDB: https://www.mongodb.com/try/download/community

## 1. Repository Setup

```bash
# Repository klonen
git clone https://github.com/anshamray/Answr.git
cd Answr
```

## 2. Backend einrichten

```bash
cd backend

# Dependencies installieren
npm install

# .env Datei erstellen
cp .env.example .env

# Optional: MongoDB Connection String anpassen in .env
# MONGODB_URI=mongodb://localhost:27017/answr
```

## 3. Frontend einrichten

```bash
# In neuem Terminal
cd frontend

# Dependencies installieren
npm install
```

## 4. MongoDB starten (lokal)

```bash
# Option A: Mit installiertem MongoDB
mongod

# Option B: Mit Docker
docker run -d -p 27017:27017 --name answr-mongo mongo:latest

# Option C: MongoDB Atlas (Cloud) verwenden
# → Erstelle kostenlose Datenbank auf mongodb.com
# → Connection String in backend/.env eintragen
```

## 5. Entwicklung starten

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# → Läuft auf http://localhost:3000

# Terminal 2 - Frontend
cd frontend
npm run dev
# → Läuft auf http://localhost:5173
```

## 6. Testen

Öffne Browser: http://localhost:5173

Du solltest die Answr Landing Page sehen!

## Typische Probleme

### "Cannot connect to MongoDB"
→ Prüfe ob MongoDB läuft: `mongod` oder Docker Container
→ Prüfe Connection String in `backend/.env`

### "Port 3000 already in use"
→ Ändere Port in `backend/.env`: `PORT=3001`
→ Update auch in `frontend/vite.config.js`

### "Module not found"
→ Dependencies neu installieren: `rm -rf node_modules && npm install`

## Nächste Schritte

1. Lies die [Projektstruktur](docs/Projektstruktur.md)
2. Schau dir die [Architektur](docs/Architektur.md) an
3. Lies das [Lastenheft](docs/Answr_Lastenheft.docx)
4. Starte mit der Entwicklung!

## Git Workflow

```bash
# Feature Branch erstellen
git checkout -b feature/mein-feature

# Code schreiben...

# Commit
git add .
git commit -m "feat: Beschreibung"

# Push
git push origin feature/mein-feature

# Pull Request auf GitHub erstellen
```

## Hilfe gebraucht?

- Erstelle ein [GitHub Issue](https://github.com/anshamray/Answr/issues)
- Lies die [Contributing Guidelines](CONTRIBUTING.md)

Viel Erfolg! 🎉
