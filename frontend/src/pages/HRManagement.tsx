import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Users,
  Building2,
  CreditCard,
  Calendar,
  Clock,
  Award,
  Plus,
  Edit2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminPayRate, AdminOverviewData } from '../api/adminApi';
import { departmentApi } from '../api/departmentApi';
import { leaveApi } from '../api/leaveApi';
import { payrollApi } from '../api/payrollApi';
import { shiftApi } from '../api/shiftApi';
import { handoverApi } from '../api/handoverApi';
import { employeeApi } from '../api/employeeApi';
import { useTranslation } from '../i18n/useTranslation';
import { ConfirmModal, ConfirmDetailItem } from '../components/common/ConfirmModal';

export const HRManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const validTabs: Array<'leaves' | 'compensation' | 'shifts_handover' | 'licensing'> = [
    'leaves',
    'compensation',
    'shifts_handover',
    'licensing'
  ];

  const initialTab = searchParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<'leaves' | 'compensation' | 'shifts_handover' | 'licensing'>(
    validTabs.includes(initialTab) ? initialTab : 'leaves'
  );

  // Sync tab with search params
  useEffect(() => {
    const tabParam = searchParams.get('tab') as any;
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: 'leaves' | 'compensation' | 'shifts_handover' | 'licensing') => {
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

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');

  const showToast = (msg: string, variant: 'success' | 'danger' = 'success') => {
    setToastMessage(msg);
    setToastVariant(variant);
    setTimeout(() => setToastMessage(null), 4000);
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

  // Queries
  const { data: overviewData, refetch: refetchOverview } = useQuery<AdminOverviewData>({
    queryKey: ['admin-overview'],
    queryFn: adminApi.getOverview
  });

  const { data: departments = [], refetch: refetchDepartments } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: departmentApi.getAll
  });

  const { data: payRates = [] as AdminPayRate[], refetch: refetchPayRates } = useQuery<AdminPayRate[]>({
    queryKey: ['admin-pay-rates'],
    queryFn: adminApi.getAllPayRates
  });

  const { data: payrollRuns = [] as any[], refetch: refetchPayrollRuns } = useQuery<any[]>({
    queryKey: ['payroll-runs'],
    queryFn: () => payrollApi.getRuns()
  });

  const { data: leaveRequests = [] as any[], refetch: refetchLeaves } = useQuery<any[]>({
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

  // Filter states
  const [leaveFilter, setLeaveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals state
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

  // Mutations
  const updatePayRateMutation = useMutation({
    mutationFn: ({ staffId, base_hourly_rate, tax_tier }: any) =>
      adminApi.updatePayRate(staffId, { base_hourly_rate: Number(base_hourly_rate), tax_tier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pay-rates'] });
      setShowPayRateModal(false);
      showToast(t('admin.toast_rate_success', 'Đã cập nhật định mức lương thành công!'));
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

  const createShiftMutation = useMutation({
    mutationFn: (data: any) => shiftApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowAddShiftModal(false);
      showToast(t('admin.toast_shift_created', 'Đã phân ca trực thành công cho cán bộ!'));
    },
    onError: (err: any) => {
      showToast(`${t('admin.toast_shift_failed', 'Lỗi phân ca')}: ${err.message || ''}`, 'danger');
    }
  });

  const handleOpenPayRateEdit = (pr: AdminPayRate) => {
    setSelectedPayRate(pr);
    setNewHourlyRate(String(pr.base_hourly_rate));
    setNewTaxTier(pr.tax_tier || 'Tier 1');
    setShowPayRateModal(true);
  };

  const handleRefreshAll = () => {
    refetchOverview();
    refetchDepartments();
    refetchPayRates();
    refetchPayrollRuns();
    refetchLeaves();
    refetchShifts();
    refetchHandovers();
    refetchLicenses();
  };

  const kpis = overviewData?.kpis || {
    total_employees: 0,
    total_departments: 0,
    pending_leaves: 0,
    expiring_licenses_30d: 0,
    total_disbursed_vnd: 0
  };

  // Filter leaves
  const filteredLeaves = leaveRequests.filter((l: any) => {
    if (leaveFilter === 'ALL') return true;
    return l.status === leaveFilter;
  });

  // Confirm leave decision handler
  const handleConfirmLeaveDecision = (leave: any, decision: 'APPROVED' | 'REJECTED') => {
    const isApprove = decision === 'APPROVED';
    setConfirmDialog({
      show: true,
      title: isApprove
        ? t('admin.confirm_leave_approve_title', 'Xác Nhận Phê Duyệt Đơn Nghỉ Phép')
        : t('admin.confirm_leave_reject_title', 'Xác Nhận Từ Chối Đơn Nghỉ Phép'),
      message: isApprove
        ? t('admin.confirm_leave_approve_body', 'Bạn có chắc chắn muốn phê duyệt đơn nghỉ phép này? Hệ thống sẽ tự động trừ ngày phép vào quỹ nghỉ thường niên của cán bộ.')
        : t('admin.confirm_leave_reject_body', 'Bạn có chắc chắn muốn từ chối đơn nghỉ phép này?'),
      confirmText: isApprove
        ? t('admin.btn_approve', 'Duyệt')
        : t('admin.btn_reject', 'Từ Chối'),
      variant: isApprove ? 'success' : 'danger',
      iconType: isApprove ? 'check' : 'alert',
      details: [
        { label: t('admin.label_staff_name', 'Cán bộ'), value: leave.staff_name || leave.staff_id },
        { label: t('admin.label_leave_type', 'Loại phép'), value: leave.leave_type },
        { label: t('admin.label_days', 'Số ngày nghỉ'), value: `${leave.days_requested || (leave.day_part !== 'FULL' ? '0.5' : '1.0')} ${t('admin.days_unit', 'ngày')}` }
      ],
      onConfirm: () => {
        updateLeaveStatusMutation.mutate(
          { id: leave.id, status: decision },
          {
            onSettled: () => closeConfirmDialog()
          }
        );
      }
    });
  };

  // Confirm complete payout handler
  const handleConfirmCompletePayout = (runId: string | number) => {
    setConfirmDialog({
      show: true,
      title: t('admin.confirm_payout_title', 'Xác Nhận Hoàn Tất Chi Lương'),
      message: t('admin.confirm_payout_body', 'Bạn có chắc chắn muốn hoàn tất chi lương cho chu kỳ này? Trạng thái sẽ được chuyển sang Hoàn thành và không thể hoàn tác.'),
      confirmText: t('admin.btn_complete_payout', 'Hoàn Tất Chi Lương'),
      variant: 'success',
      iconType: 'check',
      onConfirm: () => {
        updateRunStatusMutation.mutate(
          { id: String(runId), status: 'COMPLETED' },
          {
            onSettled: () => closeConfirmDialog()
          }
        );
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
            style={{ backgroundColor: '#eff6ff', color: 'var(--wd-blue)', width: '48px', height: '48px' }}
          >
            <Users size={28} />
          </div>
          <div>
            <h1 className="h4 fw-bold text-dark mb-1">
              {t('hr_portal.page_title', 'Cổng Quản Trị & Vận Hành Nhân Sự Bệnh Viện')}
            </h1>
            <p className="text-muted small mb-0">
              {t('hr_portal.page_subtitle', 'Trung tâm chỉ huy HR: Phê duyệt nghỉ phép, định mức lương VND, ca trực lâm sàng và giám sát tuân thủ CCHN')}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center flex-wrap gap-2">
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
            className="wd-pill-btn d-flex align-items-center gap-2 px-3 py-1.5"
            onClick={() => setShowAddShiftModal(true)}
          >
            <Clock size={15} />
            <span>{t('admin.btn_assign_shift', 'Phân Ca Trực')}</span>
          </button>

          <button
            type="button"
            className="wd-pill-btn-primary d-flex align-items-center gap-2 px-3 py-1.5"
            onClick={() => setShowNewRunModal(true)}
          >
            <Plus size={16} />
            <span>{t('admin.btn_create_run', 'Tạo Kỳ Lương')}</span>
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

      {/* HR Command Ribbon - 5 Live KPIs */}
      <Row className="g-3 mb-4">
        {/* KPI 1: Staff */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className="wd-card p-3.5 h-100 border-start border-4 border-primary">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('hr_portal.kpi_total_staff', 'Tổng Cán Bộ Y Tế')}</span>
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

        {/* KPI 2: Pending Leaves */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className={`wd-card p-3.5 h-100 border-start border-4 ${kpis.pending_leaves > 0 ? 'border-warning' : 'border-secondary'}`}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('hr_portal.kpi_pending_leaves', 'Phép Chờ HR Duyệt')}</span>
              <div className={`p-1.5 rounded-2 ${kpis.pending_leaves > 0 ? 'bg-warning bg-opacity-10 text-warning' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                <Calendar size={16} />
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

        {/* KPI 3: Licenses Expiry */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className={`wd-card p-3.5 h-100 border-start border-4 ${kpis.expiring_licenses_30d > 0 ? 'border-danger' : 'border-success'}`}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('hr_portal.kpi_cchn_expiring', 'CCHN Sắp Hết Hạn')}</span>
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

        {/* KPI 4: Total Payroll Disbursed */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className="wd-card p-3.5 h-100 border-start border-4 border-success">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('hr_portal.kpi_total_disbursed', 'Quỹ Lương Đã Chi Trả')}</span>
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

        {/* KPI 5: Active Shifts & Handovers */}
        <Col xs={12} sm={6} lg={2} className="col-lg-2-4">
          <div className="wd-card p-3.5 h-100 border-start border-4 border-info">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <span className="text-muted small fw-semibold">{t('hr_portal.kpi_active_shifts', 'Ca Trực & Giao Ca')}</span>
              <div className="p-1.5 rounded-2 bg-info bg-opacity-10 text-info">
                <Clock size={16} />
              </div>
            </div>
            <div className="h3 fw-bold text-dark my-1 font-mono">{shifts.length}</div>
            <div className="small text-muted mt-2">{t('hr_portal.kpi_shifts_desc', 'Vận hành liên tục 24/7')}</div>
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
            className={`wd-tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
            onClick={() => handleTabChange('leaves')}
          >
            <Calendar size={15} className="me-2" />
            {t('hr_portal.tab_leaves', 'Phê Duyệt Nghỉ Phép')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{leaveRequests.length}</span>
            {kpis.pending_leaves > 0 && (
              <Badge bg="warning" text="dark" pill className="ms-2">
                {kpis.pending_leaves}
              </Badge>
            )}
          </button>

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'compensation' ? 'active' : ''}`}
            onClick={() => handleTabChange('compensation')}
          >
            <CreditCard size={15} className="me-2" />
            {t('hr_portal.tab_compensation', 'Định Mức Lương & Kỳ Lương')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{payRates.length}</span>
          </button>

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'shifts_handover' ? 'active' : ''}`}
            onClick={() => handleTabChange('shifts_handover')}
          >
            <Clock size={15} className="me-2" />
            {t('hr_portal.tab_shifts_handover', 'Lịch Trực & Bàn Giao Ca')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{shifts.length}</span>
          </button>

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'licensing' ? 'active' : ''}`}
            onClick={() => handleTabChange('licensing')}
          >
            <Award size={15} className="me-2" />
            {t('hr_portal.tab_licensing', 'Tuân Thủ CCHN')} <span className="badge rounded-pill bg-light text-dark ms-1.5">{licenses.length}</span>
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

      {/* TAB 1: LEAVE APPROVALS */}
      {activeTab === 'leaves' && (
        <div className="wd-card p-3 mb-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 fw-bold mb-1">{t('admin.leave_approvals_title', 'Xét Duyệt Đơn Nghỉ Phép & Hạn Mức Thường Niên')}</h2>
              <p className="text-muted small mb-0">
                {t('admin.leave_approvals_subtitle', '1-click phê duyệt hoặc từ chối đơn nghỉ phép. Hệ thống tự động trừ hạn mức trong cơ sở dữ liệu.')}
              </p>
            </div>

            <div className="d-flex align-items-center flex-wrap gap-1.5">
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
                            onClick={() => handleConfirmLeaveDecision(lr, 'APPROVED')}
                          >
                            {t('admin.btn_approve', 'Duyệt')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2"
                            onClick={() => handleConfirmLeaveDecision(lr, 'REJECTED')}
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

      {/* TAB 2: COMPENSATION & PAY RATES */}
      {activeTab === 'compensation' && (
        <div className="d-flex flex-column gap-4">
          <div className="wd-card p-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="h5 fw-bold mb-1">{t('admin.comp_catalog_title', 'Bảng Định Mức Lương Y Tế Theo Ngạch Bậc')}</h2>
                <p className="text-muted small mb-0">
                  {t('admin.comp_catalog_desc', 'Cấu hình mức thù lao theo giờ, bậc thuế TNCN và phụ cấp chuyên môn viện.')}
                </p>
              </div>
            </div>

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
                  {payRates.map((pr: AdminPayRate) => {
                    const hourly = Number(pr.base_hourly_rate) || 0;
                    const monthly = hourly * 176;
                    return (
                      <tr key={pr.employee_code}>
                        <td>
                          <div className="fw-semibold text-dark">{pr.staff_name}</div>
                          <div className="text-muted small">{pr.employee_code}</div>
                        </td>
                        <td>{pr.department_name || pr.department_code || 'N/A'}</td>
                        <td>
                          <Badge bg="secondary" className="fw-normal">
                            {pr.role}
                          </Badge>
                        </td>
                        <td>
                          <strong className="text-dark font-mono">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(hourly)} / {t('admin.per_hour', 'giờ')}
                          </strong>
                        </td>
                        <td>
                          <span className="text-muted small font-mono">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(monthly)}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-secondary border">{pr.tax_tier || 'Tier 1'}</span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="wd-action-btn wd-action-btn-edit"
                            onClick={() => handleOpenPayRateEdit(pr)}
                          >
                            <Edit2 size={13} />
                            <span>{t('admin.btn_edit_rate', 'Cập Nhật')}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payroll Runs Section */}
          <div className="wd-card p-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h3 className="h5 fw-bold mb-1">{t('admin.payroll_cycles_title', 'Danh Sách Chu Kỳ Lương Bệnh Viện')}</h3>
                <p className="text-muted small mb-0">
                  {t('admin.payroll_cycles_desc', 'Theo dõi trạng thái chốt bảng lương, phê duyệt và thanh toán chuyển khoản.')}
                </p>
              </div>
              <button
                type="button"
                className="wd-pill-btn-primary d-flex align-items-center gap-1.5"
                onClick={() => setShowNewRunModal(true)}
              >
                <Plus size={15} />
                <span>{t('admin.btn_create_run', 'Tạo Kỳ Lương')}</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="wd-table w-100">
                <thead>
                  <tr>
                    <th>{t('admin.col_cycle_code', 'Mã Kỳ')}</th>
                    <th>{t('admin.col_cycle_period', 'Thời Gian')}</th>
                    <th>{t('admin.col_cycle_fund', 'Tổng Quỹ Lương')}</th>
                    <th>{t('common.status', 'Trạng Thái')}</th>
                    <th className="text-end">{t('admin.col_admin_actions', 'Thao Tác')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRuns.map((run: any) => (
                    <tr key={run.id}>
                      <td className="fw-bold font-mono">#{run.id}</td>
                      <td>
                        {run.start_date?.slice(0, 10)} → {run.end_date?.slice(0, 10)}
                      </td>
                      <td className="fw-bold text-success font-mono">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(run.total_gross || 0))}
                      </td>
                      <td>
                        <Badge
                          bg={run.status === 'COMPLETED' ? 'success' : run.status === 'APPROVED' ? 'primary' : 'warning'}
                          text={run.status === 'DRAFT' ? 'dark' : 'white'}
                          className="fw-normal px-2.5 py-1"
                        >
                          {run.status === 'COMPLETED' ? t('payroll.status_paid', 'Đã Chi Trả') : run.status === 'APPROVED' ? t('payroll.status_approved', 'Đã Duyệt') : t('payroll.status_draft', 'Bản Nháp')}
                        </Badge>
                      </td>
                      <td className="text-end">
                        {run.status !== 'COMPLETED' && (
                          <div className="d-flex align-items-center justify-content-end gap-1.5">
                            {run.status === 'DRAFT' && (
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
                                onClick={() => handleConfirmCompletePayout(run.id)}
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

      {/* TAB 3: SHIFTS & HANDOVERS */}
      {activeTab === 'shifts_handover' && (
        <div className="d-flex flex-column gap-4">
          <div className="wd-card p-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="h5 fw-bold mb-1">{t('admin.shifts_schedule_title', 'Lịch Phân Ca Trực Khám Chữa Bệnh')}</h2>
                <p className="text-muted small mb-0">
                  {t('admin.shifts_schedule_desc', 'Lập lịch trực y bác sĩ, phân bổ kíp trực khoa Cấp cứu, Hồi sức và các khoa phòng.')}
                </p>
              </div>
              <button
                type="button"
                className="wd-pill-btn-primary d-flex align-items-center gap-1.5"
                onClick={() => setShowAddShiftModal(true)}
              >
                <Plus size={15} />
                <span>{t('admin.btn_assign_shift', 'Phân Ca Trực')}</span>
              </button>
            </div>

            <div className="table-responsive">
              <table className="wd-table w-100">
                <thead>
                  <tr>
                    <th>{t('admin.col_medical_staff', 'Cán Bộ Y Tế')}</th>
                    <th>{t('admin.col_department', 'Khoa Phòng')}</th>
                    <th>{t('admin.col_shift_time', 'Khung Giờ Trực')}</th>
                    <th>{t('admin.col_shift_type', 'Phân Loại Ca')}</th>
                    <th>{t('common.status', 'Trạng Thái')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.slice(0, 15).map((s: any) => (
                    <tr key={s.id}>
                      <td className="fw-semibold text-dark">{s.staff_name || s.staff_id}</td>
                      <td>{s.department_name || s.department_code}</td>
                      <td>
                        {s.start_time?.slice(11, 16)} - {s.end_time?.slice(11, 16)} ({s.start_time?.slice(0, 10)})
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{s.shift_type}</span>
                      </td>
                      <td>
                        <Badge bg="success" className="fw-normal px-2 py-1">
                          {s.status || t('admin.shift_active', 'Đang Hoạt Động')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinical Handovers */}
          <div className="wd-card p-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h3 className="h5 fw-bold mb-1">{t('admin.handovers_log_title', 'Nhật Ký Bàn Giao Ca Trực Lâm Sàng')}</h3>
                <p className="text-muted small mb-0">
                  {t('admin.handovers_log_desc', 'Giám sát biên bản bàn giao bệnh nhân nặng, diễn biến ca trực và ký nhận 2 bên.')}
                </p>
              </div>
            </div>

            <div className="table-responsive">
              <table className="wd-table w-100">
                <thead>
                  <tr>
                    <th>{t('admin.col_handover_id', 'Mã Bàn Giao')}</th>
                    <th>{t('admin.col_department', 'Khoa Phòng')}</th>
                    <th>{t('admin.col_giving_staff', 'Người Giao Ca')}</th>
                    <th>{t('admin.col_receiving_staff', 'Người Nhận Ca')}</th>
                    <th>{t('admin.col_patients_status', 'Tình Trạng Bệnh Nhân')}</th>
                    <th>{t('common.status', 'Trạng Thái')}</th>
                  </tr>
                </thead>
                <tbody>
                  {handovers.slice(0, 10).map((h: any) => (
                    <tr key={h.id}>
                      <td className="fw-bold font-mono">#{h.id}</td>
                      <td>{h.department_code}</td>
                      <td>{h.giver_name || h.giving_staff_id}</td>
                      <td>{h.receiver_name || h.receiving_staff_id || t('admin.not_signed_yet', 'Chưa ký nhận')}</td>
                      <td style={{ maxWidth: '280px' }} className="text-truncate">
                        {h.notes || t('admin.handover_normal', 'Diễn biến bình thường, bàn giao đầy đủ')}
                      </td>
                      <td>
                        <Badge
                          bg={h.status === 'CONFIRMED' || h.status === 'COMPLETED' ? 'success' : 'warning'}
                          text={h.status === 'CONFIRMED' || h.status === 'COMPLETED' ? 'white' : 'dark'}
                          className="fw-normal px-2 py-1"
                        >
                          {h.status === 'CONFIRMED' || h.status === 'COMPLETED' ? t('admin.status_confirmed', 'Đã Ký Nhận') : t('admin.status_pending_signature', 'Chờ Ký')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LICENSING COMPLIANCE */}
      {activeTab === 'licensing' && (
        <div className="wd-card p-3 mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 fw-bold mb-1">{t('admin.cchn_title', 'Giám Sát Chứng Chỉ Hành Nghề (CCHN) Y Tế')}</h2>
              <p className="text-muted small mb-0">
                {t('admin.cchn_desc', 'Theo dõi pháp lý hành nghề khám chữa bệnh theo Luật Khám bệnh, chữa bệnh.')}
              </p>
            </div>
          </div>

          {kpis.expiring_licenses_30d > 0 && (
            <Alert variant="danger" className="d-flex align-items-center gap-2 py-2 px-3 mb-3 small">
              <AlertTriangle size={16} />
              <span>
                {t('admin.alert_cchn_warning', 'Cảnh báo: Có')} <strong>{kpis.expiring_licenses_30d}</strong> {t('admin.alert_cchn_expiry_days', 'chứng chỉ hành nghề y tế sắp hết hạn trong 30 ngày tới. Yêu cầu cập nhật hồ sơ khẩn!')}
              </span>
            </Alert>
          )}

          <div className="table-responsive">
            <table className="wd-table w-100">
              <thead>
                <tr>
                  <th>{t('admin.col_medical_staff', 'Cán Bộ Y Tế')}</th>
                  <th>{t('admin.col_cchn_number', 'Số CCHN & Phạm Vi')}</th>
                  <th>{t('admin.col_issued_by', 'Cơ Quan Cấp')}</th>
                  <th>{t('admin.col_expiry_date', 'Ngày Cấp & Hết Hạn')}</th>
                  <th>{t('admin.col_legal_status', 'Tình Trạng Pháp Lý')}</th>
                  <th className="text-end">{t('admin.col_admin_actions', 'Thao Tác')}</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic: any) => {
                  const isExpiring = lic.days_left !== undefined && lic.days_left <= 30 && lic.days_left >= 0;
                  const isExpired = lic.days_left !== undefined && lic.days_left < 0;

                  return (
                    <tr key={lic.id}>
                      <td>
                        <div className="fw-semibold text-dark">{lic.staff_name || lic.staff_id}</div>
                        <div className="text-muted small">{lic.department_name || lic.specialty}</div>
                      </td>
                      <td>
                        <div className="fw-bold font-mono text-dark">{lic.license_number}</div>
                        <div className="text-muted small">{lic.scope_of_practice || t('admin.general_medicine', 'Đa khoa')}</div>
                      </td>
                      <td>{lic.issued_by || t('admin.ministry_of_health', 'Sở Y Tế')}</td>
                      <td>
                        <div>{lic.issue_date?.slice(0, 10)}</div>
                        <div className="small font-mono text-muted">
                          {t('admin.expires_on', 'Hết hạn')}: {lic.expiry_date?.slice(0, 10)}
                        </div>
                      </td>
                      <td>
                        {isExpired ? (
                          <Badge bg="danger" className="px-2 py-1 fw-normal">
                            {t('admin.badge_expired', 'Đã Hết Hạn')}
                          </Badge>
                        ) : isExpiring ? (
                          <Badge bg="warning" text="dark" className="px-2 py-1 fw-normal">
                            {t('admin.badge_expiring_soon', 'Sắp Hết Hạn')}
                          </Badge>
                        ) : (
                          <Badge bg="success" className="px-2 py-1 fw-normal">
                            {t('admin.badge_valid', 'Hợp Lệ')}
                          </Badge>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary py-1 px-2.5"
                          onClick={() =>
                            updateLicenseStatusMutation.mutate({
                              id: lic.id,
                              status: 'RENEWED'
                            })
                          }
                        >
                          {t('admin.btn_renew_license', 'Gia Hạn CCHN')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT PAY RATE */}
      <Modal show={showPayRateModal} onHide={() => setShowPayRateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <CreditCard size={18} className="text-success" />
            {t('admin.modal_edit_payrate_title', 'Cập Nhật Định Mức Lương Ngạch Bậc')}
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
            <div className="mb-3">
              <span className="text-muted small d-block mb-1">{t('admin.col_medical_staff', 'Cán bộ')}:</span>
              <strong>{selectedPayRate?.staff_name}</strong>{' '}
              <span className="badge bg-light text-dark border ms-1 font-mono">{selectedPayRate?.employee_code} • {selectedPayRate?.role}</span>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_hourly_rate', 'Mức Lương Cơ Bản VND / Giờ')}</Form.Label>
              <Form.Control
                type="number"
                required
                value={newHourlyRate}
                onChange={(e) => setNewHourlyRate(e.target.value)}
                className="wd-input font-monospace"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_tax_tier', 'Bậc Thuế TNCN')}</Form.Label>
              <Form.Select
                aria-label={t('admin.field_tax_tier', 'Bậc Thuế TNCN')}
                value={newTaxTier}
                onChange={(e) => setNewTaxTier(e.target.value)}
                className="wd-input"
              >
                <option value="Tier 1">{t('admin.tier_1_label', 'Tier 1 - Khấu trừ 5%')}</option>
                <option value="Tier 2">{t('admin.tier_2_label', 'Tier 2 - Khấu trừ 10%')}</option>
                <option value="Tier 3">{t('admin.tier_3_label', 'Tier 3 - Khấu trừ 15%')}</option>
                <option value="Tier 4">{t('admin.tier_4_label', 'Tier 4 - Khấu trừ 20%')}</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPayRateModal(false)}>
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="success" disabled={updatePayRateMutation.isPending}>
              {updatePayRateMutation.isPending ? t('admin.btn_saving', 'Đang lưu...') : t('admin.btn_save_rate', 'Lưu Định Mức')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 2: CREATE PAYROLL RUN */}
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
            <p className="small text-muted mb-3">
              {t('admin.modal_create_run_desc', 'Hệ thống sẽ tổng hợp số giờ công, phụ cấp ca trực và trừ thuế TNCN của toàn bộ cán bộ y tế trong giai đoạn này.')}
            </p>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_start_date', 'Từ Ngày')}</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={newRunStartDate}
                    onChange={(e) => setNewRunStartDate(e.target.value)}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_end_date', 'Đến Ngày')}</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={newRunEndDate}
                    onChange={(e) => setNewRunEndDate(e.target.value)}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNewRunModal(false)}>
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="primary" disabled={generateRunMutation.isPending}>
              {generateRunMutation.isPending ? t('admin.btn_calculating', 'Đang tính toán...') : t('admin.btn_start_run', 'Khởi Chạy Kỳ Lương')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 3: ASSIGN SHIFT */}
      <Modal show={showAddShiftModal} onHide={() => setShowAddShiftModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Clock size={18} className="text-primary" />
            {t('admin.modal_assign_shift_title', 'Phân Ca Trực Y Bác Sĩ')}
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
              <Form.Label className="small fw-semibold">{t('admin.field_staff_code_id', 'Mã Cán Bộ Y Tế *')}</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="EMP-DOC-001..."
                value={newShiftData.staff_id}
                onChange={(e) => setNewShiftData({ ...newShiftData, staff_id: e.target.value })}
                className="wd-input font-monospace"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_shift_dept', 'Khoa Phòng Trực')}</Form.Label>
              <Form.Select
                aria-label={t('admin.field_shift_dept', 'Khoa Phòng Trực')}
                value={newShiftData.department_code}
                onChange={(e) => setNewShiftData({ ...newShiftData, department_code: e.target.value })}
                className="wd-input"
              >
                {departments.map((d: any) => (
                  <option key={d.department_code} value={d.department_code}>
                    {d.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.field_shift_type', 'Phân Loại Ca Trực')}</Form.Label>
              <Form.Select
                aria-label={t('admin.field_shift_type', 'Phân Loại Ca Trực')}
                value={newShiftData.shift_type}
                onChange={(e) => setNewShiftData({ ...newShiftData, shift_type: e.target.value })}
                className="wd-input"
              >
                <option value="MORNING">{t('shifts.morning_desc', 'Ca Sáng 07:00 - 15:00')}</option>
                <option value="AFTERNOON">{t('shifts.afternoon_desc', 'Ca Chiều 15:00 - 23:00')}</option>
                <option value="NIGHT">{t('shifts.night_desc', 'Ca Đêm Khẩn Cấp 23:00 - 07:00')}</option>
                <option value="24H">{t('shifts.duty_24h_desc', 'Trực Toàn Viện 24h')}</option>
              </Form.Select>
            </Form.Group>

            <Row className="g-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_start_time', 'Bắt Đầu')}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    required
                    value={newShiftData.start_time}
                    onChange={(e) => setNewShiftData({ ...newShiftData, start_time: e.target.value })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">{t('admin.field_end_time', 'Kết Thúc')}</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    required
                    value={newShiftData.end_time}
                    onChange={(e) => setNewShiftData({ ...newShiftData, end_time: e.target.value })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddShiftModal(false)}>
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="primary" disabled={createShiftMutation.isPending}>
              {createShiftMutation.isPending ? t('admin.btn_assigning', 'Đang phân ca...') : t('admin.btn_confirm_shift', 'Xác Nhận Phân Ca')}
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
          updateLeaveStatusMutation.isPending ||
          updateRunStatusMutation.isPending ||
          updateLicenseStatusMutation.isPending
        }
        details={confirmDialog.details}
      />
    </Container>
  );
};

export default HRManagement;
