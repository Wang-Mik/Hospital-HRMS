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
import { shiftService } from '../src/services/shiftService.js';
import { attendanceService } from '../src/services/attendanceService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'clinical_dev_secret_key_hrm_2026';

function generateAuthToken(payload = {}) {
  return jwt.sign(
    {
      id: 1,
      employee_code: 'EMP-HEAD-001',
      role: 'DEPARTMENT_HEAD',
      department_code: 'DEP-KHB',
      ...payload
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Ca Trực Co Giãn Lâm Sàng & Ghi Nhận Giờ Vượt Trực (Elastic Overrun Tests)', () => {
  let mockConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.execute.mockReset();

    mockConnection = {
      query: jest.fn(),
      execute: jest.fn(),
      beginTransaction: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
      release: jest.fn()
    };
    pool.getConnection.mockResolvedValue(mockConnection);
  });

  describe('POST /api/shifts/:id/overrun (Ghi nhận ca trực co giãn)', () => {
    it('should auto-approve overrun when duration <= 30 minutes (Safe Bedside Handover Buffer)', async () => {
      const token = generateAuthToken({ role: 'DOCTOR', employee_code: 'EMP-DOC-001' });

      // Mock shift exists
      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: 'shift-101',
            staff_id: 'EMP-DOC-001',
            department_code: 'DEP-KHB',
            start_time: '2026-11-15 07:00:00',
            end_time: '2026-11-15 15:30:00',
            scheduled_end_time: '2026-11-15 15:30:00',
            status: 'IN_PROGRESS'
          }
        ]
      ]);

      // Mock update Shifts
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // Mock select Attendances
      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: 'att-101',
            shift_id: 'shift-101',
            overtime_minutes: 0
          }
        ]
      ]);

      // Mock update Attendances
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // Mock query next shift in 48h (no circadian violation)
      mockConnection.query.mockResolvedValueOnce([[]]);

      // Mock audit log execute
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts/shift-101/overrun')
        .set('Authorization', `Bearer ${token}`)
        .send({
          overrun_minutes: 25,
          reason: 'Bàn giao buồng bệnh Bedside SBAR cho ca chiều',
          clinical_case_ref: 'BA-2026-091'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overrun_minutes).toBe(25);
      expect(res.body.data.overrun_approval_status).toBe('AUTO_APPROVED');
      expect(res.body.data.scheduled_end_time).toBe('2026-11-15 15:30:00');
    });

    it('should set approval_status = PENDING_APPROVAL and capture clinical_case_ref when overrun > 30 minutes', async () => {
      const token = generateAuthToken({ role: 'DOCTOR', employee_code: 'EMP-DOC-001' });

      // Mock shift
      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: 'shift-102',
            staff_id: 'EMP-DOC-001',
            department_code: 'DEP-KHB',
            start_time: '2026-11-15 07:00:00',
            end_time: '2026-11-15 15:30:00',
            scheduled_end_time: '2026-11-15 15:30:00',
            status: 'IN_PROGRESS'
          }
        ]
      ]);

      // Mock update Shifts
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // Mock query Attendances
      mockConnection.query.mockResolvedValueOnce([[]]);

      // Mock query next shift (no conflict)
      mockConnection.query.mockResolvedValueOnce([[]]);

      // Mock audit log execute
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts/shift-102/overrun')
        .set('Authorization', `Bearer ${token}`)
        .send({
          overrun_minutes: 90,
          reason: 'Phẫu thuật cấp cứu vỡ tạng kéo dài ngoài giờ',
          clinical_case_ref: 'PT-CAPCUU-882'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overrun_minutes).toBe(90);
      expect(res.body.data.overrun_approval_status).toBe('PENDING_APPROVAL');
      expect(res.body.data.clinical_case_ref).toBe('PT-CAPCUU-882');
    });

    it('should trigger Cascading Circadian Offset Warning if overrun reduces next rest interval below 24h', async () => {
      const token = generateAuthToken({ role: 'DOCTOR', employee_code: 'EMP-DOC-001' });

      // Mock overnight shift ending at 08:00
      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: 'shift-night-01',
            staff_id: 'EMP-DOC-001',
            department_code: 'DEP-KHB',
            start_time: '2026-11-15 18:00:00',
            end_time: '2026-11-16 08:00:00',
            scheduled_end_time: '2026-11-16 08:00:00',
            shift_type: 'NIGHT',
            status: 'IN_PROGRESS'
          }
        ]
      ]);

      // Mock update Shifts
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // Mock query Attendances
      mockConnection.query.mockResolvedValueOnce([[]]);

      // Mock next shift scheduled at 08:30 the next day (2026-11-17 08:30:00)
      // When shift-night-01 overruns by 240 mins (4 hours -> ends at 12:00:00),
      // rest before next shift becomes 20.5 hours (< 24h)
      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: 'shift-next-day',
            staff_id: 'EMP-DOC-001',
            start_time: '2026-11-17 08:30:00',
            end_time: '2026-11-17 16:30:00'
          }
        ]
      ]);

      // Mock audit log execute
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts/shift-night-01/overrun')
        .set('Authorization', `Bearer ${token}`)
        .send({
          overrun_minutes: 240,
          reason: 'Cấp cứu đa chấn thương thảm họa liên hoàn',
          clinical_case_ref: 'BA-THAMHOA-001'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.circadian_warning).not.toBeNull();
      expect(res.body.data.circadian_warning.has_violation).toBe(true);
      expect(res.body.data.circadian_warning.actual_rest_hours).toBeLessThan(24.0);
    });

    it('should return 404 if shift does not exist', async () => {
      const token = generateAuthToken({ role: 'DOCTOR' });

      mockConnection.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/shifts/non-existent-shift/overrun')
        .set('Authorization', `Bearer ${token}`)
        .send({ overrun_minutes: 30 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/shifts/:id/overrun/approve (Phê duyệt giờ vượt trực của Trưởng khoa)', () => {
    it('should approve overrun shift and update both Shifts and Attendances', async () => {
      const token = generateAuthToken({ role: 'DEPARTMENT_HEAD', employee_code: 'EMP-HEAD-001' });

      // Mock shift
      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: 'shift-overrun-99',
            staff_id: 'EMP-DOC-002',
            overrun_minutes: 60,
            overrun_approval_status: 'PENDING_APPROVAL'
          }
        ]
      ]);

      // Mock update Shifts
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // Mock update Attendances
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      // Mock audit log
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/shifts/shift-overrun-99/overrun/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({
          decision: 'APPROVED',
          adjusted_minutes: 60,
          notes: 'Xác nhận kíp mổ cấp cứu ngoài giờ hợp lệ'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overrun_approval_status).toBe('APPROVED');
      expect(res.body.data.approved_by).toBe('EMP-HEAD-001');
    });

    it('should reject approval request if user role does not have management permissions', async () => {
      const token = generateAuthToken({ role: 'STAFF', employee_code: 'EMP-STAFF-001' });

      const res = await request(app)
        .post('/api/shifts/shift-overrun-99/overrun/approve')
        .set('Authorization', `Bearer ${token}`)
        .send({ decision: 'APPROVED' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/shifts/overrun/pending (Danh sách ca vượt trực chờ duyệt)', () => {
    it('should return pending overrun shifts for department head', async () => {
      const token = generateAuthToken({ role: 'DEPARTMENT_HEAD', department_code: 'DEP-KHB' });

      pool.query.mockResolvedValueOnce([
        [
          {
            id: 'shift-overrun-88',
            staff_id: 'EMP-DOC-001',
            first_name: 'Thịnh',
            last_name: 'Lê Văn',
            staff_role: 'DOCTOR',
            department_code: 'DEP-KHB',
            overrun_minutes: 75,
            overrun_reason: 'Hồi sinh tim phổi CPR cấp cứu',
            clinical_case_ref: 'BA-CPR-11',
            overrun_approval_status: 'PENDING_APPROVAL'
          }
        ]
      ]);

      const res = await request(app)
        .get('/api/shifts/overrun/pending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].staff_name).toBe('Lê Văn Thịnh');
      expect(res.body.data[0].overrun_minutes).toBe(75);
    });
  });

  describe('Attendance clockOut with Elastic Overrun Preservation', () => {
    it('should preserve declared overtime_minutes and update clinical_case_ref on clockOut', async () => {
      // Direct service test for clockOut
      mockConnection.query.mockResolvedValueOnce([
        [
          {
            id: 'att-preserve-01',
            shift_id: 'shift-preserve-01',
            staff_id: 'EMP-DOC-001',
            clock_in_time: '2026-11-15 07:00:00',
            clock_out_time: null,
            scheduled_end_time: '2026-11-15 15:30:00',
            shift_end_time: '2026-11-15 16:30:00',
            shift_overrun_minutes: 60,
            overtime_minutes: 60,
            shift_overrun_approval: 'AUTO_APPROVED',
            attendance_status: 'PRESENT'
          }
        ]
      ]);

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await attendanceService.clockOut('att-preserve-01', {
        clock_out_time: '2026-11-15 16:30:00',
        overtime_minutes: 60,
        overrun_reason: 'Phẫu thuật kéo dài',
        clinical_case_ref: 'PT-092'
      });

      expect(result.overtime_minutes).toBe(60);
      expect(result.clinical_case_ref).toBe('PT-092');
      expect(result.overrun_approval_status).toBe('PENDING_APPROVAL');
    });
  });
});
