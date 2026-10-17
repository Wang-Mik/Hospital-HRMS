import { create } from 'zustand';

export interface AuthUser {
  employee_code: string;
  role: string;
  role_code?: string;
  role_name?: string;
  permissions?: string[];
  name: string;
  full_name?: string;
  department?: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setCredentials: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  setCredentials: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  }
}));

export default useAuthStore;
