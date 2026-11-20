import { randomUUID } from 'crypto';
import pool from '../db.js';
import auditService from './auditService.js';
import { ROLE_GROUPS, hasAnyRole } from '../constants/roles.js';

const WORK_HOURS_SQL_EXPR = `CASE WHEN a.clock_out_time IS NOT NULL AND a.clock_out_time >= a.clock_in_time THEN TIMESTAMPDIFF(MINUTE, a.clock_in_time, a.clock_out_time) / 60.0 ELSE 0 END`;

function normalizeDateOnly(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }
  const str = String(val);
  return str.includes('T') ? str.split('T')[0] : str.slice(0, 10);
}

function normalizePaySlipInput(data) {
  const base_pay = Number(data.base_pay) || 0;
  const night_differential = Number(data.night_differential) || 0;
  const overtime_pay = Number(data.overtime_pay) || 0;
  const on_call_allowance = Number(data.on_call_allowance) || 0;
  const surgery_allowance = Number(data.surgery_allowance) || 0;
  const kpi_bonus = Number(data.kpi_bonus) || 0;
  const social_insurance = Number(data.social_insurance) || 0;
  const tax_deductions = Number(data.tax_deductions) || 0;
  const other_deductions = Number(data.other_deductions) || 0;

  const gross =
    base_pay +
    night_differential +
    overtime_pay +
    on_call_allowance +
    surgery_allowance +
    kpi_bonus;
  const totalDeductions = social_insurance + tax_deductions + other_deductions;

  const net_pay =
    data.net_pay !== undefined && data.net_pay !== null && data.net_pay !== ''
      ? Number(data.net_pay) || 0
      : Math.max(0, Math.round(gross - totalDeductions));

  return {
    base_pay,
    night_differential,
    overtime_pay,
    on_call_allowance,
    surgery_allowance,
    kpi_bonus,
    social_insurance,
    tax_deductions,
    other_deductions,
    net_pay,
    status: data.status || 'DRAFT',
    import_source: data.import_source || 'SYSTEM_AUTO',
    notes: data.notes || null
  };
}

