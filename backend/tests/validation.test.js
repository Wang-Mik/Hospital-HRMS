import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { z } from 'zod';
import { validateRequest } from '../src/middlewares/validateRequest.js';
import {
  parseToClinicalDateTime,
  clinicalDateOnlySchema,
  clinicalDateTimeSchema,
  paginationQuerySchema,
  bhytCaseRefSchema
} from '../src/validations/commonValidation.js';
import {
  createShiftSchema,
  scheduleShiftSchema,
  recordOverrunSchema
} from '../src/validations/shiftValidation.js';
import { clockInSchema } from '../src/validations/attendanceValidation.js';
import { submitLeaveSchema } from '../src/validations/leaveValidation.js';
import express from 'express';

// Mock DB pool
jest.mock('../src/db.js', () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    execute: jest.fn(),
    getConnection: jest.fn()
  },
  testConnection: jest.fn().mockResolvedValue(true)
}));

describe('Phase 2: Universal Request Validation & Edge Cases Test Suite', () => {
  describe('Common Validation Primitives', () => {
    it('parseToClinicalDateTime should convert ISO 8601 with Z or offset to SQL format YYYY-MM-DD HH:mm:ss', () => {
      const iso = '2026-11-13T07:30:00.000Z';
      const sql = parseToClinicalDateTime(iso);
      expect(sql).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('parseToClinicalDateTime should preserve valid SQL format YYYY-MM-DD HH:mm:ss', () => {
      const sqlInput = '2026-11-13 07:30:00';
      const result = parseToClinicalDateTime(sqlInput);
      expect(result).toBe('2026-11-13 07:30:00');
    });

    it('clinicalDateOnlySchema should parse and validate YYYY-MM-DD', () => {
      expect(clinicalDateOnlySchema.parse('2026-09-01')).toBe('2026-09-01');
      expect(() => clinicalDateOnlySchema.parse('invalid-date')).toThrow();
    });

    it('paginationQuerySchema should coerce strings to numbers with default fallback', () => {
      const result = paginationQuerySchema.parse({ page: '2', limit: '20' });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);

      const defaultResult = paginationQuerySchema.parse({});
      expect(defaultResult.page).toBe(1);
      expect(defaultResult.limit).toBe(50);
    });

    it('bhytCaseRefSchema should validate 10-20 uppercase alphanumeric characters', () => {
      expect(bhytCaseRefSchema.parse('BHYT2026001234')).toBe('BHYT2026001234');
      expect(() => bhytCaseRefSchema.parse('invalid_code_123')).toThrow();
    });
  });

  describe('Dual Error Contract Structure', () => {
    const testApp = express();
    testApp.use(express.json());

    const testSchema = z.object({
      staff_code: z.string({ required_error: 'staff_code is mandatory' }).min(3),
      age: z.coerce.number().min(18, 'Must be at least 18')
    });

    testApp.post('/test-validate', validateRequest({ body: testSchema }), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });

    it('should return 400 with Dual Contract: both primary message string and structured errors array', async () => {
      const res = await request(testApp)
        .post('/test-validate')
        .send({ staff_code: 'A', age: 15 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('ValidationError');
      expect(typeof res.body.message).toBe('string');
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
      expect(res.body.errors[0]).toHaveProperty('field');
      expect(res.body.errors[0]).toHaveProperty('message');
    });

    it('should strip malicious injected properties not defined in the schema', async () => {
      const res = await request(testApp)
        .post('/test-validate')
        .send({
          staff_code: 'DOC-123',
          age: 35,
          __is_super_admin: true,
          malicious_sql_injection: "' OR 1=1 --",
          bypass_rbac: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.data.staff_code).toBe('DOC-123');
      expect(res.body.data.age).toBe(35);
      expect(res.body.data.__is_super_admin).toBeUndefined();
      expect(res.body.data.malicious_sql_injection).toBeUndefined();
      expect(res.body.data.bypass_rbac).toBeUndefined();
    });
  });

  describe('Clinical Schema Rules & Constraints', () => {
    it('createShiftSchema should reject start_time >= end_time', () => {
      const invalidShift = {
        staff_id: 'EMP-DOC-001',
        department_code: 'DEP-KHB',
        start_time: '2026-11-13 18:00:00',
        end_time: '2026-11-13 08:00:00'
      };

      const result = createShiftSchema.safeParse(invalidShift);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('start_time must be earlier than end_time');
    });

    it('recordOverrunSchema should validate overrun_minutes bounds and accept valid clinical overrun', () => {
      const negativeOverrun = {
        overrun_minutes: -10,
        reason: 'Emergency surgery continued'
      };
      const negResult = recordOverrunSchema.safeParse(negativeOverrun);
      expect(negResult.success).toBe(false);

      const excessiveOverrun = {
        overrun_minutes: 800,
        reason: 'Too long'
      };
      const excessResult = recordOverrunSchema.safeParse(excessiveOverrun);
      expect(excessResult.success).toBe(false);
      expect(excessResult.error.issues[0].message).toContain('Không thể vượt trực quá 12 giờ');

      const validOverrun = {
        overrun_minutes: 120,
        reason: 'Cấp cứu hồi sức ca tai nạn liên hoàn',
        clinical_case_ref: 'BA-2026-099'
      };
      const validResult = recordOverrunSchema.safeParse(validOverrun);
      expect(validResult.success).toBe(true);
      expect(validResult.data.overrun_minutes).toBe(120);
    });

    it('clockInSchema should enforce valid medical clock-in methods', () => {
      const invalidClockIn = {
        staff_id: 'EMP-DOC-001',
        clock_in_method: 'BLUETOOTH_BEACON'
      };
      const res = clockInSchema.safeParse(invalidClockIn);
      expect(res.success).toBe(false);

      const validBiometric = {
        staff_id: 'EMP-DOC-001',
        clock_in_method: 'BIOMETRIC'
      };
      expect(clockInSchema.safeParse(validBiometric).success).toBe(true);

      const validRfid = {
        staff_id: 'EMP-DOC-001',
        clock_in_method: 'RFID_CARD'
      };
      expect(clockInSchema.safeParse(validRfid).success).toBe(true);
    });

    it('submitLeaveSchema should reject start_date > end_date', () => {
      const invalidLeave = {
        staff_id: 'EMP-DOC-001',
        start_date: '2026-10-15',
        end_date: '2026-10-10'
      };

      const result = submitLeaveSchema.safeParse(invalidLeave);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toContain('start_date must be earlier than or equal to end_date');
    });
  });
});
