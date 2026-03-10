import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import healthRoutes from '../src/routes/health.js';

describe('GET /api/health', () => {
  beforeEach(() => {
    // Simulate a connected database without requiring a real MongoDB instance.
    Object.defineProperty(mongoose, 'connection', {
      value: { readyState: 1 },
      configurable: true
    });
  });

  it('returns healthy status when DB is connected', async () => {
    const app = express();
    app.use('/api/health', healthRoutes);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('healthy');
  });
});

