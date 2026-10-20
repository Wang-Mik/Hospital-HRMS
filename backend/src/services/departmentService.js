import pool from '../db.js';

export const departmentService = {
  /**
   * Get all departments with employee headcount and optional status filter
   */
  async getAllDepartments(includeInactive = true) {
    let sql = `
      SELECT 
        d.id,
        d.department_code,
        d.name,
        d.description,
        d.location,
        d.status,
        d.created_at,
        d.updated_at,
        COUNT(e.id) AS employee_count
      FROM Departments d
      LEFT JOIN Employees e ON d.department_code = e.department_code AND e.status = 'ACTIVE'
    `;
    if (!includeInactive) {
      sql += ` WHERE d.status = 'ACTIVE'`;
    }
    sql += ` GROUP BY d.id ORDER BY d.id ASC`;
    const [rows] = await pool.query(sql);
    return rows;
  },

  /**
   * Get department by department_code or id
   */
  async getDepartmentByCode(codeOrId) {
    const sql = `
      SELECT 
        d.id,
        d.department_code,
        d.name,
        d.description,
        d.location,
        d.status,
        d.created_at,
        d.updated_at,
        COUNT(e.id) AS employee_count
      FROM Departments d
      LEFT JOIN Employees e ON d.department_code = e.department_code AND e.status = 'ACTIVE'
      WHERE d.department_code = ? OR d.id = ?
      GROUP BY d.id
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [codeOrId, codeOrId]);
    return rows.length > 0 ? rows[0] : null;
  },

  /**
   * Create new hospital department
   */
  async createDepartment({ department_code, name, description, location, status = 'ACTIVE' }) {
    if (!department_code || !name) {
      const err = new Error('department_code và name là bắt buộc.');
      err.statusCode = 400;
      throw err;
    }

    const [existing] = await pool.query('SELECT id FROM Departments WHERE department_code = ? LIMIT 1', [department_code]);
    if (existing.length > 0) {
      const err = new Error(`Mã khoa phòng "${department_code}" đã tồn tại.`);
      err.statusCode = 409;
      throw err;
    }

    const [result] = await pool.execute(
      `INSERT INTO Departments (department_code, name, description, location, status) VALUES (?, ?, ?, ?, ?)`,
      [department_code, name, description || null, location || null, status]
    );

    return await this.getDepartmentByCode(department_code);
  },

  /**
   * Update department details
   */
  async updateDepartment(codeOrId, data) {
    const { name, description, location, status } = data;
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('`name` = ?'); params.push(name); }
    if (description !== undefined) { updates.push('`description` = ?'); params.push(description); }
    if (location !== undefined) { updates.push('`location` = ?'); params.push(location); }
    if (status !== undefined) { updates.push('`status` = ?'); params.push(status); }

    if (updates.length > 0) {
      const sql = `UPDATE Departments SET ${updates.join(', ')} WHERE department_code = ? OR id = ?`;
      await pool.query(sql, [...params, codeOrId, codeOrId]);
    }

    return await this.getDepartmentByCode(codeOrId);
  }
};

export default departmentService;
