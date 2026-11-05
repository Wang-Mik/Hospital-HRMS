import axiosClient from './axiosClient';

export type AlertLevel = 'LEVEL_1_SURGE' | 'LEVEL_2_DISASTER' | 'CODE_RED';

export type SurgeResponseStatus = 
  | 'PENDING' 
  | 'ACCEPTED_15M' 
  | 'ACCEPTED_30M' 
  | 'UNREACHABLE' 
  | 'REJECTED' 
  | 'AUTO_EXPIRED';

export type CallOutcome = 
  | 'ACCEPTED_15M' 
  | 'ACCEPTED_30M' 
  | 'UNREACHABLE' 
  | 'REJECTED';

export interface SurgeCandidate {
  rank: number;
  staff_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  job_title: string;
  specialty: string;
  phone_contact: string;
  license_number: string;
  license_status: string;
  seniority_years: number;
  monthly_shifts_count: number;
  eta_minutes: number;
  suitability_score: number;
  tier_label: string;
  score_breakdown: {
    distance_score: number;
    fatigue_balance_score: number;
    seniority_score: number;
  };
}

export interface SurgeCandidateResponse {
  department_code: string;
  evaluation_time: string;
  total_eligible: number;
  candidates: SurgeCandidate[];
  unreachable_candidates?: SurgeCandidate[];
}

export interface CreateSurgeDispatchPayload {
  department_code: string;
  alert_level: AlertLevel;
  reason: string;
  required_count?: number;
  staff_type?: 'DOCTOR' | 'NURSE' | 'ANY';
  selected_candidate_id?: string;
}

export interface SurgeDispatchSession {
  dispatch_id: string;
  department_code: string;
  department_name?: string;
  alert_level: AlertLevel;
  reason: string;
  status: 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  selected_staff_id?: string;
  responder_name?: string;
  responder_role?: string;
  phone_contact?: string;
  suitability_score?: number;
  response_status: SurgeResponseStatus;
  estimated_arrival_minutes?: number;
  candidates_snapshot?: SurgeCandidate[];
  unreachable_log?: any[];
  initiated_by?: string;
  initiator_name?: string;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export interface LogCallPayload {
  call_outcome: CallOutcome;
  coordinator_notes?: string;
}

export interface ResolveSurgeDispatchPayload {
  resolution_notes?: string;
}

export const surgeDispatchApi = {
  /**
   * Scan and rank available on-call clinical candidates in real-time
   */
  getCandidates: async (departmentCode: string, staffType?: string): Promise<SurgeCandidateResponse> => {
    const res = await axiosClient.get(`/surge-dispatches/candidates/${encodeURIComponent(departmentCode)}`, {
      params: staffType ? { staff_type: staffType } : undefined
    });
    return res.data?.data;
  },

  /**
   * Initiate an emergency surge dispatch session
   */
  createDispatch: async (payload: CreateSurgeDispatchPayload): Promise<SurgeDispatchSession> => {
    const res = await axiosClient.post('/surge-dispatches', payload);
    return res.data?.data;
  },

  /**
   * Fetch currently active surge dispatch sessions
   */
  getActiveDispatches: async (departmentCode?: string): Promise<SurgeDispatchSession[]> => {
    const res = await axiosClient.get('/surge-dispatches/active', {
      params: departmentCode ? { department_code: departmentCode } : undefined
    });
    return res.data?.data || [];
  },

  /**
   * Log click-to-call response outcome with auto-fallback promotion if unreachable
   */
  logCallResult: async (dispatchId: string, payload: LogCallPayload): Promise<SurgeDispatchSession> => {
    const res = await axiosClient.post(`/surge-dispatches/${encodeURIComponent(dispatchId)}/log-call`, payload);
    return res.data?.data;
  },

  /**
   * Close and resolve an active emergency surge dispatch session
   */
  resolveDispatch: async (dispatchId: string, payload?: ResolveSurgeDispatchPayload): Promise<SurgeDispatchSession> => {
    const res = await axiosClient.post(`/surge-dispatches/${encodeURIComponent(dispatchId)}/resolve`, payload || {});
    return res.data?.data;
  }
};

export default surgeDispatchApi;
