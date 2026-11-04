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

const JWT_SECRET = process.env.JWT_SECRET || 'clinical_dev_secret_key_hrm_2026';

function generateAuthToken(payload = {}) {
  return jwt.sign(
    {
      id: 1,
      employee_code: 'EMP-HEAD-001',
      role: 'DEPARTMENT_HEAD',
      department_code: 'DEP-HSTC',
      ...payload
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Ward Secretary Delegation, Roster Batch Approval, and Monthly KPI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.execute.mockReset();
  });

  describe('Ward Secretary Delegation Flow', () => {
    it('POST /api/shifts/departments/:code/delegate should assign a ward secretary', async () => {
      // 1. Employee check in dept
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-NURSE-002', department_code: 'DEP-HSTC', first_name: 'Lan', last_name: 'Nguyễn', role: 'NURSE' }]]);
      // 2. Insert/Update delegation
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. Audit log
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const token = generateAuthToken();
      const res = await request(app)
        .post('/api/shifts/departments/DEP-HSTC/delegate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          delegated_staff_id: 'EMP-NURSE-002',
          notes: 'Phân quyền thư ký lập lịch tháng 11'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.delegated_staff_id).toBe('EMP-NURSE-002');
    });

    it('GET /api/shifts/departments/:code/delegate should return active delegation', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          department_code: 'DEP-HSTC',
          delegated_staff_id: 'EMP-NURSE-002',
          first_name: 'Lan',
          last_name: 'Nguyễn',
          role: 'NURSE',
          is_active: 1
        }
      ]]);

      const token = generateAuthToken();
      const res = await request(app)
        .get('/api/shifts/departments/DEP-HSTC/delegate')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.delegated_staff_id).toBe('EMP-NURSE-002');
    });

    it('should create shift with PENDING_APPROVAL status when scheduled by ward secretary', async () => {
      // 1. Check secretary delegation in shiftController
      pool.query.mockResolvedValueOnce([[{ id: 'del-uuid-1' }]]);
      // 2. Employee check in shiftService
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-DOC-001', first_name: 'Hải', last_name: 'Lê', role: 'DOCTOR', department_code: 'DEP-HSTC' }]]);
      // 3. C1: License check
      pool.query.mockResolvedValueOnce([[{ id: 1, verification_status: 'VERIFIED', expiration_date: '2028-12-31' }]]);
      // 4. C3: Leave conflict check
      pool.query.mockResolvedValueOnce([[]]);
      // 5. Overlap check
      pool.query.mockResolvedValueOnce([[]]);
      // 6. Rest interval check
      pool.query.mockResolvedValueOnce([[]]);
      // 7. Insert shift
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 8. Audit log
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const secretaryToken = generateAuthToken({
        employee_code: 'EMP-NURSE-002',
        role: 'NURSE',
        department_code: 'DEP-HSTC'
      });

      const res = await request(app)
        .post('/api/shifts')
        .set('Authorization', `Bearer ${secretaryToken}`)
        .send({
          staff_id: 'EMP-DOC-001',
          department_code: 'DEP-HSTC',
          start_time: '2026-11-10 07:00:00',
          end_time: '2026-11-10 15:00:00',
          shift_type: 'MORNING'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approval_status).toBe('PENDING_APPROVAL');
      expect(res.body.data.submitted_by).toBe('EMP-NURSE-002');
    });

    it('POST /api/shifts/approve-batch should approve pending shifts', async () => {
      // 1. Batch update
      pool.query.mockResolvedValueOnce([{ affectedRows: 2 }]);
      // 2. Audit log
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const headToken = generateAuthToken({
        employee_code: 'EMP-HEAD-001',
        role: 'DEPARTMENT_HEAD',
        department_code: 'DEP-HSTC'
      });

      const res = await request(app)
        .post('/api/shifts/approve-batch')
        .set('Authorization', `Bearer ${headToken}`)
        .send({
          department_code: 'DEP-HSTC',
          shift_ids: ['shift-1', 'shift-2']
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approved_count).toBe(2);
    });
  });

  describe('Monthly Clinical KPI & Evaluation Endpoints', () => {
    it('POST /api/kpi/auto-compute should aggregate attendance & handover data', async () => {
      // 1. Active staff query
      pool.query.mockResolvedValueOnce([[
        { employee_code: 'EMP-DOC-001', first_name: 'Hải', last_name: 'Lê', role: 'DOCTOR', department_code: 'DEP-HSTC' }
      ]]);
      // 2. Attendance stats query
      pool.query.mockResolvedValueOnce([[
        { total_attendance: 20, late_count: 0, total_minutes: 9600 }
      ]]);
      // 3. Shift query
      pool.query.mockResolvedValueOnce([[
        { id: 's-1', requires_handover: 1 }
      ]]);
      // 4. Handover stats query
      pool.query.mockResolvedValueOnce([[
        { completed_count: 1 }
      ]]);
      // 5. Existing KPI check
      pool.query.mockResolvedValueOnce([[]]);
      // 6. Insert KPI
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 7. Audit log
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const hrToken = generateAuthToken({ role: 'HR_MANAGER' });
      const res = await request(app)
        .post('/api/kpi/auto-compute')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          month: '2026-11',
          department_code: 'DEP-HSTC'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.computed_count).toBe(1);
    });

    it('POST /api/kpi/evaluate should save clinical evaluation and finalize rating grade', async () => {
      // 1. Fetch current KPI record
      pool.query.mockResolvedValueOnce([[
        {
          id: 'kpi-1',
          staff_id: 'EMP-DOC-001',
          kpi_month: '2026-11',
          on_time_attendance_rate: 100.0,
          handover_compliance_rate: 100.0,
          actual_shifts: 20,
          actual_hours: 160.0
        }
      ]]);
      // 2. Insert/Update KPI record
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. Return updated record with employee info
      pool.query.mockResolvedValueOnce([[
        {
          id: 'kpi-1',
          staff_id: 'EMP-DOC-001',
          total_kpi_score: 94.0,
          kpi_grade: 'GRADE_A',
          status: 'APPROVED'
        }
      ]]);

      const headToken = generateAuthToken();
      const res = await request(app)
        .post('/api/kpi/evaluate')
        .set('Authorization', `Bearer ${headToken}`)
        .send({
          staff_id: 'EMP-DOC-001',
          kpi_month: '2026-11',
          clinical_performance_score: 90.0,
          patient_satisfaction_score: 95.0,
          evaluation_notes: 'Hoàn thành xuất sắc nhiệm vụ cấp cứu hồi sức trong tháng'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpi_grade).toBe('GRADE_A');
    });

    it('POST /api/kpi/evaluate should support 6 criteria groups and incident classification per KPI.md', async () => {
      // 1. Fetch current KPI record
      pool.query.mockResolvedValueOnce([[
        {
          id: 'kpi-2',
          staff_id: 'EMP-NUR-001',
          kpi_month: '2026-11'
        }
      ]]);
      // 2. Insert/Update KPI record
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      // 3. Return updated record with 6 criteria scores
      pool.query.mockResolvedValueOnce([[
        {
          id: 'kpi-2',
          staff_id: 'EMP-NUR-001',
          score_discipline: 100.0,
          score_task_completion: 95.0,
          score_work_quality: 90.0,
          score_communication: 98.0,
          score_competence: 92.0,
          score_innovation: 85.0,
          incident_cause: 'INDIVIDUAL_ERROR',
          incident_penalty_points: 5.0,
          total_kpi_score: 89.2,
          kpi_grade: 'GRADE_B',
          status: 'APPROVED'
        }
      ]]);

      const chiefNurseToken = generateAuthToken({ role: 'CHIEF_NURSE', employee_code: 'EMP-NUR-HEAD' });
      const res = await request(app)
        .post('/api/kpi/evaluate')
        .set('Authorization', `Bearer ${chiefNurseToken}`)
        .send({
          staff_id: 'EMP-NUR-001',
          kpi_month: '2026-11',
          role: 'NURSE',
          score_discipline: 100.0,
          score_task_completion: 95.0,
          score_work_quality: 90.0,
          score_communication: 98.0,
          score_competence: 92.0,
          score_innovation: 85.0,
          incident_cause: 'INDIVIDUAL_ERROR',
          incident_penalty_points: 5.0,
          incident_notes: 'Chậm trễ trong chuẩn bị bàn giao thiết bị phòng mổ'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.kpi_grade).toBe('GRADE_B');
    });

    it('POST /api/kpi/auto-compute should allow CHIEF_NURSE to trigger ward KPI computation', async () => {
      // 1. Employee query in department
      pool.query.mockResolvedValueOnce([[{ employee_code: 'EMP-NUR-001', first_name: 'Hoa', last_name: 'Lê', role: 'NURSE', department_code: 'DEP-HSTC' }]]);
      // 2. Attendance query
      pool.query.mockResolvedValueOnce([[{ total_attendance: 20, late_count: 0, total_minutes: 9600 }]]);
      // 3. Shifts query
      pool.query.mockResolvedValueOnce([[]]);
      // 4. Existing KPI check
      pool.query.mockResolvedValueOnce([[]]);
      // 5. Insert KPI
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const chiefToken = generateAuthToken({ role: 'CHIEF_NURSE' });
      const res = await request(app)
        .post('/api/kpi/auto-compute')
        .set('Authorization', `Bearer ${chiefToken}`)
        .send({
          month: '2026-11',
          department_code: 'DEP-HSTC'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.computed_count).toBe(1);
    });

    it('GET /api/kpi/my-history should return KPI history for authenticated staff', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          id: 'kpi-1',
          staff_id: 'EMP-DOC-001',
          kpi_month: '2026-10',
          total_kpi_score: 94.5,
          kpi_grade: 'GRADE_A'
        }
      ]]);

      const token = generateAuthToken({ employee_code: 'EMP-DOC-001', role: 'DOCTOR' });
      const res = await request(app)
        .get('/api/kpi/my-history?staff_id=EMP-DOC-001')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].kpi_grade).toBe('GRADE_A');
    });
  });
});
