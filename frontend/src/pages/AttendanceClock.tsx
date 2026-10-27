import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  FileText,
  Info,
  UserCheck,
  Search,
  Users,
  Filter,
  RotateCcw,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi } from '../api/shiftApi';
import { employeeApi } from '../api/employeeApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';
import { TheoryOfNextLoader } from '../components/common/TheoryOfNextLoader';

export interface AttendanceRecord {
  id: string;
  shift_id: string | null;
  staff_id: string;
  staff_name: string;
  staff_role?: string;
  department_code?: string;
  department_name?: string;
  specialty?: string;
  shift_type?: string;
  on_call_tier?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  shift_label: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_method: 'BIOMETRIC' | 'RFID_CARD' | 'KIOSK_TERMINAL' | 'MOBILE_GEOFENCE';
  attendance_status: 'PRESENT' | 'LATE' | 'OVERTIME' | 'EARLY_DEPARTURE' | 'HALF_DAY';
  overtime_minutes: number;
  handover_notes: string | null;
}

/**
 * Resolves professional clinical & administrative shift description based on employee role and scheduled duty
 */
function resolveAttendanceShiftLabel(r: any, serverEmployees?: any[]): string {
  const emp = serverEmployees?.find((e: any) => e.employee_code === r.staff_id);
  const role = r.staff_role || emp?.role;
  const deptCode = r.department_code || emp?.department_code;
  const deptName = r.department_name || (deptCode === 'DEP-HSTC' ? 'Khoa Hồi Sức Tích Cực' : deptCode === 'DEP-NOI' ? 'Khoa Nội Tổng Hợp' : deptCode === 'DEP-NGOAI' ? 'Khoa Ngoại Phẫu Thuật' : deptCode === 'DEP-KHTH' ? 'Phòng Kế Hoạch Tổng Hợp' : deptCode === 'DEP-SANNHI' ? 'Khoa Phụ Sản & Nhi' : deptCode === 'DEP-CDHA' ? 'Khoa Chẩn Đoán Hình Ảnh' : deptCode === 'DEP-DUOC' ? 'Khoa Dược Bệnh Viện' : 'Khoa Khám Bệnh');

  const isDoc = role === 'DOCTOR' || role === 'DEPARTMENT_HEAD';
  const isNur = role === 'NURSE';
  const isTech = role === 'TECHNICIAN';
  const isPharm = deptCode === 'DEP-DUOC' || role === 'STAFF';
  const isHRorAdmin = role === 'HR_MANAGER' || role === 'SUPER_ADMIN' || deptCode === 'DEP-KHTH';

  const timeSlot = (r.clock_in_time || '').slice(11, 16);
  const isNight = r.shift_type === 'NIGHT' || (r.scheduled_start && r.scheduled_start.includes('21:00')) || (r.clock_in_time && (timeSlot >= '20:30' || timeSlot < '06:00'));
  const isAfternoon = r.shift_type === 'AFTERNOON' || (r.scheduled_start && r.scheduled_start.includes('14:00')) || (r.clock_in_time && timeSlot >= '13:30' && timeSlot < '18:00');
  const isLeadership = r.on_call_tier === 'LEADERSHIP' || r.shift_type === 'ON_CALL';

  let shiftName = '';
  if (isLeadership) {
    shiftName = 'Trực Lãnh Đạo Viện (16:30 – 07:30)';
  } else if (isNight) {
    if (isDoc) shiftName = 'Ca 3: Trực Đêm Lâm Sàng (21:00 – 07:00)';
    else if (isNur) shiftName = 'Ca 3: Trực Đêm Điều Dưỡng (21:00 – 07:00)';
    else if (isTech) shiftName = 'Ca 3: Trực Đêm CĐHA 24/7 (21:00 – 07:00)';
    else shiftName = 'Ca 3: Trực Đêm (21:00 – 07:00)';
  } else if (isAfternoon) {
    if (isDoc) shiftName = 'Ca 2: Chiều Khám Bệnh (14:00 – 21:00)';
    else if (isNur) shiftName = 'Ca 2: Chiều Điều Dưỡng (14:00 – 21:00)';
    else if (isTech) shiftName = 'Ca 2: Chiều Kỹ Thuật (14:00 – 21:00)';
    else shiftName = 'Ca 2: Chiều (14:00 – 21:00)';
  } else {
    // Daytime
    const isMorningCa1 = (r.scheduled_start && r.scheduled_start.includes('07:00') && r.scheduled_end && r.scheduled_end.includes('14:00'));
    if (isMorningCa1) {
      if (isDoc) shiftName = 'Ca 1: Sáng Khám Lâm Sàng (07:00 – 14:00)';
      else if (isNur) shiftName = 'Ca 1: Sáng Chăm Sóc Buồng Bệnh (07:00 – 14:00)';
      else if (isTech) shiftName = 'Ca 1: Sáng Chụp X-Quang / CT (07:00 – 14:00)';
      else shiftName = 'Ca 1: Sáng (07:00 – 14:00)';
    } else {
      // Standard daytime
      if (isDoc) shiftName = 'Khám Bệnh Hành Chính (07:30 – 16:30)';
      else if (isNur) shiftName = 'Hành Chính Điều Dưỡng (07:30 – 16:30)';
      else if (isTech) shiftName = 'Kỹ Thuật Cận Lâm Sàng (07:30 – 16:30)';
      else if (isPharm) shiftName = 'Cấp Phát Dược Phẩm BHYT (07:30 – 16:30)';
      else if (isHRorAdmin) shiftName = 'Làm Việc Hành Chính (07:30 – 16:30)';
      else shiftName = 'Làm Việc Hành Chính (07:30 – 16:30)';
    }
  }

  return `${shiftName} • ${deptName}`;
}