export const payrollService = {
  /**
   * Create payroll run
   */
  async createPayrollRun(data) {
    const { start_date, end_date, status = 'DRAFT' } = data;
    const runId = randomUUID();
    const formattedStartDate = normalizeDateOnly(start_date);
    const formattedEndDate = normalizeDateOnly(end_date);

    const insertSql = `
      INSERT INTO Payroll_Runs (id, start_date, end_date, status)
      VALUES (?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      runId,
      formattedStartDate,
      formattedEndDate,
      status
    ]);

    return {
      id: runId,
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      status
    };
  },

  /**
   * Get all payroll runs with optional status filter
   */
  async getAllPayrollRuns(status = null) {
    let sql = `
      SELECT 
        pr.*,
        COUNT(ps.id) AS employee_count,
        COALESCE(SUM(ps.net_pay), 0) AS total_disbursed
      FROM Payroll_Runs pr
      LEFT JOIN Pay_Slips ps ON pr.id = ps.run_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND pr.status = ?';
      params.push(status);
    }

    sql += ' GROUP BY pr.id ORDER BY pr.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Get payroll run by ID
   */
  async getPayrollRunById(id) {
    const sql = `
      SELECT 
        pr.*,
        COUNT(ps.id) AS employee_count,
        COALESCE(SUM(ps.net_pay), 0) AS total_disbursed
      FROM Payroll_Runs pr
      LEFT JOIN Pay_Slips ps ON pr.id = ps.run_id
      WHERE pr.id = ?
      GROUP BY pr.id
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Get payslips for a staff member with joined pay rate & allowance/deduction fields
   */
  async getPaySlipsByStaffId(staffId) {
    const sql = `
      SELECT 
        ps.id,
        ps.run_id,
        ps.staff_id,
        ps.base_pay,
        ps.night_differential,
        ps.overtime_pay,
        ps.on_call_allowance,
        ps.surgery_allowance,
        ps.kpi_bonus,
        ps.social_insurance,
        ps.tax_deductions,
        ps.other_deductions,
        ps.net_pay,
        ps.status,
        ps.import_source,
        ps.notes,
        ps.created_at,
        ps.updated_at,
        pr.start_date AS run_start_date,
        pr.end_date AS run_end_date,
        pr.status AS run_status,
        COALESCE(prate.base_hourly_rate, ROUND(ps.base_pay / 176, 0)) AS base_hourly_rate,
        prate.tax_tier
      FROM Pay_Slips ps
      LEFT JOIN Payroll_Runs pr ON ps.run_id = pr.id
      LEFT JOIN Pay_Rates prate ON ps.staff_id = prate.staff_id
      WHERE ps.staff_id = ?
      ORDER BY ps.created_at DESC
    `;
    const [rows] = await pool.query(sql, [staffId]);
    return rows;
  },

  /**
   * Get all payslips inside a specific payroll run, cross-referenced with actual attendance/overtime hours
   */
  async getPaySlipsByRunId(runId) {
    const run = await this.getPayrollRunById(runId);
    if (!run) {
      const err = new Error(`Payroll run not found with ID: ${runId}`);
      err.statusCode = 404;
      throw err;
    }

    const startStr = `${normalizeDateOnly(run.start_date)} 00:00:00`;
    const endStr = `${normalizeDateOnly(run.end_date)} 23:59:59`;

    const sql = `
      SELECT 
        ps.id,
        ps.run_id,
        ps.staff_id,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name,
        e.department_code,
        d.name AS department_name,
        e.role AS staff_role,
        ps.base_pay,
        ps.night_differential,
        ps.overtime_pay,
        ps.on_call_allowance,
        ps.surgery_allowance,
        ps.kpi_bonus,
        ps.social_insurance,
        ps.tax_deductions,
        ps.other_deductions,
        ps.net_pay,
        ps.status,
        ps.import_source,
        ps.notes,
        ps.created_at,
        ps.updated_at,
        COALESCE(att.actual_work_hours, 0) AS actual_work_hours,
        COALESCE(att.approved_overtime_hours, 0) AS approved_overtime_hours,
        COALESCE(att.night_shift_count, 0) AS night_shift_count
      FROM Pay_Slips ps
      LEFT JOIN Employees e ON ps.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      LEFT JOIN (
        SELECT
          a.staff_id,
          ROUND(SUM(${WORK_HOURS_SQL_EXPR}), 2) AS actual_work_hours,
          ROUND(SUM(
            CASE
              WHEN a.overrun_approval_status IN ('AUTO_APPROVED', 'APPROVED') AND a.overtime_minutes > 0 THEN (a.overtime_minutes / 60.0)
              WHEN a.attendance_status = 'OVERTIME' AND a.overtime_minutes > 0 THEN (a.overtime_minutes / 60.0)
              ELSE 0
            END
          ), 2) AS approved_overtime_hours,
          SUM(CASE WHEN s.shift_type = 'NIGHT' THEN 1 ELSE 0 END) AS night_shift_count
        FROM Attendances a
        LEFT JOIN Shifts s ON a.shift_id = s.id
        WHERE a.clock_in_time >= ? AND a.clock_in_time <= ?
        GROUP BY a.staff_id
      ) att ON ps.staff_id = att.staff_id
      WHERE ps.run_id = ?
      ORDER BY e.department_code ASC, ps.staff_id ASC
    `;

    const [rows] = await pool.query(sql, [startStr, endStr, runId]);

    const slips = rows.map((row) => {
      const approvedOt = Number(row.approved_overtime_hours || 0);
      const otPay = Number(row.overtime_pay || 0);
      const nightCount = Number(row.night_shift_count || 0);
      const nightPay = Number(row.night_differential || 0);

      let discrepancy_warning = null;
      if (approvedOt > 0 && otPay === 0) {
        discrepancy_warning = `Có ${approvedOt}h vượt trực đã duyệt nhưng tiền tăng ca = 0`;
      } else if (nightCount > 0 && nightPay === 0) {
        discrepancy_warning = `Có ${nightCount} ca trực đêm nhưng phụ cấp trực đêm = 0`;
      }

      return {
        ...row,
        discrepancy_warning
      };
    });

    const summary = slips.reduce(
      (acc, s) => {
        const gross =
          Number(s.base_pay || 0) +
          Number(s.night_differential || 0) +
          Number(s.overtime_pay || 0) +
          Number(s.on_call_allowance || 0) +
          Number(s.surgery_allowance || 0) +
          Number(s.kpi_bonus || 0);
        const deductions =
          Number(s.social_insurance || 0) +
          Number(s.tax_deductions || 0) +
          Number(s.other_deductions || 0);
        acc.total_gross += gross;
        acc.total_deductions += deductions;
        acc.total_net_pay += Number(s.net_pay || 0);
        if (s.discrepancy_warning) acc.mismatch_count += 1;
        return acc;
      },
      { total_slips: slips.length, total_gross: 0, total_deductions: 0, total_net_pay: 0, mismatch_count: 0 }
    );

    return { run, summary, slips };
  },

  /**
   * Export aggregated timesheets, night shifts, approved overruns & KPI ratings for Accounting (DEP-TCKT)
   */
  async exportRunTimesheets(runId) {
    const run = await this.getPayrollRunById(runId);
    if (!run) {
      const err = new Error(`Payroll run not found with ID: ${runId}`);
      err.statusCode = 404;
      throw err;
    }

    const startDate = normalizeDateOnly(run.start_date);
    const endDate = normalizeDateOnly(run.end_date);
    const startStr = `${startDate} 00:00:00`;
    const endStr = `${endDate} 23:59:59`;
    const evalMonth = endDate.slice(0, 7);

    const sql = `
      SELECT
        e.employee_code AS staff_id,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name,
        e.department_code,
        d.name AS department_name,
        e.role,
        COALESCE(pr.base_hourly_rate, 0) AS base_hourly_rate,
        COALESCE(pr.tax_tier, 'TIER_1') AS tax_tier,
        COALESCE(att.total_work_hours, 0) AS total_work_hours,
        COALESCE(att.approved_overtime_hours, 0) AS approved_overtime_hours,
        COALESCE(att.late_count, 0) AS late_count,
        COALESCE(sh.night_shifts, 0) AS night_shifts,
        COALESCE(sh.on_call_shifts, 0) AS on_call_shifts,
        COALESCE(sh.surge_shifts, 0) AS surge_shifts,
        COALESCE(lv.approved_leave_days, 0) AS approved_leave_days,
        kpi.total_kpi_score AS kpi_score,
        kpi.kpi_grade AS kpi_grade
      FROM Employees e
      LEFT JOIN Departments d ON e.department_code = d.department_code
      LEFT JOIN Pay_Rates pr ON e.employee_code = pr.staff_id
      LEFT JOIN (
        SELECT
          a.staff_id,
          ROUND(SUM(${WORK_HOURS_SQL_EXPR}), 2) AS total_work_hours,
          ROUND(SUM(
            CASE
              WHEN a.overrun_approval_status IN ('AUTO_APPROVED', 'APPROVED') AND a.overtime_minutes > 0 THEN (a.overtime_minutes / 60.0)
              WHEN a.attendance_status = 'OVERTIME' AND a.overtime_minutes > 0 THEN (a.overtime_minutes / 60.0)
              ELSE 0
            END
          ), 2) AS approved_overtime_hours,
          SUM(CASE WHEN a.attendance_status = 'LATE' THEN 1 ELSE 0 END) AS late_count
        FROM Attendances a
        WHERE a.clock_in_time >= ? AND a.clock_in_time <= ?
        GROUP BY a.staff_id
      ) att ON e.employee_code = att.staff_id
      LEFT JOIN (
        SELECT
          s.staff_id,
          SUM(CASE WHEN s.shift_type = 'NIGHT' THEN 1 ELSE 0 END) AS night_shifts,
          SUM(CASE WHEN s.is_24h_on_call = TRUE OR s.shift_type = 'ON_CALL' THEN 1 ELSE 0 END) AS on_call_shifts,
          SUM(CASE WHEN s.shift_type = 'EMERGENCY_COVER' THEN 1 ELSE 0 END) AS surge_shifts
        FROM Shifts s
        WHERE s.start_time >= ? AND s.start_time <= ? AND s.status != 'CANCELLED'
        GROUP BY s.staff_id
      ) sh ON e.employee_code = sh.staff_id
      LEFT JOIN (
        SELECT
          lr.staff_id,
          SUM(COALESCE(lr.days_requested, 1)) AS approved_leave_days
        FROM Leave_Requests lr
        WHERE lr.status = 'APPROVED' AND lr.start_date <= ? AND lr.end_date >= ?
        GROUP BY lr.staff_id
      ) lv ON e.employee_code = lv.staff_id
      LEFT JOIN Monthly_Kpis kpi ON e.employee_code = kpi.staff_id AND kpi.kpi_month = ?
      WHERE e.status = 'ACTIVE'
      ORDER BY e.department_code ASC, e.employee_code ASC
    `;

    const [rows] = await pool.query(sql, [
      startStr,
      endStr,
      startStr,
      endStr,
      endDate,
      startDate,
      evalMonth
    ]);

    return {
      run,
      period: { start_date: startDate, end_date: endDate, evaluation_month: evalMonth },
      count: rows.length,
      rows
    };
  },

  /**
   * Batch import finalized payroll slips from Accounting (DEP-TCKT) into HRMS
   * Enforces Immutability Lock (409 on APPROVED/COMPLETED/CANCELLED), employee validation, duplicate protection, and Audit Trail
   */
  async importPaySlipsForRun(runId, payload, actor = {}) {
    const { slips = [], mode = 'UPSERT', source_filename = null } = payload;

    // 1. Check duplicate staff_id inside the uploaded batch itself
    const seenStaffIds = new Set();
    const duplicateInBatch = [];
    for (const item of slips) {
      if (seenStaffIds.has(item.staff_id)) {
        duplicateInBatch.push(item.staff_id);
      }
      seenStaffIds.add(item.staff_id);
    }
    if (duplicateInBatch.length > 0) {
      const err = new Error(
        `Bảng lương tải lên chứa mã nhân viên bị trùng lặp: ${[...new Set(duplicateInBatch)].join(', ')}. Vui lòng gộp dòng trước khi nhập.`
      );
      err.statusCode = 400;
      throw err;
    }

    const staffIds = [...seenStaffIds];
    let connection = pool;
    let isDedicated = false;
    if (typeof pool.getConnection === 'function') {
      try {
        const conn = await pool.getConnection();
        if (conn) {
          connection = conn;
          isDedicated = true;
        }
      } catch {
        connection = pool;
      }
    }

    try {
      if (isDedicated && typeof connection.beginTransaction === 'function') {
        await connection.beginTransaction();
      }

      // 2. Lock Payroll_Runs row & check immutability
      const [runRows] = await connection.query(
        'SELECT * FROM Payroll_Runs WHERE id = ? FOR UPDATE',
        [runId]
      );
      if (!runRows || runRows.length === 0) {
        const err = new Error(`Không tìm thấy đợt quyết toán lương với mã: ${runId}`);
        err.statusCode = 404;
        throw err;
      }

      const run = runRows[0];
      if (['APPROVED', 'COMPLETED', 'CANCELLED'].includes(run.status)) {
        const err = new Error(
          `Đợt lương "${runId}" đang ở trạng thái ${run.status}, đã được khóa bất biến và không thể nhập đè dữ liệu mới.`
        );
        err.statusCode = 409;
        throw err;
      }

      // 3. Validate all staff_ids exist in Employees
      const [empRows] = await connection.query(
        'SELECT employee_code FROM Employees WHERE employee_code IN (?)',
        [staffIds]
      );
      const validSet = new Set((empRows || []).map((r) => r.employee_code));
      const invalidStaffIds = staffIds.filter((id) => !validSet.has(id));
      if (invalidStaffIds.length > 0) {
        const err = new Error(
          `Không tìm thấy mã nhân viên trong danh bạ bệnh viện: ${invalidStaffIds.join(', ')}.`
        );
        err.statusCode = 400;
        throw err;
      }

      // 4. Replace mode: clear existing slips in run before inserting
      if (mode === 'REPLACE_RUN_SLIPS') {
        await connection.execute('DELETE FROM Pay_Slips WHERE run_id = ?', [runId]);
      }

      // 5. Bulk UPSERT safely via uq_payslips_run_staff (run_id, staff_id)
      let totalNetPay = 0;
      const values = slips.map((row) => {
        const norm = normalizePaySlipInput({
          ...row,
          status: row.status || 'CALCULATED',
          import_source: 'ACCOUNTING_IMPORT'
        });
        totalNetPay += norm.net_pay;
        return [
          randomUUID(),
          runId,
          row.staff_id,
          norm.base_pay,
          norm.night_differential,
          norm.overtime_pay,
          norm.on_call_allowance,
          norm.surgery_allowance,
          norm.kpi_bonus,
          norm.social_insurance,
          norm.tax_deductions,
          norm.other_deductions,
          norm.net_pay,
          norm.status,
          'ACCOUNTING_IMPORT',
          norm.notes
        ];
      });

      const bulkSql = `
        INSERT INTO Pay_Slips (
          id, run_id, staff_id, base_pay, night_differential, overtime_pay,
          on_call_allowance, surgery_allowance, kpi_bonus,
          social_insurance, tax_deductions, other_deductions,
          net_pay, status, import_source, notes
        ) VALUES ?
        ON DUPLICATE KEY UPDATE
          base_pay = VALUES(base_pay),
          night_differential = VALUES(night_differential),
          overtime_pay = VALUES(overtime_pay),
          on_call_allowance = VALUES(on_call_allowance),
          surgery_allowance = VALUES(surgery_allowance),
          kpi_bonus = VALUES(kpi_bonus),
          social_insurance = VALUES(social_insurance),
          tax_deductions = VALUES(tax_deductions),
          other_deductions = VALUES(other_deductions),
          net_pay = VALUES(net_pay),
          status = VALUES(status),
          import_source = 'ACCOUNTING_IMPORT',
          notes = VALUES(notes),
          updated_at = CURRENT_TIMESTAMP
      `;

      await connection.query(bulkSql, [values]);

      // 6. Move DRAFT run to PROCESSING once accounting slips are imported
      if (run.status === 'DRAFT') {
        await connection.execute(
          "UPDATE Payroll_Runs SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [runId]
        );
      }

      if (isDedicated && typeof connection.commit === 'function') {
        await connection.commit();
      }

      // 7. Audit Trail
      await auditService.logAudit({
        actor_id: actor.employee_code || actor.username || 'SYSTEM',
        actor_name: actor.name || actor.username || 'Phòng Nhân Sự / Kế Toán',
        action: 'PAYROLL_BATCH_IMPORT',
        resource_type: 'Payroll_Runs',
        resource_id: runId,
        new_values: {
          mode,
          source_filename,
          imported_count: slips.length,
          total_net_pay: totalNetPay
        },
        ip_address: actor.ip || null
      });

      const updatedRun = await this.getPayrollRunById(runId);
      return {
        run: updatedRun,
        imported_count: slips.length,
        total_net_pay: totalNetPay,
        mode,
        source_filename
      };
    } catch (error) {
      if (isDedicated && typeof connection.rollback === 'function') {
        await connection.rollback();
      }
      throw error;
    } finally {
      if (isDedicated && typeof connection.release === 'function') {
        connection.release();
      }
    }
  },

  /**
   * Get pay rate configuration for a staff member
   */
  async getPayRateByStaffId(staffId) {
    const sql = `
      SELECT pr.*, e.first_name, e.last_name, e.role, e.specialty
      FROM Pay_Rates pr
      JOIN Employees e ON pr.staff_id = e.employee_code
      WHERE pr.staff_id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [staffId]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Get all pay rates for all employees
   */
  async getAllPayRates() {
    const sql = `
      SELECT 
        e.id AS employee_id,
        e.employee_code,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name,
        e.department_code,
        d.name AS department_name,
        e.role,
        e.specialty,
        COALESCE(pr.base_hourly_rate, 0) AS base_hourly_rate,
        COALESCE(pr.tax_tier, 'TIER_1') AS tax_tier,
        pr.last_salary_increment_date,
        COALESCE(pr.is_salary_increment_hidden, FALSE) AS is_salary_increment_hidden,
        pr.updated_at AS rate_updated_at
      FROM Employees e
      LEFT JOIN Departments d ON e.department_code = d.department_code
      LEFT JOIN Pay_Rates pr ON e.employee_code = pr.staff_id
      WHERE e.status = 'ACTIVE'
      ORDER BY e.id ASC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  },

  /**
   * Update or upsert pay rate for staff member
   */
  async updatePayRate(staffId, data) {
    const { base_hourly_rate, tax_tier = 'TIER_1' } = data;
    const sql = `
      INSERT INTO Pay_Rates (staff_id, base_hourly_rate, tax_tier)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        base_hourly_rate = VALUES(base_hourly_rate),
        tax_tier = VALUES(tax_tier),
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.execute(sql, [staffId, Number(base_hourly_rate), tax_tier]);
    return await this.getPayRateByStaffId(staffId);
  },

  /**
   * Update payroll run status
   */
  async updatePayrollRunStatus(id, status, actor = {}) {
    const validStatuses = ['DRAFT', 'PROCESSING', 'APPROVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    const [result] = await pool.query(
      'UPDATE Payroll_Runs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    if (result && result.affectedRows === 0) {
      const err = new Error(`Payroll run not found with ID: ${id}`);
      err.statusCode = 404;
      throw err;
    }

    if (status === 'COMPLETED') {
      await pool.query(
        "UPDATE Pay_Slips SET status = 'PAID', updated_at = CURRENT_TIMESTAMP WHERE run_id = ? AND status != 'CANCELLED'",
        [id]
      );
    }

    await auditService.logAudit({
      actor_id: actor.employee_code || actor.username || 'SYSTEM',
      actor_name: actor.name || actor.username || 'Lãnh Đạo / Trưởng Phòng HR',
      action: 'UPDATE_PAYROLL_RUN_STATUS',
      resource_type: 'Payroll_Runs',
      resource_id: id,
      new_values: { status },
      ip_address: actor.ip || null
    });

    return await this.getPayrollRunById(id);
  },

  /**
   * Auto-generate payroll run for period and generate slips for active employees
   */
  async generatePayrollRunForPeriod(startDate, endDate) {
    const run = await this.createPayrollRun({
      start_date: startDate,
      end_date: endDate,
      status: 'PROCESSING'
    });

    const [employees] = await pool.query(`
      SELECT 
        e.employee_code,
        COALESCE(pr.base_hourly_rate, 100000) AS base_rate
      FROM Employees e
      LEFT JOIN Pay_Rates pr ON e.employee_code = pr.staff_id
      WHERE e.status = 'ACTIVE'
    `);

    for (const emp of employees) {
      const baseHourly = Number(emp.base_rate);

      const [attStats] = await pool.query(`
        SELECT 
          ROUND(COALESCE(SUM(${WORK_HOURS_SQL_EXPR}), 0), 2) AS total_hours,
          COALESCE(SUM(
            CASE 
              WHEN a.overrun_approval_status IN ('AUTO_APPROVED', 'APPROVED') AND a.overtime_minutes > 0 THEN (a.overtime_minutes / 60.0)
              WHEN a.overrun_approval_status = 'REJECTED' THEN 0
              WHEN a.attendance_status = 'OVERTIME' AND a.overtime_minutes > 0 THEN (a.overtime_minutes / 60.0)
              WHEN a.attendance_status = 'OVERTIME' THEN 2.0
              ELSE 0 
            END
          ), 0) AS ot_hours,
          COALESCE(SUM(CASE WHEN s.shift_type = 'NIGHT' THEN 8.0 ELSE 0 END), 0) AS night_hours
        FROM Attendances a
        LEFT JOIN Shifts s ON a.shift_id = s.id
        WHERE a.staff_id = ?
          AND a.clock_in_time >= ?
          AND a.clock_in_time <= ?
      `, [emp.employee_code, `${startDate} 00:00:00`, `${endDate} 23:59:59`]);

      const loggedHours = Number(attStats[0]?.total_hours) || 0;
      const actualHours = loggedHours > 0 ? loggedHours : 176;
      const nightHours = loggedHours > 0 ? Number(attStats[0]?.night_hours) || 0 : 16;
      const otHours = loggedHours > 0 ? Number(attStats[0]?.ot_hours) || 0 : 0;

      const basePay = Math.round(baseHourly * actualHours);
      const nightDiff = Math.round(baseHourly * nightHours * 0.3);
      const overtime = Math.round(baseHourly * otHours * 1.5);
      const grossPay = basePay + nightDiff + overtime;

      const socialInsurance = Math.round(basePay * 0.105);
      const taxable = Math.max(0, grossPay - socialInsurance - 11000000);
      const tax = Math.round(taxable * 0.10);
      const netPay = Math.max(0, grossPay - socialInsurance - tax);

      await this.createPaySlip({
        run_id: run.id,
        staff_id: emp.employee_code,
        base_pay: basePay,
        night_differential: nightDiff,
        overtime_pay: overtime,
        social_insurance: socialInsurance,
        tax_deductions: tax,
        net_pay: netPay,
        status: 'CALCULATED',
        import_source: 'SYSTEM_AUTO'
      });
    }

    return await this.getPayrollRunById(run.id);
  },

  /**
   * Create pay slip record
   */
  async createPaySlip(data) {
    const { run_id, staff_id } = data;
    const norm = normalizePaySlipInput(data);
    const slipId = randomUUID();

    const insertSql = `
      INSERT INTO Pay_Slips (
        id, run_id, staff_id, base_pay, night_differential, overtime_pay,
        on_call_allowance, surgery_allowance, kpi_bonus,
        social_insurance, tax_deductions, other_deductions,
        net_pay, status, import_source, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      slipId,
      run_id,
      staff_id,
      norm.base_pay,
      norm.night_differential,
      norm.overtime_pay,
      norm.on_call_allowance,
      norm.surgery_allowance,
      norm.kpi_bonus,
      norm.social_insurance,
      norm.tax_deductions,
      norm.other_deductions,
      norm.net_pay,
      norm.status,
      norm.import_source,
      norm.notes
    ]);

    return {
      id: slipId,
      run_id,
      staff_id,
      ...norm
    };
  },

  /**
   * Add payment election
   */
  async addPaymentElection(data) {
    const { staff_id, bank_name, account_number, routing_number, is_primary = true } = data;
    const electionId = randomUUID();

    const insertSql = `
      INSERT INTO Payment_Elections (
        id, staff_id, bank_name, account_number, routing_number, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      electionId,
      staff_id,
      bank_name,
      account_number,
      routing_number,
      Boolean(is_primary)
    ]);

    return {
      id: electionId,
      staff_id,
      bank_name,
      account_number,
      routing_number,
      is_primary: Boolean(is_primary)
    };
  },

  /**
   * Get payment elections for staff member
   */
  async getPaymentElectionsByStaffId(staffId) {
    const sql = `
      SELECT 
        id,
        staff_id,
        bank_name,
        account_number,
        routing_number,
        is_primary,
        created_at,
        updated_at
      FROM Payment_Elections
      WHERE staff_id = ?
      ORDER BY is_primary DESC, created_at DESC
    `;
    const [rows] = await pool.query(sql, [staffId]);
    return rows;
  },

  /**
   * Build hospital bank transfer / disbursement sheet for Accounting (DEP-TCKT)
   * Combines Pay_Slips.net_pay with each staff member's primary Payment_Elections bank account
   */
  async getRunBankDisbursement(runId) {
    const run = await this.getPayrollRunById(runId);
    if (!run) {
      const err = new Error(`Payroll run not found with ID: ${runId}`);
      err.statusCode = 404;
      throw err;
    }

    const [slipRows] = await pool.query(
      `SELECT
        ps.id AS payslip_id,
        ps.staff_id,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name,
        e.department_code,
        d.name AS department_name,
        ps.net_pay,
        ps.status AS payslip_status
      FROM Pay_Slips ps
      LEFT JOIN Employees e ON ps.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE ps.run_id = ? AND ps.status != 'CANCELLED'
      ORDER BY e.department_code ASC, ps.staff_id ASC`,
      [runId]
    );

    const staffIds = [...new Set(slipRows.map((r) => r.staff_id).filter(Boolean))];
    const electionMap = new Map();
    if (staffIds.length > 0) {
      const [elections] = await pool.query(
        `SELECT staff_id, bank_name, account_number, routing_number, is_primary
         FROM Payment_Elections
         WHERE staff_id IN (?)
         ORDER BY is_primary DESC, updated_at DESC`,
        [staffIds]
      );
      for (const el of elections || []) {
        if (!electionMap.has(el.staff_id)) {
          electionMap.set(el.staff_id, el);
        }
      }
    }

    let readyCount = 0;
    let missingBankCount = 0;
    let totalAmount = 0;

    const rows = slipRows.map((s) => {
      const bank = electionMap.get(s.staff_id) || null;
      const missingBank = !bank || !bank.account_number;
      if (missingBank) missingBankCount += 1;
      else readyCount += 1;
      const netPay = Number(s.net_pay) || 0;
      totalAmount += netPay;

      return {
        staff_id: s.staff_id,
        staff_name: (s.staff_name || s.staff_id).trim(),
        department_code: s.department_code || '',
        department_name: s.department_name || '',
        bank_name: bank?.bank_name || '',
        account_number: bank?.account_number || '',
        routing_number: bank?.routing_number || '',
        net_pay: netPay,
        payslip_status: s.payslip_status,
        transfer_reference: `LUONG ${normalizeDateOnly(run.start_date)} ${s.staff_id}`,
        missing_bank_account: missingBank
      };
    });

    return {
      run,
      summary: {
        total_slips: rows.length,
        ready_count: readyCount,
        missing_bank_count: missingBankCount,
        total_amount: totalAmount
      },
      rows
    };
  },

  /**
   * Allow staff member to flag a discrepancy/question on their own payslip
   * Sends high-priority ALERT notifications to HR & Accounting staff and records an Audit Log
   */
  async reportPaySlipDiscrepancy(slipId, message, actor = {}) {
    const [slipRows] = await pool.query(
      'SELECT * FROM Pay_Slips WHERE id = ? LIMIT 1',
      [slipId]
    );
    if (!slipRows || slipRows.length === 0) {
      const err = new Error(`Không tìm thấy phiếu lương với mã: ${slipId}`);
      err.statusCode = 404;
      throw err;
    }

    const slip = slipRows[0];
    const isOperator = hasAnyRole(actor, ROLE_GROUPS.PAYROLL_OPERATORS);
    if (actor && actor.employee_code && !isOperator && slip.staff_id !== actor.employee_code) {
      const err = new Error('Quyền truy cập bị từ chối: Bạn chỉ có thể phản ánh sai sót trên phiếu lương của chính mình.');
      err.statusCode = 403;
      throw err;
    }

    const [recipients] = await pool.query(
      `SELECT employee_code FROM Employees
       WHERE role IN ('HR_MANAGER', 'HEAD_OF_HR', 'HR_STAFF', 'ACCOUNTANT') AND status = 'ACTIVE'`
    );
    const targetIds =
      recipients && recipients.length > 0
        ? [...new Set(recipients.map((r) => r.employee_code))]
        : ['EMP-HR-001'];

    const senderLabel = actor.name || actor.employee_code || slip.staff_id;
    const notifTitle = `Yêu cầu đối soát phiếu lương: ${slip.staff_id}`;
    const notifMsg = `${senderLabel} phản ánh sai sót ở phiếu lương kỳ ${slip.run_id}: "${message}"`;

    for (const targetId of targetIds) {
      try {
        await pool.execute(
          `INSERT INTO Notifications (id, target_staff_id, title, message, type, is_read)
           VALUES (?, ?, ?, ?, 'ALERT', FALSE)`,
          [randomUUID(), targetId, notifTitle, notifMsg]
        );
      } catch (notifErr) {
        console.warn('[payrollService.reportPaySlipDiscrepancy] Notification insert skipped:', notifErr.message);
      }
    }

    await auditService.logAudit({
      actor_id: actor.employee_code || slip.staff_id,
      actor_name: senderLabel,
      action: 'PAYSLIP_DISCREPANCY_REPORTED',
      resource_type: 'Pay_Slips',
      resource_id: slipId,
      new_values: { run_id: slip.run_id, staff_id: slip.staff_id, message, notified_targets: targetIds },
      ip_address: actor.ip || null
    });

    return {
      slip_id: slipId,
      run_id: slip.run_id,
      staff_id: slip.staff_id,
      notified_count: targetIds.length
    };
  }
};

export default payrollService;
