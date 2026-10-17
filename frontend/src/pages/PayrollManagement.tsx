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
  Printer,
  FileText,
  Landmark,
  ShieldCheck,
  Plus,
  Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../api/payrollApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

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
  const currentStaffName = user?.full_name || 'BS.CKII Nguyễn Văn An';
  const currentDept = user?.department || 'Khoa Cấp Cứu & Hồi Sức Tim Mạch';

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
  const [bankName, setBankName] = useState('Ngân hàng TMCP Ngoại thương Việt Nam - Vietcombank');
  const [accNum, setAccNum] = useState('');
  const [routing, setRouting] = useState('VCB-VN-001');

  // TanStack Queries: Fetch live records from MySQL hrm_db
  const { data: serverRuns } = useQuery({
    queryKey: ['payrollRuns'],
    queryFn: () => payrollApi.getRuns(),
    staleTime: 15000
  });

  const { data: serverSlips } = useQuery({
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
      setActionAlert(`Chu kỳ quyết toán lương bệnh viện đã được tạo thành công!`);
      setTimeout(() => setActionAlert(null), 4000);
    },
    onError: (err: any) => {
      setActionAlert(`Lỗi: ${err.response?.data?.message || err.message}`);
    }
  });

  const createElectionMutation = useMutation({
    mutationFn: (payload: any) => payrollApi.addElection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections', currentStaffId] });
      setShowElectionModal(false);
      setAccNum('');
      setActionAlert(`Tài khoản ngân hàng (${bankName}) đã được liên kết nhận lương thành công!`);
      setTimeout(() => setActionAlert(null), 4000);
    },
    onError: (err: any) => {
      setActionAlert(`Lỗi: ${err.response?.data?.message || err.message}`);
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
          : (s.run_id || 'Kỳ Quyết Toán');

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
          <h1 className="wd-page-title">Thu Nhập &amp; Đãi Ngộ (My Pay &amp; Compensation)</h1>
          <p className="wd-page-subtitle">
            Bảng lương điện tử, phụ cấp ca trực cấp cứu, tài khoản ngân hàng chuyển khoản theo chuẩn Workday
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
              <span>Khởi Tạo Chu Kỳ Quyết Toán</span>
            </button>
          )}
          {activeTab === 'elections' && (
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowElectionModal(true)}
            >
              <Landmark size={15} />
              <span>Liên Kết Tài Khoản Ngân Hàng</span>
            </button>
          )}
        </div>
      </div>

      {actionAlert && (
        <Alert
          variant={actionAlert.startsWith('Lỗi') ? 'danger' : 'success'}
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
            Hỗ trợ Tiền lương (AskHR Payroll) &bull; Quyết toán thuế &amp; Chuyển khoản trực tiếp
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            Thắc mắc về thuế TNCN, đóng BHXH bắt buộc hoặc phụ cấp trực đêm hồi sức? Liên hệ{' '}
            <a href="mailto:payroll@hospital.vn" className="fw-semibold text-decoration-none" style={{ color: 'var(--wd-blue)' }}>
              payroll@hospital.vn
            </a>{' '}
            hoặc phòng Tài chính Kế toán.
          </div>
        </div>
      </div>

      {/* Workday Navigation Tabs */}
      <div className="wd-tabs">
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'slips' ? 'active' : ''}`}
          onClick={() => setActiveTab('slips')}
        >
          Phiếu Lương Của Tôi ({slips.length})
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'elections' ? 'active' : ''}`}
          onClick={() => setActiveTab('elections')}
        >
          Tài Khoản Nhận Lương ({elections.length})
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'runs' ? 'active' : ''}`}
          onClick={() => setActiveTab('runs')}
        >
          Chu Kỳ Quyết Toán Bệnh Viện ({runs.length})
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
                  Thực Lĩnh Kỳ Gần Nhất
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px' }}>
                  {formatCurrency(currentNet)}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  Kỳ: {slips[0]?.period_label || 'Kỳ quyết toán'}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  Lương Cơ Bản Tháng
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px' }}>
                  {formatCurrency(currentBasePay)}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {currentBaseRate > 0 ? `${formatCurrency(currentBaseRate)} / giờ • ` : ''}{serverPayRate?.tax_tier || user?.role || 'Định mức bệnh viện'}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  Phụ Cấp Trực Đêm (+30%)
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-blue)' }}>
                  +{formatCurrency(currentNightDiff)}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {slips[0]?.night_hours ? `${slips[0].night_hours} giờ trực ca đêm / hồi sức` : 'Phụ cấp trực cấp cứu ca đêm'}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  Thù Lao Tăng Ca Lâm Sàng
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-amber)' }}>
                  +{formatCurrency(currentOT)}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {slips[0]?.overtime_hours ? `${slips[0].overtime_hours} giờ hỗ trợ ngoài giờ` : 'Thù lao hỗ trợ ca mổ khẩn'}
                </div>
              </div>
            </Col>
          </Row>

          {/* Pay Slips History Table */}
          <div className="wd-card">
            <div className="wd-card-header">
              <span className="wd-card-title">
                Lịch Sử Chi Trả Thu Nhập (Historical Compensation Statements)
              </span>
              <span className="wd-badge-neutral">{slips.length} Phiếu</span>
            </div>
            <div className="table-responsive">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>{lang === 'vi' ? 'KỲ QUYẾT TOÁN' : 'PAYROLL PERIOD'}</th>
                    <th>{lang === 'vi' ? 'LƯƠNG CƠ BẢN' : 'BASE SALARY'}</th>
                    <th>{lang === 'vi' ? 'PHỤ CẤP ĐÊM' : 'NIGHT ALLOWANCE'}</th>
                    <th>{lang === 'vi' ? 'TĂNG CA' : 'OVERTIME'}</th>
                    <th>{lang === 'vi' ? 'TỔNG THU NHẬP' : 'GROSS INCOME'}</th>
                    <th>{lang === 'vi' ? 'KHẤU TRỪ' : 'DEDUCTIONS'}</th>
                    <th>{lang === 'vi' ? 'THỰC LĨNH' : 'NET PAY'}</th>
                    <th>{t('common.status', 'TRẠNG THÁI').toUpperCase()}</th>
                    <th className="text-end">{t('common.actions', 'THAO TÁC').toUpperCase()}</th>
                  </tr>
                </thead>
                <tbody>
                  {slips.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-5 text-muted">
                        Chưa có dữ liệu phiếu lương nào cho nhân viên này trong hệ thống.
                      </td>
                    </tr>
                  ) : (
                    slips.map((slip) => (
                      <tr key={slip.id}>
                        <td>
                          <div className="fw-semibold text-dark">{slip.period_label}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>Chi trả ngày {slip.payment_date}</div>
                        </td>
                        <td>
                          <div className="font-mono text-dark">{formatCurrency(slip.base_pay)}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{slip.base_hours} giờ</div>
                        </td>
                        <td>
                          <div className="font-mono" style={{ color: 'var(--wd-blue)' }}>+{formatCurrency(slip.night_differential)}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{slip.night_hours} giờ đêm</div>
                        </td>
                        <td>
                          <div className="font-mono" style={{ color: 'var(--wd-amber)' }}>+{formatCurrency(slip.overtime_pay)}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{slip.overtime_hours} giờ</div>
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
                            Đã Chi Trả
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="wd-pill-btn-outline"
                            onClick={() => setSelectedSlip(slip)}
                          >
                            <FileText size={13} />
                            <span>Xem Bảng Lương</span>
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
              <div className="wd-card-title">{lang === 'vi' ? 'Tài Khoản Nhận Chuyển Khoản Trực Tiếp' : 'Payment Elections'}</div>
              <div className="text-muted" style={{ fontSize: '12px' }}>
                {lang === 'vi' ? 'Danh sách tài khoản ngân hàng nhận lương tự động và phân bổ tài chính' : 'Manage automated direct deposit bank accounts and allocations'}
              </div>
            </div>
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowElectionModal(true)}
            >
              <Plus size={14} />
              <span>Thêm Tài Khoản Mới</span>
            </button>
          </div>
          <div className="table-responsive">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>TÊN GỌI TÀI KHOẢN</th>
                  <th>NGÂN HÀNG</th>
                  <th>SỐ TÀI KHOẢN</th>
                  <th>MÃ ROUTING / SWIFT</th>
                  <th>CHỦ TÀI KHOẢN</th>
                  <th>PHÂN BỔ</th>
                  <th className="text-end">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {elections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-muted">
                      Chưa có tài khoản nhận lương nào được liên kết. Vui lòng bấm &quot;Thêm Tài Khoản Mới&quot; để thiết lập.
                    </td>
                  </tr>
                ) : (
                  elections.map((elec) => (
                    <tr key={elec.id}>
                      <td>
                        <div className="fw-semibold text-dark">Lương Chính Thức</div>
                        {elec.is_primary && (
                          <span className="wd-badge-success mt-1" style={{ fontSize: '10px' }}>
                            Mặc Định 100%
                          </span>
                        )}
                      </td>
                      <td className="fw-medium text-dark">{elec.bank_name}</td>
                      <td className="font-mono text-dark">{elec.account_number}</td>
                      <td className="font-mono text-muted">{elec.routing_number || '—'}</td>
                      <td className="text-dark fw-semibold">{elec.account_holder}</td>
                      <td>
                        <span className="wd-badge-neutral">
                          Toàn Bộ Thu Nhập
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1.5">
                          <button
                            type="button"
                            className="wd-pill-btn font-mono"
                            style={{ fontSize: '11px', padding: '3px 10px' }}
                            onClick={() => setActionAlert(`Chế độ chỉnh sửa tài khoản ${elec.bank_name} đã sẵn sàng.`)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="wd-pill-btn font-mono"
                            style={{ fontSize: '11px', padding: '3px 10px' }}
                            onClick={() => setActionAlert(`Không thể xóa tài khoản nhận lương mặc định duy nhất.`)}
                          >
                            Xóa
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
                  Tổng Chi Trả Chu Kỳ (Total Disbursed)
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '22px' }}>
                  {formatCurrency(runs.reduce((acc, r) => acc + (Number(r.total_disbursed) || 0), 0))}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  Tổng kinh phí quyết toán qua {runs.length} đợt chi trả
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={4}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  Đợt Quyết Toán Gần Nhất
                </div>
                <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-amber)' }}>
                  {runs[0] ? runs[0].period_label : 'Chưa có đợt nào'}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  {runs[0] ? `${runs[0].employee_count} nhân sự • ${runs[0].status}` : 'Chưa có dữ liệu'}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={4}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  Tự Động Hóa Chuyển Khoản
                </div>
                <div className="fw-bold mt-1 font-mono" style={{ fontSize: '22px', color: 'var(--wd-green)' }}>
                  {runs.length > 0 ? '100% Hoàn Tất' : 'Sẵn sàng'}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                  Kết nối hệ thống ngân hàng liên mạng
                </div>
              </div>
            </Col>
          </Row>

          <div className="wd-card">
            <div className="wd-card-header">
              <span className="wd-card-title">Các Đợt Quyết Toán Lương Bán Nguyệt</span>
              <span className="wd-badge-neutral">{runs.length} Đợt</span>
            </div>
            <div className="table-responsive">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>MÃ ĐỢT QUYẾT TOÁN</th>
                    <th>CHU KỲ</th>
                    <th>SỐ LƯỢNG NHÂN SỰ</th>
                    <th>TỔNG KINH PHÍ CHI TRẢ</th>
                    <th>NGÀY THỰC HIỆN</th>
                    <th>TRẠNG THÁI</th>
                    <th className="text-end">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        Chưa có đợt quyết toán lương nào được khởi tạo trong hệ thống.
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id}>
                        <td className="font-mono fw-semibold text-dark">{run.id}</td>
                        <td>
                          <div className="fw-semibold text-dark">{run.period_label}</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{run.start_date} đến {run.end_date}</div>
                        </td>
                        <td className="fw-medium text-dark">{run.employee_count} nhân viên</td>
                        <td className="fw-bold font-mono text-dark">{formatCurrency(run.total_disbursed)}</td>
                        <td className="text-secondary">{run.executed_at}</td>
                        <td>
                          <span className={run.status === 'COMPLETED' ? 'wd-badge-success' : 'wd-badge-warning'}>
                            {run.status === 'COMPLETED' ? 'Hoàn Tất' : 'Đang Xử Lý'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="wd-pill-btn-outline"
                            onClick={() => setActionAlert(`Đang kiểm tra chi tiết bảng kiểm kê đợt ${run.id}...`)}
                          >
                            Kiểm Tra
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

      {/* Itemized Pay Slip Modal (Workday Statement Layout) */}
      {selectedSlip && (
        <Modal show={true} onHide={() => setSelectedSlip(null)} size="lg" centered>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <div className="d-flex align-items-center gap-2">
              <Building2 size={20} style={{ color: 'var(--wd-blue)' }} />
              <div>
                <Modal.Title className="fw-bold fs-6 text-dark mb-0">
                  Bệnh Viện Đa Khoa &bull; Bảng Kê Thu Nhập &amp; Chi Tiết Lương Điện Tử
                </Modal.Title>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  Phiếu Lương Điện Tử Chuẩn Y Tế &bull; Kỳ: {selectedSlip.period_label}
                </div>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="p-4">
            {/* Header info */}
            <div className="p-3 rounded-2 border mb-4" style={{ backgroundColor: '#f9fafb', borderColor: 'var(--wd-border)' }}>
              <Row className="g-3">
                <Col xs={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px' }}>Họ Tên Bác Sĩ / Nhân Viên</div>
                  <div className="fw-bold text-dark mt-0.5">{selectedSlip.staff_name}</div>
                  <span className="font-mono text-muted" style={{ fontSize: '11px' }}>{selectedSlip.staff_id}</span>
                </Col>
                <Col xs={6}>
                  <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px' }}>Khoa / Trung Tâm Lâm Sàng</div>
                  <div className="fw-bold text-dark mt-0.5">{selectedSlip.department_name}</div>
                  <div className="text-muted" style={{ fontSize: '11px' }}>Ngày chi trả: {selectedSlip.payment_date}</div>
                </Col>
              </Row>
            </div>

            {/* Earnings Breakdown */}
            <div className="fw-bold text-dark mb-2" style={{ fontSize: '13px' }}>1. Chi Tiết Thu Nhập &amp; Phụ Cấp Lâm Sàng</div>
            <table className="wd-table mb-4 border rounded-2 overflow-hidden">
              <thead>
                <tr>
                  <th>Khoản Thu Nhập</th>
                  <th className="text-center">Số Giờ</th>
                  <th className="text-end">Đơn Giá / Giờ</th>
                  <th className="text-end">Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{lang === 'vi' ? 'Lương Trực Ca Cơ Bản' : 'Regular Clinical Pay'}</td>
                  <td className="text-center font-mono">{selectedSlip.base_hours} giờ</td>
                  <td className="text-end font-mono">{formatCurrency(selectedSlip.base_hourly_rate)}</td>
                  <td className="text-end fw-semibold font-mono">{formatCurrency(selectedSlip.base_pay)}</td>
                </tr>
                <tr>
                  <td>{lang === 'vi' ? 'Phụ Cấp Trực Đêm Cấp Cứu' : 'Emergency Night Differential'}</td>
                  <td className="text-center font-mono">{selectedSlip.night_hours} giờ</td>
                  <td className="text-end font-mono">{formatCurrency(selectedSlip.base_hourly_rate * 0.3)}</td>
                  <td className="text-end fw-semibold font-mono" style={{ color: 'var(--wd-blue)' }}>+{formatCurrency(selectedSlip.night_differential)}</td>
                </tr>
                <tr>
                  <td>{lang === 'vi' ? 'Thù Lao Tăng Ca Lâm Sàng' : 'Clinical Overtime Pay'}</td>
                  <td className="text-center font-mono">{selectedSlip.overtime_hours} giờ</td>
                  <td className="text-end font-mono">{formatCurrency(selectedSlip.base_hourly_rate * 1.5)}</td>
                  <td className="text-end fw-semibold font-mono" style={{ color: 'var(--wd-amber)' }}>+{formatCurrency(selectedSlip.overtime_pay)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  <td colSpan={3}>{lang === 'vi' ? 'Tổng Thu Nhập Trước Khấu Trừ' : 'Gross Income'}</td>
                  <td className="text-end font-mono">{formatCurrency(selectedSlip.gross_pay)}</td>
                </tr>
              </tbody>
            </table>

            {/* Deductions Breakdown */}
            <div className="fw-bold text-dark mb-2" style={{ fontSize: '13px' }}>2. Các Khoản Khấu Trừ Theo Quy Định Pháp Luật</div>
            <table className="wd-table mb-4 border rounded-2 overflow-hidden">
              <thead>
                <tr>
                  <th>{lang === 'vi' ? 'Khoản Khấu Trừ' : 'Deduction Item'}</th>
                  <th className="text-end">{lang === 'vi' ? 'Số Tiền Trừ' : 'Deducted Amount'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{lang === 'vi' ? 'Thuế Thu Nhập Cá Nhân' : 'Personal Income Tax'}</td>
                  <td className="text-end font-mono" style={{ color: 'var(--wd-red)' }}>-{formatCurrency(selectedSlip.tax_deductions)}</td>
                </tr>
                <tr>
                  <td>{lang === 'vi' ? 'Bảo Hiểm Bắt Buộc' : 'Mandatory Social & Health Insurance'}</td>
                  <td className="text-end font-mono" style={{ color: 'var(--wd-red)' }}>-{formatCurrency(selectedSlip.social_insurance)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                  <td>{lang === 'vi' ? 'Tổng Khấu Trừ Nghĩa Vụ' : 'Total Mandatory Deductions'}</td>
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
                  Thực Lĩnh Chuyển Khoản Trực Tiếp (Net Direct Deposit)
                </div>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  Đã chuyển vào tài khoản Vietcombank mặc định
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
              <Printer size={14} />
              <span>In Bảng Kê Lương</span>
            </button>
            <button
              type="button"
              className="wd-pill-btn"
              onClick={() => setSelectedSlip(null)}
            >
              Đóng
            </button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Initiate Payroll Run Modal */}
      <Modal show={showRunModal} onHide={() => setShowRunModal(false)} centered>
        <Form onSubmit={handleInitiateRun}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              Khởi Tạo Chu Kỳ Quyết Toán Lương Bán Nguyệt
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">Tên Chu Kỳ</label>
              <input
                required
                value={newRunPeriod}
                onChange={(e) => setNewRunPeriod(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <label className="wd-label">Ngày Bắt Đầu</label>
                <input
                  type="date"
                  required
                  value={newRunStart}
                  onChange={(e) => setNewRunStart(e.target.value)}
                  className="wd-input w-100"
                />
              </Col>
              <Col xs={6}>
                <label className="wd-label">Ngày Kết Thúc</label>
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
              Hệ thống sẽ tự động tổng hợp toàn bộ dữ liệu chấm công vân tay, đối chiếu phụ cấp ca đêm (+30%) và thù lao phẫu thuật ngoài giờ cho toàn bộ cán bộ y tế.
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowRunModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createRunMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {createRunMutation.isPending ? 'Đang tính toán...' : 'Xác Nhận & Khởi Chạy'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Link Bank Account Modal */}
      <Modal show={showElectionModal} onHide={() => setShowElectionModal(false)} centered>
        <Form onSubmit={handleAddElection}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              Liên Kết Tài Khoản Ngân Hàng Nhận Lương
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">Ngân Hàng Thụ Hưởng</label>
              <select
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
                <option value="Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)">
                  Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)
                </option>
                <option value="Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)">
                  Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)
                </option>
                <option value="Ngân hàng TMCP Công Thương Việt Nam (VietinBank)">
                  Ngân hàng TMCP Công Thương Việt Nam (VietinBank)
                </option>
                <option value="Ngân hàng Nông nghiệp &amp; Phát triển Nông thôn (Agribank)">
                  Ngân hàng Nông nghiệp &amp; Phát triển Nông thôn (Agribank)
                </option>
                <option value="Ngân hàng TMCP Quân Đội (MBBank)">
                  Ngân hàng TMCP Quân Đội (MBBank)
                </option>
                <option value="Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)">
                  Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)
                </option>
              </select>
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">Số Tài Khoản</label>
              <input
                required
                placeholder="VD: 0011004128912"
                value={accNum}
                onChange={(e) => setAccNum(e.target.value)}
                className="wd-input w-100 font-mono"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">Mã Routing / Chi Nhánh</label>
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
              Hủy
            </button>
            <button
              type="submit"
              disabled={createElectionMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {createElectionMutation.isPending ? 'Đang lưu...' : 'Lưu Tài Khoản'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PayrollManagement;
