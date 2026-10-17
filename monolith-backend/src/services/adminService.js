import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '../db.js';

export const adminService = {
  /**
   * Hospital Executive KPI Overview for HR Command Center
   */
  async getOverview() {
    // 1. Total active employees
    const [[{ total_employees }]] = await pool.query(
      "SELECT COUNT(*) AS total_employees FROM Employees WHERE status = 'ACTIVE'"
    );

    // 2. Total active departments
    const [[{ total_departments }]] = await pool.query(
      "SELECT COUNT(*) AS total_departments FROM Departments WHERE status = 'ACTIVE'"
    );

    // 3. Pending leave requests
    const [[{ pending_leaves }]] = await pool.query(
      "SELECT COUNT(*) AS pending_leaves FROM Leave_Requests WHERE status = 'PENDING'"
    );

    // 4. Medical licenses expiring in 30 days
    const [[{ expiring_licenses_30d }]] = await pool.query(
      "SELECT COUNT(*) AS expiring_licenses_30d FROM Medical_Licenses WHERE DATEDIFF(expiration_date, CURDATE()) BETWEEN 0 AND 30 AND verification_status != 'REVOKED'"
    );

    // 5. Expired licenses
    const [[{ expired_licenses }]] = await pool.query(
      "SELECT COUNT(*) AS expired_licenses FROM Medical_Licenses WHERE (expiration_date < CURDATE() OR verification_status = 'EXPIRED') AND verification_status != 'REVOKED'"
    );

    // 6. Total payroll disbursed (VND)
    const [[{ total_disbursed_vnd }]] = await pool.query(
      "SELECT COALESCE(SUM(net_pay), 0) AS total_disbursed_vnd FROM Pay_Slips"
    );

    // 7. Shifts upcoming/scheduled
    const [[{ upcoming_shifts }]] = await pool.query(
      "SELECT COUNT(*) AS upcoming_shifts FROM Shifts WHERE start_time >= CURDATE()"
    );

    // 8. Account IAM stats
    const [[{ locked_accounts, active_accounts }]] = await pool.query(`
      SELECT 
        SUM(CASE WHEN is_locked = TRUE THEN 1 ELSE 0 END) AS locked_accounts,
        SUM(CASE WHEN is_locked = FALSE THEN 1 ELSE 0 END) AS active_accounts
      FROM Accounts
    `);

    // 9. Recent activities (top 5 leave requests + top 5 notifications)
    const [recentLeaves] = await pool.query(`
      SELECT 
        lr.id,
        lr.staff_id,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name,
        e.department_code,
        lr.leave_type,
        lr.status,
        lr.start_date,
        lr.end_date,
        lr.created_at
      FROM Leave_Requests lr
      LEFT JOIN Employees e ON lr.staff_id = e.employee_code
      ORDER BY lr.created_at DESC
      LIMIT 5
    `);

    return {
      kpis: {
        total_employees: Number(total_employees || 0),
        total_departments: Number(total_departments || 0),
        pending_leaves: Number(pending_leaves || 0),
        expiring_licenses_30d: Number(expiring_licenses_30d || 0),
        expired_licenses: Number(expired_licenses || 0),
        total_disbursed_vnd: Number(total_disbursed_vnd || 0),
        upcoming_shifts: Number(upcoming_shifts || 0),
        locked_accounts: Number(locked_accounts || 0),
        active_accounts: Number(active_accounts || 0)
      },
      recent_leaves: recentLeaves
    };
  },

  /**
   * Get all user accounts joined with full employee and department details
   */
  async getAllAccounts() {
    const sql = `
      SELECT 
        a.id AS account_id,
        a.employee_id,
        a.username,
        a.role_code,
        r.name AS role_name,
        r.description AS role_description,
        a.is_locked,
        a.last_login,
        a.created_at AS account_created_at,
        e.employee_code,
        CONCAT(COALESCE(e.last_name, ''), ' ', COALESCE(e.first_name, '')) AS staff_name,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.specialty,
        e.status AS employee_status,
        e.department_code,
        d.name AS department_name,
        e.avatar_url
      FROM Accounts a
      JOIN Roles r ON a.role_code = r.role_code
      LEFT JOIN Employees e ON a.employee_id = e.id
      LEFT JOIN Departments d ON e.department_code = d.department_code
      ORDER BY e.id ASC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  },

  /**
   * Update account IAM Role
   */
  async updateAccountRole(accountIdOrEmpId, roleCode) {
    const [roles] = await pool.query('SELECT * FROM Roles WHERE role_code = ? LIMIT 1', [roleCode]);
    if (roles.length === 0) {
      const err = new Error(`Vai trò "${roleCode}" không tồn tại trong hệ thống.`);
      err.statusCode = 400;
      throw err;
    }

    const isNumeric = /^\d+$/.test(String(accountIdOrEmpId));
    const whereClause = isNumeric ? 'employee_id = ?' : 'id = ?';

    await pool.query(
      `UPDATE Accounts SET role_code = ?, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`,
      [roleCode, accountIdOrEmpId]
    );

    // Sync to Employees table if linked
    if (isNumeric) {
      await pool.query('UPDATE Employees SET role = ? WHERE id = ?', [roleCode, accountIdOrEmpId]);
    } else {
      await pool.query('UPDATE Employees e JOIN Accounts a ON e.id = a.employee_id SET e.role = ? WHERE a.id = ?', [roleCode, accountIdOrEmpId]);
    }

    const [rows] = await pool.query(`
      SELECT a.id AS account_id, a.username, a.role_code, r.name AS role_name, a.employee_id, e.employee_code, CONCAT(e.last_name, ' ', e.first_name) AS staff_name
      FROM Accounts a
      JOIN Roles r ON a.role_code = r.role_code
      LEFT JOIN Employees e ON a.employee_id = e.id
      WHERE a.${whereClause}
    `, [accountIdOrEmpId]);

    return rows[0] || null;
  },

  /**
   * Get all RBAC Roles with mapped permissions
   */
  async getAllRoles() {
    const [roles] = await pool.query('SELECT * FROM Roles ORDER BY id ASC');
    const [rolePerms] = await pool.query(`
      SELECT rp.role_id, p.permission_code, p.module, p.description
      FROM Role_Permissions rp
      JOIN Permissions p ON rp.permission_id = p.id
    `);

    const permsByRole = {};
    for (const rp of rolePerms) {
      if (!permsByRole[rp.role_id]) permsByRole[rp.role_id] = [];
      permsByRole[rp.role_id].push({
        code: rp.permission_code,
        module: rp.module,
        description: rp.description
      });
    }

    return roles.map(r => ({
      ...r,
      permissions: permsByRole[r.id] || []
    }));
  },

  /**
   * Lock or unlock an IAM account
   */
  async toggleAccountLock(accountIdOrEmpId, isLocked) {
    const isNumeric = /^\d+$/.test(String(accountIdOrEmpId));
    const whereClause = isNumeric ? 'employee_id = ?' : 'id = ?';

    await pool.query(
      `UPDATE Accounts SET is_locked = ?, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`,
      [Boolean(isLocked), accountIdOrEmpId]
    );

    const [rows] = await pool.query(
      `SELECT a.*, e.employee_code, CONCAT(e.last_name, ' ', e.first_name) as staff_name 
       FROM Accounts a 
       JOIN Employees e ON a.employee_id = e.id 
       WHERE a.${whereClause}`,
      [accountIdOrEmpId]
    );

    return rows[0] || null;
  },

  /**
   * Reset account password
   */
  async resetPassword(accountIdOrEmpId, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      const err = new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      err.statusCode = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const isNumeric = /^\d+$/.test(String(accountIdOrEmpId));
    const whereClause = isNumeric ? 'employee_id = ?' : 'id = ?';

    await pool.query(
      `UPDATE Accounts SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`,
      [passwordHash, accountIdOrEmpId]
    );

    return {
      success: true,
      message: 'Mật khẩu tài khoản đã được thiết lập lại thành công.'
    };
  },

  /**
   * Broadcast internal hospital announcement
   */
  async broadcastNotification(data) {
    const { title, message, type = 'ANNOUNCEMENT', department_code = null, target_staff_id = null } = data;

    if (!title || !message) {
      const err = new Error('Tiêu đề (title) và nội dung (message) là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    let targetEmployees = [];

    if (target_staff_id) {
      targetEmployees = [{ employee_code: target_staff_id }];
    } else if (department_code && department_code !== 'ALL') {
      const [rows] = await pool.query(
        'SELECT employee_code FROM Employees WHERE department_code = ? AND status = "ACTIVE"',
        [department_code]
      );
      targetEmployees = rows;
    } else {
      // All active staff
      const [rows] = await pool.query(
        'SELECT employee_code FROM Employees WHERE status = "ACTIVE"'
      );
      targetEmployees = rows;
    }

    if (targetEmployees.length === 0) {
      return { sent_count: 0, message: 'Không tìm thấy nhân viên nào phù hợp với điều kiện gửi thông báo.' };
    }

    const insertSql = `
      INSERT INTO Notifications (id, target_staff_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?, FALSE)
    `;

    for (const emp of targetEmployees) {
      await pool.execute(insertSql, [
        randomUUID(),
        emp.employee_code,
        title,
        message,
        type
      ]);
    }

    return {
      sent_count: targetEmployees.length,
      target: target_staff_id ? target_staff_id : (department_code || 'Toàn Bệnh Viện'),
      message: `Đã phát thông báo thành công đến ${targetEmployees.length} nhân viên.`
    };
  },

  /**
   * Complete atomic hospital onboarding wizard
   */
  async adminOnboardStaff(data) {
    const {
      employee_code,
      first_name,
      last_name,
      email,
      phone,
      department_code,
      role = 'STAFF',
      specialty = null,
      hire_date = new Date().toISOString().slice(0, 10),
      username,
      password = 'password123',
      base_hourly_rate = 120000,
      tax_tier = 'TIER_1',
      annual_leave_days = 12,
      medical_license = null
    } = data;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Check duplicate employee_code or email
      const [existingEmp] = await connection.query(
        'SELECT id FROM Employees WHERE employee_code = ? OR email = ? LIMIT 1',
        [employee_code, email]
      );
      if (existingEmp.length > 0) {
        const err = new Error(`Mã nhân viên (${employee_code}) hoặc email (${email}) đã tồn tại.`);
        err.statusCode = 409;
        throw err;
      }

      // 2. Check username duplicate
      const accountUsername = username || employee_code.toLowerCase();
      const [existingUser] = await connection.query(
        'SELECT id FROM Accounts WHERE username = ? LIMIT 1',
        [accountUsername]
      );
      if (existingUser.length > 0) {
        const err = new Error(`Tên đăng nhập (${accountUsername}) đã được sử dụng.`);
        err.statusCode = 409;
        throw err;
      }

      // 3. Insert Employee
      const [empResult] = await connection.execute(`
        INSERT INTO Employees (
          employee_code, first_name, last_name, email, phone, 
          department_code, role, specialty, hire_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `, [
        employee_code,
        first_name,
        last_name,
        email,
        phone || null,
        department_code,
        role,
        specialty || null,
        hire_date
      ]);

      const newEmpId = empResult.insertId;

      // 4. Create IAM Account
      const accountId = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      await connection.execute(`
        INSERT INTO Accounts (id, employee_id, username, role_code, password_hash, is_locked)
        VALUES (?, ?, ?, ?, ?, FALSE)
      `, [accountId, newEmpId, accountUsername, role, passwordHash]);

      // 5. Create Pay Rate
      await connection.execute(`
        INSERT INTO Pay_Rates (staff_id, base_hourly_rate, tax_tier)
        VALUES (?, ?, ?)
      `, [employee_code, Number(base_hourly_rate), tax_tier]);

      // 6. Create Initial Leave Balance
      const balanceId = randomUUID();
      const currentYear = new Date(hire_date).getFullYear();
      await connection.execute(`
        INSERT INTO Leave_Balances (id, staff_id, accrual_year, leave_type, total_days, used_days)
        VALUES (?, ?, ?, 'ANNUAL', ?, 0)
      `, [balanceId, employee_code, currentYear, Number(annual_leave_days)]);

      // 7. Optional Medical License
      if (medical_license && medical_license.license_number) {
        await connection.execute(`
          INSERT INTO Medical_Licenses (
            employee_id, license_type, license_number, issuing_authority, issue_date, expiration_date, verification_status
          ) VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED')
        `, [
          newEmpId,
          medical_license.license_type || 'Chứng chỉ hành nghề khám chữa bệnh',
          medical_license.license_number,
          medical_license.issuing_authority || 'Sở Y Tế',
          medical_license.issue_date || hire_date,
          medical_license.expiration_date || new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
        ]);
      }

      await connection.commit();

      return {
        success: true,
        employee_id: newEmpId,
        employee_code,
        staff_name: `${last_name} ${first_name}`,
        username: accountUsername,
        temporary_password: password,
        department_code,
        role
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

export default adminService;