export const AttendanceClock: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isManager = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'ADMIN';

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // TanStack Query: Fetch live attendance records from MySQL
  const {
    data: serverRecords,
    isLoading: isAttendanceLoading,
    isFetching: isAttendanceFetching
  } = useQuery({
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

  // Supervisor override mode (exclusive to SUPER_ADMIN / HR_MANAGER)
  const [adminOverrideMode, setAdminOverrideMode] = useState<boolean>(false);
  const [overrideStaffCode, setOverrideStaffCode] = useState<string>('');

  // Target staff ID for punch operations: strictly user's own employee_code for regular staff
  const currentStaffId = (isManager && adminOverrideMode && overrideStaffCode)
    ? overrideStaffCode
    : (user?.employee_code || 'EMP-DOC-001');

  // Clock in method
  const [clockMethod, setClockMethod] = useState<'BIOMETRIC' | 'RFID_CARD' | 'KIOSK_TERMINAL' | 'MOBILE_GEOFENCE'>('BIOMETRIC');

  // Clock out modal
  const [showClockOutModal, setShowClockOutModal] = useState<boolean>(false);
  const [selectedRecordToOut, setSelectedRecordToOut] = useState<AttendanceRecord | null>(null);
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [overtimeExtra, setOvertimeExtra] = useState<number>(0);

  // Table options: Hide past shifts, Hide colleagues, Search query
  const [hidePastShifts, setHidePastShifts] = useState<boolean>(false);
  const [hideColleagues, setHideColleagues] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
          shift_id: r.shift_id || null,
          staff_id: r.staff_id,
          staff_name: staffName,
          staff_role: r.staff_role,
          department_code: r.department_code,
          department_name: r.department_name,
          specialty: r.specialty,
          shift_type: r.shift_type,
          on_call_tier: r.on_call_tier,
          scheduled_start: r.scheduled_start,
          scheduled_end: r.scheduled_end,
          shift_label: resolveAttendanceShiftLabel(r, serverEmployees),
          clock_in_time: r.clock_in_time,
          clock_out_time: r.clock_out_time,
          clock_in_method: r.clock_in_method || 'BIOMETRIC',
          attendance_status: r.attendance_status || 'PRESENT',
          overtime_minutes: r.overtime_minutes || 0,
          handover_notes: r.handover_notes
        };
      })
    : [];

  // Local date helper (YYYY-MM-DD)
  const todayYmd = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, '0');
    const d = String(currentTime.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [currentTime]);

  // Today's records (clocked in today)
  const todayRecords = useMemo(() => {
    return records.filter((r: AttendanceRecord) => (r.clock_in_time || '').startsWith(todayYmd));
  }, [records, todayYmd]);

  // Active sessions: not clocked out and clocked in within the last 24 hours
  const activeSessions = useMemo(() => {
    const nowMs = currentTime.getTime();
    return records.filter((r: AttendanceRecord) => {
      if (r.clock_out_time) return false;
      const inMs = new Date(r.clock_in_time.replace(' ', 'T')).getTime();
      return !isNaN(inMs) && (nowMs - inMs) <= 24 * 60 * 60 * 1000;
    });
  }, [records, currentTime]);

  // Today's late count
  const todayLateCount = useMemo(() => {
    return todayRecords.filter((r: AttendanceRecord) => r.attendance_status === 'LATE').length;
  }, [todayRecords]);

  // Total overtime minutes
  const totalOvertimeMin = useMemo(() => {
    return records.reduce((acc: number, r: AttendanceRecord) => acc + (r.overtime_minutes || 0), 0);
  }, [records]);

  // Scoped to the current targeted staff ID (by default, logged-in user)
  const activeSession = records.find(
    (r) => r.staff_id === currentStaffId && !r.clock_out_time
  );

  const handleClockIn = () => {
    clockInMutation.mutate({
      staff_id: currentStaffId,
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

  const displayRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Option Hide Colleagues
      if (hideColleagues) {
        const myId = user?.employee_code || currentStaffId;
        if (r.staff_id !== myId) return false;
      }

      // 2. Option Hide Past Shifts (Only show today's shifts or active open sessions)
      if (hidePastShifts) {
        const isToday = (r.clock_in_time || '').startsWith(todayYmd);
        const isOpen = !r.clock_out_time;
        if (!isToday && !isOpen) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const staffName = (r.staff_name || '').toLowerCase();
        const staffId = (r.staff_id || '').toLowerCase();
        const dept = (r.department_name || r.department_code || '').toLowerCase();
        const label = (r.shift_label || '').toLowerCase();
        const spec = (r.specialty || r.staff_role || '').toLowerCase();
        const match = staffName.includes(q) || staffId.includes(q) || dept.includes(q) || label.includes(q) || spec.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [records, hideColleagues, hidePastShifts, searchQuery, user?.employee_code, currentStaffId, todayYmd]);

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
                      <Clock size={13} style={{ color: 'var(--wd-orange)' }} /> {t('attendance.in_shift_now', 'Đang Trong Ca Trực')}
                    </span>
                    <span className="wd-badge-success">{t('attendance.status_on_duty', 'Đang Trực')}</span>
                  </div>
                  <div className="fw-bold text-dark mb-1" style={{ fontSize: '14px' }}>{activeSession.staff_name}</div>
                  <div className="text-muted small mb-3" style={{ fontSize: '11px' }}>
                    {t('attendance.clock_in_at', 'Vào ca lúc')}: {activeSession.clock_in_time.split(' ')[1] || activeSession.clock_in_time} &bull; {activeSession.shift_label}
                  </div>
                  <button
                    type="button"
                    className="wd-pill-btn-outline w-100 justify-content-center text-danger"
                    style={{ borderColor: 'var(--wd-red-border)', backgroundColor: 'var(--wd-red-bg)' }}
                    onClick={() => {
                      setSelectedRecordToOut(activeSession);
                      setShowClockOutModal(true);
                    }}
                  >
                    <LogOut size={14} />
                    <span>{t('attendance.record_clock_out_btn', 'Ghi Nhận Ra Ca & Bàn Giao')}</span>
                  </button>
                </div>
              ) : (
                <div>
                  {isManager && adminOverrideMode ? (
                    /* Supervisor Override Mode for Admins / HR */
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-1.5">
                        <label className="wd-label mb-0" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                          {t('attendance.admin_support_title', 'Hỗ Trợ Điểm Danh Cho Nhân Sự')}
                        </label>
                        <button
                          type="button"
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          style={{ fontSize: '11px' }}
                          onClick={() => {
                            setAdminOverrideMode(false);
                            setOverrideStaffCode('');
                          }}
                        >
                          {t('attendance.back_to_self', 'Về tài khoản của tôi')}
                        </button>
                      </div>

                      <div className="p-2 mb-2 rounded-2 border bg-warning-subtle text-dark small" style={{ fontSize: '11px' }}>
                        <AlertTriangle size={13} className="me-1 text-warning d-inline" />
                        {t('attendance.admin_support_notice', 'Chế độ Quản trị: Hỗ trợ ghi nhận cho nhân sự gặp sự cố thiết bị.')}
                      </div>

                      <select
                        aria-label={t('attendance.select_staff', 'Chọn Cán Bộ Y Tế Cần Hỗ Trợ')}
                        className="wd-select w-100"
                        value={overrideStaffCode}
                        onChange={(e) => setOverrideStaffCode(e.target.value)}
                      >
                        <option value="">-- {t('attendance.select_staff_placeholder', 'Chọn nhân viên y tế')} --</option>
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
                    </div>
                  ) : (
                    /* Verified Individual Staff Identity (Strictly Locked to Logged-in User) */
                    <div className="mb-3">
                      <div className="d-flex align-items-center justify-content-between mb-1.5">
                        <label className="wd-label mb-0" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                          {t('attendance.verified_identity', 'Cán Bộ Y Tế Điểm Danh')}
                        </label>
                        {isManager && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-decoration-none"
                            style={{ fontSize: '11px' }}
                            onClick={() => {
                              setAdminOverrideMode(true);
                              if (!overrideStaffCode && serverEmployees && serverEmployees.length > 0) {
                                setOverrideStaffCode(serverEmployees[0].employee_code);
                              }
                            }}
                          >
                            {t('attendance.switch_to_support', 'Hỗ trợ NV khác')}
                          </button>
                        )}
                      </div>

                      <div className="p-3 rounded-2 border bg-white d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                          style={{ width: '40px', height: '40px', backgroundColor: '#eff6ff', color: '#2563eb' }}
                        >
                          <UserCheck size={20} />
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                          <div className="fw-bold text-dark text-truncate" style={{ fontSize: '14px' }}>
                            {user?.name || user?.full_name || (serverEmployees?.find((e: any) => e.employee_code === currentStaffId) ? `${serverEmployees.find((e: any) => e.employee_code === currentStaffId).last_name} ${serverEmployees.find((e: any) => e.employee_code === currentStaffId).first_name}` : currentStaffId)}
                          </div>
                          <div className="text-muted small font-mono" style={{ fontSize: '11px' }}>
                            {currentStaffId} &bull; {user?.department || (serverEmployees?.find((e: any) => e.employee_code === currentStaffId)?.department_name || serverEmployees?.find((e: any) => e.employee_code === currentStaffId)?.department_code || user?.role || t('attendance.general_dept', 'Khoa Khám Bệnh'))}
                          </div>
                        </div>
                        <span className="wd-badge-success flex-shrink-0" style={{ fontSize: '10px' }}>
                          {t('attendance.logged_in_verified', 'Chính Chủ')}
                        </span>
                      </div>
                    </div>
                  )}

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
                    disabled={clockInMutation.isPending}
                  >
                    <LogIn size={15} />
                    <span>{clockInMutation.isPending ? t('common.saving', 'Đang xử lý...') : t('attendance.clock_in', 'Điểm Danh Vào Ca')}</span>
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
                  {activeSessions.length}
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
                  {todayLateCount}
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
                  {totalOvertimeMin} <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#6b7280' }}>{t('attendance.overtime_minutes_label', 'phút')}</span>
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
                  {todayRecords.length}
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
        <div className="wd-card-header d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="wd-card-title">{t('attendance.log_title', 'Nhật Ký Chấm Công & Điểm Danh')}</span>
            <span className="badge bg-secondary rounded-pill fw-normal">
              {displayRecords.length} / {records.length}
            </span>
          </div>

          {/* Options toolbar: Search, Hide past shifts, Hide colleagues, Reset */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Search Box */}
            <div className="position-relative" style={{ minWidth: '220px' }}>
              <input
                type="text"
                className="wd-input py-1 ps-4 pe-2"
                style={{ fontSize: '11px', height: '30px' }}
                placeholder="Tìm cán bộ, mã NV, khoa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search
                size={12}
                className="position-absolute text-muted"
                style={{ left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>

            {/* Option 1: Ẩn các ca cũ */}
            <button
              type="button"
              className={`wd-pill-btn py-1 px-2.5 d-flex align-items-center gap-1.5 ${
                hidePastShifts ? 'wd-pill-btn-primary' : 'wd-pill-btn-outline'
              }`}
              style={{ fontSize: '11px', height: '30px' }}
              onClick={() => setHidePastShifts(!hidePastShifts)}
              title="Chỉ hiển thị các ca trực hôm nay hoặc đang mở"
            >
              <Clock size={12} />
              <span>Ẩn Các Ca Cũ</span>
              {hidePastShifts && <Check size={11} className="ms-0.5" />}
            </button>

            {/* Option 2: Ẩn đồng nghiệp */}
            <button
              type="button"
              className={`wd-pill-btn py-1 px-2.5 d-flex align-items-center gap-1.5 ${
                hideColleagues ? 'wd-pill-btn-primary' : 'wd-pill-btn-outline'
              }`}
              style={{ fontSize: '11px', height: '30px' }}
              onClick={() => setHideColleagues(!hideColleagues)}
              title="Chỉ hiển thị các ca trực của riêng tài khoản này"
            >
              <UserCheck size={12} />
              <span>Ẩn Đồng Nghiệp</span>
              {hideColleagues && <Check size={11} className="ms-0.5" />}
            </button>

            {/* Reset Filter Button */}
            {(hidePastShifts || hideColleagues || searchQuery) && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-muted small text-decoration-none d-flex align-items-center gap-1 ms-1"
                style={{ fontSize: '11px' }}
                onClick={() => {
                  setHidePastShifts(false);
                  setHideColleagues(false);
                  setSearchQuery('');
                }}
              >
                <RotateCcw size={11} />
                <span>Hiện Tất Cả</span>
              </button>
            )}
          </div>
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
              {isAttendanceLoading ? (
                <TheoryOfNextLoader isTableBody columns={7} rows={5} />
              ) : displayRecords.length > 0 ? (
                displayRecords.map((r) => {
                  const isMyRecord = r.staff_id === (user?.employee_code || currentStaffId);
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="d-flex align-items-center gap-1.5">
                          <div className="fw-semibold text-dark">{r.staff_name}</div>
                          {isMyRecord && (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {t('attendance.me_badge', 'Tôi')}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-muted" style={{ fontSize: '11px' }}>
                          {r.staff_id}
                          {(r.specialty || r.staff_role) && (
                            <span> &bull; {r.specialty || r.staff_role}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-dark fw-medium" style={{ fontSize: '12px' }}>
                          {r.shift_label.split(' • ')[0] || r.shift_label}
                        </div>
                        {r.shift_label.includes(' • ') && (
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {r.shift_label.split(' • ')[1]}
                          </div>
                        )}
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="d-flex flex-column align-items-center justify-content-center text-muted">
                      <Filter size={28} className="text-secondary opacity-50 mb-2" />
                      <div className="fw-semibold text-dark mb-1" style={{ fontSize: '13px' }}>
                        Không có bản ghi điểm danh nào phù hợp
                      </div>
                      <div className="small mb-3" style={{ fontSize: '11px' }}>
                        Thử tắt bộ lọc "Ẩn các ca cũ", "Ẩn đồng nghiệp" hoặc xóa từ khóa tìm kiếm.
                      </div>
                      <button
                        type="button"
                        className="wd-pill-btn wd-pill-btn-outline py-1 px-3"
                        style={{ fontSize: '11px' }}
                        onClick={() => {
                          setHidePastShifts(false);
                          setHideColleagues(false);
                          setSearchQuery('');
                        }}
                      >
                        Bỏ Lọc & Hiện Tất Cả ({records.length} ca)
                      </button>
                    </div>
                  </td>
                </tr>
              )}
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
