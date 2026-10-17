import axiosClient from './axiosClient';

export interface EmployeeFilters {
  department_code?: string;
  department_id?: number | string;
  role?: string;
  status?: string;
  search?: string;
}

export const employeeApi = {
  getAll: async (filters?: EmployeeFilters) => {
    const res = await axiosClient.get('/employees', { params: filters });
    return res.data?.data || [];
  },

  getById: async (id: number | string) => {
    const res = await axiosClient.get(`/employees/${id}`);
    return res.data?.data;
  },

  create: async (data: any) => {
    const res = await axiosClient.post('/employees', data);
    return res.data?.data;
  },

  getLicenses: async (employeeId: number | string) => {
    const emp = await employeeApi.getById(employeeId);
    return emp?.active_medical_licenses || [];
  },

  getEmergencyContacts: async (staffId: string) => {
    const res = await axiosClient.get(`/employees/${staffId}/emergency-contacts`);
    return res.data?.data || [];
  },

  addEmergencyContact: async (staffId: string, data: { contact_name: string; relationship: string; phone_number: string; priority?: string }) => {
    const res = await axiosClient.post(`/employees/${staffId}/emergency-contacts`, data);
    return res.data?.data;
  },

  deleteEmergencyContact: async (staffId: string, contactId: string | number) => {
    const res = await axiosClient.delete(`/employees/${staffId}/emergency-contacts/${contactId}`);
    return res.data;
  },

  updateProfile: async (staffId: string, data: any) => {
    const res = await axiosClient.patch(`/employees/${staffId}/profile`, data);
    return res.data?.data;
  },

  updateAvatar: async (staffId: string, avatar_url: string) => {
    const res = await axiosClient.post(`/employees/${staffId}/avatar`, { avatar_url });
    return res.data?.data;
  },

  getDocuments: async (staffId: string) => {
    const res = await axiosClient.get(`/employees/${staffId}/documents`);
    return res.data?.data || [];
  },

  getAllLicenses: async (filters?: { status?: string; search?: string }) => {
    const res = await axiosClient.get('/licenses', { params: filters });
    return res.data?.data || [];
  },

  createLicense: async (data: any) => {
    const res = await axiosClient.post('/licenses', data);
    return res.data?.data;
  }
};

export default employeeApi;
