import { randomUUID } from 'crypto';
import pool from '../db.js';

const DEPT_ID_TO_CODE = {
  1: 'DEP-EMERG',
  2: 'DEP-ICU',
  3: 'DEP-SURG',
  4: 'DEP-PED',
  5: 'DEP-HR'
};

function resolveDeptCode(codeOrId, fallbackDept = null) {
  if (!codeOrId) return fallbackDept || 'DEP-EMERG';
  if (typeof codeOrId === 'string' && codeOrId.startsWith('DEP-')) return codeOrId;
  if (DEPT_ID_TO_CODE[codeOrId]) return DEPT_ID_TO_CODE[codeOrId];
  return fallbackDept || String(codeOrId);
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

/**
 * Pure date math helper to add/subtract days from YYYY-MM-DD
 * Immune to UTC timezone conversion / daylight saving shifts in GMT+7
 */
function offsetDateString(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const resY = dt.getFullYear();
  const resM = String(dt.getMonth() + 1).padStart(2, '0');
  const resD = String(dt.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

export const shiftService = {
  /**
   * Schedule a new shift with conflict overlap detection and consecutive night shift guard
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
      requires_handover = true,
      allow_insufficient_rest = false
    } = data;

    const formattedStart = normalizeDateTime(start_time);
    const formattedEnd = normalizeDateTime(end_time);

    // 1. Verify staff exists in Employees table
    const [staffRows] = await pool.query(
      'SELECT employee_code, first_name, last_name, department_code FROM Employees WHERE employee_code = ? LIMIT 1',
      [staff_id]
    );
    if (!staffRows || staffRows.length === 0) {
      const err = new Error(`Cán bộ y tế với mã "${staff_id}" không tồn tại trong hệ thống.`);
      err.statusCode = 404;
      throw err;
    }

    const resolvedDeptCode = resolveDeptCode(department_code || department_id, staffRows[0]?.department_code);

    // 2. Query active shifts around this window (both overlap check and rest interval check within +/- 48h)
    const minWindow = offsetDateString(formattedStart.slice(0, 10), -2) + ' 00:00:00';
    const maxWindow = offsetDateString(formattedEnd.slice(0, 10), 2) + ' 23:59:59';

    const checkQuery = `
      SELECT id, start_time, end_time, shift_type 
      FROM Shifts 
      WHERE staff_id = ? 
        AND status IN ('SCHEDULED', 'IN_PROGRESS')
        AND (
          (start_time < ? AND end_time > ?)
          OR (end_time >= ? AND start_time <= ?)
        )
      ORDER BY start_time ASC
    `;

    const [relevantShifts] = await pool.query(checkQuery, [
      staff_id,
      formattedEnd,
      formattedStart,
      minWindow,
      maxWindow
    ]);

    // 2A. Direct overlap check
    const overlapping = (relevantShifts || []).find(s => {
      const sStart = typeof s.start_time === 'string' ? s.start_time : normalizeDateTime(s.start_time);
      const sEnd = typeof s.end_time === 'string' ? s.end_time : normalizeDateTime(s.end_time);
      return sStart < formattedEnd && sEnd > formattedStart;
    });

    if (overlapping) {
      const err = new Error(`Shift conflict: Staff member ${staff_id} is already scheduled for an active shift during this interval (Shift ID: ${overlapping.id}).`);
      err.statusCode = 409;
      err.conflicting_shift = overlapping;
      throw err;
    }

    // 2B. 24-Hour Minimum Rest Interval Check
    let restWarning = null;
    if (relevantShifts && relevantShifts.length > 0) {
      const newStartMs = new Date(formattedStart.replace(' ', 'T')).getTime();
      const newEndMs = new Date(formattedEnd.replace(' ', 'T')).getTime();
      const newStartDateStr = formattedStart.slice(0, 10);
      const isNewNightOrDuty = shift_type === 'NIGHT' || shift_type === 'ON_CALL' || formattedStart.includes('21:00') || formattedStart.includes('17:00');

      // Preceding shifts: shifts that end at or before newStart
      const precedingShifts = relevantShifts
        .filter(s => {
          const sEnd = typeof s.end_time === 'string' ? s.end_time : normalizeDateTime(s.end_time);
          return sEnd <= formattedStart;
        })
        .sort((a, b) => {
          const aEnd = new Date(String(a.end_time).replace(' ', 'T')).getTime();
          const bEnd = new Date(String(b.end_time).replace(' ', 'T')).getTime();
          return bEnd - aEnd;
        });

      const latestPreceding = precedingShifts[0];
      if (latestPreceding) {
        const prevEndStr = typeof latestPreceding.end_time === 'string' ? latestPreceding.end_time : normalizeDateTime(latestPreceding.end_time);
        const prevStartStr = typeof latestPreceding.start_time === 'string' ? latestPreceding.start_time : normalizeDateTime(latestPreceding.start_time);
        const prevEndMs = new Date(prevEndStr.replace(' ', 'T')).getTime();
        const restHoursBefore = (newStartMs - prevEndMs) / (1000 * 60 * 60);

        const isPrevNightOr24h = latestPreceding.shift_type === 'NIGHT' || latestPreceding.shift_type === 'ON_CALL' || prevEndStr.includes('07:00') || prevEndStr.includes('07:30');
        const isSameDayOfficeAndNight = !isPrevNightOr24h && prevStartStr.slice(0, 10) === newStartDateStr && isNewNightOrDuty;
        const isPrevOfficeDaytime = !isPrevNightOr24h && (prevStartStr.includes('07:30') || prevStartStr.includes('08:00')) && (prevEndStr.includes('16:30') || prevEndStr.includes('17:00'));
        const isNewOfficeDaytime = !isNewNightOrDuty && (formattedStart.includes('07:30') || formattedStart.includes('08:00')) && (formattedEnd.includes('16:30') || formattedEnd.includes('17:00'));
        const isConsecutiveDailyOffice = isPrevOfficeDaytime && isNewOfficeDaytime;

        if (!isSameDayOfficeAndNight && !isConsecutiveDailyOffice && restHoursBefore < 24) {
          const msg = isPrevNightOr24h
            ? `Cảnh báo vi phạm thời gian nghỉ ngơi: Cán bộ y tế vừa hoàn thành ca trực lúc ${prevEndStr.slice(11, 16)}, bắt buộc được nghỉ bù trọn vẹn 1 ngày (tối thiểu 24 tiếng). Khoảng nghỉ hiện tại chỉ có ${restHoursBefore.toFixed(1)} tiếng.`
            : `Cảnh báo vi phạm thời gian nghỉ ngơi: Cán bộ y tế chỉ được nghỉ ${restHoursBefore.toFixed(1)} tiếng trước ca tiếp theo (Yêu cầu tối thiểu 24 tiếng nghỉ ngơi theo quy chuẩn y tế).`;

          if (!allow_insufficient_rest) {
            const err = new Error(msg);
            err.statusCode = 409;
            err.code = 'INSUFFICIENT_REST_INTERVAL';
            err.rest_hours = restHoursBefore;
            err.required_rest_hours = 24;
            err.requires_confirmation = true;
            err.violating_shift = latestPreceding;
            throw err;
          } else {
            restWarning = { hours: restHoursBefore, message: msg };
          }
        }
      }

      // Succeeding shifts: shifts that start at or after newEnd
      const succeedingShifts = relevantShifts
        .filter(s => {
          const sStart = typeof s.start_time === 'string' ? s.start_time : normalizeDateTime(s.start_time);
          return sStart >= formattedEnd;
        })
        .sort((a, b) => {
          const aStart = new Date(String(a.start_time).replace(' ', 'T')).getTime();
          const bStart = new Date(String(b.start_time).replace(' ', 'T')).getTime();
          return aStart - bStart;
        });

      const earliestSucceeding = succeedingShifts[0];
      if (earliestSucceeding) {
        const nextStartStr = typeof earliestSucceeding.start_time === 'string' ? earliestSucceeding.start_time : normalizeDateTime(earliestSucceeding.start_time);
        const nextStartMs = new Date(nextStartStr.replace(' ', 'T')).getTime();
        const restHoursAfter = (nextStartMs - newEndMs) / (1000 * 60 * 60);

        const isNextNightOrDuty = earliestSucceeding.shift_type === 'NIGHT' || earliestSucceeding.shift_type === 'ON_CALL' || nextStartStr.includes('21:00') || nextStartStr.includes('17:00');
        const nextEndStr = typeof earliestSucceeding.end_time === 'string' ? earliestSucceeding.end_time : normalizeDateTime(earliestSucceeding.end_time);
        const isNextNightOr24h = earliestSucceeding.shift_type === 'NIGHT' || earliestSucceeding.shift_type === 'ON_CALL' || nextEndStr.includes('07:00') || nextEndStr.includes('07:30');
        const isSameDayOfficeAndNextNight = !isNewNightOrDuty && formattedStart.slice(0, 10) === nextStartStr.slice(0, 10) && isNextNightOrDuty;
        const isNextOfficeDaytime = !isNextNightOr24h && (nextStartStr.includes('07:30') || nextStartStr.includes('08:00')) && (nextEndStr.includes('16:30') || nextEndStr.includes('17:00'));
        const isConsecutiveDailyOfficeAfter = isNewOfficeDaytime && isNextOfficeDaytime;

        if (!isSameDayOfficeAndNextNight && !isConsecutiveDailyOfficeAfter && restHoursAfter < 24) {
          const msg = isNewNightOrDuty
            ? `Cảnh báo vi phạm thời gian nghỉ ngơi: Sau ca trực này (kết thúc lúc ${formattedEnd.slice(11, 16)}), cán bộ y tế bắt buộc được nghỉ bù trọn vẹn 1 ngày (tối thiểu 24 tiếng). Ca tiếp theo bắt đầu lúc ${nextStartStr.slice(11, 16)} chỉ cách ${restHoursAfter.toFixed(1)} tiếng.`
            : `Cảnh báo vi phạm thời gian nghỉ ngơi: Khoảng nghỉ đến ca tiếp theo chỉ có ${restHoursAfter.toFixed(1)} tiếng (Yêu cầu tối thiểu 24 tiếng nghỉ ngơi theo quy chuẩn y tế).`;

          if (!allow_insufficient_rest) {
            const err = new Error(msg);
            err.statusCode = 409;
            err.code = 'INSUFFICIENT_REST_INTERVAL';
            err.rest_hours = restHoursAfter;
            err.required_rest_hours = 24;
            err.requires_confirmation = true;
            err.violating_shift = earliestSucceeding;
            throw err;
          } else {
            restWarning = { hours: restHoursAfter, message: msg };
          }
        }
      }
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
      team_code || 'GENERAL',
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
      team_code: team_code || 'GENERAL',
      is_24h_on_call: Boolean(is_24h_on_call),
      status,
      requires_handover,
      rest_warning: restWarning
    };
  },

  /**
   * Batch schedule regular work or shifts over recurring days of the week
   * Greatly reduces database load and network overhead
   */
  async batchScheduleWorkShifts(payload) {
    const {
      staff_id,
      department_code,
      department_id,
      work_type = 'OFFICE', // 'OFFICE' (07:30 - 16:30) | 'OVERTIME' (16:30 - 20:00) | 'CUSTOM'
      custom_start_time,
      custom_end_time,
      start_date, // 'YYYY-MM-DD'
      end_date,   // 'YYYY-MM-DD'
      days_of_week = [1, 2, 3, 4, 5], // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0 or 7=Sun
      shift_type = 'SWING',
      on_call_tier = 'CLINICAL',
      team_code = 'GENERAL',
      requires_handover = false
    } = payload;

    if (!staff_id || !start_date || !end_date) {
      const err = new Error('Thiếu thông tin bắt buộc: staff_id, start_date, và end_date là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      const err = new Error('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.');
      err.statusCode = 400;
      throw err;
    }

    // Verify staff exists in database
    const [staffCheck] = await pool.query(
      'SELECT employee_code, department_code FROM Employees WHERE employee_code = ? LIMIT 1',
      [staff_id]
    );
    if (!staffCheck || staffCheck.length === 0) {
      const err = new Error(`Cán bộ y tế với mã "${staff_id}" không tồn tại trong hệ thống.`);
      err.statusCode = 404;
      throw err;
    }

    const resolvedDeptCode = resolveDeptCode(department_code || department_id, staffCheck[0]?.department_code);

    // Determine time windows
    let startTimeStr = '07:30:00';
    let endTimeStr = '16:30:00';
    let isOvernight = false;
    let effectiveShiftType = shift_type || 'SWING';
    let effectiveOnCallTier = on_call_tier || 'CLINICAL';
    let effectiveHandover = requires_handover;
    let is24hOnCall = 0;

    if (work_type === 'CA1') {
      startTimeStr = '07:00:00';
      endTimeStr = '14:00:00';
      effectiveShiftType = shift_type && shift_type !== 'SWING' ? shift_type : 'MORNING';
    } else if (work_type === 'CA2') {
      startTimeStr = '14:00:00';
      endTimeStr = '21:00:00';
      effectiveShiftType = shift_type && shift_type !== 'SWING' ? shift_type : 'AFTERNOON';
    } else if (work_type === 'CA3') {
      startTimeStr = '21:00:00';
      endTimeStr = '07:00:00';
      isOvernight = true;
      effectiveShiftType = shift_type && shift_type !== 'SWING' ? shift_type : 'NIGHT';
      effectiveHandover = true;
    } else if (work_type === 'LEADERSHIP') {
      startTimeStr = '07:30:00';
      endTimeStr = '07:30:00';
      isOvernight = true;
      effectiveShiftType = 'ON_CALL';
      effectiveOnCallTier = 'LEADERSHIP';
      effectiveHandover = true;
      is24hOnCall = 1;
    } else if (work_type === 'OVERTIME') {
      startTimeStr = '16:30:00';
      endTimeStr = '20:00:00';
      effectiveShiftType = shift_type && shift_type !== 'SWING' ? shift_type : 'SWING';
    } else if (work_type === 'CUSTOM' && custom_start_time && custom_end_time) {
      startTimeStr = custom_start_time.length === 5 ? `${custom_start_time}:00` : custom_start_time;
      endTimeStr = custom_end_time.length === 5 ? `${custom_end_time}:00` : custom_end_time;
      if (endTimeStr <= startTimeStr) {
        isOvernight = true;
      }
    }

    // Normalize days_of_week
    const validDaysArray = Array.isArray(days_of_week) ? days_of_week : [];
    const normalizedDays = new Set(
      validDaysArray
        .map(d => Number(d))
        .filter(n => !isNaN(n) && n >= 0 && n <= 7)
        .map(n => (n === 7 ? 0 : n))
    );

    const start = new Date(`${start_date}T00:00:00`);
    const end = new Date(`${end_date}T23:59:59`);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      const err = new Error('Dải ngày phân bổ không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }

    // DoS Prevention: Maximum date range limit (90 days)
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      const err = new Error('Khoảng thời gian phân bổ không được vượt quá 90 ngày mỗi lần tạo lịch.');
      err.statusCode = 400;
      throw err;
    }

    // Generate date list matching selected days of week
    const candidateDates = [];
    const curr = new Date(start);
    while (curr <= end) {
      const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday...
      if (normalizedDays.has(dayOfWeek)) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        candidateDates.push(`${y}-${m}-${d}`);
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (candidateDates.length === 0) {
      return {
        success: true,
        count: 0,
        message: 'Không tìm thấy ngày nào khớp với các thứ đã chọn.',
        created_shifts: [],
        conflicts: []
      };
    }

    // Query existing shifts for staff_id across the entire range to test conflicts
    const rangeStart = `${candidateDates[0]} 00:00:00`;
    const lastDate = candidateDates[candidateDates.length - 1];
    const rangeEnd = `${offsetDateString(lastDate, 2)} 23:59:59`;

    const [existingShifts] = await pool.query(
      `SELECT id, start_time, end_time 
       FROM Shifts 
       WHERE staff_id = ? 
         AND status IN ('SCHEDULED', 'IN_PROGRESS')
         AND end_time > ? AND start_time < ?`,
      [staff_id, rangeStart, rangeEnd]
    );

    const validInserts = [];
    const conflicts = [];

    for (const dateStr of candidateDates) {
      let shiftEndDateStr = dateStr;
      if (isOvernight) {
        shiftEndDateStr = offsetDateString(dateStr, 1);
      }

      const shiftStart = `${dateStr} ${startTimeStr}`;
      const shiftEnd = `${shiftEndDateStr} ${endTimeStr}`;

      // Check conflict using direct lexicographical comparison (immune to timezone/Date parsing discrepancies)
      const hasConflict = existingShifts.some(es => {
        const esStart = typeof es.start_time === 'string' ? es.start_time : normalizeDateTime(es.start_time);
        const esEnd = typeof es.end_time === 'string' ? es.end_time : normalizeDateTime(es.end_time);
        return esStart < shiftEnd && esEnd > shiftStart;
      });

      if (hasConflict) {
        conflicts.push({ date: dateStr, start: shiftStart, end: shiftEnd });
      } else {
        const id = randomUUID();
        validInserts.push([
          id,
          staff_id,
          resolvedDeptCode,
          shiftStart,
          shiftEnd,
          effectiveShiftType,
          effectiveOnCallTier,
          team_code || 'GENERAL',
          is24hOnCall,
          'SCHEDULED',
          effectiveHandover ? 1 : 0
        ]);
      }
    }

    // Multi-row batch insert into MySQL
    if (validInserts.length > 0) {
      const insertSql = `
        INSERT INTO Shifts (
          id, staff_id, department_code, start_time, end_time, shift_type,
          on_call_tier, team_code, is_24h_on_call, status, requires_handover
        ) VALUES ?
      `;
      await pool.query(insertSql, [validInserts]);
    }

    return {
      success: true,
      count: validInserts.length,
      created_count: validInserts.length,
      conflicts_count: conflicts.length,
      conflicts
    };
  },

  /**
   * Auto-rotate shifts for department teams according to 3-ca 4-kip hospital standard
   * Guarantees zero consecutive night shifts per team!
   */
  async autoRotateDepartmentTeams(payload) {
    const {
      department_code,
      department_id,
      start_date, // 'YYYY-MM-DD'
      end_date,   // 'YYYY-MM-DD'
      teams = {},
      staff_ids = [],
      rotation_model = '3CA_4KIP',
      preview_only = false
    } = payload;

    if (!start_date || !end_date) {
      const err = new Error('start_date và end_date là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      const err = new Error('Định dạng ngày không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM-DD.');
      err.statusCode = 400;
      throw err;
    }

    const start = new Date(`${start_date}T00:00:00`);
    const end = new Date(`${end_date}T23:59:59`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      const err = new Error('Dải ngày không hợp lệ.');
      err.statusCode = 400;
      throw err;
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      const err = new Error('Khoảng thời gian tự động xoay kíp không được vượt quá 90 ngày.');
      err.statusCode = 400;
      throw err;
    }

    const resolvedDeptCode = department_code || resolveDeptCode(department_id);

    const is2Ca3Kip = rotation_model === '2CA_3KIP';
    const teamKeys = is2Ca3Kip ? ['TEAM_A', 'TEAM_B', 'TEAM_C'] : ['TEAM_A', 'TEAM_B', 'TEAM_C', 'TEAM_D'];
    const resolvedTeams = { ...teams };

    for (const tk of teamKeys) {
      if (!Array.isArray(resolvedTeams[tk])) {
        resolvedTeams[tk] = [];
      }
    }

    // Auto-distribute department employees into teams if not manually specified
    const totalAssignedStaff = teamKeys.reduce((acc, k) => acc + resolvedTeams[k].length, 0);
    if (totalAssignedStaff === 0) {
      let deptStaff = [];
      if (Array.isArray(staff_ids) && staff_ids.length > 0) {
        const [selectedRows] = await pool.query(
          'SELECT employee_code FROM Employees WHERE employee_code IN (?)',
          [staff_ids]
        );
        deptStaff = selectedRows;
      } else {
        const [allDeptRows] = await pool.query(
          'SELECT employee_code FROM Employees WHERE department_code = ? LIMIT 40',
          [resolvedDeptCode]
        );
        deptStaff = allDeptRows;
      }

      if (deptStaff.length > 0) {
        deptStaff.forEach((emp, idx) => {
          const teamIdx = idx % (is2Ca3Kip ? 3 : 4);
          resolvedTeams[teamKeys[teamIdx]].push(emp.employee_code);
        });
      }
    }

    // Build all dates in range
    const dates = [];
    const curr = new Date(start);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }

    const validInserts = [];

    dates.forEach((dateStr, dayIndex) => {
      const nextDateStr = offsetDateString(dateStr, 1);

      if (is2Ca3Kip) {
        // 2 Ca 3 Kíp (Phương án 10h/14h: Ca Ngày 07:00 - 17:00, Ca Đêm 17:00 - 07:00 sáng mai)
        // Chu kỳ mỗi kíp: Ngày 1 Ca Ngày (10h) -> Nghỉ đúng 24h -> Ngày 2 Ca Đêm (14h) -> Nghỉ bù đúng 24h -> Ngày 3 Nghỉ -> Ngày 4 Ca Ngày
        const teamDay = teamKeys[dayIndex % 3];
        const teamNight = teamKeys[(dayIndex + 2) % 3];
        const teamOff = teamKeys[(dayIndex + 1) % 3];

        // Assign Ca Ngày (07:00 - 17:00: 10 tiếng)
        (resolvedTeams[teamDay] || []).forEach(staffId => {
          validInserts.push([
            randomUUID(),
            staffId,
            resolvedDeptCode,
            `${dateStr} 07:00:00`,
            `${dateStr} 17:00:00`,
            'MORNING',
            'CLINICAL',
            teamDay,
            0,
            'SCHEDULED',
            1
          ]);
        });

        // Assign Ca Đêm (17:00 - 07:00 sáng mai: 14 tiếng)
        (resolvedTeams[teamNight] || []).forEach(staffId => {
          validInserts.push([
            randomUUID(),
            staffId,
            resolvedDeptCode,
            `${dateStr} 17:00:00`,
            `${nextDateStr} 07:00:00`,
            'NIGHT',
            'CLINICAL',
            teamNight,
            0,
            'SCHEDULED',
            1
          ]);
        });
      } else {
        // 3 Ca 4 Kíp: Sáng (07:00-14:00) -> Chiều (14:00-21:00) -> Đêm (21:00-07:00) -> Nghỉ bù
        const teamCa1 = teamKeys[dayIndex % 4];
        const teamCa2 = teamKeys[(dayIndex + 3) % 4];
        const teamCa3 = teamKeys[(dayIndex + 2) % 4];
        const teamOff = teamKeys[(dayIndex + 1) % 4];

        // Assign Ca 1 (Sáng)
        (resolvedTeams[teamCa1] || []).forEach(staffId => {
          validInserts.push([
            randomUUID(),
            staffId,
            resolvedDeptCode,
            `${dateStr} 07:00:00`,
            `${dateStr} 14:00:00`,
            'MORNING',
            'CLINICAL',
            teamCa1,
            0,
            'SCHEDULED',
            1
          ]);
        });

        // Assign Ca 2 (Chiều)
        (resolvedTeams[teamCa2] || []).forEach(staffId => {
          validInserts.push([
            randomUUID(),
            staffId,
            resolvedDeptCode,
            `${dateStr} 14:00:00`,
            `${dateStr} 21:00:00`,
            'AFTERNOON',
            'CLINICAL',
            teamCa2,
            0,
            'SCHEDULED',
            1
          ]);
        });

        // Assign Ca 3 (Đêm qua ngày)
        (resolvedTeams[teamCa3] || []).forEach(staffId => {
          validInserts.push([
            randomUUID(),
            staffId,
            resolvedDeptCode,
            `${dateStr} 21:00:00`,
            `${nextDateStr} 07:00:00`,
            'NIGHT',
            'CLINICAL',
            teamCa3,
            0,
            'SCHEDULED',
            1
          ]);
        });
      }
    });

    if (preview_only) {
      // Fetch employee info for preview table
      const allAssignedCodes = Array.from(new Set(validInserts.map((r) => r[1])));
      const empMap = new Map();
      if (allAssignedCodes.length > 0) {
        const [empRows] = await pool.query(
          'SELECT employee_code, first_name, last_name, role, specialty FROM Employees WHERE employee_code IN (?)',
          [allAssignedCodes]
        );
        (empRows || []).forEach((e) => {
          empMap.set(e.employee_code, e);
        });
      }

      const previewShifts = validInserts.map((row) => {
        const emp = empMap.get(row[1]);
        return {
          id: row[0],
          staff_id: row[1],
          staff_name: emp ? `${emp.last_name} ${emp.first_name}` : row[1],
          staff_role: emp?.role,
          specialty: emp?.specialty,
          department_code: row[2],
          start_time: row[3],
          end_time: row[4],
          shift_type: row[5],
          on_call_tier: row[6],
          team_code: row[7],
          status: row[9]
        };
      });

      const modelDesc = is2Ca3Kip ? '2 ca 3 kíp (10h/14h)' : '3 ca 4 kíp (Sáng/Chiều/Đêm)';
      return {
        success: true,
        preview: true,
        count: validInserts.length,
        days_scheduled: dates.length,
        rotation_model: is2Ca3Kip ? '2CA_3KIP' : '3CA_4KIP',
        department_code: resolvedDeptCode,
        teams: resolvedTeams,
        shifts: previewShifts,
        message: `Đã tính toán sơ đồ xoay ${modelDesc}: ${validInserts.length} ca trực cho ${dates.length} ngày (Xem trước để xác nhận).`
      };
    }

    if (validInserts.length > 0) {
      const insertSql = `
        INSERT INTO Shifts (
          id, staff_id, department_code, start_time, end_time, shift_type,
          on_call_tier, team_code, is_24h_on_call, status, requires_handover
        ) VALUES ?
      `;
      await pool.query(insertSql, [validInserts]);
    }

    const modelDesc = is2Ca3Kip ? '2 ca 3 kíp (10h/14h)' : '3 ca 4 kíp (Sáng/Chiều/Đêm)';
    return {
      success: true,
      count: validInserts.length,
      days_scheduled: dates.length,
      rotation_model: is2Ca3Kip ? '2CA_3KIP' : '3CA_4KIP',
      department_code: resolvedDeptCode,
      message: `Đã tự động xoay ${modelDesc} thành công ${validInserts.length} ca trực cho ${dates.length} ngày (Bảo đảm >= 24h nghỉ ngơi giữa các ca).`
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
  },

  /**
   * Delete or cancel shift by ID.
   * If clinical handovers or attendances exist, safely soft-deletes (status = 'CANCELLED')
   * to preserve patient safety audit trail and legal medical records.
   */
  async deleteShift(id) {
    const [auditRows] = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM Shift_Handovers WHERE outgoing_shift_id = ? OR incoming_shift_id = ?) as handover_count,
        (SELECT COUNT(*) FROM Attendances WHERE shift_id = ?) as attendance_count`,
      [id, id, id]
    );

    const hasLogs = auditRows && auditRows[0] && (auditRows[0].handover_count > 0 || auditRows[0].attendance_count > 0);
    if (hasLogs) {
      const [updateRes] = await pool.query('UPDATE Shifts SET status = "CANCELLED" WHERE id = ?', [id]);
      return updateRes.affectedRows > 0;
    }

    const [result] = await pool.query('DELETE FROM Shifts WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

export default shiftService;
