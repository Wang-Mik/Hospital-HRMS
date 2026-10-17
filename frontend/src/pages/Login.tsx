import React, { useState } from 'react';
import { Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { Activity, Globe } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const token = useAuthStore((state) => state.token);
  const { t, lang, setLanguage } = useTranslation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

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
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'var(--wd-canvas)' }}
    >
      <div
        className="w-100 bg-white border rounded-3 position-relative overflow-hidden"
        style={{
          maxWidth: '440px',
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

          {/* Quick Login Accounts */}
          <div className="mt-4 pt-3 border-top text-center" style={{ borderColor: 'var(--wd-border-light)' }}>
            <span className="text-muted d-block mb-2 fw-semibold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              {t('auth.quick_login', 'Đăng Nhập Nhanh Trải Nghiệm Vai Trò')}
            </span>
            <div className="d-flex flex-wrap justify-content-center gap-1.5">
              <button
                type="button"
                className="wd-pill-btn font-mono text-danger fw-semibold"
                style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#fef2f2', borderColor: '#fca5a5' }}
                aria-label={`${t('auth.quick_login', 'Đăng Nhập Nhanh')}: ${t('auth.role_director', 'Ban Giám Đốc')}`}
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin123');
                  handleLogin('admin', 'admin123');
                }}
              >
                {t('auth.role_director', 'Ban Giám Đốc')}
              </button>
              <button
                type="button"
                className="wd-pill-btn font-mono text-primary fw-semibold"
                style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#eff6ff', borderColor: '#93c5fd' }}
                aria-label={`${t('auth.quick_login', 'Đăng Nhập Nhanh')}: ${t('auth.role_hr', 'Trưởng Phòng Nhân Sự')}`}
                onClick={() => {
                  setUsername('hr.k');
                  setPassword('password123');
                  handleLogin('hr.k', 'password123');
                }}
              >
                {t('auth.role_hr', 'Trưởng Phòng Nhân Sự')}
              </button>
              <button
                type="button"
                className="wd-pill-btn font-mono"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                aria-label={`${t('auth.quick_login', 'Đăng Nhập Nhanh')}: ${t('auth.role_head', 'Trưởng Khoa Lâm Sàng')}`}
                onClick={() => {
                  setUsername('dr.b');
                  setPassword('password123');
                  handleLogin('dr.b', 'password123');
                }}
              >
                {t('auth.role_head', 'Trưởng Khoa Lâm Sàng')}
              </button>
              <button
                type="button"
                className="wd-pill-btn font-mono"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                aria-label={`${t('auth.quick_login', 'Đăng Nhập Nhanh')}: ${t('auth.role_doctor', 'Bác Sĩ Điều Trị')}`}
                onClick={() => {
                  setUsername('dr.c');
                  setPassword('password123');
                  handleLogin('dr.c', 'password123');
                }}
              >
                {t('auth.role_doctor', 'Bác Sĩ Điều Trị')}
              </button>
              <button
                type="button"
                className="wd-pill-btn font-mono"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                aria-label={`${t('auth.quick_login', 'Đăng Nhập Nhanh')}: ${t('auth.role_nurse', 'Điều Dưỡng Viên')}`}
                onClick={() => {
                  setUsername('rn.f');
                  setPassword('password123');
                  handleLogin('rn.f', 'password123');
                }}
              >
                {t('auth.role_nurse', 'Điều Dưỡng Viên')}
              </button>
              <button
                type="button"
                className="wd-pill-btn font-mono"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                aria-label={`${t('auth.quick_login', 'Đăng Nhập Nhanh')}: ${t('auth.role_pharmacist', 'Dược Sĩ')}`}
                onClick={() => {
                  setUsername('phar.i');
                  setPassword('password123');
                  handleLogin('phar.i', 'password123');
                }}
              >
                {t('auth.role_pharmacist', 'Dược Sĩ')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Bilingual Switcher */}
      <footer className="d-flex flex-column align-items-center gap-2 mt-3 text-center" aria-label="Hospital Login Footer">
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
            aria-label={t('common.vietnamese', 'Tiếng Việt')}
            aria-pressed={lang === 'vi'}
          >
            {t('common.vietnamese', 'Tiếng Việt')}
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
            aria-label={t('common.english', 'English')}
            aria-pressed={lang === 'en'}
          >
            English
          </button>
        </div>

        <div className="text-muted" style={{ fontSize: '11px' }}>
          {t('common.copyright', 'Bản quyền thuộc Hệ Thống Bệnh Viện Đa Khoa')} &bull; {t('auth.security_notice', 'Bảo mật theo tiêu chuẩn y tế')}
        </div>
      </footer>
    </div>
  );
};

export default Login;

