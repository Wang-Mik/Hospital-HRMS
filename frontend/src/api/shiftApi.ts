import axiosClient from './axiosClient';

export type OnCallTier = 'LEADERSHIP' | 'CLINICAL' | 'PARACLINICAL' | 'LOGISTICS';
export type TeamCode = 'TEAM_A' | 'TEAM_B' | 'TEAM_C' | 'TEAM_D' | 'GENERAL';

export interface BatchSchedulePayload {
  staff_id: string;
  department_code?: string;
  department_id?: number | string;
  work_type?: 'OFFICE' | 'CA1' | 'CA2' | 'CA3' | 'LEADERSHIP' | 'OVERTIME' | 'CUSTOM';
  custom_start_time?: string;
  custom_end_time?: string;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  shift_type?: string;
  on_call_tier?: OnCallTier;
  team_code?: TeamCode;
  requires_handover?: boolean;
}

export interface FillGapCandidate {
  id: number;
  employee_code: string;
  staff_name: string;
  first_name: string;
  last_name: string;
  role: string;
  specialty?: string;
  phone?: string;
  department_code?: string;
  department_name?: string;
  license_number?: string;
  license_expiration?: string;
  license_status?: string;
  is_scheduled_on_call: boolean;
  has_overlapping_shift: boolean;
  is_on_leave: boolean;
  has_valid_license: boolean;
  rest_hours_before: string;
  has_sufficient_rest: boolean;
  monthly_duty_hours: number;
  monthly_shift_count: number;
  eligibility_status: 'ELIGIBLE' | 'INELIGIBLE';
  suitability_tier: 'ON_CALL_PRIMARY' | 'BACKUP_AVAILABLE' | 'REST_WARNING';
  rejection_reasons: string[];
  score: number;
}

export interface FillGapResponse {
  department_code?: string;
  target_date: string;
  target_start: string;
  target_end: string;
  shift_type: string;
  total_candidates: number;
  eligible_candidates_count: number;
  candidates: FillGapCandidate[];
}

export interface SurgeDispatchPayload {
  staff_id: string;
  substitute_staff_id?: string;
  department_code?: string;
  department_id?: number | string;
  shift_date?: string;
  start_time?: string;
  end_time?: string;
  shift_type?: string;
  reason?: string;
  on_call_tier?: OnCallTier;
}

export interface ShiftOverrunPayload {
  overrun_minutes: number;
  reason?: string;
}

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
    allow_insufficient_rest?: boolean;
    allow_unverified_license?: boolean;
  }) => {
    const res = await axiosClient.post('/shifts', data);
    return res.data?.data;
  },

  createBatch: async (data: BatchSchedulePayload) => {
    const res = await axiosClient.post('/shifts/batch', data);
    return res.data;
  },

  autoRotate: async (data: {
    department_code?: string;
    department_id?: number | string;
    start_date: string;
    end_date: string;
    teams?: Record<string, string[]>;
    staff_ids?: string[];
    rotation_model?: '3CA_4KIP' | '2CA_3KIP';
    preview_only?: boolean;
  }) => {
    const res = await axiosClient.post('/shifts/auto-rotate', data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await axiosClient.delete(`/shifts/${id}`);
    return res.data;
  },

  // Emergency Surge & Fill-Gap Methods
  getFillGapCandidates: async (params?: {
    department_code?: string;
    department_id?: number | string;
    shift_date?: string;
    shift_type?: string;
    required_role?: string;
  }): Promise<FillGapResponse> => {
    const res = await axiosClient.get('/shifts/fill-gap/candidates', { params });
    return res.data?.data;
  },

  dispatchSurgeCover: async (payload: SurgeDispatchPayload) => {
    const res = await axiosClient.post('/shifts/fill-gap/dispatch', payload);
    return res.data;
  },

  recordShiftOverrun: async (shiftId: string, payload: ShiftOverrunPayload) => {
    const res = await axiosClient.post(`/shifts/${shiftId}/overrun`, payload);
    return res.data;
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
