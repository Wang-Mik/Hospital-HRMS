import React from 'react';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import {
  Inbox,
  Clock,
  Calendar,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  Users,
  Building2,
  Award,
  CreditCard,
  Send,
  UserCheck,
  Bell,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { shiftApi } from '../api/shiftApi';
import { taskApi } from '../api/taskApi';
import { handoverApi } from '../api/handoverApi';
import { leaveApi } from '../api/leaveApi';
import { notificationApi } from '../api/notificationApi';
import { adminApi } from '../api/adminApi';
import { departmentApi } from '../api/departmentApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

export const Dashboard: React.FC = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isHRorAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';

  const currentStaffName = user?.name || (isHRorAdmin ? 'Cán Bộ Quản Trị Nhân Sự' : 'BS. Nguyễn Văn A');
  const currentStaffCode = user?.employee_code || (isHRorAdmin ? 'EMP-HR-001' : 'EMP-DOC-001');

  // Queries for all users
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentStaffCode],
    queryFn: () => notificationApi.getByStaffId(currentStaffCode),
    staleTime: 30000
  });

  // Queries for HR / Admin
  const { data: adminOverview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.getOverview(),
    enabled: isHRorAdmin,
    staleTime: 30000
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getAll(),
    enabled: isHRorAdmin,
    staleTime: 30000
  });

  const { data: allLeaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => leaveApi.getAllRequests(),
    enabled: isHRorAdmin,
    staleTime: 30000
  });

  // Queries for Clinical Staff
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.getAll(),
    staleTime: 30000
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.getAll(),
    enabled: !isHRorAdmin,
    staleTime: 15000
  });

  const { data: handovers = [] } = useQuery({
    queryKey: ['handovers'],
    queryFn: () => handoverApi.getAll(),
    enabled: !isHRorAdmin,
    staleTime: 15000
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ['leaveBalances', currentStaffCode],
    queryFn: () => leaveApi.getBalances(currentStaffCode, 2026),
    enabled: !isHRorAdmin,
    staleTime: 30000
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ['leaveRequests', currentStaffCode],
    queryFn: () => leaveApi.getRequests(currentStaffCode),
    enabled: !isHRorAdmin,
    staleTime: 30000
  });

  // =========================================================================
  // VIEW 1: DEDICATED HR / ADMIN MANAGEMENT DASHBOARD
  // (No clinical ward rounds, no doctor bedside tasks, no shift handovers)
  // =========================================================================
  if (isHRorAdmin) {
    const kpis = adminOverview?.kpis || {
      total_employees: 10,
      total_departments: 8,
      pending_leaves: allLeaveRequests.filter((r: any) => r.status === 'PENDING').length,
      expiring_licenses_30d: 0,
      total_disbursed_vnd: 367200000,
      active_accounts: 10
    };

    const pendingLeavesList = allLeaveRequests.filter((r: any) => r.status === 'PENDING');

    return (
      <div>
        {/* 1. HR Executive Promotional Banner */}
        <div
          className="rounded-3 p-4 mb-4 text-white position-relative overflow-hidden shadow-sm"
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%)',
            minHeight: '140px'
          }}
        >
          <div className="position-relative z-1 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div>
              <span className="badge rounded-pill bg-white text-primary fw-semibold px-2.5 py-1 mb-2 text-uppercase" style={{ fontSize: '11px' }}>
                KHỐI TỔ CHỨC CÁN BỘ &bull; BAN GIÁM ĐỐC
              </span>
              <h4 className="fw-bold mb-1 text-white" style={{ letterSpacing: '-0.02em' }}>
                Trung Tâm Chỉ Huy Quản Trị Nhân Sự Bệnh Viện
              </h4>
              <p className="text-white text-opacity-85 mb-0 small" style={{ maxWidth: '640px', fontSize: '13px' }}>
                Điều hành hồ sơ cán bộ, quản trị tài khoản IAM, duyệt nghỉ phép, định mức chi trả lương VND và tuân thủ chứng chỉ hành nghề y tế.
              </p>
            </div>
            <div className="d-flex gap-2 flex-shrink-0">
              <Link to="/admin" className="btn btn-sm btn-light fw-semibold text-primary px-3.5 py-2 rounded-pill shadow-sm">
                Vào Cổng Quản Trị Toàn Diện &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Welcome Title & HR Quick Action Pills */}
        <div className="text-center my-4 py-1">
          <h3 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.02em', fontSize: '24px' }}>
            Chào mừng, {currentStaffName}
          </h3>
          <p className="text-muted small mb-3">
            {user?.role === 'SUPER_ADMIN' ? 'Ban Giám Đốc Bệnh Viện (Super Admin)' : 'Trưởng Phòng Tổ Chức Cán Bộ (HR Manager)'}
          </p>

          <div className="d-flex flex-wrap justify-content-center gap-2">
            <Link to="/admin" className="wd-pill-btn text-primary fw-semibold">
              <ShieldCheck size={14} className="me-1" /> Quản trị hệ thống &amp; IAM
            </Link>
            <Link to="/leave" className="wd-pill-btn">
              <Calendar size={14} className="me-1" /> Duyệt phép ({kpis.pending_leaves} chờ duyệt)
            </Link>
            <Link to="/payroll" className="wd-pill-btn">
              <CreditCard size={14} className="me-1" /> Định mức lương VND
            </Link>
            <Link to="/employees" className="wd-pill-btn">
              <Users size={14} className="me-1" /> Hồ sơ cán bộ ({kpis.total_employees})
            </Link>
            <Link to="/licenses" className="wd-pill-btn">
              <Award size={14} className="me-1" /> Giám sát CCHN y tế
            </Link>
            <Link to="/notifications" className="wd-pill-btn">
              <Bell size={14} className="me-1" /> Phát lệnh thông báo
            </Link>
          </div>
        </div>

        {/* 3. HR 2-Column Bento Grid */}
        <Row className="g-4">
          {/* LEFT COLUMN: Awaiting HR Action & Department Headcount */}
          <Col lg={7} xl={8}>
            {/* Section: Awaiting HR Action */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '17px' }}>
                  Cần HR Xử Lý Ngay (Awaiting HR Action)
                </h5>
                <span className="text-muted small">
                  {kpis.pending_leaves + kpis.expiring_licenses_30d} mục ưu tiên
                </span>
              </div>

              <div className="d-flex flex-column gap-2.5">
                {/* Pending Leaves Item */}
                {pendingLeavesList.length > 0 ? (
                  pendingLeavesList.slice(0, 3).map((l: any) => (
                    <Card key={l.id} className="wd-card mb-0 border-start border-4 border-warning">
                      <Card.Body className="p-3.5 d-flex align-items-start justify-content-between gap-3">
                        <div className="d-flex align-items-start gap-3">
                          <div
                            className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 text-warning"
                            style={{ width: '38px', height: '38px', backgroundColor: '#fef3c7' }}
                          >
                            <Calendar size={20} />
                          </div>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                              Đơn xin nghỉ phép: {l.staff_name || l.staff_id}
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: '12.5px' }}>
                              Khoa: <span className="text-dark fw-medium">{l.department_name || l.department_code}</span> &bull; {l.leave_type} ({l.days_requested || '1'} ngày) &bull; Lý do: {l.reason || 'Không có'}
                            </div>
                            <div className="mt-2">
                              <span className="badge bg-warning bg-opacity-20 text-dark fw-normal">CHỜ PHÊ DUYỆT</span>
                            </div>
                          </div>
                        </div>
                        <Link to="/leave" className="wd-pill-btn-primary flex-shrink-0" style={{ fontSize: '12px', padding: '5px 14px' }}>
                          Xét duyệt &gt;
                        </Link>
                      </Card.Body>
                    </Card>
                  ))
                ) : (
                  <Card className="wd-card mb-0">
                    <Card.Body className="p-3 text-center text-muted">
                      <CheckCircle2 size={24} className="text-success mb-1" />
                      <div className="fw-semibold text-dark small">Không có đơn xin nghỉ phép nào tồn đọng</div>
                    </Card.Body>
                  </Card>
                )}

                {/* Licenses Warning Item */}
                {kpis.expiring_licenses_30d > 0 && (
                  <Card className="wd-card mb-0 border-start border-4 border-danger">
                    <Card.Body className="p-3.5 d-flex align-items-start justify-content-between gap-3">
                      <div className="d-flex align-items-start gap-3">
                        <div
                          className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 text-danger"
                          style={{ width: '38px', height: '38px', backgroundColor: '#fee2e2' }}
                        >
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                            {kpis.expiring_licenses_30d} Chứng chỉ hành nghề sắp hết hạn (&lt; 30 ngày)
                          </div>
                          <div className="text-muted small mt-0.5" style={{ fontSize: '12.5px' }}>
                            Cần yêu cầu cán bộ hoàn tất hồ sơ gia hạn với Sở Y Tế để bảo đảm điều kiện tham gia trực lâm sàng.
                          </div>
                        </div>
                      </div>
                      <Link to="/licenses" className="wd-pill-btn flex-shrink-0 text-danger" style={{ fontSize: '12px', padding: '5px 14px' }}>
                        Kiểm tra &gt;
                      </Link>
                    </Card.Body>
                  </Card>
                )}

                <div className="text-start ps-1 pt-1">
                  <Link to="/leave" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1">
                    <span>Vào toàn bộ danh sách phê duyệt nghỉ phép viện &gt;</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Section: Hospital Department Headcounts */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '17px' }}>
                  Cơ Cấu Nhân Lực 8 Khoa Phòng Bệnh Viện
                </h5>
                <Link to="/admin" className="text-decoration-none fw-semibold text-primary small">
                  Quản lý khoa phòng &gt;
                </Link>
              </div>

              <Card className="wd-card overflow-hidden">
                <div className="table-responsive">
                  <table className="wd-table">
                    <thead>
                      <tr>
                        <th>Mã Khoa</th>
                        <th>Tên Khoa / Phòng Chuyên Môn</th>
                        <th>Vị Trí Khu Nhà</th>
                        <th>Nhân Lực Thực Tế</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((d: any) => (
                        <tr key={d.department_code}>
                          <td className="font-monospace fw-semibold text-primary">{d.department_code}</td>
                          <td className="fw-medium text-dark">{d.name}</td>
                          <td className="small text-muted">{d.location || 'Khu nhà khám chữa bệnh'}</td>
                          <td>
                            <strong className="text-dark">{d.employee_count ?? 0} cán bộ</strong>
                          </td>
                          <td>
                            <span className="badge bg-success bg-opacity-10 text-success fw-normal">
                              {d.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </Col>

          {/* RIGHT COLUMN: Broadcast Feed & Compensation Summary */}
          <Col lg={5} xl={4}>
            {/* Card: Announcements */}
            <Card className="wd-card mb-4">
              <Card.Header className="wd-card-header d-flex align-items-center justify-content-between">
                <span className="wd-card-title">{lang === 'vi' ? 'Thông Báo Bệnh Viện' : 'Hospital Announcements'}</span>
                <Link to="/notifications" className="text-primary text-decoration-none small fw-semibold" style={{ fontSize: '12px' }}>
                  {lang === 'vi' ? 'Xem tất cả' : 'View all'} • {notifications.length}
                </Link>
              </Card.Header>
              <Card.Body className="p-3">
                {notifications && notifications.length > 0 ? (
                  <div
                    className="rounded-2 p-3 text-white mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
                    }}
                  >
                    <div className="small text-white text-opacity-75 text-uppercase fw-semibold mb-1" style={{ fontSize: '11px' }}>
                      {notifications[0].type || 'Hệ thống'} &bull; {notifications[0].created_at ? new Date(notifications[0].created_at).toLocaleDateString('vi-VN') : 'Hôm nay'}
                    </div>
                    <div className="fw-bold mb-1" style={{ fontSize: '14px' }}>
                      {notifications[0].title}
                    </div>
                    <div className="small text-white text-opacity-85" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                      {notifications[0].message}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 text-center text-muted small bg-light rounded-2 mb-3">
                    Chưa có thông báo mới nào.
                  </div>
                )}
                <div className="d-flex align-items-center justify-content-between pt-1">
                  <Link to="/notifications" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1">
                    <span>Mở trung tâm thông báo &gt;</span>
                  </Link>
                  <Link to="/admin" className="btn btn-sm btn-outline-primary py-0.5 px-2" style={{ fontSize: '11.5px' }}>
                    Phát thông báo
                  </Link>
                </div>
              </Card.Body>
            </Card>

            {/* Card: Payroll Fund Summary */}
            <Card className="wd-card mb-4">
              <Card.Header className="wd-card-header">
                <span className="wd-card-title">{lang === 'vi' ? 'Quỹ Lương & Đãi Ngộ Cán Bộ' : 'Payroll & Staff Compensation'}</span>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="p-3 bg-light rounded-2 border mb-3">
                  <div className="text-muted small mb-1">Tổng Lũy Kế Chi Lương Thực Nhận</div>
                  <div className="h4 fw-bold text-success mb-1">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(kpis.total_disbursed_vnd || 0))}
                  </div>
                  <div className="text-muted small">Quy chuẩn 176 giờ làm việc / tháng tiêu chuẩn Việt Nam</div>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <Link to="/payroll" className="text-decoration-none fw-semibold text-primary small">
                    Quản lý kỳ lương &amp; phiếu lương &gt;
                  </Link>
                </div>
              </Card.Body>
            </Card>

            {/* Card: Quick Admin Links */}
            <Card className="wd-card">
              <Card.Header className="wd-card-header">
                <span className="wd-card-title">Lối Tắt Quản Trị Hệ Thống</span>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="d-flex flex-column gap-2">
                  <Link to="/admin" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                    <span className="small fw-semibold">🛡️ Cổng Quản Trị Hệ Thống &amp; IAM</span>
                    <ChevronRight size={15} className="text-muted" />
                  </Link>
                  <Link to="/employees" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                    <span className="small fw-semibold">👥 Danh Bạ Cán Bộ &amp; Bổ Nhiệm</span>
                    <ChevronRight size={15} className="text-muted" />
                  </Link>
                  <Link to="/licenses" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                    <span className="small fw-semibold">📜 Giám Sát Chứng Chỉ Hành Nghề</span>
                    <ChevronRight size={15} className="text-muted" />
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: CLINICAL STAFF DASHBOARD (Doctors, Nurses, Care Team)
  // (Shift roster, patient bed handovers, attendance clock-in, clinical tasks)
  // =========================================================================
  const pendingHandovers = handovers?.filter((h: any) => h.status === 'PENDING_SIGNATURE') || [];
  const pendingTasks = tasks?.filter((t: any) => t.status !== 'COMPLETED') || [];
  const annualBal = Array.isArray(leaveBalances) ? leaveBalances.find((b: any) => b.leave_type === 'ANNUAL') : null;
  const annualRemaining = annualBal ? annualBal.remaining_days : 0;
  const upcomingLeave = Array.isArray(leaveRequests) ? leaveRequests.find((r: any) => r.status === 'APPROVED' || r.status === 'PENDING') : null;

  return (
    <div>
      {/* 1. Clinical Header Banner */}
      <div
        className="rounded-3 p-4 mb-4 text-white position-relative overflow-hidden shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #1e40af 100%)',
          minHeight: '140px'
        }}
      >
        <div className="position-relative z-1 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <span className="badge rounded-pill bg-white text-primary fw-semibold px-2.5 py-1 mb-2 text-uppercase" style={{ fontSize: '11px' }}>
              KHỐI KHÁM CHỮA BỆNH LÂM SÀNG
            </span>
            <h4 className="fw-bold mb-1 text-white" style={{ letterSpacing: '-0.02em' }}>
              Bàn Làm Việc Lâm Sàng &bull; Bệnh viện Đa khoa Quốc tế
            </h4>
            <p className="text-white text-opacity-85 mb-0 small" style={{ maxWidth: '640px', fontSize: '13px' }}>
              Theo dõi lịch trực 24/7, điểm danh vào ca trực, thực hiện y lệnh buồng bệnh và ký số biên bản bàn giao ca y tế.
            </p>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <Link to="/attendance" className="btn btn-sm btn-light fw-semibold text-primary px-3.5 py-2 rounded-pill shadow-sm">
              Chấm công ca trực
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Doctor Center Header */}
      <div className="text-center my-4 py-1">
        <h3 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.02em', fontSize: '24px' }}>
          Chào mừng, {currentStaffName}
        </h3>
        <p className="text-muted small mb-3">
          Mã số cán bộ: <strong>{currentStaffCode}</strong> &bull; Chức vụ: {user?.role || 'DOCTOR'}
        </p>

        {/* Workday Quick Action Pill Row for Doctors/Nurses */}
        <div className="d-flex flex-wrap justify-content-center gap-2">
          <Link to="/leave" className="wd-pill-btn">
            Quản lý nghỉ phép
          </Link>
          <Link to="/attendance" className="wd-pill-btn">
            Chấm công ca trực
          </Link>
          <Link to="/shifts" className="wd-pill-btn">
            Lịch trực khoa phòng
          </Link>
          <Link to="/tasks" className="wd-pill-btn">
            Y lệnh &amp; Nhiệm vụ
          </Link>
          <Link to="/handovers" className="wd-pill-btn">
            Biên bản bàn giao ca
          </Link>
          <Link to="/payroll" className="wd-pill-btn">
            Phiếu lương của tôi
          </Link>
        </div>
      </div>

      {/* 3. Clinical 2-Column Bento Grid */}
      <Row className="g-4">
        {/* LEFT COLUMN: Awaiting Your Action & Timely Suggestions */}
        <Col lg={7} xl={8}>
          {/* Section: Awaiting Your Action */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '17px' }}>
                Đang chờ xử lý lâm sàng (Awaiting Your Action)
              </h5>
              <span className="text-muted small">
                {pendingHandovers.length + pendingTasks.length} mục cần xác nhận
              </span>
            </div>

            <div className="d-flex flex-column gap-2.5">
              {pendingHandovers.length === 0 && pendingTasks.length === 0 ? (
                <Card className="wd-card mb-0">
                  <Card.Body className="p-4 text-center text-muted">
                    <ShieldCheck size={28} className="text-success mb-2" />
                    <div className="fw-semibold text-dark">Bạn đã hoàn tất tất cả công việc cần xác nhận</div>
                    <div className="small text-muted mt-1">Không có ca trực cần ký bàn giao hay nhiệm vụ lâm sàng tồn đọng.</div>
                  </Card.Body>
                </Card>
              ) : (
                <>
                  {/* Shift Handover Signatures */}
                  {pendingHandovers.map((h: any) => (
                    <Card key={h.id} className="wd-card mb-0">
                      <Card.Body className="p-3.5 d-flex align-items-start justify-content-between gap-3">
                        <div className="d-flex align-items-start gap-3">
                          <div
                            className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 text-primary"
                            style={{ width: '38px', height: '38px', backgroundColor: '#e8f2fc' }}
                          >
                            <Inbox size={20} />
                          </div>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                              Ký số bàn giao ca trực #{h.id?.slice(0, 8)}
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: '12.5px' }}>
                              Bàn giao bởi: <span className="text-dark fw-medium">{h.logged_by_name || 'Bác sĩ trực trước'}</span> &bull; Ghi chú: {h.general_notes || 'a'}
                            </div>
                            <div className="mt-2">
                              <span className="badge bg-danger bg-opacity-10 text-danger fw-normal">CẦN KÝ XÁC NHẬN</span>
                            </div>
                          </div>
                        </div>
                        <Link to="/handovers" className="wd-pill-btn-primary flex-shrink-0" style={{ fontSize: '12px', padding: '5px 14px' }}>
                          Ký nhận &gt;
                        </Link>
                      </Card.Body>
                    </Card>
                  ))}

                  {/* Tasks */}
                  {pendingTasks.slice(0, 2).map((t: any) => (
                    <Card key={t.id} className="wd-card mb-0">
                      <Card.Body className="p-3.5 d-flex align-items-start justify-content-between gap-3">
                        <div className="d-flex align-items-start gap-3">
                          <div
                            className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 text-success"
                            style={{ width: '38px', height: '38px', backgroundColor: '#ecfdf5' }}
                          >
                            <CheckSquare size={20} />
                          </div>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                              {t.title}
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: '12.5px' }}>
                              {t.description || 'Y lệnh chăm sóc buồng bệnh'}
                            </div>
                          </div>
                        </div>
                        <Link to="/tasks" className="wd-pill-btn flex-shrink-0" style={{ fontSize: '12px', padding: '5px 14px' }}>
                          Chi tiết &gt;
                        </Link>
                      </Card.Body>
                    </Card>
                  ))}
                </>
              )}

              <div className="text-start ps-1 pt-1">
                <Link to="/tasks" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1">
                  <span>Chuyển đến Toàn bộ Nhiệm vụ của tôi ({pendingTasks.length + pendingHandovers.length})</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Section: Timely Suggestions */}
          <div className="mb-4">
            <h5 className="fw-bold text-dark mb-2" style={{ fontSize: '17px' }}>
              Gợi ý kịp thời (Timely Suggestions)
            </h5>
            <Card className="wd-card">
              <Card.Body className="p-3.5 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0 text-secondary"
                    style={{ width: '40px', height: '40px', backgroundColor: '#f3f4f6' }}
                  >
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                      {upcomingLeave
                        ? `Lịch nghỉ phép: từ ${upcomingLeave.start_date} đến ${upcomingLeave.end_date}`
                        : `Kế hoạch nghỉ phép thường niên năm 2026`}
                    </div>
                    <div className="text-muted small" style={{ fontSize: '12.5px' }}>
                      Quỹ phép năm của bạn hiện còn {annualRemaining} ngày. Hãy đăng ký sớm để khoa xếp lịch trực.
                    </div>
                  </div>
                </div>
                <Link to="/leave" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1 flex-shrink-0">
                  <span>Xem Lịch Nghỉ &gt;</span>
                </Link>
              </Card.Body>
            </Card>
          </div>

          {/* Section: Active Shift Roster Summary Table */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '17px' }}>
                Ca trực Bệnh viện Đang Hoạt động
              </h5>
              <Link to="/shifts" className="text-decoration-none fw-semibold text-primary small">
                Xem toàn bộ lịch trực &gt;
              </Link>
            </div>

            <Card className="wd-card overflow-hidden">
              <div className="table-responsive">
                <table className="wd-table">
                  <thead>
                    <tr>
                      <th>Nhân sự Y tế</th>
                      <th>Khoa / Phòng</th>
                      <th>Ca trực</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.slice(0, 4).map((s: any) => (
                      <tr key={s.id}>
                        <td>
                          <div className="fw-semibold text-dark">{s.staff_name || s.staff_id}</div>
                          <span className="text-muted font-mono" style={{ fontSize: '11px' }}>{s.staff_id}</span>
                        </td>
                        <td className="small text-secondary">{s.department_name || s.department_code}</td>
                        <td>
                          <Badge bg="info" className="fw-normal">{s.shift_type}</Badge>
                        </td>
                        <td className="small font-mono text-dark">
                          {s.start_time?.slice(11, 16)} &ndash; {s.end_time?.slice(11, 16)}
                        </td>
                        <td>
                          <Badge bg={s.status === 'IN_PROGRESS' ? 'success' : 'secondary'} className="fw-normal">
                            {s.status === 'IN_PROGRESS' ? 'Đang trực' : 'Đã xếp lịch'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </Col>

        {/* RIGHT COLUMN: Announcements & Important Dates */}
        <Col lg={5} xl={4}>
          {/* Card: Announcements (Link to /notifications, NOT /handovers!) */}
          <Card className="wd-card mb-4">
            <Card.Header className="wd-card-header">
              <span className="wd-card-title">{lang === 'vi' ? 'Thông Báo Bệnh Viện' : 'Hospital Announcements'}</span>
              <span className="text-muted" style={{ fontSize: '11px' }}>
                {notifications.length > 0 ? (lang === 'vi' ? `1 trên ${notifications.length}` : `1 of ${notifications.length}`) : (lang === 'vi' ? '0 thông báo' : '0 announcements')}
              </span>
            </Card.Header>
            <Card.Body className="p-3">
              {notifications.length > 0 ? (
                <div
                  className="rounded-2 p-3 text-white mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
                  }}
                >
                  <div className="small text-white text-opacity-75 text-uppercase fw-semibold mb-1" style={{ fontSize: '11px' }}>
                    {notifications[0].type || 'Hệ thống'} &bull; {notifications[0].created_at ? new Date(notifications[0].created_at).toLocaleDateString('vi-VN') : 'Hôm nay'}
                  </div>
                  <div className="fw-bold mb-1" style={{ fontSize: '14px' }}>
                    {notifications[0].title}
                  </div>
                  <div className="small text-white text-opacity-85" style={{ fontSize: '12px' }}>
                    {notifications[0].message}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-muted small bg-light rounded-2 mb-3">
                  Không có thông báo mới từ ban giám đốc viện.
                </div>
              )}
              {/* IMPORTANT: Link to /notifications, NOT /handovers */}
              <div className="text-end">
                <Link to="/notifications" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1">
                  <span>Xem tất cả thông báo viện &gt;</span>
                </Link>
              </div>
            </Card.Body>
          </Card>

          {/* Card: Important Dates */}
          <Card className="wd-card mb-4">
            <Card.Header className="wd-card-header">
              <span className="wd-card-title">{lang === 'vi' ? 'Ngày Quan Trọng' : 'Important Dates'}</span>
            </Card.Header>
            <Card.Body className="p-3">
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="rounded-2 text-center p-1.5 flex-shrink-0"
                    style={{ width: '42px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}
                  >
                    <div className="fw-bold text-uppercase text-danger" style={{ fontSize: '9.5px' }}>T10</div>
                    <div className="fw-bold text-dark" style={{ fontSize: '15px', lineHeight: 1.1 }}>01</div>
                  </div>
                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                      Kỳ chuyển giao ca trực Tháng 10
                    </div>
                    <div className="text-muted small" style={{ fontSize: '11.5px' }}>
                      Toàn viện &bull; Điều chỉnh định mức làm thêm giờ và trực đêm
                    </div>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
