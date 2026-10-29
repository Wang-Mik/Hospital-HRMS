import React, { useState } from 'react';
import { Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Globe, AlertTriangle } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { t, lang, setLanguage } = useTranslation();

  const isExpired = searchParams.get('expired') === 'true';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (user) {
      const redirectTarget = searchParams.get('redirect')
        ? decodeURIComponent(searchParams.get('redirect')!)
        : '/';
      navigate(redirectTarget, { replace: true });
    }
  }, [user, navigate, searchParams]);

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
      const { employee, permissions, account } = response.data?.data || {};

      if (employee) {
        setCredentials({
          employee_code: employee.employee_code,
          role: employee.role,
          role_code: employee.role_code || account?.role_code || employee.role,
          role_name: employee.role_name || account?.role_name,
          permissions: permissions || account?.permissions || [],
          first_name: employee.first_name,
          last_name: employee.last_name,
          name: `${employee.last_name} ${employee.first_name}`.trim(),
          department_code: employee.department_code,
          email: employee.email
        });

        const redirectTarget = searchParams.get('redirect')
          ? decodeURIComponent(searchParams.get('redirect')!)
          : '/';
        navigate(redirectTarget, { replace: true });
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

          {isExpired && !errorMessage && (
            <Alert
              variant="warning"
              className="py-2 px-3 small border-0 mb-3 rounded-2 d-flex align-items-center justify-content-center gap-2"
              style={{ backgroundColor: '#fff7ed', color: '#c2410c', fontSize: '0.8rem', borderLeft: '3px solid #f97316' }}
            >
              <AlertTriangle size={16} className="flex-shrink-0" />
              <span>{t('auth.session_expired', 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.')}</span>
            </Alert>
          )}

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
                onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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

