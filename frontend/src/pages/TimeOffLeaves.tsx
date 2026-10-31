import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Modal,
  Form,
  Alert
} from 'react-bootstrap';
import {
  Plus,
  ExternalLink,
  Info,
  Calendar,
  Clock,
  FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../api/leaveApi';
import { employeeApi } from '../api/employeeApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';
import { TheoryOfNextLoader } from '../components/common/TheoryOfNextLoader';

interface LeaveBalanceItem {
  id: string;
  type: string;
  name: string;
  availableDays: number | string;
  totalDays: number | string;
  note: string;
}

interface UpcomingLeave {
  id: string;
  dateRange: string;
  type: string;
  quantity: string;
  status: 'APPROVED' | 'PENDING' | 'CANCELLED';
}

export const TimeOffLeaves: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isHRorAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';
  const currentStaffId = user?.employee_code || 'EMP-DOC-001';
  const { t, lang } = useTranslation();

  const policyLinks = [
    {
      title: t('timeoff.policy_1_title', 'Lịch nghỉ lễ chính thức 2026 của Nhà nước'),
      desc: t('timeoff.policy_1_desc', 'Quy định các ngày nghỉ lễ, Tết hưởng nguyên lương theo Bộ luật Lao động')
    },
    {
      title: t('timeoff.policy_2_title', 'Quy chế chuyển tiếp phép năm còn dư'),
      desc: t('timeoff.policy_2_desc', 'Tối đa chuyển tiếp 5 ngày sang năm tiếp theo trước ngày 31 tháng 3')
    },
    {
      title: t('timeoff.policy_3_title', 'Quy trình trực bù và hoán đổi ca lâm sàng'),
      desc: t('timeoff.policy_3_desc', 'Hướng dẫn điều phối ca trực bù cho bác sĩ, điều dưỡng khoa Cấp cứu và ICU')
    }
  ];

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [leaveType, setLeaveType] = useState('ANNUAL');
  const [dayPart, setDayPart] = useState<'FULL' | 'FIRST_HALF' | 'SECOND_HALF'>('FULL');
  const [startDate, setStartDate] = useState('2026-10-05');
  const [endDate, setEndDate] = useState('2026-10-08');
  const [leaveReason, setLeaveReason] = useState('');

  // Fetch current employee profile to check gender (e.g. exclude MATERNITY leave for MALE)
  const { data: employeeProfile } = useQuery({
    queryKey: ['employeeProfile', currentStaffId],
    queryFn: () => employeeApi.getById(currentStaffId),
    staleTime: 60000
  });

  const isMale = (employeeProfile?.gender || '').toUpperCase() === 'MALE';

  // Ensure leaveType is never MATERNITY if user is male
  React.useEffect(() => {
    if (isMale && leaveType === 'MATERNITY') {
      setLeaveType('ANNUAL');
    }
  }, [isMale, leaveType]);

  // TanStack Query: Fetch live balances from hrm_db
  const { data: serverBalances } = useQuery({
    queryKey: ['leaveBalances', currentStaffId],
    queryFn: () => leaveApi.getBalances(currentStaffId, 2026),
    staleTime: 10000
  });

  // TanStack Query: Fetch live leave requests from hrm_db
  const { data: serverRequests, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['leaveRequests', currentStaffId],
    queryFn: () => leaveApi.getRequests(currentStaffId),
    staleTime: 10000
  });

  // Helper for displaying day numbers
  const formatDays = (val: number | string) => {
    const num = Number(val) || 0;
    return Number.isInteger(num) ? num.toString() : num.toFixed(1);
  };

  // Mutation: Submit leave request
  const submitLeaveMutation = useMutation({
    mutationFn: (payload: any) => leaveApi.submitRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
      setShowRequestModal(false);
      setSuccessMsg(t('timeoff.submit_success_msg', 'Đề nghị nghỉ phép đã được gửi đến Trưởng khoa phê duyệt thành công!'));
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || t('common.error_occurred', 'Không thể gửi đề nghị nghỉ phép');
      setSuccessMsg(`${t('common.error', 'Lỗi')}: ${msg}`);
    }
  });

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const isHalfDay = dayPart !== 'FULL';
    let calculatedDays = 1.0;
    if (isHalfDay) {
      calculatedDays = 0.5;
    } else {
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
      calculatedDays = diffDays > 0 ? diffDays : 1.0;
    }

    submitLeaveMutation.mutate({
      staff_id: currentStaffId,
      start_date: startDate,
      end_date: isHalfDay ? startDate : endDate,
      leave_type: leaveType,
      day_part: dayPart,
      days_requested: calculatedDays,
      reason: leaveReason || (isHalfDay
        ? `${t('timeoff.duration', 'Nghỉ')} 0.5 ${t('timeoff.days_short', 'ngày')} (${dayPart === 'FIRST_HALF' ? t('timeoff.morning_short', 'Buổi sáng') : t('timeoff.afternoon_short', 'Buổi chiều')})`
        : t('timeoff.default_annual_reason', 'Nghỉ phép thường niên theo quy định.'))
    });
  };

  const getLeaveTypeName = (type: string) => {
    switch (type) {
      case 'ANNUAL':
        return t('timeoff.annual_leave', 'Phép Thường Niên');
      case 'SICK':
        return t('timeoff.sick_leave', 'Nghỉ Ốm Hưởng BHXH');
      case 'MATERNITY':
        return t('timeoff.maternity_leave', 'Nghỉ Thai Sản');
      case 'UNPAID':
        return t('timeoff.unpaid_leave', 'Nghỉ Không Hưởng Lương');
      case 'COMPENSATORY':
        return t('timeoff.compensatory_leave', 'Nghỉ Bù Ca Trực');
      case 'BEREAVEMENT':
        return t('leave_type.BEREAVEMENT', 'Nghỉ Việc Riêng / Tang Chế');
      case 'MARRIAGE':
        return t('leave_type.MARRIAGE', 'Nghỉ Kết Hôn');
      default:
        return `${type} Leave`;
    }
  };

  // Map server balances directly from database
  const displayBalances: LeaveBalanceItem[] = (serverBalances && serverBalances.length > 0)
    ? serverBalances.map((b: any) => {
        const remaining = b.remaining_days !== undefined ? Number(b.remaining_days) : (Number(b.total_days) - Number(b.used_days));
        return {
          id: b.leave_type.toLowerCase(),
          type: b.leave_type,
          name: getLeaveTypeName(b.leave_type),
          availableDays: formatDays(remaining),
          totalDays: formatDays(b.total_days),
          note: `${t('timeoff.accrual_cycle', 'Chu kỳ tích lũy')} ${b.accrual_year || 2026} • ${t('timeoff.used_label', 'Đã sử dụng')}: ${formatDays(b.used_days)} ${t('timeoff.days_short', 'ngày')}`
        };
      })
    : [];

  // Map server requests directly from database
  const displayRequests: UpcomingLeave[] = (serverRequests && serverRequests.length > 0)
    ? serverRequests.map((r: any) => {
        let quantityStr = `1 ${t('timeoff.days_short', 'ngày')}`;
        if (r.day_part === 'FIRST_HALF') {
          quantityStr = `0.5 ${t('timeoff.days_short', 'ngày')} (${t('timeoff.morning_short', 'Sáng')})`;
        } else if (r.day_part === 'SECOND_HALF') {
          quantityStr = `0.5 ${t('timeoff.days_short', 'ngày')} (${t('timeoff.afternoon_short', 'Chiều')})`;
        } else if (r.days_requested) {
          quantityStr = `${formatDays(r.days_requested)} ${t('timeoff.days_short', 'ngày')}`;
        }

        const dateRangeStr = (r.day_part && r.day_part !== 'FULL') || r.start_date === r.end_date
          ? `${r.start_date}`
          : `${r.start_date} – ${r.end_date}`;

        return {
          id: String(r.id),
          dateRange: dateRangeStr,
          type: r.leave_type === 'ANNUAL' ? t('leave_type.ANNUAL', 'Phép năm') : (t(`leave_type.${r.leave_type}`, r.leave_type)),
          quantity: quantityStr,
          status: r.status
        };
      })
    : [];

  return (
    <Container fluid className="px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="wd-page-title">{t('timeoff.title', 'Quản Lý Nghỉ Phép')}</h1>
          <p className="wd-page-subtitle">
            {t('timeoff.subtitle', 'Quản lý phép năm, nghỉ ốm bảo hiểm, nghỉ thai sản và bù trực')}
          </p>
        </div>
        <div>
          <button
            type="button"
            className="wd-pill-btn-primary"
            onClick={() => setShowRequestModal(true)}
          >
            <Plus size={15} />
            <span>{t('timeoff.leave_registration', 'Xin Nghỉ Phép / Vắng Mặt')}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <Alert
          variant={successMsg.startsWith(t('common.error', 'Lỗi')) ? 'danger' : 'success'}
          dismissible
          onClose={() => setSuccessMsg(null)}
          className="mb-4 py-2.5 small rounded-2"
        >
          {successMsg}
        </Alert>
      )}

      {/* Admin/HR Approval Portal Jump Banner */}
      {isHRorAdmin && (
        <div
          className="py-2.5 px-3 mb-4 rounded-3 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 border"
          style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
        >
          <div className="d-flex align-items-center gap-2 small">
            <Info size={16} className="text-success flex-shrink-0" />
            <span className="fw-medium">
              {t('timeoff.viewing_personal_notice', 'Bạn đang xem lịch nghỉ cá nhân. Để xem và phê duyệt danh sách đơn xin nghỉ phép của cán bộ toàn viện:')}
            </span>
          </div>
          <Link
            to="/hr?tab=leaves"
            className="btn btn-sm btn-success rounded-pill px-3 py-1 text-nowrap fw-semibold shadow-sm align-self-start align-self-sm-center"
            style={{ fontSize: '12px' }}
          >
            {t('timeoff.go_to_hr_approval', 'Vào Cổng Phê Duyệt Viện')} &rarr;
          </Link>
        </div>
      )}

      {/* Support Banner (AskHR) */}
      <div className="wd-support-banner">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            {t('timeoff.askhr_title', 'Hỗ Trợ Nhân Sự AskHR')}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {t('timeoff.askhr_desc', 'Cần giải đáp về hạn mức phép năm, chế độ thai sản hoặc ghi nhận trực bù? Liên hệ askhr@hospital.vn hoặc tạo phiếu yêu cầu trực tuyến.')}
          </div>
        </div>
        <button
          type="button"
          className="wd-pill-btn-outline d-none d-md-inline-flex"
          onClick={() => setShowRequestModal(true)}
        >
          {t('timeoff.request_leave', 'Tạo Yêu Cầu Mới')}
        </button>
      </div>

      {/* 2-Column Layout */}
      <Row className="g-4">
        {/* COLUMN 1 (LEFT): AVAILABLE BALANCE */}
        <Col lg={6}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
              {t('timeoff.available_balance_title', 'Hạn Mức Phép Còn Lại')}
            </span>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              {t('common.year', 'Năm')} 2026
            </span>
          </div>

          <div className="wd-card mb-4">
            <div className="p-0">
              {displayBalances.map((item, idx) => {
                const isLast = idx === displayBalances.length - 1;
                return (
                  <div
                    key={item.id}
                    className={`p-3 px-4 d-flex align-items-center justify-content-between ${
                      !isLast ? 'border-bottom' : ''
                    }`}
                    style={{ borderColor: 'var(--wd-border-light)' }}
                  >
                    <div>
                      <div className="fw-semibold text-dark" style={{ fontSize: '14px' }}>
                        {item.name}
                      </div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        {item.note}
                      </div>
                    </div>

                    <div className="text-end ps-3">
                      <div
                        className="fw-bold font-mono text-dark"
                        style={{ fontSize: '1.65rem', lineHeight: 1.1, letterSpacing: '-0.02em' }}
                      >
                        {item.availableDays}
                      </div>
                      <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px', letterSpacing: '0.05em' }}>
                        {t('timeoff.available_days_badge', 'Ngày Khả Dụng')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Col>

        {/* COLUMN 2 (RIGHT): UPCOMING TIME OFF & POLICIES */}
        <Col lg={6}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
              {t('timeoff.upcoming_title', 'Lịch Nghỉ Sắp Tới')}
            </span>
            <span className="wd-badge-neutral" style={{ fontSize: '11px' }}>
              {displayRequests.length} {t('timeoff.plans_count', 'Kế Hoạch')}
            </span>
          </div>

          {/* Table Card */}
          <div className="wd-card mb-4">
            <div className="table-responsive">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>{t('timeoff.time_range', 'Thời Gian Nghỉ')}</th>
                    <th>{t('timeoff.leave_type', 'Loại Nghỉ Phép')}</th>
                    <th>{t('timeoff.duration', 'Thời Lượng')}</th>
                    <th className="text-end">{t('common.status', 'Trạng Thái')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isRequestsLoading ? (
                    <TheoryOfNextLoader isTableBody columns={4} rows={3} />
                  ) : displayRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        {t('timeoff.no_upcoming', 'Chưa có lịch nghỉ phép nào được lên kế hoạch.')}
                      </td>
                    </tr>
                  ) : (
                    displayRequests.map((leave) => (
                      <tr key={leave.id}>
                        <td className="fw-semibold text-dark">
                          {leave.dateRange}
                        </td>
                        <td className="text-secondary">
                          {leave.type}
                        </td>
                        <td className="fw-bold font-mono text-dark">
                          {leave.quantity}
                        </td>
                        <td className="text-end">
                          {leave.status === 'APPROVED' ? (
                            <span className="wd-badge-success">
                              {t('common.approved', 'Đã Phê Duyệt')}
                            </span>
                          ) : leave.status === 'CANCELLED' ? (
                            <span className="wd-badge-neutral">
                              {t('status.cancelled', 'Đã Hủy')}
                            </span>
                          ) : (
                            <span className="wd-badge-warning">
                              {t('common.pending', 'Chờ Duyệt')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Helpful Links Section */}
          <div className="mb-2">
            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
              {t('timeoff.policy_title', 'Chính Sách & Hướng Dẫn Liên Quan')}
            </span>
          </div>

          <div className="wd-card">
            <div className="p-0">
              {policyLinks.map((link, idx) => {
                const isLast = idx === policyLinks.length - 1;
                return (
                  <div
                    key={idx}
                    className={`p-3 px-4 d-flex align-items-center justify-content-between ${
                      !isLast ? 'border-bottom' : ''
                    }`}
                    style={{ borderColor: 'var(--wd-border-light)' }}
                  >
                    <div>
                      <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                        {link.title}
                      </div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        {link.desc}
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-muted flex-shrink-0 ms-3" />
                  </div>
                );
              })}
            </div>
          </div>
        </Col>
      </Row>

      {/* Request Time Off Modal */}
      <Modal show={showRequestModal} onHide={() => setShowRequestModal(false)} centered>
        <Form onSubmit={handleSubmitLeave}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('timeoff.leave_registration', 'Đăng Ký Nghỉ Phép / Vắng Mặt')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">
                {t('timeoff.leave_type', 'Loại Nghỉ Phép')}
              </label>
              <select
                aria-label={t('timeoff.leave_type', 'Loại Nghỉ Phép')}
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="wd-select w-100"
              >
                <option value="ANNUAL">{t('timeoff.annual_leave', 'Phép Thường Niên')}</option>
                <option value="SICK">{t('timeoff.sick_leave', 'Nghỉ Ốm Hưởng BHXH')}</option>
                {!isMale && (
                  <option value="MATERNITY">{t('timeoff.maternity_leave', 'Nghỉ Thai Sản')}</option>
                )}
                <option value="COMPENSATORY">{t('timeoff.compensatory_leave', 'Nghỉ Bù Ca Trực')}</option>
                <option value="UNPAID">{t('timeoff.unpaid_leave', 'Nghỉ Không Hưởng Lương')}</option>
              </select>
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">
                {t('timeoff.duration', 'Thời Lượng Nghỉ')}
              </label>
              <div className="d-flex flex-wrap gap-2 pt-1">
                <label
                  className={`wd-pill-btn cursor-pointer ${dayPart === 'FULL' ? 'wd-pill-btn-primary' : 'wd-pill-btn-outline'}`}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <input
                    type="radio"
                    name="dayPart"
                    value="FULL"
                    checked={dayPart === 'FULL'}
                    onChange={() => setDayPart('FULL')}
                    className="d-none"
                  />
                  <span>{t('timeoff.full_day', 'Cả ngày')}</span>
                </label>
                <label
                  className={`wd-pill-btn cursor-pointer ${dayPart === 'FIRST_HALF' ? 'wd-pill-btn-primary' : 'wd-pill-btn-outline'}`}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <input
                    type="radio"
                    name="dayPart"
                    value="FIRST_HALF"
                    checked={dayPart === 'FIRST_HALF'}
                    onChange={() => {
                      setDayPart('FIRST_HALF');
                      setEndDate(startDate);
                    }}
                    className="d-none"
                  />
                  <span>{t('timeoff.morning_half', 'Nửa ngày - Buổi sáng')}</span>
                </label>
                <label
                  className={`wd-pill-btn cursor-pointer ${dayPart === 'SECOND_HALF' ? 'wd-pill-btn-primary' : 'wd-pill-btn-outline'}`}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <input
                    type="radio"
                    name="dayPart"
                    value="SECOND_HALF"
                    checked={dayPart === 'SECOND_HALF'}
                    onChange={() => {
                      setDayPart('SECOND_HALF');
                      setEndDate(startDate);
                    }}
                    className="d-none"
                  />
                  <span>{t('timeoff.afternoon_half', 'Nửa ngày - Buổi chiều')}</span>
                </label>
              </div>
            </Form.Group>

            {dayPart === 'FULL' ? (
              <Row className="g-3 mb-3">
                <Col sm={6}>
                  <Form.Group>
                    <label className="wd-label">
                      {t('timeoff.start_date', 'Ngày Bắt Đầu')}
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="wd-input w-100"
                    />
                  </Form.Group>
                </Col>
                <Col sm={6}>
                  <Form.Group>
                    <label className="wd-label">
                      {t('timeoff.end_date', 'Ngày Kết Thúc')}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="wd-input w-100"
                    />
                  </Form.Group>
                </Col>
              </Row>
            ) : (
              <Form.Group className="mb-3">
                <label className="wd-label">
                  {t('timeoff.day_single', 'Ngày')} (0.5 {t('timeoff.days_short', 'ngày')} - {dayPart === 'FIRST_HALF' ? t('timeoff.morning_short', 'Buổi sáng') : t('timeoff.afternoon_short', 'Buổi chiều')})
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  required
                  className="wd-input w-100"
                />
              </Form.Group>
            )}

            <Form.Group className="mb-2">
              <label className="wd-label">
                {t('timeoff.handover_notes', 'Lý Do & Nhân Sự Bàn Giao Ca Trực')}
              </label>
              <textarea
                rows={3}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder={t('timeoff.handover_placeholder', 'Ghi rõ đồng nghiệp nhận bàn giao ca trực hoặc phụ trách buồng bệnh thay thế...')}
                className="wd-input w-100"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowRequestModal(false)}
            >
              {t('common.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={submitLeaveMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {submitLeaveMutation.isPending ? t('timeoff.submitting', 'Đang gửi...') : t('timeoff.submit_btn', 'Gửi Đề Nghị Phê Duyệt')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default TimeOffLeaves;
