import { surgeDispatchService } from '../services/surgeDispatchService.js';

export const surgeDispatchController = {
  /**
   * GET /api/surge-dispatches/candidates/:departmentCode
   */
  async getCandidates(req, res) {
    try {
      const { departmentCode } = req.params;
      const { target_date, required_role, staff_type } = req.query;

      const result = await surgeDispatchService.getCandidatesForSurge(departmentCode, {
        target_date,
        required_role: required_role || staff_type
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[surgeDispatchController.getCandidates Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi khi quét ứng viên điều động.'
      });
    }
  },

  /**
   * POST /api/surge-dispatches
   */
  async createDispatch(req, res) {
    try {
      const actor = req.user || {};
      const result = await surgeDispatchService.createSurgeDispatch(req.body, actor);
      return res.status(201).json(result);
    } catch (error) {
      console.error('[surgeDispatchController.createDispatch Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi khi phát lệnh điều động cấp cứu.'
      });
    }
  },

  /**
   * GET /api/surge-dispatches/active
   */
  async getActiveDispatches(req, res) {
    try {
      const { department_code } = req.query;
      const rows = await surgeDispatchService.getActiveDispatches(department_code);
      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error('[surgeDispatchController.getActiveDispatches Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi khi lấy danh sách phiên điều động đang kích hoạt.'
      });
    }
  },

  /**
   * POST /api/surge-dispatches/:id/log-call
   */
  async logCallResult(req, res) {
    try {
      const { id } = req.params;
      const actor = req.user || {};
      const result = await surgeDispatchService.logCallResult(id, req.body, actor);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[surgeDispatchController.logCallResult Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi khi ghi nhận kết quả cuộc gọi điều phối.'
      });
    }
  },

  /**
   * POST /api/surge-dispatches/:id/resolve
   */
  async resolveDispatch(req, res) {
    try {
      const { id } = req.params;
      const actor = req.user || {};
      const result = await surgeDispatchService.resolveSurgeDispatch(id, req.body, actor);
      return res.status(200).json(result);
    } catch (error) {
      console.error('[surgeDispatchController.resolveDispatch Error]:', error);
      const status = error.statusCode || 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Lỗi khi kết thúc phiên điều động.'
      });
    }
  }
};
