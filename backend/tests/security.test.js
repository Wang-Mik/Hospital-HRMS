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
import { authService } from '../src/services/authService.js';
import bcrypt from 'bcryptjs';

const TEST_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-at-least-32-chars-long';

function makeToken(payload, options = {}) {
  return jwt.sign(payload, TEST_SECRET, { expiresIn: '1h', ...options });
}

describe('Hospital HRMS Web Security & Hardening Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Broken Access Control & Authentication Defense (OWASP A01 & A07)', () => {
    it('should reject unauthenticated access to /api/admin/accounts with 401', async () => {
      const res = await request(app)
        .get('/api/admin/accounts')
        .set('x-enforce-auth', 'true');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Yêu cầu đăng nhập/);
    });

    it('should reject unauthenticated access to /api/payroll/runs with 401', async () => {
      const res = await request(app)
        .get('/api/payroll/runs')
        .set('x-enforce-auth', 'true');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated access to /api/employees with 401', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('x-enforce-auth', 'true');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated access to /api/handovers with 401', async () => {
      const res = await request(app)
        .get('/api/handovers')
        .set('x-enforce-auth', 'true');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should prevent x-staff-id header spoofing backdoor and return 401', async () => {
      const res = await request(app)
        .get('/api/admin/accounts')
        .set('x-enforce-auth', 'true')
        .set('x-staff-id', 'EMP-DOC-001');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Role-Based Access Control (RBAC) & Privilege Escalation Defense', () => {
    it('should deny STAFF access to admin endpoints with 403 Forbidden', async () => {
      const staffToken = makeToken({
        account_id: 'acc-staff',
        role: 'STAFF',
        employee_code: 'EMP-STF-001'
      });

      const res = await request(app)
        .get('/api/admin/accounts')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Quyền truy cập bị từ chối/);
    });

    it('should deny NURSE from modifying account roles with 403 Forbidden', async () => {
      const nurseToken = makeToken({
        account_id: 'acc-nurse',
        role: 'NURSE',
        employee_code: 'EMP-NUR-001'
      });

      const res = await request(app)
        .patch('/api/admin/accounts/1/role')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ role_code: 'SUPER_ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow SUPER_ADMIN access to /api/admin/accounts with 200 OK', async () => {
      const adminToken = makeToken({
        account_id: 'acc-admin',
        role: 'SUPER_ADMIN',
        employee_code: 'EMP-ADM-001'
      });

      pool.query.mockResolvedValueOnce([
        [
          { id: 'acc-1', username: 'admin', role_code: 'SUPER_ADMIN', is_locked: 0 }
        ]
      ]);

      const res = await request(app)
        .get('/api/admin/accounts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Cryptographic Token Verification & Integrity', () => {
    it('should reject tampered or corrupted JWT tokens with 403 Forbidden', async () => {
      const validToken = makeToken({ role: 'SUPER_ADMIN' });
      const tamperedToken = validToken.slice(0, -6) + 'xxxxxx';

      const res = await request(app)
        .get('/api/admin/accounts')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/hết hạn hoặc mã xác thực không hợp lệ/);
    });

    it('should reject expired JWT tokens with 403 Forbidden', async () => {
      const expiredToken = makeToken({ role: 'SUPER_ADMIN' }, { expiresIn: '-1s' });

      const res = await request(app)
        .get('/api/admin/accounts')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should verify issued tokens have exactly 3 hours lifetime per user directive', async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      pool.query
        // 1. Account lookup
        .mockResolvedValueOnce([
          [
            {
              id: 'acc-doc-1',
              employee_id: 1,
              username: 'dr.minh',
              password_hash: hashedPassword,
              is_locked: 0,
              role_code: 'DOCTOR',
              employee_code: 'EMP-DOC-001'
            }
          ]
        ])
        // 2. Last login update
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        // 3. Permissions query
        .mockResolvedValueOnce([[{ permission_code: 'SHIFT_VIEW' }]]);

      const result = await authService.login({
        username: 'dr.minh',
        password: 'TestPass123!'
      });

      expect(result).toHaveProperty('token');
      const decoded = jwt.decode(result.token);
      expect(decoded).toBeTruthy();
      // Difference between exp and iat must be exactly 3 hours (3 * 3600 = 10800 seconds)
      const tokenLifetimeSeconds = decoded.exp - decoded.iat;
      expect(tokenLifetimeSeconds).toBe(3 * 3600);
    });
  });

  describe('4. HTTP Security Headers & Express Hardening (Helmet & Fingerprint)', () => {
    it('should set X-Content-Type-Options: nosniff header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options: SAMEORIGIN header to prevent Clickjacking', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should NOT disclose X-Powered-By header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('5. Rate Limiting Protection on Authentication', () => {
    it('should provide standard rate limit headers on /api/auth/login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'bad' });

      // Check standard RateLimit headers
      expect(
        res.headers['ratelimit-limit'] !== undefined ||
        res.headers['x-ratelimit-limit'] !== undefined
      ).toBe(true);
    });
  });

  describe('6. Cross-Origin Resource Sharing (CORS) Security & Cloud Policy', () => {
    it('should permit CORS requests from official production domain https://hospital-hrms.vercel.app', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://hospital-hrms.vercel.app')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBe('https://hospital-hrms.vercel.app');
      expect(res.status).toBe(204);
    });

    it('should permit CORS requests from Vercel preview deployments', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://hospital-hrms-preview-branch.vercel.app')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBe('https://hospital-hrms-preview-branch.vercel.app');
      expect(res.status).toBe(204);
    });

    it('should block CORS requests from unauthorized origin with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-hospital-phishing.com');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CORS');
    });
  });
});
