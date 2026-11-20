import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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

const TEST_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-at-least-32-chars-long';

function makeToken(role, employee_code = 'EMP-TEST-001', department_code = 'DEP-KHB') {
  return jwt.sign(
    {
      account_id: `acc-${role}`,
      role,
      employee_code,
      department_code
    },
    TEST_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Phase 1: Centralized RBAC & Role Matrix Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Payroll RBAC Separation of Duties', () => {
    it('should block regular DOCTOR from listing hospital-wide payroll runs (403)', async () => {
      const token = makeToken('DOCTOR', 'EMP-DOC-001');
      const res = await request(app)
        .get('/api/payroll/runs')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow HR_STAFF, HEAD_OF_HR, HOSPITAL_DIRECTOR, and ACCOUNTANT to view payroll runs', async () => {
      const roles = ['HR_STAFF', 'HEAD_OF_HR', 'HOSPITAL_DIRECTOR', 'VICE_DIRECTOR', 'ACCOUNTANT'];
      for (const role of roles) {
        pool.query.mockResolvedValueOnce([[]]);
        const token = makeToken(role);
        const res = await request(app)
          .get('/api/payroll/runs')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });

    it('should prevent ACCOUNTANT and HR_STAFF from finalizing/approving payroll runs (403)', async () => {
      for (const role of ['ACCOUNTANT', 'HR_STAFF']) {
        const token = makeToken(role);
        const res = await request(app)
          .patch('/api/payroll/runs/run-1/status')
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'COMPLETED' });

        expect(res.status).toBe(403);
      }
    });

    it('should allow HOSPITAL_DIRECTOR and HEAD_OF_HR to approve payroll run status', async () => {
      for (const role of ['HOSPITAL_DIRECTOR', 'HEAD_OF_HR']) {
        pool.query
          .mockResolvedValueOnce([{ affectedRows: 1 }])
          .mockResolvedValueOnce([[{ id: 'run-1', status: 'APPROVED' }]]);
        const token = makeToken(role);
        const res = await request(app)
          .patch('/api/payroll/runs/run-1/status')
          .set('Authorization', `Bearer ${token}`)
          .send({ status: 'APPROVED' });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('APPROVED');
      }
    });

    it('should hide DRAFT payslips when regular DOCTOR inspects own payslips', async () => {
      pool.query.mockResolvedValueOnce([[
        { id: 'ps-draft', staff_id: 'EMP-DOC-001', status: 'DRAFT', net_pay: 10000000 },
        { id: 'ps-paid', staff_id: 'EMP-DOC-001', status: 'PAID', net_pay: 22000000 }
      ]]);
      const token = makeToken('DOCTOR', 'EMP-DOC-001');
      const res = await request(app)
        .get('/api/payroll/payslips/EMP-DOC-001')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('ps-paid');
    });
  });

  describe('Clinical QA & Executive Overview RBAC Fixes', () => {
    it('should allow HEAD_OF_NURSING and HEAD_OF_GENERAL_PLANNING on /api/shifts/overrun/pending', async () => {
      for (const role of ['HEAD_OF_NURSING', 'HEAD_OF_GENERAL_PLANNING']) {
        pool.query.mockResolvedValueOnce([[]]);
        const token = makeToken(role);
        const res = await request(app)
          .get('/api/shifts/overrun/pending')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
      }
    });

    it('should allow HR_MANAGER, HR_STAFF, and HOSPITAL_DIRECTOR to access /api/admin/overview, and deny DOCTOR with 403', async () => {
      const doctorRes = await request(app)
        .get('/api/admin/overview')
        .set('Authorization', `Bearer ${makeToken('DOCTOR')}`);
      expect(doctorRes.status).toBe(403);

      for (const role of ['HR_MANAGER', 'HR_STAFF', 'HOSPITAL_DIRECTOR']) {
        pool.query
          .mockResolvedValueOnce([[{ total_employees: 10 }]])
          .mockResolvedValueOnce([[{ total_departments: 5 }]])
          .mockResolvedValueOnce([[{ pending_leaves: 1 }]])
          .mockResolvedValueOnce([[{ expiring_licenses_30d: 0 }]])
          .mockResolvedValueOnce([[{ expired_licenses: 0 }]])
          .mockResolvedValueOnce([[{ total_disbursed_vnd: 0 }]])
          .mockResolvedValueOnce([[{ upcoming_shifts: 0 }]])
          .mockResolvedValueOnce([[{ locked_accounts: 0, active_accounts: 10 }]])
          .mockResolvedValueOnce([[]]);
        const token = makeToken(role);
        const res = await request(app)
          .get('/api/admin/overview')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      }
    });
  });
});
