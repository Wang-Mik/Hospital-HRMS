import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';

// Mock database pool
jest.mock('../src/db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    execute: jest.fn(),
    getConnection: jest.fn()
  },
  testConnection: jest.fn()
}));

import pool, { testConnection } from '../src/db.js';
import app from '../src/app.js';

describe('Backend Health Probe Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /health should return 200 UP when database is connected', async () => {
    testConnection.mockResolvedValueOnce(true);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'UP',
      service: 'backend',
      database: {
        status: 'connected',
        name: 'hrm_db'
      }
    });
  });

  it('GET /health should return 503 DOWN when database connection fails', async () => {
    testConnection.mockResolvedValueOnce(false);

    const res = await request(app).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 'DOWN',
      service: 'backend',
      database: {
        status: 'disconnected'
      }
    });
  });
});
