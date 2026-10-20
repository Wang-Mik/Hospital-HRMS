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

describe('Backend Employee Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pool.getConnection.mockResolvedValue(mockConnection);
    mockConnection.beginTransaction.mockResolvedValue();
    mockConnection.commit.mockResolvedValue();
    mockConnection.rollback.mockResolvedValue();
    mockConnection.release.mockReturnValue();
  });

  describe('GET /api/employees/:id', () => {
    it('should return employee record with active medical licenses', async () => {
      const mockEmp = {
        id: 1,
        employee_code: 'EMP-DOC-001',
        first_name: 'Alexander',
        last_name: 'Wright',
        email: 'dr.wright@hospital.org',
        role: 'DEPARTMENT_HEAD',
        department_name: 'Emergency Medicine (ER)'
      };

      const mockLicenses = [
        {
          id: 1,
          employee_id: 1,
          license_type: 'State Medical Board License (MD)',
          license_number: 'MD-99281-ER',
          expiration_date: '2026-12-31',
          verification_status: 'VERIFIED'
        }
      ];

      pool.query
        .mockResolvedValueOnce([[mockEmp]])
        .mockResolvedValueOnce([mockLicenses]);

      const res = await request(app).get('/api/employees/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employee_code).toBe('EMP-DOC-001');
      expect(res.body.data.active_medical_licenses).toHaveLength(1);
    });

    it('should return 404 when employee does not exist', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/employees/EMP-NONEXISTENT');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/employees', () => {
    it('should create a new employee with valid data and medical licenses', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[]]) // duplicate check: none
        .mockResolvedValueOnce([[{ id: 1 }]]); // department check: exists
      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 42 }]) // insert employee
        .mockResolvedValueOnce([{ insertId: 101 }]); // insert license

      const res = await request(app)
        .post('/api/employees')
        .send({
          employee_code: 'EMP-DOC-042',
          first_name: 'Gregory',
          last_name: 'House',
          email: 'dr.house@hospital.org',
          department_id: 1,
          role: 'DOCTOR',
          medical_licenses: [
            {
              license_type: 'State Medical Board License (MD)',
              license_number: 'MD-112233',
              issue_date: '2020-01-01',
              expiration_date: '2028-01-01'
            }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(42);
      expect(res.body.data.medical_licenses).toHaveLength(1);
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should return 400 when missing mandatory fields', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          first_name: 'Gregory'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/employees')
        .send({
          employee_code: 'EMP-DOC-042',
          first_name: 'Gregory',
          last_name: 'House',
          email: 'invalid-email-string'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when department does not exist', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[]]) // duplicate check: none
        .mockResolvedValueOnce([[]]); // department check: NOT FOUND

      const res = await request(app)
        .post('/api/employees')
        .send({
          employee_code: 'EMP-DOC-042',
          first_name: 'Gregory',
          last_name: 'House',
          email: 'dr.house@hospital.org',
          department_id: 999
        });

      expect(res.status).toBe(400);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should return 409 when employee_code or email already exists', async () => {
      mockConnection.query.mockResolvedValueOnce([[{ id: 1, employee_code: 'EMP-DOC-001', email: 'dr.wright@hospital.org' }]]);

      const res = await request(app)
        .post('/api/employees')
        .send({
          employee_code: 'EMP-DOC-001',
          first_name: 'Duplicate',
          last_name: 'Doctor',
          email: 'dup@hospital.org'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });

  describe('Emergency Contacts Endpoints', () => {
    it('POST /api/employees/:staff_id/emergency-contacts should add emergency contact', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/employees/EMP-DOC-001/emergency-contacts')
        .send({
          contact_name: 'Rachel Wright',
          relationship: 'Spouse',
          phone_number: '+1-555-0811'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.staff_id).toBe('EMP-DOC-001');
    });

    it('POST /api/employees/:staff_id/emergency-contacts should return 400 when fields missing', async () => {
      const res = await request(app)
        .post('/api/employees/EMP-DOC-001/emergency-contacts')
        .send({
          contact_name: 'Rachel'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/employees/:staff_id/emergency-contacts should return contacts list', async () => {
      const mockContacts = [
        {
          id: '11111111-ec11-4111-8111-111111111111',
          staff_id: 'EMP-DOC-001',
          contact_name: 'Rachel Wright',
          relationship: 'Spouse',
          phone_number: '+1-555-0811'
        }
      ];

      pool.query.mockResolvedValueOnce([mockContacts]);

      const res = await request(app).get('/api/employees/EMP-DOC-001/emergency-contacts');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Documents Endpoints', () => {
    it('POST /api/employees/:staff_id/documents should upload document', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/employees/EMP-DOC-001/documents')
        .send({
          document_name: 'Medical_Diploma.pdf',
          document_type: 'CERTIFICATE',
          file_url: 'https://storage.hospital-hrm.org/docs/diploma.pdf'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.document_type).toBe('CERTIFICATE');
    });

    it('POST /api/employees/:staff_id/documents should return 400 for invalid document_type', async () => {
      const res = await request(app)
        .post('/api/employees/EMP-DOC-001/documents')
        .send({
          document_name: 'Medical_Diploma.pdf',
          document_type: 'INVALID_TYPE',
          file_url: 'https://storage.hospital-hrm.org/docs/diploma.pdf'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/employees/:staff_id/documents should list documents', async () => {
      const mockDocs = [
        {
          id: '11111111-doc1-4111-8111-111111111111',
          staff_id: 'EMP-DOC-001',
          document_name: 'Medical_Diploma.pdf',
          document_type: 'CERTIFICATE',
          file_url: 'https://storage.hospital-hrm.org/docs/diploma.pdf'
        }
      ];

      pool.query.mockResolvedValueOnce([mockDocs]);

      const res = await request(app).get('/api/employees/EMP-DOC-001/documents');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
