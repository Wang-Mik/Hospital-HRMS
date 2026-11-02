import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
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
  ClipboardList,
  Briefcase,
  ShieldCheck,
  Star,
  FileCheck,
  Search,
  DollarSign,
  Eye,
  EyeOff
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminPayRate, AdminOverviewData } from '../api/adminApi';
import { departmentApi } from '../api/departmentApi';
import { leaveApi } from '../api/leaveApi';
import { payrollApi } from '../api/payrollApi';
import { shiftApi } from '../api/shiftApi';
import { handoverApi } from '../api/handoverApi';
import { employeeApi } from '../api/employeeApi';
import { hrApi, EmploymentContract, SocialInsurance, CommendationDiscipline } from '../api/hrApi';
import { kpiApi, MonthlyKpiRecord } from '../api/kpiApi';
import { useTranslation } from '../i18n/useTranslation';
import { ConfirmModal, ConfirmDetailItem } from '../components/common/ConfirmModal';

export const HRManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, lang } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const validTabs: Array<
    | 'leaves'
    | 'compensation'
    | 'shifts_handover'
    | 'licensing'
    | 'contracts'
    | 'insurances'
    | 'rewards_disciplines'
    | 'monthly_kpis'
  > = [
    'leaves',
    'compensation',
    'shifts_handover',
    'licensing',
    'contracts',
    'insurances',
    'rewards_disciplines',
    'monthly_kpis'
  ];

  type HRTab = typeof validTabs[number];

  const initialTab = searchParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<HRTab>(
    validTabs.includes(initialTab) ? initialTab : 'leaves'
  );

  // Sync tab with search params
  useEffect(() => {
    const tabParam = searchParams.get('tab') as any;
    if (tabParam && validTabs.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: HRTab) => {
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

  // 5. Contracts Queries & State
  const [contractExpiryFilter, setContractExpiryFilter] = useState<number | undefined>(undefined);
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('');
  const [contractSearch, setContractSearch] = useState<string>('');
  const { data: contracts = [], refetch: refetchContracts } = useQuery<EmploymentContract[]>({
    queryKey: ['hr-contracts', contractExpiryFilter, contractTypeFilter, contractSearch],
    queryFn: () => hrApi.getContracts({
      expiring_within_days: contractExpiryFilter,
      contract_type: contractTypeFilter || undefined,
      search: contractSearch || undefined
    })
  });

  // 6. Insurances Queries & State
  const [insuranceSearch, setInsuranceSearch] = useState<string>('');
  const { data: insurances = [], refetch: refetchInsurances } = useQuery<SocialInsurance[]>({
    queryKey: ['hr-insurances', insuranceSearch],
    queryFn: () => hrApi.getInsurances({ search: insuranceSearch || undefined })
  });

  // 7. Commendations & Disciplines Queries & State
  const [recordTypeFilter, setRecordTypeFilter] = useState<'COMMENDATION' | 'DISCIPLINE' | undefined>(undefined);
  const { data: commendationsDisciplines = [], refetch: refetchRewards } = useQuery<CommendationDiscipline[]>({
    queryKey: ['hr-rewards-disciplines', recordTypeFilter],
    queryFn: () => hrApi.getCommendationsDisciplines({ record_type: recordTypeFilter })
  });

  // 8. Monthly KPIs Queries & State
  const [kpiMonthFilter, setKpiMonthFilter] = useState<string>(new Date().toISOString().slice(0, 7));
  const [kpiDeptFilter, setKpiDeptFilter] = useState<string>('ALL');
  const { data: monthlyKpis = [], refetch: refetchKpis } = useQuery<MonthlyKpiRecord[]>({
    queryKey: ['hr-monthly-kpis', kpiMonthFilter, kpiDeptFilter],
    queryFn: () => kpiApi.getMonthlyKpis({
      month: kpiMonthFilter,
      department_code: kpiDeptFilter === 'ALL' ? undefined : kpiDeptFilter
    })
  });

  // Query all employees for dropdown selections
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['hr-all-employees'],
    queryFn: () => employeeApi.getAll()
  });

  // New Modals State
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractFormData, setContractFormData] = useState<Partial<EmploymentContract>>({
    staff_id: '',
    contract_number: '',
    contract_type: 'DEFINITE_1YR',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    job_title: '',
    base_salary: 15000000,
    status: 'ACTIVE',
    notes: ''
  });

  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [selectedInsuranceStaff, setSelectedInsuranceStaff] = useState<string>('');
  const [insuranceFormData, setInsuranceFormData] = useState<Partial<SocialInsurance>>({
    bhxh_book_number: '',
    bhyt_card_number: '',
    primary_hospital_name: 'Bệnh viện Đa khoa Trung tâm',
    has_bhxh: true,
    has_bhyt: true,
    has_bhtn: true,
    has_occupational_accident: true,
    insurance_salary: 12000000
  });

  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardFormData, setRewardFormData] = useState<Partial<CommendationDiscipline>>({
    staff_id: '',
    record_type: 'COMMENDATION',
    decision_number: '',
    decision_date: new Date().toISOString().slice(0, 10),
    signatory_authority: 'Giám Đốc Bệnh Viện',
    title: '',
    reason: '',
    reward_or_fine_amount: 1000000
  });

  const [showKpiEvalModal, setShowKpiEvalModal] = useState(false);
  const [selectedKpiRecord, setSelectedKpiRecord] = useState<MonthlyKpiRecord | null>(null);
  const [kpiEvalFormData, setKpiEvalFormData] = useState({
    clinical_performance_score: 90,
    patient_satisfaction_score: 95,
    disciplinary_penalty_points: 0,
    evaluation_notes: ''
  });

  // Filter states
  const initialLeaveStatus = searchParams.get('status') as any;
  const [leaveFilter, setLeaveFilter] = useState<'ALL' | 'PENDING' | 'DEPT_APPROVED' | 'APPROVED' | 'REJECTED'>(
    initialLeaveStatus && ['ALL', 'PENDING', 'DEPT_APPROVED', 'APPROVED', 'REJECTED'].includes(initialLeaveStatus)
      ? initialLeaveStatus
      : 'ALL'
  );

  // Sync leave filter if query param changes
  useEffect(() => {
    const statusParam = searchParams.get('status') as any;
    if (statusParam && ['ALL', 'PENDING', 'DEPT_APPROVED', 'APPROVED', 'REJECTED'].includes(statusParam) && statusParam !== leaveFilter) {
      setLeaveFilter(statusParam);
    }
  }, [searchParams]);

  // Modals state
  const [showPayRateModal, setShowPayRateModal] = useState(false);
  const [selectedPayRate, setSelectedPayRate] = useState<AdminPayRate | null>(null);
  const [newHourlyRate, setNewHourlyRate] = useState('');
  const [newTaxTier, setNewTaxTier] = useState('');
  const [newIncrementDate, setNewIncrementDate] = useState('');
  const [newIncrementHidden, setNewIncrementHidden] = useState(false);

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
    mutationFn: async ({ staffId, base_hourly_rate, tax_tier, last_salary_increment_date, is_salary_increment_hidden }: any) => {
      await adminApi.updatePayRate(staffId, { base_hourly_rate: Number(base_hourly_rate), tax_tier });
      await hrApi.updateSalaryIncrement(staffId, {
        last_salary_increment_date: last_salary_increment_date || null,
        is_salary_increment_hidden: Boolean(is_salary_increment_hidden)
      });
    },
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

  // 5. Contracts Mutation
  const saveContractMutation = useMutation({
    mutationFn: (payload: Partial<EmploymentContract>) => hrApi.saveContract(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-contracts'] });
      setShowContractModal(false);
      showToast('Đã lưu hợp đồng lao động thành công!');
    },
    onError: (err: any) => {
      showToast(`Lỗi lưu hợp đồng: ${err.message || ''}`, 'danger');
    }
  });

  // 6. Insurance Mutation
  const updateInsuranceMutation = useMutation({
    mutationFn: ({ staffId, data }: { staffId: string; data: Partial<SocialInsurance> }) =>
      hrApi.updateInsurance(staffId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-insurances'] });
      setShowInsuranceModal(false);
      showToast('Đã cập nhật thông tin sổ bảo hiểm thành công!');
    },
    onError: (err: any) => {
      showToast(`Lỗi cập nhật bảo hiểm: ${err.message || ''}`, 'danger');
    }
  });

  // 7. Commendation & Discipline Mutation
  const saveRewardMutation = useMutation({
    mutationFn: (payload: Partial<CommendationDiscipline>) => hrApi.createCommendationDiscipline(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-rewards-disciplines'] });
      setShowRewardModal(false);
      showToast('Đã lưu quyết định khen thưởng / kỷ luật thành công!');
    },
    onError: (err: any) => {
      showToast(`Lỗi lưu quyết định: ${err.message || ''}`, 'danger');
    }
  });

  // 8. Auto Compute Monthly KPI Mutation
  const autoComputeKpiMutation = useMutation({
    mutationFn: ({ month, dept }: { month: string; dept?: string }) =>
      kpiApi.autoComputeMonthlyKpi(month, dept === 'ALL' ? undefined : dept),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['hr-monthly-kpis'] });
      showToast(res.message || 'Đã tính toán KPI tháng thành công!');
    },
    onError: (err: any) => {
      showToast(`Lỗi tính KPI: ${err.message || ''}`, 'danger');
    }
  });

  // 9. Save KPI Evaluation Mutation
  const saveKpiEvaluationMutation = useMutation({
    mutationFn: (payload: any) => kpiApi.saveKpiEvaluation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-monthly-kpis'] });
      setShowKpiEvalModal(false);
      showToast('Đã lưu đánh giá & xếp loại KPI cán bộ thành công!');
    },
    onError: (err: any) => {
      showToast(`Lỗi lưu đánh giá KPI: ${err.message || ''}`, 'danger');
    }
  });

  const handleOpenPayRateEdit = (pr: AdminPayRate) => {
    setSelectedPayRate(pr);
    setNewHourlyRate(String(pr.base_hourly_rate));
    setNewTaxTier(pr.tax_tier || 'Tier 1');
    setNewIncrementDate(pr.last_salary_increment_date ? String(pr.last_salary_increment_date).slice(0, 10) : '');
    setNewIncrementHidden(Boolean(pr.is_salary_increment_hidden));
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
    refetchContracts();
    refetchInsurances();
    refetchRewards();
    refetchKpis();
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

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'contracts' ? 'active' : ''}`}
            onClick={() => handleTabChange('contracts')}
          >
            <Briefcase size={15} className="me-2" />
            <span>Hợp Đồng Lao Động</span> <span className="badge rounded-pill bg-light text-dark ms-1.5">{contracts.length}</span>
          </button>

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'insurances' ? 'active' : ''}`}
            onClick={() => handleTabChange('insurances')}
          >
            <ShieldCheck size={15} className="me-2" />
            <span>Bảo Hiểm Xã Hội & Y Tế</span> <span className="badge rounded-pill bg-light text-dark ms-1.5">{insurances.length}</span>
          </button>

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'rewards_disciplines' ? 'active' : ''}`}
            onClick={() => handleTabChange('rewards_disciplines')}
          >
            <Star size={15} className="me-2" />
            <span>Khen Thưởng & Kỷ Luật</span> <span className="badge rounded-pill bg-light text-dark ms-1.5">{commendationsDisciplines.length}</span>
          </button>

          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'monthly_kpis' ? 'active' : ''}`}
            onClick={() => handleTabChange('monthly_kpis')}
          >
            <FileCheck size={15} className="me-2" />
            <span>Đánh Giá KPI Tháng</span> <span className="badge rounded-pill bg-light text-dark ms-1.5">{monthlyKpis.length}</span>
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
              {(['ALL', 'PENDING', 'DEPT_APPROVED', 'APPROVED', 'REJECTED'] as const).map((st) => {
                let label = t('admin.filter_all', 'Tất Cả');
                if (st === 'PENDING') label = t('admin.filter_pending', 'Chờ Trưởng Khoa');
                else if (st === 'DEPT_APPROVED') label = t('admin.filter_dept_approved', 'Chờ HR Xác Nhận');
                else if (st === 'APPROVED') label = t('admin.filter_approved', 'Đã Duyệt');
                else if (st === 'REJECTED') label = t('admin.filter_rejected', 'Từ Chối');

                return (
                  <button
                    key={st}
                    type="button"
                    className={`btn btn-sm ${leaveFilter === st ? 'btn-primary' : 'btn-outline-secondary'} py-1 px-2.5`}
                    onClick={() => setLeaveFilter(st)}
                  >
                    {label}
                  </button>
                );
              })}
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
                      {lr.end_date && lr.end_date !== lr.start_date && ` - ${lr.end_date?.slice(0, 10)}`}
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
                      {(() => {
                        switch (lr.status) {
                          case 'DEPT_APPROVED':
                            return (
                              <Badge bg="info" text="white" className="fw-normal px-2 py-1">
                                {t('admin.status_dept_approved', 'Trưởng khoa đã duyệt (Chờ HR xác nhận)')}
                              </Badge>
                            );
                          case 'PENDING':
                            return (
                              <Badge bg="warning" text="dark" className="fw-normal px-2 py-1">
                                {t('admin.status_submitted_pending', 'Đã nộp đơn (Chờ Trưởng khoa duyệt)')}
                              </Badge>
                            );
                          case 'APPROVED':
                            return (
                              <Badge bg="success" text="white" className="fw-normal px-2 py-1">
                                {t('admin.status_hr_approved', 'Đã duyệt hoàn tất (Đã trừ quỹ phép)')}
                              </Badge>
                            );
                          case 'REJECTED':
                            return (
                              <Badge bg="danger" text="white" className="fw-normal px-2 py-1">
                                {t('admin.filter_rejected', 'Từ Chối')}
                              </Badge>
                            );
                          default:
                            return <Badge bg="secondary">{lr.status}</Badge>;
                        }
                      })()}
                    </td>
                    <td className="text-end">
                      {lr.status === 'DEPT_APPROVED' ? (
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-sm btn-success py-1 px-2.5 fw-semibold d-inline-flex align-items-center gap-1 shadow-sm"
                            onClick={() => handleConfirmLeaveDecision(lr, 'APPROVED')}
                          >
                            <span>{t('admin.btn_hr_confirm', 'Xác Nhận Hồ Sơ Viện')}</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2"
                            onClick={() => handleConfirmLeaveDecision(lr, 'REJECTED')}
                          >
                            {t('admin.btn_reject', 'Từ Chối')}
                          </button>
                        </div>
                      ) : lr.status === 'PENDING' ? (
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          <span className="text-muted small fst-italic">
                            Chờ Trưởng khoa duyệt
                          </span>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-0.5 px-2"
                            style={{ fontSize: '11px' }}
                            onClick={() => handleConfirmLeaveDecision(lr, 'REJECTED')}
                            title="Từ chối khẩn cấp"
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
                    <th>{t('admin.last_increment_date', 'Ngày Tăng Lương Cuối')}</th>
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
                        <td>
                          {pr.last_salary_increment_date ? (
                            <div>
                              <div className="font-mono small text-dark">{String(pr.last_salary_increment_date).slice(0, 10)}</div>
                              {pr.is_salary_increment_hidden ? (
                                <Badge bg="secondary" className="small fw-normal">Đã ẩn trên phiếu lương</Badge>
                              ) : (
                                <Badge bg="success" bg-opacity="10" className="small text-success fw-normal border border-success">Hiển thị</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted small">Chưa ghi nhận</span>
                          )}
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
                        {run.start_date?.slice(0, 10)} - {run.end_date?.slice(0, 10)}
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
              <Link
                to="/shifts"
                className="wd-pill-btn-primary d-flex align-items-center gap-1.5 text-decoration-none"
              >
                <Calendar size={15} />
                <span>{t('admin.btn_assign_shift', 'Mở Lịch Phân Ca & Trực')} &rarr;</span>
              </Link>
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

      {/* TAB 5: EMPLOYMENT CONTRACTS */}
      {activeTab === 'contracts' && (
        <div className="wd-card p-3 mb-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 fw-bold mb-1">Quản Lý Hợp Đồng Lao Động Cán Bộ Y Tế</h2>
              <p className="text-muted small mb-0">
                Theo dõi hợp đồng thử việc, học việc, xác định thời hạn và không thời hạn; cảnh báo tự động trước khi hết hạn.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="wd-pill-btn-primary d-flex align-items-center gap-1.5"
                onClick={() => {
                  setContractFormData({
                    staff_id: allEmployees[0]?.employee_code || '',
                    contract_number: `HDLD-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
                    contract_type: 'DEFINITE_1YR',
                    start_date: new Date().toISOString().slice(0, 10),
                    end_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
                    job_title: 'Bác sĩ chuyên khoa',
                    base_salary: 18000000,
                    status: 'ACTIVE',
                    notes: ''
                  });
                  setShowContractModal(true);
                }}
              >
                <Plus size={15} />
                <span>Thêm Hợp Đồng</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="row g-2 mb-3 align-items-center">
            <div className="col-12 col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <Search size={14} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Tìm theo tên cán bộ, mã NV, số HĐ..."
                  value={contractSearch}
                  onChange={(e) => setContractSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select
                aria-label="Lọc theo loại hợp đồng"
                className="form-select form-select-sm"
                value={contractTypeFilter}
                onChange={(e) => setContractTypeFilter(e.target.value)}
              >
                <option value="">Tất Cả Loại Hợp Đồng</option>
                <option value="PROBATION">Hợp Đồng Thử Việc</option>
                <option value="APPRENTICE">Hợp Đồng Học Việc</option>
                <option value="DEFINITE_1YR">HĐ Có Thời Hạn (1 Năm)</option>
                <option value="DEFINITE_3YR">HĐ Có Thời Hạn (3 Năm)</option>
                <option value="INDEFINITE">HĐ Không Xác Định Thời Hạn</option>
              </select>
            </div>
            <div className="col-6 col-md-4 d-flex justify-content-md-end gap-1.5">
              <button
                type="button"
                className={`btn btn-sm ${contractExpiryFilter === undefined ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setContractExpiryFilter(undefined)}
              >
                Tất Cả
              </button>
              <button
                type="button"
                className={`btn btn-sm ${contractExpiryFilter === 30 ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => setContractExpiryFilter(contractExpiryFilter === 30 ? undefined : 30)}
              >
                Hết Hạn ≤ 30 Ngày
              </button>
              <button
                type="button"
                className={`btn btn-sm ${contractExpiryFilter === 60 ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'}`}
                onClick={() => setContractExpiryFilter(contractExpiryFilter === 60 ? undefined : 60)}
              >
                Hết Hạn ≤ 60 Ngày
              </button>
            </div>
          </div>

          {/* Contracts Table */}
          <div className="table-responsive">
            <table className="wd-table w-100">
              <thead>
                <tr>
                  <th>Cán Bộ Y Tế</th>
                  <th>Số HĐ & Vị Trí</th>
                  <th>Loại Hợp Đồng</th>
                  <th>Thời Hạn & Cảnh Báo</th>
                  <th>Mức Lương HĐ</th>
                  <th>Trạng Thái</th>
                  <th className="text-end">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      Không tìm thấy dữ liệu hợp đồng lao động phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => {
                    const daysLeft = c.days_until_expiry;
                    const isExpiringSoon = daysLeft !== null && daysLeft !== undefined && daysLeft <= 30 && daysLeft >= 0;
                    const isExpired = daysLeft !== null && daysLeft !== undefined && daysLeft < 0;

                    const getContractTypeBadge = (type: string) => {
                      switch (type) {
                        case 'PROBATION':
                          return <Badge bg="warning" text="dark">Thử Việc</Badge>;
                        case 'APPRENTICE':
                          return <Badge bg="info">Học Việc</Badge>;
                        case 'DEFINITE_1YR':
                          return <Badge bg="primary">Thời Hạn 1 Năm</Badge>;
                        case 'DEFINITE_3YR':
                          return <Badge bg="indigo" style={{ backgroundColor: '#6366f1' }}>Thời Hạn 3 Năm</Badge>;
                        case 'INDEFINITE':
                          return <Badge bg="success">Không Thời Hạn</Badge>;
                        default:
                          return <Badge bg="secondary">{type}</Badge>;
                      }
                    };

                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="fw-semibold text-dark">{c.staff_name || c.staff_id}</div>
                          <div className="text-muted small">{c.staff_id} • {c.department_name || c.role}</div>
                        </td>
                        <td>
                          <div className="fw-bold font-mono text-dark">{c.contract_number}</div>
                          <div className="text-muted small">{c.job_title || 'N/A'}</div>
                        </td>
                        <td>{getContractTypeBadge(c.contract_type)}</td>
                        <td>
                          <div className="small font-mono">
                            {c.start_date?.slice(0, 10)} - {c.end_date ? c.end_date.slice(0, 10) : 'Vô thời hạn'}
                          </div>
                          {isExpired ? (
                            <span className="badge bg-danger bg-opacity-10 text-danger mt-1 small">
                              Đã hết hạn
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="badge bg-danger text-white mt-1 small">
                              Còn {daysLeft} ngày
                            </span>
                          ) : daysLeft !== null && daysLeft !== undefined && daysLeft <= 60 ? (
                            <span className="badge bg-warning bg-opacity-20 text-dark mt-1 small">
                              Còn {daysLeft} ngày
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <span className="fw-bold font-mono text-dark">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(c.base_salary || 0))}
                          </span>
                        </td>
                        <td>
                          <Badge bg={c.status === 'ACTIVE' ? 'success' : c.status === 'EXPIRED' ? 'danger' : 'secondary'} className="fw-normal">
                            {c.status === 'ACTIVE' ? 'Hiệu Lực' : c.status === 'EXPIRED' ? 'Hết Hạn' : 'Đã Chấm Dứt'}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="wd-action-btn wd-action-btn-edit"
                            onClick={() => {
                              setContractFormData({
                                id: c.id,
                                staff_id: c.staff_id,
                                contract_number: c.contract_number,
                                contract_type: c.contract_type,
                                start_date: c.start_date?.slice(0, 10),
                                end_date: c.end_date ? c.end_date.slice(0, 10) : '',
                                job_title: c.job_title,
                                base_salary: Number(c.base_salary),
                                status: c.status,
                                notes: c.notes || ''
                              });
                              setShowContractModal(true);
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Sửa</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SOCIAL & HEALTH INSURANCE */}
      {activeTab === 'insurances' && (
        <div className="wd-card p-3 mb-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 fw-bold mb-1">Quản Lý Sổ Bảo Hiểm Xã Hội & Y Tế Cán Bộ</h2>
              <p className="text-muted small mb-0">
                Theo dõi tình trạng cấp sổ BHXH, thẻ BHYT, nơi KCB ban đầu và các chế độ bảo hiểm bắt buộc (BHXH, BHYT, BHTN, TNLĐ-BNN).
              </p>
            </div>
            <div className="w-100 w-md-auto" style={{ maxWidth: '300px' }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-light border-end-0">
                  <Search size={14} className="text-muted" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Tìm kiếm cán bộ..."
                  value={insuranceSearch}
                  onChange={(e) => setInsuranceSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="wd-table w-100">
              <thead>
                <tr>
                  <th>Cán Bộ Y Tế</th>
                  <th>Mã Sổ BHXH</th>
                  <th>Mã Thẻ BHYT & KCB Ban Đầu</th>
                  <th>Chế Độ Tham Gia</th>
                  <th>Lương Đóng BH</th>
                  <th className="text-end">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {insurances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      Chưa có hồ sơ bảo hiểm phù hợp.
                    </td>
                  </tr>
                ) : (
                  insurances.map((ins) => (
                    <tr key={ins.id}>
                      <td>
                        <div className="fw-semibold text-dark">{ins.staff_name || ins.staff_id}</div>
                        <div className="text-muted small">{ins.staff_id} • {ins.department_name}</div>
                      </td>
                      <td>
                        <div className="font-mono fw-bold text-dark">{ins.bhxh_book_number || 'Chưa cấp'}</div>
                        <div className="text-muted small">Sổ BHXH Việt Nam</div>
                      </td>
                      <td>
                        <div className="font-mono text-dark">{ins.bhyt_card_number || 'Chưa cấp'}</div>
                        <div className="text-muted small">{ins.primary_hospital_name || 'Bệnh viện Đa khoa'}</div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <span className={`badge ${ins.has_bhxh ? 'bg-success' : 'bg-light text-muted border'}`}>BHXH</span>
                          <span className={`badge ${ins.has_bhyt ? 'bg-info' : 'bg-light text-muted border'}`}>BHYT</span>
                          <span className={`badge ${ins.has_bhtn ? 'bg-primary' : 'bg-light text-muted border'}`}>BHTN</span>
                          <span className={`badge ${ins.has_occupational_accident ? 'bg-warning text-dark' : 'bg-light text-muted border'}`}>TNLĐ-BNN</span>
                        </div>
                      </td>
                      <td>
                        <span className="fw-bold font-mono text-dark">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(ins.insurance_salary || 0))}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="wd-action-btn wd-action-btn-edit"
                          onClick={() => {
                            setSelectedInsuranceStaff(ins.staff_id);
                            setInsuranceFormData({
                              bhxh_book_number: ins.bhxh_book_number || '',
                              bhyt_card_number: ins.bhyt_card_number || '',
                              primary_hospital_name: ins.primary_hospital_name || '',
                              has_bhxh: Boolean(ins.has_bhxh),
                              has_bhyt: Boolean(ins.has_bhyt),
                              has_bhtn: Boolean(ins.has_bhtn),
                              has_occupational_accident: Boolean(ins.has_occupational_accident),
                              insurance_salary: Number(ins.insurance_salary || 0),
                              notes: ins.notes || ''
                            });
                            setShowInsuranceModal(true);
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Cập Nhật</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: COMMENDATIONS & DISCIPLINES */}
      {activeTab === 'rewards_disciplines' && (
        <div className="wd-card p-3 mb-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 fw-bold mb-1">Sổ Theo Dõi Khen Thưởng & Xử Lý Kỷ Luật</h2>
              <p className="text-muted small mb-0">
                Hồ sơ thi đua, danh hiệu thầy thuốc ưu tú, chiến sĩ thi đua và các quyết định kỷ luật chuyên môn lâm sàng.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="wd-pill-btn-primary d-flex align-items-center gap-1.5"
                onClick={() => {
                  setRewardFormData({
                    staff_id: allEmployees[0]?.employee_code || '',
                    record_type: 'COMMENDATION',
                    decision_number: `QD-KT-${new Date().getFullYear()}/${String(commendationsDisciplines.length + 1).padStart(3, '0')}`,
                    decision_date: new Date().toISOString().slice(0, 10),
                    signatory_authority: 'Ban Giám Đốc Bệnh Viện',
                    title: 'Khen thưởng hoàn thành xuất sắc nhiệm vụ cấp cứu',
                    reason: 'Cứu chữa thành công ca bệnh nặng ngừng tuần hoàn trong ca trực đêm',
                    reward_or_fine_amount: 2000000
                  });
                  setShowRewardModal(true);
                }}
              >
                <Plus size={15} />
                <span>Tạo Quyết Định</span>
              </button>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="small text-muted fw-semibold">Lọc phân loại:</span>
            <button
              type="button"
              className={`btn btn-sm ${recordTypeFilter === undefined ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setRecordTypeFilter(undefined)}
            >
              Tất Cả
            </button>
            <button
              type="button"
              className={`btn btn-sm ${recordTypeFilter === 'COMMENDATION' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setRecordTypeFilter(recordTypeFilter === 'COMMENDATION' ? undefined : 'COMMENDATION')}
            >
              Khen Thưởng
            </button>
            <button
              type="button"
              className={`btn btn-sm ${recordTypeFilter === 'DISCIPLINE' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setRecordTypeFilter(recordTypeFilter === 'DISCIPLINE' ? undefined : 'DISCIPLINE')}
            >
              Kỷ Luật
            </button>
          </div>

          <div className="table-responsive">
            <table className="wd-table w-100">
              <thead>
                <tr>
                  <th>Cán Bộ Y Tế</th>
                  <th>Phân Loại</th>
                  <th>Số QĐ & Cơ Quan Ban Hành</th>
                  <th>Nội Dung & Lý Do Chi Tiết</th>
                  <th>Mức Thưởng / Phạt</th>
                  <th>Ngày Ký QĐ</th>
                </tr>
              </thead>
              <tbody>
                {commendationsDisciplines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      Chưa có hồ sơ khen thưởng hoặc kỷ luật nào.
                    </td>
                  </tr>
                ) : (
                  commendationsDisciplines.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold text-dark">{item.staff_name || item.staff_id}</div>
                        <div className="text-muted small">{item.staff_id} • {item.department_name}</div>
                      </td>
                      <td>
                        {item.record_type === 'COMMENDATION' ? (
                          <Badge bg="success" className="fw-normal">Khen Thưởng</Badge>
                        ) : (
                          <Badge bg="danger" className="fw-normal">Kỷ Luật</Badge>
                        )}
                      </td>
                      <td>
                        <div className="fw-bold font-mono text-dark">{item.decision_number}</div>
                        <div className="text-muted small">{item.signatory_authority}</div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{item.title}</div>
                        <div className="text-muted small">{item.reason}</div>
                      </td>
                      <td>
                        <span className={`fw-bold font-mono ${item.record_type === 'COMMENDATION' ? 'text-success' : 'text-danger'}`}>
                          {item.record_type === 'COMMENDATION' ? '+' : '-'}
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.reward_or_fine_amount || 0))}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-muted small">{item.decision_date?.slice(0, 10)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: MONTHLY KPIS */}
      {activeTab === 'monthly_kpis' && (
        <div className="wd-card p-3 mb-4">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 pb-3 border-bottom">
            <div>
              <h2 className="h5 fw-bold mb-1">Đánh Giá & Xếp Loại KPI Hàng Tháng</h2>
              <p className="text-muted small mb-0">
                Đánh giá toàn diện: Chuyên cần & đi ca đúng giờ (20%), Tuân thủ bàn giao ca (20%), Năng lực chuyên môn (30%), Sự hài lòng người bệnh (30%).
              </p>
            </div>
            <div className="d-flex align-items-center flex-wrap gap-2">
              <input
                type="month"
                className="form-control form-control-sm font-mono"
                style={{ width: '160px' }}
                value={kpiMonthFilter}
                onChange={(e) => setKpiMonthFilter(e.target.value)}
              />
              <select
                aria-label="Lọc theo khoa phòng"
                className="form-select form-select-sm"
                style={{ width: '180px' }}
                value={kpiDeptFilter}
                onChange={(e) => setKpiDeptFilter(e.target.value)}
              >
                <option value="ALL">Tất Cả Khoa Phòng</option>
                {departments.map((d: any) => (
                  <option key={d.department_code} value={d.department_code}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1.5"
                disabled={autoComputeKpiMutation.isPending}
                onClick={() => autoComputeKpiMutation.mutate({ month: kpiMonthFilter, dept: kpiDeptFilter })}
              >
                <RefreshCw size={13} className={autoComputeKpiMutation.isPending ? 'spin' : ''} />
                <span>{autoComputeKpiMutation.isPending ? 'Đang tính toán...' : 'Tính Toán Tự Động KPI'}</span>
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="wd-table w-100">
              <thead>
                <tr>
                  <th>Cán Bộ Y Tế</th>
                  <th>Khối Lượng Trực</th>
                  <th>Kỷ Luật Ca Trực</th>
                  <th>Bàn Giao Ca</th>
                  <th>Điểm Lâm Sàng & Hài Lòng</th>
                  <th>Tổng Điểm & Xếp Loại</th>
                  <th className="text-end">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {monthlyKpis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      Chưa có dữ liệu KPI cho tháng {kpiMonthFilter}. Hãy bấm &quot;Tính Toán Tự Động KPI&quot; để tổng hợp dữ liệu ca trực và chấm công!
                    </td>
                  </tr>
                ) : (
                  monthlyKpis.map((kpi) => {
                    const shiftsCount = Number(kpi.actual_shifts ?? kpi.total_shifts ?? 0);
                    const hoursCount = Number(kpi.actual_hours ?? kpi.total_hours ?? 0);
                    const onTimeRate = Number(kpi.on_time_attendance_rate ?? 100);
                    const handoverRate = Number(kpi.handover_compliance_rate ?? 100);
                    const finalScore = Number(kpi.total_kpi_score ?? kpi.final_score ?? 0);
                    const cleanGrade = (kpi.kpi_grade || 'GRADE_B').replace('GRADE_', '');
                    const displayName = kpi.staff_name || (kpi.last_name ? `${kpi.last_name} ${kpi.first_name}` : kpi.staff_id);

                    const getGradeBadge = (g: string) => {
                      switch (g) {
                        case 'A':
                          return <Badge bg="success" className="px-2 py-1">Hạng A - Xuất Sắc</Badge>;
                        case 'B':
                          return <Badge bg="primary" className="px-2 py-1">Hạng B - Tốt</Badge>;
                        case 'C':
                          return <Badge bg="warning" text="dark" className="px-2 py-1">Hạng C - Đạt</Badge>;
                        case 'D':
                          return <Badge bg="danger" className="px-2 py-1">Hạng D - Kém</Badge>;
                        default:
                          return <Badge bg="secondary">{g}</Badge>;
                      }
                    };

                    return (
                      <tr key={kpi.id}>
                        <td>
                          <div className="fw-semibold text-dark">{displayName}</div>
                          <div className="text-muted small">{kpi.staff_id} • {kpi.department_name}</div>
                        </td>
                        <td>
                          <div className="fw-bold font-mono text-dark">{shiftsCount} ca trực</div>
                          <div className="text-muted small">{hoursCount} giờ làm việc</div>
                        </td>
                        <td>
                          <div className="font-mono">{onTimeRate}% đúng giờ</div>
                          {onTimeRate < 90 && (
                            <div className="text-warning small">Có phát sinh trễ ca</div>
                          )}
                        </td>
                        <td>
                          <div className="fw-medium text-dark">{handoverRate}% hoàn thành</div>
                          <div className="text-muted small">Biên bản an toàn BN</div>
                        </td>
                        <td>
                          <div className="small font-mono">
                            Chuyên môn: <strong className="text-dark">{kpi.clinical_performance_score}/100</strong>
                          </div>
                          <div className="small font-mono text-muted">
                            Hài lòng: {kpi.patient_satisfaction_score} • Trừ điểm: -{kpi.disciplinary_penalty_points}
                          </div>
                        </td>
                        <td>
                          <div className="h6 fw-bold font-mono mb-1 text-dark">{finalScore} / 100</div>
                          {getGradeBadge(cleanGrade)}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="wd-action-btn wd-action-btn-edit"
                            onClick={() => {
                              setSelectedKpiRecord(kpi);
                              setKpiEvalFormData({
                                clinical_performance_score: Number(kpi.clinical_performance_score) || 90,
                                patient_satisfaction_score: Number(kpi.patient_satisfaction_score) || 95,
                                disciplinary_penalty_points: Number(kpi.disciplinary_penalty_points) || 0,
                                evaluation_notes: kpi.evaluation_notes || ''
                              });
                              setShowKpiEvalModal(true);
                            }}
                          >
                            <Edit2 size={13} />
                            <span>Chấm Điểm</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
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
                tax_tier: newTaxTier,
                last_salary_increment_date: newIncrementDate,
                is_salary_increment_hidden: newIncrementHidden
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

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{t('admin.last_increment_date', 'Ngày Tăng Lương Gần Nhất')}</Form.Label>
              <Form.Control
                type="date"
                value={newIncrementDate}
                onChange={(e) => setNewIncrementDate(e.target.value)}
                className="wd-input font-monospace"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Check
                type="switch"
                id="is-salary-increment-hidden-switch"
                label={t('admin.hide_increment_label', 'Ẩn thông tin ngày tăng lương trên phiếu lương cán bộ (Chính sách bảo mật BV)')}
                checked={newIncrementHidden}
                onChange={(e) => setNewIncrementHidden(e.target.checked)}
                className="small"
              />
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

      {/* MODAL 4: EMPLOYMENT CONTRACT */}
      <Modal show={showContractModal} onHide={() => setShowContractModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Briefcase size={18} className="text-primary" />
            {contractFormData.id ? 'Chỉnh Sửa Hợp Đồng Lao Động' : 'Thêm Hợp Đồng Lao Động Cán Bộ'}
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            saveContractMutation.mutate(contractFormData);
          }}
        >
          <Modal.Body>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Cán Bộ Y Tế *</Form.Label>
                  <Form.Select
                    aria-label="Cán Bộ Y Tế"
                    required
                    disabled={Boolean(contractFormData.id)}
                    value={contractFormData.staff_id}
                    onChange={(e) => setContractFormData({ ...contractFormData, staff_id: e.target.value })}
                    className="wd-input"
                  >
                    <option value="">-- Chọn Cán Bộ --</option>
                    {allEmployees.map((emp: any) => (
                      <option key={emp.employee_code} value={emp.employee_code}>
                        {emp.employee_code} - {emp.last_name} {emp.first_name} ({emp.department_name || emp.role})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Số Hợp Đồng *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={contractFormData.contract_number}
                    onChange={(e) => setContractFormData({ ...contractFormData, contract_number: e.target.value })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Loại Hợp Đồng *</Form.Label>
                  <Form.Select
                    aria-label="Loại Hợp Đồng"
                    required
                    value={contractFormData.contract_type}
                    onChange={(e) => setContractFormData({ ...contractFormData, contract_type: e.target.value as any })}
                    className="wd-input"
                  >
                    <option value="PROBATION">Hợp Đồng Thử Việc</option>
                    <option value="APPRENTICE">Hợp Đồng Học Việc</option>
                    <option value="DEFINITE_1YR">HĐ Có Thời Hạn (1 Năm)</option>
                    <option value="DEFINITE_3YR">HĐ Có Thời Hạn (3 Năm)</option>
                    <option value="INDEFINITE">HĐ Không Xác Định Thời Hạn</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Vị Trí / Chức Danh Công Việc</Form.Label>
                  <Form.Control
                    type="text"
                    value={contractFormData.job_title || ''}
                    onChange={(e) => setContractFormData({ ...contractFormData, job_title: e.target.value })}
                    placeholder="VD: Bác sĩ điều trị, Điều dưỡng viên..."
                    className="wd-input"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Ngày Bắt Đầu *</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={contractFormData.start_date || ''}
                    onChange={(e) => setContractFormData({ ...contractFormData, start_date: e.target.value })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Ngày Kết Thúc (để trống nếu không thời hạn)</Form.Label>
                  <Form.Control
                    type="date"
                    value={contractFormData.end_date || ''}
                    onChange={(e) => setContractFormData({ ...contractFormData, end_date: e.target.value })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Lương Thỏa Thuận (VND) *</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    value={contractFormData.base_salary || 0}
                    onChange={(e) => setContractFormData({ ...contractFormData, base_salary: Number(e.target.value) })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Trạng Thái Hợp Đồng *</Form.Label>
                  <Form.Select
                    aria-label="Trạng Thái Hợp Đồng"
                    required
                    value={contractFormData.status}
                    onChange={(e) => setContractFormData({ ...contractFormData, status: e.target.value as any })}
                    className="wd-input"
                  >
                    <option value="ACTIVE">Hiệu Lực</option>
                    <option value="EXPIRED">Hết Hạn</option>
                    <option value="TERMINATED">Chấm Dứt Trước Thời Hạn</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Ghi Chú Hợp Đồng</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={contractFormData.notes || ''}
                onChange={(e) => setContractFormData({ ...contractFormData, notes: e.target.value })}
                className="wd-input"
                placeholder="Điều khoản bổ sung, thoả thuận đào tạo nâng cao..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowContractModal(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={saveContractMutation.isPending}>
              {saveContractMutation.isPending ? 'Đang lưu...' : 'Lưu Hợp Đồng'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 5: SOCIAL & HEALTH INSURANCE */}
      <Modal show={showInsuranceModal} onHide={() => setShowInsuranceModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <ShieldCheck size={18} className="text-info" />
            Cập Nhật Sổ Bảo Hiểm Cán Bộ ({selectedInsuranceStaff})
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            updateInsuranceMutation.mutate({
              staffId: selectedInsuranceStaff,
              data: insuranceFormData
            });
          }}
        >
          <Modal.Body>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mã Số Sổ BHXH</Form.Label>
                  <Form.Control
                    type="text"
                    value={insuranceFormData.bhxh_book_number || ''}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, bhxh_book_number: e.target.value })}
                    placeholder="VD: 7912345678"
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mã Số Thẻ BHYT</Form.Label>
                  <Form.Control
                    type="text"
                    value={insuranceFormData.bhyt_card_number || ''}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, bhyt_card_number: e.target.value })}
                    placeholder="VD: DN4791234567890"
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Nơi Đăng Ký KCB Ban Đầu</Form.Label>
                  <Form.Control
                    type="text"
                    value={insuranceFormData.primary_hospital_name || ''}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, primary_hospital_name: e.target.value })}
                    placeholder="Bệnh viện Đa khoa Trung tâm..."
                    className="wd-input"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mức Lương Đóng Bảo Hiểm (VND)</Form.Label>
                  <Form.Control
                    type="number"
                    value={insuranceFormData.insurance_salary || 0}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, insurance_salary: Number(e.target.value) })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold d-block mb-2">Các Chế Độ Bảo Hiểm Tham Gia</Form.Label>
              <Row className="g-2">
                <Col xs={6} md={3}>
                  <Form.Check
                    type="checkbox"
                    id="has_bhxh"
                    label="BHXH bắt buộc"
                    checked={Boolean(insuranceFormData.has_bhxh)}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, has_bhxh: e.target.checked })}
                  />
                </Col>
                <Col xs={6} md={3}>
                  <Form.Check
                    type="checkbox"
                    id="has_bhyt"
                    label="BHYT bắt buộc"
                    checked={Boolean(insuranceFormData.has_bhyt)}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, has_bhyt: e.target.checked })}
                  />
                </Col>
                <Col xs={6} md={3}>
                  <Form.Check
                    type="checkbox"
                    id="has_bhtn"
                    label="Bảo hiểm thất nghiệp"
                    checked={Boolean(insuranceFormData.has_bhtn)}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, has_bhtn: e.target.checked })}
                  />
                </Col>
                <Col xs={6} md={3}>
                  <Form.Check
                    type="checkbox"
                    id="has_occupational_accident"
                    label="Bảo hiểm TNLĐ - BNN"
                    checked={Boolean(insuranceFormData.has_occupational_accident)}
                    onChange={(e) => setInsuranceFormData({ ...insuranceFormData, has_occupational_accident: e.target.checked })}
                  />
                </Col>
              </Row>
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Ghi Chú</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={insuranceFormData.notes || ''}
                onChange={(e) => setInsuranceFormData({ ...insuranceFormData, notes: e.target.value })}
                className="wd-input"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInsuranceModal(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="info" className="text-white" disabled={updateInsuranceMutation.isPending}>
              {updateInsuranceMutation.isPending ? 'Đang lưu...' : 'Lưu Hồ Sơ Bảo Hiểm'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 6: COMMENDATION & DISCIPLINE */}
      <Modal show={showRewardModal} onHide={() => setShowRewardModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <Star size={18} className="text-warning" />
            Ban Hành Quyết Định Khen Thưởng / Kỷ Luật
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            saveRewardMutation.mutate(rewardFormData);
          }}
        >
          <Modal.Body>
            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Cán Bộ Y Tế *</Form.Label>
                  <Form.Select
                    aria-label="Cán Bộ Y Tế"
                    required
                    value={rewardFormData.staff_id}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, staff_id: e.target.value })}
                    className="wd-input"
                  >
                    <option value="">-- Chọn Cán Bộ --</option>
                    {allEmployees.map((emp: any) => (
                      <option key={emp.employee_code} value={emp.employee_code}>
                        {emp.employee_code} - {emp.last_name} {emp.first_name} ({emp.department_name || emp.role})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Phân Loại Quyết Định *</Form.Label>
                  <Form.Select
                    aria-label="Phân Loại Quyết Định"
                    required
                    value={rewardFormData.record_type}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, record_type: e.target.value as any })}
                    className="wd-input"
                  >
                    <option value="COMMENDATION">Khen Thưởng Thi Đua</option>
                    <option value="DISCIPLINE">Xử Lý Kỷ Luật</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Số Quyết Định *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={rewardFormData.decision_number}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, decision_number: e.target.value })}
                    placeholder="VD: QD-KT-2026/012"
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Cơ Quan / Cấp Ký Quyết Định *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={rewardFormData.signatory_authority}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, signatory_authority: e.target.value })}
                    placeholder="Giám Đốc Bệnh Viện, Hội Đồng Khen Thưởng..."
                    className="wd-input"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Ngày Ban Hành *</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={rewardFormData.decision_date}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, decision_date: e.target.value })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mức Thưởng / Tiền Phạt (VND)</Form.Label>
                  <Form.Control
                    type="number"
                    value={rewardFormData.reward_or_fine_amount || 0}
                    onChange={(e) => setRewardFormData({ ...rewardFormData, reward_or_fine_amount: Number(e.target.value) })}
                    className="wd-input font-monospace"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Tiêu Đề Danh Hiệu / Hình Thức Xử Lý *</Form.Label>
              <Form.Control
                type="text"
                required
                value={rewardFormData.title}
                onChange={(e) => setRewardFormData({ ...rewardFormData, title: e.target.value })}
                placeholder="VD: Giấy khen Giám đốc Bệnh viện / Khiển trách chuyên môn..."
                className="wd-input"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Lý Do / Căn Cứ Thực Tế *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required
                value={rewardFormData.reason}
                onChange={(e) => setRewardFormData({ ...rewardFormData, reason: e.target.value })}
                placeholder="Mô tả thành tích đóng góp hoặc hành vi vi phạm..."
                className="wd-input"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRewardModal(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={saveRewardMutation.isPending}>
              {saveRewardMutation.isPending ? 'Đang lưu...' : 'Lưu Quyết Định'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL 7: KPI EVALUATION */}
      <Modal show={showKpiEvalModal} onHide={() => setShowKpiEvalModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold text-dark d-flex align-items-center gap-2">
            <FileCheck size={18} className="text-primary" />
            Chấm Điểm & Xếp Loại KPI Cán Bộ
          </Modal.Title>
        </Modal.Header>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedKpiRecord) {
              saveKpiEvaluationMutation.mutate({
                kpi_id: selectedKpiRecord.id,
                staff_id: selectedKpiRecord.staff_id,
                kpi_month: selectedKpiRecord.kpi_month || selectedKpiRecord.month || kpiMonthFilter,
                ...kpiEvalFormData
              });
            }
          }}
        >
          <Modal.Body>
            <div className="mb-3 p-2.5 bg-light rounded-2 border">
              <div className="fw-semibold text-dark">
                {selectedKpiRecord?.staff_name || (selectedKpiRecord?.last_name ? `${selectedKpiRecord.last_name} ${selectedKpiRecord.first_name}` : selectedKpiRecord?.staff_id)}
              </div>
              <div className="text-muted small">{selectedKpiRecord?.staff_id} • Tháng {selectedKpiRecord?.kpi_month || selectedKpiRecord?.month || kpiMonthFilter}</div>
              <div className="text-muted small mt-1 font-mono">
                Số ca: {selectedKpiRecord?.actual_shifts ?? selectedKpiRecord?.total_shifts ?? 0} | Giờ trực: {selectedKpiRecord?.actual_hours ?? selectedKpiRecord?.total_hours ?? 0}h | Đúng giờ: {selectedKpiRecord?.on_time_attendance_rate ?? 100}% | Giao ca: {selectedKpiRecord?.handover_compliance_rate ?? 100}%
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                Điểm Đánh Giá Năng Lực Lâm Sàng (30% trọng số, thang 0-100)
              </Form.Label>
              <Form.Control
                type="number"
                min={0}
                max={100}
                required
                value={kpiEvalFormData.clinical_performance_score}
                onChange={(e) => setKpiEvalFormData({ ...kpiEvalFormData, clinical_performance_score: Number(e.target.value) })}
                className="wd-input font-monospace"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                Điểm Hài Lòng Người Bệnh & Thân Nhân (30% trọng số, thang 0-100)
              </Form.Label>
              <Form.Control
                type="number"
                min={0}
                max={100}
                required
                value={kpiEvalFormData.patient_satisfaction_score}
                onChange={(e) => setKpiEvalFormData({ ...kpiEvalFormData, patient_satisfaction_score: Number(e.target.value) })}
                className="wd-input font-monospace"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                Điểm Trừ Vi Phạn Quy Chế / Khiếu Nại (Trừ thẳng vào tổng điểm)
              </Form.Label>
              <Form.Control
                type="number"
                min={0}
                max={50}
                required
                value={kpiEvalFormData.disciplinary_penalty_points}
                onChange={(e) => setKpiEvalFormData({ ...kpiEvalFormData, disciplinary_penalty_points: Number(e.target.value) })}
                className="wd-input font-monospace"
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <Form.Label className="small fw-semibold">Nhận Xét & Đề Xuất Cải Tiến Của Trưởng Khoa / HR</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={kpiEvalFormData.evaluation_notes}
                onChange={(e) => setKpiEvalFormData({ ...kpiEvalFormData, evaluation_notes: e.target.value })}
                placeholder="Khen ngợi tinh thần cấp cứu hoặc nhắc nhở tuân thủ quy trình..."
                className="wd-input"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowKpiEvalModal(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" disabled={saveKpiEvaluationMutation.isPending}>
              {saveKpiEvaluationMutation.isPending ? 'Đang lưu...' : 'Lưu Kết Quả KPI'}
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
