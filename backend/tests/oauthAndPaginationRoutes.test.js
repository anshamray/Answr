import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import Quiz from '../src/models/Quiz.js';
import Session from '../src/models/Session.js';
import libraryRoutes from '../src/routes/library.js';
import oauthRoutes, { __testing as oauthTesting } from '../src/routes/oauth.js';
import sessionRoutes from '../src/routes/sessions.js';

function createChain(result = []) {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    }
  };
  return chain;
}

describe('OAuth code exchange', () => {
  beforeEach(() => {
    oauthTesting.oauthCodeStore.clear();
  });

  it('rejects missing OAuth exchange code', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', oauthRoutes);

    const res = await request(app)
      .post('/api/auth/oauth/exchange')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('exchanges code once and invalidates it', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', oauthRoutes);

    const code = oauthTesting.storeOAuthToken('jwt-test-token');

    const first = await request(app)
      .post('/api/auth/oauth/exchange')
      .send({ code });

    expect(first.status).toBe(200);
    expect(first.body.success).toBe(true);
    expect(first.body.data.token).toBe('jwt-test-token');

    const second = await request(app)
      .post('/api/auth/oauth/exchange')
      .send({ code });

    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
  });

  it('rejects expired codes', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', oauthRoutes);

    oauthTesting.oauthCodeStore.set('expired-code', {
      token: 'jwt-test-token',
      expiresAt: Date.now() - 1_000
    });

    const res = await request(app)
      .post('/api/auth/oauth/exchange')
      .send({ code: 'expired-code' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('Pagination route guards', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes invalid pagination for session history route', async () => {
    const chain = createChain([]);
    vi.spyOn(Session, 'countDocuments').mockResolvedValue(0);
    vi.spyOn(Session, 'find').mockReturnValue(chain);

    const token = jwt.sign(
      { userId: '507f1f77bcf86cd799439011', email: 'test@example.com', role: 'moderator' },
      process.env.JWT_SECRET
    );

    const app = express();
    app.use(express.json());
    app.use('/api/sessions', sessionRoutes);

    const res = await request(app)
      .get('/api/sessions?page=abc&limit=-5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(10);
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('sanitizes invalid pagination for library browse route', async () => {
    const chain = createChain([]);
    vi.spyOn(Quiz, 'find').mockReturnValue(chain);
    vi.spyOn(Quiz, 'countDocuments').mockResolvedValue(0);

    const app = express();
    app.use(express.json());
    app.use('/api/library', libraryRoutes);

    const res = await request(app).get('/api/library?page=nope&limit=0');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(20);
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(20);
  });
});

