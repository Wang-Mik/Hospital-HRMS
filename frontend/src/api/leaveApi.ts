import axiosClient from './axiosClient';

export const leaveApi = {
  getBalances: async (staffId: string, year: number = 2026) => {
    const res = await axiosClient.get(`/leave/balances/${staffId}/${year}`);
    return res.data?.data || [];
  },

  getRequests: async (staffId: string) => {
    const res = await axiosClient.get(`/leave/${staffId}`);
    return res.data?.data || [];
  },

  getAllRequests: async (filters?: { status?: string; leave_type?: string }) => {
    const res = await axiosClient.get('/leave', { params: filters });
    return res.data?.data || [];
  },

  submitRequest: async (data: {
    staff_id: string;
    start_date: string;
    end_date: string;
    leave_type: string;
    day_part?: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF';
    days_requested?: number;
    reason?: string;
  }) => {
    const res = await axiosClient.post('/leave', data);
    return res.data?.data;
  },

  setBalance: async (data: {
    staff_id: string;
    accrual_year: number;
    leave_type: string;
    total_days: number;
    used_days?: number;
  }) => {
    const res = await axiosClient.post('/leave-balances', data);
    return res.data?.data;
  }
};

export default leaveApi;
