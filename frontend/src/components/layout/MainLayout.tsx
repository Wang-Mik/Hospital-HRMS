import React, { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Activity, Globe, ShieldCheck, Phone } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { PageLoadingFallback } from '../common/PageLoadingFallback';
import { useTranslation } from '../../i18n/useTranslation';

export const MainLayout: React.FC = () => {
  const { t, lang, setLanguage } = useTranslation();

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: 'var(--wd-canvas)' }}>
      {/* Skip to Main Content Link for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="visually-hidden-focusable btn btn-primary position-absolute top-0 start-0 z-3 m-2 shadow-sm"
      >
        {t('common.skip_to_content', 'Chuyển đến nội dung chính')}
      </a>

      {/* Top Navigation Bar */}
      <TopNav />

      {/* Navigation Rail */}
      <Sidebar />

      {/* Main Content Area */}
      <main id="main-content" role="main" tabIndex={-1} className="wd-main-canvas flex-grow-1">
        <div className="w-100">
          <div style={{ minHeight: 'calc(100vh - var(--wd-topbar-height) - 48px)' }}>
            <Suspense fallback={<PageLoadingFallback />}>
              <Outlet />
            </Suspense>
          </div>

          {/* Enterprise Healthcare Footer */}
          <footer className="wd-footer" role="contentinfo">
            <div className="wd-footer-card">
              {/* Tier 1: Brand Identity, Quick Clinical/HR Navigation, Support & Language */}
              <div className="row g-4 align-items-start">
                {/* Column 1: Hospital Brand & Tagline */}
                <div className="col-12 col-lg-4">
                  <div className="d-flex align-items-center gap-2.5 mb-2">
                    <div
                      className="wd-logo-emblem flex-shrink-0"
                      style={{ width: '30px', height: '30px' }}
                      aria-hidden="true"
                    >
                      <Activity size={16} strokeWidth={2.4} />
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="wd-footer-emblem">HOSPITAL HRMS</span>
                      <span
                        className="badge rounded-pill fw-semibold"
                        style={{
                          fontSize: '10px',
                          backgroundColor: '#eff6ff',
                          color: '#005cb9',
                          border: '1px solid #bfdbfe',
                          padding: '2px 8px'
                        }}
                      >
                        v2026.2 Enterprise
                      </span>
                    </div>
                  </div>

                  <p className="text-muted mb-0" style={{ fontSize: '12px', lineHeight: 1.55 }}>
                    {t(
                      'common.hospital_tagline',
                      'Hệ Thống Quản Lý Nhân Sự & Quy Trình Khám Chữa Bệnh Chuẩn Y Tế'
                    )}
                  </p>
                </div>

                {/* Column 2: Quick Clinical & HR Navigation Links */}
                <div className="col-12 col-sm-7 col-lg-4">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="wd-footer-section-title">
                        {t('common.footer_clinical_links', 'Nghiệp Vụ Lâm Sàng')}
                      </div>
                      <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
                        <li>
                          <Link to="/" className="wd-footer-link">
                            {t('nav.dashboard', 'Bảng Điều Khiển')}
                          </Link>
                        </li>
                        <li>
                          <Link to="/shifts" className="wd-footer-link">
                            {t('nav.shifts', 'Lịch Trực Bệnh Viện')}
                          </Link>
                        </li>
                        <li>
                          <Link to="/handovers" className="wd-footer-link">
                            {t('nav.handovers', 'Bàn Giao Ca Trực')}
                          </Link>
                        </li>
                        <li>
                          <Link to="/briefings" className="wd-footer-link">
                            {t('nav.briefings', 'Giao Ban Bệnh Viện')}
                          </Link>
                        </li>
                      </ul>
                    </div>

                    <div className="col-6">
                      <div className="wd-footer-section-title">
                        {t('common.footer_hr_links', 'Quản Trị Nhân Sự')}
                      </div>
                      <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
                        <li>
                          <Link to="/employees" className="wd-footer-link">
                            {t('nav.directory', 'Danh Bạ Cán Bộ')}
                          </Link>
                        </li>
                        <li>
                          <Link to="/leave" className="wd-footer-link">
                            {t('nav.timeoff', 'Nghỉ Phép')}
                          </Link>
                        </li>
                        <li>
                          <Link to="/payroll" className="wd-footer-link">
                            {t('nav.payroll', 'Bảng Lương')}
                          </Link>
                        </li>
                        <li>
                          <Link to="/licenses" className="wd-footer-link">
                            {t('common.footer_licenses_link', 'Chứng Chỉ CCHN')}
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Column 3: Internal Support Duty & Language Controls */}
                <div className="col-12 col-sm-5 col-lg-4 d-flex flex-column align-items-lg-end">
                  <div>
                    <div className="wd-footer-section-title">
                      {t('common.footer_support_title', 'Hỗ Trợ Kỹ Thuật & Trực Nội Bộ')}
                    </div>

                    <div className="d-flex flex-column gap-1.5 mb-3">
                      <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '12px' }}>
                        <Phone size={13} className="text-primary flex-shrink-0" aria-hidden="true" />
                        <span>{t('common.footer_it_helpdesk', 'Tổng đài CNTT Y tế: Nội bộ 1080')}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted" style={{ fontSize: '12px' }}>
                        <ShieldCheck size={13} className="text-success flex-shrink-0" aria-hidden="true" />
                        <span>{t('common.footer_duty_hotline', 'Đường dây nóng Trực lãnh đạo: 1900 6886')}</span>
                      </div>
                    </div>

                    {/* Language Switcher & Back to Top */}
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <div
                        className="d-inline-flex align-items-center gap-1 p-1 rounded-pill border bg-light"
                        style={{ fontSize: '12px' }}
                        role="group"
                        aria-label={t('common.language', 'Ngôn ngữ')}
                      >
                        <div className="d-flex align-items-center px-2 text-muted fw-semibold gap-1">
                          <Globe size={13} className="text-primary" aria-hidden="true" />
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

                      <button
                        type="button"
                        onClick={handleScrollToTop}
                        className="wd-pill-btn py-1 px-2.5"
                        style={{ fontSize: '11.5px' }}
                      >
                        &uarr; {t('common.footer_back_to_top', 'Lên đầu trang')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tier 2: Bottom Copyright & Regulatory Compliance Bar */}
              <div className="wd-footer-bottom d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
                <div>
                  {t('common.copyright', 'Bản quyền thuộc Hệ Thống Bệnh Viện Đa Khoa')} &copy; 2026.{' '}
                  {t('common.all_rights_reserved', 'Bảo lưu mọi quyền')}.
                </div>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span>{t('common.footer_moh_standard', 'Tuân thủ Quy chế Bệnh viện QĐ 1895/1997/BYT-QĐ')}</span>
                  <span aria-hidden="true">&bull;</span>
                  <span>{t('common.footer_security_standard', 'Bảo mật định danh IAM & Phân quyền RBAC')}</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
