# Answr 🎮

Answr is an **open-source real-time quiz platform**, built as a privacy-friendly alternative to Kahoot for schools, companies, and private games.

> Answr is under active development and **not production-ready yet**.

## 🎯 Project Goal

Build a web-based real-time quiz platform for educational, corporate, and private use with a strong focus on **privacy**, **customizability**, and **transparent architecture**.

## 🏗️ Project Structure

```
answr/
├── backend/          # Node.js/Express Server + Socket.io
├── frontend/         # Vue 3 client app (Vite)
├── docs/             # Documentation
├── docker-compose.yml# Docker Compose (MongoDB + Backend)
```

## 🚀 Quick Start

### Option A: Local development (without Docker)

#### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- MongoDB >= 6.x (locally or via Docker)

#### Installation

```bash
# Clone repository
git clone https://github.com/anshamray/Answr.git
cd Answr

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

#### Start development

```bash
# Terminal 1 - start backend
cd backend
npm run dev

# Terminal 2 - start frontend
cd frontend
npm run dev
```

Backend: `http://localhost:3000`  
Frontend: `http://localhost:5173`

### Option B: With Docker (MongoDB + backend)

If you want to spin up database + backend with a single command, you can use Docker Compose.

#### Prerequisites

- Docker
- Docker Compose (`docker compose` CLI)

#### Start

From the project root:

```bash
docker compose up --build
```

- Starts **MongoDB** (container `answr-mongo`)
- Starts **backend** (container `answr-backend`) on `http://localhost:3000`

The frontend still runs locally via Vite:

```bash
cd frontend
npm install        # once
npm run dev        # http://localhost:5173
```

#### Stop containers

```bash
docker compose down
```

### Code quality (linting & formatting)

ESLint and Prettier are configured for both backend and frontend.

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

### Current capabilities
- ✅ Moderator authentication (JWT)
- ✅ Quiz management (CRUD API at `/api/quizzes`)
- ✅ Data models for quizzes, questions, sessions, participants & submissions
- ✅ Multiple question types (e.g. multiple-choice, true/false – see `docs/QuestionTypes.md`)
- ✅ Session management with 6‑digit PINs (`/api/sessions`)
- ✅ Real-time gameplay via Socket.io (lobby, questions, answers, leaderboard)
- ✅ Server-side scoring with time bonus (score calculator)
- ✅ Session TTL (automatic cleanup after expiry)

### Roadmap
- ⏳ Extended question CRUD APIs and UI improvements
- ⏳ Frontend enhancements for moderator dashboard & player UI
- ⏳ Advanced live statistics & visualizations
- ⏳ Images in questions and variable time limits
- ⏳ Pause/resume functionality for sessions
- 💡 Additional question types (slider, sort, word cloud, etc.)
- 💡 Background music & sound effects
- 💡 Quiz export/import

## 🛠️ Tech Stack

- **Frontend**: Vue + Vite
- **Backend**: Node.js + Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (for moderators)

## 🔒 Privacy & Security

- No third-party trackers in the core project
- Sessions use random 6‑digit PINs
- JWT-based moderator authentication
- Clear separation between moderators and players
- Backend as the single source of truth for scores, timer & leaderboard

## 📚 Documentation

See [docs/](./docs/) for:
- [API](./docs/API.md) – REST & WebSocket specification
- [Architecture](./docs/Architektur.md) – system architecture (Mermaid diagrams)
- [Project structure](./docs/Projektstruktur.md) – folder layout & progress
- [Question types](./docs/QuestionTypes.md) – supported types
- [Quickstart](./docs/QUICKSTART.md) – step‑by‑step setup

## 🤝 Contributing & Feedback

Contributions are very welcome!

- **Found a bug or have a feature idea?**  
  → Open an issue in the GitHub `Issues` tab.

- **Want to contribute code?**  
  ```bash
  git checkout -b feature/my-feature
  # make your changes
  git commit -m "feat: describe your feature"
  git push origin feature/my-feature
  # open a Pull Request on GitHub
  ```

For questions or suggestions, feel free to use issues as well.

## 📝 License

MIT License – see [LICENSE](LICENSE)
