import axiosClient from './axiosClient';

export interface NotificationItem {
  id: string;
  target_staff_id: string;
  title: string;
  message: string;
  type: 'SHIFT_CHANGE' | 'LEAVE_APPROVAL' | 'TASK' | 'ALERT' | 'ANNOUNCEMENT';
  is_read: boolean | number;
  created_at: string;
  updated_at?: string;
}

export const notificationApi = {
  getByStaffId: async (staffId: string): Promise<NotificationItem[]> => {
    const res = await axiosClient.get(`/notifications/${staffId}`);
    return res.data?.data || [];
  },

  markAsRead: async (id: string): Promise<any> => {
    const res = await axiosClient.patch(`/notifications/${id}/read`);
    return res.data?.data;
  },

  markAllAsRead: async (staffId: string): Promise<any> => {
    const res = await axiosClient.patch(`/notifications/${staffId}/mark-all-read`);
    return res.data?.data;
  },

  getAll: async (filters?: { type?: string; is_read?: boolean; limit?: number }): Promise<NotificationItem[]> => {
    const res = await axiosClient.get('/notifications', { params: filters });
    return res.data?.data || [];
  },

  create: async (data: {
    target_staff_id: string;
    title: string;
    message: string;
    type?: string;
  }): Promise<NotificationItem> => {
    const res = await axiosClient.post('/notifications', data);
    return res.data?.data;
  }
};

export default notificationApi;
