import { randomUUID } from 'crypto';
import pool from '../db.js';

export const payrollService = {
  /**
   * Create payroll run
   */
  async createPayrollRun(data) {
    const { start_date, end_date, status = 'DRAFT' } = data;
    const runId = randomUUID();
    const formattedStartDate = start_date.includes('T') ? start_date.split('T')[0] : start_date;
    const formattedEndDate = end_date.includes('T') ? end_date.split('T')[0] : end_date;

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
   * Get payslips for a staff member with joined pay rate information
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
        ps.net_pay,
        ps.status,
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
  async updatePayrollRunStatus(id, status) {
    const validStatuses = ['DRAFT', 'PROCESSING', 'APPROVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    await pool.query('UPDATE Payroll_Runs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
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
      const basePay = Math.round(baseHourly * 176);
      const nightDiff = Math.round(baseHourly * 16 * 0.3);
      const overtime = 0;
      const netPay = basePay + nightDiff + overtime;

      await this.createPaySlip({
        run_id: run.id,
        staff_id: emp.employee_code,
        base_pay: basePay,
        night_differential: nightDiff,
        overtime_pay: overtime,
        net_pay: netPay,
        status: 'CALCULATED'
      });
    }

    return await this.getPayrollRunById(run.id);
  },

  /**
   * Create pay slip record
   */
  async createPaySlip(data) {
    const {
      run_id,
      staff_id,
      base_pay = 0.00,
      night_differential = 0.00,
      overtime_pay = 0.00,
      net_pay = 0.00,
      status = 'DRAFT'
    } = data;

    const slipId = randomUUID();
    const insertSql = `
      INSERT INTO Pay_Slips (
        id, run_id, staff_id, base_pay, night_differential, overtime_pay, net_pay, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      slipId,
      run_id,
      staff_id,
      base_pay,
      night_differential,
      overtime_pay,
      net_pay,
      status
    ]);

    return {
      id: slipId,
      run_id,
      staff_id,
      base_pay,
      night_differential,
      overtime_pay,
      net_pay,
      status
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
  }
};

export default payrollService;
