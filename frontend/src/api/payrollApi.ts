import axiosClient from './axiosClient';

export const payrollApi = {
  getRuns: async () => {
    const res = await axiosClient.get('/payroll/runs');
    return res.data?.data || [];
  },

  getRunById: async (id: string) => {
    const res = await axiosClient.get(`/payroll/runs/${id}`);
    return res.data?.data;
  },

  createRun: async (data: { start_date: string; end_date: string }) => {
    const res = await axiosClient.post('/payroll/runs', data);
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
