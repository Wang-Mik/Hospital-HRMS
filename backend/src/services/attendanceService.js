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
      let effectiveShiftId = shift_id || null;
      let targetShift = null;

      if (effectiveShiftId) {
        const [shiftRows] = await connection.query(
          'SELECT * FROM Shifts WHERE id = ? LIMIT 1',
          [effectiveShiftId]
        );

        if (shiftRows.length === 0) {
          await connection.rollback();
          const err = new Error(`Scheduled shift not found with ID: ${effectiveShiftId}`);
          err.statusCode = 404;
          throw err;
        }

        targetShift = shiftRows[0];

        if (targetShift.staff_id !== staff_id) {
          await connection.rollback();
          const err = new Error(`Staff ID ${staff_id} is not assigned to shift ${effectiveShiftId} (assigned to ${targetShift.staff_id}).`);
          err.statusCode = 403;
          throw err;
        }
      } else {
        // Auto-match nearest scheduled or emergency/on-call shift around clockInTime (+/- 3 hours)
        const [matchedShifts] = await connection.query(
          `SELECT * FROM Shifts 
           WHERE staff_id = ? 
             AND status IN ('SCHEDULED', 'IN_PROGRESS', 'ON_CALL', 'EMERGENCY_ACTIVE')
             AND start_time <= DATE_ADD(?, INTERVAL 3 HOUR)
             AND end_time >= DATE_SUB(?, INTERVAL 3 HOUR)
           ORDER BY FIELD(status, 'EMERGENCY_ACTIVE', 'ON_CALL', 'SCHEDULED', 'IN_PROGRESS') ASC,
                    ABS(TIMESTAMPDIFF(MINUTE, start_time, ?)) ASC
           LIMIT 1`,
          [staff_id, formattedClockIn, formattedClockIn, formattedClockIn]
        );
        if (matchedShifts.length > 0) {
          targetShift = matchedShifts[0];
          effectiveShiftId = targetShift.id;
        }
      }

      if (targetShift) {
        const shiftStartTimestamp = parseTimestamp(targetShift.start_time);
        const lateThresholdMs = 15 * 60 * 1000;
        const isEmergencyOrOnCall =
          targetShift.shift_type === 'ON_CALL' ||
          targetShift.shift_type === 'EMERGENCY_COVER' ||
          targetShift.status === 'ON_CALL' ||
          targetShift.status === 'EMERGENCY_ACTIVE';

        if (!isEmergencyOrOnCall && clockInTimestamp > shiftStartTimestamp + lateThresholdMs) {
          attendanceStatus = 'LATE';
        }

        const nextShiftStatus =
          targetShift.status === 'EMERGENCY_ACTIVE' || targetShift.shift_type === 'EMERGENCY_COVER'
            ? 'EMERGENCY_ACTIVE'
            : 'IN_PROGRESS';

        await connection.execute(
          'UPDATE Shifts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [nextShiftStatus, targetShift.id]
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
        effectiveShiftId,
        staff_id,
        formattedClockIn,
        clock_in_method,
        attendanceStatus
      ]);

      // Automatic Surge Dispatch Transition (QĐ 73/2011/QĐ-TTg)
      let surgeTransition = { is_surge_active: false };
      try {
        const queryRes = await connection.query(
          `SELECT * FROM Surge_Dispatches 
           WHERE selected_staff_id = ? 
             AND status = 'IN_PROGRESS' 
             AND response_status IN ('PENDING', 'ACCEPTED', 'ACCEPTED_15M', 'ACCEPTED_30M')
           ORDER BY created_at DESC 
           LIMIT 1`,
          [staff_id]
        );
        const activeSurges = Array.isArray(queryRes) && Array.isArray(queryRes[0]) ? queryRes[0] : (Array.isArray(queryRes) ? queryRes : []);

        if (activeSurges && activeSurges.length > 0) {
          const surge = activeSurges[0];
          await connection.execute(
            `UPDATE Surge_Dispatches SET 
              actual_clock_in_time = ?,
              response_status = 'ACCEPTED'
             WHERE id = ?`,
            [formattedClockIn, surge.id]
          );

          if (effectiveShiftId) {
            await connection.execute(
              `UPDATE Shifts SET 
                status = 'EMERGENCY_ACTIVE',
                shift_type = 'EMERGENCY_COVER'
               WHERE id = ?`,
              [effectiveShiftId]
            );
          } else {
            await connection.execute(
              `UPDATE Shifts SET 
                status = 'EMERGENCY_ACTIVE',
                shift_type = 'EMERGENCY_COVER'
               WHERE staff_id = ? 
                 AND DATE(start_time) = DATE(?)
                 AND status IN ('ON_CALL', 'SCHEDULED', 'IN_PROGRESS')
               LIMIT 1`,
              [staff_id, formattedClockIn]
            );
          }
          surgeTransition = {
            is_surge_active: true,
            dispatch_id: surge.id,
            alert_level: surge.alert_level,
            allowance_note: `Huy động khẩn cấp theo QĐ 73/2011/QĐ-TTg (Phiên điều động: ${surge.id})`
          };
        }
      } catch (surgeErr) {
        console.warn('[attendanceService] Surge transition warning:', surgeErr.message);
      }

      await connection.commit();

      return {
        id: attendanceId,
        shift_id: effectiveShiftId,
        staff_id,
        clock_in_time: formattedClockIn,
        clock_out_time: null,
        clock_in_method,
        attendance_status: attendanceStatus,
        overtime_minutes: 0,
        handover_notes: null,
        surge_dispatch: surgeTransition.is_surge_active ? surgeTransition : null
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
   * Tuân thủ: Elastic Overrun State Machine, bảo toàn overtime_minutes, và lưu clinical_case_ref.
   */
  async clockOut(id, data = {}) {
    const {
      clock_out_time = null,
      handover_notes = null,
      overtime_minutes = null,
      overrun_reason = null,
      clinical_case_ref = null
    } = data;
    const formattedClockOut = normalizeDateTime(clock_out_time);
    const clockOutTimestamp = parseTimestamp(clock_out_time || formattedClockOut);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT a.*, 
                s.end_time AS shift_end_time,
                s.scheduled_end_time,
                s.is_overrun AS shift_is_overrun,
                s.overrun_minutes AS shift_overrun_minutes,
                s.overrun_reason AS shift_overrun_reason,
                s.clinical_case_ref AS shift_case_ref,
                s.overrun_approval_status AS shift_overrun_approval
         FROM Attendances a 
         LEFT JOIN Shifts s ON a.shift_id = s.id 
         WHERE a.id = ? FOR UPDATE`,
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

      // 1. Tính toán số phút làm thêm lâm sàng bảo toàn mốc scheduled_end_time gốc
      let diffOvertime = 0;
      let finalStatus = attendance.attendance_status;

      const baselineEndStr = attendance.scheduled_end_time || attendance.shift_end_time;
      if (baselineEndStr) {
        const baselineEndTimestamp = parseTimestamp(baselineEndStr);
        if (clockOutTimestamp > baselineEndTimestamp) {
          const diffMs = clockOutTimestamp - baselineEndTimestamp;
          diffOvertime = Math.floor(diffMs / (1000 * 60));
        }
      }

      // Bảo toàn overtime_minutes: lấy giá trị lớn nhất, không bao giờ bị reset về 0
      const declaredOvertime = overtime_minutes !== null ? Number(overtime_minutes) : 0;
      const priorOvertime = Number(attendance.overtime_minutes || 0);
      const shiftPriorOvertime = Number(attendance.shift_overrun_minutes || 0);
      let effectiveOvertime = Math.max(diffOvertime, declaredOvertime, priorOvertime, shiftPriorOvertime);

      // Cảnh báo nếu vượt quá trần tối đa 6 giờ (360 phút) do quên quẹt thẻ
      const MAX_OVERRUN_MINUTES = 360;
      let isIrregular = false;
      if (effectiveOvertime > MAX_OVERRUN_MINUTES) {
        isIrregular = true;
      }

      if (effectiveOvertime >= 30 && finalStatus === 'PRESENT') {
        finalStatus = 'OVERTIME';
      }

      // Xác định lý do chuyên môn và mã bệnh án
      const effectiveReason = overrun_reason || attendance.overrun_reason || attendance.shift_overrun_reason || (effectiveOvertime > 0 ? 'Kíp trực hoàn tất cấp cứu / phẫu thuật ngoài giờ' : null);
      const effectiveCaseRef = clinical_case_ref || attendance.clinical_case_ref || attendance.shift_case_ref || null;

      // Xác định trạng thái phê duyệt (<= 30p auto, > 30p pending)
      let approvalStatus = 'NOT_APPLICABLE';
      if (effectiveOvertime > 0) {
        if (attendance.shift_overrun_approval === 'APPROVED') {
          approvalStatus = 'APPROVED';
        } else if (effectiveOvertime <= 30 && !isIrregular) {
          approvalStatus = 'AUTO_APPROVED';
        } else {
          approvalStatus = 'PENDING_APPROVAL';
        }
      }

      let mergedHandoverNotes = handover_notes || attendance.handover_notes;
      if (isIrregular) {
        const warningText = `[CẢNH BÁO BẤT THƯỜNG]: Ra ca trễ ${effectiveOvertime} phút (>6h), cần Trưởng khoa đối chiếu sổ trực xác nhận.`;
        mergedHandoverNotes = mergedHandoverNotes ? `${mergedHandoverNotes}\n${warningText}` : warningText;
      }

      const updateSql = `
        UPDATE Attendances 
        SET clock_out_time = ?, 
            attendance_status = ?, 
            overtime_minutes = ?, 
            overrun_reason = ?,
            clinical_case_ref = ?,
            overrun_approval_status = ?,
            handover_notes = ?, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await connection.execute(updateSql, [
        formattedClockOut,
        finalStatus,
        effectiveOvertime,
        effectiveReason,
        effectiveCaseRef,
        approvalStatus,
        mergedHandoverNotes,
        id
      ]);

      // 2. Đồng bộ sang bảng Shifts
      if (attendance.shift_id) {
        await connection.execute(
          `UPDATE Shifts 
           SET status = "COMPLETED", 
               end_time = ?,
               is_overrun = ?,
               overrun_minutes = ?,
               overrun_reason = COALESCE(?, overrun_reason),
               clinical_case_ref = COALESCE(?, clinical_case_ref),
               overrun_approval_status = ?,
               updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [
            formattedClockOut,
            effectiveOvertime > 0,
            effectiveOvertime,
            effectiveReason,
            effectiveCaseRef,
            approvalStatus,
            attendance.shift_id
          ]
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
        overtime_minutes: effectiveOvertime,
        overrun_reason: effectiveReason,
        clinical_case_ref: effectiveCaseRef,
        overrun_approval_status: approvalStatus,
        handover_notes: mergedHandoverNotes
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
        e.first_name,
        e.last_name,
        e.role AS staff_role,
        e.department_code,
        e.specialty,
        d.name AS department_name,
        a.clock_in_time,
        a.clock_out_time,
        a.clock_in_method,
        a.attendance_status,
        a.overtime_minutes,
        a.handover_notes,
        a.created_at,
        a.updated_at,
        s.shift_type,
        s.on_call_tier,
        s.team_code,
        s.start_time AS scheduled_start,
        s.end_time AS scheduled_end
      FROM Attendances a
      LEFT JOIN Employees e ON a.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
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
        e.first_name,
        e.last_name,
        e.role AS staff_role,
        e.department_code,
        e.specialty,
        d.name AS department_name,
        s.shift_type,
        s.on_call_tier,
        s.team_code,
        s.start_time AS scheduled_start,
        s.end_time AS scheduled_end,
        s.requires_handover
      FROM Attendances a
      LEFT JOIN Employees e ON a.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      LEFT JOIN Shifts s ON a.shift_id = s.id
      WHERE a.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }
};

export default attendanceService;
