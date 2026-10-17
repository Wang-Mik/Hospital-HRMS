import axiosClient from './axiosClient';

export type OnCallTier = 'LEADERSHIP' | 'CLINICAL' | 'PARACLINICAL' | 'LOGISTICS';
export type TeamCode = 'TEAM_A' | 'TEAM_B' | 'TEAM_C' | 'TEAM_D' | 'GENERAL';

export interface ShiftFilters {
  staff_id?: string;
  department_code?: string;
  department_id?: number | string;
  status?: string;
  shift_type?: string;
  on_call_tier?: OnCallTier;
  team_code?: TeamCode;
  date?: string;
}

export const shiftApi = {
  getAll: async (filters?: ShiftFilters) => {
    const res = await axiosClient.get('/shifts', { params: filters });
    return res.data?.data || [];
  },

  getById: async (id: string) => {
    const res = await axiosClient.get(`/shifts/${id}`);
    return res.data?.data;
  },

  create: async (data: {
    staff_id: string;
    department_code?: string;
    department_id?: number | string;
    start_time: string;
    end_time: string;
    shift_type?: string;
    on_call_tier?: OnCallTier;
    team_code?: TeamCode;
    is_24h_on_call?: boolean;
    requires_handover?: boolean;
  }) => {
    const res = await axiosClient.post('/shifts', data);
    return res.data?.data;
  },

  // Attendance
  getAttendance: async (filters?: { staff_id?: string; shift_id?: string; status?: string }) => {
    const res = await axiosClient.get('/attendance', { params: filters });
    return res.data?.data || [];
  },

  clockIn: async (payload: {
    staff_id: string;
    shift_id?: string;
    clock_in_method?: string;
  }) => {
    const res = await axiosClient.post('/attendance/clock-in', payload);
    return res.data?.data;
  },

  clockOut: async (
    id: string,
    payload: {
      clock_out_time?: string;
      handover_notes?: string;
    }
  ) => {
    const res = await axiosClient.post(`/attendance/${id}/clock-out`, payload);
    return res.data?.data;
  }
};

export default shiftApi;
