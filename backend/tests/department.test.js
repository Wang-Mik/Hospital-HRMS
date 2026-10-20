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

describe('Backend Department Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/departments', () => {
    it('should retrieve all active departments and return 200', async () => {
      const mockDepartments = [
        {
          id: 1,
          department_code: 'DEP-CAPCUU',
          name: 'Khoa Cấp Cứu & Hồi Sức Tim Mạch (Emergency ER)',
          description: 'Đơn vị cấp cứu 24/7',
          location: 'Tòa nhà A - Tầng 1',
          status: 'ACTIVE'
        },
        {
          id: 2,
          department_code: 'DEP-HOISUC',
          name: 'Khoa Hồi Sức Tích Cực & Chống Độc (ICU)',
          description: 'Đơn vị chăm sóc đặc biệt',
          location: 'Tòa nhà A - Tầng 2',
          status: 'ACTIVE'
        }
      ];

      pool.query.mockResolvedValueOnce([mockDepartments]);

      const res = await request(app).get('/api/departments');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].department_code).toBe('DEP-CAPCUU');
    });

    it('should handle errors gracefully and return 500', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database query failure'));

      const res = await request(app).get('/api/departments');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Failed to retrieve departments');
    });
  });

  describe('GET /api/departments/:code', () => {
    it('should retrieve department by code and return 200', async () => {
      const mockDept = {
        id: 1,
        department_code: 'DEP-CAPCUU',
        name: 'Khoa Cấp Cứu & Hồi Sức Tim Mạch (Emergency ER)',
        location: 'Tòa nhà A - Tầng 1',
        status: 'ACTIVE'
      };

      pool.query.mockResolvedValueOnce([[mockDept]]);

      const res = await request(app).get('/api/departments/DEP-CAPCUU');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.department_code).toBe('DEP-CAPCUU');
      expect(res.body.data.name).toContain('Khoa Cấp Cứu');
    });

    it('should return 404 when department not found', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/departments/DEP-NONEXISTENT');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Department not found');
    });
  });

  describe('Route Aliasing: /api/v1/departments', () => {
    it('should return 200 on /api/v1/departments', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/v1/departments');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
