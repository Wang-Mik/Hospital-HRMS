import { randomUUID } from 'crypto';
import pool from '../db.js';

function normalizeDateTime(d) {
  if (!d) return null;
  if (typeof d === 'string') {
    const s = d.replace('T', ' ').trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) {
      return s.length === 16 ? `${s}:00` : s;
    }
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export const taskService = {
  /**
   * Create a new daily task
   */
  async createTask(data) {
    const {
      title,
      description = null,
      assigned_to,
      assigned_by = null,
      shift_id = null,
      status = 'PENDING',
      due_date = null
    } = data;

    const taskId = randomUUID();
    const formattedDueDate = normalizeDateTime(due_date);

    const insertSql = `
      INSERT INTO Daily_Tasks (
        id, title, description, assigned_to, assigned_by, shift_id, status, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      taskId,
      title,
      description,
      assigned_to,
      assigned_by,
      shift_id,
      status,
      formattedDueDate
    ]);

    return {
      id: taskId,
      title,
      description,
      assigned_to,
      assigned_by,
      shift_id,
      status,
      due_date: formattedDueDate
    };
  },

  /**
   * Retrieve all tasks matching query filters
   */
  async getAllTasks(filters = {}) {
    const { assigned_to, assigned_by, shift_id, status, date } = filters;
    let sql = `
      SELECT 
        t.*,
        CONCAT(ea.last_name, ' ', ea.first_name) AS assigned_to_name,
        ea.role AS assigned_to_role,
        CONCAT(eb.last_name, ' ', eb.first_name) AS assigned_by_name,
        eb.role AS assigned_by_role,
        s.shift_type,
        s.department_code
      FROM Daily_Tasks t
      LEFT JOIN Employees ea ON t.assigned_to = ea.employee_code
      LEFT JOIN Employees eb ON t.assigned_by = eb.employee_code
      LEFT JOIN Shifts s ON t.shift_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (assigned_to) {
      sql += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }
    if (assigned_by) {
      sql += ' AND t.assigned_by = ?';
      params.push(assigned_by);
    }
    if (shift_id) {
      sql += ' AND t.shift_id = ?';
      params.push(shift_id);
    }
    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    if (date) {
      sql += ' AND (DATE(t.due_date) = ? OR DATE(t.created_at) = ?)';
      params.push(date, date);
    }

    sql += ' ORDER BY t.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Retrieve a single task by its unique ID
   */
  async getTaskById(id) {
    const sql = `
      SELECT 
        t.*,
        CONCAT(ea.last_name, ' ', ea.first_name) AS assigned_to_name,
        ea.role AS assigned_to_role,
        CONCAT(eb.last_name, ' ', eb.first_name) AS assigned_by_name,
        eb.role AS assigned_by_role,
        s.shift_type,
        s.department_code
      FROM Daily_Tasks t
      LEFT JOIN Employees ea ON t.assigned_to = ea.employee_code
      LEFT JOIN Employees eb ON t.assigned_by = eb.employee_code
      LEFT JOIN Shifts s ON t.shift_id = s.id
      WHERE t.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Update an existing task by ID
   */
  async updateTask(id, updateData) {
    const existing = await this.getTaskById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];

    if (updateData.title !== undefined) {
      fields.push('title = ?');
      params.push(updateData.title);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      params.push(updateData.description);
    }
    if (updateData.assigned_to !== undefined) {
      fields.push('assigned_to = ?');
      params.push(updateData.assigned_to);
    }
    if (updateData.assigned_by !== undefined) {
      fields.push('assigned_by = ?');
      params.push(updateData.assigned_by);
    }
    if (updateData.shift_id !== undefined) {
      fields.push('shift_id = ?');
      params.push(updateData.shift_id);
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      params.push(updateData.status);
    }
    if (updateData.due_date !== undefined) {
      fields.push('due_date = ?');
      params.push(normalizeDateTime(updateData.due_date));
    }

    if (fields.length === 0) {
      return existing;
    }

    params.push(id);
    const sql = `UPDATE Daily_Tasks SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(sql, params);

    return this.getTaskById(id);
  },

  /**
   * Delete a task by ID
   */
  async deleteTask(id) {
    const [result] = await pool.execute('DELETE FROM Daily_Tasks WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

export default taskService;
