import axiosClient from './axiosClient';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    employee: {
      id: number;
      employee_code: string;
      first_name: string;
      last_name: string;
      email: string;
      role: string;
    };
  };
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await axiosClient.post('/auth/login', payload);
    return res.data;
  },

  register: async (payload: { employee_id: number; username: string; password: string }) => {
    const res = await axiosClient.post('/auth/register', payload);
    return res.data;
  }
};

export default authApi;
