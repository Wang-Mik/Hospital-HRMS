import axiosClient from './axiosClient';

export interface TaskFilters {
  assigned_to?: string;
  assigned_by?: string;
  shift_id?: string;
  status?: string;
}

export const taskApi = {
  getAll: async (filters?: TaskFilters) => {
    const res = await axiosClient.get('/tasks', { params: filters });
    return res.data?.data || [];
  },

  getById: async (id: string) => {
    const res = await axiosClient.get(`/tasks/${id}`);
    return res.data?.data;
  },

  create: async (data: {
    title: string;
    description?: string;
    assigned_to: string;
    assigned_by?: string;
    shift_id?: string;
    status?: string;
    due_date?: string;
  }) => {
    const res = await axiosClient.post('/tasks', data);
    return res.data?.data;
  },

  updateStatus: async (id: string, status: string) => {
    const res = await axiosClient.patch(`/tasks/${id}`, { status });
    return res.data?.data;
  },

  delete: async (id: string) => {
    const res = await axiosClient.delete(`/tasks/${id}`);
    return res.data;
  }
};

export default taskApi;
