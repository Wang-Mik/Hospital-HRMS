import pool from '../db.js';
import { randomUUID } from 'crypto';

export const hrService = {
  /**
   * 1. CONTRACTS: Get list of contracts with expiration alerts and filtering
   */
  async getContracts(filters = {}) {
    const { expiring_within_days, contract_type, status, search } = filters;

    let sql = `
      SELECT 
        c.*,
        e.first_name,
        e.last_name,
        e.role,
        e.department_code,
        d.name as department_name,
        DATEDIFF(c.end_date, CURDATE()) as days_until_expiry
      FROM Employment_Contracts c
      JOIN Employees e ON c.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE 1=1
    `;
    const params = [];

    if (contract_type) {
      sql += ` AND c.contract_type = ?`;
      params.push(contract_type);
    }
    if (status) {
      sql += ` AND c.status = ?`;
      params.push(status);
    }
    if (expiring_within_days) {
      sql += ` AND c.end_date IS NOT NULL AND DATEDIFF(c.end_date, CURDATE()) BETWEEN 0 AND ?`;
      params.push(Number(expiring_within_days));
    }
    if (search) {
      sql += ` AND (c.contract_number LIKE ? OR c.job_title LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY c.end_date IS NULL ASC, c.end_date ASC, c.created_at DESC`;

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Create or update an employment contract
   */
  async createOrUpdateContract(data, actor = {}) {
    const {
      id = null,
      staff_id,
      contract_number,
      contract_type = 'DEFINITE_1YR',
      start_date,
      end_date = null,
      job_title,
      base_salary = 0.0,
      status = 'ACTIVE',
      file_url = null,
      notes = null
    } = data;

    if (!staff_id || !contract_number || !start_date || !job_title) {
      throw new Error('Vui lòng cung cấp đầy đủ: Mã cán bộ, Số hợp đồng, Ngày bắt đầu và Chức danh ký HĐ.');
    }

    const contractId = id || randomUUID();

    await pool.query(
      `INSERT INTO Employment_Contracts (
        id, staff_id, contract_number, contract_type, start_date, end_date,
        job_title, base_salary, status, file_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        contract_type = VALUES(contract_type),
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        job_title = VALUES(job_title),
        base_salary = VALUES(base_salary),
        status = VALUES(status),
        file_url = VALUES(file_url),
        notes = VALUES(notes)`,
      [
        contractId,
        staff_id,
        contract_number,
        contract_type,
        start_date,
        end_date || null,
        job_title,
        base_salary,
        status,
        file_url,
        notes
      ]
    );

    try {
      await pool.execute(
        `INSERT INTO Audit_Logs (id, actor_id, actor_name, action, resource_type, resource_id, new_values)
         VALUES (?, ?, ?, 'SAVE_CONTRACT', 'Employment_Contracts', ?, ?)`,
        [
          randomUUID(),
          actor.employee_code || 'SYSTEM_HR',
          actor.name || 'Phòng Tổ Chức Cán Bộ',
          contractId,
          JSON.stringify({ contract_number, staff_id, contract_type, status })
        ]
      );
    } catch (auditErr) {
      console.warn('[saveContract] Failed to log audit:', auditErr.message);
    }

    const [saved] = await pool.query(`SELECT * FROM Employment_Contracts WHERE id = ?`, [contractId]);
    return saved[0];
  },

  /**
   * 2. INSURANCES: Get social & health insurances list
   */
  async getInsurances(filters = {}) {
    const { staff_id, status, search } = filters;

    let sql = `
      SELECT 
        i.*,
        e.first_name,
        e.last_name,
        e.role,
        e.department_code,
        d.name as department_name
      FROM Social_Insurances i
      JOIN Employees e ON i.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE 1=1
    `;
    const params = [];

    if (staff_id) {
      sql += ` AND i.staff_id = ?`;
      params.push(staff_id);
    }
    if (status) {
      sql += ` AND i.status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (i.bhxh_book_number LIKE ? OR i.bhyt_card_number LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY e.last_name ASC`;
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Update or create social insurance record for an employee
   */
  async updateInsurance(staffId, data, actor = {}) {
    const {
      bhxh_book_number,
      bhyt_card_number,
      primary_hospital_name = 'Bệnh viện Đa khoa Trung tâm',
      has_bhxh = true,
      has_bhyt = true,
      has_bhtn = true,
      has_occupational_accident = true,
      insurance_salary = 0.0,
      status = 'ACTIVE'
    } = data;

    if (!bhxh_book_number || !bhyt_card_number) {
      throw new Error('Số sổ BHXH và Số thẻ BHYT là bắt buộc.');
    }

    const [existing] = await pool.query(
      `SELECT id FROM Social_Insurances WHERE staff_id = ? LIMIT 1`,
      [staffId]
    );

    const insuranceId = existing[0]?.id || randomUUID();

    await pool.query(
      `INSERT INTO Social_Insurances (
        id, staff_id, bhxh_book_number, bhyt_card_number, primary_hospital_name,
        has_bhxh, has_bhyt, has_bhtn, has_occupational_accident, insurance_salary, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        bhxh_book_number = VALUES(bhxh_book_number),
        bhyt_card_number = VALUES(bhyt_card_number),
        primary_hospital_name = VALUES(primary_hospital_name),
        has_bhxh = VALUES(has_bhxh),
        has_bhyt = VALUES(has_bhyt),
        has_bhtn = VALUES(has_bhtn),
        has_occupational_accident = VALUES(has_occupational_accident),
        insurance_salary = VALUES(insurance_salary),
        status = VALUES(status)`,
      [
        insuranceId,
        staffId,
        bhxh_book_number,
        bhyt_card_number,
        primary_hospital_name,
        Boolean(has_bhxh),
        Boolean(has_bhyt),
        Boolean(has_bhtn),
        Boolean(has_occupational_accident),
        insurance_salary,
        status
      ]
    );

    try {
      await pool.execute(
        `INSERT INTO Audit_Logs (id, actor_id, actor_name, action, resource_type, resource_id, new_values)
         VALUES (?, ?, ?, 'UPDATE_INSURANCE', 'Social_Insurances', ?, ?)`,
        [
          randomUUID(),
          actor.employee_code || 'SYSTEM_HR',
          actor.name || 'Phòng Tổ Chức Cán Bộ',
          staffId,
          JSON.stringify({ bhxh_book_number, bhyt_card_number, status })
        ]
      );
    } catch (auditErr) {
      console.warn('[updateInsurance] Failed to log audit:', auditErr.message);
    }

    const [saved] = await pool.query(`SELECT * FROM Social_Insurances WHERE staff_id = ?`, [staffId]);
    return saved[0];
  },

  /**
   * 3. COMMENDATIONS & DISCIPLINES: Get list
   */
  async getCommendationsDisciplines(filters = {}) {
    const { staff_id, record_type, search } = filters;

    let sql = `
      SELECT 
        r.*,
        e.first_name,
        e.last_name,
        e.role,
        e.department_code,
        d.name as department_name
      FROM Commendations_Disciplines r
      JOIN Employees e ON r.staff_id = e.employee_code
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE 1=1
    `;
    const params = [];

    if (staff_id) {
      sql += ` AND r.staff_id = ?`;
      params.push(staff_id);
    }
    if (record_type) {
      sql += ` AND r.record_type = ?`;
      params.push(record_type);
    }
    if (search) {
      sql += ` AND (r.decision_number LIKE ? OR r.title LIKE ? OR r.reason LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY r.decision_date DESC`;
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Create a commendation or disciplinary record
   */
  async createCommendationDiscipline(data, actor = {}) {
    const {
      staff_id,
      record_type = 'COMMENDATION',
      decision_number,
      decision_date,
      signatory_authority,
      title,
      reason,
      reward_or_fine_amount = 0.0,
      effective_date = decision_date,
      expiration_date = null
    } = data;

    if (!staff_id || !decision_number || !decision_date || !signatory_authority || !title || !reason) {
      throw new Error('Vui lòng điền đầy đủ: Mã cán bộ, Số quyết định, Ngày ký, Cấp ra quyết định, Tiêu đề và Lý do.');
    }

    const recordId = randomUUID();

    await pool.query(
      `INSERT INTO Commendations_Disciplines (
        id, staff_id, record_type, decision_number, decision_date, signatory_authority,
        title, reason, reward_or_fine_amount, effective_date, expiration_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        staff_id,
        record_type,
        decision_number,
        decision_date,
        signatory_authority,
        title,
        reason,
        reward_or_fine_amount,
        effective_date,
        expiration_date || null
      ]
    );

    try {
      await pool.execute(
        `INSERT INTO Audit_Logs (id, actor_id, actor_name, action, resource_type, resource_id, new_values)
         VALUES (?, ?, ?, 'RECORD_REWARD_DISCIPLINE', 'Commendations_Disciplines', ?, ?)`,
        [
          randomUUID(),
          actor.employee_code || 'SYSTEM_HR',
          actor.name || 'Phòng Tổ Chức Cán Bộ',
          recordId,
          JSON.stringify({ staff_id, record_type, decision_number, title })
        ]
      );
    } catch (auditErr) {
      console.warn('[createCommendationDiscipline] Failed to log audit:', auditErr.message);
    }

    const [saved] = await pool.query(`SELECT * FROM Commendations_Disciplines WHERE id = ?`, [recordId]);
    return saved[0];
  },

  /**
   * 4. SALARY INCREMENT & PRIVACY: Update last salary increment date & privacy toggle
   */
  async updateSalaryIncrement(staffId, data, actor = {}) {
    const { last_salary_increment_date, is_salary_increment_hidden } = data;

    await pool.query(
      `UPDATE Pay_Rates SET 
        last_salary_increment_date = COALESCE(?, last_salary_increment_date),
        is_salary_increment_hidden = COALESCE(?, is_salary_increment_hidden),
        updated_at = NOW()
       WHERE staff_id = ?`,
      [
        last_salary_increment_date || null,
        is_salary_increment_hidden !== undefined ? Boolean(is_salary_increment_hidden) : null,
        staffId
      ]
    );

    const [updated] = await pool.query(`SELECT * FROM Pay_Rates WHERE staff_id = ?`, [staffId]);
    return updated[0] || null;
  }
};

export default hrService;
