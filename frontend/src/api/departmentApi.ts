import axiosClient from './axiosClient';

export interface Department {
  id: number;
  department_code: string;
  name: string;
  description?: string;
  location?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export const departmentApi = {
  getAll: async (): Promise<Department[]> => {
    const res = await axiosClient.get('/departments');
    return res.data?.data || [];
  },

  getByCode: async (code: string): Promise<Department> => {
    const res = await axiosClient.get(`/departments/${code}`);
    return res.data?.data;
  },

  create: async (data: Partial<Department>): Promise<Department> => {
    const res = await axiosClient.post('/departments', data);
    return res.data?.data;
  },

  update: async (code: string, data: Partial<Department>): Promise<Department> => {
    const res = await axiosClient.put(`/departments/${code}`, data);
    return res.data?.data;
  }
};

export default departmentApi;
