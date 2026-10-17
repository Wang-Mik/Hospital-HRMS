import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// Mock database pool
jest.mock('../src/db.js', () => {
  const mockConn = {
    beginTransaction: jest.fn().mockResolvedValue(),
    execute: jest.fn().mockResolvedValue([{ affectedRows: 1 }]),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn()
  };

  return {
    __esModule: true,
    default: {
      query: jest.fn(),
      execute: jest.fn(),
      getConnection: jest.fn().mockResolvedValue(mockConn)
    },
    testConnection: jest.fn().mockResolvedValue(true)
  };
});

import pool from '../src/db.js';
import app from '../src/app.js';

describe('Monolith Shift Handover Routes & Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/handovers', () => {
    it('should create a shift handover with checklists and return 201', async () => {
      const res = await request(app)
        .post('/api/handovers')
        .send({
          outgoing_shift_id: 'shift-1',
          incoming_shift_id: 'shift-2',
          critical_notes: 'All ICU patients stable. Bed 4 CT scan pending.',
          status: 'DRAFT',
          logged_by: 'EMP-DOC-001',
          checklists: [
            { item_description: 'Controlled substances verified', is_verified: true }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.outgoing_shift_id).toBe('shift-1');
      expect(res.body.data.checklists).toHaveLength(1);
    });

    it('should return 400 if outgoing_shift_id or logged_by is missing', async () => {
      const res = await request(app)
        .post('/api/handovers')
        .send({
          critical_notes: 'Missing required fields'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .post('/api/handovers')
        .send({
          outgoing_shift_id: 'shift-1',
          logged_by: 'EMP-DOC-001',
          status: 'INVALID_STATUS'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/handovers', () => {
    it('should return list of handovers with 200', async () => {
      const mockHandovers = [
        {
          id: 'handover-1',
          outgoing_shift_id: 'shift-1',
          status: 'DRAFT',
          logged_by: 'EMP-DOC-001'
        }
      ];

      pool.query.mockResolvedValueOnce([mockHandovers]);

      const res = await request(app).get('/api/handovers?logged_by=EMP-DOC-001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });
  });

  describe('GET /api/handovers/:id', () => {
    it('should return single handover with checklists', async () => {
      const mockHandover = {
        id: 'handover-1',
        outgoing_shift_id: 'shift-1',
        status: 'DRAFT',
        logged_by: 'EMP-DOC-001'
      };
      const mockChecklists = [
        { id: 'chk-1', handover_id: 'handover-1', item_description: 'Equipment check', is_verified: true }
      ];

      pool.query
        .mockResolvedValueOnce([[mockHandover]])
        .mockResolvedValueOnce([mockChecklists]);

      const res = await request(app).get('/api/handovers/handover-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('handover-1');
      expect(res.body.data.checklists).toHaveLength(1);
    });

    it('should return 404 if handover not found', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/handovers/non-existent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/handovers/:id/sign', () => {
    it('should sign and complete handover and return 200', async () => {
      const existing = { id: 'handover-1', status: 'DRAFT' };
      const completed = { id: 'handover-1', status: 'COMPLETED', acknowledged_by: 'EMP-NUR-001' };

      pool.query
        .mockResolvedValueOnce([[existing]])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[completed]])
        .mockResolvedValueOnce([]);

      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/handovers/handover-1/sign')
        .send({ acknowledged_by: 'EMP-NUR-001' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('should return 400 if acknowledged_by is missing', async () => {
      const res = await request(app)
        .post('/api/handovers/handover-1/sign')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/handovers/:id/checklists', () => {
    it('should add checklist item and return 201', async () => {
      const existing = { id: 'handover-1' };
      const newChecklistItem = {
        id: 'chk-2',
        handover_id: 'handover-1',
        item_description: 'Oxygen supply checked',
        is_verified: true
      };

      pool.query
        .mockResolvedValueOnce([[existing]])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[newChecklistItem]]);
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/handovers/handover-1/checklists')
        .send({ item_description: 'Oxygen supply checked', is_verified: true });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item_description).toBe('Oxygen supply checked');
    });
  });

  describe('DELETE /api/handovers/:id', () => {
    it('should delete handover and return 200', async () => {
      pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app).delete('/api/handovers/handover-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
