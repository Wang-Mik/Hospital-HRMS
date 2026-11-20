import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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

  describe('Two-Way Hospital Payroll Flow (Export Timesheets & Import Accounting Slips)', () => {
    it('GET /api/payroll/runs/:id/export-timesheets should return aggregated attendance, overruns, and KPI data', async () => {
      pool.query
        .mockResolvedValueOnce([[{ id: 'run-2026-11', start_date: '2026-11-01', end_date: '2026-11-30', status: 'DRAFT' }]])
        .mockResolvedValueOnce([[
          {
            staff_id: 'EMP-DOC-001',
            staff_name: 'Nguyễn Văn B',
            department_code: 'DEP-HSTC',
            total_work_hours: 176,
            approved_overtime_hours: 4.5,
            night_shifts: 4,
            kpi_score: 94,
            kpi_grade: 'A'
          }
        ]]);

      const res = await request(app).get('/api/payroll/runs/run-2026-11/export-timesheets');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.rows[0].approved_overtime_hours).toBe(4.5);
      expect(res.body.data.rows[0].kpi_grade).toBe('A');
    });

    it('POST /api/payroll/runs/:id/import-slips should batch import accounting slips and update run status to PROCESSING', async () => {
      const mockConn = {
        beginTransaction: jest.fn().mockResolvedValue(),
        query: jest.fn()
          .mockResolvedValueOnce([[{ id: 'run-2026-11', status: 'DRAFT' }]])
          .mockResolvedValueOnce([[{ employee_code: 'EMP-DOC-001' }, { employee_code: 'EMP-NUR-001' }]])
          .mockResolvedValueOnce([{ affectedRows: 2 }]),
        execute: jest.fn().mockResolvedValue([{ affectedRows: 1 }]),
        commit: jest.fn().mockResolvedValue(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      pool.getConnection.mockResolvedValueOnce(mockConn);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Audit log
      pool.query.mockResolvedValueOnce([[{ id: 'run-2026-11', status: 'PROCESSING', employee_count: 2, total_disbursed: 41000000 }]]);

      const res = await request(app)
        .post('/api/payroll/runs/run-2026-11/import-slips')
        .send({
          mode: 'UPSERT',
          source_filename: 'bang_luong_tckt_11_2026.csv',
          slips: [
            {
              staff_id: 'EMP-DOC-001',
              base_pay: 18000000,
              night_differential: 2400000,
              overtime_pay: 1600000,
              surgery_allowance: 3500000,
              kpi_bonus: 2000000,
              social_insurance: 1890000,
              tax_deductions: 610000,
              net_pay: 25000000
            },
            {
              staff_id: 'EMP-NUR-001',
              base_pay: 13000000,
              night_differential: 1600000,
              overtime_pay: 800000,
              on_call_allowance: 1200000,
              kpi_bonus: 1000000,
              social_insurance: 1365000,
              tax_deductions: 235000,
              net_pay: 16000000
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imported_count).toBe(2);
      expect(res.body.data.total_net_pay).toBe(41000000);
      expect(mockConn.commit).toHaveBeenCalled();
    });

    it('POST /api/payroll/runs/:id/import-slips should return 409 when payroll run is already APPROVED or COMPLETED', async () => {
      const mockConn = {
        beginTransaction: jest.fn().mockResolvedValue(),
        query: jest.fn().mockResolvedValueOnce([[{ id: 'run-2026-08', status: 'COMPLETED' }]]),
        execute: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn().mockResolvedValue(),
        release: jest.fn()
      };
      pool.getConnection.mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/payroll/runs/run-2026-08/import-slips')
        .send({
          slips: [{ staff_id: 'EMP-DOC-001', base_pay: 15000000, net_pay: 14000000 }]
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(mockConn.rollback).toHaveBeenCalled();
    });

    it('POST /api/payroll/runs/:id/import-slips should return 400 when duplicate staff_id exists inside payload', async () => {
      const res = await request(app)
        .post('/api/payroll/runs/run-2026-11/import-slips')
        .send({
          slips: [
            { staff_id: 'EMP-DOC-001', base_pay: 15000000 },
            { staff_id: 'EMP-DOC-001', base_pay: 16000000 }
          ]
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('trùng lặp');
    });

    it('GET /api/payroll/runs/:id/slips should flag attendance/overtime discrepancies for HR audit', async () => {
      pool.query
        .mockResolvedValueOnce([[{ id: 'run-2026-11', start_date: '2026-11-01', end_date: '2026-11-30', status: 'PROCESSING' }]])
        .mockResolvedValueOnce([[
          {
            id: 'ps-1',
            run_id: 'run-2026-11',
            staff_id: 'EMP-DOC-001',
            staff_name: 'Nguyễn Văn B',
            base_pay: 18000000,
            night_differential: 1200000,
            overtime_pay: 0,
            on_call_allowance: 500000,
            surgery_allowance: 3000000,
            kpi_bonus: 1500000,
            social_insurance: 1890000,
            tax_deductions: 310000,
            other_deductions: 0,
            net_pay: 22000000,
            approved_overtime_hours: 3.5,
            night_shift_count: 2
          }
        ]]);

      const res = await request(app).get('/api/payroll/runs/run-2026-11/slips');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.mismatch_count).toBe(1);
      expect(res.body.data.slips[0].discrepancy_warning).toContain('3.5h vượt trực');
    });

    it('GET /api/payroll/runs/:id/bank-disbursement should merge primary bank accounts and flag missing accounts', async () => {
      pool.query
        .mockResolvedValueOnce([[{ id: 'run-2026-11', start_date: '2026-11-01', end_date: '2026-11-30', status: 'APPROVED' }]])
        .mockResolvedValueOnce([[
          {
            payslip_id: 'ps-1',
            staff_id: 'EMP-DOC-001',
            staff_name: 'BS Nguyễn Văn A',
            department_code: 'DEP-HSTC',
            department_name: 'Hồi sức tích cực',
            net_pay: 15000000,
            payslip_status: 'APPROVED'
          },
          {
            payslip_id: 'ps-2',
            staff_id: 'EMP-NUR-001',
            staff_name: 'ĐD Trần Thị B',
            department_code: 'DEP-NOI',
            department_name: 'Nội tổng hợp',
            net_pay: 9500000,
            payslip_status: 'APPROVED'
          }
        ]])
        .mockResolvedValueOnce([[
          {
            staff_id: 'EMP-DOC-001',
            bank_name: 'Vietcombank',
            account_number: '001100123456',
            routing_number: 'BFTVVNVX',
            is_primary: 1
          }
        ]]);

      const res = await request(app).get('/api/payroll/runs/run-2026-11/bank-disbursement');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.total_slips).toBe(2);
      expect(res.body.data.summary.ready_count).toBe(1);
      expect(res.body.data.summary.missing_bank_count).toBe(1);
      expect(res.body.data.summary.total_amount).toBe(24500000);
    });
  });

  describe('Payroll Validation & Discrepancy Reporting', () => {
    const signUser = (payload) => {
      const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-at-least-32-chars-long';
      return jwt.sign(payload, secret, { expiresIn: '1h' });
    };

    it('POST /api/payroll/runs/generate should return 400 when dates are invalid or reversed', async () => {
      const res = await request(app)
        .post('/api/payroll/runs/generate')
        .send({ start_date: '2026-11-30', end_date: '2026-11-01' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('PUT /api/payroll/rates/:staff_id should return 400 when base_hourly_rate is negative', async () => {
      const res = await request(app)
        .put('/api/payroll/rates/EMP-DOC-001')
        .send({ base_hourly_rate: -50000 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/payroll/payslips/:id/report-issue should return 400 when message is too short', async () => {
      const token = signUser({ role: 'DOCTOR', employee_code: 'EMP-DOC-001', username: 'doc.a' });
      const res = await request(app)
        .post('/api/payroll/payslips/ps-1/report-issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'ngan' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/payroll/payslips/:id/report-issue should return 403 when a doctor reports another staff slip', async () => {
      const token = signUser({ role: 'DOCTOR', employee_code: 'EMP-DOC-002', username: 'doc.b' });
      pool.query.mockResolvedValueOnce([[
        {
          id: 'ps-1',
          run_id: 'run-2026-11',
          staff_id: 'EMP-DOC-001',
          staff_name: 'BS Nguyễn Văn A',
          net_pay: 15000000,
          notes: null
        }
      ]]);

      const res = await request(app)
        .post('/api/payroll/payslips/ps-1/report-issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Kiểm tra lại phụ cấp trực đêm tháng 11 giúp tôi.' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/payroll/payslips/:id/report-issue should allow slip owner and notify HR/Accountant', async () => {
      const token = signUser({ role: 'DOCTOR', employee_code: 'EMP-DOC-001', username: 'doc.a' });
      pool.query
        .mockResolvedValueOnce([[
          {
            id: 'ps-1',
            run_id: 'run-2026-11',
            staff_id: 'EMP-DOC-001',
            staff_name: 'BS Nguyễn Văn A',
            net_pay: 15000000,
            notes: null
          }
        ]])
        .mockResolvedValueOnce([[
          { employee_code: 'EMP-ACC-001' },
          { employee_code: 'EMP-HR-001' }
        ]]);
      pool.execute.mockResolvedValue([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/payroll/payslips/ps-1/report-issue')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'Thiếu 3.5 giờ vượt trực ngày 12/11 trên phiếu lương.' });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });
  });
});
