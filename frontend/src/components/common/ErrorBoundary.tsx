import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { translations } from '../../i18n/translations';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Safe bilingual translation lookup without React hooks
      const lang = (localStorage.getItem('hrm_language') === 'en' ? 'en' : 'vi') as 'vi' | 'en';
      const dict = (translations[lang] || translations.vi) as Record<string, string>;
      const t = (key: string, fallback: string) => dict[key] || fallback;

      const title = t('error.title', 'Đã Xảy Ra Sự Cố Hiển Thị');
      const subtitle = t('error.subtitle', 'Hệ thống phát hiện lỗi giao diện hoặc phiên làm việc không tương thích');
      const reloadBtn = t('error.reload_btn', 'Tải Lại Trang');
      const resetBtn = t('error.reset_session_btn', 'Xóa Bộ Nhớ Đệm Và Đăng Nhập Lại');

      return (
        <div
          className="min-vh-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: 'var(--wd-canvas, #f8fafc)' }}
        >
          <div
            className="card shadow-sm border-0 w-100 p-4 p-md-5 text-center"
            style={{ maxWidth: '580px', borderRadius: '16px', backgroundColor: '#ffffff' }}
          >
            <div
              className="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h1 className="h4 fw-bold text-dark mb-2" style={{ letterSpacing: '-0.02em' }}>
              {title}
            </h1>
            <p className="text-secondary small mb-4" style={{ lineHeight: 1.6 }}>
              {subtitle}
            </p>

            {this.state.error && (
              <div
                className="text-start bg-light rounded-3 p-3 mb-4 border font-monospace"
                style={{ fontSize: '12px', color: '#b91c1c', maxHeight: '120px', overflowY: 'auto' }}
              >
                <strong>Error:</strong> {this.state.error.toString()}
              </div>
            )}

            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-outline-secondary d-inline-flex align-items-center justify-content-center gap-2 fw-semibold px-4 py-2"
                style={{ borderRadius: '8px' }}
              >
                <RefreshCw size={16} />
                <span>{reloadBtn}</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetSession}
                className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2 fw-semibold px-4 py-2"
                style={{ borderRadius: '8px' }}
              >
                <LogOut size={16} />
                <span>{resetBtn}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
