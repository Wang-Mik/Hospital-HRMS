import { randomUUID } from 'crypto';
import pool from '../db.js';

export const auditService = {
  /**
   * Log an audit trail entry
   * @param {Object} entry
   * @param {string} entry.actor_id - Employee code or Account ID of the person making the change
   * @param {string} [entry.actor_name] - Name or username of the actor
   * @param {string} entry.action - Action performed (e.g. UPDATE_ROLE, LOCK_ACCOUNT, DEPT_APPROVE_LEAVE, etc.)
   * @param {string} entry.resource_type - Type of resource (e.g. IAM_ACCOUNT, DEPARTMENT, LEAVE_REQUEST)
   * @param {string} [entry.resource_id] - Target ID
   * @param {any} [entry.old_values] - Previous values before mutation
   * @param {any} [entry.new_values] - New values after mutation
   * @param {string} [entry.ip_address] - Client IP address
   */
  async logAudit({
    actor_id,
    actor_name = null,
    action,
    resource_type,
    resource_id = null,
    old_values = null,
    new_values = null,
    ip_address = null
  }) {
    if (!actor_id || !action || !resource_type) {
      console.warn('[auditService.logAudit Warning]: Missing required fields (actor_id, action, resource_type)');
      return false;
    }

    try {
      const id = randomUUID();
      const oldValJson = old_values !== null && old_values !== undefined
        ? (typeof old_values === 'string' ? old_values : JSON.stringify(old_values))
        : null;
      const newValJson = new_values !== null && new_values !== undefined
        ? (typeof new_values === 'string' ? new_values : JSON.stringify(new_values))
        : null;

      const sql = `
        INSERT INTO Audit_Logs (
          id, actor_id, actor_name, action, resource_type, resource_id,
          old_values, new_values, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await pool.execute(sql, [
        id,
        String(actor_id),
        actor_name ? String(actor_name) : null,
        String(action),
        String(resource_type),
        resource_id ? String(resource_id) : null,
        oldValJson,
        newValJson,
        ip_address ? String(ip_address) : null
      ]);

      return true;
    } catch (error) {
      console.error('[auditService.logAudit Error]:', error.message);
      return false;
    }
  },

  /**
   * Query audit logs with pagination and filters
   */
  async getAuditLogs(options = {}) {
    const {
      page = 1,
      limit = 50,
      actor_id,
      action,
      resource_type,
      search,
      startDate,
      endDate
    } = options;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let whereConditions = ['1=1'];
    const params = [];

    if (actor_id) {
      whereConditions.push('actor_id = ?');
      params.push(actor_id);
    }

    if (action) {
      whereConditions.push('action = ?');
      params.push(action);
    }

    if (resource_type) {
      whereConditions.push('resource_type = ?');
      params.push(resource_type);
    }

    if (search) {
      whereConditions.push('(actor_id LIKE ? OR actor_name LIKE ? OR action LIKE ? OR resource_id LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Count total
    const countSql = `SELECT COUNT(*) AS total FROM Audit_Logs WHERE ${whereClause}`;
    const [countRows] = await pool.query(countSql, params);
    const total = Number(countRows[0]?.total || 0);

    // Fetch paginated rows
    const dataSql = `
      SELECT 
        id, actor_id, actor_name, action, resource_type, resource_id,
        old_values, new_values, ip_address, created_at
      FROM Audit_Logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...params, limitNum, offset]);

    const formattedRows = rows.map((r) => {
      let parsedOld = null;
      let parsedNew = null;
      try {
        parsedOld = r.old_values ? (typeof r.old_values === 'string' ? JSON.parse(r.old_values) : r.old_values) : null;
      } catch (e) {
        parsedOld = r.old_values;
      }
      try {
        parsedNew = r.new_values ? (typeof r.new_values === 'string' ? JSON.parse(r.new_values) : r.new_values) : null;
      } catch (e) {
        parsedNew = r.new_values;
      }

      return {
        ...r,
        old_values: parsedOld,
        new_values: parsedNew
      };
    });

    return {
      data: formattedRows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    };
  }
};

export default auditService;
