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

describe('Monolith Notification Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/notifications/:staff_id', () => {
    it('should return notifications list for staff member', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          target_staff_id: 'EMP-DOC-001',
          title: 'Shift Assignment',
          message: 'You have a new shift assigned',
          type: 'ANNOUNCEMENT',
          is_read: false
        }
      ];

      pool.query.mockResolvedValueOnce([mockNotifications]);

      const res = await request(app).get('/api/notifications/EMP-DOC-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.target_staff_id).toBe('EMP-DOC-001');
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark notification as read and return 200', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).patch('/api/notifications/notif-1/read');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.is_read).toBe(true);
    });

    it('should return 404 if notification not found', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const res = await request(app).patch('/api/notifications/non-existent/read');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/notifications', () => {
    it('should create notification and return 201', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/notifications')
        .send({
          target_staff_id: 'EMP-DOC-001',
          title: 'Urgent Staff Meeting',
          message: 'All department heads attend tomorrow at 08:00 AM.',
          type: 'ALERT'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.target_staff_id).toBe('EMP-DOC-001');
      expect(res.body.data.type).toBe('ALERT');
    });

    it('should return 400 for invalid notification type', async () => {
      const res = await request(app)
        .post('/api/notifications')
        .send({
          target_staff_id: 'EMP-DOC-001',
          title: 'Urgent',
          message: 'Test',
          type: 'INVALID_TYPE'
        });

      expect(res.status).toBe(400);
    });
  });
});
