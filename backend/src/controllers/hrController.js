import hrService from '../services/hrService.js';

export const hrController = {
  /**
   * GET /api/hr/contracts
   */
  async getContracts(req, res) {
    try {
      const { expiring_within_days, contract_type, status, search } = req.query;
      const contracts = await hrService.getContracts({
        expiring_within_days,
        contract_type,
        status,
        search
      });
      return res.status(200).json({
        success: true,
        count: contracts.length,
        data: contracts
      });
    } catch (error) {
      console.error('[hrController.getContracts Error]:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tải danh sách hợp đồng lao động'
      });
    }
  },

  /**
   * POST /api/hr/contracts
   */
  async saveContract(req, res) {
    try {
      const contract = await hrService.createOrUpdateContract(req.body, req.user);
      return res.status(200).json({
        success: true,
        message: 'Lưu hợp đồng lao động thành công',
        data: contract
      });
    } catch (error) {
      console.error('[hrController.saveContract Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi lưu hợp đồng lao động'
      });
    }
  },

  /**
   * GET /api/hr/insurances
   */
  async getInsurances(req, res) {
    try {
      const { staff_id, status, search } = req.query;
      const insurances = await hrService.getInsurances({
        staff_id,
        status,
        search
      });
      return res.status(200).json({
        success: true,
        count: insurances.length,
        data: insurances
      });
    } catch (error) {
      console.error('[hrController.getInsurances Error]:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tải thông tin bảo hiểm y tế & xã hội'
      });
    }
  },

  /**
   * PUT /api/hr/insurances/:staff_id
   */
  async updateInsurance(req, res) {
    try {
      const { staff_id } = req.params;
      const insurance = await hrService.updateInsurance(staff_id, req.body, req.user);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật sổ bảo hiểm thành công',
        data: insurance
      });
    } catch (error) {
      console.error('[hrController.updateInsurance Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật sổ bảo hiểm'
      });
    }
  },

  /**
   * GET /api/hr/rewards-disciplines
   */
  async getCommendationsDisciplines(req, res) {
    try {
      const { staff_id, record_type, search } = req.query;
      const records = await hrService.getCommendationsDisciplines({
        staff_id,
        record_type,
        search
      });
      return res.status(200).json({
        success: true,
        count: records.length,
        data: records
      });
    } catch (error) {
      console.error('[hrController.getCommendationsDisciplines Error]:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tải danh sách khen thưởng & kỷ luật'
      });
    }
  },

  /**
   * POST /api/hr/rewards-disciplines
   */
  async createCommendationDiscipline(req, res) {
    try {
      const record = await hrService.createCommendationDiscipline(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Ghi nhận quyết định khen thưởng / kỷ luật thành công',
        data: record
      });
    } catch (error) {
      console.error('[hrController.createCommendationDiscipline Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi lưu quyết định khen thưởng / kỷ luật'
      });
    }
  },

  /**
   * PATCH /api/hr/salary-increment/:staff_id
   */
  async updateSalaryIncrement(req, res) {
    try {
      const { staff_id } = req.params;
      const updated = await hrService.updateSalaryIncrement(staff_id, req.body, req.user);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật ngày tăng lương và quyền riêng tư thành công',
        data: updated
      });
    } catch (error) {
      console.error('[hrController.updateSalaryIncrement Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi cập nhật ngày tăng lương'
      });
    }
  }
};

export default hrController;
