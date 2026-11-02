import axiosClient from './axiosClient';

export interface MonthlyKpiRecord {
  id: string;
  staff_id: string;
  staff_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  department_code?: string;
  department_name?: string;
  kpi_month: string;
  month?: string;
  target_shifts: number;
  actual_shifts: number;
  total_shifts?: number;
  target_hours: number;
  actual_hours: number;
  total_hours?: number;
  on_time_shifts?: number;
  late_shifts?: number;
  on_time_attendance_rate: number;
  handover_completed_count?: number;
  handover_compliance_rate: number;
  clinical_performance_score: number;
  patient_satisfaction_score: number;
  disciplinary_penalty_points: number;
  total_kpi_score: number;
  final_score?: number;
  kpi_grade: string;
  evaluation_notes?: string;
  evaluated_by?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED';
  created_at?: string;
  updated_at?: string;
}

export interface KpiFilters {
  month?: string;
  department_code?: string;
  staff_id?: string;
  status?: string;
}

export interface EvaluateKpiPayload {
  kpi_id?: string;
  staff_id: string;
  kpi_month: string;
  clinical_performance_score?: number;
  patient_satisfaction_score?: number;
  disciplinary_penalty_points?: number;
  evaluation_notes?: string;
}

export const kpiApi = {
  getMonthlyKpis: async (filters?: KpiFilters) => {
    const res = await axiosClient.get('/kpi', { params: filters });
    return res.data?.data || [];
  },

  getMyKpiHistory: async (staffId?: string) => {
    const res = await axiosClient.get('/kpi/my-history', { params: { staff_id: staffId } });
    return res.data?.data || [];
  },

  autoComputeMonthlyKpi: async (month: string, departmentCode?: string) => {
    const res = await axiosClient.post('/kpi/auto-compute', {
      month,
      department_code: departmentCode
    });
    return res.data;
  },

  saveKpiEvaluation: async (payload: EvaluateKpiPayload) => {
    const res = await axiosClient.post('/kpi/evaluate', payload);
    return res.data?.data;
  }
};

export default kpiApi;
