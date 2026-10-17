import adminService from '../services/adminService.js';

export const adminController = {
  /**
   * GET /api/admin/overview
   */
  async getOverview(req, res) {
    try {
      const data = await adminService.getOverview();
      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('[adminController.getOverview Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải số liệu tổng quan quản trị',
        error: error.message
      });
    }
  },

  /**
   * GET /api/admin/accounts
   */
  async getAllAccounts(req, res) {
    try {
      const accounts = await adminService.getAllAccounts();
      return res.status(200).json({
        success: true,
        count: accounts.length,
        data: accounts
      });
    } catch (error) {
      console.error('[adminController.getAllAccounts Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể tải danh sách tài khoản hệ thống',
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/admin/accounts/:id/lock
   */
  async toggleAccountLock(req, res) {
    const { id } = req.params;
    const { is_locked } = req.body;

    if (is_locked === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Trường is_locked là bắt buộc (true hoặc false).'
      });
    }

    try {
      const updated = await adminService.toggleAccountLock(id, is_locked);
      return res.status(200).json({
        success: true,
        message: `Đã ${is_locked ? 'khóa' : 'mở khóa'} tài khoản thành công.`,
        data: updated
      });
    } catch (error) {
      console.error('[adminController.toggleAccountLock Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi thay đổi trạng thái khóa tài khoản',
        error: error.message
      });
    }
  },

  /**
   * POST /api/admin/accounts/:id/reset-password
   */
  async resetPassword(req, res) {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({
        success: false,
        message: 'new_password là trường bắt buộc.'
      });
    }

    try {
      const result = await adminService.resetPassword(id, new_password);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[adminController.resetPassword Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi đặt lại mật khẩu tài khoản'
      });
    }
  },

  /**
   * POST /api/admin/broadcast
   */
  async broadcastNotification(req, res) {
    try {
      const result = await adminService.broadcastNotification(req.body);
      return res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('[adminController.broadcastNotification Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi gửi thông báo nội bộ bệnh viện'
      });
    }
  },

  /**
   * POST /api/admin/onboard
   */
  async adminOnboardStaff(req, res) {
    try {
      const result = await adminService.adminOnboardStaff(req.body);
      return res.status(201).json(result);
    } catch (error) {
      console.error('[adminController.adminOnboardStaff Error]:', error);
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Lỗi khi tiếp nhận nhân sự mới',
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/admin/accounts/:id/role
   */
  async updateAccountRole(req, res) {
    const { id } = req.params;
    const { role_code } = req.body;

    if (!role_code) {
      return res.status(400).json({
        success: false,
        message: 'role_code là trường bắt buộc.'
      });
    }

    try {
      const updated = await adminService.updateAccountRole(id, role_code);
      return res.status(200).json({
        success: true,
        message: `Đã cập nhật phân quyền tài khoản thành ${role_code} thành công.`,
        data: updated
      });
    } catch (error) {
      console.error('[adminController.updateAccountRole Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật vai trò tài khoản'
      });
    }
  },

  /**
   * GET /api/admin/roles
   */
  async getAllRoles(req, res) {
    try {
      const roles = await adminService.getAllRoles();
      return res.status(200).json({
        success: true,
        count: roles.length,
        data: roles
      });
    } catch (error) {
      console.error('[adminController.getAllRoles Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách vai trò và quyền hạn',
        error: error.message
      });
    }
  }
};

export default adminController;
