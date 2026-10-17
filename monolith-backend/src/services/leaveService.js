import { randomUUID } from 'crypto';
import pool from '../db.js';

export const leaveService = {
  /**
   * Submit leave request
   */
  async submitLeaveRequest(data) {
    const {
      staff_id,
      start_date,
      end_date,
      leave_type = 'ANNUAL',
      reason = null,
      day_part = 'FULL',
      days_requested = null
    } = data;

    const leaveId = randomUUID();
    const formattedStartDate = start_date.includes('T') ? start_date.split('T')[0] : start_date;
    const formattedEndDate = end_date.includes('T') ? end_date.split('T')[0] : end_date;
    const status = 'PENDING';

    const finalDayPart = ['FIRST_HALF', 'SECOND_HALF', 'MORNING', 'AFTERNOON'].includes(day_part)
      ? (day_part === 'MORNING' ? 'FIRST_HALF' : day_part === 'AFTERNOON' ? 'SECOND_HALF' : day_part)
      : 'FULL';

    const finalDays = days_requested !== null && days_requested !== undefined
      ? Number(days_requested)
      : (finalDayPart !== 'FULL' ? 0.5 : 1.0);

    const insertSql = `
      INSERT INTO Leave_Requests (
        id, staff_id, start_date, end_date, leave_type, status, reason, day_part, days_requested
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      leaveId,
      staff_id,
      formattedStartDate,
      formattedEndDate,
      leave_type,
      status,
      reason,
      finalDayPart,
      finalDays
    ]);

    return {
      id: leaveId,
      staff_id,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      leave_type,
      status,
      reason,
      day_part: finalDayPart,
      days_requested: finalDays
    };
  },

  /**
   * Get leave history for a staff member
   */
  async getLeaveHistory(staffId) {
    const sql = `
      SELECT 
        id,
        staff_id,
        start_date,
        end_date,
        leave_type,
        status,
        reason,
        day_part,
        days_requested,
        created_at,
        updated_at
      FROM Leave_Requests
      WHERE staff_id = ?
      ORDER BY start_date DESC, created_at DESC
    `;
    const [rows] = await pool.query(sql, [staffId]);
    return rows;
  },

  /**
   * Get all leave requests with filters
   */
  async getAllLeaveRequests(filters = {}) {
    const { status, leave_type, staff_id } = filters;
    let sql = `
      SELECT 
        lr.*,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name,
        e.department_code,
        d.name AS department_name,
        e.role,
        e.avatar_url
      FROM Leave_Requests lr
      LEFT JOIN Employees e ON lr.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND lr.status = ?';
      params.push(status);
    }
    if (leave_type) {
      sql += ' AND lr.leave_type = ?';
      params.push(leave_type);
    }
    if (staff_id) {
      sql += ' AND lr.staff_id = ?';
      params.push(staff_id);
    }

    sql += ' ORDER BY lr.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Update leave request status (APPROVE / REJECT) and deduct leave quota accordingly
   */
  async updateLeaveRequestStatus(id, { status }) {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const [existing] = await pool.query('SELECT * FROM Leave_Requests WHERE id = ?', [id]);
    if (existing.length === 0) {
      const err = new Error(`Leave request with id ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }

    const leaveReq = existing[0];
    const prevStatus = leaveReq.status;

    await pool.query('UPDATE Leave_Requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);

    // If approving, increase used_days in Leave_Balances
    const daysDeduction = Number(leaveReq.days_requested || (leaveReq.day_part !== 'FULL' ? 0.5 : 1.0));
    const year = new Date(leaveReq.start_date).getFullYear();

    if (status === 'APPROVED' && prevStatus !== 'APPROVED') {
      await pool.query(
        `UPDATE Leave_Balances 
         SET used_days = used_days + ? 
         WHERE staff_id = ? AND accrual_year = ? AND leave_type = ?`,
        [daysDeduction, leaveReq.staff_id, year, leaveReq.leave_type]
      );
    } else if (prevStatus === 'APPROVED' && status !== 'APPROVED') {
      await pool.query(
        `UPDATE Leave_Balances 
         SET used_days = GREATEST(0, used_days - ?) 
         WHERE staff_id = ? AND accrual_year = ? AND leave_type = ?`,
        [daysDeduction, leaveReq.staff_id, year, leaveReq.leave_type]
      );
    }

    const [updated] = await pool.query(`
      SELECT 
        lr.*,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name,
        e.department_code,
        d.name AS department_name,
        e.role,
        e.avatar_url
      FROM Leave_Requests lr
      LEFT JOIN Employees e ON lr.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE lr.id = ?
    `, [id]);

    return updated[0];
  },

  /**
   * Get leave balances for staff by year or across all years
   */
  async getLeaveBalances(staffId, year = null) {
    let sql = `
      SELECT 
        id,
        staff_id,
        accrual_year,
        leave_type,
        total_days,
        used_days,
        (total_days - used_days) AS remaining_days,
        created_at,
        updated_at
      FROM Leave_Balances
      WHERE staff_id = ?
    `;
    const params = [staffId];

    if (year) {
      sql += ' AND accrual_year = ?';
      params.push(year);
    }

    sql += ' ORDER BY leave_type ASC';
    const [rows] = await pool.query(sql, params);
    return rows.map((r) => ({
      ...r,
      total_days: Number(r.total_days),
      used_days: Number(r.used_days),
      remaining_days: Number(r.remaining_days)
    }));
  },

  /**
   * Set or update leave balance
   */
  async setLeaveBalance(data) {
    const { staff_id, accrual_year, leave_type = 'ANNUAL', total_days, used_days = 0 } = data;
    const balanceId = randomUUID();

    const sql = `
      INSERT INTO Leave_Balances (id, staff_id, accrual_year, leave_type, total_days, used_days)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        total_days = VALUES(total_days),
        used_days = VALUES(used_days),
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.query(sql, [balanceId, staff_id, accrual_year, leave_type, total_days, used_days]);

    return {
      id: balanceId,
      staff_id,
      accrual_year,
      leave_type,
      total_days: Number(total_days),
      used_days: Number(used_days),
      remaining_days: Number(total_days) - Number(used_days)
    };
  }
};

export default leaveService;
