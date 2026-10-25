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

describe('Backend Shift Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/shifts', () => {
    it('should schedule a valid shift and return 201', async () => {
      // 1. Employee exists check
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-DOC-001', first_name: 'Văn', last_name: 'Nguyễn' }]]);
      // 2. Overlap check (empty = no conflict)
      pool.query.mockResolvedValueOnce([[]]);
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

      // 1. Employee exists check
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-DOC-001', first_name: 'Văn', last_name: 'Nguyễn' }]]);
      // 2. Overlap check finds existing shift
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

    it('should return 404 when staff_id does not exist in Employees table', async () => {
      // 1. Employee does not exist
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-NONEXISTENT',
          department_id: 1,
          start_time: '2026-08-25 07:00:00',
          end_time: '2026-08-25 15:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('không tồn tại trong hệ thống');
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

    it('should reject shift scheduling with 403 when user is not HR or Admin', async () => {
      const doctorToken = jwt.sign(
        { employee_code: 'EMP-DOC-001', role: 'DOCTOR' },
        process.env.JWT_SECRET || 'hospital-hrms-backend-secret-key-2026'
      );

      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          start_time: '2026-08-25 07:00:00',
          end_time: '2026-08-25 15:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Quyền truy cập bị từ chối');
    });

    it('should reject DEPARTMENT_HEAD with 403 because only HR can schedule shifts', async () => {
      const deptHeadToken = jwt.sign(
        { employee_code: 'EMP-DOC-HEAD', role: 'DEPARTMENT_HEAD' },
        process.env.JWT_SECRET || 'hospital-hrms-backend-secret-key-2026'
      );

      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${deptHeadToken}`)
        .send({
          staff_id: 'EMP-DOC-001',
          department_code: 'DEP-EMERG',
          start_time: '2026-08-25 07:00:00',
          end_time: '2026-08-25 15:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Quyền truy cập bị từ chối');
    });

    it('should allow HR_MANAGER to schedule shifts and return 201', async () => {
      const hrToken = jwt.sign(
        { employee_code: 'EMP-HR-001', role: 'HR_MANAGER' },
        process.env.JWT_SECRET || 'hospital-hrms-backend-secret-key-2026'
      );

      // 1. Employee exists check
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-DOC-001', first_name: 'Văn', last_name: 'Nguyễn', department_code: 'DEP-EMERG' }]]);
      // 2. Overlap check
      pool.query.mockResolvedValueOnce([[]]);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          staff_id: 'EMP-DOC-001',
          department_code: 'DEP-EMERG',
          start_time: '2026-08-25 07:00:00',
          end_time: '2026-08-25 15:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff_id).toBe('EMP-DOC-001');
    });

    it('should reject shift with 409 and INSUFFICIENT_REST_INTERVAL when rest is < 24h after night duty', async () => {
      const priorNightShift = {
        id: 'prior-night-uuid',
        staff_id: 'EMP-DOC-001',
        start_time: '2026-08-24 21:00:00',
        end_time: '2026-08-25 07:00:00',
        shift_type: 'NIGHT'
      };

      // 1. Staff exists check
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-DOC-001', first_name: 'Văn', last_name: 'Nguyễn' }]]);
      // 2. Query shifts in window (returns the night shift that ended at 07:00 today)
      pool.query.mockResolvedValueOnce([[priorNightShift]]);

      // Attempt to schedule afternoon shift at 14:00 today (rest = only 7 hours)
      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          start_time: '2026-08-25 14:00:00',
          end_time: '2026-08-25 21:00:00',
          shift_type: 'AFTERNOON'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INSUFFICIENT_REST_INTERVAL');
      expect(res.body.requires_confirmation).toBe(true);
      expect(res.body.rest_hours).toBe(7);
      expect(res.body.message).toContain('bắt buộc được nghỉ bù trọn vẹn 1 ngày');
    });

    it('should allow scheduling with allow_insufficient_rest: true override', async () => {
      const priorNightShift = {
        id: 'prior-night-uuid',
        staff_id: 'EMP-DOC-001',
        start_time: '2026-08-24 21:00:00',
        end_time: '2026-08-25 07:00:00',
        shift_type: 'NIGHT'
      };

      // 1. Staff exists check
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-DOC-001', first_name: 'Văn', last_name: 'Nguyễn' }]]);
      // 2. Query shifts in window
      pool.query.mockResolvedValueOnce([[priorNightShift]]);
      // 3. Insert execute
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          start_time: '2026-08-25 14:00:00',
          end_time: '2026-08-25 21:00:00',
          shift_type: 'AFTERNOON',
          allow_insufficient_rest: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rest_warning).toBeDefined();
    });

    it('should allow same-day administrative work + night duty (combined duty day)', async () => {
      const sameDayOfficeShift = {
        id: 'same-day-office-uuid',
        staff_id: 'EMP-DOC-001',
        start_time: '2026-08-25 07:30:00',
        end_time: '2026-08-25 16:30:00',
        shift_type: 'MORNING'
      };

      // 1. Staff exists check
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-DOC-001', first_name: 'Văn', last_name: 'Nguyễn' }]]);
      // 2. Query shifts in window
      pool.query.mockResolvedValueOnce([[sameDayOfficeShift]]);
      // 3. Insert execute
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts')
        .send({
          staff_id: 'EMP-DOC-001',
          department_id: 1,
          start_time: '2026-08-25 21:00:00',
          end_time: '2026-08-26 07:00:00',
          shift_type: 'NIGHT'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
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

  describe('DELETE /api/shifts/:id', () => {
    it('should allow HR/Admin to delete shift and return 200', async () => {
      // 1. Audit check: no handovers or attendance
      pool.query.mockResolvedValueOnce([[{ handover_count: 0, attendance_count: 0 }]]);
      // 2. Hard delete
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).delete('/api/shifts/shift-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Đã hủy bỏ ca trực');
    });

    it('should soft-delete (status = CANCELLED) when clinical handovers or attendances exist', async () => {
      // 1. Audit check: handovers exist
      pool.query.mockResolvedValueOnce([[{ handover_count: 1, attendance_count: 1 }]]);
      // 2. Soft delete update
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).delete('/api/shifts/shift-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Đã hủy bỏ ca trực');
    });

    it('should reject shift deletion with 403 when user is regular staff/nurse', async () => {
      const nurseToken = jwt.sign(
        { employee_code: 'EMP-NUR-001', role: 'NURSE' },
        process.env.JWT_SECRET || 'hospital-hrms-backend-secret-key-2026'
      );

      const res = await request(app)
        .delete('/api/shifts/shift-1')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Quyền truy cập bị từ chối');
    });
  });

  describe('POST /api/shifts/auto-rotate', () => {
    it('should auto-rotate department teams with 2CA_3KIP model (10h/14h)', async () => {
      // 1. Dept staff query
      pool.query.mockResolvedValueOnce([[
        { employee_code: 'EMP-DOC-001' },
        { employee_code: 'EMP-DOC-002' },
        { employee_code: 'EMP-NUR-001' }
      ]]);
      // 2. Multi-insert query
      pool.query.mockResolvedValueOnce([{ affectedRows: 6 }]);

      const res = await request(app)
        .post('/api/shifts/auto-rotate')
        .send({
          department_code: 'DEP-EMERG',
          start_date: '2026-08-25',
          end_date: '2026-08-27',
          rotation_model: '2CA_3KIP'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rotation_model).toBe('2CA_3KIP');
      expect(res.body.message).toContain('2 ca 3 kíp (10h/14h)');
    });

    it('should return preview rotation list without inserting when preview_only: true', async () => {
      // 1. Dept staff query
      pool.query.mockResolvedValueOnce([[
        { employee_code: 'EMP-DOC-001' },
        { employee_code: 'EMP-DOC-002' },
        { employee_code: 'EMP-NUR-001' }
      ]]);
      // 2. Staff info map query for preview
      pool.query.mockResolvedValueOnce([[
        { employee_code: 'EMP-DOC-001', first_name: 'B', last_name: 'Nguyễn', role: 'DOCTOR', specialty: 'Hồi Sức' },
        { employee_code: 'EMP-DOC-002', first_name: 'C', last_name: 'Nguyễn', role: 'DOCTOR', specialty: 'Nội' },
        { employee_code: 'EMP-NUR-001', first_name: 'F', last_name: 'Nguyễn', role: 'NURSE', specialty: 'Điều Dưỡng' }
      ]]);

      const res = await request(app)
        .post('/api/shifts/auto-rotate')
        .send({
          department_code: 'DEP-EMERG',
          start_date: '2026-08-25',
          end_date: '2026-08-27',
          rotation_model: '2CA_3KIP',
          preview_only: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.preview).toBe(true);
      expect(Array.isArray(res.body.data.shifts)).toBe(true);
      expect(res.body.data.shifts.length).toBeGreaterThan(0);
      expect(res.body.data.shifts[0]).toHaveProperty('staff_name');
    });

    it('should rotate only specified staff_ids within department', async () => {
      // 1. Specific staff query
      pool.query.mockResolvedValueOnce([[
        { employee_code: 'EMP-DOC-005' },
        { employee_code: 'EMP-DOC-006' },
        { employee_code: 'EMP-NUR-004' }
      ]]);
      // 2. Multi-insert query
      pool.query.mockResolvedValueOnce([{ affectedRows: 6 }]);

      const res = await request(app)
        .post('/api/shifts/auto-rotate')
        .send({
          department_code: 'DEP-EMERG',
          start_date: '2026-08-25',
          end_date: '2026-08-27',
          rotation_model: '2CA_3KIP',
          staff_ids: ['EMP-DOC-005', 'EMP-DOC-006', 'EMP-NUR-004']
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBeGreaterThan(0);
    });
  });
});
