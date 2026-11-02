import pool from '../db.js';
import { randomUUID } from 'crypto';

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

      // 1. Attendance & Shift Hours
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

      // 2. Handover Compliance
      const [shiftRows] = await pool.query(
        `SELECT id, requires_handover FROM Shifts 
         WHERE staff_id = ? AND DATE_FORMAT(start_time, '%Y-%m') = ? AND status != 'CANCELLED'`,
        [staffId, kpiMonth]
      );

      const handoverRequiredShifts = shiftRows.filter(s => s.requires_handover).length;
      let handoverCompleted = 0;
      if (handoverRequiredShifts > 0) {
        const shiftIds = shiftRows.filter(s => s.requires_handover).map(s => s.id);
        const [hoRows] = await pool.query(
          `SELECT COUNT(DISTINCT outgoing_shift_id) as completed_count FROM Shift_Handovers 
           WHERE outgoing_shift_id IN (?) AND status = 'COMPLETED'`,
          [shiftIds]
        );
        handoverCompleted = hoRows[0]?.completed_count || 0;
      }
      const handoverRate = handoverRequiredShifts > 0
        ? Math.max(0, Math.min(100, Math.round((handoverCompleted / handoverRequiredShifts) * 1000) / 10))
        : 100.0;

      // 3. Existing KPI record to preserve clinical scores if already evaluated
      const [existing] = await pool.query(
        `SELECT * FROM Monthly_KPIs WHERE staff_id = ? AND kpi_month = ? LIMIT 1`,
        [staffId, kpiMonth]
      );

      const clinicalScore = existing[0]?.clinical_performance_score ?? 90.0;
      const patientScore = existing[0]?.patient_satisfaction_score ?? 95.0;
      const penalty = existing[0]?.disciplinary_penalty_points ?? 0.0;

      // Weighted score: 20% on-time + 20% handover + 30% clinical + 30% patient - penalty
      const totalScore = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            (onTimeRate * 0.2 + handoverRate * 0.2 + clinicalScore * 0.3 + patientScore * 0.3 - penalty) * 10
          ) / 10
        )
      );

      let grade = 'GRADE_A';
      if (totalScore >= 90.0) grade = 'GRADE_A';
      else if (totalScore >= 80.0) grade = 'GRADE_B';
      else if (totalScore >= 70.0) grade = 'GRADE_C';
      else grade = 'GRADE_D';

      const kpiId = existing[0]?.id || randomUUID();

      await pool.query(
        `INSERT INTO Monthly_KPIs (
          id, staff_id, kpi_month, target_shifts, actual_shifts, target_hours, actual_hours,
          on_time_attendance_rate, handover_compliance_rate, clinical_performance_score,
          patient_satisfaction_score, disciplinary_penalty_points, total_kpi_score, kpi_grade,
          status
        ) VALUES (?, ?, ?, 20, ?, 160.0, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
        ON DUPLICATE KEY UPDATE
          actual_shifts = VALUES(actual_shifts),
          actual_hours = VALUES(actual_hours),
          on_time_attendance_rate = VALUES(on_time_attendance_rate),
          handover_compliance_rate = VALUES(handover_compliance_rate),
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
          clinicalScore,
          patientScore,
          penalty,
          totalScore,
          grade
        ]
      );

      results.push({
        staff_id: staffId,
        staff_name: `${emp.last_name} ${emp.first_name}`.trim(),
        kpi_month: kpiMonth,
        actual_shifts: actualShifts,
        actual_hours: actualHours,
        on_time_attendance_rate: onTimeRate,
        handover_compliance_rate: handoverRate,
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
   */
  async saveKpiEvaluation(payload, actor = {}) {
    const {
      staff_id,
      clinical_performance_score = 90.0,
      patient_satisfaction_score = 95.0,
      disciplinary_penalty_points = 0.0,
      evaluation_notes = null
    } = payload;
    const kpi_month = payload.kpi_month || payload.month;

    if (!staff_id || !kpi_month) {
      throw new Error('staff_id và kpi_month là bắt buộc.');
    }

    const [existing] = await pool.query(
      `SELECT * FROM Monthly_KPIs WHERE staff_id = ? AND kpi_month = ? LIMIT 1`,
      [staff_id, kpi_month]
    );

    const onTimeRate = existing[0]?.on_time_attendance_rate ?? 100.0;
    const handoverRate = existing[0]?.handover_compliance_rate ?? 100.0;
    const actualShifts = existing[0]?.actual_shifts ?? 20;
    const actualHours = existing[0]?.actual_hours ?? 160.0;

    const totalScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (onTimeRate * 0.2 +
            handoverRate * 0.2 +
            Number(clinical_performance_score) * 0.3 +
            Number(patient_satisfaction_score) * 0.3 -
            Number(disciplinary_penalty_points)) *
            10
        ) / 10
      )
    );

    let grade = 'GRADE_A';
    if (totalScore >= 90.0) grade = 'GRADE_A';
    else if (totalScore >= 80.0) grade = 'GRADE_B';
    else if (totalScore >= 70.0) grade = 'GRADE_C';
    else grade = 'GRADE_D';

    const kpiId = existing[0]?.id || randomUUID();

    await pool.query(
      `INSERT INTO Monthly_KPIs (
        id, staff_id, kpi_month, target_shifts, actual_shifts, target_hours, actual_hours,
        on_time_attendance_rate, handover_compliance_rate, clinical_performance_score,
        patient_satisfaction_score, disciplinary_penalty_points, total_kpi_score, kpi_grade,
        evaluation_notes, evaluated_by, status
      ) VALUES (?, ?, ?, 20, ?, 160.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
      ON DUPLICATE KEY UPDATE
        clinical_performance_score = VALUES(clinical_performance_score),
        patient_satisfaction_score = VALUES(patient_satisfaction_score),
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
        actualShifts,
        actualHours,
        onTimeRate,
        handoverRate,
        clinical_performance_score,
        patient_satisfaction_score,
        disciplinary_penalty_points,
        totalScore,
        grade,
        evaluation_notes,
        actor.employee_code || 'EMP-ADM-001'
      ]
    );

    const [updated] = await pool.query(
      `SELECT k.*, e.first_name, e.last_name, e.role FROM Monthly_KPIs k JOIN Employees e ON k.staff_id = e.employee_code WHERE k.id = ?`,
      [kpiId]
    );
    return updated[0];
  }
};

export default kpiService;
