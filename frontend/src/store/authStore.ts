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

const getStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to parse cached user session from localStorage, clearing invalid state:', error);
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch {
      // ignore
    }
    return null;
  }
};

const getStoredToken = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    return token;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  setCredentials: (token, user) => {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to persist auth state to localStorage:', e);
    }
    set({ token, user });
  },
  logout: () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {
      // ignore
    }
    set({ token: null, user: null });
  }
}));

export default useAuthStore;

