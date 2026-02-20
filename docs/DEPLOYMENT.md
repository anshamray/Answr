# Answr – Deployment Overview

This document describes **what is deployed where** in production. No secrets or passwords are included; those are set only in each provider’s dashboard or local `.env`.

---

## 1. What runs where

| Component | Host | URL | Role |
|-----------|------|-----|------|
| **Frontend** (Vue + Vite) | Vercel | `https://answr.ing` | SPA, Library, moderator dashboard, player join/game |
| **Backend** (Express + Socket.io) | Render | `https://api.answr.ing` | REST API, WebSocket, auth, sessions |
| **Database** (MongoDB) | MongoDB Atlas | *(connection string in backend env only)* | Users, quizzes, questions, sessions, library |
| **Domain / DNS** | Porkbun | `answr.ing` | Root + `api` subdomain point to Vercel and Render |

---

## 2. Frontend (Vercel)

- **Repo**: This repository; Vercel is connected to the same Git repo.
- **Root directory**: `frontend`
- **Framework preset**: Vite
- **Build**: `npm run build` → output in `dist`
- **Routing**: `frontend/vercel.json` rewrites all paths to `/` so Vue Router handles `/play`, `/session/...`, etc.

### Environment variables (set in Vercel dashboard)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL for API and WebSocket (e.g. `https://api.answr.ing`) |

No other frontend env vars are required for production.

---

## 3. Backend (Render)

- **Repo**: Same repository.
- **Root directory**: `backend`
- **Runtime**: Node
- **Build command**: `npm install`
- **Start command**: `npm start` → runs `node src/server.js`
- **Custom domain**: `api.answr.ing` (added in Render; DNS in Porkbun).

### Environment variables (set in Render dashboard)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string (from Atlas “Connect” → Drivers) |
| `JWT_SECRET` | Secret for signing JWTs |
| `CORS_ORIGIN` | Allowed origin for API/WebSocket (e.g. `https://answr.ing`) |
| `FRONTEND_URL` | Frontend URL for redirects (e.g. `https://answr.ing`) |
| `OAUTH_CALLBACK_URL` | Backend base URL for OAuth callbacks (e.g. `https://api.answr.ing`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional – Google OAuth |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional – GitHub OAuth |
| `EMAIL_PROVIDER` | Optional – `resend` (or `smtp` / `sendgrid`; see backend `.env.example`) |
| `EMAIL_FROM` | Optional – Sender address (e.g. `noreply@answr.ing`) when using email |
| `RESEND_API_KEY` | Optional – Resend API key when `EMAIL_PROVIDER=resend` |

`PORT` is set by Render; do not set it in env.

### Optional: Email (Resend)

To send transactional email (e.g. password reset) via Resend:

1. Sign up at [resend.com](https://resend.com).
2. Add your domain (e.g. `answr.ing`) in Resend and add the DNS records they provide (in Porkbun or your DNS host).
3. Create an API key in the Resend dashboard.
4. In **Render → Backend service → Environment**, add:
   - `EMAIL_PROVIDER=resend`
   - `EMAIL_FROM=noreply@answr.ing` (or the address you verified in Resend)
   - `RESEND_API_KEY=<your Resend API key>`
5. Save and redeploy the backend.

All of these are backend env vars only; do not commit API keys to the repo.

---

## 4. Database (MongoDB Atlas)

- **Provider**: MongoDB Atlas (cloud).
- **Used by**: Backend only (via `MONGODB_URI` on Render).
- **Network**: Atlas “Network Access” must allow the backend (e.g. `0.0.0/0` or Render IPs if you restrict).
- **Seeding**: “General Knowledge Trivia” and admin user can be seeded by running `node src/seeds/libraryQuiz.js` from `backend/` with `MONGODB_URI` set to the production Atlas URI (run locally or via a one-off job).

---

## 5. Domain and DNS (Porkbun)

Domain: **answr.ing**

| Record type | Host | Points to | Purpose |
|-------------|------|------------|---------|
| A | `@` (blank) | Vercel IP (e.g. `216.198.79.1`) | `https://answr.ing` → Vercel (frontend) |
| CNAME | `api` | Render hostname (e.g. `answr-backend.onrender.com`) | `https://api.answr.ing` → Render (backend) |

Exact IP/hostname values come from Vercel and Render when you add the custom domains there.

---

## 6. Flow summary

1. User opens **https://answr.ing** → Vercel serves the Vue SPA.
2. The app uses **VITE_API_URL** (`https://api.answr.ing`) for:
   - REST: `fetch(apiUrl('/api/...'))`
   - WebSocket: Socket.io client connects to the same host.
3. **https://api.answr.ing** is the Render backend (custom domain); it talks to MongoDB Atlas using **MONGODB_URI**.
4. QR code / join links use **https://answr.ing/play?pin=...**; Vercel’s rewrite sends them to `index.html`, and Vue Router shows the play page.

---

## 7. Local development

- **Frontend**: `cd frontend && npm run dev` (Vite dev server; proxies `/api` and `/media` to backend).
- **Backend**: `cd backend && npm run dev` (Express + Socket.io on `PORT` from `.env` or 3000).
- **Env**: Use `backend/.env` and optionally `frontend/.env` with local URLs; leave `VITE_API_URL` unset so the app uses the Vite proxy and `http://localhost:3000` for the socket.

No passwords or secrets are stored in this document; configure them only in each service’s dashboard or in local `.env` files that are not committed.
