import axiosClient from './axiosClient';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    token?: string; // Concealed in HttpOnly Cookie in browser
    account?: {
      id: string;
      employee_id: number;
      username: string;
      role: string;
      role_code?: string;
      role_name?: string;
      permissions?: string[];
      is_locked: boolean;
      last_login?: string;
    };
    employee: {
      id: number;
      employee_code: string;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
      role_code?: string;
      role_name?: string;
      department_code?: string;
    };
    permissions?: string[];
  };
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await axiosClient.post('/auth/login', payload);
    return res.data;
  },

  logout: async (): Promise<{ success: boolean; message: string }> => {
    const res = await axiosClient.post('/auth/logout');
    return res.data;
  },

  getMe: async (): Promise<{ success: boolean; data: { user: any } }> => {
    const res = await axiosClient.get('/auth/me');
    return res.data;
  },

  register: async (payload: { employee_id: number; username: string; password: string }) => {
    const res = await axiosClient.post('/auth/register', payload);
    return res.data;
  }
};

export default authApi;
