FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests first for better Docker layer caching
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN cd backend && npm ci && cd ../frontend && npm ci

# Copy full source
COPY backend ./backend
COPY frontend ./frontend
COPY shared ./shared

# Run backend and frontend tests – build will fail if they fail
RUN cd backend && npm test
RUN cd frontend && npm test

# Build frontend for production
RUN cd frontend && npm run build


FROM node:22-alpine AS production

WORKDIR /app

# Install only production dependencies for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source and shared code
COPY backend/src ./backend/src
COPY shared ./shared

# Copy built frontend assets from builder
COPY --from=builder /app/frontend/dist ./frontend-dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/backend

CMD ["node", "src/server.js"]

