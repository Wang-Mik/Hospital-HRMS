import axiosClient from './axiosClient';

export interface AdminOverviewKPIs {
  total_employees: number;
  total_departments: number;
  pending_leaves: number;
  expiring_licenses_30d: number;
  expired_licenses: number;
  total_disbursed_vnd: number;
  upcoming_shifts: number;
  locked_accounts: number;
  active_accounts: number;
}

export interface AdminOverviewData {
  kpis: AdminOverviewKPIs;
  recent_leaves: any[];
}

export interface RolePermission {
  code: string;
  module: string;
  description: string;
}

export interface SystemRole {
  id: number;
  role_code: string;
  name: string;
  description: string;
  permissions: RolePermission[];
}

export interface AdminAccount {
  account_id: string;
  employee_id: number;
  username: string;
  role_code: string;
  role_name?: string;
  role_description?: string;
  role?: string;
  is_locked: number | boolean;
  last_login?: string;
  account_created_at?: string;
  employee_code: string;
  staff_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  specialty?: string;
  employee_status: string;
  department_code: string;
  department_name?: string;
  avatar_url?: string;
}

export interface AdminPayRate {
  employee_id: number;
  employee_code: string;
  staff_name: string;
  department_code: string;
  department_name?: string;
  role: string;
  specialty?: string;
  base_hourly_rate: number | string;
  tax_tier: string;
  rate_updated_at?: string;
}

export const adminApi = {
  getOverview: async (): Promise<AdminOverviewData> => {
    const res = await axiosClient.get('/admin/overview');
    return res.data?.data;
  },

  getAllAccounts: async (): Promise<AdminAccount[]> => {
    const res = await axiosClient.get('/admin/accounts');
    return res.data?.data || [];
  },

  getAllRoles: async (): Promise<SystemRole[]> => {
    const res = await axiosClient.get('/admin/roles');
    return res.data?.data || [];
  },

  updateAccountRole: async (id: string | number, role_code: string): Promise<any> => {
    const res = await axiosClient.patch(`/admin/accounts/${id}/role`, { role_code });
    return res.data;
  },

  toggleAccountLock: async (id: string | number, is_locked: boolean): Promise<any> => {
    const res = await axiosClient.patch(`/admin/accounts/${id}/lock`, { is_locked });
    return res.data;
  },

  resetPassword: async (id: string | number, new_password: string): Promise<any> => {
    const res = await axiosClient.post(`/admin/accounts/${id}/reset-password`, { new_password });
    return res.data;
  },

  broadcastNotification: async (payload: {
    title: string;
    message: string;
    type?: 'ALERT' | 'ANNOUNCEMENT' | 'TASK';
    department_code?: string;
    target_staff_id?: string;
  }): Promise<any> => {
    const res = await axiosClient.post('/admin/broadcast', payload);
    return res.data;
  },

  onboardStaff: async (payload: any): Promise<any> => {
    const res = await axiosClient.post('/admin/onboard', payload);
    return res.data;
  },

  adminUpdateEmployee: async (id: string | number, payload: any): Promise<any> => {
    const res = await axiosClient.patch(`/employees/${id}/admin-update`, payload);
    return res.data?.data;
  },

  updateLicenseStatus: async (id: number | string, status: 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'REVOKED'): Promise<any> => {
    const res = await axiosClient.patch(`/employees/licenses/${id}/status`, { status });
    return res.data?.data;
  },

  getAllPayRates: async (): Promise<AdminPayRate[]> => {
    const res = await axiosClient.get('/payroll/rates');
    return res.data?.data || [];
  },

  updatePayRate: async (staffId: string, payload: { base_hourly_rate: number; tax_tier?: string }): Promise<any> => {
    const res = await axiosClient.put(`/payroll/rates/${staffId}`, payload);
    return res.data?.data;
  },

  updatePayrollRunStatus: async (id: string, status: string): Promise<any> => {
    const res = await axiosClient.patch(`/payroll/runs/${id}/status`, { status });
    return res.data?.data;
  },

  generatePayrollRun: async (start_date: string, end_date: string): Promise<any> => {
    const res = await axiosClient.post('/payroll/runs/generate', { start_date, end_date });
    return res.data?.data;
  },

  updateLeaveRequestStatus: async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<any> => {
    const res = await axiosClient.patch(`/leave/requests/${id}/status`, { status });
    return res.data?.data;
  }
};

export default adminApi;
