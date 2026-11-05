import pool from '../db.js';
import { randomUUID } from 'crypto';

/**
 * Smart Clinical Surge Dispatcher & On-Call Fill-Gap Recommender Service
 * Conforms to: Quy chế Bệnh viện (QĐ 1895/1997/QĐ-BYT), QĐ 73/2011/QĐ-TTg, Luật KBCB 2023
 */
export const surgeDispatchService = {
  /**
   * Scan On-Call Pool and calculate Multi-Objective Suitability Score
   */
  async getCandidatesForSurge(departmentCode, options = {}) {
    const { target_date = null, required_role = null } = options;
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

    if (required_role && required_role !== 'ALL') {
      sql += ` AND e.role = ?`;
      params.push(required_role);
    }

    const [employees] = await pool.query(sql, params);

    // 2. Query Medical Licenses verification & expiration
    const [licenses] = await pool.query(
      `SELECT employee_id, license_number, verification_status, expiration_date 
       FROM Medical_Licenses`
    );
    const licenseMap = new Map();
    for (const lic of licenses) {
      licenseMap.set(lic.employee_id, lic);
    }

    // 3. Query Night Shifts in the last 24 hours to enforce Biological Rest Interval
    const [recentNightShifts] = await pool.query(
      `SELECT staff_id, end_time FROM Shifts 
       WHERE shift_type = 'NIGHT' 
         AND end_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND status != 'CANCELLED'`
    );
    const restingStaffSet = new Set(recentNightShifts.map(s => s.staff_id));

    // 4. Query staff currently locked in another active Surge Dispatch
    const [activeDispatches] = await pool.query(
      `SELECT selected_staff_id FROM Surge_Dispatches 
       WHERE status = 'IN_PROGRESS' AND response_status IN ('PENDING', 'ACCEPTED')`
    );
    const busySurgeStaffSet = new Set(activeDispatches.map(d => d.selected_staff_id).filter(Boolean));

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
    for (const att of monthlyAttendances) {
      hoursMap.set(att.staff_id, Math.round(((att.total_minutes || 0) / 60) * 10) / 10);
    }

    const eligibleCandidates = [];
    const excludedCandidates = [];

    for (const emp of employees) {
      const staffCode = emp.employee_code;
      const license = licenseMap.get(emp.emp_id);
      const isResting = restingStaffSet.has(staffCode);
      const isBusySurge = busySurgeStaffSet.has(staffCode);
      const monthHours = hoursMap.get(staffCode) || 0;

      // HARD CONSTRAINT 1: Biological Rest Interval Guard (24h post-night shift)
      if (isResting) {
        excludedCandidates.push({
          staff_id: staffCode,
          staff_name: `${emp.last_name} ${emp.first_name}`,
          role: emp.role,
          specialty: emp.specialty,
          phone: emp.phone || '0908123456',
          exclusion_reason: 'Vi phạm khoảng nghỉ an toàn 24h sau ca trực đêm (RESTING_POST_NIGHT theo QĐ 1895/1997/QĐ-BYT).'
        });
        continue;
      }

      // HARD CONSTRAINT 2: Legal Medical License verification & expiration
      const isLicenseExpired = license && license.expiration_date && new Date(license.expiration_date) < new Date(dateStr);
      const isLicenseInvalid = !license || license.verification_status !== 'VERIFIED' || isLicenseExpired;
      if (isLicenseInvalid && (emp.role === 'DOCTOR' || emp.role === 'DEPARTMENT_HEAD' || emp.role === 'CHIEF_NURSE' || emp.role === 'NURSE')) {
        excludedCandidates.push({
          staff_id: staffCode,
          staff_name: `${emp.last_name} ${emp.first_name}`,
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
          staff_name: `${emp.last_name} ${emp.first_name}`,
          role: emp.role,
          specialty: emp.specialty,
          phone: emp.phone || '0908123456',
          exclusion_reason: 'Đang tham gia một phiên điều động cấp cứu khác chưa kết thúc.'
        });
        continue;
      }

      // MULTI-OBJECTIVE SOFT SCORING (Thang điểm 100)
      let scoreSpecialty = 20.0;
      const spec = (emp.specialty || '').toLowerCase();
      if (spec.includes('cấp cứu') || spec.includes('hồi sức') || spec.includes('ngoại') || spec.includes('phẫu thuật')) {
        scoreSpecialty = 35.0; // Điểm tối đa cho đúng chuyên khoa cấp cứu / hồi sức / ngoại
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
      const scoreWorkload = Math.max(10.0, Math.min(35.0, Math.round((35.0 * (1 - Math.min(monthHours, 200) / 220)) * 10) / 10));

      const totalScore = Math.min(100.0, Math.round((scoreSpecialty + scoreSeniority + scoreWorkload) * 10) / 10);

      eligibleCandidates.push({
        staff_id: staffCode,
        staff_name: `${emp.last_name} ${emp.first_name}`,
        role: emp.role,
        specialty: emp.specialty,
        phone_contact: emp.phone || '0908123456',
        department_code: emp.department_code,
        department_name: emp.department_name,
        has_on_call_today: Boolean(emp.on_call_shift_id),
        month_hours: monthHours,
        suitability_score: totalScore,
        estimated_arrival_minutes: 15
      });
    }

    // Sort eligible candidates by: Has on-call today first -> Suitability score DESC
    eligibleCandidates.sort((a, b) => {
      if (a.has_on_call_today !== b.has_on_call_today) {
        return a.has_on_call_today ? -1 : 1;
      }
      return b.suitability_score - a.suitability_score;
    });

    const topCandidates = eligibleCandidates.slice(0, 5).map((c, idx) => ({
      ...c,
      rank_order: idx + 1
    }));

    return {
      department_code: departmentCode,
      target_date: dateStr,
      top_candidates: topCandidates,
      total_eligible: eligibleCandidates.length,
      excluded_candidates: excludedCandidates
    };
  },

  /**
   * Create an emergency surge dispatch session
   */
  async createSurgeDispatch(payload, actor = {}) {
    const {
      department_code,
      alert_level = 'LEVEL_1_SURGE',
      reason,
      clinical_notes = null,
      selected_staff_id = null
    } = payload;

    if (!department_code || !reason) {
      const err = new Error('Mã khoa phòng (department_code) và lý do điều động (reason) là bắt buộc.');
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

      if (existingActive.length > 0) {
        const err = new Error(`Khoa ${department_code} đang có một phiên điều động khẩn cấp đang kích hoạt (Mã: ${existingActive[0].id}). Vui lòng xử lý hoặc kết thúc phiên hiện tại trước khi tạo mới.`);
        err.statusCode = 409;
        throw err;
      }

      // Get candidates snapshot
      const candidatesResult = await this.getCandidatesForSurge(department_code);
      const topCandidates = candidatesResult.top_candidates || [];

      let primaryCandidate = null;
      if (selected_staff_id) {
        primaryCandidate = topCandidates.find(c => c.staff_id === selected_staff_id) || {
          staff_id: selected_staff_id,
          phone_contact: '0908123456',
          suitability_score: 90.0,
          estimated_arrival_minutes: 15
        };
      } else if (topCandidates.length > 0) {
        primaryCandidate = topCandidates[0];
      }

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
          JSON.stringify(topCandidates)
        ]
      );

      // Create standard system notification quietly for the selected staff (no sound, no popup)
      if (primaryCandidate?.staff_id) {
        try {
          const notifId = randomUUID();
          await connection.execute(
            `INSERT INTO Notifications (id, target_staff_id, title, content, type, is_read)
             VALUES (?, ?, ?, ?, 'EMERGENCY_SURGE', 0)`,
            [
              notifId,
              primaryCandidate.staff_id,
              'LỆNH ĐIỀU ĐỘNG CẤP CỨU KHẨN CẤP',
              `Khoa ${department_code} kích hoạt điều động tăng cường (${alert_level}). Lý do: ${reason}. Vui lòng liên hệ bàn trực cấp cứu.`
            ]
          );
        } catch (notifErr) {
          console.warn('[surgeDispatchService] Quiet notification error:', notifErr.message);
        }
      }

      await connection.commit();

      const [newRow] = await pool.query('SELECT * FROM Surge_Dispatches WHERE id = ?', [dispatchId]);

      return {
        success: true,
        message: `Đã phát lệnh điều động cấp cứu thành công cho khoa ${department_code}.`,
        data: newRow[0]
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Get all active surge dispatches
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
    return rows;
  },

  /**
   * Dispatcher logs call result directly from Cockpit
   */
  async logCallResult(dispatchId, payload, actor = {}) {
    const {
      call_result, // 'ACCEPTED_15M' | 'ACCEPTED_30M' | 'UNREACHABLE' | 'REJECTED'
      note = null
    } = payload;

    if (!call_result) {
      const err = new Error('Kết quả cuộc gọi (call_result) là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    const [rows] = await pool.query('SELECT * FROM Surge_Dispatches WHERE id = ? LIMIT 1', [dispatchId]);
    if (rows.length === 0) {
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

    const candidatesSnapshot = typeof dispatch.candidates_snapshot === 'string'
      ? JSON.parse(dispatch.candidates_snapshot || '[]')
      : (dispatch.candidates_snapshot || []);

    if (call_result === 'ACCEPTED_15M' || call_result === 'ACCEPTED_30M') {
      const eta = call_result === 'ACCEPTED_15M' ? 15 : 30;
      await pool.execute(
        `UPDATE Surge_Dispatches SET 
          response_status = 'ACCEPTED',
          estimated_arrival_minutes = ?,
          acknowledged_at = NOW(),
          coordinator_notes = ?
         WHERE id = ?`,
        [eta, note || `Bác sĩ đã nghe máy và xác nhận có mặt trong ${eta} phút.`, dispatchId]
      );

      return {
        success: true,
        message: `Bác sĩ ${dispatch.selected_staff_id} đã xác nhận có mặt trong ${eta} phút.`,
        status: 'ACCEPTED',
        estimated_arrival_minutes: eta
      };
    }

    if (call_result === 'UNREACHABLE') {
      // Auto-fallback: Promote Candidate #2 from snapshot
      const currentStaffId = dispatch.selected_staff_id;
      const nextCandidate = candidatesSnapshot.find(c => c.staff_id !== currentStaffId);

      if (nextCandidate) {
        await pool.execute(
          `UPDATE Surge_Dispatches SET 
            selected_staff_id = ?,
            phone_contact = ?,
            suitability_score = ?,
            response_status = 'PENDING',
            coordinator_notes = ?
           WHERE id = ?`,
          [
            nextCandidate.staff_id,
            nextCandidate.phone_contact || '0908123456',
            nextCandidate.suitability_score || 85.0,
            `Không nghe máy bác sĩ ${currentStaffId}. Tự động chuyển ứng viên kế tiếp: ${nextCandidate.staff_id} (${nextCandidate.staff_name}).`,
            dispatchId
          ]
        );

        return {
          success: true,
          message: `Không liên lạc được bác sĩ ${currentStaffId}. Hệ thống đã tự động chuyển sang ứng viên kế tiếp: ${nextCandidate.staff_name} (${nextCandidate.phone_contact}).`,
          status: 'PROMOTED_NEXT',
          promoted_candidate: nextCandidate
        };
      } else {
        await pool.execute(
          `UPDATE Surge_Dispatches SET 
            response_status = 'UNREACHABLE',
            coordinator_notes = ?
           WHERE id = ?`,
          [note || `Không liên lạc được bác sĩ ${currentStaffId} và hết ứng viên dự phòng trong On-Call Pool.`, dispatchId]
        );

        return {
          success: true,
          message: `Không liên lạc được bác sĩ ${currentStaffId}. Hiện không còn ứng viên dự phòng khác trong danh sách On-call.`,
          status: 'UNREACHABLE'
        };
      }
    }

    if (call_result === 'REJECTED') {
      const currentStaffId = dispatch.selected_staff_id;
      const nextCandidate = candidatesSnapshot.find(c => c.staff_id !== currentStaffId);

      if (nextCandidate) {
        await pool.execute(
          `UPDATE Surge_Dispatches SET 
            selected_staff_id = ?,
            phone_contact = ?,
            suitability_score = ?,
            response_status = 'PENDING',
            rejection_reason = ?,
            coordinator_notes = ?
           WHERE id = ?`,
          [
            nextCandidate.staff_id,
            nextCandidate.phone_contact || '0908123456',
            nextCandidate.suitability_score || 85.0,
            note || 'Bác sĩ từ chối có lý do chính đáng.',
            `Bác sĩ ${currentStaffId} từ chối. Chuyển sang ứng viên: ${nextCandidate.staff_id}.`,
            dispatchId
          ]
        );

        return {
          success: true,
          message: `Bác sĩ ${currentStaffId} từ chối. Hệ thống đã chuyển sang ứng viên kế tiếp: ${nextCandidate.staff_name}.`,
          status: 'REJECTED_AND_FALLBACK',
          promoted_candidate: nextCandidate
        };
      } else {
        await pool.execute(
          `UPDATE Surge_Dispatches SET 
            response_status = 'REJECTED',
            rejection_reason = ?
           WHERE id = ?`,
          [note || 'Bác sĩ từ chối có lý do chính đáng.', dispatchId]
        );

        return {
          success: true,
          message: `Bác sĩ ${currentStaffId} từ chối nhận lệnh.`,
          status: 'REJECTED'
        };
      }
    }

    return { success: false, message: 'Kết quả cuộc gọi không hợp lệ.' };
  },

  /**
   * Resolve an emergency surge dispatch session
   */
  async resolveSurgeDispatch(dispatchId, payload = {}, actor = {}) {
    const { resolution_notes = 'Tình hình cấp cứu tại khoa đã ổn định và kiểm soát an toàn.' } = payload;
    const resolverCode = actor.employee_code || actor.id || 'EMP-ADM-001';

    const [rows] = await pool.query('SELECT * FROM Surge_Dispatches WHERE id = ? LIMIT 1', [dispatchId]);
    if (rows.length === 0) {
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

    return {
      success: true,
      message: `Đã kết thúc phiên điều động cấp cứu "${dispatchId}". Tình hình buồng bệnh đã ổn định.`
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

    if (activeSurges.length === 0) {
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
