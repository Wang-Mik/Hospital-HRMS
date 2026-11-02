import kpiService from '../services/kpiService.js';

export const kpiController = {
  /**
   * GET /api/kpi
   */
  async getMonthlyKpis(req, res) {
    try {
      const { month, department_code, staff_id, status } = req.query;
      const kpis = await kpiService.getMonthlyKpis({
        month,
        department_code,
        staff_id,
        status
      });
      return res.status(200).json({
        success: true,
        count: kpis.length,
        data: kpis
      });
    } catch (error) {
      console.error('[kpiController.getMonthlyKpis Error]:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tải danh sách KPI tháng'
      });
    }
  },

  /**
   * GET /api/kpi/my-history
   */
  async getMyKpiHistory(req, res) {
    try {
      const staffId = req.query.staff_id || req.user?.employee_code || 'EMP-DOC-001';
      const history = await kpiService.getStaffKpiHistory(staffId);
      return res.status(200).json({
        success: true,
        staff_id: staffId,
        count: history.length,
        data: history
      });
    } catch (error) {
      console.error('[kpiController.getMyKpiHistory Error]:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tải lịch sử KPI cá nhân'
      });
    }
  },

  /**
   * POST /api/kpi/auto-compute
   */
  async autoComputeMonthlyKpi(req, res) {
    try {
      const { month, department_code } = req.body;
      const result = await kpiService.autoComputeMonthlyKpi(month, department_code);
      return res.status(200).json({
        success: true,
        message: `Đã tính toán tự động KPI tháng ${month} cho ${result.computed_count} nhân sự.`,
        data: result
      });
    } catch (error) {
      console.error('[kpiController.autoComputeMonthlyKpi Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi tính toán tự động KPI tháng'
      });
    }
  },

  /**
   * POST /api/kpi/evaluate
   */
  async saveKpiEvaluation(req, res) {
    try {
      const evaluated = await kpiService.saveKpiEvaluation(req.body, req.user);
      return res.status(200).json({
        success: true,
        message: `Đã lưu đánh giá và xếp loại KPI cho cán bộ ${req.body.staff_id}.`,
        data: evaluated
      });
    } catch (error) {
      console.error('[kpiController.saveKpiEvaluation Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi lưu đánh giá KPI'
      });
    }
  }
};

export default kpiController;
