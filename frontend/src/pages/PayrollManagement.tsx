import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Modal,
  Form,
  Alert
} from 'react-bootstrap';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Plus,
  Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../api/payrollApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';
import { TheoryOfNextLoader } from '../components/common/TheoryOfNextLoader';

export interface PaySlipItem {
  id: string;
  run_id: string;
  period_label: string;
  staff_id: string;
  staff_name: string;
  department_name: string;
  base_hourly_rate: number;
  base_hours: number;
  base_pay: number;
  night_hours: number;
  night_differential: number;
  overtime_hours: number;
  overtime_pay: number;
  gross_pay: number;
  tax_deductions: number;
  social_insurance: number;
  net_pay: number;
  payment_date: string;
  status: 'PAID' | 'PENDING' | 'PROCESSING';
}

export interface PayrollRunItem {
  id: string;
  period_label: string;
  start_date: string;
  end_date: string;
  employee_count: number;
  total_disbursed: number;
  status: 'COMPLETED' | 'APPROVED' | 'PROCESSING' | 'DRAFT';
  executed_at: string;
}

export interface BankElection {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
  routing_number: string;
  is_primary: boolean;
}

export const PayrollManagement: React.FC = () => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentStaffId = user?.employee_code || 'EMP-DOC-001';
  const currentStaffName = user?.full_name || t('payroll.default_staff_name', 'BS.CKII Nguyễn Văn An');
  const currentDept = user?.department || t('payroll.default_dept', 'Khoa Cấp Cứu & Hồi Sức Tim Mạch');

  const [activeTab, setActiveTab] = useState<'slips' | 'runs' | 'elections'>('slips');

  // Modals
  const [selectedSlip, setSelectedSlip] = useState<PaySlipItem | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [showElectionModal, setShowElectionModal] = useState(false);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  // New Run state
  const [newRunPeriod, setNewRunPeriod] = useState('16/09/2026 – 30/09/2026');
  const [newRunStart, setNewRunStart] = useState('2026-09-16');
  const [newRunEnd, setNewRunEnd] = useState('2026-09-30');

  // New Election state
  const [bankName, setBankName] = useState('Vietcombank');
  const [accNum, setAccNum] = useState('');
  const [routing, setRouting] = useState('VCB-VN-001');

  // TanStack Queries: Fetch live records from MySQL hrm_db
  const { data: serverRuns, isLoading: isRunsLoading } = useQuery({
    queryKey: ['payrollRuns'],
    queryFn: () => payrollApi.getRuns(),
    staleTime: 15000
  });

  const { data: serverSlips, isLoading: isSlipsLoading } = useQuery({
    queryKey: ['payslips', currentStaffId],
    queryFn: () => payrollApi.getPaySlips(currentStaffId),
    staleTime: 15000
  });

  const { data: serverElections } = useQuery({
    queryKey: ['elections', currentStaffId],
    queryFn: () => payrollApi.getElections(currentStaffId),
    staleTime: 15000
  });

  const { data: serverPayRate } = useQuery({
    queryKey: ['payRate', currentStaffId],
    queryFn: () => payrollApi.getRate(currentStaffId),
    staleTime: 30000
  });

  // Mutations
  const createRunMutation = useMutation({
    mutationFn: (payload: { start_date: string; end_date: string }) =>
      payrollApi.createRun(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      setShowRunModal(false);
      setActionAlert(t('payroll.cycle_created_success', 'Chu kỳ quyết toán lương bệnh viện đã được tạo thành công!'));
      setTimeout(() => setActionAlert(null), 4000);
    },
    onError: (err: any) => {
      setActionAlert(`${t('common.error', 'Lỗi')}: ${err.response?.data?.message || err.message}`);
    }
  });

  const createElectionMutation = useMutation({
    mutationFn: (payload: any) => payrollApi.addElection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections', currentStaffId] });
      setShowElectionModal(false);
      setAccNum('');
      setActionAlert(t('payroll.link_bank_success', 'Tài khoản ngân hàng đã được liên kết nhận lương thành công!'));
      setTimeout(() => setActionAlert(null), 4000);
    },
    onError: (err: any) => {
      setActionAlert(`${t('common.error', 'Lỗi')}: ${err.response?.data?.message || err.message}`);
    }
  });

  // Map server slips with dynamic VND calculations
  const slips: PaySlipItem[] = (serverSlips && serverSlips.length > 0)
    ? serverSlips.map((s: any) => {
        const basePay = Number(s.base_pay) || 0;
        const nightDiff = Number(s.night_differential) || 0;
        const otPay = Number(s.overtime_pay) || 0;
        const grossPay = basePay + nightDiff + otPay;
        // Bảo hiểm bắt buộc theo luật lao động VN (10.5%: 8% BHXH, 1.5% BHYT, 1% BHTN)
        const si = Math.round(basePay * 0.105);
        // Thuế TNCN tạm tính theo biểu lũy tiến từng phần
        const taxable = Math.max(0, grossPay - si - 11000000);
        const tax = Math.round(taxable * 0.10);
        const netPay = Number(s.net_pay) || Math.max(0, grossPay - tax - si);
        const periodLabel = s.run_start_date && s.run_end_date
          ? `${s.run_start_date} – ${s.run_end_date}`
          : (s.run_id || t('payroll.kpi_default_period', 'Kỳ Quyết Toán'));

        const rateFromDb = Number(s.base_hourly_rate) || (serverPayRate?.base_hourly_rate ? Number(serverPayRate.base_hourly_rate) : 0);
        const baseHourlyRate = rateFromDb > 0 ? rateFromDb : (basePay > 0 ? Math.round(basePay / 176) : 125000);
        const baseHours = baseHourlyRate > 0 ? Math.round(basePay / baseHourlyRate) : 176;
        const nightHours = baseHourlyRate > 0 ? Math.round(nightDiff / (baseHourlyRate * 0.3)) : (nightDiff > 0 ? 16 : 0);
        const otHours = baseHourlyRate > 0 ? Math.round(otPay / (baseHourlyRate * 1.5)) : (otPay > 0 ? 12 : 0);

        return {
          id: s.id,
          run_id: s.run_id || 'run-2026-09',
          period_label: periodLabel,
          staff_id: s.staff_id,
          staff_name: currentStaffName,
          department_name: currentDept,
          base_hourly_rate: baseHourlyRate,
          base_hours: baseHours,
          base_pay: basePay,
          night_hours: nightHours,
          night_differential: nightDiff,
          overtime_hours: otHours,
          overtime_pay: otPay,
          gross_pay: grossPay,
          tax_deductions: tax,
          social_insurance: si,
          net_pay: netPay,
          payment_date: s.payment_date || (s.created_at ? s.created_at.split('T')[0] : ''),
          status: s.status || 'PAID'
        };
      })
    : [];

  // Map server runs
  const runs: PayrollRunItem[] = (serverRuns && serverRuns.length > 0)
    ? serverRuns.map((r: any) => ({
        id: r.id,
        period_label: `${r.start_date} – ${r.end_date}`,
        start_date: r.start_date,
        end_date: r.end_date,
        employee_count: Number(r.employee_count) || 0,
        total_disbursed: Number(r.total_disbursed) || 0,
        status: r.status || 'COMPLETED',
        executed_at: r.created_at ? r.created_at.split('T')[0] : r.start_date
      }))
    : [];

  // Map server elections
  const elections: BankElection[] = (serverElections && serverElections.length > 0)
    ? serverElections.map((e: any) => ({
        id: e.id,
        bank_name: e.bank_name,
        account_number: `•••• •••• •••• ${e.account_number?.slice(-4) || '••••'}`,
        account_holder: (e.account_holder || currentStaffName).toUpperCase(),
        routing_number: e.routing_number || '',
        is_primary: Boolean(e.is_primary)
      }))
    : [];

  const handleInitiateRun = (e: React.FormEvent) => {
    e.preventDefault();
    createRunMutation.mutate({
      start_date: newRunStart,
      end_date: newRunEnd
    });
  };

  const handleAddElection = (e: React.FormEvent) => {
    e.preventDefault();
    createElectionMutation.mutate({
      staff_id: currentStaffId,
      bank_name: bankName,
      account_number: accNum || '0011004128912',
      routing_number: routing,
      is_primary: elections.length === 0
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(val || 0);
  };

  const currentNet = slips[0]?.net_pay || 0;
  const currentBasePay = slips[0]?.base_pay || (serverPayRate?.base_hourly_rate ? Number(serverPayRate.base_hourly_rate) * 176 : 0);
  const currentBaseRate = slips[0]?.base_hourly_rate || (serverPayRate?.base_hourly_rate ? Number(serverPayRate.base_hourly_rate) : 0);
  const currentNightDiff = slips[0]?.night_differential || 0;
  const currentOT = slips[0]?.overtime_pay || 0;

  return (
    <Container fluid className="px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="wd-page-title">{t('payroll.page_heading', 'Thu Nhập & Đãi Ngộ')}</h1>
          <p className="wd-page-subtitle">
            {t('payroll.page_desc', 'Bảng lương điện tử, phụ cấp ca trực cấp cứu, tài khoản ngân hàng nhận chuyển khoản lương')}
          </p>
        </div>
        <div className="d-flex gap-2">
          {activeTab === 'runs' && (
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowRunModal(true)}
            >
              <Plus size={15} />
              <span>{t('payroll.initiate_cycle_btn', 'Khởi Tạo Chu Kỳ Quyết Toán')}</span>
            </button>
          )}
          {activeTab === 'elections' && (
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowElectionModal(true)}
            >
              <CreditCard size={15} />
              <span>{t('payroll.link_bank_btn', 'Liên Kết Tài Khoản Ngân Hàng')}</span>
            </button>
          )}
        </div>
      </div>

      {actionAlert && (
        <Alert
          variant={actionAlert.startsWith(t('common.error', 'Lỗi')) || actionAlert.toLowerCase().startsWith('error') ? 'danger' : 'success'}
          dismissible
          onClose={() => setActionAlert(null)}
          className="d-flex align-items-center gap-2 py-2.5 mb-4 small rounded-2"
        >
          <CheckCircle2 size={16} />
          <span>{actionAlert}</span>
        </Alert>
      )}

      {/* Support Banner */}
      <div className="wd-support-banner">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            {t('payroll.askhr_title', 'Hỗ trợ Tiền lương')} &bull; {t('payroll.askhr_sub', 'Quyết toán thuế & Chuyển khoản trực tiếp')}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {t('payroll.askhr_desc', 'Thắc mắc về thuế TNCN, đóng BHXH bắt buộc hoặc phụ cấp trực đêm hồi sức? Liên hệ')}{' '}
            <a href="mailto:payroll@hospital.vn" className="fw-semibold text-decoration-none" style={{ color: 'var(--wd-blue)' }}>
              payroll@hospital.vn
            </a>{' '}
            {t('payroll.or_finance_dept', 'hoặc phòng Tài chính Kế toán.')}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="wd-tabs">
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'slips' ? 'active' : ''}`}
          onClick={() => setActiveTab('slips')}
        >
          {t('payroll.tab_my_slips', 'Phiếu Lương Của Tôi')} ({slips.length})
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'elections' ? 'active' : ''}`}
          onClick={() => setActiveTab('elections')}
        >
          {t('payroll.tab_bank_elections', 'Tài Khoản Nhận Lương')} ({elections.length})
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'runs' ? 'active' : ''}`}
          onClick={() => setActiveTab('runs')}
        >
          {t('payroll.tab_hospital_runs', 'Chu Kỳ Quyết Toán Bệnh Viện')} ({runs.length})
        </button>
      </div>

      {/* Tab 1: My Pay Slips */}
      {activeTab === 'slips' && (
        <div>
          {/* Income Summary KPI Cards */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('payroll.kpi_recent_net', 'Thực Lĩnh Kỳ Gần Nhất')}
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px' }}>
                  {formatCurrency(currentNet)}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {t('payroll.kpi_period_prefix', 'Kỳ:')} {slips[0]?.period_label || t('payroll.kpi_default_period', 'Kỳ quyết toán')}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('payroll.kpi_base_monthly', 'Lương Cơ Bản Tháng')}
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px' }}>
                  {formatCurrency(currentBasePay)}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {currentBaseRate > 0 ? `${formatCurrency(currentBaseRate)} ${t('payroll.kpi_rate_suffix', '/ giờ • ')}` : ''}{serverPayRate?.tax_tier || user?.role || t('payroll.kpi_hospital_quota', 'Định mức bệnh viện')}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('payroll.kpi_night_diff', 'Phụ Cấp Trực Đêm')}
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-blue)' }}>
                  +{formatCurrency(currentNightDiff)}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {slips[0]?.night_hours ? `${slips[0].night_hours} ${t('payroll.kpi_night_sub_hours', 'giờ trực ca đêm / hồi sức')}` : t('payroll.kpi_night_sub_default', 'Phụ cấp trực cấp cứu ca đêm')}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('payroll.kpi_ot_title', 'Thù Lao Tăng Ca Lâm Sàng')}
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-amber)' }}>
                  +{formatCurrency(currentOT)}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {slips[0]?.overtime_hours ? `${slips[0].overtime_hours} ${t('payroll.kpi_ot_sub_hours', 'giờ hỗ trợ ngoài giờ')}` : t('payroll.kpi_ot_sub_default', 'Thù lao hỗ trợ ca mổ khẩn')}
                </div>
              </div>
            </Col>
          </Row>

          {/* Pay Slips History Table */}
          <div className="wd-card">
            <div className="wd-card-header">
              <span className="wd-card-title">
                {t('payroll.slips_history_title', 'Lịch Sử Chi Trả Thu Nhập')}
              </span>
              <span className="wd-badge-neutral">{slips.length} {t('payroll.badge_slips', 'Phiếu')}</span>
            </div>
            <div className="table-responsive">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>{t('payroll.th_period', 'KỲ QUYẾT TOÁN')}</th>
                    <th>{t('payroll.th_base', 'LƯƠNG CƠ BẢN')}</th>
                    <th>{t('payroll.th_night', 'PHỤ CẤP ĐÊM')}</th>
                    <th>{t('payroll.th_ot', 'TĂNG CA')}</th>
                    <th>{t('payroll.th_gross', 'TỔNG THU NHẬP')}</th>
                    <th>{t('payroll.th_deductions', 'KHẤU TRỪ')}</th>
                    <th>{t('payroll.th_net', 'THỰC LĨNH')}</th>
                    <th>{t('common.status', 'TRẠNG THÁI').toUpperCase()}</th>
                    <th className="text-end">{t('common.actions', 'THAO TÁC').toUpperCase()}</th>
                  </tr>
                </thead>
                <tbody>
                  {isSlipsLoading ? (
                    <TheoryOfNextLoader isTableBody columns={9} rows={4} />
                  ) : slips.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5 text-muted">
                        {t('payroll.no_slips', 'Chưa có dữ liệu phiếu lương nào cho nhân viên này trong hệ thống.')}
                      </td>
                    </tr>
                  ) : (
                    slips.map((slip) => (
                      <tr key={slip.id}>
                        <td>
                          <div className="fw-semibold text-dark">{slip.period_label}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{t('payroll.paid_date_prefix', 'Chi trả ngày')} {slip.payment_date}</div>
                        </td>
                        <td>
                          <div className="font-mono text-dark">{formatCurrency(slip.base_pay)}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{slip.base_hours} {t('payroll.hours_unit', 'giờ')}</div>
                        </td>
                        <td>
                          <div className="font-mono" style={{ color: 'var(--wd-blue)' }}>+{formatCurrency(slip.night_differential)}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{slip.night_hours} {t('payroll.night_hours_unit', 'giờ đêm')}</div>
                        </td>
                        <td>
                          <div className="font-mono" style={{ color: 'var(--wd-amber)' }}>+{formatCurrency(slip.overtime_pay)}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{slip.overtime_hours} {t('payroll.hours_unit', 'giờ')}</div>
                        </td>
                        <td>
                          <span className="fw-semibold font-mono text-dark">{formatCurrency(slip.gross_pay)}</span>
                        </td>
                        <td>
                          <span className="font-mono" style={{ color: 'var(--wd-red)' }}>
                            -{formatCurrency(slip.tax_deductions + slip.social_insurance)}
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold font-mono" style={{ color: 'var(--wd-green)' }}>
                            {formatCurrency(slip.net_pay)}
                          </span>
                        </td>
                        <td>
                          <span className="wd-badge-success">
                            {t('payroll.status_paid', 'Đã Chi Trả')}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="wd-pill-btn-outline"
                            onClick={() => setSelectedSlip(slip)}
                          >
                            <FileText size={13} />
                            <span>{t('payroll.view_slip_btn', 'Xem Bảng Lương')}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Direct Deposit Bank Elections (Exact match to WD.pdf Page 4) */}
      {activeTab === 'elections' && (
        <div className="wd-card">
          <div className="wd-card-header">
            <div>
              <div className="wd-card-title">{t('payroll.elections_title', 'Tài Khoản Nhận Chuyển Khoản Trực Tiếp')}</div>
              <div className="text-muted" style={{ fontSize: '12px' }}>
                {t('payroll.elections_desc', 'Danh sách tài khoản ngân hàng nhận lương tự động và phân bổ tài chính')}
              </div>
            </div>
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowElectionModal(true)}
            >
              <Plus size={14} />
              <span>{t('payroll.add_election_btn', 'Thêm Tài Khoản Mới')}</span>
            </button>
          </div>
          <div className="table-responsive">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>{t('payroll.th_acc_name', 'TÊN GỌI TÀI KHOẢN')}</th>
                  <th>{t('payroll.th_bank', 'NGÂN HÀNG')}</th>
                  <th>{t('payroll.th_acc_num', 'SỐ TÀI KHOẢN')}</th>
                  <th>{t('payroll.th_routing', 'MÃ ROUTING / SWIFT')}</th>
                  <th>{t('payroll.th_holder', 'CHỦ TÀI KHOẢN')}</th>
                  <th>{t('payroll.th_allocation', 'PHÂN BỔ')}</th>
                  <th className="text-end">{t('common.actions', 'THAO TÁC').toUpperCase()}</th>
                </tr>
              </thead>
              <tbody>
                {elections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      {t('payroll.no_elections', 'Chưa có tài khoản nhận lương nào được liên kết. Vui lòng bấm "Thêm Tài Khoản Mới" để thiết lập.')}
                    </td>
                  </tr>
                ) : (
                  elections.map((elec) => (
                    <tr key={elec.id}>
                      <td>
                        <div className="fw-semibold text-dark">{t('payroll.official_salary', 'Lương Chính Thức')}</div>
                        {elec.is_primary && (
                          <span className="wd-badge-success mt-1" style={{ fontSize: '10px' }}>
                            {t('payroll.default_100', 'Mặc Định 100%')}
                          </span>
                        )}
                      </td>
                      <td className="fw-medium text-dark">{elec.bank_name}</td>
                      <td className="font-mono text-dark">{elec.account_number}</td>
                      <td className="font-mono text-muted">{elec.routing_number || '—'}</td>
                      <td className="text-dark fw-semibold">{elec.account_holder}</td>
                      <td>
                        <span className="wd-badge-neutral">
                          {t('payroll.all_income', 'Toàn Bộ Thu Nhập')}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1.5">
                          <button
                            type="button"
                            className="wd-pill-btn font-mono"
                            style={{ fontSize: '11px', padding: '3px 10px' }}
                            onClick={() => setActionAlert(t('payroll.edit_ready', 'Chế độ chỉnh sửa tài khoản đã sẵn sàng.'))}
                          >
                            {t('payroll.edit_btn', 'Sửa')}
                          </button>
                          <button
                            type="button"
                            className="wd-pill-btn font-mono"
                            style={{ fontSize: '11px', padding: '3px 10px' }}
                            onClick={() => setActionAlert(t('payroll.cannot_delete_primary', 'Không thể xóa tài khoản nhận lương mặc định duy nhất.'))}
                          >
                            {t('payroll.delete_btn', 'Xóa')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Payroll Run Cycles */}
      {activeTab === 'runs' && (
        <div>
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={4}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('payroll.kpi_total_disbursed', 'Tổng Chi Trả Chu Kỳ')}
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px' }}>
                  {formatCurrency(runs.reduce((acc, r) => acc + (Number(r.total_disbursed) || 0), 0))}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {t('payroll.kpi_disbursed_sub', 'Tổng kinh phí quyết toán qua các đợt chi trả')}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={4}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('payroll.kpi_latest_run', 'Đợt Quyết Toán Gần Nhất')}
                </div>
                <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-amber)' }}>
                  {runs[0] ? runs[0].period_label : t('payroll.kpi_no_run', 'Chưa có đợt nào')}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {runs[0] ? `${runs[0].employee_count} ${t('payroll.kpi_staff_suffix', 'nhân sự •')} ${runs[0].status}` : t('payroll.kpi_no_data', 'Chưa có dữ liệu')}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={4}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('payroll.kpi_auto_transfer', 'Tự Động Hóa Chuyển Khoản')}
                </div>
                <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-green)' }}>
                  {runs.length > 0 ? t('payroll.kpi_complete', '100% Hoàn Tất') : t('payroll.kpi_ready', 'Sẵn sàng')}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {t('payroll.kpi_interbank', 'Kết nối hệ thống ngân hàng liên mạng')}
                </div>
              </div>
            </Col>
          </Row>

          <div className="wd-card">
            <div className="wd-card-header">
              <span className="wd-card-title">{t('payroll.runs_title', 'Các Đợt Quyết Toán Lương Bán Nguyệt')}</span>
              <span className="wd-badge-neutral">{runs.length} {t('payroll.badge_runs', 'Đợt')}</span>
            </div>
            <div className="table-responsive">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>{t('payroll.th_run_code', 'MÃ ĐỢT QUYẾT TOÁN')}</th>
                    <th>{t('payroll.th_cycle', 'CHU KỲ')}</th>
                    <th>{t('payroll.th_headcount', 'SỐ LƯỢNG NHÂN SỰ')}</th>
                    <th>{t('payroll.th_total_fund', 'TỔNG KINH PHÍ CHI TRẢ')}</th>
                    <th>{t('payroll.th_exec_date', 'NGÀY THỰC HIỆN')}</th>
                    <th>{t('common.status', 'TRẠNG THÁI').toUpperCase()}</th>
                    <th className="text-end">{t('common.actions', 'THAO TÁC').toUpperCase()}</th>
                  </tr>
                </thead>
                <tbody>
                  {isRunsLoading ? (
                    <TheoryOfNextLoader isTableBody columns={7} rows={4} />
                  ) : runs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        {t('payroll.no_runs', 'Chưa có đợt quyết toán lương nào được khởi tạo trong hệ thống.')}
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id}>
                        <td className="font-mono fw-semibold text-dark">{run.id}</td>
                        <td>
                          <div className="fw-semibold text-dark">{run.period_label}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{run.start_date} {t('payroll.to', 'đến')} {run.end_date}</div>
                        </td>
                        <td className="fw-medium text-dark">{run.employee_count} {t('payroll.employees_suffix', 'nhân viên')}</td>
                        <td className="fw-bold font-mono text-dark">{formatCurrency(run.total_disbursed)}</td>
                        <td className="text-secondary">{run.executed_at}</td>
                        <td>
                          <span className={run.status === 'COMPLETED' ? 'wd-badge-success' : 'wd-badge-warning'}>
                            {run.status === 'COMPLETED' ? t('payroll.status_completed', 'Hoàn Tất') : t('payroll.status_processing', 'Đang Xử Lý')}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="wd-pill-btn-outline"
                            onClick={() => setActionAlert(`${t('payroll.inspect_btn', 'Kiểm Tra')} ${run.id}`)}
                          >
                            {t('payroll.inspect_btn', 'Kiểm Tra')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Itemized Pay Slip Modal */}
      {selectedSlip && (
        <Modal show={true} onHide={() => setSelectedSlip(null)} size="lg" centered>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <div className="d-flex align-items-center gap-2">
              <Building2 size={20} style={{ color: 'var(--wd-blue)' }} />
              <div>
                <Modal.Title className="fw-bold fs-6 text-dark mb-0">
                  {t('payroll.modal_slip_title', 'Bệnh Viện Đa Khoa • Bảng Kê Thu Nhập & Chi Tiết Lương Điện Tử')}
                </Modal.Title>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  {t('payroll.modal_slip_subtitle', 'Phiếu Lương Điện Tử Chuẩn Y Tế • Kỳ:')} {selectedSlip.period_label}
                </div>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="p-4">
            {/* Header info */}
            <div className="p-3 rounded-2 border mb-4" style={{ backgroundColor: '#f9fafb', borderColor: 'var(--wd-border)' }}>
              <Row className="g-3">
                <Col xs={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px' }}>{t('payroll.lbl_staff_name', 'Họ Tên Bác Sĩ / Nhân Viên')}</div>
                  <div className="fw-bold text-dark mt-0.5">{selectedSlip.staff_name}</div>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>{selectedSlip.staff_id}</span>
                </Col>
                <Col xs={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px' }}>{t('payroll.lbl_center_dept', 'Khoa / Trung Tâm Lâm Sàng')}</div>
                  <div className="fw-bold text-dark mt-0.5">{selectedSlip.department_name}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>{t('payroll.lbl_payment_date', 'Ngày chi trả:')} {selectedSlip.payment_date}</div>
                </Col>
              </Row>
            </div>

            {/* Earnings Breakdown */}
            <div className="fw-bold text-dark mb-2" style={{ fontSize: '13px' }}>{t('payroll.section_earnings', '1. Chi Tiết Thu Nhập & Phụ Cấp Lâm Sàng')}</div>
            <table className="wd-table mb-4 border rounded-2 overflow-hidden">
              <thead>
                <tr>
                  <th>{t('payroll.th_earning_item', 'Khoản Thu Nhập')}</th>
                  <th className="text-center">{t('payroll.th_hours', 'Số Giờ')}</th>
                  <th className="text-end">{t('payroll.th_rate', 'Đơn Giá / Giờ')}</th>
                  <th className="text-end">{t('payroll.th_amount', 'Thành Tiền')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('payroll.item_base_pay', 'Lương Trực Ca Cơ Bản')}</td>
                  <td className="text-center font-mono">{selectedSlip.base_hours} {t('payroll.hours_unit', 'giờ')}</td>
                  <td className="text-end font-mono">{formatCurrency(selectedSlip.base_hourly_rate)}</td>
                  <td className="text-end fw-semibold font-mono">{formatCurrency(selectedSlip.base_pay)}</td>
                </tr>
                <tr>
                  <td>{t('payroll.item_night_diff', 'Phụ Cấp Trực Đêm Cấp Cứu')}</td>
                  <td className="text-center font-mono">{selectedSlip.night_hours} {t('payroll.hours_unit', 'giờ')}</td>
                  <td className="text-end font-mono">{formatCurrency(selectedSlip.base_hourly_rate * 0.3)}</td>
                  <td className="text-end fw-semibold font-mono" style={{ color: 'var(--wd-blue)' }}>+{formatCurrency(selectedSlip.night_differential)}</td>
                </tr>
                <tr>
                  <td>{t('payroll.item_overtime', 'Thù Lao Tăng Ca Lâm Sàng')}</td>
                  <td className="text-center font-mono">{selectedSlip.overtime_hours} {t('payroll.hours_unit', 'giờ')}</td>
                  <td className="text-end font-mono">{formatCurrency(selectedSlip.base_hourly_rate * 1.5)}</td>
                  <td className="text-end fw-semibold font-mono" style={{ color: 'var(--wd-amber)' }}>+{formatCurrency(selectedSlip.overtime_pay)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  <td colSpan={3}>{t('payroll.item_gross_income', 'Tổng Thu Nhập Trước Khấu Trừ')}</td>
                  <td className="text-end font-mono">{formatCurrency(selectedSlip.gross_pay)}</td>
                </tr>
              </tbody>
            </table>

            {/* Deductions Breakdown */}
            <div className="fw-bold text-dark mb-2" style={{ fontSize: '13px' }}>{t('payroll.section_deductions', '2. Các Khoản Khấu Trừ Theo Quy Định Pháp Luật')}</div>
            <table className="wd-table mb-4 border rounded-2 overflow-hidden">
              <thead>
                <tr>
                  <th>{t('payroll.th_deduction_item', 'Khoản Khấu Trừ')}</th>
                  <th className="text-end">{t('payroll.th_deduction_amount', 'Số Tiền Trừ')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t('payroll.item_pit', 'Thuế Thu Nhập Cá Nhân')}</td>
                  <td className="text-end font-mono" style={{ color: 'var(--wd-red)' }}>-{formatCurrency(selectedSlip.tax_deductions)}</td>
                </tr>
                <tr>
                  <td>{t('payroll.item_insurance', 'Bảo Hiểm Bắt Buộc')}</td>
                  <td className="text-end font-mono" style={{ color: 'var(--wd-red)' }}>-{formatCurrency(selectedSlip.social_insurance)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  <td>{t('payroll.item_total_deductions', 'Tổng Khấu Trừ Nghĩa Vụ')}</td>
                  <td className="text-end font-mono" style={{ color: 'var(--wd-red)' }}>
                    -{formatCurrency(selectedSlip.tax_deductions + selectedSlip.social_insurance)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Net Pay Final Box */}
            <div className="p-3 rounded-2 border d-flex align-items-center justify-content-between" style={{ backgroundColor: 'var(--wd-green-bg)', borderColor: 'var(--wd-green-border)' }}>
              <div>
                <div className="fw-bold text-uppercase" style={{ color: 'var(--wd-green)', fontSize: '11px', letterSpacing: '0.04em' }}>
                  {t('payroll.box_net_deposit', 'Thực Lĩnh Chuyển Khoản Trực Tiếp')}
                </div>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  {t('payroll.box_transferred_desc', 'Đã chuyển vào tài khoản ngân hàng mặc định')}
                </div>
              </div>
              <div className="fw-bold font-mono" style={{ fontSize: '24px', color: 'var(--wd-green)' }}>
                {formatCurrency(selectedSlip.net_pay)}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5 d-flex justify-content-between" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => window.print()}
            >
              <FileText size={14} />
              <span>{t('payroll.btn_print_slip', 'In Bảng Kê Lương')}</span>
            </button>
            <button
              type="button"
              className="wd-pill-btn"
              onClick={() => setSelectedSlip(null)}
            >
              {t('payroll.btn_close', 'Đóng')}
            </button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Initiate Payroll Run Modal */}
      <Modal show={showRunModal} onHide={() => setShowRunModal(false)} centered>
        <Form onSubmit={handleInitiateRun}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('payroll.modal_run_title', 'Khởi Tạo Chu Kỳ Quyết Toán Lương Bán Nguyệt')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">{t('payroll.lbl_period_name', 'Tên Chu Kỳ')}</label>
              <input
                required
                value={newRunPeriod}
                onChange={(e) => setNewRunPeriod(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <label className="wd-label">{t('payroll.lbl_start_date', 'Ngày Bắt Đầu')}</label>
                <input
                  type="date"
                  required
                  value={newRunStart}
                  onChange={(e) => setNewRunStart(e.target.value)}
                  className="wd-input w-100"
                />
              </Col>
              <Col xs={6}>
                <label className="wd-label">{t('payroll.lbl_end_date', 'Ngày Kết Thúc')}</label>
                <input
                  type="date"
                  required
                  value={newRunEnd}
                  onChange={(e) => setNewRunEnd(e.target.value)}
                  className="wd-input w-100"
                />
              </Col>
            </Row>

            <div className="p-3 rounded-2 small text-muted border" style={{ backgroundColor: '#f9fafb', borderColor: 'var(--wd-border)' }}>
              {t('payroll.run_calculation_note', 'Hệ thống sẽ tự động tổng hợp toàn bộ dữ liệu chấm công vân tay, đối chiếu phụ cấp ca đêm và thù lao phẫu thuật ngoài giờ cho toàn bộ cán bộ y tế.')}
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowRunModal(false)}
            >
              {t('payroll.btn_cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={createRunMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {createRunMutation.isPending ? t('payroll.btn_calculating', 'Đang tính toán...') : t('payroll.btn_confirm_run', 'Xác Nhận & Khởi Chạy')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Link Bank Account Modal */}
      <Modal show={showElectionModal} onHide={() => setShowElectionModal(false)} centered>
        <Form onSubmit={handleAddElection}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('payroll.modal_election_title', 'Liên Kết Tài Khoản Ngân Hàng Nhận Lương')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">{t('payroll.lbl_beneficiary_bank', 'Ngân Hàng Thụ Hưởng')}</label>
              <select
                aria-label={t('payroll.lbl_beneficiary_bank', 'Ngân Hàng Thụ Hưởng')}
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  if (e.target.value.includes('Vietcombank')) setRouting('VCB-VN-001');
                  else if (e.target.value.includes('Techcombank')) setRouting('TCB-VN-042');
                  else if (e.target.value.includes('VietinBank')) setRouting('CTG-VN-012');
                  else if (e.target.value.includes('Agribank')) setRouting('VBA-VN-005');
                  else if (e.target.value.includes('MBBank')) setRouting('MB-VN-023');
                  else setRouting('BIDV-VN-018');
                }}
                className="wd-select w-100"
              >
                <option value="Vietcombank">Vietcombank</option>
                <option value="BIDV">BIDV</option>
                <option value="VietinBank">VietinBank</option>
                <option value="Agribank">Agribank</option>
                <option value="MBBank">MBBank</option>
                <option value="Techcombank">Techcombank</option>
              </select>
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('payroll.lbl_acc_num', 'Số Tài Khoản')}</label>
              <input
                required
                placeholder={t('payroll.lbl_acc_placeholder', 'VD: 0011004128912')}
                value={accNum}
                onChange={(e) => setAccNum(e.target.value)}
                className="wd-input w-100 font-mono"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('payroll.lbl_routing_code', 'Mã Routing / Chi Nhánh')}</label>
              <input
                required
                value={routing}
                onChange={(e) => setRouting(e.target.value)}
                className="wd-input w-100 font-mono"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowElectionModal(false)}
            >
              {t('payroll.btn_cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={createElectionMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {createElectionMutation.isPending ? t('payroll.btn_saving', 'Đang lưu...') : t('payroll.btn_save_account', 'Lưu Tài Khoản')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PayrollManagement;
