import taskService from '../services/taskService.js';

export const taskController = {
  /**
   * POST /api/tasks
   * Create a new daily task
   */
  async createTask(req, res) {
    const {
      title,
      description,
      assigned_to,
      assigned_by,
      shift_id,
      status = 'PENDING',
      due_date
    } = req.body;

    if (!title || !assigned_to) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title and assigned_to are mandatory.'
      });
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    if (due_date) {
      const parsedDate = new Date(due_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date-time format for due_date.'
        });
      }
    }

    try {
      const data = await taskService.createTask({
        title,
        description,
        assigned_to,
        assigned_by,
        shift_id,
        status,
        due_date
      });

      return res.status(201).json({
        success: true,
        message: 'Daily task created successfully',
        data
      });
    } catch (error) {
      console.error('[taskController.createTask Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create daily task',
        error: error.message
      });
    }
  },

  /**
   * GET /api/tasks
   * Retrieve all daily tasks with optional filters
   */
  async getAllTasks(req, res) {
    try {
      const { assigned_to, assigned_by, shift_id, status, date } = req.query;
      const rows = await taskService.getAllTasks({ assigned_to, assigned_by, shift_id, status, date });

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error('[taskController.getAllTasks Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve daily tasks',
        error: error.message
      });
    }
  },

  /**
   * GET /api/tasks/:id
   * Retrieve a single daily task by ID
   */
  async getTaskById(req, res) {
    const { id } = req.params;
    try {
      const task = await taskService.getTaskById(id);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: `Daily task not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('[taskController.getTaskById Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve daily task',
        error: error.message
      });
    }
  },

  /**
   * PUT/PATCH /api/tasks/:id
   * Update an existing daily task
   */
  async updateTask(req, res) {
    const { id } = req.params;
    const { status, due_date } = req.body;

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    if (due_date) {
      const parsedDate = new Date(due_date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date-time format for due_date.'
        });
      }
    }

    try {
      const updated = await taskService.updateTask(id, req.body);
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: `Daily task not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Daily task updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('[taskController.updateTask Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update daily task',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/tasks/:id
   * Delete a daily task by ID
   */
  async deleteTask(req, res) {
    const { id } = req.params;
    try {
      const deleted = await taskService.deleteTask(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: `Daily task not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Daily task deleted successfully'
      });
    } catch (error) {
      console.error('[taskController.deleteTask Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete daily task',
        error: error.message
      });
    }
  }
};

export default taskController;
