import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
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

describe('Backend Authentication & Account Management Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should create an account, hash the password with bcrypt, and return 201', async () => {
      const mockEmployee = {
        id: 1,
        employee_code: 'EMP-DOC-001',
        first_name: 'Alexander',
        last_name: 'Wright',
        email: 'dr.wright@hospital.org',
        role: 'DEPARTMENT_HEAD'
      };

      // 1. Employee exists check
      pool.query
        .mockResolvedValueOnce([[mockEmployee]]) // Employee check
        .mockResolvedValueOnce([[]]); // Existing username check (none)

      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const rawPassword = 'StrongPassword2026!';
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          employee_id: 1,
          username: 'dr.wright',
          password: rawPassword
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('dr.wright');
      expect(res.body.data.employee_id).toBe(1);
      expect(res.body.data.password_hash).toBeUndefined(); // Password hash not leaked

      // Verify that pool.execute was called and received a valid bcrypt hash
      expect(pool.execute).toHaveBeenCalledTimes(1);
      const executeArgs = pool.execute.mock.calls[0][1];
      const insertedHash = executeArgs[4];

      expect(insertedHash).not.toBe(rawPassword);
      const isBcryptMatch = await bcrypt.compare(rawPassword, insertedHash);
      expect(isBcryptMatch).toBe(true);
    });

    it('should enforce physical foreign key constraint if employee does not exist', async () => {
      // Return empty array to simulate non-existent employee
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          employee_id: 99999,
          username: 'ghost.user',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Foreign key constraint violation');
      expect(pool.execute).not.toHaveBeenCalled();
    });

    it('should enforce database-level foreign key constraint error (ER_NO_REFERENCED_ROW_2)', async () => {
      const mockEmployee = { id: 2, employee_code: 'EMP-NUR-001' };

      pool.query
        .mockResolvedValueOnce([[mockEmployee]])
        .mockResolvedValueOnce([[]]);

      const fkDbError = new Error('Cannot add or update a child row: a foreign key constraint fails');
      fkDbError.code = 'ER_NO_REFERENCED_ROW_2';
      pool.execute.mockRejectedValueOnce(fkDbError);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          employee_id: 2,
          username: 'nurse.sarah',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Foreign key constraint violation');
    });

    it('should reject registration if username already exists (409 Conflict)', async () => {
      const mockEmployee = { id: 1, employee_code: 'EMP-DOC-001' };

      pool.query
        .mockResolvedValueOnce([[mockEmployee]]) // Employee check passes
        .mockResolvedValueOnce([[{ id: 'existing-uuid', username: 'dr.wright' }]]); // Username taken

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          employee_id: 1,
          username: 'dr.wright',
          password: 'NewPassword2026!'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already taken');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'missing_fields'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('mandatory');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate valid credentials and return a signed JWT token', async () => {
      const rawPassword = 'ValidPassword2026!';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const mockAccountWithEmployee = {
        id: 'acc-uuid-123',
        employee_id: 1,
        username: 'dr.wright',
        password_hash: hashedPassword,
        is_locked: false,
        last_login: null,
        employee_code: 'EMP-DOC-001',
        first_name: 'Alexander',
        last_name: 'Wright',
        email: 'dr.wright@hospital.org',
        role: 'DEPARTMENT_HEAD'
      };

      pool.query
        .mockResolvedValueOnce([[mockAccountWithEmployee]]) // Find account
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update last_login

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'dr.wright',
          password: rawPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.account.username).toBe('dr.wright');
      expect(res.body.data.employee.employee_code).toBe('EMP-DOC-001');

      // Verify secure HttpOnly cookie is attached
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('token=');
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(res.headers['set-cookie'][0]).toContain('SameSite=Lax');

      // Verify JWT token validity and claims
      const secret = process.env.JWT_SECRET || 'hospital-hrms-backend-secret-key-2026';
      const decoded = jwt.verify(res.body.data.token, secret);
      expect(decoded.account_id).toBe('acc-uuid-123');
      expect(decoded.username).toBe('dr.wright');
      expect(decoded.employee_code).toBe('EMP-DOC-001');
      expect(decoded.role).toBe('DEPARTMENT_HEAD');

      // Verify last_login update query
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE Accounts SET last_login = NOW()'),
        ['acc-uuid-123']
      );
    });

    it('should reject login with 401 when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword!', 10);

      const mockAccount = {
        id: 'acc-uuid-123',
        employee_id: 1,
        username: 'dr.wright',
        password_hash: hashedPassword,
        is_locked: false
      };

      pool.query.mockResolvedValueOnce([[mockAccount]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'dr.wright',
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should reject login with 401 when account username does not exist', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent.user',
          password: 'AnyPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid credentials');
    });

    it('should reject login with 403 when account is locked', async () => {
      const hashedPassword = await bcrypt.hash('Password2026!', 10);

      const mockLockedAccount = {
        id: 'acc-uuid-locked',
        employee_id: 3,
        username: 'locked.user',
        password_hash: hashedPassword,
        is_locked: true
      };

      pool.query.mockResolvedValueOnce([[mockLockedAccount]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'locked.user',
          password: 'Password2026!'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('locked');
    });

    it('should return 400 if username or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'only_username' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Route Aliasing: /api/v1/auth', () => {
    it('should route /api/v1/auth/login identically to /api/auth/login', async () => {
      const rawPassword = 'ValidPassword2026!';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const mockAccountWithEmployee = {
        id: 'acc-uuid-v1',
        employee_id: 1,
        username: 'dr.wright',
        password_hash: hashedPassword,
        is_locked: false,
        employee_code: 'EMP-DOC-001',
        first_name: 'Alexander',
        last_name: 'Wright',
        email: 'dr.wright@hospital.org',
        role: 'DEPARTMENT_HEAD'
      };

      pool.query
        .mockResolvedValueOnce([[mockAccountWithEmployee]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'dr.wright',
          password: rawPassword
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });
});
