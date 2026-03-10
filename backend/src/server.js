import http from 'http';

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

// Load environment variables
dotenv.config();

// Validate critical configuration before doing anything else
validateEnv();

// Connect to MongoDB
connectDatabase();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Default 100kb too small for questions with images

// Initialize Passport for OAuth
const { googleEnabled, githubEnabled } = initializePassport(app);
if (googleEnabled) logger.info('Google OAuth enabled');
if (githubEnabled) logger.info('GitHub OAuth enabled');

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Answr API Server',
    version: '0.1.0',
    status: 'running'
  });
});

// API Routes
app.use('/api', apiRouter);

// Media file serving (access-controlled, not static)
app.use('/media', mediaServeRoutes);

// Upload error handler
app.use(handleUploadError);

// Central error handler for uncaught errors
app.use(errorHandler);

// Initialize WebSocket handler
const { activeSessions } = initializeSocket(io);

// Set up health check session counter
setActiveSessionsGetter(() => activeSessions.size);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info('WebSocket ready');
});
