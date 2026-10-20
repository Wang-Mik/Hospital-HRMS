import { randomUUID } from 'crypto';
import pool from '../db.js';

export const handoverService = {
  /**
   * Create a new shift handover report with optional checklist items
   */
  async createHandover(data) {
    const {
      outgoing_shift_id = null,
      incoming_shift_id = null,
      department_code = null,
      handover_category = 'SHIFT_HANDOVER',
      doc_type = 'PHYSICAL_BOOK',
      file_url = null,
      external_link = null,
      physical_book_name = null,
      physical_book_page = null,
      physical_storage_location = null,
      summary_metrics = null,
      critical_notes = null,
      status = 'COMPLETED',
      logged_by,
      acknowledged_by = null,
      checklists = []
    } = data;

    const handoverId = randomUUID();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const insertHandoverSql = `
        INSERT INTO Shift_Handovers (
          id, outgoing_shift_id, incoming_shift_id, department_code,
          handover_category, doc_type, file_url, external_link,
          physical_book_name, physical_book_page, physical_storage_location,
          summary_metrics, critical_notes, status, logged_by, acknowledged_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await conn.execute(insertHandoverSql, [
        handoverId,
        outgoing_shift_id,
        incoming_shift_id,
        department_code,
        handover_category,
        doc_type,
        file_url,
        external_link,
        physical_book_name,
        physical_book_page,
        physical_storage_location,
        typeof summary_metrics === 'object' ? JSON.stringify(summary_metrics) : summary_metrics,
        critical_notes,
        status,
        logged_by,
        acknowledged_by
      ]);

      const insertedChecklists = [];
      if (Array.isArray(checklists) && checklists.length > 0) {
        for (const item of checklists) {
          const checklistId = randomUUID();
          const itemDescription = typeof item === 'string' ? item : item.item_description;
          const isVerified = typeof item === 'object' && item.is_verified ? Boolean(item.is_verified) : false;

          if (itemDescription) {
            await conn.execute(
              `INSERT INTO Handover_Checklists (id, handover_id, item_description, is_verified) VALUES (?, ?, ?, ?)`,
              [checklistId, handoverId, itemDescription, isVerified]
            );

            insertedChecklists.push({
              id: checklistId,
              handover_id: handoverId,
              item_description: itemDescription,
              is_verified: isVerified
            });
          }
        }
      }

      await conn.commit();

      return {
        id: handoverId,
        outgoing_shift_id,
        incoming_shift_id,
        department_code,
        handover_category,
        doc_type,
        file_url,
        external_link,
        physical_book_name,
        physical_book_page,
        physical_storage_location,
        summary_metrics,
        critical_notes,
        status,
        logged_by,
        acknowledged_by,
        checklists: insertedChecklists
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  /**
   * Retrieve all shift handovers with optional filters
   */
  async getAllHandovers(filters = {}) {
    const {
      outgoing_shift_id,
      incoming_shift_id,
      department_code,
      handover_category,
      doc_type,
      logged_by,
      acknowledged_by,
      status,
      date
    } = filters;

    let sql = `
      SELECT 
        h.*,
        d.name AS department_name,
        CONCAT(el.last_name, ' ', el.first_name) AS logged_by_name,
        el.role AS logged_by_role,
        CONCAT(ea.last_name, ' ', ea.first_name) AS acknowledged_by_name,
        ea.role AS acknowledged_by_role,
        so.shift_type AS outgoing_shift_type,
        so.start_time AS outgoing_start_time,
        so.end_time AS outgoing_end_time,
        so.on_call_tier AS outgoing_on_call_tier,
        so.team_code AS outgoing_team_code,
        si.shift_type AS incoming_shift_type,
        si.start_time AS incoming_start_time,
        si.end_time AS incoming_end_time
      FROM Shift_Handovers h
      LEFT JOIN Departments d ON h.department_code = d.department_code
      LEFT JOIN Employees el ON h.logged_by = el.employee_code
      LEFT JOIN Employees ea ON h.acknowledged_by = ea.employee_code
      LEFT JOIN Shifts so ON h.outgoing_shift_id = so.id
      LEFT JOIN Shifts si ON h.incoming_shift_id = si.id
      WHERE 1=1
    `;
    const params = [];

    if (outgoing_shift_id) {
      sql += ' AND h.outgoing_shift_id = ?';
      params.push(outgoing_shift_id);
    }
    if (incoming_shift_id) {
      sql += ' AND h.incoming_shift_id = ?';
      params.push(incoming_shift_id);
    }
    if (department_code) {
      sql += ' AND (h.department_code = ? OR so.department_code = ?)';
      params.push(department_code, department_code);
    }
    if (handover_category) {
      sql += ' AND h.handover_category = ?';
      params.push(handover_category);
    }
    if (doc_type) {
      sql += ' AND h.doc_type = ?';
      params.push(doc_type);
    }
    if (logged_by) {
      sql += ' AND h.logged_by = ?';
      params.push(logged_by);
    }
    if (acknowledged_by) {
      sql += ' AND h.acknowledged_by = ?';
      params.push(acknowledged_by);
    }
    if (status) {
      sql += ' AND h.status = ?';
      params.push(status);
    }
    if (date) {
      sql += ' AND DATE(h.created_at) = ?';
      params.push(date);
    }

    sql += ' ORDER BY h.created_at DESC';
    const [rows] = await pool.query(sql, params);
    return rows;
  },

  /**
   * Retrieve a single shift handover with its itemized checklist
   */
  async getHandoverById(id) {
    const sql = `
      SELECT 
        h.*,
        d.name AS department_name,
        CONCAT(el.last_name, ' ', el.first_name) AS logged_by_name,
        el.role AS logged_by_role,
        CONCAT(ea.last_name, ' ', ea.first_name) AS acknowledged_by_name,
        ea.role AS acknowledged_by_role,
        so.shift_type AS outgoing_shift_type,
        so.start_time AS outgoing_start_time,
        so.end_time AS outgoing_end_time,
        so.on_call_tier AS outgoing_on_call_tier,
        so.team_code AS outgoing_team_code,
        si.shift_type AS incoming_shift_type,
        si.start_time AS incoming_start_time,
        si.end_time AS incoming_end_time
      FROM Shift_Handovers h
      LEFT JOIN Departments d ON h.department_code = d.department_code
      LEFT JOIN Employees el ON h.logged_by = el.employee_code
      LEFT JOIN Employees ea ON h.acknowledged_by = ea.employee_code
      LEFT JOIN Shifts so ON h.outgoing_shift_id = so.id
      LEFT JOIN Shifts si ON h.incoming_shift_id = si.id
      WHERE h.id = ?
      LIMIT 1
    `;
    const [handovers] = await pool.query(sql, [id]);
    if (handovers.length === 0) return null;

    const handover = handovers[0];
    const [checklists] = await pool.query(
      'SELECT * FROM Handover_Checklists WHERE handover_id = ? ORDER BY created_at ASC',
      [id]
    );

    return {
      ...handover,
      checklists: Array.isArray(checklists)
        ? checklists.map((c) => ({
            ...c,
            is_verified: Boolean(c.is_verified)
          }))
        : []
    };
  },

  /**
   * Update an existing shift handover record
   */
  async updateHandover(id, updateData) {
    const existing = await this.getHandoverById(id);
    if (!existing) return null;

    const fields = [];
    const params = [];

    if (updateData.outgoing_shift_id !== undefined) {
      fields.push('outgoing_shift_id = ?');
      params.push(updateData.outgoing_shift_id);
    }
    if (updateData.incoming_shift_id !== undefined) {
      fields.push('incoming_shift_id = ?');
      params.push(updateData.incoming_shift_id);
    }
    if (updateData.department_code !== undefined) {
      fields.push('department_code = ?');
      params.push(updateData.department_code);
    }
    if (updateData.handover_category !== undefined) {
      fields.push('handover_category = ?');
      params.push(updateData.handover_category);
    }
    if (updateData.doc_type !== undefined) {
      fields.push('doc_type = ?');
      params.push(updateData.doc_type);
    }
    if (updateData.file_url !== undefined) {
      fields.push('file_url = ?');
      params.push(updateData.file_url);
    }
    if (updateData.external_link !== undefined) {
      fields.push('external_link = ?');
      params.push(updateData.external_link);
    }
    if (updateData.physical_book_name !== undefined) {
      fields.push('physical_book_name = ?');
      params.push(updateData.physical_book_name);
    }
    if (updateData.physical_book_page !== undefined) {
      fields.push('physical_book_page = ?');
      params.push(updateData.physical_book_page);
    }
    if (updateData.physical_storage_location !== undefined) {
      fields.push('physical_storage_location = ?');
      params.push(updateData.physical_storage_location);
    }
    if (updateData.summary_metrics !== undefined) {
      fields.push('summary_metrics = ?');
      params.push(
        typeof updateData.summary_metrics === 'object'
          ? JSON.stringify(updateData.summary_metrics)
          : updateData.summary_metrics
      );
    }
    if (updateData.critical_notes !== undefined) {
      fields.push('critical_notes = ?');
      params.push(updateData.critical_notes);
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      params.push(updateData.status);
    }
    if (updateData.logged_by !== undefined) {
      fields.push('logged_by = ?');
      params.push(updateData.logged_by);
    }
    if (updateData.acknowledged_by !== undefined) {
      fields.push('acknowledged_by = ?');
      params.push(updateData.acknowledged_by);
    }

    if (fields.length > 0) {
      params.push(id);
      const sql = `UPDATE Shift_Handovers SET ${fields.join(', ')} WHERE id = ?`;
      await pool.execute(sql, params);
    }

    return this.getHandoverById(id);
  },

  /**
   * Sign and complete a handover by incoming staff member
   */
  async signHandover(id, { acknowledged_by, status = 'COMPLETED' }) {
    const existing = await this.getHandoverById(id);
    if (!existing) return null;

    const sql = `
      UPDATE Shift_Handovers 
      SET acknowledged_by = ?, status = ?
      WHERE id = ?
    `;
    await pool.execute(sql, [acknowledged_by, status, id]);

    return this.getHandoverById(id);
  },

  /**
   * @deprecated [ARCHIVED] Clinical handover checklists are recorded in physical ward logbooks (QĐ 1895). Retained for historical record compatibility.
   * Add a checklist item to an existing handover
   */
  async addChecklistItem(handoverId, { item_description, is_verified = false }) {
    const existing = await this.getHandoverById(handoverId);
    if (!existing) return null;

    const itemId = randomUUID();
    const insertSql = `
      INSERT INTO Handover_Checklists (id, handover_id, item_description, is_verified)
      VALUES (?, ?, ?, ?)
    `;
    await pool.execute(insertSql, [itemId, handoverId, item_description, Boolean(is_verified)]);

    const [rows] = await pool.query('SELECT * FROM Handover_Checklists WHERE id = ? LIMIT 1', [itemId]);
    return rows.length > 0
      ? { ...rows[0], is_verified: Boolean(rows[0].is_verified) }
      : null;
  },

  /**
   * @deprecated [ARCHIVED] Clinical handover checklists are recorded in physical ward logbooks (QĐ 1895). Retained for historical record compatibility.
   * Update verification status or description of a checklist item
   */
  async updateChecklistItem(itemId, updateData) {
    const [existing] = await pool.query('SELECT * FROM Handover_Checklists WHERE id = ? LIMIT 1', [itemId]);
    if (existing.length === 0) return null;

    const fields = [];
    const params = [];

    if (updateData.is_verified !== undefined) {
      fields.push('is_verified = ?');
      params.push(Boolean(updateData.is_verified));
    }
    if (updateData.item_description !== undefined) {
      fields.push('item_description = ?');
      params.push(updateData.item_description);
    }

    if (fields.length > 0) {
      params.push(itemId);
      const sql = `UPDATE Handover_Checklists SET ${fields.join(', ')} WHERE id = ?`;
      await pool.execute(sql, params);
    }

    const [updated] = await pool.query('SELECT * FROM Handover_Checklists WHERE id = ? LIMIT 1', [itemId]);
    return updated.length > 0
      ? { ...updated[0], is_verified: Boolean(updated[0].is_verified) }
      : null;
  },

  /**
   * @deprecated [ARCHIVED] Clinical handover checklists are recorded in physical ward logbooks (QĐ 1895). Retained for historical record compatibility.
   * Delete a checklist item by ID
   */
  async deleteChecklistItem(itemId) {
    const [result] = await pool.execute('DELETE FROM Handover_Checklists WHERE id = ?', [itemId]);
    return result.affectedRows > 0;
  },

  /**
   * Delete a shift handover by ID
   */
  async deleteHandover(id) {
    const [result] = await pool.execute('DELETE FROM Shift_Handovers WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
};

export default handoverService;
