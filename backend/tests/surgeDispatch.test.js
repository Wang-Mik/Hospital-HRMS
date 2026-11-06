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
import { surgeDispatchService } from '../src/services/surgeDispatchService.js';

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

describe('Hệ Thống Điều Động Tăng Cường & Bù Đắp Nhân Lực Tests', () => {
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

  describe('GET /api/surge-dispatches/candidates/:departmentCode', () => {
    it('should return ranked candidates with unified Frontend & Backend contract fields', async () => {
      const mockStaff = [
        {
          emp_id: 1,
          employee_code: 'EMP-DOC-008',
          first_name: 'Văn Khang',
          last_name: 'Lê',
          role: 'DEPARTMENT_HEAD',
          specialty: 'Cấp Cứu Ban Đầu',
          phone: '0908123456',
          department_code: 'DEP-KHB',
          department_name: 'Khoa Khám Bệnh & Cấp Cứu Ban Đầu',
          on_call_shift_id: 'shift-oncall-1',
          shift_type: 'ON_CALL',
          shift_status: 'ON_CALL'
        },
        {
          emp_id: 2,
          employee_code: 'EMP-DOC-009',
          first_name: 'Minh Trí',
          last_name: 'Nguyễn',
          role: 'DOCTOR',
          specialty: 'Hồi Sức Cấp Cứu',
          phone: '0908234567',
          department_code: 'DEP-KHB',
          department_name: 'Khoa Khám Bệnh & Cấp Cứu Ban Đầu',
          on_call_shift_id: null,
          shift_type: null,
          shift_status: null
        }
      ];

      const mockLicenses = [
        { employee_id: 1, license_number: 'CCHN-001', verification_status: 'VERIFIED', expiration_date: '2028-12-31' },
        { employee_id: 2, license_number: 'CCHN-002', verification_status: 'VERIFIED', expiration_date: '2028-12-31' }
      ];

      pool.query.mockResolvedValueOnce([mockStaff]);
      pool.query.mockResolvedValueOnce([mockLicenses]);
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([[]]);

      const token = generateAuthToken();
      const res = await request(app)
        .get('/api/surge-dispatches/candidates/DEP-KHB?staff_type=DOCTOR')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.candidates).toHaveLength(2);
      expect(res.body.data.top_candidates).toHaveLength(2);
      expect(res.body.data.candidates[0].staff_id).toBe('EMP-DOC-008');
      expect(res.body.data.candidates[0].full_name).toBe('Lê Văn Khang');
      expect(res.body.data.candidates[0].license_number).toBe('CCHN-001');
      expect(res.body.data.candidates[0].eta_minutes).toBe(15);
      expect(res.body.data.candidates[0].has_on_call_today).toBe(true);
      expect(res.body.data.candidates[0].suitability_score).toBeGreaterThan(80);
      expect(res.body.data.candidates[0].phone_contact).toBe('0908123456');
    });

    it('should strictly exclude staff in 24h rest interval after a 14h night shift (RESTING_POST_NIGHT)', async () => {
      const mockStaff = [
        {
          emp_id: 3,
          employee_code: 'EMP-DOC-010',
          first_name: 'Phương Thảo',
          last_name: 'Trần',
          role: 'DOCTOR',
          specialty: 'Khám Bệnh',
          phone: '0908345678',
          department_code: 'DEP-KHB',
          department_name: 'Khoa Khám Bệnh',
          on_call_shift_id: 'shift-oncall-2',
          shift_type: 'ON_CALL',
          shift_status: 'ON_CALL'
        }
      ];

      const mockLicenses = [
        { employee_id: 3, license_number: 'CCHN-003', verification_status: 'VERIFIED', expiration_date: '2028-12-31' }
      ];

      const mockNightShifts = [
        { staff_id: 'EMP-DOC-010', end_time: '2026-11-05 08:00:00' }
      ];

      pool.query.mockResolvedValueOnce([mockStaff]);
      pool.query.mockResolvedValueOnce([mockLicenses]);
      pool.query.mockResolvedValueOnce([mockNightShifts]);
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([[]]);

      const token = generateAuthToken();
      const res = await request(app)
        .get('/api/surge-dispatches/candidates/DEP-KHB')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.candidates).toHaveLength(0);
      expect(res.body.data.excluded_candidates).toHaveLength(1);
      expect(res.body.data.excluded_candidates[0].staff_id).toBe('EMP-DOC-010');
      expect(res.body.data.excluded_candidates[0].exclusion_reason).toContain('RESTING_POST_NIGHT');
    });

    it('should strictly exclude staff with expired or unverified medical license', async () => {
      const mockStaff = [
        {
          emp_id: 4,
          employee_code: 'EMP-DOC-011',
          first_name: 'Văn B',
          last_name: 'Đỗ',
          role: 'DOCTOR',
          specialty: 'Cấp Cứu',
          phone: '0908999999',
          department_code: 'DEP-KHB',
          department_name: 'Khoa Khám Bệnh',
          on_call_shift_id: 'shift-oncall-3',
          shift_type: 'ON_CALL',
          shift_status: 'ON_CALL'
        }
      ];

      const mockLicenses = [
        { employee_id: 4, license_number: 'CCHN-OLD', verification_status: 'VERIFIED', expiration_date: '2020-01-01' }
      ];

      pool.query.mockResolvedValueOnce([mockStaff]);
      pool.query.mockResolvedValueOnce([mockLicenses]);
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([[]]);

      const token = generateAuthToken();
      const res = await request(app)
        .get('/api/surge-dispatches/candidates/DEP-KHB')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.candidates).toHaveLength(0);
      expect(res.body.data.excluded_candidates).toHaveLength(1);
      expect(res.body.data.excluded_candidates[0].exclusion_reason).toContain('hết hiệu lực');
    });
  });

  describe('POST /api/surge-dispatches (Dispatch Execution & Concurrency)', () => {
    it('should create an active surge dispatch session and return dispatch_id and responder_name', async () => {
      mockConnection.query.mockResolvedValueOnce([[]]);

      pool.query.mockResolvedValueOnce([[
        {
          emp_id: 1,
          employee_code: 'EMP-DOC-008',
          first_name: 'Văn Khang',
          last_name: 'Lê',
          role: 'DEPARTMENT_HEAD',
          specialty: 'Cấp Cứu',
          phone: '0908123456',
          department_code: 'DEP-KHB',
          department_name: 'Khoa Khám Bệnh & Cấp Cứu Ban Đầu',
          on_call_shift_id: 'shift-oncall-1'
        }
      ]]);
      pool.query.mockResolvedValueOnce([[{ employee_id: 1, license_number: 'CCHN-001', verification_status: 'VERIFIED', expiration_date: '2028-12-31' }]]);
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([[]]);
      pool.query.mockResolvedValueOnce([[]]);

      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      pool.query.mockResolvedValueOnce([[
        {
          id: 'surge-uuid-1',
          department_code: 'DEP-KHB',
          alert_level: 'CODE_RED',
          reason: 'Tai nạn giao thông liên hoàn 15 nạn nhân',
          selected_staff_id: 'EMP-DOC-008',
          phone_contact: '0908123456',
          status: 'IN_PROGRESS',
          response_status: 'PENDING'
        }
      ]]);

      const token = generateAuthToken();
      const res = await request(app)
        .post('/api/surge-dispatches')
        .set('Authorization', `Bearer ${token}`)
        .send({
          department_code: 'DEP-KHB',
          alert_level: 'CODE_RED',
          reason: 'Tai nạn giao thông liên hoàn 15 nạn nhân',
          selected_candidate_id: 'EMP-DOC-008'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dispatch_id).toBe('surge-uuid-1');
      expect(res.body.data.alert_level).toBe('CODE_RED');
      expect(res.body.data.selected_staff_id).toBe('EMP-DOC-008');
      expect(res.body.data.responder_name).toBe('Lê Văn Khang');
    });

    it('should reject with 409 Conflict if department already has an active surge dispatch in progress', async () => {
      mockConnection.query.mockResolvedValueOnce([[
        { id: 'active-surge-123', alert_level: 'LEVEL_1_SURGE', reason: 'Quá tải ca cấp cứu' }
      ]]);

      const token = generateAuthToken();
      const res = await request(app)
        .post('/api/surge-dispatches')
        .set('Authorization', `Bearer ${token}`)
        .send({
          department_code: 'DEP-KHB',
          alert_level: 'CODE_RED',
          reason: 'Báo động đỏ mới'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('đang có một phiên điều động khẩn cấp');
    });
  });

  describe('POST /api/surge-dispatches/:id/log-call (Dispatcher Call Logging & Multi-Step Auto-Fallback)', () => {
    it('should log coordinator call as ACCEPTED_15M (via call_outcome) and return updated session data', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          id: 'surge-1',
          department_code: 'DEP-KHB',
          reason: 'Tăng cường bác sĩ trực',
          status: 'IN_PROGRESS',
          selected_staff_id: 'EMP-DOC-008',
          candidates_snapshot: JSON.stringify([
            { staff_id: 'EMP-DOC-008', full_name: 'Lê Văn Khang', role: 'DOCTOR' }
          ])
        }
      ]]);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // Shift sync check & update
      pool.query.mockResolvedValueOnce([[{ id: 'shift-oncall-1', status: 'ON_CALL', shift_type: 'ON_CALL' }]]);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const token = generateAuthToken();
      const res = await request(app)
        .post('/api/surge-dispatches/surge-1/log-call')
        .set('Authorization', `Bearer ${token}`)
        .send({
          call_outcome: 'ACCEPTED_15M',
          note: 'Bác sĩ nghe máy ngay và báo đang chuẩn bị xe vào viện.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('ACCEPTED');
      expect(res.body.estimated_arrival_minutes).toBe(15);
      expect(res.body.data.dispatch_id).toBe('surge-1');
      expect(res.body.data.response_status).toBe('ACCEPTED');
    });

    it('should progress sequentially #1 -> #2 -> #3 without looping back to #1 when multiple candidates are UNREACHABLE', async () => {
      const mockSnapshotStep1 = [
        { staff_id: 'EMP-DOC-001', staff_name: 'Ứng Viên 1', phone_contact: '0908000001', suitability_score: 95, attempted: true },
        { staff_id: 'EMP-DOC-002', staff_name: 'Ứng Viên 2', phone_contact: '0908000002', suitability_score: 90, attempted: false },
        { staff_id: 'EMP-DOC-003', staff_name: 'Ứng Viên 3', phone_contact: '0908000003', suitability_score: 85, attempted: false }
      ];

      // Step 1: Candidate #1 is UNREACHABLE -> promotes Candidate #2
      pool.query.mockResolvedValueOnce([[
        {
          id: 'surge-seq',
          status: 'IN_PROGRESS',
          selected_staff_id: 'EMP-DOC-001',
          candidates_snapshot: JSON.stringify(mockSnapshotStep1)
        }
      ]]);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const token = generateAuthToken();
      const res1 = await request(app)
        .post('/api/surge-dispatches/surge-seq/log-call')
        .set('Authorization', `Bearer ${token}`)
        .send({ call_outcome: 'UNREACHABLE' });

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('PROMOTED_NEXT');
      expect(res1.body.promoted_candidate.staff_id).toBe('EMP-DOC-002');
      expect(res1.body.data.selected_staff_id).toBe('EMP-DOC-002');

      // Step 2: Candidate #2 is ALSO UNREACHABLE -> must promote Candidate #3 (NOT loop back to #1!)
      pool.query.mockResolvedValueOnce([[
        {
          id: 'surge-seq',
          status: 'IN_PROGRESS',
          selected_staff_id: 'EMP-DOC-002',
          candidates_snapshot: JSON.stringify(res1.body.data.candidates_snapshot)
        }
      ]]);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res2 = await request(app)
        .post('/api/surge-dispatches/surge-seq/log-call')
        .set('Authorization', `Bearer ${token}`)
        .send({ call_outcome: 'UNREACHABLE' });

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('PROMOTED_NEXT');
      expect(res2.body.promoted_candidate.staff_id).toBe('EMP-DOC-003');
      expect(res2.body.data.selected_staff_id).toBe('EMP-DOC-003');
    });
  });

  describe('POST /api/surge-dispatches/:id/resolve', () => {
    it('should close surge dispatch session and set status to RESOLVED', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 'surge-1', status: 'IN_PROGRESS' }]]);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const token = generateAuthToken();
      const res = await request(app)
        .post('/api/surge-dispatches/surge-1/resolve')
        .set('Authorization', `Bearer ${token}`)
        .send({
          resolution_notes: 'Tình hình nhân lực khoa đã ổn định.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RESOLVED');
      expect(res.body.message).toContain('kết thúc phiên điều động');
    });
  });

  describe('Attendance Clock-In Surge Transition (handleClockInSurgeTransition)', () => {
    it('should transition shift from ON_CALL to EMERGENCY_ACTIVE on Clock-In', async () => {
      const mockConn = {
        query: jest.fn().mockResolvedValueOnce([[
          {
            id: 'surge-active-99',
            department_code: 'DEP-KHB',
            alert_level: 'CODE_RED',
            selected_staff_id: 'EMP-DOC-008'
          }
        ]]),
        execute: jest.fn().mockResolvedValue([{ affectedRows: 1 }])
      };

      const result = await surgeDispatchService.handleClockInSurgeTransition(
        'EMP-DOC-008',
        '2026-11-05 02:30:00',
        mockConn
      );

      expect(result.is_surge_active).toBe(true);
      expect(result.dispatch_id).toBe('surge-active-99');
      expect(result.allowance_note).toContain('QĐ 73/2011/QĐ-TTg');
      expect(mockConn.execute).toHaveBeenCalledTimes(2);
    });
  });
});
