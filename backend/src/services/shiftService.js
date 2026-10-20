import { randomUUID } from 'crypto';
import pool from '../db.js';

const DEPT_ID_TO_CODE = {
  1: 'DEP-CAPCUU',
  2: 'DEP-HOISUC',
  3: 'DEP-NGOAIKHOA',
  4: 'DEP-NOIKHOA',
  5: 'DEP-NHIKHOA'
};

function resolveDeptCode(codeOrId) {
  if (!codeOrId) return 'DEP-CAPCUU';
  if (typeof codeOrId === 'string' && codeOrId.startsWith('DEP-')) return codeOrId;
  return DEPT_ID_TO_CODE[codeOrId] || String(codeOrId);
}

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

export const shiftService = {
  /**
   * Schedule a new shift with conflict overlap detection
   */
  async scheduleShift(data) {
    const {
      staff_id,
      department_code,
      department_id,
      start_time,
      end_time,
      shift_type = 'MORNING',
      on_call_tier = 'CLINICAL',
      team_code = 'GENERAL',
      is_24h_on_call = false,
      status = 'SCHEDULED',
      requires_handover = true
    } = data;

    const formattedStart = normalizeDateTime(start_time);
    const formattedEnd = normalizeDateTime(end_time);
    const resolvedDeptCode = department_code || resolveDeptCode(department_id);

    // Check for overlapping shifts
    const overlapQuery = `
      SELECT id, start_time, end_time, shift_type 
      FROM Shifts 
      WHERE staff_id = ? 
        AND status IN ('SCHEDULED', 'IN_PROGRESS')
        AND (
          (start_time < ? AND end_time > ?) OR
          (start_time < ? AND end_time > ?) OR
          (start_time >= ? AND end_time <= ?)
        )
      LIMIT 1
    `;

    const [overlapping] = await pool.query(overlapQuery, [
      staff_id,
      formattedEnd,
      formattedStart,
      formattedStart,
      formattedStart,
      formattedStart,
      formattedEnd
    ]);

    if (overlapping.length > 0) {
      const err = new Error(`Shift conflict: Staff member ${staff_id} is already scheduled for an active shift during this interval (Shift ID: ${overlapping[0].id}).`);
      err.statusCode = 409;
      err.conflicting_shift = overlapping[0];
      throw err;
    }

    const shiftId = randomUUID();
    const insertSql = `
      INSERT INTO Shifts (
        id, staff_id, department_code, start_time, end_time, shift_type,
        on_call_tier, team_code, is_24h_on_call, status, requires_handover
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      shiftId,
      staff_id,
      resolvedDeptCode,
      formattedStart,
      formattedEnd,
      shift_type,
      on_call_tier,
      team_code,
      Boolean(is_24h_on_call),
      status,
      requires_handover
    ]);

    return {
      id: shiftId,
      staff_id,
      department_code: resolvedDeptCode,
      department_id: typeof department_id === 'number' ? department_id : 1,
      start_time: formattedStart,
      end_time: formattedEnd,
      shift_type,
      on_call_tier,
      team_code,
      is_24h_on_call: Boolean(is_24h_on_call),
      status,
      requires_handover
    };
  },

  /**
   * Get all shifts with filters
   */
  async getAllShifts(filters = {}) {
    const {
      staff_id,
      department_code,
      department_id,
      status,
      shift_type,
      on_call_tier,
      team_code,
      date
    } = filters;

    let sql = `
      SELECT 
        s.id,
        s.staff_id,
        CONCAT(e.last_name, ' ', e.first_name) AS staff_name,
        e.first_name,
        e.last_name,
        e.role,
        s.department_code,
        d.id AS department_id,
        d.name AS department_name,
        s.start_time,
        s.end_time,
        s.shift_type,
        s.on_call_tier,
        s.team_code,
        s.is_24h_on_call,
        s.status,
        s.requires_handover,
        s.created_at,
        s.updated_at
      FROM Shifts s
      LEFT JOIN Employees e ON s.staff_id = e.employee_code
      LEFT JOIN Departments d ON s.department_code = d.department_code
      WHERE 1=1
    `;
    const params = [];

    if (staff_id) {
      sql += ' AND s.staff_id = ?';
      params.push(staff_id);
    }
    if (department_code) {
      sql += ' AND s.department_code = ?';
      params.push(department_code);
    } else if (department_id) {
      if (typeof department_id === 'string' && department_id.startsWith('DEP-')) {
        sql += ' AND s.department_code = ?';
        params.push(department_id);
      } else {
        sql += ' AND (d.id = ? OR s.department_code = ?)';
        params.push(department_id, resolveDeptCode(department_id));
      }
    }
    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }
    if (shift_type) {
      sql += ' AND s.shift_type = ?';
      params.push(shift_type);
    }
    if (on_call_tier) {
      sql += ' AND s.on_call_tier = ?';
      params.push(on_call_tier);
    }
    if (team_code) {
      sql += ' AND s.team_code = ?';
      params.push(team_code);
    }
    if (date) {
      sql += ' AND DATE(s.start_time) = ?';
      params.push(date);
    }

    sql += ' ORDER BY s.start_time ASC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Get shift by ID
   */
  async getShiftById(id) {
    const sql = `
      SELECT 
        s.id,
        s.staff_id,
        CONCAT(e.last_name, ' ', e.first_name) AS staff_name,
        e.first_name,
        e.last_name,
        e.role,
        s.department_code,
        d.id AS department_id,
        d.name AS department_name,
        s.start_time,
        s.end_time,
        s.shift_type,
        s.on_call_tier,
        s.team_code,
        s.is_24h_on_call,
        s.status,
        s.requires_handover,
        s.created_at,
        s.updated_at
      FROM Shifts s
      LEFT JOIN Employees e ON s.staff_id = e.employee_code
      LEFT JOIN Departments d ON s.department_code = d.department_code
      WHERE s.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }
};

export default shiftService;
