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

const mockConnection = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
  release: jest.fn()
};

describe('Backend Attendance Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.getConnection.mockResolvedValue(mockConnection);
    mockConnection.beginTransaction.mockResolvedValue();
    mockConnection.commit.mockResolvedValue();
    mockConnection.rollback.mockResolvedValue();
    mockConnection.release.mockReturnValue();
  });

  describe('POST /api/attendance/clock-in', () => {
    it('should clock in successfully with shift and return 201', async () => {
      const validShift = {
        id: 'shift-111',
        staff_id: 'EMP-DOC-001',
        start_time: '2026-08-20 07:00:00',
        end_time: '2026-08-20 15:00:00'
      };

      mockConnection.query
        .mockResolvedValueOnce([[validShift]]) // Shift check
        .mockResolvedValueOnce([[]]); // No active open session

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update shift status
        .mockResolvedValueOnce([{ insertId: 1 }]); // Insert attendance

      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          staff_id: 'EMP-DOC-001',
          shift_id: 'shift-111',
          clock_in_method: 'BIOMETRIC',
          clock_in_time: '2026-08-20 06:55:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendance_status).toBe('PRESENT');
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should detect LATE attendance when clocking in > 15 mins after shift start', async () => {
      const validShift = {
        id: 'shift-111',
        staff_id: 'EMP-DOC-001',
        start_time: '2026-08-20 07:00:00',
        end_time: '2026-08-20 15:00:00'
      };

      mockConnection.query
        .mockResolvedValueOnce([[validShift]])
        .mockResolvedValueOnce([[]]);

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ insertId: 1 }]);

      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          staff_id: 'EMP-DOC-001',
          shift_id: 'shift-111',
          clock_in_method: 'BIOMETRIC',
          clock_in_time: '2026-08-20 07:20:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.attendance_status).toBe('LATE');
    });

    it('should clock in successfully without shift_id', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[]]) // auto-match nearest shift query
        .mockResolvedValueOnce([[]]); // No active open session
      mockConnection.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          staff_id: 'EMP-DOC-001',
          clock_in_method: 'RFID_CARD'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendance_status).toBe('PRESENT');
    });

    it('should auto-match scheduled shift when shift_id is omitted', async () => {
      const scheduledShift = {
        id: 'shift-matched-999',
        staff_id: 'EMP-DOC-001',
        start_time: '2026-08-20 07:00:00',
        end_time: '2026-08-20 15:00:00'
      };

      mockConnection.query
        .mockResolvedValueOnce([[scheduledShift]]) // auto-matches scheduledShift
        .mockResolvedValueOnce([[]]); // No active open session

      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE Shifts SET status = "IN_PROGRESS"
        .mockResolvedValueOnce([{ insertId: 1 }]); // INSERT INTO Attendances

      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          staff_id: 'EMP-DOC-001',
          clock_in_method: 'BIOMETRIC',
          clock_in_time: '2026-08-20 06:55:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.shift_id).toBe('shift-matched-999');
      expect(res.body.data.attendance_status).toBe('PRESENT');
    });

    it('should return 400 when missing staff_id', async () => {
      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          clock_in_method: 'BIOMETRIC'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when invalid clock_in_method', async () => {
      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          staff_id: 'EMP-DOC-001',
          clock_in_method: 'TELEPATHY'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 if shift does not exist', async () => {
      mockConnection.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          staff_id: 'EMP-DOC-001',
          shift_id: 'non-existent-shift'
        });

      expect(res.status).toBe(404);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should return 403 if staff is not assigned to the shift', async () => {
      const shiftForOther = {
        id: 'shift-111',
        staff_id: 'EMP-DOC-999'
      };

      mockConnection.query.mockResolvedValueOnce([[shiftForOther]]);

      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          staff_id: 'EMP-DOC-001',
          shift_id: 'shift-111'
        });

      expect(res.status).toBe(403);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should return 409 if staff has an open active clock-in session', async () => {
      const validShift = {
        id: 'shift-111',
        staff_id: 'EMP-DOC-001',
        start_time: '2026-08-20 07:00:00'
      };

      const openSession = {
        id: 'open-att-1',
        clock_in_time: '2026-08-20 06:00:00'
      };

      mockConnection.query
        .mockResolvedValueOnce([[validShift]])
        .mockResolvedValueOnce([[openSession]]);

      const res = await request(app)
        .post('/api/attendance/clock-in')
        .send({
          staff_id: 'EMP-DOC-001',
          shift_id: 'shift-111'
        });

      expect(res.status).toBe(409);
      expect(res.body.active_attendance).toEqual(openSession);
    });
  });

  describe('POST /api/attendance/:id/clock-out', () => {
    it('should clock out, calculate overtime, and update status', async () => {
      const activeAttendance = {
        id: 'att-123',
        shift_id: 'shift-111',
        staff_id: 'EMP-DOC-001',
        clock_in_time: '2026-08-20 06:55:00',
        clock_out_time: null,
        attendance_status: 'PRESENT',
        shift_end_time: '2026-08-20 15:00:00'
      };

      mockConnection.query.mockResolvedValueOnce([[activeAttendance]]);
      mockConnection.execute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/attendance/att-123/clock-out')
        .send({
          clock_out_time: '2026-08-20 15:45:00',
          handover_notes: 'Handover complete to incoming team.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overtime_minutes).toBe(45);
      expect(res.body.data.attendance_status).toBe('OVERTIME');
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should return 400 if attendance already clocked out', async () => {
      const alreadyClockedOut = {
        id: 'att-123',
        clock_out_time: '2026-08-20 15:00:00'
      };

      mockConnection.query.mockResolvedValueOnce([[alreadyClockedOut]]);

      const res = await request(app)
        .post('/api/attendance/att-123/clock-out')
        .send({
          clock_out_time: '2026-08-20 15:45:00'
        });

      expect(res.status).toBe(400);
    });

    it('should return 404 if attendance record not found', async () => {
      mockConnection.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/attendance/non-existent/clock-out')
        .send({
          clock_out_time: '2026-08-20 15:45:00'
        });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/attendance', () => {
    it('should retrieve all attendance records with query filters', async () => {
      const mockAttendances = [
        {
          id: 'att-1',
          staff_id: 'EMP-DOC-001',
          clock_in_time: '2026-08-20 07:00:00',
          attendance_status: 'PRESENT'
        }
      ];

      pool.query.mockResolvedValueOnce([mockAttendances]);

      const res = await request(app).get('/api/attendance?staff_id=EMP-DOC-001&status=PRESENT');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });

    it('GET /api/attendance/:id should return single record', async () => {
      const mockRecord = {
        id: 'att-1',
        staff_id: 'EMP-DOC-001',
        attendance_status: 'PRESENT'
      };

      pool.query.mockResolvedValueOnce([[mockRecord]]);

      const res = await request(app).get('/api/attendance/att-1');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('att-1');
    });

    it('GET /api/attendance/:id should return 404 when not found', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/attendance/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
