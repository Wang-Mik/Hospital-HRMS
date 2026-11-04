import pool from '../db.js';
import { randomUUID } from 'crypto';

/**
 * Trọng số 6 nhóm tiêu chí đánh giá KPI phân theo 4 nhóm chức danh
 * Theo Mục VI tài liệu KPI.md: Bác sĩ, Điều dưỡng, Kỹ thuật viên/Dược sĩ, Nhân viên hành chính
 */
export const ROLE_WEIGHTS = {
  DOCTOR: {
    discipline: 0.15,       // Nhóm 1: Chấp hành kỷ luật lao động
    task_completion: 0.20,  // Nhóm 2: Hoàn thành nhiệm vụ
    work_quality: 0.25,     // Nhóm 3: Chất lượng & Chuyên môn
    communication: 0.15,    // Nhóm 4: Giao tiếp & Ứng xử
    competence: 0.15,       // Nhóm 5: Năng lực & Trách nhiệm
    innovation: 0.10        // Nhóm 6: Đóng góp & Cải tiến
  },
  NURSE: {
    discipline: 0.20,
    task_completion: 0.15,
    work_quality: 0.20,
    communication: 0.25,
    competence: 0.10,
    innovation: 0.10
  },
  TECHNICIAN: {
    discipline: 0.20,
    task_completion: 0.25,
    work_quality: 0.25,
    communication: 0.10,
    competence: 0.15,
    innovation: 0.05
  },
  STAFF: {
    discipline: 0.25,
    task_completion: 0.30,
    work_quality: 0.15,
    communication: 0.15,
    competence: 0.10,
    innovation: 0.05
  }
};

/**
 * Ánh xạ chức vụ / vai trò của cán bộ y tế vào 1 trong 4 nhóm trọng số KPI
 */
export function getRoleWeightGroup(role) {
  const r = (role || '').toUpperCase();
  if (r.includes('DOC') || r === 'DEPARTMENT_HEAD' || r === 'HOSPITAL_DIRECTOR' || r === 'VICE_DIRECTOR') {
    return 'DOCTOR';
  }
  if (r.includes('NUR') || r === 'CHIEF_NURSE') {
    return 'NURSE';
  }
  if (r.includes('TECH') || r.includes('PHAR')) {
    return 'TECHNICIAN';
  }
  return 'STAFF';
}

