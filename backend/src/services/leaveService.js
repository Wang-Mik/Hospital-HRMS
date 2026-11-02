import { randomUUID } from 'crypto';
import pool from '../db.js';
import auditService from './auditService.js';

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
    const { status, leave_type, staff_id, department_code } = filters;
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
    if (department_code) {
      sql += ' AND e.department_code = ?';
      params.push(department_code);
    }

    sql += ' ORDER BY lr.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Update leave request status (DEPT_APPROVED / APPROVED / REJECTED)
   * 2-Step clinical workflow:
   * 1. DEPARTMENT_HEAD approves staff in their own department -> DEPT_APPROVED (or REJECTED)
   * 2. HR_MANAGER confirms request -> APPROVED (deducts Leave_Balances quota) (or REJECTED)
   */
  async updateLeaveRequestStatus(id, { status }, actor = {}) {
    const validStatuses = ['PENDING', 'DEPT_APPROVED', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const [existing] = await pool.query(`
      SELECT 
        lr.*,
        e.department_code,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name
      FROM Leave_Requests lr
      LEFT JOIN Employees e ON lr.staff_id = e.employee_code
      WHERE lr.id = ?
    `, [id]);

    if (existing.length === 0) {
      const err = new Error(`Leave request with id ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }

    const leaveReq = existing[0];
    const prevStatus = leaveReq.status;

    // Role-based clinical workflow validation
    if (actor && actor.role) {
      if (actor.role === 'DEPARTMENT_HEAD') {
        // Department Head can only review requests from their own department
        if (actor.department_code && leaveReq.department_code && actor.department_code !== leaveReq.department_code) {
          const err = new Error('Trưởng khoa chỉ có quyền xét duyệt đơn nghỉ phép của nhân sự thuộc khoa của mình.');
          err.statusCode = 403;
          throw err;
        }

        // Department Head can only set DEPT_APPROVED or REJECTED
        if (status !== 'DEPT_APPROVED' && status !== 'REJECTED') {
          const err = new Error('Trưởng khoa chỉ có thẩm quyền Phê Duyệt Cấp Khoa (DEPT_APPROVED) hoặc Từ Chối (REJECTED). Việc xác nhận hồ sơ vào quỹ viện do HR thực hiện.');
          err.statusCode = 403;
          throw err;
        }
      } else if (actor.role === 'HR_MANAGER' || actor.role === 'SUPER_ADMIN') {
        // HR / Executive can confirm (APPROVED) or reject (REJECTED)
        // HR can also set DEPT_APPROVED if assisting
      } else {
        const err = new Error('Chỉ Trưởng khoa lâm sàng hoặc Phòng Nhân Sự mới có thẩm quyền xét duyệt đơn nghỉ phép.');
        err.statusCode = 403;
        throw err;
      }
    }

    await pool.query('UPDATE Leave_Requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);

    // If approving officially (APPROVED), increase used_days in Leave_Balances
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

    // Determine audit action name
    let auditAction = 'UPDATE_LEAVE_STATUS';
    if (status === 'DEPT_APPROVED') {
      auditAction = 'DEPT_APPROVE_LEAVE';
    } else if (status === 'APPROVED') {
      auditAction = 'HR_CONFIRM_LEAVE';
    } else if (status === 'REJECTED') {
      auditAction = 'REJECT_LEAVE';
    }

    // Audit Logging
    await auditService.logAudit({
      actor_id: actor.employee_code || actor.username || 'HR_OFFICE',
      actor_name: actor.staff_name || actor.name || actor.username || (actor.role === 'DEPARTMENT_HEAD' ? 'Trưởng Khoa Lâm Sàng' : 'Phòng Nhân Sự'),
      action: auditAction,
      resource_type: 'LEAVE_REQUEST',
      resource_id: id,
      old_values: { status: prevStatus, staff_id: leaveReq.staff_id, days: daysDeduction },
      new_values: { status: status, staff_id: leaveReq.staff_id, days: daysDeduction },
      ip_address: actor.ip || null
    });

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
        lb.id,
        lb.staff_id,
        lb.accrual_year,
        lb.leave_type,
        lb.total_days,
        lb.used_days,
        (lb.total_days - lb.used_days) AS remaining_days,
        lb.created_at,
        lb.updated_at
      FROM Leave_Balances lb
      LEFT JOIN Employees e ON lb.staff_id = e.employee_code
      WHERE lb.staff_id = ?
      AND NOT (e.gender = 'MALE' AND lb.leave_type = 'MATERNITY')
    `;
    const params = [staffId];

    if (year) {
      sql += ' AND lb.accrual_year = ?';
      params.push(year);
    }

    sql += ' ORDER BY lb.leave_type ASC';
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
