import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// Mock database pool consistent with all other backend test suites
jest.mock('../src/db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    execute: jest.fn(),
    getConnection: jest.fn()
  },
  testConnection: jest.fn().mockResolvedValue(true),
  getPoolStats: jest.fn().mockReturnValue({ all: 5, free: 3, queued: 0 })
}));

import app from '../src/app.js';
import { normalizeRoute } from '../src/metrics/metricsRegistry.js';

describe('Prometheus Metrics & Health Monitoring Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /metrics', () => {
    it('should return 200 and standard Prometheus plain text exposition format', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('hospital_hrm_');
    });

    it('should record HTTP request counts when accessing endpoints', async () => {
      // Perform a health request to generate traffic
      await request(app).get('/health');

      const metricsRes = await request(app).get('/metrics');
      expect(metricsRes.status).toBe(200);
      expect(metricsRes.text).toContain('hospital_hrm_http_requests_total');
      expect(metricsRes.text).toContain('route="/health"');
      expect(metricsRes.text).toContain('status_code="200"');
    });

    it('should track request durations in histogram buckets', async () => {
      await request(app).get('/health');

      const metricsRes = await request(app).get('/metrics');
      expect(metricsRes.status).toBe(200);
      expect(metricsRes.text).toContain('hospital_hrm_http_request_duration_seconds_bucket');
      expect(metricsRes.text).toContain('hospital_hrm_http_request_duration_seconds_count');
    });

    it('should export MySQL pool connection metrics with active/free/queued states', async () => {
      const res = await request(app).get('/metrics');

      expect(res.status).toBe(200);
      expect(res.text).toContain('hospital_hrm_mysql_pool_connections{state="active"}');
      expect(res.text).toContain('hospital_hrm_mysql_pool_connections{state="free"}');
      expect(res.text).toContain('hospital_hrm_mysql_pool_connections{state="queued"}');
    });
  });

  describe('Route Path Normalization', () => {
    it('should normalize numeric staff IDs to prevent Prometheus high-cardinality label explosion', () => {
      const mockReq = {
        baseUrl: '/api/v1',
        route: { path: '/employees/:id' },
        originalUrl: '/api/v1/employees/42'
      };
      expect(normalizeRoute(mockReq)).toBe('/api/v1/employees/:id');
    });

    it('should fallback to regex replacement for numeric IDs when req.route is absent', () => {
      const mockReq = {
        originalUrl: '/api/v1/shifts/123/attendance?date=2026-11-12'
      };
      expect(normalizeRoute(mockReq)).toBe('/api/v1/shifts/:id/attendance');
    });

    it('should normalize UUID parameters to :id', () => {
      const mockReq = {
        originalUrl: '/api/v1/handovers/550e8400-e29b-41d4-a716-446655440000'
      };
      expect(normalizeRoute(mockReq)).toBe('/api/v1/handovers/:id');
    });
  });
});
