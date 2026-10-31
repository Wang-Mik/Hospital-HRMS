import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Modal,
  Form,
  Alert,
  Badge,
  Button
} from 'react-bootstrap';
import {
  ShieldCheck,
  Users,
  Building2,
  Bell,
  Plus,
  Edit2,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminAccount } from '../api/adminApi';
import { departmentApi, Department } from '../api/departmentApi';
import { useTranslation } from '../i18n/useTranslation';
import { ConfirmModal, ConfirmDetailItem } from '../components/common/ConfirmModal';

export const SystemManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Smooth redirect to dedicated HR Management portal if HR tab requested
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['leaves', 'compensation', 'shifts_handover', 'licensing'].includes(tabParam)) {
      navigate(`/hr?tab=${tabParam}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const validTabs: Array<'staff_iam' | 'departments' | 'broadcast'> = [
    'staff_iam',
    'departments',
    'broadcast'
  ];

  const initialTab = (searchParams.get('tab') as any);
  const [activeTab, setActiveTab] = useState<'staff_iam' | 'departments' | 'broadcast'>(
    validTabs.includes(initialTab) ? initialTab : 'staff_iam'
  );

  // Sync tab with search params when url changes
  useEffect(() => {
    const tabParam = searchParams.get('tab') as any;
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handler to switch tabs and sync URL
  const handleTabChange = (newTab: 'staff_iam' | 'departments' | 'broadcast') => {
    setActiveTab(newTab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    }, { replace: true });
  };

  // Auto-scroll active tab into view
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeEl = tabsContainerRef.current.querySelector('.wd-tab-btn.active') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const offset = direction === 'left' ? -220 : 220;
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Centralized Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
    iconType?: 'alert' | 'lock' | 'unlock' | 'shield' | 'broadcast' | 'check';
    isLoading?: boolean;
    details?: ConfirmDetailItem[];
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const closeConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, show: false }));
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');

  const showToast = (msg: string, variant: 'success' | 'danger' = 'success') => {
    setToastMessage(msg);
    setToastVariant(variant);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Queries
  const { data: overviewData, refetch: refetchOverview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: adminApi.getOverview
  });

  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: adminApi.getAllAccounts
  });

  const { data: departments = [], refetch: refetchDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentApi.getAll
  });

  const { data: systemRoles = [] } = useQuery({
    queryKey: ['system-roles'],
    queryFn: adminApi.getAllRoles
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  // Modals state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedEmpForEdit, setSelectedEmpForEdit] = useState<any>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedAccountForPassword, setSelectedAccountForPassword] = useState<AdminAccount | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // IAM Role Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedAccountForRole, setSelectedAccountForRole] = useState<AdminAccount | null>(null);
  const [newRoleCode, setNewRoleCode] = useState('STAFF');

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);

  const [broadcastData, setBroadcastData] = useState({
    title: '',
    message: '',
    type: 'ANNOUNCEMENT' as 'ALERT' | 'ANNOUNCEMENT' | 'TASK',
    department_code: 'ALL'
  });

  // Master Profile Edit Form
  const [profileFormData, setProfileFormData] = useState<any>({});

  // Mutations
  const lockAccountMutation = useMutation({
    mutationFn: ({ id, is_locked }: { id: string | number; is_locked: boolean }) =>
      adminApi.toggleAccountLock(id, is_locked),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      showToast(vars.is_locked ? t('admin.toast_lock_success', 'Đã cập nhật trạng thái khóa tài khoản thành công!') : t('admin.toast_lock_updated', 'Đã cập nhật trạng thái khóa tài khoản thành công!'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_lock_failed', 'Không thể cập nhật trạng thái khóa')}: ${err.message || ''}`, 'danger');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, new_password }: { id: string | number; new_password: string }) =>
      adminApi.resetPassword(id, new_password),
    onSuccess: () => {
      setShowResetPasswordModal(false);
      setNewPasswordValue('');
      showToast(t('admin.toast_password_success', 'Đã đặt lại mật khẩu mới thành công!'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_pwd_failed', 'Không thể đặt lại mật khẩu')}: ${err.message || ''}`, 'danger');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role_code }: { id: string | number; role_code: string }) =>
      adminApi.updateAccountRole(id, role_code),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      setShowRoleModal(false);
      showToast(`${t('admin.toast_role_success', 'Đã cập nhật phân quyền tài khoản thành công!')} (${vars.role_code})`);
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_role_failed', 'Không thể cập nhật phân quyền')}: ${err.message || ''}`, 'danger');
    }
  });

  const adminUpdateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      adminApi.adminUpdateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowEditProfileModal(false);
      showToast(t('admin.btn_save_profile', 'Lưu Thay Đổi Hồ Sơ'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_update_failed', 'Lỗi cập nhật')}: ${err.message || ''}`, 'danger');
    }
  });

  const saveDepartmentMutation = useMutation({
    mutationFn: (data: Partial<Department>) => {
      if (editingDept && editingDept.department_code && !data.department_code) {
        return departmentApi.update(editingDept.department_code, data);
      }
      return departmentApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setShowDeptModal(false);
      setEditingDept(null);
      showToast(t('admin.btn_save_dept', 'Lưu Khoa Phòng'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_dept_failed', 'Lỗi khoa phòng')}: ${err.message || ''}`, 'danger');
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: any) => adminApi.broadcastNotification(data),
    onSuccess: (res: any) => {
      showToast(res.message || t('admin.toast_broadcast_success', 'Đã phát thông báo thành công toàn viện!'));
      setBroadcastData({ title: '', message: '', type: 'ANNOUNCEMENT', department_code: 'ALL' });
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_broadcast_failed', 'Lỗi phát thông báo')}: ${err.message || ''}`, 'danger');
    }
  });

  const onboardMutation = useMutation({
    mutationFn: (data: any) => adminApi.onboardStaff(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setShowOnboardModal(false);
      showToast(`${t('admin.toast_onboard_success', 'Tiếp nhận thành công nhân sự')} ${res.staff_name} (${res.employee_code}) - ${t('admin.toast_temp_pwd', 'Mật khẩu khởi tạo')}: ${res.temporary_password}`);
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_onboard_failed', 'Lỗi tiếp nhận')}: ${err.message || ''}`, 'danger');
    }
  });

  // Handlers
  const handleOpenMasterEdit = (acc: AdminAccount) => {
    setSelectedEmpForEdit(acc);
    setProfileFormData({
      first_name: acc.first_name || '',
      last_name: acc.last_name || '',
      email: acc.email || '',
      phone: acc.phone || '',
      role: acc.role || 'STAFF',
      specialty: acc.specialty || '',
      department_code: acc.department_code || '',
      status: acc.employee_status || 'ACTIVE',
      work_location: 'Central General Hospital',
      office_location: acc.department_name || '',
      hire_date: '2026-01-01',
      dob: '1985-05-15',
      gender: 'MALE',
      national_id: '001085001234',
      nationality: 'Vietnam',
      marital_status: 'MARRIED',
      personal_email: acc.email || '',
      personal_phone: acc.phone || '',
      home_phone: acc.phone || '',
      home_address: 'Hanoi',
      district: 'Ba Dinh',
      city_province: 'Hanoi'
    });
    setShowEditProfileModal(true);
  };

  const handleRefreshAll = () => {
    refetchOverview();
    refetchAccounts();
    refetchDepartments();
    showToast(t('admin.toast_sync_success', 'Dữ liệu toàn hệ thống đã được đồng bộ mới nhất từ máy chủ!'));
  };

  const kpis = overviewData?.kpis || {
    total_employees: accounts.length || 10,
    total_departments: departments.length || 8,
    locked_accounts: accounts.filter((a) => a.is_locked).length,
    active_accounts: accounts.filter((a) => !a.is_locked).length
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchSearch =
      searchQuery === '' ||
      acc.staff_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.employee_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = selectedDeptFilter === 'ALL' || acc.department_code === selectedDeptFilter;
    return matchSearch && matchDept;
  });

  // Confirmation action handlers
  const handleToggleLockAccount = (acc: AdminAccount) => {
    const isLocking = !acc.is_locked;
    setConfirmDialog({
      show: true,
      title: isLocking
        ? t('admin.confirm_lock_title', 'Xác Nhận Khóa Tài Khoản')
        : t('admin.confirm_unlock_title', 'Xác Nhận Mở Khóa Tài Khoản'),
      message: isLocking
        ? t('admin.confirm_lock_body', 'Bạn có chắc chắn muốn khóa tài khoản này? Cán bộ sẽ không thể đăng nhập vào hệ thống bệnh viện cho đến khi được mở khóa.')
        : t('admin.confirm_unlock_body', 'Bạn có chắc chắn muốn mở khóa tài khoản này? Cán bộ sẽ có thể đăng nhập lại vào hệ thống bệnh viện.'),
      confirmText: isLocking
        ? t('admin.action_lock_btn', 'Khóa')
        : t('admin.action_unlock_btn', 'Mở'),
      variant: isLocking ? 'danger' : 'success',
      iconType: isLocking ? 'lock' : 'unlock',
      details: [
        { label: t('admin.label_staff_name', 'Cán bộ'), value: acc.staff_name || acc.first_name || 'N/A' },
        { label: t('admin.label_account', 'Tài khoản'), value: `@${acc.username} • ${acc.employee_code}` },
        { label: t('admin.label_department', 'Khoa phòng'), value: acc.department_name || acc.department_code || 'N/A' }
      ],
      onConfirm: () => {
        lockAccountMutation.mutate(
          { id: acc.account_id, is_locked: isLocking },
          {
            onSettled: () => closeConfirmDialog()
          }
        );
      }
    });
  };

  const handleRequestRoleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForRole) return;
    const targetRole = systemRoles.find((r: any) => r.role_code === newRoleCode);
    setConfirmDialog({
      show: true,
      title: t('admin.confirm_role_title', 'Xác Nhận Thay Đổi Vai Trò IAM'),
      message: t('admin.confirm_role_body', 'Bạn có chắc chắn muốn cập nhật vai trò và quyền hạn truy cập của cán bộ này không? Thay đổi sẽ có hiệu lực ngay lập tức.'),
      confirmText: t('admin.btn_update_role', 'Cập Nhật Quyền Hạn'),
      variant: 'primary',
      iconType: 'shield',
      details: [
        { label: t('admin.label_staff_name', 'Cán bộ'), value: selectedAccountForRole.staff_name },
        { label: t('admin.label_account', 'Tài khoản'), value: `@${selectedAccountForRole.username}` },
        { label: t('admin.label_current_role', 'Vai trò hiện tại'), value: selectedAccountForRole.role_code || selectedAccountForRole.role },
        { label: t('admin.label_new_role', 'Vai trò mới'), value: targetRole ? `${targetRole.name} [${targetRole.role_code}]` : newRoleCode }
      ],
      onConfirm: () => {
        updateRoleMutation.mutate(
          {
            id: selectedAccountForRole.account_id,
            role_code: newRoleCode
          },
          {
            onSettled: () => closeConfirmDialog()
          }
        );
      }
    });
  };

  const handleRequestBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    const deptName = broadcastData.department_code === 'ALL'
      ? t('admin.broadcast_scope_all', 'Toàn Viện (Tất cả khoa phòng)')
      : departments.find(d => d.department_code === broadcastData.department_code)?.name || broadcastData.department_code;

    setConfirmDialog({
      show: true,
      title: t('admin.confirm_broadcast_title', 'Xác Nhận Phát Lệnh Thông Báo'),
      message: t('admin.confirm_broadcast_body', 'Thông báo sẽ được gửi trực tiếp đến toàn thể cán bộ trong phạm vi đã chọn ngay lập tức. Bạn có chắc chắn muốn phát lệnh không?'),
      confirmText: t('admin.btn_send_broadcast', 'Phát Lệnh Thông Báo Ngay'),
      variant: broadcastData.type === 'ALERT' ? 'danger' : 'primary',
      iconType: 'broadcast',
      details: [
        { label: t('admin.label_scope', 'Phạm vi gửi'), value: deptName },
        { label: t('admin.label_type', 'Phân loại'), value: broadcastData.type },
        { label: t('admin.label_title', 'Tiêu đề'), value: broadcastData.title }
      ],
      onConfirm: () => {
        broadcastMutation.mutate(broadcastData, {
          onSettled: () => closeConfirmDialog()
        });
      }
    });
  };

  return (
    <Container fluid className="px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ backgroundColor: '#e8f1fd', color: 'var(--wd-blue)', width: '48px', height: '48px' }}
          >
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="h4 fw-bold text-dark mb-1">
              {t('admin.page_title', 'Cổng Quản Trị Hệ Thống')}
            </h1>
            <p className="text-muted small mb-0">
              {t('admin.page_subtitle', 'Trung tâm chỉ huy IT & Quản trị hệ thống: Quản lý định danh IAM, phân quyền vai trò, cơ cấu tổ chức khoa phòng và phát lệnh thông báo toàn viện.')}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="wd-pill-btn d-flex align-items-center gap-2 px-3 py-1.5"
            onClick={handleRefreshAll}
            title={t('admin.sync_tooltip', 'Đồng bộ dữ liệu mới nhất')}
          >
            <RefreshCw size={15} />
            <span>{t('admin.refresh', 'Làm Mới')}</span>
          </button>

          <button
            type="button"
            className="wd-pill-btn-primary d-flex align-items-center gap-2 px-3 py-1.5"
            onClick={() => setShowOnboardModal(true)}
          >
            <Plus size={16} />
            <span>{t('admin.onboard_new_staff', 'Tiếp Nhận Cán Bộ Mới')}</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <Alert
          variant={toastVariant}
          dismissible
          onClose={() => setToastMessage(null)}
          className="d-flex align-items-center gap-2 py-2.5 px-3 mb-4 small rounded-2"
        >
          {toastVariant === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage}</span>
        </Alert>
      )}

      {/* Command Center Ribbon - 2 Live IT KPIs */}
      <Row className="g-3 mb-4">
        {/* KPI 1: IAM Accounts */}
        <Col xs={12} sm={6}>
          <div className="wd-card p-3.5 h-100 border-start border-4 border-primary">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('admin.kpi_total_accounts', 'Tổng Tài Khoản IAM')}</span>
              <div className="p-1.5 rounded-2 bg-primary bg-opacity-10 text-primary">
                <Users size={16} />
              </div>
            </div>
            <div className="h3 fw-bold text-dark my-1 font-mono">{accounts.length}</div>
            <div className="d-flex align-items-center gap-1.5 small text-muted mt-2">
              <span className="badge bg-success bg-opacity-10 text-success fw-normal">{t('admin.kpi_active_100', '100% Đang hoạt động')}</span>
            </div>
          </div>
        </Col>

        {/* KPI 2: Departments */}
        <Col xs={12} sm={6}>
          <div className="wd-card p-3.5 h-100 border-start border-4 border-info">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('admin.kpi_departments_count', 'Khoa Phòng Chức Năng')}</span>
              <div className="p-1.5 rounded-2 bg-info bg-opacity-10 text-info">
                <Building2 size={16} />
              </div>
            </div>
            <div className="h3 fw-bold text-dark my-1 font-mono">{departments.length}</div>
            <div className="small text-muted mt-2">{t('admin.kpi_org_complete', 'Cơ cấu tổ chức hoàn chỉnh')}</div>
          </div>
        </Col>
      </Row>

      {/* Operational Tabs */}
      <div className="wd-tabs-container mb-4">
        <button
          type="button"
          className="wd-tab-scroll-btn d-none d-md-flex"
          onClick={() => scrollTabs('left')}
          title={t('admin.tab_scroll_prev', 'Cuộn sang trái')}
          aria-label={t('admin.tab_scroll_prev', 'Cuộn sang trái')}
        >
          <ChevronLeft size={16} />
        </button>

        <div className="wd-tabs" ref={tabsContainerRef}>
          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'staff_iam' ? 'active' : ''}`}
            onClick={() => handleTabChange('staff_iam')}
          >
            <Users size={15} className="me-2" />
            {t('admin.tab_staff_iam', 'Cán Bộ & Tài Khoản IAM')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{accounts.length}</span>
          </button>

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => handleTabChange('departments')}
          >
            <Building2 size={15} className="me-2" />
            {t('admin.tab_departments', 'Khoa Phòng & Cơ Cấu')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{departments.length}</span>
          </button>

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
            onClick={() => handleTabChange('broadcast')}
          >
            <Bell size={15} className="me-2" />
            {t('admin.tab_broadcast', 'Phát Lệnh Thông Báo')}
          </button>
        </div>

        <button
          type="button"
          className="wd-tab-scroll-btn d-none d-md-flex"
          onClick={() => scrollTabs('right')}
          title={t('admin.tab_scroll_next', 'Cuộn sang phải')}
          aria-label={t('admin.tab_scroll_next', 'Cuộn sang phải')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* TAB 1: STAFF & IAM */}
      {activeTab === 'staff_iam' && (
        <div className="wd-card mb-4" style={{ minHeight: '480px' }}>
          <div className="p-3.5 pb-3 border-bottom d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '600px' }}>
              <div className="position-relative flex-grow-1">
                <Search size={15} aria-hidden="true" className="position-absolute text-muted" style={{ left: '12px', top: '11px' }} />
                <input
                  type="text"
                  placeholder={t('admin.search_staff_placeholder', 'Tìm kiếm họ tên cán bộ, mã NV, username hoặc email...')}
                  aria-label={t('admin.search_staff_placeholder', 'Tìm kiếm họ tên cán bộ, mã NV, username hoặc email...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="wd-input w-100 ps-5"
                />
              </div>

              <select
                className="wd-select"
                aria-label={t('admin.all_departments_filter', 'Lọc theo khoa phòng')}
                style={{ width: '220px' }}
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
              >
                <option value="ALL">{t('admin.all_departments_filter', '-- Tất Cả Khoa Phòng --')}</option>
                {departments.map((d) => (
                  <option key={d.department_code} value={d.department_code}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-muted small">
              {t('admin.showing_accounts', 'Hiển thị')} <strong>{filteredAccounts.length}</strong> / {accounts.length} {t('admin.of_accounts', 'tài khoản')}
            </div>
          </div>

          <div className="table-responsive">
            <table className="wd-table w-100">
              <thead>
                <tr>
                  <th>{t('admin.col_medical_staff', 'Cán Bộ Y Tế')}</th>
                  <th>{t('admin.col_iam_account', 'Tài Khoản IAM')}</th>
                  <th>{t('admin.col_department', 'Khoa / Phòng Chuyên Môn')}</th>
                  <th>{t('admin.col_role_permissions', 'Chức Danh & Phân Quyền')}</th>
                  <th>{t('admin.col_status_col', 'Trạng Thái')}</th>
                  <th className="text-end">{t('admin.col_admin_actions', 'Thao Tác Quản Trị')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((acc) => (
                  <tr key={acc.account_id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                          style={{
                            width: '38px',
                            height: '38px',
                            backgroundColor: acc.role === 'SUPER_ADMIN' ? '#d9381e' : '#0875e1',
                            fontSize: '13px'
                          }}
                        >
                          {acc.first_name ? acc.first_name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <div className="fw-semibold text-dark mb-0.5">{acc.staff_name}</div>
                          <div className="text-muted small font-mono">{acc.employee_code} • {acc.email}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="fw-medium font-monospace text-dark" style={{ fontSize: '13px' }}>
                        @{acc.username}
                      </div>
                      <div className="text-muted small">
                        {t('admin.last_login', 'Đăng nhập cuối')}: {acc.last_login ? acc.last_login.slice(0, 16) : t('admin.last_login_none', 'Chưa có')}
                      </div>
                    </td>

                    <td>
                      <div className="fw-medium text-dark">{acc.department_name || acc.department_code}</div>
                      <div className="text-muted small">{acc.specialty || t('admin.no_specialty', 'Chưa cập nhật chuyên môn')}</div>
                    </td>

                    <td>
                      <div>
                        <Badge
                          bg={
                            (acc.role_code || acc.role) === 'SUPER_ADMIN'
                              ? 'danger'
                              : (acc.role_code || acc.role) === 'HR_MANAGER'
                              ? 'warning'
                              : (acc.role_code || acc.role) === 'DEPARTMENT_HEAD'
                              ? 'dark'
                              : (acc.role_code || acc.role) === 'DOCTOR'
                              ? 'primary'
                              : (acc.role_code || acc.role) === 'NURSE'
                              ? 'info'
                              : 'secondary'
                          }
                          className="fw-semibold px-2.5 py-1 rounded-pill"
                        >
                          {acc.role_code || acc.role}
                        </Badge>
                        {acc.role_name && (
                          <div className="text-muted small mt-0.5" style={{ fontSize: '11px' }}>
                            {acc.role_name}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      {acc.is_locked ? (
                        <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-2.5 py-1 rounded-pill">
                          <Lock size={12} className="me-1" /> {t('admin.status_locked', 'Đã Khóa')}
                        </span>
                      ) : (
                        <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2.5 py-1 rounded-pill">
                          <CheckCircle2 size={12} className="me-1" /> {t('admin.status_active', 'Hoạt Động')}
                        </span>
                      )}
                    </td>

                    <td className="text-end">
                      <div className="d-flex align-items-center justify-content-end gap-1.5 flex-nowrap">
                        {/* Assign IAM Role */}
                        <button
                          type="button"
                          className="wd-action-btn wd-action-btn-role"
                          onClick={() => {
                            setSelectedAccountForRole(acc);
                            setNewRoleCode(acc.role_code || acc.role || 'STAFF');
                            setShowRoleModal(true);
                          }}
                          title={t('admin.action_role_tooltip', 'Phân quyền vai trò IAM')}
                        >
                          <ShieldCheck size={14} />
                          <span>{t('admin.action_role_btn', 'Vai Trò')}</span>
                        </button>

                        {/* Master Profile Edit */}
                        <button
                          type="button"
                          className="wd-action-btn wd-action-btn-edit"
                          onClick={() => handleOpenMasterEdit(acc)}
                          title={t('admin.action_edit_tooltip', 'Chỉnh sửa toàn bộ hồ sơ cán bộ')}
                        >
                          <Edit2 size={13} />
                          <span>{t('admin.action_edit_btn', 'Sửa')}</span>
                        </button>

                        {/* Lock / Unlock with Confirmation */}
                        <button
                          type="button"
                          className={`wd-action-btn wd-action-btn-icon-only ${acc.is_locked ? 'wd-action-btn-locked' : 'wd-action-btn-active'}`}
                          onClick={() => handleToggleLockAccount(acc)}
                          title={acc.is_locked ? t('admin.btn_unlock_tooltip', 'Mở khóa tài khoản') : t('admin.btn_lock_tooltip', 'Khóa tài khoản')}
                          aria-label={acc.is_locked ? t('admin.btn_unlock_tooltip', 'Mở khóa tài khoản') : t('admin.btn_lock_tooltip', 'Khóa tài khoản')}
                        >
                          {acc.is_locked ? <Lock size={14} aria-hidden="true" /> : <Unlock size={14} aria-hidden="true" />}
                        </button>

                        {/* Reset Password */}
                        <button
                          type="button"
                          className="wd-action-btn wd-action-btn-icon-only wd-action-btn-key"
                          onClick={() => {
                            setSelectedAccountForPassword(acc);
                            setShowResetPasswordModal(true);
                          }}
                          title={t('admin.btn_reset_pwd_tooltip', 'Đặt lại mật khẩu')}
                          aria-label={t('admin.btn_reset_pwd_tooltip', 'Đặt lại mật khẩu')}
                        >
                          <Key size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS */}
      {activeTab === 'departments' && (
        <div>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="h5 fw-bold mb-0">{t('admin.dept_catalog_title', 'Danh Mục 8 Khoa Phòng Bệnh Viện')}</h2>
            <button
              type="button"
              className="wd-pill-btn-primary d-flex align-items-center gap-1.5"
              onClick={() => {
                setEditingDept({
                  department_code: `DEP-NEW-${Math.floor(Math.random() * 900 + 100)}`,
                  name: '',
                  location: 'Building A',
                  description: '',
                  status: 'ACTIVE'
                });
                setShowDeptModal(true);
              }}
            >
              <Plus size={16} /> {t('admin.btn_add_dept', 'Thêm Khoa Phòng')}
            </button>
          </div>

          <Row className="g-3">
            {departments.map((dept: any) => (
              <Col xs={12} md={6} lg={3} key={dept.department_code}>
                <div className="wd-card p-3 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <span className="badge bg-primary bg-opacity-10 text-primary font-monospace px-2 py-1">
                        {dept.department_code}
                      </span>
                      <span
                        className={`badge ${
                          dept.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'
                        } bg-opacity-10 text-${dept.status === 'ACTIVE' ? 'success' : 'secondary'}`}
                      >
                        {dept.status === 'ACTIVE' ? t('admin.dept_active', 'Đang Hoạt Động') : t('admin.dept_paused', 'Tạm Dừng')}
                      </span>
                    </div>

                    <h3 className="h6 fw-bold text-dark mb-1">{dept.name}</h3>
                    <p className="text-muted small mb-2" style={{ minHeight: '36px' }}>
                      {dept.description || t('admin.dept_no_desc', 'Chưa cập nhật chức năng nhiệm vụ.')}
                    </p>

                    <div className="small text-muted mb-3">
                      <div>{dept.location || t('admin.dept_default_location', 'Khu nhà khám chữa bệnh')}</div>
                    </div>
                  </div>

                  <div className="border-top pt-2.5 d-flex align-items-center justify-content-between">
                    <div className="small">
                      <span className="text-muted">{t('admin.dept_headcount', 'Nhân lực')}: </span>
                      <strong className="text-primary">{dept.employee_count ?? 0} {t('admin.dept_staff_count', 'cán bộ')}</strong>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                      onClick={() => {
                        setEditingDept(dept);
                        setShowDeptModal(true);
                      }}
                    >
                      {t('admin.btn_edit_dept', 'Chỉnh sửa')} &rarr;
                    </button>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* TAB 3: BROADCAST CENTER */}
      {activeTab === 'broadcast' && (
        <Row className="g-4">
          <Col xs={12} md={6}>
            <div className="wd-card p-4 h-100">
              <h2 className="h5 fw-bold text-dark mb-2">{t('admin.broadcast_title', 'Phát Lệnh Thông Báo Nội Bộ Bệnh Viện')}</h2>
              <p className="text-muted small mb-4">
                {t('admin.broadcast_subtitle', 'Thông báo sẽ xuất hiện trực tiếp trên bảng điều khiển Dashboard và thanh thông báo của các cán bộ mục tiêu.')}
              </p>

              <Form onSubmit={handleRequestBroadcast}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">{t('admin.broadcast_scope_label', 'Phạm Vi Tiếp Nhận Thông Báo')}</Form.Label>
                  <Form.Select
                    aria-label={t('admin.broadcast_scope_label', 'Phạm Vi Tiếp Nhận Thông Báo')}
                    value={broadcastData.department_code}
                    onChange={(e) => setBroadcastData({ ...broadcastData, department_code: e.target.value })}
                    className="wd-input"
                  >
                    <option value="ALL">{t('admin.target_hospital', 'Toàn Bệnh Viện')}</option>
                    {departments.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">{t('admin.broadcast_type_label', 'Phân Loại Thông Báo')}</Form.Label>
                  <Form.Select
                    aria-label={t('admin.broadcast_type_label', 'Phân Loại Thông Báo')}
                    value={broadcastData.type}
                    onChange={(e) => setBroadcastData({ ...broadcastData, type: e.target.value as any })}
                    className="wd-input"
                  >
                    <option value="ANNOUNCEMENT">{t('admin.announcement_general', 'Thông Báo Chung')}</option>
                    <option value="ALERT">{t('admin.announcement_emergency', 'Cảnh Báo Khẩn Cấp')}</option>
                    <option value="TASK">{t('admin.announcement_task', 'Giao Việc Điều Hành')}</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">{t('admin.announcement_title', 'Tiêu Đề Thông Báo')}</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    placeholder={t('admin.broadcast_title_placeholder', 'Thông báo lịch trực tăng cường...')}
                    value={broadcastData.title}
                    onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-semibold">{t('admin.broadcast_body_label', 'Nội Dung Chi Tiết')}</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    required
                    placeholder={t('admin.broadcast_body_placeholder', 'Nhập nội dung thông điệp gửi tới cán bộ y tế...')}
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>

                <Button
                  type="submit"
                  disabled={broadcastMutation.isPending}
                  className="wd-pill-btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                >
                  <Send size={16} />
                  <span>{broadcastMutation.isPending ? t('admin.btn_sending_broadcast', 'Đang gửi...') : t('admin.btn_send_broadcast', 'Phát Lệnh Thông Báo Ngay')}</span>
                </Button>
              </Form>
            </div>
          </Col>

          <Col xs={12} md={6}>
            <div className="wd-card p-4 h-100">
              <h3 className="h6 fw-bold text-dark mb-3">{t('admin.broadcast_standards_title', 'Quy Chuẩn Thông Báo Nội Bộ Bệnh Viện')}</h3>
              <div className="d-flex flex-column gap-3 text-muted small">
                <div className="p-3 bg-light rounded-2 border">
                  <strong className="text-dark d-block mb-1">{t('admin.announcement_emergency', 'Cảnh Báo Khẩn Cấp')}:</strong>
                  {t('admin.broadcast_standards_urgent', 'Áp dụng cho báo động đỏ nội viện, tiếp nhận thảm họa hoặc dịch bệnh đột xuất.')}
                </div>

                <div className="p-3 bg-light rounded-2 border">
                  <strong className="text-dark d-block mb-1">{t('admin.announcement_general', 'Thông Báo Chung')}:</strong>
                  {t('admin.broadcast_standards_info', 'Áp dụng cho quy chế lương thưởng, chính sách cấp phép chứng chỉ, kế hoạch đào tạo y khoa liên tục.')}
                </div>

                <div className="p-3 bg-light rounded-2 border">
                  <strong className="text-dark d-block mb-1">{t('admin.announcement_task', 'Giao Việc Điều Hành')}:</strong>
                  {t('admin.broadcast_standards_task', 'Áp dụng cho yêu cầu hoàn thiện hồ sơ bệnh án, rà soát trang thiết bị y tế và chuẩn bị kiểm tra chất lượng bệnh viện.')}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: MASTER PROFILE EDIT (Unlocks All Fields) */}
      {/* ========================================================================= */}
      <Modal show={showEditProfileModal} onHide={() => setShowEditProfileModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Edit2 size={18} className="text-primary" />
            {t('admin.modal_edit_profile_title', 'Sửa Toàn Bộ Hồ Sơ Nhân Viên')}
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedEmpForEdit) {
              adminUpdateEmployeeMutation.mutate({
                id: selectedEmpForEdit.employee_code,
                data: profileFormData
              });
            }
          }}
        >
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Alert variant="info" className="py-2 small mb-3">
              {t('admin.modal_edit_profile_subtitle', 'Quyền Admin cho phép chỉnh sửa toàn bộ các trường nhân sự, bao gồm cả khoa phòng, chức vụ, trạng thái và ngày vào làm.')}
            </Alert>

            <h6 className="fw-bold text-dark border-bottom pb-1 mb-3">{t('admin.sec_clinical_org', '1. Thông Tin Chuyên Môn & Tổ Chức')}</h6>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_dept', 'Khoa / Phòng Chuyên Môn')}</Form.Label>
                  <Form.Select
                    aria-label={t('admin.field_dept', 'Khoa / Phòng Chuyên Môn')}
                    value={profileFormData.department_code || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, department_code: e.target.value })}
                    className="wd-input"
                  >
                    {departments.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_assigned_role', 'Chức Danh Phân Quyền')}</Form.Label>
                  <Form.Select
                    aria-label={t('admin.field_assigned_role', 'Chức Danh Phân Quyền')}
                    value={profileFormData.role || 'STAFF'}
                    onChange={(e) => setProfileFormData({ ...profileFormData, role: e.target.value })}
                    className="wd-input"
                  >
                    <option value="SUPER_ADMIN">{t('roles.super_admin', 'Ban Giám Đốc')}</option>
                    <option value="HR_MANAGER">{t('roles.hr_manager', 'Trưởng Phòng Nhân Sự')}</option>
                    <option value="DEPARTMENT_HEAD">{t('roles.dept_head', 'Trưởng Khoa')}</option>
                    <option value="DOCTOR">{t('roles.doctor', 'Bác Sĩ Điều Trị')}</option>
                    <option value="NURSE">{t('roles.nurse', 'Điều Dưỡng Viên')}</option>
                    <option value="TECHNICIAN">{t('roles.technician', 'Kỹ Thuật Viên')}</option>
                    <option value="STAFF">{t('roles.staff', 'Nhân Viên Hành Chính')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_specialty', 'Chuyên Khoa / Bổ Nhiệm')}</Form.Label>
                  <Form.Control
                    type="text"
                    aria-label={t('admin.field_specialty', 'Chuyên Khoa / Bổ Nhiệm')}
                    value={profileFormData.specialty || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, specialty: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_staff_status', 'Trạng Thái Nhân Sự')}</Form.Label>
                  <Form.Select
                    aria-label={t('admin.field_staff_status', 'Trạng Thái Nhân Sự')}
                    value={profileFormData.status || 'ACTIVE'}
                    onChange={(e) => setProfileFormData({ ...profileFormData, status: e.target.value })}
                    className="wd-input"
                  >
                    <option value="ACTIVE">{t('common.active', 'Đang làm việc')}</option>
                    <option value="INACTIVE">{t('common.inactive', 'Đã nghỉ việc')}</option>
                    <option value="SUSPENDED">{t('admin.status_suspended', 'Tạm đình chỉ')}</option>
                    <option value="ON_LEAVE">{t('admin.status_on_leave', 'Nghỉ dài hạn')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <h6 className="fw-bold text-dark border-bottom pb-1 mb-3">{t('admin.sec_identity_contact', '2. Thông Tin Định Danh & Liên Hệ')}</h6>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_last_name', 'Họ và Tên Đệm')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={profileFormData.last_name || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, last_name: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_first_name', 'Tên Gọi')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={profileFormData.first_name || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, first_name: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_official_email', 'Email Công Vụ')}</Form.Label>
                  <Form.Control
                    type="email"
                    value={profileFormData.email || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_phone', 'Số Điện Thoại')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={profileFormData.phone || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_id_card', 'Số CCCD / Hộ Chiếu')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={profileFormData.national_id || ''}
                    onChange={(e) => setProfileFormData({ ...profileFormData, national_id: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_nationality', 'Quốc Tịch')}</Form.Label>
                  <Form.Control
                    type="text"
                    value={profileFormData.nationality || 'Vietnam'}
                    onChange={(e) => setProfileFormData({ ...profileFormData, nationality: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditProfileModal(false)}>
              {t('admin.btn_cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="primary" disabled={adminUpdateEmployeeMutation.isPending}>
              {adminUpdateEmployeeMutation.isPending ? t('admin.btn_saving', 'Đang lưu...') : t('admin.btn_save_profile', 'Lưu Thay Đổi Hồ Sơ')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ONBOARD WIZARD */}
      {/* ========================================================================= */}
      <Modal show={showOnboardModal} onHide={() => setShowOnboardModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Users size={18} className="text-primary" />
            {t('admin.modal_onboard_title', 'Tiếp Nhận Cán Bộ Y Tế & Khởi Tạo Tài Khoản IAM')}
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = {
              employee_code: (form.elements.namedItem('employee_code') as HTMLInputElement).value,
              last_name: (form.elements.namedItem('last_name') as HTMLInputElement).value,
              first_name: (form.elements.namedItem('first_name') as HTMLInputElement).value,
              email: (form.elements.namedItem('email') as HTMLInputElement).value,
              phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
              department_code: (form.elements.namedItem('department_code') as HTMLSelectElement).value,
              role: (form.elements.namedItem('role') as HTMLSelectElement).value,
              specialty: (form.elements.namedItem('specialty') as HTMLInputElement).value,
              username: (form.elements.namedItem('username') as HTMLInputElement).value,
              password: (form.elements.namedItem('password') as HTMLInputElement).value || 'bv123456',
              base_hourly_rate: Number((form.elements.namedItem('base_hourly_rate') as HTMLInputElement).value) || 120000,
              tax_tier: (form.elements.namedItem('tax_tier') as HTMLSelectElement).value,
              annual_leave_days: Number((form.elements.namedItem('annual_leave_days') as HTMLInputElement).value) || 12,
              medical_license: {
                license_number: (form.elements.namedItem('license_number') as HTMLInputElement).value,
                license_type: 'Medical Practicing Certificate',
                issuing_authority: 'Department of Health'
              }
            };
            onboardMutation.mutate(data);
          }}
        >
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <h6 className="fw-bold text-dark border-bottom pb-1 mb-3">{t('admin.sec_staff_info', '1. Thông Tin Cán Bộ')}</h6>
            <Row className="g-3 mb-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_emp_code_req', 'Mã Cán Bộ *')}</Form.Label>
                  <Form.Control
                    name="employee_code"
                    required
                    defaultValue={`EMP-DOC-${String(accounts.length + 1).padStart(3, '0')}`}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_last_name_req', 'Họ và Tên Đệm *')}</Form.Label>
                  <Form.Control name="last_name" required placeholder="Nguyen Van" className="wd-input" />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_first_name_req', 'Tên Gọi *')}</Form.Label>
                  <Form.Control name="first_name" required placeholder="An" className="wd-input" />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_email_req', 'Email Công Vụ *')}</Form.Label>
                  <Form.Control name="email" type="email" required placeholder="bacsi@hospital.vn" className="wd-input" />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_phone', 'Số Điện Thoại')}</Form.Label>
                  <Form.Control name="phone" placeholder="0901234..." className="wd-input" />
                </Form.Group>
              </Col>

              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_dept', 'Khoa / Phòng Chuyên Môn')} *</Form.Label>
                  <Form.Select name="department_code" aria-label={t('admin.field_dept', 'Khoa / Phòng Chuyên Môn')} className="wd-input">
                    {departments.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_role_req', 'Chức Vụ *')}</Form.Label>
                  <Form.Select name="role" aria-label={t('admin.field_role_req', 'Chức Vụ')} defaultValue="DOCTOR" className="wd-input">
                    <option value="DOCTOR">{t('roles.doctor', 'Bác Sĩ Điều Trị')}</option>
                    <option value="NURSE">{t('roles.nurse', 'Điều Dưỡng Viên')}</option>
                    <option value="TECHNICIAN">{t('roles.technician', 'Kỹ Thuật Viên')}</option>
                    <option value="DEPARTMENT_HEAD">{t('roles.dept_head', 'Trưởng Khoa')}</option>
                    <option value="HR_MANAGER">{t('roles.hr_manager', 'Quản Lý Nhân Sự')}</option>
                    <option value="STAFF">{t('roles.staff', 'Nhân Viên Hành Chính')}</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_specialty_req', 'Chuyên Khoa / Bằng Cấp Chuyên Môn')}</Form.Label>
                  <Form.Control name="specialty" aria-label={t('admin.field_specialty_req', 'Chuyên Khoa / Bằng Cấp Chuyên Môn')} placeholder={t('admin.placeholder_specialty', 'VD: Bác sĩ Đa khoa, CKI Hồi sức cấp cứu...')} className="wd-input" />
                </Form.Group>
              </Col>
            </Row>

            <h6 className="fw-bold text-dark border-bottom pb-1 mb-3">{t('admin.sec_iam_account', '2. Tài Khoản IAM Đăng Nhập')}</h6>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.col_username', 'Tên Đăng Nhập')}</Form.Label>
                  <Form.Control name="username" aria-label={t('admin.col_username', 'Tên Đăng Nhập')} placeholder={t('admin.placeholder_username', 'Để trống tự tạo theo mã NV')} className="wd-input font-monospace" />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.placeholder_initial_pwd', 'Mật Khẩu Khởi Tạo')}</Form.Label>
                  <Form.Control
                    name="password"
                    aria-label={t('admin.placeholder_initial_pwd', 'Mật Khẩu Khởi Tạo')}
                    defaultValue="bv123456"
                    className="wd-input"
                    autoComplete="new-password"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                  />
                </Form.Group>
              </Col>
            </Row>

            <h6 className="fw-bold text-dark border-bottom pb-1 mb-3">{t('admin.sec_payroll_license', '3. Chế Độ Lương & Cấp Phép')}</h6>
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_base_hourly', 'Lương Cơ Bản / Giờ')}</Form.Label>
                  <Form.Control name="base_hourly_rate" aria-label={t('admin.field_base_hourly', 'Lương Cơ Bản / Giờ')} type="number" defaultValue="120000" step="5000" className="wd-input" />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_tax_tier', 'Bậc Thuế / Chế Độ')}</Form.Label>
                  <Form.Select name="tax_tier" aria-label={t('admin.field_tax_tier', 'Bậc Thuế / Chế Độ')} defaultValue="Tier 1" className="wd-input">
                    <option value="Tier 1 - Staff">Tier 1 - Staff</option>
                    <option value="Tier 2 - Doctor">Tier 2 - Doctor</option>
                    <option value="Tier 3 - Head of Dept">Tier 3 - Head of Dept</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_annual_leave', 'Phép Năm Khởi Tạo')}</Form.Label>
                  <Form.Control name="annual_leave_days" type="number" defaultValue="12" className="wd-input" />
                </Form.Group>
              </Col>

              <Col xs={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('personal.license_number', 'Số Hiệu Chứng Chỉ')}</Form.Label>
                  <Form.Control name="license_number" placeholder="009876/HN-CCHN" className="wd-input font-monospace" />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowOnboardModal(false)}>
              {t('admin.btn_cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="primary" disabled={onboardMutation.isPending}>
              {onboardMutation.isPending ? t('admin.btn_onboarding', 'Đang tiếp nhận...') : t('admin.btn_finish_onboarding', 'Hoàn Tất Tiếp Nhận')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD */}
      {/* ========================================================================= */}
      <Modal show={showResetPasswordModal} onHide={() => { setShowResetPasswordModal(false); setShowResetPassword(false); }} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Key size={18} className="text-warning" />
            {t('admin.modal_reset_pwd_title', 'Đặt Lại Mật Khẩu Tài Khoản')}
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedAccountForPassword) {
              resetPasswordMutation.mutate({
                id: selectedAccountForPassword.account_id,
                new_password: newPasswordValue
              });
            }
          }}
        >
          <Modal.Body>
            <p className="small text-muted mb-3">
              {t('admin.modal_reset_pwd_desc', 'Đặt lại mật khẩu truy cập hệ thống cho cán bộ')}{' '}
              <strong>{selectedAccountForPassword?.staff_name}</strong> — {t('admin.account_label', 'Tài khoản')}:{' '}
              <code>{selectedAccountForPassword?.username}</code>.
            </p>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_new_pwd', 'Mật Khẩu Mới')}</Form.Label>
              <div className="position-relative d-flex align-items-center">
                <Form.Control
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder={t('admin.placeholder_new_pwd', 'Nhập mật khẩu mới...')}
                  className="wd-input pe-5"
                  autoComplete="new-password"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                <button
                  type="button"
                  className="btn btn-link position-absolute end-0 top-50 translate-middle-y text-muted p-2 me-1 d-flex align-items-center justify-content-center border-0 shadow-none"
                  style={{ textDecoration: 'none' }}
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  title={showResetPassword ? t('common.hide_password', 'Ẩn mật khẩu') : t('common.show_password', 'Hiện mật khẩu')}
                  aria-label={showResetPassword ? t('common.hide_password', 'Ẩn mật khẩu') : t('common.show_password', 'Hiện mật khẩu')}
                >
                  {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="form-text small text-muted mt-1">
                {t('admin.pwd_ime_hint', 'Gợi ý: Nhấn biểu tượng mắt để hiện mật khẩu, giúp gõ dấu tiếng Việt (Unikey) không bị lỗi hoặc nhầm ký tự.')}
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => { setShowResetPasswordModal(false); setShowResetPassword(false); }}>
              {t('admin.btn_cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="warning" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? t('admin.btn_updating', 'Đang cập nhật...') : t('admin.btn_confirm_reset_pwd', 'Xác Nhận Đặt Lại Mật Khẩu')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT / ADD DEPARTMENT */}
      {/* ========================================================================= */}
      <Modal show={showDeptModal} onHide={() => setShowDeptModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Building2 size={18} className="text-primary" />
            {editingDept?.id ? t('admin.modal_edit_dept_title', 'Chỉnh Sửa Khoa Phòng') : t('admin.modal_add_dept_title', 'Thêm Khoa Phòng Mới')}
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            if (editingDept) {
              saveDepartmentMutation.mutate(editingDept);
            }
          }}
        >
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_dept_code_req', 'Mã Khoa Phòng *')}</Form.Label>
              <Form.Control
                type="text"
                required
                disabled={Boolean(editingDept?.id)}
                value={editingDept?.department_code || ''}
                onChange={(e) => setEditingDept({ ...editingDept, department_code: e.target.value })}
                className="wd-input font-monospace"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_dept_name_req', 'Tên Khoa Phòng *')}</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder={t('admin.placeholder_dept_name', 'VD: Khoa Khám Bệnh...')}
                value={editingDept?.name || ''}
                onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                className="wd-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_dept_location', 'Vị Trí / Khu Nhà')}</Form.Label>
              <Form.Control
                type="text"
                placeholder={t('admin.placeholder_dept_location', 'VD: Tầng 2 - Khu Nhà B...')}
                value={editingDept?.location || ''}
                onChange={(e) => setEditingDept({ ...editingDept, location: e.target.value })}
                className="wd-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_dept_functions', 'Chức Năng & Nhiệm Vụ')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editingDept?.description || ''}
                onChange={(e) => setEditingDept({ ...editingDept, description: e.target.value })}
                className="wd-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_dept_status', 'Trạng Thái Hoạt Động')}</Form.Label>
              <Form.Select
                aria-label={t('admin.field_dept_status', 'Trạng Thái Hoạt Động')}
                value={editingDept?.status || 'ACTIVE'}
                onChange={(e) => setEditingDept({ ...editingDept, status: e.target.value as any })}
                className="wd-input"
              >
                <option value="ACTIVE">{t('common.active', 'Đang hoạt động')}</option>
                <option value="INACTIVE">{t('common.inactive', 'Tạm dừng')}</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeptModal(false)}>
              {t('admin.btn_cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="primary" disabled={saveDepartmentMutation.isPending}>
              {saveDepartmentMutation.isPending ? t('admin.btn_saving', 'Đang lưu...') : t('admin.btn_save_dept', 'Lưu Khoa Phòng')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 8: ASSIGN RBAC ROLE AND PERMISSIONS */}
      {/* ========================================================================= */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)} centered size="lg">
        <Modal.Header closeButton className="border-bottom pb-3">
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2 mb-0">
            <ShieldCheck className="text-primary" size={20} />
            <span>{t('admin.modal_role_title', 'Phân Quyền Vai Trò Tài Khoản')}</span>
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRequestRoleChange}>
          <Modal.Body className="p-4">
            {selectedAccountForRole && (
              <div className="p-3 mb-4 rounded-3 border bg-light">
                <Row className="g-3 align-items-center">
                  <Col xs={12} sm={6}>
                    <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                      {t('admin.account_and_staff', 'Tài khoản & Cán bộ')}
                    </div>
                    <div className="fw-bold text-dark fs-6 mt-1">
                      {selectedAccountForRole.staff_name}
                    </div>
                    <div className="text-muted small font-monospace">
                      @{selectedAccountForRole.username} • {selectedAccountForRole.employee_code}
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div className="text-muted small text-uppercase fw-semibold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                      {t('admin.dept_and_current_role', 'Khoa phòng & Vai trò hiện tại')}
                    </div>
                    <div className="fw-medium text-dark mt-1">
                      {selectedAccountForRole.department_name || selectedAccountForRole.department_code}
                    </div>
                    <div className="mt-1">
                      <Badge bg="secondary" className="px-2 py-1">
                        {t('admin.current_role_label', 'Hiện tại')}: {selectedAccountForRole.role_code || selectedAccountForRole.role}
                      </Badge>
                    </div>
                  </Col>
                </Row>
              </div>
            )}

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold text-dark small d-flex justify-content-between align-items-center">
                <span>{t('admin.field_select_new_role', 'Chọn Vai Trò Mới *')}</span>
                <span className="text-muted fw-normal small">{t('admin.rbac_standard_note', 'Hệ thống áp dụng chuẩn RBAC')}</span>
              </Form.Label>
              <Form.Select
                aria-label={t('admin.field_select_new_role', 'Chọn Vai Trò Mới')}
                value={newRoleCode}
                onChange={(e) => setNewRoleCode(e.target.value)}
                className="wd-input fs-6 py-2"
                required
              >
                {systemRoles.map((r: any) => (
                  <option key={r.role_code} value={r.role_code}>
                    {r.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {(() => {
              const activeRoleObj = systemRoles.find((r: any) => r.role_code === newRoleCode);
              if (!activeRoleObj) return null;

              return (
                <div className="border rounded-3 p-3 bg-white mb-3 shadow-sm">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <ShieldCheck size={18} className="text-success" />
                      <span className="fw-bold text-dark">{activeRoleObj.name}</span>
                      <Badge bg="primary" className="font-monospace">
                        {activeRoleObj.role_code}
                      </Badge>
                    </div>
                    <Badge bg="light" text="dark" className="border">
                      {activeRoleObj.permissions?.length || 0} {t('admin.assigned_perms_count', 'quyền hạn gán sẵn')}
                    </Badge>
                  </div>
                  <p className="text-muted small mb-3">
                    {activeRoleObj.description}
                  </p>

                  <div className="text-muted small fw-semibold text-uppercase mb-2" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                    {t('admin.perms_by_module', 'Danh sách đặc quyền theo Module:')}
                  </div>

                  <div
                    className="p-2.5 rounded-2 bg-light border"
                    style={{ maxHeight: '200px', overflowY: 'auto' }}
                  >
                    {activeRoleObj.permissions && activeRoleObj.permissions.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1.5">
                        {activeRoleObj.permissions.map((p: any) => (
                          <span
                            key={p.code}
                            className="badge bg-white text-dark border px-2 py-1 text-start fw-normal"
                            title={p.description}
                            style={{ fontSize: '11px' }}
                          >
                            <span className="fw-semibold text-primary me-1">[{p.module}]</span>
                            {p.code} — <span className="text-secondary">{p.description}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted small fst-italic p-2">{t('admin.no_special_perms', 'Không có quyền hạn đặc biệt')}</div>
                    )}
                  </div>
                </div>
              );
            })()}

            <Alert variant="info" className="py-2.5 px-3 mb-0 small border-0 bg-info bg-opacity-10 text-dark d-flex gap-2 align-items-center">
              <CheckCircle2 size={16} className="text-info flex-shrink-0" />
              <div>
                {t('admin.rbac_persisted_note', 'Phân quyền được lưu trực tiếp trên bảng Accounts.role_code và liên kết tới Roles/Permissions theo chuẩn kiến trúc RBAC. Thay đổi có hiệu lực ngay khi cán bộ đăng nhập hoặc làm mới phiên.')}
              </div>
            </Alert>
          </Modal.Body>
          <Modal.Footer className="border-top pt-3">
            <Button variant="secondary" onClick={() => setShowRoleModal(false)}>
              {t('admin.btn_cancel', 'Hủy')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={updateRoleMutation.isPending}
              className="d-flex align-items-center gap-1.5"
            >
              {updateRoleMutation.isPending ? (
                <>
                  <RefreshCw size={14} className="spin-slow" />
                  <span>{t('admin.btn_saving_role', 'Đang lưu phân quyền...')}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>{t('admin.btn_update_role', 'Cập Nhật Quyền Hạn')}</span>
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* GLOBAL CONFIRMATION MODAL */}
      <ConfirmModal
        show={confirmDialog.show}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        iconType={confirmDialog.iconType}
        isLoading={
          lockAccountMutation.isPending ||
          updateRoleMutation.isPending ||
          broadcastMutation.isPending
        }
        details={confirmDialog.details}
      />
    </Container>
  );
};

export default SystemManagement;
