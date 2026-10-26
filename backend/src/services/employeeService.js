import { randomUUID } from 'crypto';
import pool from '../db.js';

export const employeeService = {
  /**
   * Get all employees with department details and optional filters
   */
  async getAllEmployees(filters = {}) {
    const { department_code, department_id, role, status, search } = filters;
    let sql = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.avatar_url,
        e.dob,
        e.gender,
        e.marital_status,
        e.national_id,
        e.nationality,
        e.personal_email,
        e.personal_phone,
        e.home_phone,
        e.home_address,
        e.district,
        e.city_province,
        e.postal_code,
        e.work_location,
        e.office_location,
        e.department_code,
        d.id AS department_id,
        d.name AS department_name,
        e.role,
        e.specialty,
        e.hire_date,
        e.status,
        e.created_at,
        e.updated_at
      FROM Employees e
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE 1=1
    `;
    const params = [];

    if (department_code) {
      sql += ` AND e.department_code = ?`;
      params.push(department_code);
    } else if (department_id) {
      sql += ` AND (d.id = ? OR e.department_code = ?)`;
      params.push(department_id, String(department_id));
    }
    if (role) {
      sql += ` AND e.role = ?`;
      params.push(role);
    }
    if (status) {
      sql += ` AND e.status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const limitVal = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
    sql += ` ORDER BY e.id ASC LIMIT ?`;
    params.push(limitVal);
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Get employee by ID, UUID, or employee_code with active medical licenses
   */
  async getEmployeeById(id) {
    const isNumeric = /^\d+$/.test(String(id));
    const whereClause = isNumeric ? 'e.id = ?' : 'e.employee_code = ?';

    const employeeQuery = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.avatar_url,
        e.dob,
        e.gender,
        e.marital_status,
        e.national_id,
        e.nationality,
        e.personal_email,
        e.personal_phone,
        e.home_phone,
        e.home_address,
        e.district,
        e.city_province,
        e.postal_code,
        e.work_location,
        e.office_location,
        e.department_code,
        d.id AS department_id,
        d.name AS department_name,
        e.role,
        e.specialty,
        e.hire_date,
        e.status,
        e.created_at,
        e.updated_at
      FROM Employees e
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE ${whereClause}
      LIMIT 1
    `;

    const [employeeRows] = await pool.query(employeeQuery, [id]);
    if (employeeRows.length === 0) return null;

    const employee = employeeRows[0];

    const licensesQuery = `
      SELECT 
        id,
        employee_id,
        license_type,
        license_number,
        issuing_authority,
        issue_date,
        expiration_date,
        verification_status,
        document_url,
        notes,
        created_at,
        updated_at
      FROM Medical_Licenses
      WHERE employee_id = ?
        AND expiration_date >= CURDATE()
        AND verification_status != 'REVOKED'
      ORDER BY expiration_date ASC
    `;

    const [licenseRows] = await pool.query(licensesQuery, [employee.id]);

    return {
      ...employee,
      active_medical_licenses: licenseRows
    };
  },

  /**
   * Create new employee with optional licenses in a transaction
   */
  async createEmployee(data) {
    const {
      employee_code,
      first_name,
      last_name,
      email,
      phone = null,
      department_code = null,
      department_id = null,
      role = 'STAFF',
      specialty = null,
      hire_date = null,
      status = 'ACTIVE',
      medical_licenses = []
    } = data;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check duplicates
      const checkSql = `
        SELECT id, employee_code, email 
        FROM Employees 
        WHERE employee_code = ? OR email = ? 
        LIMIT 1
      `;
      const [existing] = await connection.query(checkSql, [employee_code, email]);

      if (existing.length > 0) {
        await connection.rollback();
        const field = existing[0].employee_code === employee_code ? 'employee_code' : 'email';
        const err = new Error(`An employee with this ${field} already exists.`);
        err.statusCode = 409;
        throw err;
      }

      // Check department existence
      let resolvedDeptCode = department_code || null;
      let resolvedDeptId = department_id || null;
      const targetDept = department_code || department_id;

      if (targetDept) {
        const [deptCheck] = await connection.query(
          'SELECT id, department_code FROM Departments WHERE department_code = ? OR id = ? LIMIT 1',
          [targetDept, targetDept]
        );
        if (deptCheck.length === 0) {
          await connection.rollback();
          const err = new Error(`Department with ID or code ${targetDept} does not exist.`);
          err.statusCode = 400;
          throw err;
        }
        resolvedDeptCode = deptCheck[0]?.department_code || (typeof targetDept === 'string' && targetDept.startsWith('DEP-') ? targetDept : 'DEP-CAPCUU');
        resolvedDeptId = deptCheck[0]?.id || (typeof department_id === 'number' ? department_id : 1);
      }

      // Insert employee
      const insertSql = `
        INSERT INTO Employees (
          employee_code, first_name, last_name, email, phone, department_code, role, specialty, hire_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [insertResult] = await connection.execute(insertSql, [
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        resolvedDeptCode,
        role,
        specialty,
        hire_date,
        status
      ]);

      const newEmployeeId = insertResult.insertId;
      const insertedLicenses = [];

      if (Array.isArray(medical_licenses) && medical_licenses.length > 0) {
        const insertLicSql = `
          INSERT INTO Medical_Licenses (
            employee_id, license_type, license_number, issuing_authority, issue_date, expiration_date, verification_status, document_url, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const lic of medical_licenses) {
          if (lic.license_type && lic.license_number && lic.issue_date && lic.expiration_date) {
            const [licResult] = await connection.execute(insertLicSql, [
              newEmployeeId,
              lic.license_type,
              lic.license_number,
              lic.issuing_authority || null,
              lic.issue_date,
              lic.expiration_date,
              lic.verification_status || 'PENDING',
              lic.document_url || null,
              lic.notes || null
            ]);
            insertedLicenses.push({
              id: licResult.insertId,
              employee_id: newEmployeeId,
              ...lic
            });
          }
        }
      }

      await connection.commit();

      return {
        id: newEmployeeId,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        department_code: resolvedDeptCode,
        department_id: resolvedDeptId,
        role,
        specialty,
        hire_date,
        status,
        medical_licenses: insertedLicenses
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Add emergency contact
   */
  async addEmergencyContact(data) {
    const { staff_id, contact_name, relationship, phone_number, priority = 'Primary (Ưu tiên 1)' } = data;
    const contactId = randomUUID();

    const insertSql = `
      INSERT INTO Emergency_Contacts (id, staff_id, contact_name, relationship, phone_number, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      contactId,
      staff_id,
      contact_name,
      relationship,
      phone_number,
      priority
    ]);

    return {
      id: contactId,
      staff_id,
      contact_name,
      relationship,
      phone_number,
      priority
    };
  },

  /**
   * Get emergency contacts by staff ID
   */
  async getEmergencyContacts(staffId) {
    const sql = `
      SELECT id, staff_id, contact_name, relationship, phone_number, priority, created_at, updated_at
      FROM Emergency_Contacts
      WHERE staff_id = ?
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.query(sql, [staffId]);
    return rows;
  },

  /**
   * Delete an emergency contact
   */
  async deleteEmergencyContact(contactId, staffId) {
    const sql = `DELETE FROM Emergency_Contacts WHERE id = ? AND staff_id = ?`;
    await pool.query(sql, [contactId, staffId]);
    return { success: true, message: 'Emergency contact removed successfully' };
  },

  /**
   * Update self-service profile information for an employee
   * Only allows modifying self-service personal fields. Protects HR enterprise fields.
   */
  async updateProfile(staffId, data) {
    const allowedFields = [
      'avatar_url',
      'marital_status',
      'personal_email',
      'personal_phone',
      'home_phone',
      'home_address',
      'district',
      'city_province',
      'postal_code'
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`\`${field}\` = ?`);
        params.push(data[field]);
      }
    }

    if (updates.length > 0) {
      const isNumeric = /^\d+$/.test(String(staffId));
      const whereClause = isNumeric ? 'id = ?' : 'employee_code = ?';
      const sql = `UPDATE Employees SET ${updates.join(', ')} WHERE ${whereClause}`;
      await pool.query(sql, [...params, staffId]);
    }

    return await this.getEmployeeById(staffId);
  },

  /**
   * Update employee avatar
   */
  async updateAvatar(staffId, avatarUrl) {
    const isNumeric = /^\d+$/.test(String(staffId));
    const whereClause = isNumeric ? 'id = ?' : 'employee_code = ?';
    const sql = `UPDATE Employees SET avatar_url = ? WHERE ${whereClause}`;
    await pool.query(sql, [avatarUrl, staffId]);
    return await this.getEmployeeById(staffId);
  },

  /**
   * Upload document
   */
  async uploadDocument(data) {
    const { staff_id, document_name, document_type = 'OTHER', file_url } = data;
    const documentId = randomUUID();

    const insertSql = `
      INSERT INTO Documents (id, staff_id, document_name, document_type, file_url)
      VALUES (?, ?, ?, ?, ?)
    `;

    await pool.execute(insertSql, [
      documentId,
      staff_id,
      document_name,
      document_type,
      file_url
    ]);

    return {
      id: documentId,
      staff_id,
      document_name,
      document_type,
      file_url
    };
  },

  /**
   * Get documents by staff ID
   */
  async getDocuments(staffId) {
    const sql = `
      SELECT id, staff_id, document_name, document_type, file_url, uploaded_at, created_at, updated_at
      FROM Documents
      WHERE staff_id = ?
      ORDER BY uploaded_at DESC
    `;
    const [rows] = await pool.query(sql, [staffId]);
    return rows;
  },

  /**
   * Get all medical licenses with employee and department info
   */
  async getAllLicenses(filters = {}) {
    const { status, employee_id, search } = filters;
    let sql = `
      SELECT 
        l.id,
        l.employee_id,
        e.employee_code AS staff_code,
        CONCAT(e.last_name, ' ', e.first_name) AS staff_name,
        d.name AS department_name,
        e.department_code,
        l.license_type,
        l.license_number,
        l.issuing_authority,
        l.issue_date,
        l.expiration_date,
        DATEDIFF(l.expiration_date, CURDATE()) AS days_until_expiry,
        l.verification_status,
        l.document_url,
        l.notes,
        l.created_at,
        l.updated_at
      FROM Medical_Licenses l
      JOIN Employees e ON l.employee_id = e.id
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      sql += ` AND l.verification_status = ?`;
      params.push(status);
    }
    if (employee_id) {
      sql += ` AND l.employee_id = ?`;
      params.push(employee_id);
    }
    if (search) {
      sql += ` AND (l.license_number LIKE ? OR l.license_type LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY l.expiration_date ASC`;

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Create new medical license
   */
  async createLicense(data) {
    const {
      employee_id,
      staff_code,
      license_type,
      license_number,
      issuing_authority,
      issue_date,
      expiration_date,
      verification_status = 'VERIFIED',
      document_url = null,
      notes = null
    } = data;

    let targetEmpId = employee_id;
    if (!targetEmpId && staff_code) {
      const [empRows] = await pool.query('SELECT id FROM Employees WHERE employee_code = ?', [staff_code]);
      if (empRows.length > 0) {
        targetEmpId = empRows[0].id;
      }
    }

    if (!targetEmpId) {
      throw new Error('Employee ID or valid staff_code is required');
    }

    const [result] = await pool.query(
      `INSERT INTO Medical_Licenses (employee_id, license_type, license_number, issuing_authority, issue_date, expiration_date, verification_status, document_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetEmpId,
        license_type,
        license_number,
        issuing_authority || null,
        issue_date || new Date().toISOString().slice(0, 10),
        expiration_date,
        verification_status,
        document_url,
        notes
      ]
    );

    const [created] = await pool.query(
      `SELECT 
        l.*,
        e.employee_code AS staff_code,
        CONCAT(e.last_name, ' ', e.first_name) AS staff_name,
        d.name AS department_name
       FROM Medical_Licenses l
       JOIN Employees e ON l.employee_id = e.id
       LEFT JOIN Departments d ON e.department_code = d.department_code
       WHERE l.id = ?`,
      [result.insertId]
    );

    return created[0];
  },

  /**
   * Update verification status of a medical license
   */
  async updateLicenseStatus(licenseId, status) {
    const validStatuses = ['PENDING', 'VERIFIED', 'EXPIRED', 'REVOKED'];
    if (!validStatuses.includes(status)) {
      const err = new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    await pool.query(
      'UPDATE Medical_Licenses SET verification_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, licenseId]
    );

    const [rows] = await pool.query(`
      SELECT 
        l.*,
        e.employee_code AS staff_code,
        CONCAT(e.last_name, ' ', e.first_name) AS staff_name,
        d.name AS department_name
      FROM Medical_Licenses l
      JOIN Employees e ON l.employee_id = e.id
      LEFT JOIN Departments d ON e.department_code = d.department_code
      WHERE l.id = ?
    `, [licenseId]);

    return rows[0] || null;
  },

  /**
   * Full HR Admin update for an employee - unlocks all fields
   */
  async adminUpdateEmployee(id, data) {
    const isNumeric = /^\d+$/.test(String(id));
    const whereClause = isNumeric ? 'id = ?' : 'employee_code = ?';

    const allowedFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'avatar_url',
      'dob',
      'gender',
      'marital_status',
      'national_id',
      'nationality',
      'personal_email',
      'personal_phone',
      'home_phone',
      'home_address',
      'district',
      'city_province',
      'postal_code',
      'work_location',
      'office_location',
      'department_code',
      'role',
      'specialty',
      'hire_date',
      'status'
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`\`${field}\` = ?`);
        params.push(data[field] === '' ? null : data[field]);
      }
    }

    if (updates.length > 0) {
      const sql = `UPDATE Employees SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`;
      await pool.query(sql, [...params, id]);
    }

    return await this.getEmployeeById(id);
  }
};

export default employeeService;
