import payrollService from '../services/payrollService.js';
import { ROLE_GROUPS, hasAnyRole } from '../constants/roles.js';

export const payrollController = {
  /**
   * POST /api/payroll/runs
   */
  async createPayrollRun(req, res) {
    const { start_date, end_date, status = 'DRAFT' } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: start_date and end_date are mandatory.'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for start_date or end_date. Expected YYYY-MM-DD.'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'start_date must be earlier than or equal to end_date.'
      });
    }

    const validStatuses = ['DRAFT', 'PROCESSING', 'APPROVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    try {
      const data = await payrollService.createPayrollRun({ start_date, end_date, status });
      return res.status(201).json({
        success: true,
        message: 'Payroll run initiated successfully',
        data
      });
    } catch (error) {
      console.error('[payrollController.createPayrollRun Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initiate payroll run',
        error: error.message
      });
    }
  },

  /**
   * GET /api/payroll/payslips/:staff_id
   */
  async getPaySlipsByStaffId(req, res) {
    const { staff_id } = req.params;

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'staff_id parameter is required.'
      });
    }

    // Ownership check: regular staff can only inspect their own pay slips
    const isPayrollOperator = hasAnyRole(req.user, ROLE_GROUPS.PAYROLL_OPERATORS);
    if (
      req.user &&
      !isPayrollOperator &&
      req.user.employee_code !== staff_id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối: Bạn chỉ có thể xem phiếu lương của chính mình.'
      });
    }

    try {
      const rows = await payrollService.getPaySlipsByStaffId(staff_id);
      const visibleRows = isPayrollOperator
        ? rows
        : rows.filter((r) => r.status !== 'DRAFT');

      return res.status(200).json({
        success: true,
        staff_id,
        count: visibleRows.length,
        data: visibleRows
      });
    } catch (error) {
      console.error(`[payrollController.getPaySlipsByStaffId Error] staff_id ${staff_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve pay slips for staff member',
        error: error.message
      });
    }
  },

  /**
   * GET /api/payroll/rates/:staff_id
   */
  async getPayRateByStaffId(req, res) {
    const { staff_id } = req.params;

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'staff_id parameter is required.'
      });
    }

    try {
      const rate = await payrollService.getPayRateByStaffId(staff_id);
      return res.status(200).json({
        success: true,
        staff_id,
        data: rate
      });
    } catch (error) {
      console.error(`[payrollController.getPayRateByStaffId Error] staff_id ${staff_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve pay rate for staff member',
        error: error.message
      });
    }
  },

  /**
   * GET /api/payroll/runs
   */
  async getAllPayrollRuns(req, res) {
    try {
      const { status } = req.query;
      const rows = await payrollService.getAllPayrollRuns(status);

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error('[payrollController.getAllPayrollRuns Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve payroll runs',
        error: error.message
      });
    }
  },

  /**
   * GET /api/payroll/runs/:id
   */
  async getPayrollRunById(req, res) {
    const { id } = req.params;

    try {
      const run = await payrollService.getPayrollRunById(id);
      if (!run) {
        return res.status(404).json({
          success: false,
          message: `Payroll run not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        data: run
      });
    } catch (error) {
      console.error(`[payrollController.getPayrollRunById Error] ID ${id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve payroll run',
        error: error.message
      });
    }
  },

  /**
   * GET /api/payroll/runs/:id/slips
   */
  async getPaySlipsByRunId(req, res) {
    const { id } = req.params;
    try {
      const result = await payrollService.getPaySlipsByRunId(id);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error(`[payrollController.getPaySlipsByRunId Error] ID ${id}:`, error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to retrieve pay slips for payroll run'
      });
    }
  },

  /**
   * GET /api/payroll/runs/:id/export-timesheets
   */
  async exportRunTimesheets(req, res) {
    const { id } = req.params;
    try {
      const result = await payrollService.exportRunTimesheets(id);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error(`[payrollController.exportRunTimesheets Error] ID ${id}:`, error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to export timesheets for accounting'
      });
    }
  },

  /**
   * POST /api/payroll/runs/:id/import-slips
   */
  async importPaySlipsForRun(req, res) {
    const { id } = req.params;
    try {
      const actor = { ...(req.user || {}), ip: req.ip };
      const result = await payrollService.importPaySlipsForRun(id, req.body, actor);
      return res.status(201).json({
        success: true,
        message: `Đã nhập thành công ${result.imported_count} phiếu lương từ bảng lương Kế toán.`,
        data: result
      });
    } catch (error) {
      console.error(`[payrollController.importPaySlipsForRun Error] ID ${id}:`, error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to import payroll slips from accounting'
      });
    }
  },

  /**
   * GET /api/payroll/runs/:id/bank-disbursement
   */
  async getRunBankDisbursement(req, res) {
    const { id } = req.params;
    try {
      const result = await payrollService.getRunBankDisbursement(id);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error(`[payrollController.getRunBankDisbursement Error] ID ${id}:`, error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to build bank disbursement list'
      });
    }
  },

  /**
   * POST /api/payroll/payslips/:id/report-issue
   */
  async reportPaySlipDiscrepancy(req, res) {
    const { id } = req.params;
    const { message } = req.body;
    try {
      const actor = { ...(req.user || {}), ip: req.ip };
      const result = await payrollService.reportPaySlipDiscrepancy(id, message, actor);
      return res.status(201).json({
        success: true,
        message: 'Đã gửi yêu cầu đối soát phiếu lương đến Phòng Tổ chức Cán bộ & Tài chính Kế toán.',
        data: result
      });
    } catch (error) {
      console.error(`[payrollController.reportPaySlipDiscrepancy Error] ID ${id}:`, error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to submit payslip discrepancy report'
      });
    }
  },

  /**
   * POST /api/payroll/payslips
   */
  async createPaySlip(req, res) {
    const { run_id, staff_id } = req.body;

    if (!run_id || !staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: run_id and staff_id are mandatory.'
      });
    }

    try {
      const data = await payrollService.createPaySlip(req.body);

      return res.status(201).json({
        success: true,
        message: 'Pay slip created successfully',
        data
      });
    } catch (error) {
      console.error('[payrollController.createPaySlip Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create pay slip',
        error: error.message
      });
    }
  },

  /**
   * POST /api/payroll/elections
   */
  async addPaymentElection(req, res) {
    const {
      staff_id,
      bank_name,
      account_number,
      routing_number,
      is_primary = true
    } = req.body;

    if (!staff_id || !bank_name || !account_number || !routing_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staff_id, bank_name, account_number, and routing_number are mandatory.'
      });
    }

    try {
      const data = await payrollService.addPaymentElection({
        staff_id,
        bank_name,
        account_number,
        routing_number,
        is_primary
      });

      return res.status(201).json({
        success: true,
        message: 'Payment election added successfully',
        data
      });
    } catch (error) {
      console.error('[payrollController.addPaymentElection Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add payment election',
        error: error.message
      });
    }
  },

  /**
   * GET /api/payroll/elections/:staff_id
   */
  async getPaymentElectionsByStaffId(req, res) {
    const { staff_id } = req.params;

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'staff_id parameter is required.'
      });
    }

    // Ownership check: regular staff can only inspect their own payment elections
    if (
      req.user &&
      !hasAnyRole(req.user, ROLE_GROUPS.PAYROLL_OPERATORS) &&
      req.user.employee_code !== staff_id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối: Bạn chỉ có thể xem tài khoản nhận lương của chính mình.'
      });
    }

    try {
      const rows = await payrollService.getPaymentElectionsByStaffId(staff_id);
      return res.status(200).json({
        success: true,
        staff_id,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error(`[payrollController.getPaymentElectionsByStaffId Error] staff_id ${staff_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment elections for staff member',
        error: error.message
      });
    }
  },

  /**
   * GET /api/payroll/rates
   */
  async getAllPayRates(req, res) {
    try {
      const rows = await payrollService.getAllPayRates();
      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error('[payrollController.getAllPayRates Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve all pay rates',
        error: error.message
      });
    }
  },

  /**
   * PUT /api/payroll/rates/:staff_id
   */
  async updatePayRate(req, res) {
    const { staff_id } = req.params;
    const { base_hourly_rate, tax_tier } = req.body;

    if (!staff_id || base_hourly_rate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'staff_id and base_hourly_rate are required fields.'
      });
    }

    try {
      const updated = await payrollService.updatePayRate(staff_id, { base_hourly_rate, tax_tier });
      return res.status(200).json({
        success: true,
        message: `Pay rate for ${staff_id} updated successfully.`,
        data: updated
      });
    } catch (error) {
      console.error('[payrollController.updatePayRate Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update pay rate',
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/payroll/runs/:id/status
   */
  async updatePayrollRunStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: 'id and status are required fields.'
      });
    }

    try {
      const actor = { ...(req.user || {}), ip: req.ip };
      const updated = await payrollService.updatePayrollRunStatus(id, status, actor);
      return res.status(200).json({
        success: true,
        message: `Payroll run status updated to ${status} successfully.`,
        data: updated
      });
    } catch (error) {
      console.error('[payrollController.updatePayrollRunStatus Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update payroll run status'
      });
    }
  },

  /**
   * POST /api/payroll/runs/generate
   */
  async generatePayrollRun(req, res) {
    const { start_date, end_date } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'start_date and end_date are required fields.'
      });
    }

    try {
      const run = await payrollService.generatePayrollRunForPeriod(start_date, end_date);
      return res.status(201).json({
        success: true,
        message: 'Payroll run and pay slips generated successfully.',
        data: run
      });
    } catch (error) {
      console.error('[payrollController.generatePayrollRun Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate payroll run',
        error: error.message
      });
    }
  }
};

export default payrollController;
