import axiosClient from './axiosClient';

export type IncidentCauseType = 'NONE' | 'INDIVIDUAL_ERROR' | 'SYSTEM_PROCESS' | 'FACILITY_EQUIPMENT' | 'NEAR_MISS_PREVENTED';

export interface MonthlyKpiRecord {
  id: string;
  staff_id: string;
  staff_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  role_group?: string;
  specialty?: string;
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
  
  // 6 nhóm tiêu chí chuẩn KPI.md
  score_discipline: number;          // Nhóm 1: Chấp hành kỷ luật lao động
  score_task_completion: number;     // Nhóm 2: Hoàn thành nhiệm vụ
  score_work_quality: number;        // Nhóm 3: Chất lượng công việc & Chuyên môn
  score_communication: number;       // Nhóm 4: Giao tiếp và ứng xử
  score_competence: number;          // Nhóm 5: Năng lực và trách nhiệm
  score_innovation: number;          // Nhóm 6: Đóng góp và cải tiến

  // Tương thích ngược
  clinical_performance_score: number;
  patient_satisfaction_score: number;
  disciplinary_penalty_points: number;

  // Quản lý sự cố y khoa & sai sót chuyên môn (Mục V KPI.md)
  incident_cause: IncidentCauseType;
  incident_penalty_points: number;
  incident_notes?: string;

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
  role?: string;
  actual_shifts?: number;
  actual_hours?: number;
  on_time_attendance_rate?: number;
  handover_compliance_rate?: number;

  // 6 nhóm tiêu chí
  score_discipline?: number;
  score_task_completion?: number;
  score_work_quality?: number;
  score_communication?: number;
  score_competence?: number;
  score_innovation?: number;

  // Legacy fallback
  clinical_performance_score?: number;
  patient_satisfaction_score?: number;
  disciplinary_penalty_points?: number;

  // Sự cố y khoa
  incident_cause?: IncidentCauseType;
  incident_penalty_points?: number;
  incident_notes?: string;

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