export const kpiService = {
  /**
   * Get monthly KPI list with filters
   */
  async getMonthlyKpis(filters = {}) {
    const { month, department_code, staff_id, status } = filters;
    let sql = `
      SELECT 
        k.*,
        e.first_name,
        e.last_name,
        e.role,
        e.specialty,
        e.department_code,
        d.name as department_name
      FROM Monthly_KPIs k
      JOIN Employees e ON k.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      sql += ` AND k.kpi_month = ?`;
      params.push(month);
    }
    if (department_code && department_code !== 'ALL') {
      sql += ` AND e.department_code = ?`;
      params.push(department_code);
    }
    if (staff_id) {
      sql += ` AND k.staff_id = ?`;
      params.push(staff_id);
    }
    if (status) {
      sql += ` AND k.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY k.total_kpi_score DESC, e.last_name ASC`;
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Get KPI history for an individual staff member
   */
  async getStaffKpiHistory(staffId) {
    const [rows] = await pool.query(
      `SELECT * FROM Monthly_KPIs WHERE staff_id = ? ORDER BY kpi_month DESC`,
      [staffId]
    );
    return rows;
  },

  /**
   * Auto-calculate monthly KPI metrics from live shifts, attendance, and handovers
   * Phù hợp quy trình tự động theo Mục II và Mục IV tài liệu KPI.md
   */
  async autoComputeMonthlyKpi(kpiMonth, departmentCode = null) {
    if (!kpiMonth || !/^\d{4}-\d{2}$/.test(kpiMonth)) {
      throw new Error('Định dạng tháng KPI không hợp lệ (yêu cầu format YYYY-MM).');
    }

    let empSql = `SELECT employee_code, first_name, last_name, role, department_code FROM Employees WHERE status = 'ACTIVE'`;
    const empParams = [];
    if (departmentCode && departmentCode !== 'ALL') {
      empSql += ` AND department_code = ?`;
      empParams.push(departmentCode);
    }
    const [employees] = await pool.query(empSql, empParams);

    const results = [];

    for (const emp of employees) {
      const staffId = emp.employee_code;
      const roleGroup = getRoleWeightGroup(emp.role);
      const weights = ROLE_WEIGHTS[roleGroup] || ROLE_WEIGHTS.STAFF;

      // 1. Chấm công & Kỷ luật lao động (Nhóm 1)
      const [attRows] = await pool.query(
        `SELECT 
          COUNT(*) as total_attendance,
          SUM(CASE WHEN attendance_status = 'LATE' THEN 1 ELSE 0 END) as late_count,
          SUM(TIMESTAMPDIFF(MINUTE, clock_in_time, COALESCE(clock_out_time, DATE_ADD(clock_in_time, INTERVAL 8 HOUR)))) as total_minutes
         FROM Attendances
         WHERE staff_id = ? AND DATE_FORMAT(clock_in_time, '%Y-%m') = ?`,
        [staffId, kpiMonth]
      );

      const actualShifts = attRows[0]?.total_attendance || 0;
      const lateCount = attRows[0]?.late_count || 0;
      const actualHours = Math.round(((attRows[0]?.total_minutes || 0) / 60) * 10) / 10;
      const onTimeRate = actualShifts > 0
        ? Math.max(0, Math.min(100, Math.round(((actualShifts - lateCount) / actualShifts) * 1000) / 10))
        : 100.0;

      // Nhóm 1: Điểm chấp hành kỷ luật lao động (Thang 100)
      const scoreDiscipline = onTimeRate;

      // 2. Ca trực & Bàn giao ca lâm sàng (Nhóm 2 & Nhóm 3)
      const [shiftRows] = await pool.query(
        `SELECT id, requires_handover FROM Shifts 
         WHERE staff_id = ? AND DATE_FORMAT(start_time, '%Y-%m') = ? AND status != 'CANCELLED'`,
        [staffId, kpiMonth]
      );

      const handoverRequiredShifts = shiftRows.filter(s => s.requires_handover).length;
      let handoverCompleted = 0;
      if (handoverRequiredShifts > 0) {
        const shiftIds = shiftRows.filter(s => s.requires_handover).map(s => s.id);
        if (shiftIds.length > 0) {
          const [hoRows] = await pool.query(
            `SELECT COUNT(DISTINCT outgoing_shift_id) as completed_count FROM Shift_Handovers 
             WHERE outgoing_shift_id IN (?) AND status = 'COMPLETED'`,
            [shiftIds]
          );
          handoverCompleted = hoRows[0]?.completed_count || 0;
        }
      }
      const handoverRate = handoverRequiredShifts > 0
        ? Math.max(0, Math.min(100, Math.round((handoverCompleted / handoverRequiredShifts) * 1000) / 10))
        : 100.0;

      // Nhóm 2: Hoàn thành nhiệm vụ (tiến độ theo định mức 20 ca / 160h)
      const scheduledShiftCount = shiftRows.length;
      const scoreTaskCompletion = Math.max(60, Math.min(100, Math.round(((scheduledShiftCount >= 15 ? 95 : 85) + (actualShifts >= 15 ? 5 : 0)) * 10) / 10));

      // 3. Đọc dữ liệu cũ nếu đã từng đánh giá để bảo tồn điểm nhận xét con người
      const [existing] = await pool.query(
        `SELECT * FROM Monthly_KPIs WHERE staff_id = ? AND kpi_month = ? LIMIT 1`,
        [staffId, kpiMonth]
      );

      const scoreWorkQuality = existing[0]?.score_work_quality ?? (existing[0]?.clinical_performance_score ?? 90.0);
      const scoreCommunication = existing[0]?.score_communication ?? (existing[0]?.patient_satisfaction_score ?? 95.0);
      const scoreCompetence = existing[0]?.score_competence ?? 90.0;
      const scoreInnovation = existing[0]?.score_innovation ?? 80.0;

      const incidentCause = existing[0]?.incident_cause ?? 'NONE';
      const incidentPenalty = existing[0]?.incident_penalty_points ?? (existing[0]?.disciplinary_penalty_points ?? 0.0);

      // Điểm trừ sự cố chỉ áp dụng khi nguyên nhân là lỗi cá nhân (Mục V KPI.md)
      const effectivePenalty = incidentCause === 'INDIVIDUAL_ERROR' ? Number(incidentPenalty) : 0.0;

      // Tính tổng điểm theo bảng trọng số chức danh
      const rawScore =
        scoreDiscipline * weights.discipline +
        scoreTaskCompletion * weights.task_completion +
        scoreWorkQuality * weights.work_quality +
        scoreCommunication * weights.communication +
        scoreCompetence * weights.competence +
        scoreInnovation * weights.innovation;

      const totalScore = Math.max(0, Math.min(100, Math.round((rawScore - effectivePenalty) * 10) / 10));

      let grade = 'GRADE_A';
      if (totalScore >= 90.0) grade = 'GRADE_A';
      else if (totalScore >= 80.0) grade = 'GRADE_B';
      else if (totalScore >= 70.0) grade = 'GRADE_C';
      else grade = 'GRADE_D';

      const kpiId = existing[0]?.id || randomUUID();

      await pool.query(
        `INSERT INTO Monthly_KPIs (
          id, staff_id, kpi_month, target_shifts, actual_shifts, target_hours, actual_hours,
          on_time_attendance_rate, handover_compliance_rate,
          score_discipline, score_task_completion, score_work_quality,
          score_communication, score_competence, score_innovation,
          clinical_performance_score, patient_satisfaction_score,
          incident_cause, incident_penalty_points, disciplinary_penalty_points,
          total_kpi_score, kpi_grade, status
        ) VALUES (?, ?, ?, 20, ?, 160.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
        ON DUPLICATE KEY UPDATE
          actual_shifts = VALUES(actual_shifts),
          actual_hours = VALUES(actual_hours),
          on_time_attendance_rate = VALUES(on_time_attendance_rate),
          handover_compliance_rate = VALUES(handover_compliance_rate),
          score_discipline = VALUES(score_discipline),
          score_task_completion = VALUES(score_task_completion),
          score_work_quality = VALUES(score_work_quality),
          score_communication = VALUES(score_communication),
          score_competence = VALUES(score_competence),
          score_innovation = VALUES(score_innovation),
          clinical_performance_score = VALUES(clinical_performance_score),
          patient_satisfaction_score = VALUES(patient_satisfaction_score),
          total_kpi_score = VALUES(total_kpi_score),
          kpi_grade = VALUES(kpi_grade)`,
        [
          kpiId,
          staffId,
          kpiMonth,
          actualShifts,
          actualHours,
          onTimeRate,
          handoverRate,
          scoreDiscipline,
          scoreTaskCompletion,
          scoreWorkQuality,
          scoreCommunication,
          scoreCompetence,
          scoreInnovation,
          scoreWorkQuality,
          scoreCommunication,
          incidentCause,
          incidentPenalty,
          effectivePenalty,
          totalScore,
          grade
        ]
      );

      results.push({
        staff_id: staffId,
        staff_name: `${emp.last_name} ${emp.first_name}`.trim(),
        role: emp.role,
        role_group: roleGroup,
        kpi_month: kpiMonth,
        actual_shifts: actualShifts,
        actual_hours: actualHours,
        on_time_attendance_rate: onTimeRate,
        handover_compliance_rate: handoverRate,
        score_discipline: scoreDiscipline,
        score_task_completion: scoreTaskCompletion,
        score_work_quality: scoreWorkQuality,
        score_communication: scoreCommunication,
        score_competence: scoreCompetence,
        score_innovation: scoreInnovation,
        incident_cause: incidentCause,
        incident_penalty_points: effectivePenalty,
        total_kpi_score: totalScore,
        kpi_grade: grade
      });
    }

    return {
      kpi_month: kpiMonth,
      computed_count: results.length,
      data: results
    };
  },

  /**
   * Save manager evaluation for an employee's monthly KPI
   * Hỗ trợ đầy đủ 6 nhóm tiêu chí và quy định sự cố y khoa theo KPI.md
   */
  async saveKpiEvaluation(payload, actor = {}) {
    const {
      staff_id,
      actual_shifts,
      actual_hours,
      on_time_attendance_rate,
      handover_compliance_rate,
      score_discipline,
      score_task_completion,
      score_work_quality,
      score_communication,
      score_competence,
      score_innovation,
      clinical_performance_score,
      patient_satisfaction_score,
      incident_cause = 'NONE',
      incident_penalty_points = 0.0,
      incident_notes = null,
      disciplinary_penalty_points = 0.0,
      evaluation_notes = null
    } = payload;
    const kpi_month = payload.kpi_month || payload.month;

    if (!staff_id || !kpi_month) {
      throw new Error('staff_id và kpi_month là bắt buộc.');
    }

    // Xác định chức vụ để áp dụng bảng trọng số (từ payload, tiền tố mã nhân viên hoặc mặc định)
    const employeeRole = payload.role || (
      staff_id.includes('DOC') || staff_id.includes('HEAD') ? 'DOCTOR' :
      staff_id.includes('NUR') ? 'NURSE' :
      staff_id.includes('TECH') || staff_id.includes('PHAR') ? 'TECHNICIAN' : 'STAFF'
    );
    const roleGroup = getRoleWeightGroup(employeeRole);
    const weights = ROLE_WEIGHTS[roleGroup] || ROLE_WEIGHTS.DOCTOR;

    const [existing] = await pool.query(
      `SELECT * FROM Monthly_KPIs WHERE staff_id = ? AND kpi_month = ? LIMIT 1`,
      [staff_id, kpi_month]
    );

    const finalActualShifts = actual_shifts !== undefined ? Number(actual_shifts) : (existing[0]?.actual_shifts ?? 20);
    const finalActualHours = actual_hours !== undefined ? Number(actual_hours) : (existing[0]?.actual_hours ?? 160.0);
    const finalOnTimeRate = on_time_attendance_rate !== undefined ? Number(on_time_attendance_rate) : (existing[0]?.on_time_attendance_rate ?? 100.0);
    const finalHandoverRate = handover_compliance_rate !== undefined ? Number(handover_compliance_rate) : (existing[0]?.handover_compliance_rate ?? 100.0);

    // Điểm 6 nhóm tiêu chí (ưu tiên trường mới, fallback trường tương đương hoặc mặc định)
    const finalScoreDiscipline = score_discipline !== undefined ? Number(score_discipline) : (existing[0]?.score_discipline ?? finalOnTimeRate);
    const finalScoreTaskCompletion = score_task_completion !== undefined ? Number(score_task_completion) : (existing[0]?.score_task_completion ?? 90.0);
    const finalScoreWorkQuality = score_work_quality !== undefined
      ? Number(score_work_quality)
      : (clinical_performance_score !== undefined ? Number(clinical_performance_score) : (existing[0]?.score_work_quality ?? existing[0]?.clinical_performance_score ?? 90.0));
    const finalScoreCommunication = score_communication !== undefined
      ? Number(score_communication)
      : (patient_satisfaction_score !== undefined ? Number(patient_satisfaction_score) : (existing[0]?.score_communication ?? existing[0]?.patient_satisfaction_score ?? 95.0));
    const finalScoreCompetence = score_competence !== undefined ? Number(score_competence) : (existing[0]?.score_competence ?? 90.0);
    const finalScoreInnovation = score_innovation !== undefined ? Number(score_innovation) : (existing[0]?.score_innovation ?? 80.0);

    // Xử lý sự cố y khoa & sai sót chuyên môn (Mục V KPI.md)
    const finalIncidentCause = incident_cause || existing[0]?.incident_cause || 'NONE';
    const penaltyCandidate = Number(incident_penalty_points ?? disciplinary_penalty_points ?? existing[0]?.incident_penalty_points ?? 0.0);
    const effectivePenalty = finalIncidentCause === 'INDIVIDUAL_ERROR' ? Math.max(0, penaltyCandidate) : 0.0;
    const finalIncidentNotes = incident_notes || existing[0]?.incident_notes || null;

    // Tổng hợp điểm theo trọng số chức danh
    const rawScore =
      finalScoreDiscipline * weights.discipline +
      finalScoreTaskCompletion * weights.task_completion +
      finalScoreWorkQuality * weights.work_quality +
      finalScoreCommunication * weights.communication +
      finalScoreCompetence * weights.competence +
      finalScoreInnovation * weights.innovation;

    const totalScore = Math.max(0, Math.min(100, Math.round((rawScore - effectivePenalty) * 10) / 10));

    let grade = 'GRADE_A';
    if (totalScore >= 90.0) grade = 'GRADE_A';
    else if (totalScore >= 80.0) grade = 'GRADE_B';
    else if (totalScore >= 70.0) grade = 'GRADE_C';
    else grade = 'GRADE_D';

    const kpiId = existing[0]?.id || randomUUID();

    await pool.query(
      `INSERT INTO Monthly_KPIs (
        id, staff_id, kpi_month, target_shifts, actual_shifts, target_hours, actual_hours,
        on_time_attendance_rate, handover_compliance_rate,
        score_discipline, score_task_completion, score_work_quality,
        score_communication, score_competence, score_innovation,
        clinical_performance_score, patient_satisfaction_score,
        incident_cause, incident_penalty_points, incident_notes, disciplinary_penalty_points,
        total_kpi_score, kpi_grade,
        evaluation_notes, evaluated_by, status
      ) VALUES (?, ?, ?, 20, ?, 160.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
      ON DUPLICATE KEY UPDATE
        actual_shifts = VALUES(actual_shifts),
        actual_hours = VALUES(actual_hours),
        on_time_attendance_rate = VALUES(on_time_attendance_rate),
        handover_compliance_rate = VALUES(handover_compliance_rate),
        score_discipline = VALUES(score_discipline),
        score_task_completion = VALUES(score_task_completion),
        score_work_quality = VALUES(score_work_quality),
        score_communication = VALUES(score_communication),
        score_competence = VALUES(score_competence),
        score_innovation = VALUES(score_innovation),
        clinical_performance_score = VALUES(clinical_performance_score),
        patient_satisfaction_score = VALUES(patient_satisfaction_score),
        incident_cause = VALUES(incident_cause),
        incident_penalty_points = VALUES(incident_penalty_points),
        incident_notes = VALUES(incident_notes),
        disciplinary_penalty_points = VALUES(disciplinary_penalty_points),
        total_kpi_score = VALUES(total_kpi_score),
        kpi_grade = VALUES(kpi_grade),
        evaluation_notes = VALUES(evaluation_notes),
        evaluated_by = VALUES(evaluated_by),
        status = 'APPROVED'`,
      [
        kpiId,
        staff_id,
        kpi_month,
        finalActualShifts,
        finalActualHours,
        finalOnTimeRate,
        finalHandoverRate,
        finalScoreDiscipline,
        finalScoreTaskCompletion,
        finalScoreWorkQuality,
        finalScoreCommunication,
        finalScoreCompetence,
        finalScoreInnovation,
        finalScoreWorkQuality,
        finalScoreCommunication,
        finalIncidentCause,
        penaltyCandidate,
        finalIncidentNotes,
        effectivePenalty,
        totalScore,
        grade,
        evaluation_notes,
        actor.employee_code || 'EMP-ADM-001'
      ]
    );

    const [updated] = await pool.query(
      `SELECT k.*, e.first_name, e.last_name, e.role, e.department_code, d.name as department_name 
       FROM Monthly_KPIs k 
       JOIN Employees e ON k.staff_id = e.employee_code 
       LEFT JOIN Departments d ON e.department_code = d.department_code 
       WHERE k.id = ?`,
      [kpiId]
    );
    return updated[0];
  }
};

export default kpiService;
