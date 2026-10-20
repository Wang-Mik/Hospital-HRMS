import { randomUUID } from 'crypto';
import pool from '../db.js';

export const notificationService = {
  /**
   * Get notifications for a staff member
   */
  async getNotificationsByStaffId(staffId, filters = {}) {
    const { is_read, type } = filters;
    let sql = `
      SELECT 
        id,
        target_staff_id,
        title,
        message,
        type,
        is_read,
        created_at,
        updated_at
      FROM Notifications
      WHERE target_staff_id = ?
    `;
    const params = [staffId];

    if (is_read !== undefined) {
      sql += ' AND is_read = ?';
      params.push(is_read === 'true' || is_read === true || is_read === '1');
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(id) {
    const sql = 'UPDATE Notifications SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows > 0;
  },

  /**
   * Mark all notifications as read for a staff member
   */
  async markAllAsRead(staffId) {
    const sql = 'UPDATE Notifications SET is_read = TRUE, updated_at = CURRENT_TIMESTAMP WHERE target_staff_id = ? AND is_read = FALSE';
    const [result] = await pool.execute(sql, [staffId]);
    return { success: true, updated_count: result.affectedRows };
  },

  /**
   * Get all hospital notifications (broadcast feed)
   */
  async getAllNotifications(filters = {}) {
    const { type, is_read, limit = 50 } = filters;
    let sql = `
      SELECT 
        n.*,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS target_staff_name,
        e.department_code
      FROM Notifications n
      LEFT JOIN Employees e ON n.target_staff_id = e.employee_code
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      sql += ' AND n.type = ?';
      params.push(type);
    }
    if (is_read !== undefined) {
      sql += ' AND n.is_read = ?';
      params.push(is_read === 'true' || is_read === true || is_read === '1');
    }

    sql += ' ORDER BY n.created_at DESC LIMIT ?';
    params.push(Number(limit));

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Create a notification
   */
  async createNotification(data) {
    const { target_staff_id, title, message, type = 'ANNOUNCEMENT' } = data;
    const notificationId = randomUUID();

    const insertSql = `
      INSERT INTO Notifications (id, target_staff_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?, FALSE)
    `;

    await pool.execute(insertSql, [
      notificationId,
      target_staff_id,
      title,
      message,
      type
    ]);

    return {
      id: notificationId,
      target_staff_id,
      title,
      message,
      type,
      is_read: false
    };
  }
};

export default notificationService;
