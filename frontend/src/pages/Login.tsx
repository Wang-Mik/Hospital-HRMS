import React, { useState } from 'react';
import { Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Activity, Globe } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

interface QuickAccount {
  key: string;
  roleKey: string;
  username: string;
  password: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
}

const QUICK_ACCOUNTS: QuickAccount[] = [
  {
    key: 'admin',
    roleKey: 'auth.role_director',
    username: 'admin',
    password: 'admin123',
    badgeBg: '#fef2f2',
    badgeColor: '#b91c1c',
    badgeBorder: '#fca5a5'
  },
  {
    key: 'hr.k',
    roleKey: 'auth.role_hr',
    username: 'hr.k',
    password: 'password123',
    badgeBg: '#eff6ff',
    badgeColor: '#1d4ed8',
    badgeBorder: '#93c5fd'
  },
  {
    key: 'dr.b',
    roleKey: 'auth.role_head',
    username: 'dr.b',
    password: 'password123',
    badgeBg: '#f0fdf4',
    badgeColor: '#15803d',
    badgeBorder: '#86efac'
  },
  {
    key: 'dr.c',
    roleKey: 'auth.role_doctor',
    username: 'dr.c',
    password: 'password123',
    badgeBg: '#f0f9ff',
    badgeColor: '#0369a1',
    badgeBorder: '#7dd3fc'
  },
  {
    key: 'rn.f',
    roleKey: 'auth.role_nurse',
    username: 'rn.f',
    password: 'password123',
    badgeBg: '#faf5ff',
    badgeColor: '#6d28d9',
    badgeBorder: '#c4b5fd'
  },
  {
    key: 'tech.h',
    roleKey: 'auth.role_technician',
    username: 'tech.h',
    password: 'password123',
    badgeBg: '#fffbeb',
    badgeColor: '#b45309',
    badgeBorder: '#fde68a'
  },
  {
    key: 'phar.i',
    roleKey: 'auth.role_pharmacist',
    username: 'phar.i',
    password: 'password123',
    badgeBg: '#f0fdfa',
    badgeColor: '#0f766e',
    badgeBorder: '#99f6e4'
  }
];

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { t, lang, setLanguage } = useTranslation();

  const getRoleLabel = (roleKey: string) => {
    switch (roleKey) {
      case 'auth.role_director':
        return t('auth.role_director', 'Ban Giám Đốc');
      case 'auth.role_hr':
        return t('auth.role_hr', 'Trưởng Phòng Nhân Sự');
      case 'auth.role_head':
        return t('auth.role_head', 'Trưởng Khoa Lâm Sàng');
      case 'auth.role_doctor':
        return t('auth.role_doctor', 'Bác Sĩ Điều Trị');
      case 'auth.role_nurse':
        return t('auth.role_nurse', 'Điều Dưỡng Viên');
      case 'auth.role_technician':
        return t('auth.role_technician', 'Kỹ Thuật Viên');
      case 'auth.role_pharmacist':
        return t('auth.role_pharmacist', 'Dược Sĩ');
      default:
        return '';
    }
  };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  const handleSelectQuickAccount = (acc: QuickAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setSelectedAccount(acc.username);
    setErrorMessage(null);
  };

  React.useEffect(() => {
    if (token && user) {
      navigate('/', { replace: true });
    }
  }, [token, user, navigate]);

  const handleResetSession = () => {
    logout();
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  const handleLogin = async (u = username, p = password) => {
    if (!u.trim() || !p.trim()) {
      setErrorMessage(t('auth.invalid_credentials', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axiosClient.post('/auth/login', { username: u, password: p });
      const { token: authToken, employee } = response.data?.data || {};

      if (authToken && employee) {
        setCredentials(authToken, {
          employee_code: employee.employee_code,
          role: employee.role,
          name: `${employee.last_name} ${employee.first_name}`.trim()
        });
        navigate('/');
      } else {
        setErrorMessage(t('common.error', 'Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.'));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || t('auth.invalid_credentials', 'Xác thực thất bại. Vui lòng kiểm tra lại thông tin.');
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <main
      id="main-content"
      role="main"
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'var(--wd-canvas)' }}
    >
      <div
        className="w-100 bg-white border rounded-3 position-relative overflow-hidden"
        style={{
          maxWidth: '460px',
          borderColor: 'var(--wd-border)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Top Gradient Accent Line */}
        <div
          style={{
            height: '3px',
            background: 'linear-gradient(90deg, #f97316 0%, #f59e0b 25%, #0284c7 100%)'
          }}
        />

        <div className="p-4 p-sm-5">
          {/* Hospital Emblem & Header */}
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow-sm"
              style={{
                width: '52px',
                height: '52px',
                backgroundColor: 'var(--wd-blue)',
                color: '#ffffff'
              }}
            >
              <Activity size={26} strokeWidth={2.4} aria-hidden="true" />
            </div>
            <h1 className="fw-bold mb-1" style={{ color: '#111827', letterSpacing: '-0.02em', fontSize: '1.25rem' }}>
              {t('auth.title', 'Cổng Thông Tin Nhân Sự Y Tế')}
            </h1>
            <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>
              {t('auth.subtitle', 'Đăng nhập vào hệ thống quản lý nhân lực và quy trình y khoa')}
            </p>
          </div>

          {errorMessage && (
            <Alert
              variant="danger"
              className="py-2 px-3 small border-0 mb-3 rounded-2 text-center"
              style={{ backgroundColor: 'var(--wd-red-bg)', color: 'var(--wd-red)', fontSize: '0.8rem' }}
            >
              {errorMessage}
            </Alert>
          )}

          <Form onSubmit={onSubmit}>
            <Form.Group className="mb-3" controlId="loginUsername">
              <Form.Label htmlFor="loginUsername" className="wd-label">
                {t('auth.username', 'Tên Đăng Nhập')}
              </Form.Label>
              <Form.Control
                type="text"
                id="loginUsername"
                placeholder={t('auth.username_placeholder', 'Nhập tên đăng nhập hoặc mã cán bộ')}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setSelectedAccount(null);
                }}
                className="wd-input w-100"
                autoFocus
              />
            </Form.Group>

            <Form.Group className="mb-4" controlId="loginPassword">
              <Form.Label htmlFor="loginPassword" className="wd-label">
                {t('auth.password', 'Mật Khẩu')}
              </Form.Label>
              <Form.Control
                type="password"
                id="loginPassword"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedAccount(null);
                }}
                className="wd-input w-100"
              />
            </Form.Group>

            <button
              type="submit"
              disabled={isLoading}
              className="wd-pill-btn-primary w-100 py-2 justify-content-center"
              style={{ fontSize: '13px' }}
              aria-label={t('auth.login_button', 'Đăng Nhập Hệ Thống')}
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" animation="border" role="status" aria-hidden="true" />
                  <span>{t('auth.logging_in', 'Đang xác thực...')}</span>
                </>
              ) : (
                <span>{t('auth.login_button', 'Đăng Nhập Hệ Thống')}</span>
              )}
            </button>
          </Form>

          {/* Quick Login Accounts */}
          <div className="mt-4 pt-3 border-top text-center" style={{ borderColor: 'var(--wd-border-light)' }}>
            <span className="text-muted d-block mb-1.5 fw-semibold text-uppercase" style={{ fontSize: '0.72rem', letterSpacing: '0.05em' }}>
              {t('auth.quick_login', 'Đăng Nhập Nhanh Trải Nghiệm Vai Trò')}
            </span>
            <p className="text-muted mb-2.5" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
              {t('auth.quick_login_hint', 'Nhấn vào vai trò để tự động điền tài khoản mẫu')}
            </p>

            <div className="d-flex flex-wrap justify-content-center gap-2">
              {QUICK_ACCOUNTS.map((acc) => {
                const isSelected = selectedAccount === acc.username;
                return (
                  <button
                    key={acc.key}
                    type="button"
                    onClick={() => handleSelectQuickAccount(acc)}
                    className="btn btn-sm d-inline-flex align-items-center rounded-pill py-1 px-2.5 text-start"
                    style={{
                      fontSize: '11.5px',
                      backgroundColor: isSelected ? acc.badgeBg : '#ffffff',
                      color: acc.badgeColor,
                      borderColor: isSelected ? acc.badgeColor : acc.badgeBorder,
                      borderWidth: isSelected ? '1.5px' : '1px',
                      boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <span className="fw-semibold">{getRoleLabel(acc.roleKey)}</span>
                    <span
                      className="font-monospace text-muted ms-1.5 px-1 py-0.2 rounded"
                      style={{
                        fontSize: '10px',
                        backgroundColor: isSelected ? '#ffffff' : '#f3f4f6',
                        border: '1px solid rgba(0,0,0,0.06)'
                      }}
                    >
                      {acc.username}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedAccount && (
              <div
                className="mt-2.5 py-1.5 px-3 rounded-2 bg-light border d-inline-flex align-items-center gap-1.5"
                style={{ fontSize: '11px', color: 'var(--wd-text-secondary, #4b5563)' }}
              >
                <span className="text-success fw-bold">&bull;</span>
                <span>
                  {t('auth.click_to_login_hint', 'Nhấn nút Đăng Nhập bên trên để vào hệ thống')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enterprise Login Footer with Bilingual Switcher */}
      <footer className="d-flex flex-column align-items-center gap-2 mt-3 text-center" aria-label="Hospital Login Footer">
        <div className="d-flex align-items-center justify-content-center flex-wrap gap-2">
          <div
            className="d-inline-flex align-items-center gap-1.5 p-1 rounded-pill border bg-white shadow-sm"
            style={{ fontSize: '12px' }}
            role="group"
            aria-label={t('common.language', 'Ngôn ngữ')}
          >
            <div className="d-flex align-items-center px-2 text-muted fw-semibold gap-1">
              <Globe size={14} className="text-primary" aria-hidden="true" />
              <span>{t('common.language', 'Ngôn ngữ')}:</span>
            </div>
            <button
              type="button"
              className={`btn btn-sm py-0.5 px-2.5 rounded-pill fw-semibold border-0 ${
                lang === 'vi'
                  ? 'btn-primary text-white shadow-sm'
                  : 'btn-light text-secondary bg-transparent'
              }`}
              style={{ fontSize: '11.5px', transition: 'all 0.15s ease' }}
              onClick={() => setLanguage('vi')}
              aria-pressed={lang === 'vi'}
            >
              Tiếng Việt
            </button>
            <button
              type="button"
              className={`btn btn-sm py-0.5 px-2.5 rounded-pill fw-semibold border-0 ${
                lang === 'en'
                  ? 'btn-primary text-white shadow-sm'
                  : 'btn-light text-secondary bg-transparent'
              }`}
              style={{ fontSize: '11.5px', transition: 'all 0.15s ease' }}
              onClick={() => setLanguage('en')}
              aria-pressed={lang === 'en'}
            >
              English
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetSession}
          className="btn btn-link btn-sm text-muted text-decoration-none p-0 mt-0.5"
          style={{ fontSize: '11px' }}
        >
          {t('auth.reset_cache', 'Xóa phiên cũ & Làm mới')}
        </button>

        <div className="text-muted" style={{ fontSize: '11px' }}>
          {t('common.copyright', 'Bản quyền thuộc Hệ Thống Bệnh Viện Đa Khoa')} &copy; 2026 &bull;{' '}
          {t('common.footer_moh_standard', 'Tuân thủ Quy chế Bệnh viện QĐ 1895/1997/BYT-QĐ')}
        </div>
      </footer>
    </main>
  );
};

export default Login;

