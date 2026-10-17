import notificationService from '../services/notificationService.js';

export const notificationController = {
  /**
   * GET /api/notifications/:staff_id
   */
  async getNotificationsByStaffId(req, res) {
    const { staff_id } = req.params;

    if (!staff_id) {
      return res.status(400).json({
        type: 'https://api.hospital-hrm.org/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'staff_id parameter is required.',
        instance: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }

    try {
      const { is_read, type } = req.query;
      const rows = await notificationService.getNotificationsByStaffId(staff_id, { is_read, type });

      return res.status(200).json({
        success: true,
        target_staff_id: staff_id,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error(`[notificationController.getNotificationsByStaffId Error] staff_id ${staff_id}:`, error);
      return res.status(500).json({
        type: 'https://api.hospital-hrm.org/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to retrieve notifications for staff member: ' + error.message,
        instance: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }
  },

  /**
   * PATCH /api/notifications/:id/read
   */
  async markNotificationAsRead(req, res) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        type: 'https://api.hospital-hrm.org/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'Notification ID parameter is required.',
        instance: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }

    try {
      const updated = await notificationService.markNotificationAsRead(id);

      if (!updated) {
        return res.status(404).json({
          type: 'https://api.hospital-hrm.org/errors/not-found',
          title: 'Notification Not Found',
          status: 404,
          detail: `Notification not found with ID: ${id}`,
          instance: req.originalUrl,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        id,
        is_read: true
      });
    } catch (error) {
      console.error(`[notificationController.markNotificationAsRead Error] ID ${id}:`, error);
      return res.status(500).json({
        type: 'https://api.hospital-hrm.org/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to update notification status: ' + error.message,
        instance: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }
  },

  /**
   * POST /api/notifications
   */
  async createNotification(req, res) {
    const {
      target_staff_id,
      title,
      message,
      type = 'ANNOUNCEMENT'
    } = req.body;

    if (!target_staff_id || !title || !message) {
      return res.status(400).json({
        type: 'https://api.hospital-hrm.org/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'Missing required fields: target_staff_id, title, and message are mandatory.',
        instance: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }

    const validTypes = ['ALERT', 'ANNOUNCEMENT', 'TASK'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        type: 'https://api.hospital-hrm.org/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
        instance: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }

    try {
      const data = await notificationService.createNotification({
        target_staff_id,
        title,
        message,
        type
      });

      return res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data
      });
    } catch (error) {
      console.error('[notificationController.createNotification Error]:', error);
      return res.status(500).json({
        type: 'https://api.hospital-hrm.org/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to create notification: ' + error.message,
        instance: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }
  },

  /**
   * PATCH /api/notifications/:staff_id/mark-all-read
   */
  async markAllAsRead(req, res) {
    const { staff_id } = req.params;
    if (!staff_id) {
      return res.status(400).json({ success: false, message: 'staff_id is required' });
    }

    try {
      const result = await notificationService.markAllAsRead(staff_id);
      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result
      });
    } catch (error) {
      console.error('[notificationController.markAllAsRead Error]:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * GET /api/notifications
   */
  async getAllNotifications(req, res) {
    try {
      const { type, is_read, limit } = req.query;
      const rows = await notificationService.getAllNotifications({ type, is_read, limit });
      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error('[notificationController.getAllNotifications Error]:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

export default notificationController;
