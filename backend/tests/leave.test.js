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

describe('Backend Leave Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/leave', () => {
    it('should submit a leave request and return 201', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/leave')
        .send({
          staff_id: 'EMP-DOC-001',
          start_date: '2026-09-01',
          end_date: '2026-09-05',
          leave_type: 'ANNUAL',
          reason: 'Conference attendance'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff_id).toBe('EMP-DOC-001');
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should submit a half-day leave request with 0.5 days', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/leave')
        .send({
          staff_id: 'EMP-DOC-001',
          start_date: '2026-09-01',
          end_date: '2026-09-01',
          leave_type: 'ANNUAL',
          day_part: 'SECOND_HALF',
          days_requested: 0.5,
          reason: 'Buổi chiều nghỉ'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.day_part).toBe('SECOND_HALF');
      expect(res.body.data.days_requested).toBe(0.5);
    });

    it('should return 400 when start_date > end_date', async () => {
      const res = await request(app)
        .post('/api/leave')
        .send({
          staff_id: 'EMP-DOC-001',
          start_date: '2026-09-10',
          end_date: '2026-09-05'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when missing mandatory fields', async () => {
      const res = await request(app)
        .post('/api/leave')
        .send({
          staff_id: 'EMP-DOC-001'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when leave_type is invalid', async () => {
      const res = await request(app)
        .post('/api/leave')
        .send({
          staff_id: 'EMP-DOC-001',
          start_date: '2026-09-01',
          end_date: '2026-09-05',
          leave_type: 'SABBATICAL_INVALID'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/leave', () => {
    it('should list all leave requests with query filters', async () => {
      const mockLeaves = [
        {
          id: 'leave-1',
          staff_id: 'EMP-DOC-001',
          leave_type: 'ANNUAL',
          status: 'APPROVED'
        }
      ];

      pool.query.mockResolvedValueOnce([mockLeaves]);

      const res = await request(app).get('/api/leave?status=APPROVED&leave_type=ANNUAL');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });
  });

  describe('GET /api/leave/:staff_id', () => {
    it('should get leave history for a staff member', async () => {
      const mockHistory = [
        {
          id: 'leave-1',
          staff_id: 'EMP-DOC-001',
          leave_type: 'ANNUAL',
          status: 'APPROVED'
        }
      ];

      pool.query.mockResolvedValueOnce([mockHistory]);

      const res = await request(app).get('/api/leave/EMP-DOC-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Leave Balances Endpoints', () => {
    it('GET /api/leave/balances/:staff_id/:year should return balances for specific year', async () => {
      const mockBalances = [
        {
          id: 'lb-1',
          staff_id: 'EMP-DOC-001',
          accrual_year: 2026,
          leave_type: 'ANNUAL',
          total_days: 25,
          used_days: 5,
          remaining_days: 20
        }
      ];

      pool.query.mockResolvedValueOnce([mockBalances]);

      const res = await request(app).get('/api/leave/balances/EMP-DOC-001/2026');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].remaining_days).toBe(20);
    });

    it('GET /api/leave/balances/:staff_id should return balances across all years', async () => {
      const mockBalances = [
        {
          id: 'lb-1',
          staff_id: 'EMP-DOC-001',
          accrual_year: 2026,
          leave_type: 'ANNUAL',
          total_days: 25,
          used_days: 5,
          remaining_days: 20
        }
      ];

      pool.query.mockResolvedValueOnce([mockBalances]);

      const res = await request(app).get('/api/leave/balances/EMP-DOC-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('POST /api/leave-balances should set leave balance', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/leave-balances')
        .send({
          staff_id: 'EMP-DOC-001',
          accrual_year: 2026,
          leave_type: 'ANNUAL',
          total_days: 25,
          used_days: 5
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.remaining_days).toBe(20);
    });

    it('POST /api/leave-balances should return 400 when missing fields', async () => {
      const res = await request(app)
        .post('/api/leave-balances')
        .send({
          staff_id: 'EMP-DOC-001'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/leave-balances should return 400 when invalid leave_type', async () => {
      const res = await request(app)
        .post('/api/leave-balances')
        .send({
          staff_id: 'EMP-DOC-001',
          accrual_year: 2026,
          leave_type: 'INVALID_TYPE',
          total_days: 20
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
