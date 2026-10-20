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

import pool from '../src/db.js';
import app from '../src/app.js';

describe('Backend Shift Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/shifts', () => {
    it('should schedule a valid shift and return 201', async () => {
      pool.query.mockResolvedValueOnce([[]]); // No conflicting shift
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          start_time: '2026-08-25 07:00:00',
          end_time: '2026-08-25 15:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff_id).toBe('EMP-DOC-001');
      expect(res.body.data.shift_type).toBe('MORNING');
    });

    it('should return 409 conflict when overlapping shift exists', async () => {
      const existingShift = {
        id: 'conflicting-shift-uuid',
        start_time: '2026-08-25 07:00:00',
        end_time: '2026-08-25 15:00:00'
      };

      pool.query.mockResolvedValueOnce([[existingShift]]);

      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          start_time: '2026-08-25 08:00:00',
          end_time: '2026-08-25 16:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Shift conflict');
    });

    it('should return 400 when start_time >= end_time', async () => {
      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          start_time: '2026-08-25 15:00:00',
          end_time: '2026-08-25 07:00:00'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when missing mandatory fields', async () => {
      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-DOC-001'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when shift_type is invalid', async () => {
      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          start_time: '2026-08-25 07:00:00',
          end_time: '2026-08-25 15:00:00',
          shift_type: 'INVALID_SHIFT_TYPE'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/shifts', () => {
    it('should list all shifts with query filters', async () => {
      const mockShifts = [
        {
          id: 'shift-1',
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          status: 'SCHEDULED',
          shift_type: 'MORNING'
        }
      ];

      pool.query.mockResolvedValueOnce([mockShifts]);

      const res = await request(app).get('/api/shifts?staff_id=EMP-DOC-001&department_id=1&status=SCHEDULED&shift_type=MORNING&date=2026-08-25');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('GET /api/shifts/:id should return single shift by ID', async () => {
      const mockShift = {
        id: 'shift-1',
        staff_id: 'EMP-DOC-001',
        shift_type: 'MORNING'
      };

      pool.query.mockResolvedValueOnce([[mockShift]]);

      const res = await request(app).get('/api/shifts/shift-1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('shift-1');
    });

    it('GET /api/shifts/:id should return 404 when not found', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/shifts/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
