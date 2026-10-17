import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Modal,
  Form,
  Alert
} from 'react-bootstrap';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  LogIn,
  Timer,
  Calendar,
  History,
  FileText,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi } from '../api/shiftApi';
import { employeeApi } from '../api/employeeApi';
import { useTranslation } from '../i18n/useTranslation';

export interface AttendanceRecord {
  id: string;
  staff_id: string;
  staff_name: string;
  shift_label: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_method: 'BIOMETRIC' | 'RFID_CARD' | 'KIOSK_TERMINAL' | 'MOBILE_GEOFENCE';
  attendance_status: 'PRESENT' | 'LATE' | 'OVERTIME' | 'EARLY_DEPARTURE' | 'HALF_DAY';
  overtime_minutes: number;
  handover_notes: string | null;
}

export const AttendanceClock: React.FC = () => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // TanStack Query: Fetch live attendance records from MySQL
  const { data: serverRecords } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => shiftApi.getAttendance(),
    staleTime: 5000
  });

  // Query employees list
  const { data: serverEmployees } = useQuery({
    queryKey: ['employeesList'],
    queryFn: () => employeeApi.getAll(),
    staleTime: 60000
  });

  // Clock in form state
  const [staffCode, setStaffCode] = useState('EMP-DOC-001');
  const [clockMethod, setClockMethod] = useState<'BIOMETRIC' | 'RFID_CARD' | 'KIOSK_TERMINAL' | 'MOBILE_GEOFENCE'>('BIOMETRIC');

  // Clock out modal
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [selectedRecordToOut, setSelectedRecordToOut] = useState<AttendanceRecord | null>(null);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [overtimeExtra, setOvertimeExtra] = useState<number>(0);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [hours, minutes, seconds] = currentTime.toTimeString().slice(0, 8).split(':');
  const dateStr = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Clock-in Mutation
  const clockInMutation = useMutation({
    mutationFn: (payload: { staff_id: string; clock_in_method: string }) =>
      shiftApi.clockIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setActionNotice(`${t('attendance.clock_in_method_success', 'Điểm danh vào ca thành công qua phương thức')} ${clockMethod}!`);
      setTimeout(() => setActionNotice(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || t('common.error_occurred', 'Lỗi điểm danh vào ca');
      setActionNotice(`${t('common.error', 'Lỗi')}: ${msg}`);
    }
  });

  // Clock-out Mutation
  const clockOutMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      shiftApi.clockOut(id, payload),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setShowClockOutModal(false);
      setActionNotice(`${t('attendance.clock_out_record_success', 'Đã ghi nhận ra ca và kết thúc phiên trực.')} ${data?.overtime_minutes || 0} ${t('attendance.overtime_minutes_label', 'phút tăng ca')}.`);
      setTimeout(() => setActionNotice(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || t('common.error_occurred', 'Lỗi ra ca');
      setActionNotice(`${t('common.error', 'Lỗi')}: ${msg}`);
    }
  });

  // Map server records directly from database
  const records: AttendanceRecord[] = (serverRecords && serverRecords.length > 0)
    ? serverRecords.map((r: any) => {
        const staffName = r.staff_name || r.staff_id;

        return {
          id: r.id,
          staff_id: r.staff_id,
          staff_name: staffName,
          shift_label: r.shift_type ? `${t('shifts.morning', 'Ca')} ${r.shift_type}` : t('attendance.emergency_icu_dept', 'Khoa Cấp Cứu / ICU'),
          clock_in_time: r.clock_in_time,
          clock_out_time: r.clock_out_time,
          clock_in_method: r.clock_in_method || 'BIOMETRIC',
          attendance_status: r.attendance_status || 'PRESENT',
          overtime_minutes: r.overtime_minutes || 0,
          handover_notes: r.handover_notes
        };
      })
    : [];

  const activeSession = records.find((r) => !r.clock_out_time);

  const handleClockIn = () => {
    clockInMutation.mutate({
      staff_id: staffCode,
      clock_in_method: clockMethod
    });
  };

  const handleClockOutSubmit = () => {
    const target = selectedRecordToOut || activeSession;
    if (!target) return;
    clockOutMutation.mutate({
      id: target.id,
      payload: {
        clock_out_method: 'KIOSK_TERMINAL',
        handover_notes: handoverNotes,
        overtime_minutes: overtimeExtra
      }
    });
  };

  const getMethodLabel = (method: AttendanceRecord['clock_in_method']) => {
    switch (method) {
      case 'BIOMETRIC':
        return t('attendance.method_biometric', 'Vân tay Sinh trắc');
      case 'RFID_CARD':
        return t('attendance.method_rfid', 'Thẻ từ RFID');
      case 'MOBILE_GEOFENCE':
        return t('attendance.method_kiosk', 'Định vị Kiosk');
      case 'KIOSK_TERMINAL':
        return t('attendance.method_device', 'Thiết bị Quẹt Viện');
    }
  };

  const getStatusBadge = (status: AttendanceRecord['attendance_status']) => {
    switch (status) {
      case 'PRESENT':
        return <span className="wd-badge-success">{t('attendance.status_on_time', 'Đúng Giờ')}</span>;
      case 'LATE':
        return <span className="wd-badge-urgent">{t('attendance.status_late', 'Vào Muộn')}</span>;
      case 'OVERTIME':
        return <span className="wd-badge-blue">{t('attendance.status_overtime', 'Tăng Ca')}</span>;
      case 'EARLY_DEPARTURE':
        return <span className="wd-badge-warning">{t('attendance.status_early', 'Về Sớm')}</span>;
      default:
        return <span className="wd-badge-neutral">{status}</span>;
    }
  };

  return (
    <Container fluid className="px-0">
      {/* Page Header */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="wd-page-title">{t('attendance.title', 'Chấm Công & Điểm Danh')}</h1>
          <p className="wd-page-subtitle">
            {t('attendance.subtitle', 'Ghi nhận giờ vào/ra ca trực, kiểm tra tăng ca và đối chiếu phụ cấp')}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/shifts" className="wd-pill-btn-outline text-decoration-none">
            <Calendar size={14} />
            <span>{t('attendance.schedule_btn', 'Lịch Phân Ca')}</span>
          </Link>
          <Link to="/handovers" className="wd-pill-btn-outline text-decoration-none">
            <FileText size={14} />
            <span>{t('attendance.handover_btn', 'Biên Bản Bàn Giao')}</span>
          </Link>
        </div>
      </div>

      {actionNotice && (
        <Alert
          variant={actionNotice.startsWith(t('common.error', 'Lỗi')) ? 'danger' : 'success'}
          dismissible
          onClose={() => setActionNotice(null)}
          className="d-flex align-items-center gap-2 py-2.5 mb-4 small rounded-2"
        >
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </Alert>
      )}

      {/* Support Banner */}
      <div className="wd-support-banner">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            {t('attendance.askhr_title', 'Hỗ Trợ Chấm Công AskHR Timekeeper')}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {t('attendance.askhr_desc', 'Quên quẹt thẻ vào ca hoặc cần điều chỉnh giờ tăng ca trực cấp cứu? Liên hệ bộ phận Nhân sự qua email askhr@hospital.vn hoặc tạo phiếu yêu cầu trực tuyến.')}
          </div>
        </div>
      </div>

      {/* Clock Terminal & KPI Row */}
      <Row className="g-4 mb-4">
        {/* Digital Clock & Punch Station */}
        <Col xs={12} lg={5}>
          <div className="wd-card h-100 p-4 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="text-muted small fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('attendance.server_clock', 'Đồng Hồ Máy Chủ Bệnh Viện')}
                </span>
                <span className="wd-badge-success" style={{ fontSize: '10px' }}>
                  {t('attendance.realtime_sync', 'Đồng Bộ Thời Gian Thực')}
                </span>
              </div>

              {/* Digital Time Display */}
              <div className="py-2 text-center">
                <div className="fw-bold font-mono text-dark" style={{ fontSize: '3rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {hours}<span style={{ color: 'var(--wd-orange)' }}>:</span>{minutes}<span style={{ color: 'var(--wd-orange)' }}>:</span>{seconds}
                </div>
                <div className="text-muted small mt-2">{dateStr}</div>
              </div>
            </div>

            {/* Action Box */}
            <div className="mt-4 p-3 rounded-2 border" style={{ backgroundColor: '#f8fafc', borderColor: 'var(--wd-border)' }}>
              {activeSession ? (
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="text-muted fw-semibold small d-flex align-items-center gap-1">
                      <Timer size={13} style={{ color: 'var(--wd-orange)' }} /> {t('attendance.in_shift_now', 'Đang Trong Ca Trực')}
                    </span>
                    <span className="wd-badge-success">{t('attendance.status_on_duty', 'Đang Trực')}</span>
                  </div>
                  <div className="fw-bold text-dark mb-1" style={{ fontSize: '14px' }}>{activeSession.staff_name}</div>
                  <div className="text-muted small mb-3" style={{ fontSize: '11px' }}>
                    {t('attendance.clock_in_at', 'Vào ca lúc')}: {activeSession.clock_in_time.split(' ')[1]} &bull; {activeSession.shift_label}
                  </div>
                  <button
                    type="button"
                    className="wd-pill-btn-outline w-100 justify-content-center text-danger"
                    style={{ borderColor: 'var(--wd-red-border)', backgroundColor: 'var(--wd-red-bg)' }}
                    onClick={() => setShowClockOutModal(true)}
                  >
                    <LogOut size={14} />
                    <span>{t('attendance.record_clock_out_btn', 'Ghi Nhận Ra Ca & Bàn Giao')}</span>
                  </button>
                </div>
              ) : (
                <div>
                  <label className="wd-label mb-1.5">{t('attendance.select_staff', 'Chọn Cán Bộ Y Tế Điểm Danh')}</label>
                  <select
                    className="wd-select w-100 mb-2.5"
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                  >
                    {serverEmployees && serverEmployees.length > 0 ? (
                      serverEmployees.map((emp: any) => (
                        <option key={emp.employee_code} value={emp.employee_code}>
                          {emp.last_name} {emp.first_name} — {emp.employee_code}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="EMP-DOC-001">{t('staff.emp_doc_001', 'BS.CKII Nguyễn Văn An')} — EMP-DOC-001</option>
                        <option value="EMP-DOC-002">{t('staff.emp_doc_002', 'ThS.BS Trần Văn Bình')} — EMP-DOC-002</option>
                        <option value="EMP-NUR-001">{t('staff.emp_nur_001', 'ĐD. Lê Thị Mai')} — EMP-NUR-001</option>
                        <option value="EMP-DOC-003">{t('staff.emp_doc_003', 'BS.CKI Phạm Quốc Cường')} — EMP-DOC-003</option>
                        <option value="EMP-NUR-002">{t('staff.emp_nur_002', 'ĐD. Hoàng Minh Tuấn')} — EMP-NUR-002</option>
                      </>
                    )}
                  </select>

                  <div className="d-flex gap-1.5 mb-3">
                    {(['BIOMETRIC', 'RFID_CARD', 'KIOSK_TERMINAL'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`wd-pill-btn flex-fill justify-content-center ${clockMethod === m ? 'wd-pill-btn-primary' : ''}`}
                        style={{ fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => setClockMethod(m)}
                      >
                        {m === 'BIOMETRIC' ? t('attendance.method_biometric', 'Vân Tay') : m === 'RFID_CARD' ? t('attendance.method_rfid', 'Thẻ Từ') : t('attendance.method_kiosk', 'Kiosk')}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="wd-pill-btn-primary w-100 justify-content-center py-2"
                    onClick={handleClockIn}
                  >
                    <LogIn size={15} />
                    <span>{t('attendance.clock_in', 'Điểm Danh Vào Ca')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </Col>

        {/* KPI Dashboard */}
        <Col xs={12} lg={7}>
          <Row className="g-3">
            <Col xs={6}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('attendance.stat_active_shift', 'Đang Trực Ca Hiện Hành')}
                </div>
                <div className="fw-bold mt-1 font-mono" style={{ fontSize: '24px', color: 'var(--wd-green)' }}>
                  {records.filter((r) => !r.clock_out_time).length}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('attendance.stat_active_sub', 'Nhân sự có mặt tại khoa phòng')}</div>
              </div>
            </Col>

            <Col xs={6}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('attendance.stat_late', 'Vào Ca Muộn / Đi Trễ')}
                </div>
                <div className="fw-bold mt-1 font-mono" style={{ fontSize: '24px', color: 'var(--wd-red)' }}>
                  {records.filter((r) => r.attendance_status === 'LATE').length}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('attendance.stat_late_sub', 'Sau 15 phút so với lịch ca')}</div>
              </div>
            </Col>

            <Col xs={6}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('attendance.stat_ot', 'Tổng Số Phút Tăng Ca')}
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '24px' }}>
                  {records.reduce((acc, r) => acc + r.overtime_minutes, 0)} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280' }}>{t('attendance.overtime_minutes_label', 'phút')}</span>
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('attendance.stat_ot_sub', 'Trực ca cấp cứu ngoài giờ')}</div>
              </div>
            </Col>

            <Col xs={6}>
              <div className="wd-card mb-0 p-3">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('attendance.stat_today_logs', 'Lượt Chấm Công Hôm Nay')}
                </div>
                <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '24px' }}>
                  {records.length}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('attendance.stat_today_sub', 'Vân tay, thẻ từ & kiosk viện')}</div>
              </div>
            </Col>
          </Row>

          {/* Quick Info Box */}
          <div className="wd-card mb-0 mt-3 p-3 d-flex align-items-center justify-content-between" style={{ backgroundColor: '#f8fafc' }}>
            <div>
              <div className="fw-semibold text-dark small">{t('attendance.device_status', 'Thiết bị Đầu đọc Sinh trắc K04 • Hoạt Động')}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>{t('attendance.device_sub', 'Cổng Bắc Khoa Cấp Cứu & Hồi Sức Tích Cực')}</div>
            </div>
            <span className="wd-badge-success">{t('attendance.conn_stable', 'Kết Nối Ổn Định')}</span>
          </div>
        </Col>
      </Row>

      {/* Attendance Logs Table */}
      <div className="wd-card">
        <div className="wd-card-header d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="wd-card-title">{t('attendance.log_title', 'Nhật Ký Chấm Công & Điểm Danh')}</span>
            <span className="badge bg-secondary rounded-pill fw-normal">{records.length}</span>
          </div>
          <span className="text-muted" style={{ fontSize: '11px' }}>{t('attendance.log_subtitle', 'Dữ liệu thời gian thực từ máy chủ')}</span>
        </div>
        <div className="table-responsive">
          <table className="wd-table">
            <thead>
              <tr>
                <th>{t('attendance.th_staff', 'CÁN BỘ Y TẾ')}</th>
                <th>{t('attendance.th_shift', 'CA TRỰC PHÂN CÔNG')}</th>
                <th>{t('attendance.clock_in_time', 'GIỜ VÀO').toUpperCase()}</th>
                <th>{t('attendance.clock_out_time', 'GIỜ RA').toUpperCase()}</th>
                <th>{t('attendance.th_method', 'PHƯƠNG THỨC')}</th>
                <th>{t('common.status', 'TRẠNG THÁI').toUpperCase()}</th>
                <th>{t('attendance.th_overtime', 'TĂNG CA')}</th>
                <th>{t('attendance.th_handover', 'GHI CHÚ BÀN GIAO')}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="fw-semibold text-dark">{r.staff_name}</div>
                    <span className="font-mono text-muted" style={{ fontSize: '11px' }}>{r.staff_id}</span>
                  </td>
                  <td>
                    <span className="text-secondary" style={{ fontSize: '12px' }}>{r.shift_label}</span>
                  </td>
                  <td>
                    <div className="fw-semibold font-mono text-dark">{r.clock_in_time.split(' ')[1] || r.clock_in_time}</div>
                    <div className="text-muted" style={{ fontSize: '10px' }}>{r.clock_in_time.split(' ')[0]}</div>
                  </td>
                  <td>
                    {r.clock_out_time ? (
                      <div>
                        <div className="fw-semibold font-mono text-dark">{r.clock_out_time.split(' ')[1] || r.clock_out_time}</div>
                        <div className="text-muted" style={{ fontSize: '10px' }}>{r.clock_out_time.split(' ')[0]}</div>
                      </div>
                    ) : (
                      <span className="wd-badge-warning">{t('attendance.status_in_shift', 'Đang Trong Ca')}</span>
                    )}
                  </td>
                  <td>
                    <span className="text-secondary" style={{ fontSize: '12px' }}>{getMethodLabel(r.clock_in_method)}</span>
                  </td>
                  <td>{getStatusBadge(r.attendance_status)}</td>
                  <td>
                    {r.overtime_minutes > 0 ? (
                      <span className="wd-badge-blue">+{r.overtime_minutes}m</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {r.handover_notes ? (
                      <span className="text-dark small d-inline-block text-truncate" style={{ maxWidth: '240px' }}>
                        {r.handover_notes}
                      </span>
                    ) : (
                      <span className="text-muted small">{t('attendance.not_recorded', 'Chưa ghi nhận')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clock Out Modal */}
      <Modal show={showClockOutModal} onHide={() => setShowClockOutModal(false)} centered>
        <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
          <Modal.Title className="fw-bold fs-6 text-dark">
            {t('attendance.modal_out_title', 'Ghi Nhận Ra Ca & Bàn Giao Trực Lâm Sàng')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <p className="text-muted small mb-3">
            {t('attendance.modal_out_desc', 'Vui lòng ghi nhận biên bản bàn giao hoặc số phút trực tăng cường khẩn cấp trước khi kết thúc ca trực.')}
          </p>

          <Form.Group className="mb-3">
            <label className="wd-label">{t('attendance.modal_ot_label', 'Số Phút Trực Tăng Ca Lâm Sàng')}</label>
            <input
              type="number"
              min="0"
              step="5"
              value={overtimeExtra}
              onChange={(e) => setOvertimeExtra(Number(e.target.value))}
              className="wd-input w-100 font-mono"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <label className="wd-label">{t('attendance.modal_handover_label', 'Ghi Chú Bàn Giao Buồng Bệnh & Y Lệnh')}</label>
            <textarea
              rows={3}
              placeholder={t('attendance.modal_handover_placeholder', 'VD: Đã hoàn tất truyền kháng sinh Giường 08 ICU. Bàn giao máy thở cho ca đêm...')}
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              className="wd-input w-100"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
          <button
            type="button"
            className="wd-pill-btn-outline"
            onClick={() => setShowClockOutModal(false)}
          >
            {t('common.cancel', 'Hủy')}
          </button>
          <button
            type="button"
            className="wd-pill-btn-primary"
            onClick={handleClockOutSubmit}
          >
            {t('attendance.modal_confirm_out', 'Xác Nhận Ra Ca')}
          </button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AttendanceClock;
