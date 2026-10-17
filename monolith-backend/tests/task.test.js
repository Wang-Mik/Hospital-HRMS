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

describe('Monolith Task Management Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/tasks', () => {
    it('should create a daily task and return 201', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Daily ICU Rounds',
          description: 'Check ICU bed status and triage summaries',
          assigned_to: 'EMP-DOC-002',
          assigned_by: 'EMP-DOC-001',
          status: 'PENDING',
          due_date: '2026-08-20 12:00:00'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Daily ICU Rounds');
      expect(res.body.data.assigned_to).toBe('EMP-DOC-002');
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should return 400 if title or assigned_to is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          description: 'Missing title and assignee'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Invalid Task',
          assigned_to: 'EMP-DOC-001',
          status: 'INVALID_STATUS'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return list of daily tasks with 200', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Ventilator Inspection',
          assigned_to: 'EMP-DOC-002',
          status: 'PENDING'
        }
      ];

      pool.query.mockResolvedValueOnce([mockTasks]);

      const res = await request(app).get('/api/tasks?assigned_to=EMP-DOC-002');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Ventilator Inspection');
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return single task with 200', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Ventilator Inspection',
        assigned_to: 'EMP-DOC-002',
        status: 'PENDING'
      };

      pool.query.mockResolvedValueOnce([[mockTask]]);

      const res = await request(app).get('/api/tasks/task-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('task-1');
    });

    it('should return 404 if task is not found', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/tasks/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update task and return 200', async () => {
      const existingTask = {
        id: 'task-1',
        title: 'Ventilator Inspection',
        status: 'PENDING'
      };
      const updatedTask = {
        ...existingTask,
        status: 'COMPLETED'
      };

      pool.query
        .mockResolvedValueOnce([[existingTask]])
        .mockResolvedValueOnce([[updatedTask]]);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .patch('/api/tasks/task-1')
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete task and return 200', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).delete('/api/tasks/task-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 if task not found on delete', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const res = await request(app).delete('/api/tasks/non-existent');

      expect(res.status).toBe(404);
    });
  });
});
