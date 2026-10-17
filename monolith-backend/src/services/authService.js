import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

export const authService = {
  /**
   * Register a new user account linked to an Employee
   * Hashes password and enforces physical FK and unique constraints
   * @param {Object} data { employee_id, username, password }
   * @returns {Promise<Object>} Created account metadata
   */
  async register({ employee_id, username, password, role_code = 'STAFF' }) {
    if (!employee_id || !username || !password) {
      const err = new Error('Missing required fields: employee_id, username, and password are mandatory.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Explicitly verify employee foreign key existence
    const [employeeRows] = await pool.query(
      'SELECT id, employee_code, first_name, last_name, email FROM Employees WHERE id = ? LIMIT 1',
      [employee_id]
    );

    if (!employeeRows || employeeRows.length === 0) {
      const fkErr = new Error(`Foreign key constraint violation: Employee with ID ${employee_id} does not exist.`);
      fkErr.statusCode = 400;
      fkErr.code = 'ER_NO_REFERENCED_ROW_2';
      throw fkErr;
    }

    // 2. Check if username is already registered
    const [existingUsers] = await pool.query(
      'SELECT id FROM Accounts WHERE username = ? LIMIT 1',
      [username]
    );

    if (existingUsers && existingUsers.length > 0) {
      const dupErr = new Error(`Username "${username}" is already taken.`);
      dupErr.statusCode = 409;
      dupErr.code = 'ER_DUP_ENTRY';
      throw dupErr;
    }

    // 3. Hash password with bcrypt (10 salt rounds)
    const password_hash = await bcrypt.hash(password, 10);
    const accountId = randomUUID();

    // 4. Insert account into database with role_code
    try {
      await pool.execute(
        `INSERT INTO Accounts (id, employee_id, username, role_code, password_hash, is_locked)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [accountId, employee_id, username, role_code, password_hash, false]
      );
    } catch (dbError) {
      if (dbError.code === 'ER_NO_REFERENCED_ROW_2' || dbError.errno === 1452) {
        const fkErr = new Error(`Foreign key constraint violation: Employee with ID ${employee_id} does not exist.`);
        fkErr.statusCode = 400;
        throw fkErr;
      }
      if (dbError.code === 'ER_DUP_ENTRY' || dbError.errno === 1062) {
        const dupErr = new Error(`Username "${username}" is already taken.`);
        dupErr.statusCode = 409;
        throw dupErr;
      }
      throw dbError;
    }

    return {
      id: accountId,
      employee_id,
      username,
      role: role_code,
      role_code,
      is_locked: false,
      created_at: new Date().toISOString()
    };
  },

  /**
   * Verify credentials, check lock status, update last_login, and generate JWT token
   * @param {Object} credentials { username, password }
   * @returns {Promise<Object>} { token, account, employee }
   */
  async login({ username, password }) {
    if (!username || !password) {
      const err = new Error('Missing credentials: username and password are required.');
      err.statusCode = 400;
      throw err;
    }

    // 1. Fetch account with joined employee profile and IAM Role
    const query = `
      SELECT 
        a.id,
        a.employee_id,
        a.username,
        a.role_code,
        r.name AS role_name,
        r.description AS role_description,
        a.password_hash,
        a.is_locked,
        a.last_login,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.department_code
      FROM Accounts a
      JOIN Roles r ON a.role_code = r.role_code
      LEFT JOIN Employees e ON a.employee_id = e.id
      WHERE a.username = ?
      LIMIT 1
    `;

    const [rows] = await pool.query(query, [username]);

    if (!rows || rows.length === 0) {
      const err = new Error('Invalid credentials.');
      err.statusCode = 401;
      throw err;
    }

    const account = rows[0];

    // 2. Check if account is locked
    if (account.is_locked) {
      const err = new Error('Account is locked. Please contact system administrator.');
      err.statusCode = 403;
      throw err;
    }

    // 3. Verify password hash using bcrypt
    const isMatch = await bcrypt.compare(password, account.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid credentials.');
      err.statusCode = 401;
      throw err;
    }

    // 4. Update last_login timestamp
    await pool.query('UPDATE Accounts SET last_login = NOW() WHERE id = ?', [account.id]);

    // 5. Query assigned permissions for this role
    let permissions = [];
    try {
      const [permRows] = await pool.query(`
        SELECT p.permission_code
        FROM Permissions p
        JOIN Role_Permissions rp ON p.id = rp.permission_id
        JOIN Roles r ON rp.role_id = r.id
        WHERE r.role_code = ?
      `, [account.role_code]);
      if (Array.isArray(permRows)) {
        permissions = permRows.map(p => p.permission_code);
      }
    } catch {
      permissions = [];
    }

    const resolvedRole = account.role_code || account.role || 'STAFF';

    // 6. Generate signed JWT token (24-hour expiration)
    const jwtSecret = process.env.JWT_SECRET || 'hospital-hrms-monolith-secret-key-2026';
    const token = jwt.sign(
      {
        account_id: account.id,
        employee_id: account.employee_id,
        username: account.username,
        employee_code: account.employee_code,
        role: resolvedRole,
        role_name: account.role_name,
        permissions
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      token,
      account: {
        id: account.id,
        employee_id: account.employee_id,
        username: account.username,
        role: resolvedRole,
        role_code: resolvedRole,
        role_name: account.role_name,
        permissions,
        is_locked: Boolean(account.is_locked),
        last_login: new Date()
      },
      employee: {
        id: account.employee_id,
        employee_code: account.employee_code,
        first_name: account.first_name,
        last_name: account.last_name,
        email: account.email,
        department_code: account.department_code,
        role: resolvedRole,
        role_code: resolvedRole,
        role_name: account.role_name
      },
      permissions
    };
  }
};

export default authService;
