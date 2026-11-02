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
import auditService from '../src/services/auditService.js';

describe('Audit Logging & Admin Boundary Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auditService.logAudit', () => {
    it('should insert audit record with json stringified values', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await auditService.logAudit({
        actor_id: 'EMP-ADM-001',
        actor_name: 'Admin User',
        action: 'UPDATE_IAM_ROLE',
        resource_type: 'IAM_ACCOUNT',
        resource_id: 'EMP-DOC-002',
        old_values: { role_code: 'STAFF' },
        new_values: { role_code: 'SUPER_ADMIN' },
        ip_address: '127.0.0.1'
      });

      expect(result).toBe(true);
      expect(pool.execute).toHaveBeenCalledTimes(1);
      const callArgs = pool.execute.mock.calls[0][1];
      expect(callArgs[1]).toBe('EMP-ADM-001');
      expect(callArgs[3]).toBe('UPDATE_IAM_ROLE');
      expect(callArgs[6]).toBe(JSON.stringify({ role_code: 'STAFF' }));
      expect(callArgs[7]).toBe(JSON.stringify({ role_code: 'SUPER_ADMIN' }));
    });

    it('should safely handle missing required fields without throwing', async () => {
      const result = await auditService.logAudit({
        actor_id: '',
        action: '',
        resource_type: ''
      });

      expect(result).toBe(false);
      expect(pool.execute).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should return paginated audit logs', async () => {
      pool.query
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[
          {
            id: 'uuid-1234',
            actor_id: 'EMP-ADM-001',
            actor_name: 'Admin',
            action: 'UPDATE_IAM_ROLE',
            resource_type: 'IAM_ACCOUNT',
            resource_id: 'EMP-DOC-002',
            old_values: '{"role_code":"STAFF"}',
            new_values: '{"role_code":"SUPER_ADMIN"}',
            ip_address: '127.0.0.1',
            created_at: new Date()
          }
        ]]);

      const res = await request(app).get('/api/admin/audit-logs?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].action).toBe('UPDATE_IAM_ROLE');
      expect(res.body.data[0].new_values.role_code).toBe('SUPER_ADMIN');
    });
  });

  describe('Admin IAM Boundaries: PATCH /api/admin/accounts/:id/role', () => {
    it('should reject role assignment if role is not SUPER_ADMIN or STAFF', async () => {
      const res = await request(app)
        .patch('/api/admin/accounts/acc-1/role')
        .send({ role_code: 'DOCTOR' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('SUPER_ADMIN');
    });

    it('should reject self-role modification with 403', async () => {
      // In test mode, verifyToken sets req.user = { role: 'SUPER_ADMIN', username: 'test_admin', employee_code: 'EMP-ADM-001' }
      pool.query
        .mockResolvedValueOnce([[{ role_code: 'STAFF' }]]) // Roles check
        .mockResolvedValueOnce([[{ id: 'acc-admin', employee_code: 'EMP-ADM-001', role_code: 'SUPER_ADMIN' }]]); // Target is actor

      const res = await request(app)
        .patch('/api/admin/accounts/acc-admin/role')
        .send({ role_code: 'STAFF' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('chính tài khoản đang đăng nhập');
    });

    it('should allow demoting another admin to STAFF and log audit', async () => {
      pool.query
        .mockResolvedValueOnce([[{ role_code: 'STAFF' }]]) // Roles check
        .mockResolvedValueOnce([[{ id: 'acc-other', employee_code: 'EMP-ADM-002', role_code: 'SUPER_ADMIN' }]]) // Target
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update Accounts
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update Employees
        .mockResolvedValueOnce([[{ id: 'acc-other', role_code: 'STAFF', employee_code: 'EMP-ADM-002' }]]); // Query updated
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Audit log execute

      const res = await request(app)
        .patch('/api/admin/accounts/acc-other/role')
        .send({ role_code: 'STAFF' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role_code).toBe('STAFF');
    });
  });

  describe('2-Step Clinical Leave Approval: PATCH /api/leave/requests/:id/status', () => {
    it('should support DEPT_APPROVED status for clinical head', async () => {
      pool.query
        .mockResolvedValueOnce([[{
          id: 'leave-1',
          staff_id: 'EMP-DOC-002',
          department_code: 'DEP-HSTC',
          status: 'PENDING',
          start_date: '2026-11-01',
          days_requested: 2,
          leave_type: 'ANNUAL'
        }]]) // Select existing
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update Leave_Requests
        .mockResolvedValueOnce([[{
          id: 'leave-1',
          staff_id: 'EMP-DOC-002',
          status: 'DEPT_APPROVED'
        }]]); // Select updated
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Audit log execute

      const res = await request(app)
        .patch('/api/leave/requests/leave-1/status')
        .send({ status: 'DEPT_APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DEPT_APPROVED');
    });
  });
});
