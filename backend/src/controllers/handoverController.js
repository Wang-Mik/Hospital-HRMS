import handoverService from '../services/handoverService.js';

export const handoverController = {
  /**
   * POST /api/handovers
   * Create a new shift handover report
   */
  async createHandover(req, res) {
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
    } = req.body;

    if (!logged_by) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: logged_by is mandatory.'
      });
    }

    const validStatuses = ['DRAFT', 'PENDING_SIGNATURE', 'COMPLETED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    try {
      const data = await handoverService.createHandover({
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
        checklists
      });

      return res.status(201).json({
        success: true,
        message: 'Shift handover report created successfully',
        data
      });
    } catch (error) {
      console.error('[handoverController.createHandover Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create shift handover report',
        error: error.message
      });
    }
  },

  /**
   * GET /api/handovers
   * Retrieve all shift handover reports with filters
   */
  async getAllHandovers(req, res) {
    try {
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
      } = req.query;

      const rows = await handoverService.getAllHandovers({
        outgoing_shift_id,
        incoming_shift_id,
        department_code,
        handover_category,
        doc_type,
        logged_by,
        acknowledged_by,
        status,
        date
      });

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error('[handoverController.getAllHandovers Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve shift handovers',
        error: error.message
      });
    }
  },

  /**
   * GET /api/handovers/:id
   * Retrieve a single shift handover with its checklist items
   */
  async getHandoverById(req, res) {
    const { id } = req.params;
    try {
      const handover = await handoverService.getHandoverById(id);
      if (!handover) {
        return res.status(404).json({
          success: false,
          message: `Shift handover not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        data: handover
      });
    } catch (error) {
      console.error('[handoverController.getHandoverById Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve shift handover',
        error: error.message
      });
    }
  },

  /**
   * PUT/PATCH /api/handovers/:id
   * Update an existing shift handover
   */
  async updateHandover(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['DRAFT', 'PENDING_SIGNATURE', 'COMPLETED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    try {
      const updated = await handoverService.updateHandover(id, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: `Shift handover not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Shift handover updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('[handoverController.updateHandover Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update shift handover',
        error: error.message
      });
    }
  },

  /**
   * POST /api/handovers/:id/sign
   * Sign and acknowledge a shift handover
   */
  async signHandover(req, res) {
    const { id } = req.params;
    const { acknowledged_by } = req.body;

    if (!acknowledged_by) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: acknowledged_by is mandatory to sign handover.'
      });
    }

    try {
      const signed = await handoverService.signHandover(id, { acknowledged_by, status: 'COMPLETED' });
      if (!signed) {
        return res.status(404).json({
          success: false,
          message: `Shift handover not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Shift handover acknowledged and completed successfully',
        data: signed
      });
    } catch (error) {
      console.error('[handoverController.signHandover Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to sign shift handover',
        error: error.message
      });
    }
  },

  /**
   * POST /api/handovers/:id/checklists
   * Add a checklist item to an existing handover
   */
  async addChecklistItem(req, res) {
    const { id } = req.params;
    const { item_description, is_verified = false } = req.body;

    if (!item_description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: item_description is mandatory.'
      });
    }

    try {
      const item = await handoverService.addChecklistItem(id, { item_description, is_verified });
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `Shift handover not found with ID: ${id}`
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Checklist item added successfully',
        data: item
      });
    } catch (error) {
      console.error('[handoverController.addChecklistItem Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add checklist item',
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/handovers/checklists/:itemId
   * Update checklist item verification state or description
   */
  async updateChecklistItem(req, res) {
    const { itemId } = req.params;
    try {
      const updated = await handoverService.updateChecklistItem(itemId, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: `Checklist item not found with ID: ${itemId}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Checklist item updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('[handoverController.updateChecklistItem Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update checklist item',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/handovers/checklists/:itemId
   * Delete a checklist item by ID
   */
  async deleteChecklistItem(req, res) {
    const { itemId } = req.params;
    try {
      const deleted = await handoverService.deleteChecklistItem(itemId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `Checklist item not found with ID: ${itemId}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Checklist item deleted successfully'
      });
    } catch (error) {
      console.error('[handoverController.deleteChecklistItem Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete checklist item',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/handovers/:id
   * Delete a shift handover report by ID
   */
  async deleteHandover(req, res) {
    const { id } = req.params;
    try {
      const deleted = await handoverService.deleteHandover(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `Shift handover not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Shift handover deleted successfully'
      });
    } catch (error) {
      console.error('[handoverController.deleteHandover Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete shift handover',
        error: error.message
      });
    }
  }
};

export default handoverController;
