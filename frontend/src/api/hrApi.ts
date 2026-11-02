import axiosClient from './axiosClient';

export interface EmploymentContract {
  id: string;
  staff_id: string;
  staff_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  department_code?: string;
  department_name?: string;
  contract_number: string;
  contract_type: 'PROBATION' | 'APPRENTICESHIP' | 'DEFINITE_1YR' | 'DEFINITE_3YR' | 'INDEFINITE' | 'SEASONAL';
  start_date: string;
  end_date?: string;
  job_title: string;
  base_salary: number;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  file_url?: string;
  notes?: string;
  days_until_expiry?: number;
  created_at?: string;
}

export interface SocialInsurance {
  id: string;
  staff_id: string;
  staff_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  department_code?: string;
  department_name?: string;
  bhxh_book_number: string;
  bhyt_card_number: string;
  primary_hospital_name: string;
  has_bhxh: boolean;
  has_bhyt: boolean;
  has_bhtn: boolean;
  has_occupational_accident: boolean;
  insurance_salary: number;
  notes?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  created_at?: string;
  updated_at?: string;
}

export interface CommendationDiscipline {
  id: string;
  staff_id: string;
  staff_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  department_code?: string;
  department_name?: string;
  record_type: 'COMMENDATION' | 'DISCIPLINE';
  decision_number: string;
  decision_date: string;
  signatory_authority: string;
  title: string;
  reason: string;
  reward_or_fine_amount: number;
  effective_date: string;
  expiration_date?: string;
  document_url?: string;
  created_at?: string;
}

export const hrApi = {
  // Contracts
  getContracts: async (filters?: {
    expiring_within_days?: number;
    contract_type?: string;
    status?: string;
    search?: string;
  }): Promise<EmploymentContract[]> => {
    const res = await axiosClient.get('/hr/contracts', { params: filters });
    return res.data?.data || [];
  },

  saveContract: async (payload: Partial<EmploymentContract>): Promise<EmploymentContract> => {
    const res = await axiosClient.post('/hr/contracts', payload);
    return res.data?.data;
  },

  // Insurances
  getInsurances: async (filters?: {
    staff_id?: string;
    status?: string;
    search?: string;
  }): Promise<SocialInsurance[]> => {
    const res = await axiosClient.get('/hr/insurances', { params: filters });
    return res.data?.data || [];
  },

  updateInsurance: async (staffId: string, payload: Partial<SocialInsurance>): Promise<SocialInsurance> => {
    const res = await axiosClient.put(`/hr/insurances/${staffId}`, payload);
    return res.data?.data;
  },

  // Commendations & Disciplines
  getCommendationsDisciplines: async (filters?: {
    staff_id?: string;
    record_type?: 'COMMENDATION' | 'DISCIPLINE';
    search?: string;
  }): Promise<CommendationDiscipline[]> => {
    const res = await axiosClient.get('/hr/rewards-disciplines', { params: filters });
    return res.data?.data || [];
  },

  createCommendationDiscipline: async (payload: Partial<CommendationDiscipline>): Promise<CommendationDiscipline> => {
    const res = await axiosClient.post('/hr/rewards-disciplines', payload);
    return res.data?.data;
  },

  // Salary Increment
  updateSalaryIncrement: async (
    staffId: string,
    payload: { last_salary_increment_date?: string; is_salary_increment_hidden?: boolean }
  ) => {
    const res = await axiosClient.patch(`/hr/salary-increment/${staffId}`, payload);
    return res.data?.data;
  }
};

export default hrApi;
