import axiosClient from './axiosClient';

export interface ImportPaySlipRow {
  staff_id: string;
  base_pay: number;
  night_differential: number;
  overtime_pay: number;
  on_call_allowance: number;
  surgery_allowance: number;
  kpi_bonus: number;
  social_insurance: number;
  tax_deductions: number;
  other_deductions: number;
  net_pay?: number;
  status?: 'DRAFT' | 'CALCULATED' | 'PAID' | 'CANCELLED';
  notes?: string | null;
}

export const payrollApi = {
  getRuns: async () => {
    const res = await axiosClient.get('/payroll/runs');
    return res.data?.data || [];
  },

  getRunById: async (id: string) => {
    const res = await axiosClient.get(`/payroll/runs/${id}`);
    return res.data?.data;
  },

  getRunSlips: async (id: string) => {
    const res = await axiosClient.get(`/payroll/runs/${id}/slips`);
    return res.data?.data;
  },

  exportTimesheets: async (id: string) => {
    const res = await axiosClient.get(`/payroll/runs/${id}/export-timesheets`);
    return res.data?.data;
  },

  getBankDisbursement: async (id: string) => {
    const res = await axiosClient.get(`/payroll/runs/${id}/bank-disbursement`);
    return res.data?.data;
  },

  reportPaySlipIssue: async (id: string, message: string) => {
    const res = await axiosClient.post(`/payroll/payslips/${id}/report-issue`, { message });
    return res.data?.data;
  },

  importRunSlips: async (
    id: string,
    payload: {
      mode?: 'UPSERT' | 'REPLACE_RUN_SLIPS';
      source_filename?: string | null;
      slips: ImportPaySlipRow[];
    }
  ) => {
    const res = await axiosClient.post(`/payroll/runs/${id}/import-slips`, payload);
    return res.data?.data;
  },

  createRun: async (data: { start_date: string; end_date: string }) => {
    const res = await axiosClient.post('/payroll/runs', data);
    return res.data?.data;
  },

  generateRun: async (data: { start_date: string; end_date: string }) => {
    const res = await axiosClient.post('/payroll/runs/generate', data);
    return res.data?.data;
  },

  updateRunStatus: async (id: string, status: string) => {
    const res = await axiosClient.patch(`/payroll/runs/${id}/status`, { status });
    return res.data?.data;
  },

  getPaySlips: async (staffId: string) => {
    const res = await axiosClient.get(`/payroll/payslips/${staffId}`);
    return res.data?.data || [];
  },

  getRate: async (staffId: string) => {
    const res = await axiosClient.get(`/payroll/rates/${staffId}`);
    return res.data?.data;
  },

  createPaySlip: async (data: { run_id: string; staff_id: string }) => {
    const res = await axiosClient.post('/payroll/payslips', data);
    return res.data?.data;
  },

  getElections: async (staffId: string) => {
    const res = await axiosClient.get(`/payroll/elections/${staffId}`);
    return res.data?.data || [];
  },

  addElection: async (data: {
    staff_id: string;
    bank_name: string;
    account_number: string;
    routing_number: string;
    is_primary?: boolean;
  }) => {
    const res = await axiosClient.post('/payroll/elections', data);
    return res.data?.data;
  }
};

export default payrollApi;
