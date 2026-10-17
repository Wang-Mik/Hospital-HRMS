import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// Mock database pool
jest.mock('../src/db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    execute: jest.fn(),
    getConnection: jest.fn()
  },
  testConnection: jest.fn().mockResolvedValue(true)
}));

import pool, { testConnection } from '../src/db.js';
import app from '../src/app.js';

describe('Monolith Express App Cross-Domain & Architecture Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api-docs.json should serve valid OpenAPI 3.0 specification', async () => {
    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe('Hospital HRMS Monolith API');
  });

  it('GET /api/unknown-endpoint should return 404 JSON response', async () => {
    const res = await request(app).get('/api/unknown-endpoint');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: 404,
      error: 'Not Found',
      message: 'Cannot GET /api/unknown-endpoint'
    });
  });

  it('GET /api/v1/shifts should alias /api/shifts correctly', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/v1/shifts');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('GET /api/v1/attendance should alias /api/attendance correctly', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/v1/attendance');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('GET /api/v1/leave should alias /api/leave correctly', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/v1/leave');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('GET /api/v1/payroll/runs should alias /api/payroll/runs correctly', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/v1/payroll/runs');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('GET /api/v1/notifications/EMP-DOC-001 should alias /api/notifications correctly', async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/v1/notifications/EMP-DOC-001');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });
});
