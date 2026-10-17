import React from 'react';
import { Outlet } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useTranslation } from '../../i18n/useTranslation';

export const MainLayout: React.FC = () => {
  const { t, lang, setLanguage } = useTranslation();

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--wd-canvas)' }}>
      {/* Top Navigation Bar */}
      <TopNav />

      {/* Navigation Rail */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="wd-main-canvas flex-grow-1">
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <Outlet />

          {/* Hospital Footer with Language Switcher */}
          <footer className="wd-footer d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 py-3 border-top mt-4">
            <div className="d-flex flex-column">
              <div className="wd-footer-emblem" style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.02em', color: 'var(--wd-text-dark)' }}>
                HOSPITAL HRMS
              </div>
              <div className="text-muted small" style={{ fontSize: '11px', marginTop: '2px' }}>
                {t('common.copyright', 'Bản quyền thuộc Hệ Thống Bệnh Viện Đa Khoa')} © 2026. {t('common.all_rights_reserved', 'Bảo lưu mọi quyền')}.
              </div>
              <div className="text-muted" style={{ fontSize: '10.5px', marginTop: '2px' }}>
                {t('common.hospital_tagline', 'Hệ Thống Quản Lý Nhân Sự & Quy Trình Khám Chữa Bệnh Chuẩn Y Tế')} &bull; 2026.2
              </div>
            </div>

            {/* Language Switcher */}
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
                className={`btn btn-sm py-1 px-2.5 rounded-pill fw-semibold border-0 ${
                  lang === 'vi'
                    ? 'btn-primary text-white shadow-sm'
                    : 'btn-light text-secondary bg-transparent'
                }`}
                style={{ fontSize: '12px', transition: 'all 0.15s ease' }}
                onClick={() => setLanguage('vi')}
                aria-label="Chuyển sang Tiếng Việt"
                aria-pressed={lang === 'vi'}
              >
                Tiếng Việt
              </button>
              <button
                type="button"
                className={`btn btn-sm py-1 px-2.5 rounded-pill fw-semibold border-0 ${
                  lang === 'en'
                    ? 'btn-primary text-white shadow-sm'
                    : 'btn-light text-secondary bg-transparent'
                }`}
                style={{ fontSize: '12px', transition: 'all 0.15s ease' }}
                onClick={() => setLanguage('en')}
                aria-label="Switch to English"
                aria-pressed={lang === 'en'}
              >
                English
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
