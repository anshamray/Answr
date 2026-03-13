import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { Server } from 'socket.io';

import { validateEnv } from './config/config.js';
import { connectDatabase } from './config/database.js';
import { initializePassport } from './config/passport.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter, mediaServeRoutes, handleUploadError, setActiveSessionsGetter } from './routes/index.js';
import { initializeSocket } from './socket/index.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Validate critical configuration before doing anything else
validateEnv();

// Connect to MongoDB
connectDatabase();

const app = express();
const allowedCorsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin/non-browser requests (no Origin header)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedCorsOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedCorsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Default 100kb too small for questions with images

// Initialize Passport for OAuth
const { googleEnabled, githubEnabled } = initializePassport(app);
if (googleEnabled) logger.info('Google OAuth enabled');
if (githubEnabled) logger.info('GitHub OAuth enabled');

// API Routes
app.use('/api', apiRouter);

// Media file serving (access-controlled, not static)
app.use('/media', mediaServeRoutes);

// Serve built frontend (if present) — used in Docker all-in-one image and
// optionally when building frontend locally.
const clientDistEnv = process.env.CLIENT_DIST_PATH;
const defaultClientDist = path.resolve(__dirname, '../../frontend/dist');
const dockerClientDist = path.resolve(__dirname, '../frontend-dist');
const clientDistCandidates = [
  clientDistEnv ? path.resolve(clientDistEnv) : null,
  dockerClientDist,
  defaultClientDist
].filter(Boolean);
const clientDistPath = clientDistCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, 'index.html'))
);

if (clientDistPath) {
  app.use(express.static(clientDistPath));

  // SPA fallback: send index.html for all non-API/media routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media')) {
      return next();
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  logger.warn('No frontend dist found; serving API only');
}

// Upload error handler
app.use(handleUploadError);

// Central error handler for uncaught errors
app.use(errorHandler);

// Initialize WebSocket handler
const { activeSessions } = initializeSocket(io);

// Set up health check socket/session stats
setActiveSessionsGetter(() => {
  const activeSessionsCount = activeSessions.size;

  let activePlayersCount = 0;
  for (const session of activeSessions.values()) {
    if (session.players && session.players.size > 0) {
      for (const player of session.players.values()) {
        if (player.isConnected) {
          activePlayersCount += 1;
        }
      }
    }
  }

  const sockets =
    (io.engine && typeof io.engine.clientsCount === 'number'
      ? io.engine.clientsCount
      : io.of('/').sockets.size);

  return {
    activeSessions: activeSessionsCount,
    activePlayers: activePlayersCount,
    sockets
  };
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info('WebSocket ready');
});
