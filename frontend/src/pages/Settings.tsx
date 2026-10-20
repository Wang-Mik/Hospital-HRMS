import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Toast, ToastContainer } from 'react-bootstrap';
import {
  Settings as SettingsIcon,
  Globe,
  Bell,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Save,
  UserCheck
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

interface SystemPreferences {
  tableDensity: 'comfortable' | 'compact';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  defaultPage: '/' | '/shifts' | '/tasks' | '/profile';
  notifications: {
    shiftReminders: boolean;
    pendingHandovers: boolean;
    licenseExpiry: boolean;
    hrUpdates: boolean;
  };
}

const DEFAULT_PREFERENCES: SystemPreferences = {
  tableDensity: 'comfortable',
  dateFormat: 'DD/MM/YYYY',
  defaultPage: '/',
  notifications: {
    shiftReminders: true,
    pendingHandovers: true,
    licenseExpiry: true,
    hrUpdates: true
  }
};

const STORAGE_KEY = 'hrms_user_preferences';

export const Settings: React.FC = () => {
  const { t, lang, setLanguage } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'display' | 'notifications' | 'account'>('display');
  const [prefs, setPrefs] = useState<SystemPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PREFERENCES;
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    document.body.dataset.tableDensity = prefs.tableDensity;
  }, [prefs.tableDensity]);

  const handleSavePreferences = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      setToastMsg(t('settings.toast_saved'));
    } catch {
      // ignore
    }
  };

  const handleResetDefaults = () => {
    setPrefs(DEFAULT_PREFERENCES);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      setToastMsg(t('settings.toast_reset'));
    } catch {
      // ignore
    }
  };

  const toggleNotification = (key: keyof SystemPreferences['notifications']) => {
    setPrefs((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const roleCode = user?.role_code || user?.role || 'DOCTOR';
  const roleLabel = t(`role.${roleCode}`, user?.role_name || roleCode);
  const permissionsList = user?.permissions && user.permissions.length > 0
    ? user.permissions
    : ['CLINICAL_VIEW', 'SHIFT_ROSTER_VIEW', 'HANDOVER_SIGN', 'LEAVE_REQUEST', 'PAYSLIP_VIEW'];

  return (
    <Container fluid className="py-4 px-3 px-md-4">
      {/* Toast Feedback */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1080 }}>
        <Toast
          show={Boolean(toastMsg)}
          onClose={() => setToastMsg(null)}
          delay={3000}
          autohide
          bg="success"
          className="text-white border-0 shadow"
        >
          <Toast.Body className="d-flex align-items-center gap-2 fw-medium">
            <CheckCircle2 size={18} />
            <span>{toastMsg}</span>
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-3"
              style={{
                width: '38px',
                height: '38px',
                backgroundColor: 'rgba(3, 105, 161, 0.1)',
                color: '#0369a1'
              }}
            >
              <SettingsIcon size={20} />
            </div>
            <h1 className="h4 fw-bold text-dark mb-0">{t('settings.page_title')}</h1>
          </div>
          <p className="text-muted small mb-0">{t('settings.page_subtitle')}</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-inline-flex align-items-center gap-1.5 rounded-2 px-3 py-2 fw-medium"
            onClick={handleResetDefaults}
          >
            <RotateCcw size={15} />
            <span>{t('settings.btn_reset')}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="d-inline-flex align-items-center gap-1.5 rounded-2 px-3 py-2 fw-semibold"
            style={{ backgroundColor: '#0369a1', borderColor: '#0369a1' }}
            onClick={handleSavePreferences}
          >
            <Save size={15} />
            <span>{t('settings.btn_save')}</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('display')}
          className={`btn btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold ${
            activeTab === 'display' ? 'btn-primary shadow-sm' : 'btn-light text-secondary border'
          }`}
          style={activeTab === 'display' ? { backgroundColor: '#0369a1', borderColor: '#0369a1' } : undefined}
        >
          <Globe size={16} />
          <span>{t('settings.tab_display')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`btn btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold ${
            activeTab === 'notifications' ? 'btn-primary shadow-sm' : 'btn-light text-secondary border'
          }`}
          style={activeTab === 'notifications' ? { backgroundColor: '#0369a1', borderColor: '#0369a1' } : undefined}
        >
          <Bell size={16} />
          <span>{t('settings.tab_notifications')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('account')}
          className={`btn btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold ${
            activeTab === 'account' ? 'btn-primary shadow-sm' : 'btn-light text-secondary border'
          }`}
          style={activeTab === 'account' ? { backgroundColor: '#0369a1', borderColor: '#0369a1' } : undefined}
        >
          <ShieldCheck size={16} />
          <span>{t('settings.tab_account')}</span>
        </button>
      </div>

      {/* Tab 1: Display & Language */}
      {activeTab === 'display' && (
        <Row className="g-4">
          <Col lg={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Globe size={18} className="text-primary" />
                  <h2 className="h6 fw-bold text-dark mb-0">{t('settings.lang_title')}</h2>
                </div>
                <p className="text-muted small mb-4">{t('settings.lang_desc')}</p>

                <div className="d-flex flex-column gap-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setLanguage('vi')}
                    onKeyDown={(e) => e.key === 'Enter' && setLanguage('vi')}
                    className={`p-3 rounded-3 border d-flex align-items-center justify-content-between ${
                      lang === 'vi' ? 'border-primary bg-primary bg-opacity-10' : 'bg-white'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                        {t('settings.lang_vi_label')}
                      </div>
                      <div className="text-muted small">{t('settings.lang_vi_sub')}</div>
                    </div>
                    {lang === 'vi' && (
                      <Badge bg="primary" pill className="px-2.5 py-1">
                        {t('settings.active_badge')}
                      </Badge>
                    )}
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setLanguage('en')}
                    onKeyDown={(e) => e.key === 'Enter' && setLanguage('en')}
                    className={`p-3 rounded-3 border d-flex align-items-center justify-content-between ${
                      lang === 'en' ? 'border-primary bg-primary bg-opacity-10' : 'bg-white'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                        {t('settings.lang_en_label')}
                      </div>
                      <div className="text-muted small">{t('settings.lang_en_sub')}</div>
                    </div>
                    {lang === 'en' && (
                      <Badge bg="primary" pill className="px-2.5 py-1">
                        {t('settings.active_badge')}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <SettingsIcon size={18} className="text-primary" />
                  <h2 className="h6 fw-bold text-dark mb-0">{t('settings.display_prefs_title')}</h2>
                </div>

                <Form.Group className="mb-3" controlId="settingsDensity">
                  <Form.Label className="small fw-semibold text-secondary">
                    {t('settings.density_label')}
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={prefs.tableDensity}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        tableDensity: e.target.value as SystemPreferences['tableDensity']
                      }))
                    }
                  >
                    <option value="comfortable">{t('settings.density_comfortable')}</option>
                    <option value="compact">{t('settings.density_compact')}</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3" controlId="settingsDateFormat">
                  <Form.Label className="small fw-semibold text-secondary">
                    {t('settings.date_format_label')}
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={prefs.dateFormat}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        dateFormat: e.target.value as SystemPreferences['dateFormat']
                      }))
                    }
                  >
                    <option value="DD/MM/YYYY">{t('settings.date_format_dmy')}</option>
                    <option value="YYYY-MM-DD">{t('settings.date_format_ymd')}</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-0" controlId="settingsDefaultPage">
                  <Form.Label className="small fw-semibold text-secondary">
                    {t('settings.default_page_label')}
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={prefs.defaultPage}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        defaultPage: e.target.value as SystemPreferences['defaultPage']
                      }))
                    }
                  >
                    <option value="/">{t('settings.default_page_dashboard')}</option>
                    <option value="/shifts">{t('settings.default_page_shifts')}</option>
                    <option value="/tasks">{t('settings.default_page_tasks')}</option>
                    <option value="/profile">{t('settings.default_page_profile')}</option>
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tab 2: Notification Preferences */}
      {activeTab === 'notifications' && (
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Bell size={18} className="text-primary" />
              <h2 className="h6 fw-bold text-dark mb-0">{t('settings.notif_title')}</h2>
            </div>
            <p className="text-muted small mb-4">{t('settings.notif_desc')}</p>

            <div className="d-flex flex-column gap-3">
              {(
                [
                  {
                    key: 'shiftReminders',
                    label: t('settings.notif_shifts_label'),
                    desc: t('settings.notif_shifts_desc')
                  },
                  {
                    key: 'pendingHandovers',
                    label: t('settings.notif_handovers_label'),
                    desc: t('settings.notif_handovers_desc')
                  },
                  {
                    key: 'licenseExpiry',
                    label: t('settings.notif_license_label'),
                    desc: t('settings.notif_license_desc')
                  },
                  {
                    key: 'hrUpdates',
                    label: t('settings.notif_hr_label'),
                    desc: t('settings.notif_hr_desc')
                  }
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="p-3 rounded-3 border bg-light bg-opacity-50 d-flex align-items-center justify-content-between gap-3"
                >
                  <div>
                    <div className="fw-semibold text-dark" style={{ fontSize: '14px' }}>
                      {item.label}
                    </div>
                    <div className="text-muted small">{item.desc}</div>
                  </div>
                  <Form.Check
                    type="switch"
                    id={`notif-switch-${item.key}`}
                    aria-label={item.label}
                    checked={prefs.notifications[item.key]}
                    onChange={() => toggleNotification(item.key)}
                  />
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Tab 3: Account & RBAC Session */}
      {activeTab === 'account' && (
        <Card className="border-0 shadow-sm rounded-3">
          <Card.Body className="p-4">
            <div className="d-flex align-items-center gap-2 mb-1">
              <UserCheck size={18} className="text-primary" />
              <h2 className="h6 fw-bold text-dark mb-0">{t('settings.account_title')}</h2>
            </div>
            <p className="text-muted small mb-4">{t('settings.account_desc')}</p>

            <Row className="g-3 mb-4">
              <Col sm={6} md={3}>
                <div className="p-3 rounded-3 border bg-light">
                  <div className="text-muted small mb-1">{t('settings.lbl_staff_code')}</div>
                  <div className="fw-bold text-dark">{user?.employee_code || 'EMP-DOC-001'}</div>
                </div>
              </Col>
              <Col sm={6} md={3}>
                <div className="p-3 rounded-3 border bg-light">
                  <div className="text-muted small mb-1">{t('settings.lbl_full_name')}</div>
                  <div className="fw-bold text-dark">
                    {user?.full_name || user?.name || t('common.hospital_staff')}
                  </div>
                </div>
              </Col>
              <Col sm={6} md={3}>
                <div className="p-3 rounded-3 border bg-light">
                  <div className="text-muted small mb-1">{t('settings.lbl_role')}</div>
                  <div className="fw-bold text-primary">{roleLabel}</div>
                </div>
              </Col>
              <Col sm={6} md={3}>
                <div className="p-3 rounded-3 border bg-light">
                  <div className="text-muted small mb-1">{t('common.status')}</div>
                  <Badge bg="success" className="px-2.5 py-1">
                    {t('common.active')}
                  </Badge>
                </div>
              </Col>
            </Row>

            <div>
              <div className="fw-semibold text-secondary small mb-2">
                {t('settings.lbl_permissions')}
              </div>
              <div className="d-flex flex-wrap gap-2">
                {permissionsList.map((perm) => (
                  <span
                    key={perm}
                    className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2 fw-medium"
                    style={{ fontSize: '12px' }}
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default Settings;
