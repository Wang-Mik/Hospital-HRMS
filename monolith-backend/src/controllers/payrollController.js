import payrollService from '../services/payrollService.js';

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

    try {
      const rows = await payrollService.getPaySlipsByStaffId(staff_id);
      return res.status(200).json({
        success: true,
        staff_id,
        count: rows.length,
        data: rows
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
   * POST /api/payroll/payslips
   */
  async createPaySlip(req, res) {
    const {
      run_id,
      staff_id,
      base_pay = 0.00,
      night_differential = 0.00,
      overtime_pay = 0.00,
      net_pay = 0.00,
      status = 'DRAFT'
    } = req.body;

    if (!run_id || !staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: run_id and staff_id are mandatory.'
      });
    }

    try {
      const data = await payrollService.createPaySlip({
        run_id,
        staff_id,
        base_pay,
        night_differential,
        overtime_pay,
        net_pay,
        status
      });

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
      const updated = await payrollService.updatePayrollRunStatus(id, status);
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
