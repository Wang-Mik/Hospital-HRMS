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

describe('Backend Payroll Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payroll/runs', () => {
    it('should create a payroll run and return 201', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/payroll/runs')
        .send({
          start_date: '2026-08-01',
          end_date: '2026-08-15',
          status: 'DRAFT'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.start_date).toBe('2026-08-01');
      expect(res.body.data.status).toBe('DRAFT');
    });

    it('should return 400 when missing start_date', async () => {
      const res = await request(app)
        .post('/api/payroll/runs')
        .send({
          end_date: '2026-08-15'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when start_date > end_date', async () => {
      const res = await request(app)
        .post('/api/payroll/runs')
        .send({
          start_date: '2026-08-20',
          end_date: '2026-08-10'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when status is invalid', async () => {
      const res = await request(app)
        .post('/api/payroll/runs')
        .send({
          start_date: '2026-08-01',
          end_date: '2026-08-15',
          status: 'INVALID_STATUS'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/payroll/runs', () => {
    it('should retrieve all payroll runs with optional status query', async () => {
      const mockRuns = [
        {
          id: 'run-1',
          start_date: '2026-08-01',
          end_date: '2026-08-15',
          status: 'APPROVED'
        }
      ];

      pool.query.mockResolvedValueOnce([mockRuns]);

      const res = await request(app).get('/api/payroll/runs?status=APPROVED');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('GET /api/payroll/runs/:id should return single run', async () => {
      const mockRun = {
        id: 'run-1',
        start_date: '2026-08-01',
        end_date: '2026-08-15',
        status: 'APPROVED'
      };

      pool.query.mockResolvedValueOnce([[mockRun]]);

      const res = await request(app).get('/api/payroll/runs/run-1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('run-1');
    });

    it('GET /api/payroll/runs/:id should return 404 when not found', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/payroll/runs/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Pay Slips Endpoints', () => {
    it('POST /api/payroll/payslips should create pay slip', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/payroll/payslips')
        .send({
          run_id: 'run-1',
          staff_id: 'EMP-DOC-001',
          base_pay: 7600.00,
          night_differential: 450.00,
          overtime_pay: 712.50,
          net_pay: 6850.00,
          status: 'CALCULATED'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff_id).toBe('EMP-DOC-001');
    });

    it('POST /api/payroll/payslips should return 400 when missing run_id or staff_id', async () => {
      const res = await request(app)
        .post('/api/payroll/payslips')
        .send({
          base_pay: 5000.00
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/payroll/payslips/:staff_id should return pay slips for staff member', async () => {
      const mockPaySlips = [
        {
          id: 'ps-1',
          run_id: 'run-1',
          staff_id: 'EMP-DOC-001',
          base_pay: 7600.00,
          net_pay: 6850.00,
          status: 'CALCULATED'
        }
      ];

      pool.query.mockResolvedValueOnce([mockPaySlips]);

      const res = await request(app).get('/api/payroll/payslips/EMP-DOC-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Payment Elections Endpoints', () => {
    it('POST /api/payroll/elections should add payment election', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/payroll/elections')
        .send({
          staff_id: 'EMP-DOC-001',
          bank_name: 'JPMorgan Chase',
          account_number: '1234567890',
          routing_number: '021000021',
          is_primary: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bank_name).toBe('JPMorgan Chase');
    });

    it('POST /api/payroll/elections should return 400 when fields missing', async () => {
      const res = await request(app)
        .post('/api/payroll/elections')
        .send({
          staff_id: 'EMP-DOC-001'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/payroll/elections/:staff_id should return payment elections', async () => {
      const mockElections = [
        {
          id: 'elec-1',
          staff_id: 'EMP-DOC-001',
          bank_name: 'JPMorgan Chase',
          is_primary: true
        }
      ];

      pool.query.mockResolvedValueOnce([mockElections]);

      const res = await request(app).get('/api/payroll/elections/EMP-DOC-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
