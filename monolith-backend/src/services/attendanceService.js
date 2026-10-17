import { randomUUID } from 'crypto';
import pool from '../db.js';

function normalizeDateTime(d) {
  if (!d) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
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

function parseTimestamp(d) {
  if (!d) return Date.now();
  if (d instanceof Date) return d.getTime();
  if (typeof d === 'string') {
    const s = d.includes('T') ? d : d.replace(' ', 'T');
    return new Date(s).getTime();
  }
  return new Date(d).getTime();
}

export const attendanceService = {
  /**
   * Record clock-in for a staff member
   */
  async clockIn(data) {
    const {
      staff_id,
      shift_id = null,
      clock_in_method = 'KIOSK_TERMINAL',
      clock_in_time = null
    } = data;

    const formattedClockIn = normalizeDateTime(clock_in_time);
    const clockInTimestamp = parseTimestamp(clock_in_time || formattedClockIn);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      let attendanceStatus = 'PRESENT';

      if (shift_id) {
        const [shiftRows] = await connection.query(
          'SELECT * FROM Shifts WHERE id = ? LIMIT 1',
          [shift_id]
        );

        if (shiftRows.length === 0) {
          await connection.rollback();
          const err = new Error(`Scheduled shift not found with ID: ${shift_id}`);
          err.statusCode = 404;
          throw err;
        }

        const shift = shiftRows[0];

        if (shift.staff_id !== staff_id) {
          await connection.rollback();
          const err = new Error(`Staff ID ${staff_id} is not assigned to shift ${shift_id} (assigned to ${shift.staff_id}).`);
          err.statusCode = 403;
          throw err;
        }

        const shiftStartTimestamp = parseTimestamp(shift.start_time);
        const lateThresholdMs = 15 * 60 * 1000;
        if (clockInTimestamp > shiftStartTimestamp + lateThresholdMs) {
          attendanceStatus = 'LATE';
        }

        await connection.execute(
          'UPDATE Shifts SET status = "IN_PROGRESS", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [shift_id]
        );
      }

      // Check open session
      const [openAttendances] = await connection.query(
        'SELECT id, clock_in_time, shift_id FROM Attendances WHERE staff_id = ? AND clock_out_time IS NULL LIMIT 1',
        [staff_id]
      );

      if (openAttendances.length > 0) {
        await connection.rollback();
        const err = new Error(`Staff ${staff_id} already has an active clock-in session without clock-out (Attendance ID: ${openAttendances[0].id}).`);
        err.statusCode = 409;
        err.active_attendance = openAttendances[0];
        throw err;
      }

      const attendanceId = randomUUID();
      const insertSql = `
        INSERT INTO Attendances (
          id, shift_id, staff_id, clock_in_time, clock_in_method, attendance_status, overtime_minutes
        ) VALUES (?, ?, ?, ?, ?, ?, 0)
      `;

      await connection.execute(insertSql, [
        attendanceId,
        shift_id,
        staff_id,
        formattedClockIn,
        clock_in_method,
        attendanceStatus
      ]);

      await connection.commit();

      return {
        id: attendanceId,
        shift_id,
        staff_id,
        clock_in_time: formattedClockIn,
        clock_out_time: null,
        clock_in_method,
        attendance_status: attendanceStatus,
        overtime_minutes: 0,
        handover_notes: null
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Record clock-out, calculate overtime, and update shift
   */
  async clockOut(id, data = {}) {
    const { clock_out_time = null, handover_notes = null } = data;
    const formattedClockOut = normalizeDateTime(clock_out_time);
    const clockOutTimestamp = parseTimestamp(clock_out_time || formattedClockOut);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT a.*, s.end_time AS shift_end_time 
         FROM Attendances a 
         LEFT JOIN Shifts s ON a.shift_id = s.id 
         WHERE a.id = ? LIMIT 1`,
        [id]
      );

      if (rows.length === 0) {
        await connection.rollback();
        const err = new Error(`Attendance record not found with ID: ${id}`);
        err.statusCode = 404;
        throw err;
      }

      const attendance = rows[0];

      if (attendance.clock_out_time) {
        await connection.rollback();
        const err = new Error(`Attendance record ${id} has already been clocked out at ${attendance.clock_out_time}.`);
        err.statusCode = 400;
        throw err;
      }

      let overtimeMinutes = 0;
      let finalStatus = attendance.attendance_status;

      if (attendance.shift_end_time) {
        const shiftEndTimestamp = parseTimestamp(attendance.shift_end_time);
        if (clockOutTimestamp > shiftEndTimestamp) {
          const diffMs = clockOutTimestamp - shiftEndTimestamp;
          overtimeMinutes = Math.floor(diffMs / (1000 * 60));
          if (overtimeMinutes >= 30 && finalStatus === 'PRESENT') {
            finalStatus = 'OVERTIME';
          }
        }
      }

      const updateSql = `
        UPDATE Attendances 
        SET clock_out_time = ?, 
            attendance_status = ?, 
            overtime_minutes = ?, 
            handover_notes = ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await connection.execute(updateSql, [
        formattedClockOut,
        finalStatus,
        overtimeMinutes,
        handover_notes || attendance.handover_notes,
        id
      ]);

      if (attendance.shift_id) {
        await connection.execute(
          'UPDATE Shifts SET status = "COMPLETED", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [attendance.shift_id]
        );
      }

      await connection.commit();

      return {
        id,
        shift_id: attendance.shift_id,
        staff_id: attendance.staff_id,
        clock_in_time: attendance.clock_in_time,
        clock_out_time: formattedClockOut,
        attendance_status: finalStatus,
        overtime_minutes: overtimeMinutes,
        handover_notes: handover_notes || attendance.handover_notes
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Get all attendances with filters
   */
  async getAllAttendances(filters = {}) {
    const { staff_id, shift_id, status, date } = filters;
    let sql = `
      SELECT 
        a.id,
        a.shift_id,
        a.staff_id,
        CONCAT(e.last_name, ' ', e.first_name) AS staff_name,
        e.role AS staff_role,
        a.clock_in_time,
        a.clock_out_time,
        a.clock_in_method,
        a.attendance_status,
        a.overtime_minutes,
        a.handover_notes,
        a.created_at,
        a.updated_at,
        s.shift_type,
        s.start_time AS scheduled_start,
        s.end_time AS scheduled_end
      FROM Attendances a
      LEFT JOIN Employees e ON a.staff_id = e.employee_code
      LEFT JOIN Shifts s ON a.shift_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (staff_id) {
      sql += ' AND a.staff_id = ?';
      params.push(staff_id);
    }
    if (shift_id) {
      sql += ' AND a.shift_id = ?';
      params.push(shift_id);
    }
    if (status) {
      sql += ' AND a.attendance_status = ?';
      params.push(status);
    }
    if (date) {
      sql += ' AND DATE(a.clock_in_time) = ?';
      params.push(date);
    }

    sql += ' ORDER BY a.clock_in_time DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Get attendance record by ID
   */
  async getAttendanceById(id) {
    const sql = `
      SELECT 
        a.*,
        CONCAT(e.last_name, ' ', e.first_name) AS staff_name,
        e.role AS staff_role,
        s.shift_type,
        s.start_time AS scheduled_start,
        s.end_time AS scheduled_end,
        s.requires_handover
      FROM Attendances a
      LEFT JOIN Employees e ON a.staff_id = e.employee_code
      LEFT JOIN Shifts s ON a.shift_id = s.id
      WHERE a.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }
};

export default attendanceService;
