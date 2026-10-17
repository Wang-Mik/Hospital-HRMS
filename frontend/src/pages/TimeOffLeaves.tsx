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
  CalendarPlus,
  ExternalLink,
  Info,
  Calendar,
  Clock,
  FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveApi } from '../api/leaveApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

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

const policyLinks = [
  { title: 'Lịch nghỉ lễ chính thức 2026 của Nhà nước (Việt Nam)', desc: 'Quy định các ngày nghỉ lễ, Tết hưởng nguyên lương theo Bộ luật Lao động' },
  { title: 'Quy chế chuyển tiếp phép năm còn dư', desc: 'Tối đa chuyển tiếp 5 ngày sang năm tiếp theo trước ngày 31 tháng 3' },
  { title: 'Quy trình ghi nhận trực bù và hoán đổi ca trực lâm sàng', desc: 'Hướng dẫn điều phối ca trực bù cho bác sĩ, điều dưỡng khoa Cấp cứu và ICU' }
];

export const TimeOffLeaves: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentStaffId = user?.employee_code || 'EMP-DOC-001';
  const { t, lang } = useTranslation();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [leaveType, setLeaveType] = useState('ANNUAL');
  const [dayPart, setDayPart] = useState<'FULL' | 'FIRST_HALF' | 'SECOND_HALF'>('FULL');
  const [startDate, setStartDate] = useState('2026-10-05');
  const [endDate, setEndDate] = useState('2026-10-08');
  const [leaveReason, setLeaveReason] = useState('');

  // TanStack Query: Fetch live balances from hrm_db
  const { data: serverBalances } = useQuery({
    queryKey: ['leaveBalances', currentStaffId],
    queryFn: () => leaveApi.getBalances(currentStaffId, 2026),
    staleTime: 10000
  });

  // TanStack Query: Fetch live leave requests from hrm_db
  const { data: serverRequests } = useQuery({
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
      setSuccessMsg('Đề nghị nghỉ phép đã được gửi đến Trưởng khoa phê duyệt thành công!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Không thể gửi đề nghị nghỉ phép';
      setSuccessMsg(`Lỗi: ${msg}`);
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
        ? `Nghỉ nửa ngày (${dayPart === 'FIRST_HALF' ? 'Buổi sáng' : 'Buổi chiều'}) theo quy định.`
        : 'Nghỉ phép thường niên theo quy định.')
    });
  };

  const getLeaveTypeName = (type: string) => {
    switch (type) {
      case 'ANNUAL':
        return 'Nghỉ Phép Thường Niên (Annual Leave)';
      case 'SICK':
        return 'Nghỉ Ốm Hưởng Chế Độ BHXH (Sick Leave)';
      case 'MATERNITY':
        return 'Nghỉ Thai Sản (Maternity Leave)';
      case 'UNPAID':
        return 'Nghỉ Không Hưởng Lương (Unpaid Leave)';
      case 'COMPENSATORY':
        return 'Nghỉ Bù Ca Trực Đêm / Lễ Tết';
      case 'BEREAVEMENT':
        return 'Nghỉ Việc Riêng / Tang Chế';
      case 'MARRIAGE':
        return 'Nghỉ Kết Hôn';
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
          note: `Chu kỳ tích lũy ${b.accrual_year || 2026} • Đã sử dụng: ${formatDays(b.used_days)} ngày`
        };
      })
    : [];

  // Map server requests directly from database
  const displayRequests: UpcomingLeave[] = (serverRequests && serverRequests.length > 0)
    ? serverRequests.map((r: any) => {
        let quantityStr = '1 ngày';
        if (r.day_part === 'FIRST_HALF') {
          quantityStr = '0.5 ngày (Sáng)';
        } else if (r.day_part === 'SECOND_HALF') {
          quantityStr = '0.5 ngày (Chiều)';
        } else if (r.days_requested) {
          quantityStr = `${formatDays(r.days_requested)} ngày`;
        }

        const dateRangeStr = (r.day_part && r.day_part !== 'FULL') || r.start_date === r.end_date
          ? `${r.start_date}`
          : `${r.start_date} – ${r.end_date}`;

        return {
          id: String(r.id),
          dateRange: dateRangeStr,
          type: r.leave_type === 'ANNUAL' ? 'Phép năm' : `${r.leave_type}`,
          quantity: quantityStr,
          status: r.status
        };
      })
    : [];

  return (
    <Container fluid className="px-0">
      {/* Workday Page Header */}
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
            <CalendarPlus size={15} />
            <span>Xin Nghỉ Phép / Vắng Mặt</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <Alert
          variant={successMsg.startsWith('Lỗi') ? 'danger' : 'success'}
          dismissible
          onClose={() => setSuccessMsg(null)}
          className="mb-4 py-2.5 small rounded-2"
        >
          {successMsg}
        </Alert>
      )}

      {/* Workday Support Banner (AskHR) */}
      <div className="wd-support-banner">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            Hỗ trợ Nhân sự AskHR &bull; Giải đáp quy chế phép năm
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            Cần giải đáp về hạn mức phép năm, chế độ thai sản hoặc ghi nhận trực bù? Liên hệ{' '}
            <a href="mailto:askhr@hospital.vn" className="fw-semibold text-decoration-none" style={{ color: 'var(--wd-blue)' }}>
              askhr@hospital.vn
            </a>{' '}
            hoặc tạo phiếu yêu cầu trực tuyến.
          </div>
        </div>
        <button
          type="button"
          className="wd-pill-btn-outline d-none d-md-inline-flex"
          onClick={() => setShowRequestModal(true)}
        >
          Tạo Yêu Cầu Mới
        </button>
      </div>

      {/* 2-Column Workday Layout */}
      <Row className="g-4">
        {/* COLUMN 1 (LEFT): AVAILABLE BALANCE */}
        <Col lg={6}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted text-uppercase fw-bold" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
              Hạn Mức Phép Còn Lại (Available Balance as of Today)
            </span>
            <span className="text-muted" style={{ fontSize: '11px' }}>
              Năm Tài Khóa 2026
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
                        Ngày Khả Dụng
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
              Lịch Nghỉ Sắp Tới (Upcoming Time Off)
            </span>
            <span className="wd-badge-neutral" style={{ fontSize: '11px' }}>
              {displayRequests.length} Kế Hoạch
            </span>
          </div>

          {/* Table Card */}
          <div className="wd-card mb-4">
            <div className="table-responsive">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>Thời Gian Nghỉ</th>
                    <th>Loại Nghỉ Phép</th>
                    <th>Thời Lượng</th>
                    <th className="text-end">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        Chưa có lịch nghỉ phép nào được lên kế hoạch.
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
                              Đã Phê Duyệt
                            </span>
                          ) : leave.status === 'CANCELLED' ? (
                            <span className="wd-badge-neutral">
                              Đã Hủy
                            </span>
                          ) : (
                            <span className="wd-badge-warning">
                              Chờ Duyệt
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
              Chính Sách &amp; Hướng Dẫn Liên Quan (Helpful Links)
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
              Đăng Ký Nghỉ Phép / Vắng Mặt (Workday Absence Request)
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">
                Loại Nghỉ Phép
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="wd-select w-100"
              >
                <option value="ANNUAL">{t('timeoff.annual_leave', 'Phép Thường Niên')}</option>
                <option value="SICK">{t('timeoff.sick_leave', 'Nghỉ Ốm Hưởng BHXH')}</option>
                <option value="MATERNITY">{t('timeoff.maternity_leave', 'Nghỉ Thai Sản')}</option>
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
                      Ngày Bắt Đầu
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
                      Ngày Kết Thúc
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
                  Ngày Nghỉ Phép (0.5 ngày - {dayPart === 'FIRST_HALF' ? 'Buổi sáng' : 'Buổi chiều'})
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
                Lý Do &amp; Nhân Sự Bàn Giao Ca Trực
              </label>
              <textarea
                rows={3}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Ghi rõ đồng nghiệp nhận bàn giao ca trực hoặc phụ trách buồng bệnh thay thế..."
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
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitLeaveMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {submitLeaveMutation.isPending ? 'Đang gửi...' : 'Gửi Đề Nghị Phê Duyệt'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default TimeOffLeaves;
