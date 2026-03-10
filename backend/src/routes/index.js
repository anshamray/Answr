import { Router } from 'express';
import authRoutes from './auth.js';
import quizRoutes from './quizzes.js';
import { standaloneRouter as questionRoutes } from './questions.js';
import sessionRoutes from './sessions.js';
import libraryRoutes from './library.js';
import favoritesRoutes from './favorites.js';
import adminRoutes from './admin.js';
import { apiRouter as mediaApiRoutes, serveRouter as mediaServeRoutes, handleUploadError } from './media.js';
import healthRoutes, { setActiveSessionsGetter } from './health.js';

// Main API router (mounts all /api/* routes)
const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/quizzes', quizRoutes);
apiRouter.use('/questions', questionRoutes);
apiRouter.use('/sessions', sessionRoutes);
apiRouter.use('/library', libraryRoutes);
apiRouter.use('/favorites', favoritesRoutes);
apiRouter.use('/media', mediaApiRoutes);
apiRouter.use('/health', healthRoutes);
apiRouter.use('/admin', adminRoutes);

export {
  apiRouter,
  mediaServeRoutes,
  handleUploadError,
  setActiveSessionsGetter
};
