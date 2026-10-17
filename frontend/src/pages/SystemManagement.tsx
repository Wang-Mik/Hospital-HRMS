import React, { useState } from 'react';
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
  Shield,
  Users,
  Building2,
  CreditCard,
  CalendarCheck,
  Clock,
  Award,
  Bell,
  Plus,
  Edit2,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Search,
  UserCheck,
  FileText,
  DollarSign
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminAccount, AdminPayRate } from '../api/adminApi';
import { departmentApi, Department } from '../api/departmentApi';
import { leaveApi } from '../api/leaveApi';
import { payrollApi } from '../api/payrollApi';
import { shiftApi } from '../api/shiftApi';
import { handoverApi } from '../api/handoverApi';
import { employeeApi } from '../api/employeeApi';
import { useTranslation } from '../i18n/useTranslation';

export const SystemManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'staff_iam' | 'departments' | 'compensation' | 'leaves' | 'shifts_handover' | 'licensing' | 'broadcast'
  >('staff_iam');

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

  const { data: payRates = [], refetch: refetchPayRates } = useQuery({
    queryKey: ['admin-pay-rates'],
    queryFn: adminApi.getAllPayRates
  });

  const { data: payrollRuns = [], refetch: refetchPayrollRuns } = useQuery({
    queryKey: ['payroll-runs'],
    queryFn: () => payrollApi.getRuns()
  });

  const { data: leaveRequests = [], refetch: refetchLeaves } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => leaveApi.getAllRequests()
  });

  const { data: shifts = [], refetch: refetchShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.getAll()
  });

  const { data: handovers = [], refetch: refetchHandovers } = useQuery({
    queryKey: ['handovers'],
    queryFn: () => handoverApi.getAll()
  });

  const { data: licenses = [], refetch: refetchLicenses } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => employeeApi.getAllLicenses()
  });

  const { data: systemRoles = [] } = useQuery({
    queryKey: ['system-roles'],
    queryFn: adminApi.getAllRoles
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [leaveFilter, setLeaveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedEmpForEdit, setSelectedEmpForEdit] = useState<any>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedAccountForPassword, setSelectedAccountForPassword] = useState<AdminAccount | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // IAM Role Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedAccountForRole, setSelectedAccountForRole] = useState<AdminAccount | null>(null);
  const [newRoleCode, setNewRoleCode] = useState('STAFF');

  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);

  const [showPayRateModal, setShowPayRateModal] = useState(false);
  const [selectedPayRate, setSelectedPayRate] = useState<AdminPayRate | null>(null);
  const [newHourlyRate, setNewHourlyRate] = useState('');
  const [newTaxTier, setNewTaxTier] = useState('');

  const [showNewRunModal, setShowNewRunModal] = useState(false);
  const [newRunStartDate, setNewRunStartDate] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [newRunEndDate, setNewRunEndDate] = useState(new Date().toISOString().slice(0, 7) + '-30');

  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [newShiftData, setNewShiftData] = useState({
    staff_id: '',
    department_code: 'DEP-KHB',
    start_time: new Date().toISOString().slice(0, 10) + 'T07:00',
    end_time: new Date().toISOString().slice(0, 10) + 'T15:00',
    shift_type: 'MORNING'
  });

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

  const updateLeaveStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) =>
      adminApi.updateLeaveRequestStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      showToast(vars.status === 'APPROVED' ? t('admin.toast_leave_status_approved', 'Đã Phê Duyệt') : t('admin.toast_leave_status_rejected', 'Từ Chối'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_leave_failed', 'Lỗi duyệt phép')}: ${err.message || ''}`, 'danger');
    }
  });

  const updateLicenseStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: any }) =>
      adminApi.updateLicenseStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      showToast(t('admin.cchn_title', 'Giám Sát Chứng Chỉ Hành Nghề Y Tế'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_update_failed', 'Lỗi')}: ${err.message || ''}`, 'danger');
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

  const updatePayRateMutation = useMutation({
    mutationFn: ({ staffId, base_hourly_rate, tax_tier }: any) =>
      adminApi.updatePayRate(staffId, { base_hourly_rate, tax_tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pay-rates'] });
      setShowPayRateModal(false);
      showToast(t('admin.btn_update_rate', 'Cập Nhật Lương'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_rate_failed', 'Lỗi cập nhật lương')}: ${err.message || ''}`, 'danger');
    }
  });

  const generateRunMutation = useMutation({
    mutationFn: ({ start_date, end_date }: any) =>
      adminApi.generatePayrollRun(start_date, end_date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setShowNewRunModal(false);
      showToast(t('admin.modal_create_run_title', 'Khởi Tạo Kỳ Lương Mới Bệnh Viện'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_run_failed', 'Lỗi khởi tạo kỳ lương')}: ${err.message || ''}`, 'danger');
    }
  });

  const updateRunStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updatePayrollRunStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      showToast(`${t('admin.toast_run_status_changed', 'Trạng thái kỳ lương đã chuyển sang')} ${vars.status}`);
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
      queryClient.invalidateQueries({ queryKey: ['admin-pay-rates'] });
      setShowOnboardModal(false);
      showToast(`${t('admin.toast_onboard_success', 'Tiếp nhận thành công nhân sự')} ${res.staff_name} (${res.employee_code}) - ${t('admin.toast_temp_pwd', 'Mật khẩu khởi tạo')}: ${res.temporary_password}`);
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_onboard_failed', 'Lỗi tiếp nhận')}: ${err.message || ''}`, 'danger');
    }
  });

  const createShiftMutation = useMutation({
    mutationFn: (data: any) => shiftApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setShowAddShiftModal(false);
      showToast(t('admin.btn_confirm_shift', 'Xác Nhận Phân Ca'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_shift_failed', 'Lỗi phân ca')}: ${err.message || ''}`, 'danger');
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

  const handleOpenPayRateEdit = (pr: AdminPayRate) => {
    setSelectedPayRate(pr);
    setNewHourlyRate(String(pr.base_hourly_rate));
    setNewTaxTier(pr.tax_tier || 'Tier 1');
    setShowPayRateModal(true);
  };

  const handleRefreshAll = () => {
    refetchOverview();
    refetchAccounts();
    refetchDepartments();
    refetchPayRates();
    refetchPayrollRuns();
    refetchLeaves();
    refetchShifts();
    refetchHandovers();
    refetchLicenses();
    showToast('Dữ liệu toàn hệ thống đã được đồng bộ mới nhất từ máy chủ!');
  };

  const kpis = overviewData?.kpis || {
    total_employees: accounts.length || 10,
    total_departments: departments.length || 8,
    pending_leaves: leaveRequests.filter((l: any) => l.status === 'PENDING').length,
    expiring_licenses_30d: 0,
    expired_licenses: 0,
    total_disbursed_vnd: 367200000,
    upcoming_shifts: shifts.length,
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

  // Filter leaves
  const filteredLeaves = leaveRequests.filter((l: any) => {
    if (leaveFilter === 'ALL') return true;
    return l.status === leaveFilter;
  });

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
              {t('admin.page_title', 'Cổng Quản Trị Hệ Thống & Nhân Sự Bệnh Viện')}
            </h1>
            <p className="text-muted small mb-0">
              {t('admin.page_subtitle', 'Trung tâm chỉ huy HR & IAM: Phê duyệt phép, điều hành ca trực, định mức lương VND, giám sát CCHN và phân quyền tài khoản')}
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
            <UserCheck size={16} />
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

      {/* Command Center Ribbon - 5 Live KPIs */}
      <Row className="g-3 mb-4">
        {/* KPI 1: Staff */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className="wd-card p-3.5 h-100 border-start border-4 border-primary">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('admin.kpi_total_staff', 'Tổng Cán Bộ Y Tế')}</span>
              <div className="p-1.5 rounded-2 bg-primary bg-opacity-10 text-primary">
                <Users size={16} />
              </div>
            </div>
            <div className="h3 fw-bold text-dark my-1 font-mono">{kpis.total_employees}</div>
            <div className="d-flex align-items-center gap-1.5 small text-muted mt-2">
              <span className="badge bg-success bg-opacity-10 text-success fw-normal">{t('admin.kpi_active_100', '100% Đang hoạt động')}</span>
            </div>
          </div>
        </Col>

        {/* KPI 2: Departments */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className="wd-card p-3.5 h-100 border-start border-4 border-info">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('admin.kpi_departments', 'Khoa / Phòng Chức Năng')}</span>
              <div className="p-1.5 rounded-2 bg-info bg-opacity-10 text-info">
                <Building2 size={16} />
              </div>
            </div>
            <div className="h3 fw-bold text-dark my-1 font-mono">{kpis.total_departments}</div>
            <div className="small text-muted mt-2">{t('admin.kpi_org_complete', 'Cơ cấu tổ chức hoàn chỉnh')}</div>
          </div>
        </Col>

        {/* KPI 3: Pending Leaves */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className={`wd-card p-3.5 h-100 border-start border-4 ${kpis.pending_leaves > 0 ? 'border-warning' : 'border-secondary'}`}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('admin.kpi_pending_leaves', 'Phép Chờ HR Duyệt')}</span>
              <div className={`p-1.5 rounded-2 ${kpis.pending_leaves > 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                <CalendarCheck size={16} />
              </div>
            </div>
            <div className="h3 fw-bold text-dark my-1 font-mono">{kpis.pending_leaves}</div>
            <div className="small mt-2">
              {kpis.pending_leaves > 0 ? (
                <span className="badge bg-warning bg-opacity-15 text-dark fw-normal">{t('admin.kpi_action_needed', 'Cần duyệt ngay')}</span>
              ) : (
                <span className="text-muted">{t('admin.kpi_no_backlog', 'Không tồn đọng')}</span>
              )}
            </div>
          </div>
        </Col>

        {/* KPI 4: Licenses Expiry */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className={`wd-card p-3.5 h-100 border-start border-4 ${kpis.expiring_licenses_30d > 0 ? 'border-danger' : 'border-success'}`}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('admin.kpi_cchn_expiring', 'CCHN Sắp Hết Hạn')}</span>
              <div className={`p-1.5 rounded-2 ${kpis.expiring_licenses_30d > 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-success bg-opacity-10 text-success'}`}>
                <Award size={16} />
              </div>
            </div>
            <div className="h3 fw-bold text-dark my-1 font-mono">{kpis.expiring_licenses_30d}</div>
            <div className="small mt-2">
              {kpis.expiring_licenses_30d > 0 ? (
                <span className="badge bg-danger bg-opacity-10 text-danger fw-normal">{t('admin.kpi_urgent_renewal', 'Yêu cầu gia hạn khẩn')}</span>
              ) : (
                <span className="text-success fw-medium">{t('admin.kpi_compliant_100', 'Đạt chuẩn 100%')}</span>
              )}
            </div>
          </div>
        </Col>

        {/* KPI 5: Total Payroll Disbursed */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className="wd-card p-3.5 h-100 border-start border-4 border-success">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('admin.kpi_total_disbursed', 'Quỹ Lương Đã Chi Trả')}</span>
              <div className="p-1.5 rounded-2 bg-success bg-opacity-10 text-success">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="h4 fw-bold text-success my-1 font-mono" style={{ fontSize: '18px' }}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(kpis.total_disbursed_vnd))}
            </div>
            <div className="small text-muted mt-2">{t('admin.kpi_net_cumulative', 'Tổng tích lũy thực nhận')}</div>
          </div>
        </Col>
      </Row>

      {/* Workday Operational Tabs */}
      <div className="wd-tabs mb-4">
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'staff_iam' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff_iam')}
        >
          <Users size={15} className="me-2" />
          {t('admin.tab_staff_iam', 'Cán Bộ & Tài Khoản IAM')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{accounts.length}</span>
        </button>

        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'departments' ? 'active' : ''}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building2 size={15} className="me-2" />
          {t('admin.tab_departments', 'Khoa Phòng & Cơ Cấu')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{departments.length}</span>
        </button>

        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'compensation' ? 'active' : ''}`}
          onClick={() => setActiveTab('compensation')}
        >
          <DollarSign size={15} className="me-2" />
          {t('admin.tab_pay_rates', 'Định Mức Lương & Kỳ Lương')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{payRates.length}</span>
        </button>

        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          <CalendarCheck size={15} className="me-2" />
          {t('admin.tab_leave_approvals', 'Phê Duyệt Nghỉ Phép')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{leaveRequests.length}</span>
          {kpis.pending_leaves > 0 && (
            <Badge bg="warning" text="dark" pill className="ms-2">
              {kpis.pending_leaves}
            </Badge>
          )}
        </button>

        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'shifts_handover' ? 'active' : ''}`}
          onClick={() => setActiveTab('shifts_handover')}
        >
          <Clock size={15} className="me-2" />
          {t('admin.tab_shifts_handovers', 'Lịch Trực & Bàn Giao Ca')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{shifts.length}</span>
        </button>

        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'licensing' ? 'active' : ''}`}
          onClick={() => setActiveTab('licensing')}
        >
          <Award size={15} className="me-2" />
          {t('admin.tab_cchn_compliance', 'Tuân Thủ CCHN')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{licenses.length}</span>
        </button>

        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
          onClick={() => setActiveTab('broadcast')}
        >
          <Bell size={15} className="me-2" />
          {t('admin.tab_broadcast', 'Phát Lệnh Thông Báo')}
        </button>
      </div>

      {/* TAB 1: STAFF & IAM */}
      {activeTab === 'staff_iam' && (
        <div className="wd-card mb-4">
          <div className="p-3.5 pb-3 border-bottom d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '600px' }}>
              <div className="position-relative flex-grow-1">
                <Search size={15} className="position-absolute text-muted" style={{ left: '12px', top: '11px' }} />
                <input
                  type="text"
                  placeholder={t('admin.search_staff_placeholder', 'Tìm kiếm họ tên cán bộ, mã NV, username hoặc email...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="wd-input w-100 ps-5"
                />
              </div>

              <select
                className="wd-select"
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
                      <div className="d-flex align-items-center justify-content-end gap-2">
                        {/* Assign IAM Role */}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-info py-1.5 px-2.5 rounded-2 d-inline-flex align-items-center gap-1.5"
                          onClick={() => {
                            setSelectedAccountForRole(acc);
                            setNewRoleCode(acc.role_code || acc.role || 'STAFF');
                            setShowRoleModal(true);
                          }}
                          title={t('admin.assign_role', 'Phân Quyền')}
                        >
                          <Shield size={13} />
                          <span>{t('admin.assign_role', 'Phân Quyền')}</span>
                        </button>

                        {/* Master Profile Edit */}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary py-1.5 px-2.5 rounded-2 d-inline-flex align-items-center gap-1.5"
                          onClick={() => handleOpenMasterEdit(acc)}
                          title={t('admin.btn_edit_profile_tooltip', 'Sửa Toàn Bộ Hồ Sơ Nhân Viên')}
                        >
                          <Edit2 size={13} />
                          <span>{t('common.edit', 'Sửa')}</span>
                        </button>

                        {/* Lock / Unlock */}
                        <button
                          type="button"
                          className={`btn btn-sm ${acc.is_locked ? 'btn-outline-success' : 'btn-outline-warning'} py-1.5 px-2.5 rounded-2 d-inline-flex align-items-center`}
                          onClick={() =>
                            lockAccountMutation.mutate({
                              id: acc.account_id,
                              is_locked: !acc.is_locked
                            })
                          }
                          title={acc.is_locked ? t('admin.btn_unlock_tooltip', 'Mở khóa tài khoản') : t('admin.btn_lock_tooltip', 'Khóa tài khoản')}
                        >
                          {acc.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                        </button>

                        {/* Reset Password */}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary py-1.5 px-2.5 rounded-2 d-inline-flex align-items-center"
                          onClick={() => {
                            setSelectedAccountForPassword(acc);
                            setShowResetPasswordModal(true);
                          }}
                          title={t('admin.btn_reset_pwd_tooltip', 'Đặt lại mật khẩu')}
                        >
                          <Key size={14} />
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
                      <div>📍 {dept.location || t('admin.dept_default_location', 'Khu nhà khám chữa bệnh')}</div>
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

      {/* TAB 3: COMPENSATION & PAYROLL */}
      {activeTab === 'compensation' && (
        <div>
          {/* Top Actions */}
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
            <div>
              <h2 className="h5 fw-bold mb-1">{t('admin.payrates_title', 'Định Mức Lương & Bảng Lương Bệnh Viện')}</h2>
              <p className="text-muted small mb-0">
                {t('admin.payrates_subtitle', 'Toàn bộ định mức lương được thiết lập chuẩn tiền tệ Việt Nam Đồng (VND), tính theo giờ và tháng tiêu chuẩn (176h)')}
              </p>
            </div>

            <button
              type="button"
              className="wd-pill-btn-primary d-flex align-items-center gap-1.5"
              onClick={() => setShowNewRunModal(true)}
            >
              <Plus size={16} /> {t('admin.btn_create_run', 'Tạo Kỳ Lương Mới (Chạy Bảng Lương)')}
            </button>
          </div>

          {/* Section A: Pay Rates table */}
          <div className="wd-card p-3 mb-4">
            <h3 className="h6 fw-bold text-dark mb-3">{t('admin.table_rates_title', 'Bảng Định Mức Lương Theo Giờ / Chức Danh')}</h3>
            <div className="table-responsive">
              <table className="wd-table w-100">
                <thead>
                  <tr>
                    <th>{t('admin.col_medical_staff', 'Cán Bộ Y Tế')}</th>
                    <th>{t('admin.col_department', 'Khoa / Phòng')}</th>
                    <th>{t('admin.col_role', 'Chức Danh')}</th>
                    <th>{t('admin.col_base_hourly', 'Mức Lương Cơ Bản / Giờ')}</th>
                    <th>{t('admin.col_monthly_est', 'Ước Tính Tháng')}</th>
                    <th>{t('admin.col_tax_tier', 'Bậc Thuế / Chế Độ')}</th>
                    <th className="text-end">{t('common.actions', 'Hành Động')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payRates.map((pr) => {
                    const hourly = Number(pr.base_hourly_rate) || 0;
                    const monthly = hourly * 176;
                    return (
                      <tr key={pr.employee_code}>
                        <td>
                          <div className="fw-semibold text-dark">{pr.staff_name}</div>
                          <div className="text-muted small">{pr.employee_code}</div>
                        </td>
                        <td>{pr.department_name || pr.department_code}</td>
                        <td>
                          <Badge bg="secondary" className="fw-normal">
                            {pr.role}
                          </Badge>
                        </td>
                        <td>
                          <strong className="text-dark">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(hourly)} / {t('admin.per_hour', 'giờ')}
                          </strong>
                        </td>
                        <td>
                          <span className="text-success fw-semibold">
                            ~{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(monthly)} / {t('admin.per_month', 'tháng')}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">{pr.tax_tier}</span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary py-1 px-2.5"
                            onClick={() => handleOpenPayRateEdit(pr)}
                          >
                            <Edit2 size={13} className="me-1" /> {t('admin.btn_edit_rate', 'Sửa Lương')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Payroll Runs History */}
          <div className="wd-card p-3">
            <h3 className="h6 fw-bold text-dark mb-3">{t('admin.table_runs_title', 'Lịch Sử Kỳ Lương Bệnh Viện')}</h3>
            <div className="table-responsive">
              <table className="wd-table w-100">
                <thead>
                  <tr>
                    <th>{t('admin.col_run_id', 'Mã Kỳ Lương')}</th>
                    <th>{t('admin.col_date_range', 'Khoảng Thời Gian')}</th>
                    <th>{t('admin.col_staff_count', 'Số Cán Bộ')}</th>
                    <th>{t('admin.col_total_payout', 'Tổng Tiền Chi Trả')}</th>
                    <th>{t('common.status', 'Trạng Thái')}</th>
                    <th className="text-end">{t('admin.col_run_actions', 'Thao Tác Duyệt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map((run: any) => (
                    <tr key={run.id}>
                      <td className="font-monospace fw-medium text-dark">{run.id.slice(0, 8)}...</td>
                      <td>
                        {run.start_date?.slice(0, 10)} &rarr; {run.end_date?.slice(0, 10)}
                      </td>
                      <td>{run.employee_count ?? 10} {t('admin.people_unit', 'người')}</td>
                      <td>
                        <strong className="text-success">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(run.total_disbursed || 0))}
                        </strong>
                      </td>
                      <td>
                        <Badge
                          bg={
                            run.status === 'COMPLETED'
                              ? 'success'
                              : run.status === 'APPROVED'
                              ? 'primary'
                              : run.status === 'PROCESSING'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="fw-normal px-2 py-1"
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="text-end">
                        {run.status !== 'COMPLETED' && (
                          <div className="d-flex align-items-center justify-content-end gap-1.5">
                            {run.status === 'DRAFT' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-warning py-1 px-2"
                                onClick={() => updateRunStatusMutation.mutate({ id: run.id, status: 'PROCESSING' })}
                              >
                                {t('admin.btn_calculate', 'Tính Toán')}
                              </button>
                            )}
                            {run.status === 'PROCESSING' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-1 px-2"
                                onClick={() => updateRunStatusMutation.mutate({ id: run.id, status: 'APPROVED' })}
                              >
                                {t('admin.btn_approve_run', 'Phê Duyệt')}
                              </button>
                            )}
                            {run.status === 'APPROVED' && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success py-1 px-2"
                                onClick={() => updateRunStatusMutation.mutate({ id: run.id, status: 'COMPLETED' })}
                              >
                                {t('admin.btn_complete_payout', 'Hoàn Tất Chi Lương')}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LEAVE APPROVALS */}
      {activeTab === 'leaves' && (
        <div className="wd-card p-3 mb-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 fw-bold mb-1">{t('admin.leave_approvals_title', 'Xét Duyệt Đơn Nghỉ Phép & Hạn Mức Thường Niên')}</h2>
              <p className="text-muted small mb-0">
                {t('admin.leave_approvals_subtitle', '1-click phê duyệt hoặc từ chối đơn nghỉ phép. Hệ thống tự động trừ hạn mức trong cơ sở dữ liệu.')}
              </p>
            </div>

            <div className="d-flex align-items-center gap-1.5">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm ${leaveFilter === st ? 'btn-primary' : 'btn-outline-secondary'} py-1 px-2.5`}
                  onClick={() => setLeaveFilter(st)}
                >
                  {st === 'ALL' ? t('admin.filter_all', 'Tất Cả') : st === 'PENDING' ? t('admin.filter_pending', 'Chờ Duyệt') : st === 'APPROVED' ? t('admin.filter_approved', 'Đã Duyệt') : t('admin.filter_rejected', 'Từ Chối')}
                </button>
              ))}
            </div>
          </div>

          <div className="table-responsive">
            <table className="wd-table w-100">
              <thead>
                <tr>
                  <th>{t('admin.col_medical_staff', 'Cán Bộ Y Tế')}</th>
                  <th>{t('admin.col_department', 'Khoa Phòng')}</th>
                  <th>{t('admin.col_leave_type', 'Loại Phép')}</th>
                  <th>{t('admin.col_leave_time', 'Thời Gian Nghỉ')}</th>
                  <th>{t('admin.col_leave_days', 'Số Ngày')}</th>
                  <th>{t('admin.col_leave_reason', 'Lý Do')}</th>
                  <th>{t('common.status', 'Trạng Thái')}</th>
                  <th className="text-end">{t('admin.btn_approve', 'Phê Duyệt')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((lr: any) => (
                  <tr key={lr.id}>
                    <td>
                      <div className="fw-semibold text-dark">{lr.staff_name || lr.staff_id}</div>
                      <div className="text-muted small">{lr.staff_id}</div>
                    </td>
                    <td>{lr.department_name || lr.department_code || t('admin.col_department', 'Khoa Lâm Sàng')}</td>
                    <td>
                      <span className="badge bg-light text-dark border">{lr.leave_type}</span>
                    </td>
                    <td>
                      {lr.start_date?.slice(0, 10)}
                      {lr.end_date && lr.end_date !== lr.start_date && ` → ${lr.end_date?.slice(0, 10)}`}
                    </td>
                    <td>
                      <strong className="text-dark">
                        {lr.days_requested || (lr.day_part !== 'FULL' ? '0.5' : '1.0')} {t('admin.days_unit', 'ngày')}
                      </strong>
                      {lr.day_part === 'FIRST_HALF' && <span className="text-muted small d-block">{t('admin.morning_half', 'Buổi sáng')}</span>}
                      {lr.day_part === 'SECOND_HALF' && <span className="text-muted small d-block">{t('admin.afternoon_half', 'Buổi chiều')}</span>}
                    </td>
                    <td style={{ maxWidth: '200px' }} className="text-truncate" title={lr.reason}>
                      {lr.reason || t('admin.no_reason', 'Không có lý do')}
                    </td>
                    <td>
                      <Badge
                        bg={lr.status === 'APPROVED' ? 'success' : lr.status === 'PENDING' ? 'warning' : 'danger'}
                        text={lr.status === 'PENDING' ? 'dark' : 'white'}
                        className="fw-normal px-2 py-1"
                      >
                        {lr.status === 'APPROVED' ? t('admin.filter_approved', 'Đã Duyệt') : lr.status === 'PENDING' ? t('admin.filter_pending', 'Chờ Duyệt') : t('admin.filter_rejected', 'Từ Chối')}
                      </Badge>
                    </td>
                    <td className="text-end">
                      {lr.status === 'PENDING' ? (
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-sm btn-success py-1 px-2.5"
                            onClick={() => updateLeaveStatusMutation.mutate({ id: lr.id, status: 'APPROVED' })}
                          >
                            {t('admin.btn_approve', 'Duyệt')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2"
                            onClick={() => updateLeaveStatusMutation.mutate({ id: lr.id, status: 'REJECTED' })}
                          >
                            {t('admin.btn_reject', 'Từ Chối')}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted small">{t('admin.status_processed', 'Đã xử lý')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ROSTERING & SHIFT HANDOVER */}
      {activeTab === 'shifts_handover' && (
        <div>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h2 className="h5 fw-bold mb-1">{t('admin.shifts_handovers_title', 'Giám Sát Lịch Trực 24/7 & Nhật Ký Bàn Giao Ca')}</h2>
              <p className="text-muted small mb-0">
                {t('admin.shifts_handovers_subtitle', 'Điều phối ca cấp cứu, theo dõi ghi chú bàn giao lâm sàng và danh mục an toàn người bệnh')}
              </p>
            </div>

            <button
              type="button"
              className="wd-pill-btn-primary d-flex align-items-center gap-1.5"
              onClick={() => setShowAddShiftModal(true)}
            >
              <Plus size={16} /> {t('admin.btn_assign_urgent_shift', 'Phân Ca Trực Khẩn Cấp')}
            </button>
          </div>

          <Row className="g-4">
            {/* Shifts list */}
            <Col xs={12} lg={6}>
              <div className="wd-card p-3 h-100">
                <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                  <span>{t('admin.active_shifts_card', 'Ca Trực Hiện Diện')}</span>
                  <Badge bg="secondary" pill className="fw-normal">{shifts.length}</Badge>
                </h3>
                <div className="table-responsive">
                  <table className="wd-table w-100">
                    <thead>
                      <tr>
                        <th>{t('admin.col_shift_staff', 'Cán Bộ')}</th>
                        <th>{t('admin.col_shift_dept', 'Khoa Phòng')}</th>
                        <th>{t('admin.col_shift_time', 'Thời Gian Trực')}</th>
                        <th>{t('admin.col_shift_type', 'Loại Ca')}</th>
                        <th>{t('common.status', 'Trạng Thái')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((s: any) => (
                        <tr key={s.id}>
                          <td>
                            <div className="fw-semibold text-dark">{s.staff_name || s.staff_id}</div>
                          </td>
                          <td>{s.department_code}</td>
                          <td>
                            <div className="small">
                              {s.start_time?.slice(11, 16)} - {s.end_time?.slice(11, 16)}
                            </div>
                            <div className="text-muted small">{s.start_time?.slice(0, 10)}</div>
                          </td>
                          <td>
                            <Badge bg="info" className="fw-normal">
                              {s.shift_type}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={s.status === 'COMPLETED' ? 'success' : 'primary'} className="fw-normal">
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Col>

            {/* Handovers list */}
            <Col xs={12} lg={6}>
              <div className="wd-card p-3 h-100">
                <h3 className="h6 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                  <span>{t('admin.clinical_handovers_card', 'Nhật Ký Bàn Giao Ca Lâm Sàng')}</span>
                  <Badge bg="secondary" pill className="fw-normal">{handovers.length}</Badge>
                </h3>
                <div className="table-responsive">
                  <table className="wd-table w-100">
                    <thead>
                      <tr>
                        <th>{t('admin.col_handover_transfer', 'Bàn Giao → Tiếp Nhận')}</th>
                        <th>{t('admin.col_handover_notes', 'Ghi Chú Bàn Giao Ca')}</th>
                        <th>{t('admin.col_critical_patients', 'Bệnh Nhân Cần Chú Ý')}</th>
                        <th>{t('admin.col_sign_protocol', 'Ký Biên Bản')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {handovers.map((h: any) => (
                        <tr key={h.id}>
                          <td>
                            <div className="fw-semibold text-dark">
                              {h.outgoing_staff_name || h.outgoing_staff_id} &rarr; {h.incoming_staff_name || h.incoming_staff_id}
                            </div>
                            <div className="text-muted small">{h.created_at?.slice(0, 16)}</div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border px-2 py-1 font-monospace">
                              {h.general_notes || 'a'}
                            </span>
                          </td>
                          <td>
                            <span className="badge bg-warning bg-opacity-15 text-dark">
                              {h.critical_patients_count ?? 0} {t('admin.critical_patients_unit', 'ca nặng')}
                            </span>
                          </td>
                          <td>
                            {h.status === 'COMPLETED' || h.status === 'SIGNED' ? (
                              <span className="badge bg-success bg-opacity-10 text-success">
                                <CheckCircle2 size={12} className="me-1" /> {t('admin.status_signed', 'Đã Ký')}
                              </span>
                            ) : (
                              <span className="badge bg-warning bg-opacity-10 text-warning">{t('admin.status_awaiting_signature', 'Chờ Ký')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}

      {/* TAB 6: MEDICAL LICENSING COMPLIANCE */}
      {activeTab === 'licensing' && (
        <div className="wd-card p-3 mb-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 fw-bold mb-1">{t('admin.cchn_title', 'Giám Sát Chứng Chỉ Hành Nghề Y Tế')}</h2>
              <p className="text-muted small mb-0">
                {t('admin.cchn_subtitle', 'Tuân thủ quy định Bộ Y Tế. Tự động cảnh báo trước 30 ngày và kiểm soát quyền trực lâm sàng.')}
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="wd-table w-100">
              <thead>
                <tr>
                  <th>{t('admin.col_cchn_doctor', 'Bác Sĩ / Cán Bộ')}</th>
                  <th>{t('admin.col_cchn_specialty', 'Khoa Chuyên Môn')}</th>
                  <th>{t('admin.col_cchn_number', 'Số Hiệu CCHN')}</th>
                  <th>{t('admin.col_cchn_authority', 'Cơ Quan Cấp')}</th>
                  <th>{t('admin.col_cchn_expiry', 'Thời Hạn Hiệu Lực')}</th>
                  <th>{t('admin.col_cchn_countdown', 'Đếm Ngược')}</th>
                  <th>{t('admin.col_cchn_legal', 'Trạng Thái Pháp Lý')}</th>
                  <th className="text-end">{t('admin.col_cchn_actions', 'Xác Thực CCHN')}</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic: any) => {
                  const daysLeft = Number(lic.days_until_expiry) || 0;
                  return (
                    <tr key={lic.id}>
                      <td>
                        <div className="fw-semibold text-dark">{lic.staff_name}</div>
                        <div className="text-muted small">{lic.staff_code}</div>
                      </td>
                      <td>{lic.department_name}</td>
                      <td>
                        <span className="font-monospace fw-semibold text-primary">{lic.license_number}</span>
                        <div className="text-muted small">{lic.license_type}</div>
                      </td>
                      <td>{lic.issuing_authority}</td>
                      <td>
                        {lic.issue_date?.slice(0, 10)} &rarr; {lic.expiration_date?.slice(0, 10)}
                      </td>
                      <td>
                        {daysLeft < 30 ? (
                          <Badge bg="danger">{t('admin.days_remaining', 'Còn {days} ngày').replace('{days}', String(daysLeft))}</Badge>
                        ) : daysLeft < 90 ? (
                          <Badge bg="warning" text="dark">{t('admin.days_remaining', 'Còn {days} ngày').replace('{days}', String(daysLeft))}</Badge>
                        ) : (
                          <Badge bg="success">{t('admin.days_remaining', 'Còn {days} ngày').replace('{days}', String(daysLeft))}</Badge>
                        )}
                      </td>
                      <td>
                        <Badge
                          bg={
                            lic.verification_status === 'VERIFIED'
                              ? 'success'
                              : lic.verification_status === 'EXPIRED'
                              ? 'danger'
                              : 'secondary'
                          }
                          className="fw-normal px-2 py-1"
                        >
                          {lic.verification_status}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <div className="d-flex align-items-center justify-content-end gap-1">
                          {lic.verification_status !== 'VERIFIED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success py-0.5 px-2"
                              onClick={() => updateLicenseStatusMutation.mutate({ id: lic.id, status: 'VERIFIED' })}
                            >
                              {t('admin.btn_verify_cchn', 'Xác Thực')}
                            </button>
                          )}
                          {lic.verification_status !== 'EXPIRED' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger py-0.5 px-2"
                              onClick={() => updateLicenseStatusMutation.mutate({ id: lic.id, status: 'EXPIRED' })}
                            >
                              {t('admin.btn_expired_cchn', 'Hết Hạn')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: BROADCAST CENTER */}
      {activeTab === 'broadcast' && (
        <Row className="g-4">
          <Col xs={12} md={6}>
            <div className="wd-card p-4 h-100">
              <h2 className="h5 fw-bold text-dark mb-2">{t('admin.broadcast_title', 'Phát Lệnh Thông Báo Nội Bộ Bệnh Viện')}</h2>
              <p className="text-muted small mb-4">
                {t('admin.broadcast_subtitle', 'Thông báo sẽ xuất hiện trực tiếp trên bảng điều khiển Dashboard và thanh thông báo của các cán bộ mục tiêu.')}
              </p>

              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  broadcastMutation.mutate(broadcastData);
                }}
              >
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">{t('admin.broadcast_scope_label', 'Phạm Vi Tiếp Nhận Thông Báo')}</Form.Label>
                  <Form.Select
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
                  <strong className="text-dark d-block mb-1">🚨 {t('admin.announcement_emergency', 'Cảnh Báo Khẩn Cấp')}:</strong>
                  {t('admin.broadcast_standards_urgent', 'Áp dụng cho báo động đỏ nội viện, tiếp nhận thảm họa hoặc dịch bệnh đột xuất.')}
                </div>

                <div className="p-3 bg-light rounded-2 border">
                  <strong className="text-dark d-block mb-1">📢 {t('admin.announcement_general', 'Thông Báo Chung')}:</strong>
                  {t('admin.broadcast_standards_info', 'Áp dụng cho quy chế lương thưởng, chính sách cấp phép chứng chỉ, kế hoạch đào tạo y khoa liên tục.')}
                </div>

                <div className="p-3 bg-light rounded-2 border">
                  <strong className="text-dark d-block mb-1">📋 {t('admin.announcement_task', 'Giao Việc Điều Hành')}:</strong>
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
            <UserCheck size={18} className="text-primary" />
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
                  <Form.Select name="department_code" className="wd-input">
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
                  <Form.Select name="role" defaultValue="DOCTOR" className="wd-input">
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
                  <Form.Control name="specialty" placeholder={t('admin.placeholder_specialty', 'VD: Bác sĩ Đa khoa, CKI Hồi sức cấp cứu...')} className="wd-input" />
                </Form.Group>
              </Col>
            </Row>

            <h6 className="fw-bold text-dark border-bottom pb-1 mb-3">{t('admin.sec_iam_account', '2. Tài Khoản IAM Đăng Nhập')}</h6>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.col_username', 'Tên Đăng Nhập')}</Form.Label>
                  <Form.Control name="username" placeholder={t('admin.placeholder_username', 'Để trống tự tạo theo mã NV')} className="wd-input font-monospace" />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.placeholder_initial_pwd', 'Mật Khẩu Khởi Tạo')}</Form.Label>
                  <Form.Control name="password" defaultValue="bv123456" className="wd-input" />
                </Form.Group>
              </Col>
            </Row>

            <h6 className="fw-bold text-dark border-bottom pb-1 mb-3">{t('admin.sec_payroll_license', '3. Chế Độ Lương & Cấp Phép')}</h6>
            <Row className="g-3">
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_base_hourly', 'Lương Cơ Bản / Giờ')}</Form.Label>
                  <Form.Control name="base_hourly_rate" type="number" defaultValue="120000" step="5000" className="wd-input" />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_tax_tier', 'Bậc Thuế / Chế Độ')}</Form.Label>
                  <Form.Select name="tax_tier" defaultValue="Tier 1" className="wd-input">
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
      <Modal show={showResetPasswordModal} onHide={() => setShowResetPasswordModal(false)} centered>
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
              <Form.Control
                type="password"
                required
                minLength={6}
                value={newPasswordValue}
                onChange={(e) => setNewPasswordValue(e.target.value)}
                placeholder={t('admin.placeholder_new_pwd', 'Nhập mật khẩu mới...')}
                className="wd-input"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResetPasswordModal(false)}>
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
      {/* MODAL 5: EDIT PAY RATE */}
      {/* ========================================================================= */}
      <Modal show={showPayRateModal} onHide={() => setShowPayRateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <DollarSign size={18} className="text-success" />
            {t('admin.modal_edit_rate_title', 'Cập Nhật Định Mức Lương Cơ Bản')}
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedPayRate) {
              updatePayRateMutation.mutate({
                staffId: selectedPayRate.employee_code,
                base_hourly_rate: Number(newHourlyRate),
                tax_tier: newTaxTier
              });
            }
          }}
        >
          <Modal.Body>
            <p className="small text-muted mb-3">
              {t('admin.rate_staff_label', 'Cán bộ')}: <strong>{selectedPayRate?.staff_name}</strong> — {selectedPayRate?.employee_code} • {selectedPayRate?.role}
            </p>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_base_hourly_req', 'Mức Lương Cơ Bản Theo Giờ *')}</Form.Label>
              <Form.Control
                type="number"
                required
                step="5000"
                min="0"
                value={newHourlyRate}
                onChange={(e) => setNewHourlyRate(e.target.value)}
                className="wd-input fw-bold"
              />
              <Form.Text className="text-muted small">
                {t('admin.monthly_estimate_label', 'Ước tính lương tháng 176h')}: ~{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(newHourlyRate || 0) * 176)}
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_tax_tier_benefits', 'Bậc Thuế / Chế Độ Đãi Ngộ')}</Form.Label>
              <Form.Control
                type="text"
                value={newTaxTier}
                onChange={(e) => setNewTaxTier(e.target.value)}
                placeholder={t('admin.placeholder_tax_tier', 'VD: Bậc 2 - Bác sĩ chính...')}
                className="wd-input"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPayRateModal(false)}>
              {t('admin.btn_cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="success" disabled={updatePayRateMutation.isPending}>
              {updatePayRateMutation.isPending ? t('admin.btn_saving', 'Đang lưu...') : t('admin.btn_update_rate', 'Cập Nhật Lương')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: GENERATE PAYROLL RUN */}
      {/* ========================================================================= */}
      <Modal show={showNewRunModal} onHide={() => setShowNewRunModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <CreditCard size={18} className="text-primary" />
            {t('admin.modal_create_run_title', 'Khởi Tạo Kỳ Lương Mới Bệnh Viện')}
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            generateRunMutation.mutate({
              start_date: newRunStartDate,
              end_date: newRunEndDate
            });
          }}
        >
          <Modal.Body>
            <Alert variant="info" className="small py-2 mb-3">
              {t('admin.modal_create_run_desc', 'Hệ thống sẽ tự động quét danh sách toàn bộ cán bộ y tế đang hoạt động, lấy định mức lương VND theo giờ và tạo phiếu lương tương ứng.')}
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('timeoff.from_date', 'Từ Ngày')} *</Form.Label>
              <Form.Control
                type="date"
                required
                value={newRunStartDate}
                onChange={(e) => setNewRunStartDate(e.target.value)}
                className="wd-input"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('timeoff.to_date', 'Đến Ngày')} *</Form.Label>
              <Form.Control
                type="date"
                required
                value={newRunEndDate}
                onChange={(e) => setNewRunEndDate(e.target.value)}
                className="wd-input"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNewRunModal(false)}>
              {t('admin.btn_cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="primary" disabled={generateRunMutation.isPending}>
              {generateRunMutation.isPending ? t('admin.btn_calculating', 'Đang tính toán...') : t('admin.btn_create_and_generate_slips', 'Khởi Tạo & Tạo Phiếu Lương')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: QUICK DISPATCH SHIFT */}
      {/* ========================================================================= */}
      <Modal show={showAddShiftModal} onHide={() => setShowAddShiftModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Clock size={18} className="text-primary" />
            {t('admin.modal_shift_title', 'Phân Ca Trực Khẩn Cấp 24/7')}
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            createShiftMutation.mutate(newShiftData);
          }}
        >
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_assign_staff_req', 'Cán Bộ Y Tế Nhận Ca *')}</Form.Label>
              <Form.Select
                required
                value={newShiftData.staff_id}
                onChange={(e) => setNewShiftData({ ...newShiftData, staff_id: e.target.value })}
                className="wd-input"
              >
                <option value="">-- {t('admin.select_staff_placeholder', 'Chọn Cán Bộ')} --</option>
                {accounts.map((a) => (
                  <option key={a.employee_code} value={a.employee_code}>
                    {a.staff_name} — {a.employee_code} • {a.role}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('nav.department', 'Khoa / Phòng Trực')} *</Form.Label>
              <Form.Select
                value={newShiftData.department_code}
                onChange={(e) => setNewShiftData({ ...newShiftData, department_code: e.target.value })}
                className="wd-input"
              >
                {departments.map((d) => (
                  <option key={d.department_code} value={d.department_code}>
                    {d.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_shift_type', 'Loại Ca')}</Form.Label>
              <Form.Select
                value={newShiftData.shift_type}
                onChange={(e) => setNewShiftData({ ...newShiftData, shift_type: e.target.value })}
                className="wd-input"
              >
                <option value="MORNING">{t('shifts.morning', 'Ca Sáng')}</option>
                <option value="AFTERNOON">{t('shifts.afternoon', 'Ca Chiều')}</option>
                <option value="NIGHT">{t('shifts.night', 'Ca Đêm')}</option>
                <option value="ON_CALL">{t('shifts.on_call', 'Trực Thường Trú')}</option>
                <option value="EMERGENCY_COVER">{t('shifts.emergency', 'Tăng Cường Khẩn Cấp')}</option>
              </Form.Select>
            </Form.Group>

            <Row className="g-2">
              <Col xs={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">{t('admin.field_start_time', 'Bắt Đầu')}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    required
                    value={newShiftData.start_time}
                    onChange={(e) => setNewShiftData({ ...newShiftData, start_time: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">{t('admin.field_end_time', 'Kết Thúc')}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    required
                    value={newShiftData.end_time}
                    onChange={(e) => setNewShiftData({ ...newShiftData, end_time: e.target.value })}
                    className="wd-input"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddShiftModal(false)}>
              {t('admin.btn_cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="primary" disabled={createShiftMutation.isPending}>
              {createShiftMutation.isPending ? t('admin.btn_assigning', 'Đang phân ca...') : t('admin.btn_confirm_shift', 'Xác Nhận Phân Ca')}
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
            <Shield className="text-primary" size={20} />
            <span>{t('admin.modal_role_title', 'Phân Quyền Vai Trò Tài Khoản')}</span>
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            if (!selectedAccountForRole) return;
            updateRoleMutation.mutate({
              id: selectedAccountForRole.account_id,
              role_code: newRoleCode
            });
          }}
        >
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
    </Container>
  );
};

export default SystemManagement;
