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
      employee_code: 'EMP-HR-001',
      role: 'HR_MANAGER',
      department_code: 'DEP-TCCB',
      ...payload
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Medical Dossier, HR Contracts, Insurances, and Commendations Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.execute.mockReset();
  });

  describe('GET /api/employees/:id/dossier', () => {
    it('should return complete medical staff dossier including degrees, CCHN, CME, and contracts', async () => {
      const mockEmp = [{
        id: 1,
        employee_code: 'EMP-DOC-001',
        first_name: 'Alexander',
        last_name: 'Wright',
        role: 'DOCTOR',
        department_name: 'Cấp Cứu (ER)',
        last_salary_increment_date: '2026-01-01',
        is_salary_increment_hidden: 0
      }];

      const mockLicenses = [{ id: 1, license_number: 'CCHN-00123/BYT' }];
      const mockDegrees = [{ id: 'd-1', degree_name: 'Bác sĩ Đa khoa', institution_name: 'ĐH Y Dược' }];
      const mockCerts = [{ id: 'c-1', certificate_name: 'Hồi sức tim phổi ACLS' }];
      const mockContracts = [{ id: 'con-1', contract_number: 'HĐLĐ-2026-001' }];
      const mockInsurances = [{ id: 'ins-1', bhxh_book_number: '7912345678' }];
      const mockRewards = [{ id: 'r-1', title: 'Chiến sĩ thi đua cấp cơ sở' }];
      const mockKpis = [{ id: 'k-1', kpi_month: '2026-10', total_kpi_score: 95.0, kpi_grade: 'GRADE_A' }];
      const mockPayRates = [{ base_hourly_rate: 150000.0, last_salary_increment_date: '2026-01-01' }];

      pool.query
        .mockResolvedValueOnce([mockEmp]) // 1. Emp row in getEmployeeById
        .mockResolvedValueOnce([mockLicenses]) // 2. Medical licenses in getEmployeeById
        .mockResolvedValueOnce([mockDegrees]) // 3. Academic degrees
        .mockResolvedValueOnce([mockLicenses]) // 4. Medical licenses with expiry diff
        .mockResolvedValueOnce([mockCerts]) // 5. Specialized certs
        .mockResolvedValueOnce([mockContracts]) // 6. Contracts
        .mockResolvedValueOnce([mockInsurances]) // 7. Insurances
        .mockResolvedValueOnce([mockRewards]) // 8. Commendations
        .mockResolvedValueOnce([mockKpis]) // 9. KPIs
        .mockResolvedValueOnce([mockPayRates]); // 10. PayRates

      const token = generateAuthToken();
      const res = await request(app)
        .get('/api/employees/EMP-DOC-001/dossier')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee_code).toBe('EMP-DOC-001');
      expect(res.body.data.academic_degrees).toHaveLength(1);
      expect(res.body.data.specialized_certifications).toHaveLength(1);
      expect(res.body.data.employment_contracts).toHaveLength(1);
      expect(res.body.data.social_insurances).toBeDefined();
    });
  });

  describe('POST /api/employees/:staff_id/degrees & DELETE', () => {
    it('should add an academic degree and return 201', async () => {
      pool.query
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // insert
        .mockResolvedValueOnce([[{ id: 'deg-uuid-1', degree_name: 'Bác sĩ Chuyên khoa 1' }]]); // select

      const token = generateAuthToken();
      const res = await request(app)
        .post('/api/employees/EMP-DOC-001/degrees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          degree_type: 'SPECIALIST_1',
          degree_name: 'Bác sĩ Chuyên khoa 1',
          institution_name: 'Đại học Y Hà Nội',
          graduation_year: 2020
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.degree_name).toBe('Bác sĩ Chuyên khoa 1');
    });

    it('should delete an academic degree and return 200', async () => {
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const token = generateAuthToken();
      const res = await request(app)
        .delete('/api/employees/EMP-DOC-001/degrees/deg-uuid-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('HR Contracts Management Endpoints', () => {
    it('GET /api/hr/contracts should filter by expiring_within_days', async () => {
      pool.query.mockResolvedValueOnce([[
        {
          id: 'con-1',
          staff_id: 'EMP-DOC-001',
          contract_number: 'HĐ-TV-2026',
          days_until_expiry: 15
        }
      ]]);

      const token = generateAuthToken();
      const res = await request(app)
        .get('/api/hr/contracts?expiring_within_days=30')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].days_until_expiry).toBe(15);
    });

    it('POST /api/hr/contracts should create or update contract', async () => {
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]); // insert/update
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // audit log
      pool.query.mockResolvedValueOnce([[{ id: 'con-uuid', contract_number: 'HĐLĐ-123', staff_id: 'EMP-DOC-001' }]]);

      const token = generateAuthToken();
      const res = await request(app)
        .post('/api/hr/contracts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          staff_id: 'EMP-DOC-001',
          contract_number: 'HĐLĐ-123',
          contract_type: 'DEFINITE_1YR',
          start_date: '2026-01-01',
          job_title: 'Bác sĩ Hồi sức'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.contract_number).toBe('HĐLĐ-123');
    });
  });

  describe('HR Insurances & Salary Increment Endpoints', () => {
    it('PUT /api/hr/insurances/:staff_id should update insurance records', async () => {
      pool.query.mockResolvedValueOnce([[]]); // select existing
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]); // insert/update
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // audit log
      pool.query.mockResolvedValueOnce([[{ staff_id: 'EMP-DOC-001', bhxh_book_number: '0123456789' }]]);

      const token = generateAuthToken();
      const res = await request(app)
        .put('/api/hr/insurances/EMP-DOC-001')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bhxh_book_number: '0123456789',
          bhyt_card_number: 'DN4791234567890',
          has_bhxh: true,
          has_bhyt: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bhxh_book_number).toBe('0123456789');
    });

    it('PATCH /api/hr/salary-increment/:staff_id should update last salary increment date & toggle hidden state', async () => {
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]); // update pay rate
      pool.query.mockResolvedValueOnce([[{ staff_id: 'EMP-DOC-001', last_salary_increment_date: '2026-03-01', is_salary_increment_hidden: 1 }]]);

      const token = generateAuthToken();
      const res = await request(app)
        .patch('/api/hr/salary-increment/EMP-DOC-001')
        .set('Authorization', `Bearer ${token}`)
        .send({
          last_salary_increment_date: '2026-03-01',
          is_salary_increment_hidden: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_salary_increment_hidden).toBe(1);
    });
  });
});
