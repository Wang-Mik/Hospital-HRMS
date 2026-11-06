import pool from '../db.js';
import { randomUUID } from 'crypto';

const ROLE_TITLE_MAP = {
  SUPER_ADMIN: 'Ban Giám Đốc / Quản trị',
  HR_MANAGER: 'Trưởng phòng Tổ chức Cán bộ',
  DEPARTMENT_HEAD: 'Trưởng khoa / Bác sĩ CKII',
  DOCTOR: 'Bác sĩ điều trị',
  CHIEF_NURSE: 'Điều dưỡng trưởng khoa',
  NURSE: 'Điều dưỡng viên lâm sàng',
  TECHNICIAN: 'Kỹ thuật viên Y học',
  MEDICAL_SECRETARY: 'Thư ký Y khoa',
  STAFF: 'Nhân viên Y tế'
};

/**
 * Hệ Thống Điều Động Tăng Cường & Bù Đắp Nhân Lực (Clinical Surge Dispatch & Staff Fill-Gap System)
 * Conforms to: Quy chế Bệnh viện (QĐ 1895/1997/QĐ-BYT), QĐ 73/2011/QĐ-TTg, Luật KBCB 2023
 */
export const surgeDispatchService = {
  /**
   * Chuẩn hóa đối tượng phiên điều động trả về đồng nhất cho cả Frontend & Backend
   */
  _formatDispatchSession(row) {
    if (!row) return null;

    let parsedSnapshot = [];
    if (Array.isArray(row.candidates_snapshot)) {
      parsedSnapshot = row.candidates_snapshot;
    } else if (typeof row.candidates_snapshot === 'string' && row.candidates_snapshot.trim()) {
      try {
        parsedSnapshot = JSON.parse(row.candidates_snapshot);
      } catch {
        parsedSnapshot = [];
      }
    }

    const matchedCandidate = parsedSnapshot.find(
      (c) => c && c.staff_id === row.selected_staff_id
    );

    const joinedName =
      row.selected_last_name || row.selected_first_name
        ? `${row.selected_last_name || ''} ${row.selected_first_name || ''}`.trim()
        : '';

    const responderName =
      row.responder_name ||
      joinedName ||
      matchedCandidate?.full_name ||
      matchedCandidate?.staff_name ||
      row.selected_staff_id ||
      'Cán bộ trực thường trú';

    const responderRole =
      row.responder_role ||
      row.selected_role ||
      matchedCandidate?.role ||
      'DOCTOR';

    const responderSpecialty =
      row.selected_specialty ||
      matchedCandidate?.specialty ||
      matchedCandidate?.job_title ||
      'Lâm sàng cấp cứu';

    return {
      ...row,
      id: row.id,
      dispatch_id: row.id,
      department_code: row.department_code,
      department_name: row.department_name || matchedCandidate?.department_name || row.department_code,
      alert_level: row.alert_level || 'LEVEL_1_SURGE',
      reason: row.reason || '',
      clinical_notes: row.clinical_notes || null,
      status: row.status || 'IN_PROGRESS',
      selected_staff_id: row.selected_staff_id || null,
      responder_name: responderName,
      responder_role: responderRole,
      responder_specialty: responderSpecialty,
      phone_contact: row.phone_contact || matchedCandidate?.phone_contact || '0908123456',
      suitability_score: Number(
        row.suitability_score ?? matchedCandidate?.suitability_score ?? 0
      ),
      response_status: row.response_status || 'PENDING',
      estimated_arrival_minutes: Number(row.estimated_arrival_minutes ?? 15),
      acknowledged_at: row.acknowledged_at || null,
      actual_clock_in_time: row.actual_clock_in_time || null,
      coordinator_notes: row.coordinator_notes || null,
      rejection_reason: row.rejection_reason || null,
      candidates_snapshot: parsedSnapshot,
      created_at: row.created_at || new Date().toISOString()
    };
  },

  /**
   * Quét danh sách nhân sự trực thường trú (On-Call) & nhân sự lâm sàng đủ điều kiện
   * Tính điểm đa mục tiêu (Multi-Objective Suitability Score) và loại trừ vi phạm an toàn
   */
  async getCandidatesForSurge(departmentCode, options = {}) {
    const target_date = options.target_date || null;
    const roleFilter = options.required_role || options.staff_type || null;
    const dateStr = target_date || new Date().toISOString().slice(0, 10);

    // 1. Query staff who have an ON_CALL shift today or active clinical staff in department
    let sql = `
      SELECT 
        e.id as emp_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.role,
        e.specialty,
        e.phone,
        e.department_code,
        d.name as department_name,
        s.id as on_call_shift_id,
        s.shift_type,
        s.status as shift_status,
        s.on_call_tier,
        s.start_time,
        s.end_time
      FROM Employees e
      JOIN Departments d ON e.department_code = d.department_code
      LEFT JOIN Shifts s ON e.employee_code = s.staff_id 
        AND DATE(s.start_time) = ?
        AND (s.shift_type = 'ON_CALL' OR s.status = 'ON_CALL')
      WHERE e.status = 'ACTIVE'
    `;
    const params = [dateStr];

    if (departmentCode && departmentCode !== 'ALL') {
      sql += ` AND (e.department_code = ? OR e.department_code IN ('DEP-KHB', 'DEP-CC-HSTC', 'DEP-HSTC', 'DEP-NOI', 'DEP-NGOAI'))`;
      params.push(departmentCode);
    }

    if (roleFilter && roleFilter !== 'ALL' && roleFilter !== 'ANY') {
      if (roleFilter === 'DOCTOR') {
        sql += ` AND e.role IN ('DOCTOR', 'DEPARTMENT_HEAD')`;
      } else if (roleFilter === 'NURSE') {
        sql += ` AND e.role IN ('NURSE', 'CHIEF_NURSE')`;
      } else {
        sql += ` AND e.role = ?`;
        params.push(roleFilter);
      }
    } else {
      sql += ` AND e.role IN ('DEPARTMENT_HEAD', 'DOCTOR', 'CHIEF_NURSE', 'NURSE', 'TECHNICIAN')`;
    }

    const [employees] = await pool.query(sql, params);

    // 2. Query Medical Licenses verification & expiration
    const [licenses] = await pool.query(
      `SELECT employee_id, license_number, verification_status, expiration_date 
       FROM Medical_Licenses`
    );
    const licenseMap = new Map();
    for (const lic of licenses || []) {
      licenseMap.set(lic.employee_id, lic);
    }

    // 3. Query Night Shifts that ended in the last 24 hours (between NOW - 24h and NOW) to enforce Biological Rest Interval
    const [recentNightShifts] = await pool.query(
      `SELECT staff_id, end_time FROM Shifts 
       WHERE shift_type = 'NIGHT' 
         AND end_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND end_time <= NOW()
         AND status != 'CANCELLED'`
    );
    const restingStaffSet = new Set((recentNightShifts || []).map((s) => s.staff_id));

    // 4. Query staff currently locked in another active Surge Dispatch
    const [activeDispatches] = await pool.query(
      `SELECT selected_staff_id FROM Surge_Dispatches 
       WHERE status = 'IN_PROGRESS' AND response_status IN ('PENDING', 'ACCEPTED')`
    );
    const busySurgeStaffSet = new Set(
      (activeDispatches || []).map((d) => d.selected_staff_id).filter(Boolean)
    );

    // 5. Query monthly accumulated hours for workload balancing
    const currentMonth = dateStr.slice(0, 7);
    const [monthlyAttendances] = await pool.query(
      `SELECT staff_id, SUM(TIMESTAMPDIFF(MINUTE, clock_in_time, COALESCE(clock_out_time, DATE_ADD(clock_in_time, INTERVAL 8 HOUR)))) as total_minutes
       FROM Attendances
       WHERE DATE_FORMAT(clock_in_time, '%Y-%m') = ?
       GROUP BY staff_id`,
      [currentMonth]
    );
    const hoursMap = new Map();
    for (const att of monthlyAttendances || []) {
      hoursMap.set(att.staff_id, Math.round(((att.total_minutes || 0) / 60) * 10) / 10);
    }

    const eligibleCandidates = [];
    const excludedCandidates = [];
    const seenStaffCodes = new Set();

    for (const emp of employees || []) {
      const staffCode = emp.employee_code;
      if (seenStaffCodes.has(staffCode)) continue;
      seenStaffCodes.add(staffCode);

      const fullName = `${emp.last_name || ''} ${emp.first_name || ''}`.trim();
      const license = licenseMap.get(emp.emp_id);
      const isResting = restingStaffSet.has(staffCode);
      const isBusySurge = busySurgeStaffSet.has(staffCode);
      const monthHours = hoursMap.get(staffCode) || 0;

      // HARD CONSTRAINT 1: Biological Rest Interval Guard (24h post-night shift)
      if (isResting) {
        excludedCandidates.push({
          staff_id: staffCode,
          staff_name: fullName,
          full_name: fullName,
          role: emp.role,
          specialty: emp.specialty,
          phone: emp.phone || '0908123456',
          exclusion_reason:
            'Vi phạm khoảng nghỉ an toàn 24h sau ca trực đêm (RESTING_POST_NIGHT theo QĐ 1895/1997/QĐ-BYT).'
        });
        continue;
      }

      // HARD CONSTRAINT 2: Legal Medical License verification & expiration
      const isLicenseExpired =
        license && license.expiration_date && new Date(license.expiration_date) < new Date(dateStr);
      const isLicenseInvalid =
        !license || license.verification_status !== 'VERIFIED' || isLicenseExpired;
      if (
        isLicenseInvalid &&
        (emp.role === 'DOCTOR' ||
          emp.role === 'DEPARTMENT_HEAD' ||
          emp.role === 'CHIEF_NURSE' ||
          emp.role === 'NURSE')
      ) {
        excludedCandidates.push({
          staff_id: staffCode,
          staff_name: fullName,
          full_name: fullName,
          role: emp.role,
          specialty: emp.specialty,
          phone: emp.phone || '0908123456',
          exclusion_reason: isLicenseExpired
            ? 'Chứng chỉ hành nghề đã hết hiệu lực, vi phạm Luật Khám bệnh chữa bệnh 2023.'
            : 'Chứng chỉ hành nghề chưa được xác thực (UNVERIFIED).'
        });
        continue;
      }

      // HARD CONSTRAINT 3: Concurrency Guard - Already dispatched
      if (isBusySurge) {
        excludedCandidates.push({
          staff_id: staffCode,
          staff_name: fullName,
          full_name: fullName,
          role: emp.role,
          specialty: emp.specialty,
          phone: emp.phone || '0908123456',
          exclusion_reason: 'Đang tham gia một phiên điều động tăng cường khác chưa kết thúc.'
        });
        continue;
      }

      // MULTI-OBJECTIVE SOFT SCORING (Thang điểm 100)
      let scoreSpecialty = 20.0;
      const spec = (emp.specialty || '').toLowerCase();
      if (emp.department_code === departmentCode) {
        scoreSpecialty = 35.0;
      } else if (
        spec.includes('cấp cứu') ||
        spec.includes('hồi sức') ||
        spec.includes('ngoại') ||
        spec.includes('phẫu thuật')
      ) {
        scoreSpecialty = 33.0;
      } else if (spec.includes('nội') || spec.includes('chăm sóc')) {
        scoreSpecialty = 28.0;
      }

      let scoreSeniority = 20.0;
      if (emp.role === 'DEPARTMENT_HEAD' || (emp.specialty || '').includes('CKII')) {
        scoreSeniority = 30.0;
      } else if (emp.role === 'DOCTOR' || emp.role === 'CHIEF_NURSE') {
        scoreSeniority = 25.0;
      } else {
        scoreSeniority = 20.0;
      }

      // Workload Balancing: Càng ít giờ trực tích lũy thì điểm càng cao (tránh kiệt sức)
      const scoreWorkload = Math.max(
        10.0,
        Math.min(35.0, Math.round(35.0 * (1 - Math.min(monthHours, 200) / 220) * 10) / 10)
      );

      const totalScore = Math.min(
        100.0,
        Math.round((scoreSpecialty + scoreSeniority + scoreWorkload) * 10) / 10
      );

      const roleTitle = ROLE_TITLE_MAP[emp.role] || emp.role;
      const jobTitle = emp.specialty ? `${roleTitle} — ${emp.specialty}` : roleTitle;
      const hasOnCall = Boolean(emp.on_call_shift_id);
      const etaMinutes = hasOnCall ? 15 : 20;

      eligibleCandidates.push({
        staff_id: staffCode,
        staff_name: fullName,
        full_name: fullName,
        role: emp.role,
        job_title: jobTitle,
        specialty: emp.specialty || 'Lâm sàng đa khoa',
        phone_contact: emp.phone || '0908123456',
        license_number: license?.license_number || 'CCHN-HỢP-LỆ',
        department_code: emp.department_code,
        department_name: emp.department_name,
        has_on_call_today: hasOnCall,
        on_call_shift_id: emp.on_call_shift_id || null,
        month_hours: monthHours,
        suitability_score: totalScore,
        eta_minutes: etaMinutes,
        estimated_arrival_minutes: etaMinutes
      });
    }

    // Sort eligible candidates by:
    // 1. Has on-call shift today first
    // 2. Same department as requested first
    // 3. Suitability score DESC
    eligibleCandidates.sort((a, b) => {
      if (a.has_on_call_today !== b.has_on_call_today) {
        return a.has_on_call_today ? -1 : 1;
      }
      const aSameDept = a.department_code === departmentCode;
      const bSameDept = b.department_code === departmentCode;
      if (aSameDept !== bSameDept) {
        return aSameDept ? -1 : 1;
      }
      return b.suitability_score - a.suitability_score;
    });

    const topCandidates = eligibleCandidates.slice(0, 5).map((c, idx) => ({
      ...c,
      rank: idx + 1,
      rank_order: idx + 1
    }));

    return {
      department_code: departmentCode,
      target_date: dateStr,
      candidates: topCandidates,
      top_candidates: topCandidates,
      total_eligible: eligibleCandidates.length,
      excluded_candidates: excludedCandidates
    };
  },

  /**
   * Khởi tạo phiên điều động tăng cường & bù đắp nhân lực
   */
  async createSurgeDispatch(payload, actor = {}) {
    const {
      department_code,
      alert_level = 'LEVEL_1_SURGE',
      reason,
      clinical_notes = null
    } = payload;

    const requestedStaffId = payload.selected_staff_id || payload.selected_candidate_id || null;
    const roleFilter = payload.required_role || payload.staff_type || null;

    if (!department_code || !reason) {
      const err = new Error(
        'Mã khoa phòng (department_code) và lý do điều động (reason) là bắt buộc.'
      );
      err.statusCode = 400;
      throw err;
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Concurrency Lock: Check if there is already an active dispatch for the department
      const [existingActive] = await connection.query(
        `SELECT id, alert_level, reason FROM Surge_Dispatches 
         WHERE department_code = ? AND status = 'IN_PROGRESS' 
         FOR UPDATE`,
        [department_code]
      );

      if (existingActive && existingActive.length > 0) {
        const err = new Error(
          `Khoa ${department_code} đang có một phiên điều động khẩn cấp đang kích hoạt (Mã: ${existingActive[0].id}). Vui lòng xử lý hoặc kết thúc phiên hiện tại trước khi tạo mới.`
        );
        err.statusCode = 409;
        throw err;
      }

      // Get candidates snapshot
      const candidatesResult = await this.getCandidatesForSurge(department_code, {
        required_role: roleFilter
      });
      const topCandidates = candidatesResult.top_candidates || [];

      let primaryCandidate = null;
      if (requestedStaffId) {
        primaryCandidate = topCandidates.find((c) => c.staff_id === requestedStaffId) || {
          rank: 1,
          rank_order: 1,
          staff_id: requestedStaffId,
          staff_name: requestedStaffId,
          full_name: requestedStaffId,
          role: roleFilter && roleFilter !== 'ALL' ? roleFilter : 'DOCTOR',
          phone_contact: '0908123456',
          suitability_score: 90.0,
          eta_minutes: 15,
          estimated_arrival_minutes: 15
        };
      } else if (topCandidates.length > 0) {
        primaryCandidate = topCandidates[0];
      }

      // Mark primaryCandidate as attempted in the snapshot so fallback knows who was already called
      const snapshotWithTracking = topCandidates.map((c) => ({
        ...c,
        attempted: primaryCandidate && c.staff_id === primaryCandidate.staff_id ? true : false,
        call_status:
          primaryCandidate && c.staff_id === primaryCandidate.staff_id ? 'CALLING' : 'STANDBY'
      }));

      const dispatchId = randomUUID();
      const initiatorCode = actor.employee_code || actor.id || 'EMP-ADM-001';

      await connection.execute(
        `INSERT INTO Surge_Dispatches (
          id, department_code, alert_level, reason, clinical_notes,
          initiated_by, status, selected_staff_id, phone_contact,
          suitability_score, response_status, estimated_arrival_minutes,
          candidates_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?, 'PENDING', ?, ?)`,
        [
          dispatchId,
          department_code,
          alert_level,
          reason,
          clinical_notes,
          initiatorCode,
          primaryCandidate?.staff_id || null,
          primaryCandidate?.phone_contact || null,
          primaryCandidate?.suitability_score || 0.0,
          primaryCandidate?.estimated_arrival_minutes || 15,
          JSON.stringify(snapshotWithTracking)
        ]
      );

      // Kênh 2 (Phụ): Ghi thông báo nội bộ trên hệ thống cho nhân sự được gọi (không phát âm thanh/hiệu ứng)
      if (primaryCandidate?.staff_id) {
        try {
          const notifId = randomUUID();
          await connection.execute(
            `INSERT INTO Notifications (id, target_staff_id, title, message, type, is_read)
             VALUES (?, ?, ?, ?, 'ALERT', 0)`,
            [
              notifId,
              primaryCandidate.staff_id,
              'LỆNH ĐIỀU ĐỘNG TĂNG CƯỜNG & BÙ ĐẮP NHÂN LỰC',
              `Khoa ${department_code} kích hoạt điều động tăng cường (${alert_level}). Lý do: ${reason}. Vui lòng liên hệ bàn trực điều phối.`
            ]
          );
        } catch (notifErr) {
          console.warn('[surgeDispatchService] Quiet notification error:', notifErr.message);
        }
      }

      await connection.commit();

      const [newRow] = await pool.query('SELECT * FROM Surge_Dispatches WHERE id = ?', [
        dispatchId
      ]);
      const rawCreated = (newRow && newRow[0]) || {
        id: dispatchId,
        department_code,
        alert_level,
        reason,
        clinical_notes,
        selected_staff_id: primaryCandidate?.staff_id || null,
        phone_contact: primaryCandidate?.phone_contact || '0908123456',
        suitability_score: primaryCandidate?.suitability_score || 0,
        status: 'IN_PROGRESS',
        response_status: 'PENDING',
        estimated_arrival_minutes: primaryCandidate?.estimated_arrival_minutes || 15,
        candidates_snapshot: snapshotWithTracking
      };

      // Bổ sung thông tin ứng viên vừa chọn để trả về đầy đủ cho Frontend
      if (!rawCreated.candidates_snapshot) {
        rawCreated.candidates_snapshot = snapshotWithTracking;
      }

      const formattedSession = this._formatDispatchSession(rawCreated);

      return {
        success: true,
        message: `Đã phát lệnh điều động tăng cường & bù đắp nhân lực cho khoa ${department_code}.`,
        data: formattedSession
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Lấy danh sách các phiên điều động đang kích hoạt
   */
  async getActiveDispatches(departmentCode = null) {
    let sql = `
      SELECT 
        d.*,
        dep.name as department_name,
        e.first_name as initiator_first_name,
        e.last_name as initiator_last_name,
        e.role as initiator_role,
        s.first_name as selected_first_name,
        s.last_name as selected_last_name,
        s.specialty as selected_specialty,
        s.role as selected_role
      FROM Surge_Dispatches d
      JOIN Departments dep ON d.department_code = dep.department_code
      LEFT JOIN Employees e ON d.initiated_by = e.employee_code
      LEFT JOIN Employees s ON d.selected_staff_id = s.employee_code
      WHERE d.status = 'IN_PROGRESS'
    `;
    const params = [];

    if (departmentCode && departmentCode !== 'ALL') {
      sql += ` AND d.department_code = ?`;
      params.push(departmentCode);
    }

    sql += ` ORDER BY d.created_at DESC`;
    const [rows] = await pool.query(sql, params);
    return (rows || []).map((r) => this._formatDispatchSession(r));
  },

  /**
   * Đồng bộ tự động ca trực tăng cường vào bảng Shifts khi ứng viên xác nhận có mặt
   * Giúp Lịch công tác Google Calendar (/shifts) và Máy chấm công (/attendance) cập nhật tức thì
   */
  async _syncEmergencyShiftForResponder(dispatch) {
    if (!dispatch || !dispatch.selected_staff_id || !dispatch.department_code) return;

    try {
      const checkRes = await pool.query(
        `SELECT id, status, shift_type FROM Shifts 
         WHERE staff_id = ? AND DATE(start_time) = CURDATE() AND status != 'CANCELLED'
         ORDER BY FIELD(status, 'ON_CALL', 'SCHEDULED', 'IN_PROGRESS') ASC
         LIMIT 1`,
        [dispatch.selected_staff_id]
      );
      const existingShifts = Array.isArray(checkRes) ? checkRes[0] : null;

      if (Array.isArray(existingShifts) && existingShifts.length > 0) {
        const targetShift = existingShifts[0];
        await pool.execute(
          `UPDATE Shifts SET 
            status = 'EMERGENCY_ACTIVE',
            shift_type = CASE WHEN shift_type = 'ON_CALL' THEN 'EMERGENCY_COVER' ELSE shift_type END
           WHERE id = ?`,
          [targetShift.id]
        );
      } else if (Array.isArray(existingShifts) && existingShifts.length === 0) {
        // Cán bộ đang nghỉ ở nhà được gọi vào viện -> Tự động tạo mới ca trực tăng cường (EMERGENCY_COVER)
        const newShiftId = `SHF-SURGE-${randomUUID().slice(0, 8).toUpperCase()}`;
        await pool.execute(
          `INSERT INTO Shifts (
            id, staff_id, department_code, shift_type, start_time, end_time, status, on_call_tier, approval_status
          ) VALUES (
            ?, ?, ?, 'EMERGENCY_COVER', NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 'EMERGENCY_ACTIVE', 'CLINICAL', 'APPROVED'
          )`,
          [newShiftId, dispatch.selected_staff_id, dispatch.department_code]
        );
      }
    } catch (syncErr) {
      console.warn('[surgeDispatchService._syncEmergencyShiftForResponder]:', syncErr.message);
    }
  },

  /**
   * Tổng đài viên / Điều phối viên ghi nhận kết quả cuộc gọi Kênh 1 trực tiếp từ Buồng lái
   */
  async logCallResult(dispatchId, payload = {}, actor = {}) {
    const rawResult = payload.call_result || payload.call_outcome;
    const note = payload.note || payload.notes || null;

    if (!rawResult) {
      const err = new Error('Kết quả cuộc gọi (call_result / call_outcome) là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    const [rows] = await pool.query('SELECT * FROM Surge_Dispatches WHERE id = ? LIMIT 1', [
      dispatchId
    ]);
    if (!rows || rows.length === 0) {
      const err = new Error(`Phiên điều động với mã "${dispatchId}" không tồn tại.`);
      err.statusCode = 404;
      throw err;
    }

    const dispatch = rows[0];
    if (dispatch.status !== 'IN_PROGRESS') {
      const err = new Error(`Phiên điều động "${dispatchId}" đã kết thúc hoặc bị hủy.`);
      err.statusCode = 400;
      throw err;
    }

    const candidatesSnapshot =
      typeof dispatch.candidates_snapshot === 'string'
        ? JSON.parse(dispatch.candidates_snapshot || '[]')
        : Array.isArray(dispatch.candidates_snapshot)
          ? [...dispatch.candidates_snapshot]
          : [];

    const currentStaffId = dispatch.selected_staff_id;

    // 1. Ứng viên nghe máy và đồng ý có mặt (15 phút hoặc 30 phút)
    if (
      rawResult === 'ACCEPTED_15M' ||
      rawResult === 'ACCEPTED_30M' ||
      rawResult === 'ACCEPTED'
    ) {
      const eta = rawResult === 'ACCEPTED_30M' ? 30 : 15;
      const updatedSnapshot = candidatesSnapshot.map((c) =>
        c.staff_id === currentStaffId
          ? { ...c, attempted: true, call_status: 'ACCEPTED', eta_minutes: eta }
          : c
      );
      const coordinatorNote =
        note || `Cán bộ ${currentStaffId} đã nghe máy và xác nhận có mặt trong ${eta} phút.`;

      await pool.execute(
        `UPDATE Surge_Dispatches SET 
          response_status = 'ACCEPTED',
          estimated_arrival_minutes = ?,
          acknowledged_at = NOW(),
          coordinator_notes = ?,
          candidates_snapshot = ?
         WHERE id = ?`,
        [eta, coordinatorNote, JSON.stringify(updatedSnapshot), dispatchId]
      );

      // Đồng bộ tự động kích hoạt hoặc tạo ca trực tăng cường trên bảng Shifts
      await this._syncEmergencyShiftForResponder(dispatch);

      const updatedSession = this._formatDispatchSession({
        ...dispatch,
        response_status: 'ACCEPTED',
        estimated_arrival_minutes: eta,
        acknowledged_at: new Date().toISOString(),
        coordinator_notes: coordinatorNote,
        candidates_snapshot: updatedSnapshot
      });

      return {
        success: true,
        message: `Cán bộ ${updatedSession.responder_name} (${currentStaffId}) đã xác nhận có mặt trong ${eta} phút.`,
        status: 'ACCEPTED',
        estimated_arrival_minutes: eta,
        data: updatedSession
      };
    }

    // 2. Ứng viên không nghe máy (UNREACHABLE) hoặc từ chối (REJECTED) -> Tự động đôn ứng viên dự phòng kế tiếp (#1 -> #2 -> #3)
    if (rawResult === 'UNREACHABLE' || rawResult === 'REJECTED') {
      const triedStaffIds = new Set();
      if (currentStaffId) triedStaffIds.add(currentStaffId);

      const updatedSnapshot = candidatesSnapshot.map((c) => {
        if (c.staff_id === currentStaffId) {
          triedStaffIds.add(c.staff_id);
          return { ...c, attempted: true, call_status: rawResult };
        }
        if (c.attempted || c.call_status === 'UNREACHABLE' || c.call_status === 'REJECTED') {
          triedStaffIds.add(c.staff_id);
        }
        return c;
      });

      const nextCandidate = updatedSnapshot.find((c) => !triedStaffIds.has(c.staff_id));

      if (nextCandidate) {
        const nextSnapshot = updatedSnapshot.map((c) =>
          c.staff_id === nextCandidate.staff_id
            ? { ...c, attempted: true, call_status: 'CALLING' }
            : c
        );
        const nextName = nextCandidate.full_name || nextCandidate.staff_name || nextCandidate.staff_id;
        const coordinatorNote =
          rawResult === 'UNREACHABLE'
            ? `Không nghe máy cán bộ ${currentStaffId}. Tự động chuyển ứng viên kế tiếp: ${nextCandidate.staff_id} (${nextName}).`
            : `Cán bộ ${currentStaffId} từ chối. Tự động chuyển sang ứng viên kế tiếp: ${nextCandidate.staff_id} (${nextName}).`;

        if (rawResult === 'UNREACHABLE') {
          await pool.execute(
            `UPDATE Surge_Dispatches SET 
              selected_staff_id = ?,
              phone_contact = ?,
              suitability_score = ?,
              response_status = 'PENDING',
              coordinator_notes = ?,
              candidates_snapshot = ?
             WHERE id = ?`,
            [
              nextCandidate.staff_id,
              nextCandidate.phone_contact || '0908123456',
              nextCandidate.suitability_score || 85.0,
              coordinatorNote,
              JSON.stringify(nextSnapshot),
              dispatchId
            ]
          );
        } else {
          await pool.execute(
            `UPDATE Surge_Dispatches SET 
              selected_staff_id = ?,
              phone_contact = ?,
              suitability_score = ?,
              response_status = 'PENDING',
              rejection_reason = ?,
              coordinator_notes = ?,
              candidates_snapshot = ?
             WHERE id = ?`,
            [
              nextCandidate.staff_id,
              nextCandidate.phone_contact || '0908123456',
              nextCandidate.suitability_score || 85.0,
              note || 'Cán bộ bận nhiệm vụ đột xuất / từ chối có lý do.',
              coordinatorNote,
              JSON.stringify(nextSnapshot),
              dispatchId
            ]
          );
        }

        const updatedSession = this._formatDispatchSession({
          ...dispatch,
          selected_staff_id: nextCandidate.staff_id,
          responder_name: nextName,
          responder_role: nextCandidate.role || 'DOCTOR',
          phone_contact: nextCandidate.phone_contact || '0908123456',
          suitability_score: nextCandidate.suitability_score || 85.0,
          response_status: 'PENDING',
          coordinator_notes: coordinatorNote,
          candidates_snapshot: nextSnapshot
        });

        return {
          success: true,
          message:
            rawResult === 'UNREACHABLE'
              ? `Không liên lạc được cán bộ ${currentStaffId}. Hệ thống đã tự động chuyển sang ứng viên kế tiếp: ${nextName} (${nextCandidate.phone_contact || '0908123456'}).`
              : `Cán bộ ${currentStaffId} từ chối. Hệ thống đã chuyển sang ứng viên kế tiếp: ${nextName}.`,
          status: rawResult === 'UNREACHABLE' ? 'PROMOTED_NEXT' : 'REJECTED_AND_FALLBACK',
          promoted_candidate: nextCandidate,
          data: updatedSession
        };
      } else {
        // Đã gọi hết toàn bộ ứng viên trong danh sách dự phòng
        const exhaustedNote =
          note ||
          `Đã liên hệ hết danh sách ứng viên dự phòng trong On-Call Pool (Cuối cùng: ${currentStaffId} - ${rawResult}).`;

        if (rawResult === 'UNREACHABLE') {
          await pool.execute(
            `UPDATE Surge_Dispatches SET 
              response_status = 'UNREACHABLE',
              coordinator_notes = ?,
              candidates_snapshot = ?
             WHERE id = ?`,
            [exhaustedNote, JSON.stringify(updatedSnapshot), dispatchId]
          );
        } else {
          await pool.execute(
            `UPDATE Surge_Dispatches SET 
              response_status = 'REJECTED',
              rejection_reason = ?,
              coordinator_notes = ?,
              candidates_snapshot = ?
             WHERE id = ?`,
            [
              note || 'Cán bộ từ chối có lý do chính đáng.',
              exhaustedNote,
              JSON.stringify(updatedSnapshot),
              dispatchId
            ]
          );
        }

        const updatedSession = this._formatDispatchSession({
          ...dispatch,
          response_status: rawResult,
          coordinator_notes: exhaustedNote,
          candidates_snapshot: updatedSnapshot
        });

        return {
          success: true,
          message: `Không còn ứng viên dự phòng khác trong danh sách hiện tại sau khi liên hệ ${currentStaffId}.`,
          status: rawResult,
          data: updatedSession
        };
      }
    }

    const err = new Error('Kết quả cuộc gọi không hợp lệ.');
    err.statusCode = 400;
    throw err;
  },

  /**
   * Hoàn tất / Đóng phiên điều động tăng cường & bù đắp nhân lực
   */
  async resolveSurgeDispatch(dispatchId, payload = {}, actor = {}) {
    const resolution_notes =
      payload.resolution_notes ||
      payload.notes ||
      'Đã hoàn tất điều động tăng cường & bù đắp nhân lực, tình hình khoa phòng đã ổn định.';
    const resolverCode = actor.employee_code || actor.id || 'EMP-ADM-001';

    const [rows] = await pool.query('SELECT * FROM Surge_Dispatches WHERE id = ? LIMIT 1', [
      dispatchId
    ]);
    if (!rows || rows.length === 0) {
      const err = new Error(`Phiên điều động với mã "${dispatchId}" không tồn tại.`);
      err.statusCode = 404;
      throw err;
    }

    await pool.execute(
      `UPDATE Surge_Dispatches SET 
        status = 'RESOLVED',
        resolved_at = NOW(),
        resolved_by = ?,
        resolution_notes = ?
       WHERE id = ?`,
      [resolverCode, resolution_notes, dispatchId]
    );

    const updatedSession = this._formatDispatchSession({
      ...rows[0],
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      resolved_by: resolverCode,
      resolution_notes
    });

    return {
      success: true,
      message: `Đã kết thúc phiên điều động "${dispatchId}". Tình hình nhân lực khoa phòng đã ổn định.`,
      data: updatedSession
    };
  },

  /**
   * Seamless Clock-In Transition Integration (invoked inside attendanceService.clockIn)
   * Converts shift from ON_CALL to EMERGENCY_ACTIVE and flags QĐ 73/2011/QĐ-TTg allowance
   */
  async handleClockInSurgeTransition(staffId, clockInTime, connection = null) {
    const conn = connection || pool;

    const [activeSurges] = await conn.query(
      `SELECT * FROM Surge_Dispatches 
       WHERE selected_staff_id = ? 
         AND status = 'IN_PROGRESS' 
         AND response_status IN ('PENDING', 'ACCEPTED')
       ORDER BY created_at DESC 
       LIMIT 1`,
      [staffId]
    );

    if (!activeSurges || activeSurges.length === 0) {
      return { is_surge_active: false };
    }

    const surge = activeSurges[0];

    // 1. Update Surge_Dispatches actual_clock_in_time and response_status
    await conn.execute(
      `UPDATE Surge_Dispatches SET 
        actual_clock_in_time = ?,
        response_status = 'ACCEPTED'
       WHERE id = ?`,
      [clockInTime, surge.id]
    );

    // 2. Transition today's shift from ON_CALL or SCHEDULED to EMERGENCY_ACTIVE
    await conn.execute(
      `UPDATE Shifts SET 
        status = 'EMERGENCY_ACTIVE',
        shift_type = 'EMERGENCY_COVER'
       WHERE staff_id = ? 
         AND DATE(start_time) = DATE(?)
         AND status IN ('ON_CALL', 'SCHEDULED', 'IN_PROGRESS')
       LIMIT 1`,
      [staffId, clockInTime]
    );

    return {
      is_surge_active: true,
      dispatch_id: surge.id,
      department_code: surge.department_code,
      alert_level: surge.alert_level,
      allowance_note: `Huy động khẩn cấp theo QĐ 73/2011/QĐ-TTg (Phiên điều động: ${surge.id})`
    };
  }
};
