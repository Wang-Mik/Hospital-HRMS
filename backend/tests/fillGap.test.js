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

describe('Clinical Scheduling Constraints (C1, C3) & Emergency Fill-Gap Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-at-least-32-chars-long';

  const hrToken = jwt.sign(
    { id: 1, employee_code: 'EMP-ADM-001', role: 'HR_MANAGER' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const deptHeadToken = jwt.sign(
    { id: 2, employee_code: 'EMP-DOC-001', role: 'DEPARTMENT_HEAD', department_code: 'DEP-EMERG' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const staffToken = jwt.sign(
    { id: 3, employee_code: 'EMP-DOC-002', role: 'DOCTOR', department_code: 'DEP-EMERG' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constraint C1: Medical License (CCHN) Gating', () => {
    it('should reject scheduling when clinical staff has no verified CCHN (409 Conflict)', async () => {
      // Staff exists, clinical role (DOCTOR), but verified_license_count = 0
      pool.query.mockResolvedValueOnce([[
        {
          id: 10,
          employee_code: 'EMP-DOC-999',
          first_name: 'Minh',
          last_name: 'Trần',
          role: 'DOCTOR',
          department_code: 'DEP-EMERG',
          verified_license_count: 0,
          active_leave_count: 0
        }
      ]]);

      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          staff_id: 'EMP-DOC-999',
          department_code: 'DEP-EMERG',
          start_time: '2026-09-10 07:00:00',
          end_time: '2026-09-10 15:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('EXPIRED_OR_INVALID_LICENSE');
      expect(res.body.message).toContain('Chứng chỉ hành nghề');
    });

    it('should allow scheduling when clinical staff CCHN is unverified IF allow_unverified_license is true', async () => {
      // 1. Staff query
      pool.query.mockResolvedValueOnce([[
        {
          id: 10,
          employee_code: 'EMP-DOC-999',
          first_name: 'Minh',
          last_name: 'Trần',
          role: 'DOCTOR',
          department_code: 'DEP-EMERG',
          verified_license_count: 0,
          active_leave_count: 0
        }
      ]]);
      // 2. Overlap check query (empty)
      pool.query.mockResolvedValueOnce([[]]);
      // 3. Insert query
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          staff_id: 'EMP-DOC-999',
          department_code: 'DEP-EMERG',
          start_time: '2026-09-10 07:00:00',
          end_time: '2026-09-10 15:00:00',
          shift_type: 'MORNING',
          allow_unverified_license: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rest_warning?.license_warning).toContain('Cảnh báo');
    });
  });

  describe('Constraint C3: Approved Leave Conflict Gating', () => {
    it('should reject scheduling when staff has active approved leave on that date (409 Conflict)', async () => {
      // 1. Staff query with active_leave_count = 1
      pool.query.mockResolvedValueOnce([[
        {
          id: 3,
          employee_code: 'EMP-DOC-002',
          first_name: 'Thị C',
          last_name: 'Nguyễn',
          role: 'DOCTOR',
          department_code: 'DEP-EMERG',
          verified_license_count: 1,
          active_leave_count: 1
        }
      ]]);
      // 2. Leave details query
      pool.query.mockResolvedValueOnce([[
        {
          leave_type: 'ANNUAL',
          start_date: '2026-09-28',
          end_date: '2026-09-30',
          reason: 'Nghỉ phép năm'
        }
      ]]);

      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          staff_id: 'EMP-DOC-002',
          department_code: 'DEP-EMERG',
          start_time: '2026-09-29 07:00:00',
          end_time: '2026-09-29 15:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('STAFF_ON_LEAVE');
      expect(res.body.message).toContain('Nghỉ phép năm');
    });
  });

  describe('GET /api/shifts/fill-gap/candidates', () => {
    it('should return ranked candidates for emergency gap filling', async () => {
      const mockCandidates = [
        {
          id: 2,
          employee_code: 'EMP-DOC-001',
          staff_name: 'Nguyễn Văn B',
          first_name: 'B',
          last_name: 'Nguyễn',
          role: 'DEPARTMENT_HEAD',
          specialty: 'Hồi Sức Cấp Cứu',
          phone: '+84901234567',
          department_code: 'DEP-EMERG',
          department_name: 'Khoa Cấp Cứu',
          license_number: '002456/HN-CCHN',
          license_expiration: '2032-08-20',
          license_status: 'VERIFIED',
          is_scheduled_on_call: 1,
          has_overlapping_shift: 0,
          is_on_leave: 0,
          last_shift_end: '2026-08-23 15:00:00',
          monthly_shift_count: 5,
          monthly_duty_hours: '40'
        },
        {
          id: 4,
          employee_code: 'EMP-DOC-003',
          staff_name: 'Nguyễn Văn D',
          first_name: 'D',
          last_name: 'Nguyễn',
          role: 'DOCTOR',
          specialty: 'Ngoại Phẫu Thuật',
          phone: '+84901234569',
          department_code: 'DEP-EMERG',
          department_name: 'Khoa Cấp Cứu',
          license_number: '004123/HN-CCHN',
          license_expiration: '2033-11-05',
          license_status: 'VERIFIED',
          is_scheduled_on_call: 0,
          has_overlapping_shift: 0,
          is_on_leave: 0,
          last_shift_end: '2026-08-24 15:00:00',
          monthly_shift_count: 8,
          monthly_duty_hours: '64'
        }
      ];

      pool.query.mockResolvedValueOnce([mockCandidates]);

      const res = await request(app)
        .get('/api/shifts/fill-gap/candidates')
        .set('Authorization', `Bearer ${deptHeadToken}`)
        .query({
          department_code: 'DEP-EMERG',
          shift_date: '2026-08-25',
          shift_type: 'AFTERNOON'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.candidates.length).toBe(2);
      expect(res.body.data.candidates[0].suitability_tier).toBe('ON_CALL_PRIMARY');
      expect(res.body.data.candidates[0].score).toBeGreaterThan(res.body.data.candidates[1].score);
    });
  });

  describe('POST /api/shifts/fill-gap/dispatch', () => {
    it('should dispatch cover staff and create emergency notification and audit log', async () => {
      // 1. Staff query
      pool.query.mockResolvedValueOnce([[
        {
          id: 4,
          employee_code: 'EMP-DOC-003',
          first_name: 'D',
          last_name: 'Nguyễn',
          role: 'DOCTOR',
          department_code: 'DEP-EMERG',
          verified_license_count: 1,
          active_leave_count: 0
        }
      ]]);
      // 2. Overlap check query (empty)
      pool.query.mockResolvedValueOnce([[]]);
      // 3. Shift insert
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 4. Notification insert
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 5. Audit log insert
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts/fill-gap/dispatch')
        .set('Authorization', `Bearer ${deptHeadToken}`)
        .send({
          staff_id: 'EMP-DOC-003',
          department_code: 'DEP-EMERG',
          shift_date: '2026-08-25',
          start_time: '2026-08-25 17:00:00',
          end_time: '2026-08-25 22:00:00',
          reason: 'Tai nạn giao thông hàng loạt tại ngã tư Thủ Đức'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shift_type).toBe('EMERGENCY_COVER');
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });
  });

  describe('POST /api/shifts/:id/overrun', () => {
    it('should record shift overrun, extend end_time, and update attendance overtime', async () => {
      // 1. Shift query
      pool.query.mockResolvedValueOnce([[
        {
          id: 'shift-overrun-123',
          staff_id: 'EMP-DOC-001',
          department_code: 'DEP-EMERG',
          start_time: '2026-08-25 07:00:00',
          end_time: '2026-08-25 17:00:00',
          status: 'IN_PROGRESS'
        }
      ]]);
      // 2. Shift update
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. Attendance update
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 4. Audit log insert
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts/shift-overrun-123/overrun')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          overrun_minutes: 90,
          reason: 'Phẫu thuật cấp cứu vỡ lách độ 4 kéo dài quá 17:00'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overrun_minutes).toBe(90);
      expect(res.body.data.end_time).toBe('2026-08-25 18:30:00');
    });
  });
});
