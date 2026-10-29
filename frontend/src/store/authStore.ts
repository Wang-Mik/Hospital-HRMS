import { create } from 'zustand';

export interface AuthUser {
  employee_code: string;
  role: string;
  role_code?: string;
  role_name?: string;
  permissions?: string[];
  name: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  department?: string;
  department_code?: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setCredentials: (userOrToken: AuthUser | string, user?: AuthUser) => void;
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

export const useAuthStore = create<AuthState>((set) => {
  // Security Compliance: Purge legacy plain-text JWT token from localStorage
  try {
    localStorage.removeItem('token');
  } catch {
    // ignore
  }

  const initialUser = getStoredUser();

  return {
    token: initialUser ? 'cookie-managed' : null,
    user: initialUser,
    isAuthenticated: !!initialUser,
    setCredentials: (arg1: AuthUser | string, arg2?: AuthUser) => {
      // Supports both setCredentials(user) and legacy setCredentials(token, user)
      const user: AuthUser = arg2 ? arg2 : (arg1 as AuthUser);
      try {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.removeItem('token'); // Ensure raw JWT is never saved in localStorage
      } catch (e) {
        console.error('Failed to persist auth state to localStorage:', e);
      }
      set({ user, isAuthenticated: true, token: 'cookie-managed' });
    },
    logout: () => {
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.clear();
      } catch {
        // ignore
      }
      set({ token: null, user: null, isAuthenticated: false });
    }
  };
});

export default useAuthStore;

