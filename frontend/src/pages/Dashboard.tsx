import React from 'react';
import { Row, Col, Card, Badge } from 'react-bootstrap';
import {
  ClipboardList,
  Clock,
  Calendar,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  ExternalLink,
  Users,
  Building2,
  Award,
  CreditCard,
  Send,
  Bell,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  FileText
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
import { TheoryOfNextLoader } from '../components/common/TheoryOfNextLoader';

export const Dashboard: React.FC = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isHRorAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';
  const isAdmin = user?.role === 'SUPER_ADMIN';
  const isHR = user?.role === 'HR_MANAGER';

  const currentStaffName = user?.name || (isHRorAdmin ? t('dashboard.hr_admin_title', 'Cán Bộ Quản Trị Nhân Sự') : t('dashboard.doctor_default', 'BS. Nguyễn Văn A'));
  const currentStaffCode = user?.employee_code || (isHRorAdmin ? 'EMP-HR-001' : 'EMP-DOC-001');

  // Queries for all users
  const { data: notifications = [], isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['notifications', currentStaffCode],
    queryFn: () => notificationApi.getByStaffId(currentStaffCode),
    staleTime: 30000
  });

  // Queries for HR / Admin
  const { data: adminOverview, isLoading: isAdminOverviewLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => adminApi.getOverview(),
    enabled: isHRorAdmin,
    staleTime: 30000
  });

  const { data: departments = [], isLoading: isDepartmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getAll(),
    enabled: isHRorAdmin,
    staleTime: 30000
  });

  const { data: allLeaveRequests = [], isLoading: isLeaveRequestsLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: () => leaveApi.getAllRequests(),
    enabled: isHRorAdmin,
    staleTime: 30000
  });

  // Queries for Clinical Staff
  const { data: shifts = [], isLoading: isShiftsLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.getAll(),
    staleTime: 30000
  });

  const { data: tasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.getAll(),
    enabled: !isHRorAdmin,
    staleTime: 15000
  });

  const { data: handovers = [], isLoading: isHandoversLoading } = useQuery({
    queryKey: ['handovers'],
    queryFn: () => handoverApi.getAll(),
    enabled: !isHRorAdmin,
    staleTime: 15000
  });

  const { data: leaveBalances = [], isLoading: isLeaveBalancesLoading } = useQuery({
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
        {/* 1. Executive Promotional Banner (Tailored strictly to Role: Admin vs HR) */}
        <div
          className="rounded-3 p-4 mb-4 text-white position-relative overflow-hidden shadow-sm"
          style={{
            background: isAdmin
              ? 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)'
              : 'linear-gradient(135deg, #1e3a8a 0%, #0369a1 100%)',
            minHeight: '140px'
          }}
        >
          <div className="position-relative z-1 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div>
              <span className="badge rounded-pill bg-white text-primary fw-semibold px-2.5 py-1 mb-2 text-uppercase" style={{ fontSize: '11px' }}>
                {isAdmin
                  ? t('dashboard.admin_banner_badge', 'BAN GIÁM ĐỐC • QUẢN TRỊ HỆ THỐNG TỐI CAO')
                  : t('dashboard.banner_hr_dept', 'KHỐI TỔ CHỨC CÁN BỘ • PHÒNG NHÂN SỰ')}
              </span>
              <h1 className="fw-bold mb-1 text-white" style={{ letterSpacing: '-0.02em', fontSize: '1.4rem' }}>
                {isAdmin
                  ? t('dashboard.admin_banner_title', 'Trung Tâm Chỉ Huy Quản Trị Hệ Thống & Bảo Mật')
                  : t('dashboard.banner_hr_title', 'Trung Tâm Chỉ Huy Quản Trị Nhân Sự Bệnh Viện')}
              </h1>
              <p className="text-white text-opacity-85 mb-0 small" style={{ maxWidth: '640px', fontSize: '13px' }}>
                {isAdmin
                  ? t('dashboard.admin_banner_desc', 'Điều hành định danh IAM, phân quyền vai trò bảo mật, cơ cấu khoa phòng và phát lệnh thông báo toàn viện.')
                  : t('dashboard.banner_hr_desc', 'Điều hành hồ sơ cán bộ, duyệt nghỉ phép viện, định mức chi trả lương VND và tuân thủ chứng chỉ hành nghề y tế.')}
              </p>
            </div>
            <div className="d-flex gap-2 flex-shrink-0">
              {isAdmin ? (
                <Link to="/admin" className="btn btn-sm btn-light fw-semibold text-primary px-3.5 py-2 rounded-pill shadow-sm">
                  {t('dashboard.banner_admin_btn', 'Quản Trị Hệ Thống')} &rarr;
                </Link>
              ) : (
                <Link to="/hr" className="btn btn-sm btn-light fw-semibold text-primary px-3.5 py-2 rounded-pill shadow-sm">
                  {t('dashboard.banner_hr_portal_btn', 'Vào Cổng Quản Trị Nhân Sự')} &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 2. Welcome Title & Quick Action Pills (Distinct Admin vs HR) */}
        <div className="text-center my-4 py-1">
          <h2 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.02em', fontSize: '24px' }}>
            {t('top_nav.welcome', 'Chào mừng')}, {currentStaffName}
          </h2>
          <p className="text-muted small mb-3">
            {isAdmin ? t('dashboard.role_super_admin', 'Ban Giám Đốc Bệnh Viện') : t('dashboard.role_hr_manager', 'Trưởng Phòng Tổ Chức Cán Bộ')}
          </p>

          <div className="d-flex flex-wrap justify-content-center gap-2">
            {isAdmin ? (
              <>
                <Link to="/admin" className="wd-pill-btn text-primary fw-semibold">
                  <ShieldCheck size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_iam', 'Quản trị hệ thống & IAM')}
                </Link>
                <Link to="/admin?tab=departments" className="wd-pill-btn">
                  <Building2 size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_departments', 'Khoa phòng & Cơ cấu')}
                </Link>
                <Link to="/admin?tab=broadcast" className="wd-pill-btn">
                  <Bell size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_broadcast', 'Phát lệnh thông báo')}
                </Link>
                <Link to="/employees" className="wd-pill-btn">
                  <Users size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_staff_records', 'Hồ sơ cán bộ')} ({kpis.total_employees})
                </Link>
              </>
            ) : (
              <>
                <Link to="/hr" className="wd-pill-btn text-success fw-semibold">
                  <UserCheck size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_hr', 'Quản trị nhân sự')}
                </Link>
                <Link to="/hr?tab=leaves" className="wd-pill-btn">
                  <Calendar size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_leave_review', 'Duyệt phép')} ({kpis.pending_leaves} {t('dashboard.pending_approval_count', 'chờ duyệt')})
                </Link>
                <Link to="/hr?tab=compensation" className="wd-pill-btn">
                  <CreditCard size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_pay_vnd', 'Định mức lương VND')}
                </Link>
                <Link to="/employees" className="wd-pill-btn">
                  <Users size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_staff_records', 'Hồ sơ cán bộ')} ({kpis.total_employees})
                </Link>
                <Link to="/licenses" className="wd-pill-btn">
                  <Award size={14} aria-hidden="true" className="me-1" /> {t('dashboard.quick_cchn', 'Giám sát CCHN y tế')}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 3. HR 2-Column Bento Grid */}
        <Row className="g-4">
          {/* LEFT COLUMN: Awaiting HR Action & Department Headcount */}
          <Col lg={7} xl={8}>
            {/* Section: Awaiting HR Action */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '17px' }}>
                  {t('dashboard.awaiting_hr', 'Cần HR Xử Lý Ngay')}
                </h3>
                <span className="text-muted small">
                  {kpis.pending_leaves + kpis.expiring_licenses_30d} {t('dashboard.priority_items', 'mục ưu tiên')}
                </span>
              </div>

              <div className="d-flex flex-column gap-2.5">
                {isLeaveRequestsLoading ? (
                  <TheoryOfNextLoader variant="card" />
                ) : pendingLeavesList.length > 0 ? (
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
                              {t('dashboard.leave_request_prefix', 'Đơn xin nghỉ phép:')} {l.staff_name || l.staff_id}
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: '12.5px' }}>
                              {t('dashboard.dept_prefix', 'Khoa:')} <span className="text-dark fw-medium">{l.department_name || l.department_code}</span> &bull; {l.leave_type} ({l.days_requested || '1'} {t('dashboard.days_unit', 'ngày')}) &bull; {t('dashboard.reason_prefix', 'Lý do:')} {l.reason || t('dashboard.none', 'Không có')}
                            </div>
                            <div className="mt-2">
                              <span className="badge bg-warning bg-opacity-20 text-dark fw-normal">{t('leave.status_pending', 'Chờ phê duyệt').toUpperCase()}</span>
                            </div>
                          </div>
                        </div>
                        <Link to="/hr?tab=leaves&status=PENDING" className="wd-pill-btn-primary flex-shrink-0" style={{ fontSize: '12px', padding: '5px 14px' }}>
                          {t('dashboard.review_btn', 'Xét duyệt')} &gt;
                        </Link>
                      </Card.Body>
                    </Card>
                  ))
                ) : (
                  <Card className="wd-card mb-0">
                    <Card.Body className="p-3 text-center text-muted">
                      <CheckCircle2 size={24} className="text-success mb-1" />
                      <div className="fw-semibold text-dark small">{t('dashboard.no_pending_leaves', 'Không có đơn xin nghỉ phép nào tồn đọng')}</div>
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
                            {kpis.expiring_licenses_30d} {t('dashboard.expiring_licenses', 'Chứng chỉ hành nghề sắp hết hạn')}
                          </div>
                          <div className="text-muted small mt-0.5" style={{ fontSize: '12.5px' }}>
                            {t('dashboard.expiring_desc', 'Cần yêu cầu cán bộ hoàn tất hồ sơ gia hạn với Sở Y Tế để bảo đảm điều kiện tham gia trực lâm sàng.')}
                          </div>
                        </div>
                      </div>
                      <Link to="/licenses" className="wd-pill-btn flex-shrink-0 text-danger" style={{ fontSize: '12px', padding: '5px 14px' }}>
                        {t('dashboard.inspect_btn', 'Kiểm tra')} &gt;
                      </Link>
                    </Card.Body>
                  </Card>
                )}

                <div className="text-start ps-1 pt-1">
                  <Link to="/hr?tab=leaves" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1">
                    <span>{t('dashboard.view_all_leave_requests', 'Vào toàn bộ danh sách phê duyệt nghỉ phép viện')} &gt;</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Section: Hospital Department Headcounts */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '17px' }}>
                  {t('dashboard.dept_structure_title', 'Cơ Cấu Nhân Lực 8 Khoa Phòng Bệnh Viện')}
                </h5>
                <Link to="/admin?tab=departments" className="text-decoration-none fw-semibold text-primary small">
                  {t('dashboard.manage_depts', 'Quản lý khoa phòng')} &gt;
                </Link>
              </div>

              <Card className="wd-card overflow-hidden">
                <div className="table-responsive">
                  <table className="wd-table">
                    <thead>
                      <tr>
                        <th>{t('dashboard.th_dept_code', 'Mã Khoa')}</th>
                        <th>{t('dashboard.th_dept_name', 'Tên Khoa / Phòng Chuyên Môn')}</th>
                        <th>{t('dashboard.th_dept_location', 'Vị Trí Khu Nhà')}</th>
                        <th>{t('dashboard.th_dept_headcount', 'Nhân Lực Thực Tế')}</th>
                        <th>{t('dashboard.th_status', 'Trạng Thái')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isDepartmentsLoading ? (
                        <TheoryOfNextLoader isTableBody columns={5} rows={4} />
                      ) : departments.map((d: any) => (
                        <tr key={d.department_code}>
                          <td className="font-monospace fw-semibold text-primary">{d.department_code}</td>
                          <td className="fw-medium text-dark">{d.name}</td>
                          <td className="small text-muted">{d.location || t('dashboard.default_building', 'Khu nhà khám chữa bệnh')}</td>
                          <td>
                            <strong className="text-dark">{d.employee_count ?? 0} {t('dashboard.staff_count', 'cán bộ')}</strong>
                          </td>
                          <td>
                            <span className="badge bg-success bg-opacity-10 text-success fw-normal">
                              {d.status === 'ACTIVE' ? t('common.active', 'Hoạt động') : t('common.inactive', 'Tạm dừng')}
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
                <span className="wd-card-title">{t('dashboard.hospital_announcements', 'Thông Báo Bệnh Viện')}</span>
                <Link to="/notifications" className="text-primary text-decoration-none small fw-semibold" style={{ fontSize: '12px' }}>
                  {t('dashboard.view_all', 'Xem tất cả')} • {notifications.length}
                </Link>
              </Card.Header>
              <Card.Body className="p-3">
                {isNotificationsLoading ? (
                  <TheoryOfNextLoader variant="card" />
                ) : notifications && notifications.length > 0 ? (
                  <div
                    className="rounded-2 p-3 text-white mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
                    }}
                  >
                    <div className="small text-white text-opacity-75 text-uppercase fw-semibold mb-1" style={{ fontSize: '11px' }}>
                      {notifications[0].type || t('dashboard.system_notice', 'Hệ thống')} &bull; {notifications[0].created_at ? new Date(notifications[0].created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : t('dashboard.today', 'Hôm nay')}
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
                    {t('dashboard.no_announcements', 'Chưa có thông báo mới nào.')}
                  </div>
                )}
                <div className="d-flex align-items-center justify-content-between pt-1">
                  <Link to="/notifications" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1">
                    <span>{t('dashboard.open_notifications', 'Mở trung tâm thông báo')} &gt;</span>
                  </Link>
                  <Link to="/admin?tab=broadcast" className="btn btn-sm btn-outline-primary py-0.5 px-2" style={{ fontSize: '11.5px' }}>
                    {t('dashboard.publish_notice', 'Phát thông báo')}
                  </Link>
                </div>
              </Card.Body>
            </Card>

            {/* Card: Payroll Fund Summary */}
            <Card className="wd-card mb-4">
              <Card.Header className="wd-card-header">
                <span className="wd-card-title">{t('dashboard.payroll_summary_title', 'Quỹ Lương & Đãi Ngộ Cán Bộ')}</span>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="p-3 bg-light rounded-2 border mb-3">
                  <div className="text-muted small mb-1">{t('dashboard.total_net_payroll', 'Tổng Lũy Kế Chi Lương Thực Nhận')}</div>
                  <div className="h4 fw-bold text-success mb-1">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(kpis.total_disbursed_vnd || 0))}
                  </div>
                  <div className="text-muted small">{t('dashboard.payroll_hours_note', 'Quy chuẩn 176 giờ làm việc / tháng tiêu chuẩn Việt Nam')}</div>
                </div>

                <div className="d-flex align-items-center justify-content-between">
                  <Link to="/payroll" className="text-decoration-none fw-semibold text-primary small">
                    {t('dashboard.manage_payroll_btn', 'Quản lý kỳ lương & phiếu lương')} &gt;
                  </Link>
                </div>
              </Card.Body>
            </Card>

            {/* Card: Quick Admin / HR Shortcuts (Distinct per role) */}
            <Card className="wd-card">
              <Card.Header className="wd-card-header">
                <span className="wd-card-title">
                  {isAdmin
                    ? t('dashboard.admin_shortcuts', 'Lối Tắt Quản Trị Hệ Thống')
                    : t('dashboard.hr_shortcuts', 'Lối Tắt Quản Trị Nhân Sự')}
                </span>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="d-flex flex-column gap-2">
                  {isAdmin ? (
                    <>
                      <Link to="/admin" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.shortcut_iam', 'Cổng Quản Trị Hệ Thống & IAM')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                      <Link to="/admin?tab=departments" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.quick_departments', 'Khoa Phòng & Cơ Cấu Toàn Viện')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                      <Link to="/admin?tab=broadcast" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.quick_broadcast', 'Phát Lệnh Thông Báo Khẩn')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                      <Link to="/employees" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.shortcut_staff', 'Danh Bạ Cán Bộ & Bổ Nhiệm')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/hr" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.shortcut_hr', 'Cổng Quản Trị Nhân Sự')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                      <Link to="/hr?tab=leaves" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.shortcut_hr_leaves', 'Phê Duyệt Nghỉ Phép Viện')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                      <Link to="/hr?tab=compensation" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.shortcut_hr_compensation', 'Định Mức Lương & Chi Trả VND')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                      <Link to="/employees" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.shortcut_staff', 'Danh Bạ Cán Bộ & Bổ Nhiệm')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                      <Link to="/licenses" className="p-2.5 rounded-2 bg-light text-decoration-none text-dark d-flex align-items-center justify-content-between hover-bg-light">
                        <span className="small fw-semibold">{t('dashboard.shortcut_cchn', 'Giám Sát Chứng Chỉ Hành Nghề')}</span>
                        <ChevronRight size={15} className="text-muted" />
                      </Link>
                    </>
                  )}
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
  const pendingTasks = tasks?.filter((taskItem: any) => taskItem.status !== 'COMPLETED') || [];
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
              {t('dashboard.clinical_banner_category', 'KHỐI KHÁM CHỮA BỆNH LÂM SÀNG')}
            </span>
            <h4 className="fw-bold mb-1 text-white" style={{ letterSpacing: '-0.02em' }}>
              {t('dashboard.clinical_banner_title', 'Bàn Làm Việc Lâm Sàng • Bệnh viện Đa khoa Quốc tế')}
            </h4>
            <p className="text-white text-opacity-85 mb-0 small" style={{ maxWidth: '640px', fontSize: '13px' }}>
              {t('dashboard.clinical_banner_desc', 'Theo dõi lịch trực 24/7, điểm danh vào ca trực, thực hiện y lệnh buồng bệnh và ký số biên bản bàn giao ca y tế.')}
            </p>
          </div>
          <div className="d-flex gap-2 flex-shrink-0">
            <Link to="/attendance" className="btn btn-sm btn-light fw-semibold text-primary px-3.5 py-2 rounded-pill shadow-sm">
              {t('dashboard.clock_in_btn', 'Chấm công ca trực')}
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Doctor Center Header */}
      <div className="text-center my-4 py-1">
        <h3 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.02em', fontSize: '24px' }}>
          {t('top_nav.welcome', 'Chào mừng')}, {currentStaffName}
        </h3>
        <p className="text-muted small mb-3">
          {t('dashboard.staff_code_label', 'Mã số cán bộ:')} <strong>{currentStaffCode}</strong> &bull; {t('dashboard.staff_role_label', 'Chức vụ:')} {user?.role || 'DOCTOR'}
        </p>

        {/* Quick Action Pill Row for Doctors/Nurses */}
        <div className="d-flex flex-wrap justify-content-center gap-2">
          <Link to="/leave" className="wd-pill-btn">
            {t('dashboard.action_manage_leaves', 'Quản lý nghỉ phép')}
          </Link>
          <Link to="/attendance" className="wd-pill-btn">
            {t('dashboard.action_clock_in', 'Chấm công ca trực')}
          </Link>
          <Link to="/shifts" className="wd-pill-btn">
            {t('dashboard.action_roster', 'Lịch trực khoa phòng')}
          </Link>
          <Link to="/tasks" className="wd-pill-btn">
            {t('dashboard.action_orders', 'Y lệnh & Nhiệm vụ')}
          </Link>
          <Link to="/handovers" className="wd-pill-btn d-inline-flex align-items-center gap-1.5">
            <FileText size={13} className="text-secondary" />
            <span>{t('dashboard.action_view_documents', 'Xem các loại biên bản')}</span>
          </Link>
          <Link to="/payroll" className="wd-pill-btn">
            {t('dashboard.action_my_payroll', 'Phiếu lương của tôi')}
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
                {t('dashboard.clinical_awaiting', 'Đang chờ xử lý lâm sàng')}
              </h5>
              <span className="text-muted small">
                {pendingHandovers.length + pendingTasks.length} {t('dashboard.items_need_confirm', 'mục cần xác nhận')}
              </span>
            </div>

            <div className="d-flex flex-column gap-2.5">
              {isHandoversLoading || isTasksLoading ? (
                <TheoryOfNextLoader variant="card" />
              ) : pendingHandovers.length === 0 && pendingTasks.length === 0 ? (
                <Card className="wd-card mb-0">
                  <Card.Body className="p-4 text-center text-muted">
                    <ShieldCheck size={28} className="text-success mb-2" />
                    <div className="fw-semibold text-dark">{t('dashboard.all_tasks_completed', 'Bạn đã hoàn tất tất cả công việc cần xác nhận')}</div>
                    <div className="small text-muted mt-1">{t('dashboard.no_pending_handovers_tasks', 'Không có ca trực cần ký bàn giao hay nhiệm vụ lâm sàng tồn đọng.')}</div>
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
                            <ClipboardList size={20} />
                          </div>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                              {t('dashboard.sign_handover_prefix', 'Ký số bàn giao ca trực #')}{h.id?.slice(0, 8)}
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: '12.5px' }}>
                              {t('dashboard.handed_over_by', 'Bàn giao bởi:')} <span className="text-dark fw-medium">{h.logged_by_name || t('dashboard.previous_doctor', 'Bác sĩ trực trước')}</span> &bull; {t('dashboard.notes_prefix', 'Ghi chú:')} {h.general_notes || '-'}
                            </div>
                            <div className="mt-2">
                              <span className="badge bg-danger bg-opacity-10 text-danger fw-normal">{t('dashboard.need_signature_badge', 'CẦN KÝ XÁC NHẬN')}</span>
                            </div>
                          </div>
                        </div>
                        <Link to="/handovers" className="wd-pill-btn-primary flex-shrink-0" style={{ fontSize: '12px', padding: '5px 14px' }}>
                          {t('dashboard.sign_confirm_btn', 'Ký nhận')} &gt;
                        </Link>
                      </Card.Body>
                    </Card>
                  ))}

                  {/* Tasks */}
                  {pendingTasks.slice(0, 2).map((taskItem: any) => (
                    <Card key={taskItem.id} className="wd-card mb-0">
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
                              {taskItem.title}
                            </div>
                            <div className="text-muted small mt-0.5" style={{ fontSize: '12.5px' }}>
                              {taskItem.description || t('dashboard.ward_order_default', 'Y lệnh chăm sóc buồng bệnh')}
                            </div>
                          </div>
                        </div>
                        <Link to="/tasks" className="wd-pill-btn flex-shrink-0" style={{ fontSize: '12px', padding: '5px 14px' }}>
                          {t('dashboard.detail_btn', 'Chi tiết')} &gt;
                        </Link>
                      </Card.Body>
                    </Card>
                  ))}
                </>
              )}

              <div className="text-start ps-1 pt-1">
                <Link to="/tasks" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1">
                  <span>{t('dashboard.go_to_all_tasks', 'Chuyển đến Toàn bộ Nhiệm vụ của tôi')}</span>
                  <span className="badge rounded-pill bg-primary bg-opacity-10 text-primary ms-1">{pendingTasks.length + pendingHandovers.length}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Section: Timely Suggestions */}
          <div className="mb-4">
            <h5 className="fw-bold text-dark mb-2" style={{ fontSize: '17px' }}>
              {t('dashboard.timely_suggestions', 'Gợi ý kịp thời')}
            </h5>
            <Card className="wd-card">
              {isLeaveBalancesLoading ? (
                <TheoryOfNextLoader variant="card" />
              ) : (
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
                          ? `${t('dashboard.leave_schedule_prefix', 'Lịch nghỉ phép: từ')} ${upcomingLeave.start_date} ${t('dashboard.to_date', 'đến')} ${upcomingLeave.end_date}`
                          : t('dashboard.annual_plan_2026', 'Kế hoạch nghỉ phép thường niên')}
                      </div>
                      <div className="text-muted small" style={{ fontSize: '12.5px' }}>
                        {t('dashboard.leave_pool_desc1', 'Quỹ phép năm của bạn hiện còn')} {annualRemaining} {t('dashboard.leave_pool_desc2', 'ngày. Hãy đăng ký sớm để khoa xếp lịch trực.')}
                      </div>
                    </div>
                  </div>
                  <Link to="/leave" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1 flex-shrink-0">
                    <span>{t('dashboard.view_leave_calendar', 'Xem Lịch Nghỉ')} &gt;</span>
                  </Link>
                </Card.Body>
              )}
            </Card>
          </div>

          {/* Section: Active Shift Roster Summary Table */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="fw-bold text-dark mb-0" style={{ fontSize: '17px' }}>
                {t('dashboard.active_hospital_shifts', 'Ca trực Bệnh viện Đang Hoạt động')}
              </h5>
              <Link to="/shifts" className="text-decoration-none fw-semibold text-primary small">
                {t('dashboard.view_all_shifts', 'Xem toàn bộ lịch trực')} &gt;
              </Link>
            </div>

            <Card className="wd-card overflow-hidden">
              <div className="table-responsive">
                <table className="wd-table">
                  <thead>
                    <tr>
                      <th>{t('dashboard.th_clinical_staff', 'Nhân sự Y tế')}</th>
                      <th>{t('dashboard.th_department', 'Khoa / Phòng')}</th>
                      <th>{t('dashboard.th_shift', 'Ca trực')}</th>
                      <th>{t('dashboard.th_time', 'Thời gian')}</th>
                      <th>{t('dashboard.th_status', 'Trạng Thái')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isShiftsLoading ? (
                      <TheoryOfNextLoader isTableBody columns={5} rows={4} />
                    ) : shifts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted small">
                          {t('dashboard.no_active_shifts', 'Không có ca trực nào đang hoạt động.')}
                        </td>
                      </tr>
                    ) : (
                      shifts.slice(0, 4).map((s: any) => (
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
                              {s.status === 'IN_PROGRESS' ? t('dashboard.shift_active', 'Đang trực') : t('dashboard.shift_scheduled', 'Đã xếp lịch')}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
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
              <span className="wd-card-title">{t('dashboard.hospital_announcements', 'Thông Báo Bệnh Viện')}</span>
              <span className="text-muted" style={{ fontSize: '11px' }}>
                {notifications.length > 0 ? (lang === 'vi' ? `1 ${t('dashboard.of', 'trên')} ${notifications.length}` : `1 ${t('dashboard.of', 'of')} ${notifications.length}`) : (lang === 'vi' ? `0 ${t('dashboard.notice_count', 'thông báo')}` : `0 ${t('dashboard.notice_count', 'announcements')}`)}
              </span>
            </Card.Header>
            <Card.Body className="p-3">
              {isNotificationsLoading ? (
                <TheoryOfNextLoader variant="card" />
              ) : notifications.length > 0 ? (
                <div
                  className="rounded-2 p-3 text-white mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
                  }}
                >
                  <div className="small text-white text-opacity-75 text-uppercase fw-semibold mb-1" style={{ fontSize: '11px' }}>
                    {notifications[0].type || t('dashboard.system_notice', 'Hệ thống')} &bull; {notifications[0].created_at ? new Date(notifications[0].created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : t('dashboard.today', 'Hôm nay')}
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
                  {t('dashboard.no_director_notices', 'Không có thông báo mới từ ban giám đốc viện.')}
                </div>
              )}
              {/* IMPORTANT: Link to /notifications, NOT /handovers */}
              <div className="text-end">
                <Link to="/notifications" className="text-decoration-none fw-semibold text-primary small d-inline-flex align-items-center gap-1">
                  <span>{t('dashboard.view_all', 'Xem tất cả')} &gt;</span>
                </Link>
              </div>
            </Card.Body>
          </Card>

          {/* Card: Clinical Documents & Important Handover Notes (Ô Document / Lưu ý quan trọng - không ưu tiên) */}
          <Card className="wd-card mb-4">
            <Card.Header className="wd-card-header d-flex justify-content-between align-items-center">
              <span className="wd-card-title d-flex align-items-center gap-1.5">
                <FileText size={15} className="text-secondary" />
                <span>{t('dashboard.docs_notes_title', 'Hồ Sơ Biên Bản & Lưu Ý Lâm Sàng')}</span>
              </span>
              <Link to="/handovers" className="text-decoration-none fw-semibold text-primary small">
                {t('dashboard.action_view_documents', 'Xem các loại biên bản')} &gt;
              </Link>
            </Card.Header>
            <Card.Body className="p-3">
              <div className="d-flex flex-column gap-2.5">
                <div className="p-2.5 rounded-2 border bg-light">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="badge bg-secondary-subtle text-secondary border px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                      {t('dashboard.doc_type_handover', 'Biên Bản Giao Ca')}
                    </span>
                    <span className="text-muted" style={{ fontSize: '11px' }}>24/7 ICU & Cấp Cứu</span>
                  </div>
                  <div className="fw-semibold text-dark" style={{ fontSize: '12.5px' }}>
                    {t('dashboard.doc_item_1_title', 'Bàn giao thiết bị y sinh & hồ sơ bệnh án')}
                  </div>
                  <div className="text-muted small mt-0.5" style={{ fontSize: '11.5px', lineHeight: 1.4 }}>
                    {t('dashboard.doc_item_1_desc', 'Lưu ý: Điều dưỡng trưởng nhận bàn giao máy thở, monitor, hồ sơ và tài sản người bệnh thay mặt Trưởng khoa.')}
                  </div>
                </div>

                <div className="p-2.5 rounded-2 border bg-light">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                      {t('dashboard.doc_type_briefing', 'Giao Ban Viện')}
                    </span>
                    <span className="text-muted" style={{ fontSize: '11px' }}>07:30 Sáng</span>
                  </div>
                  <div className="fw-semibold text-dark" style={{ fontSize: '12.5px' }}>
                    {t('dashboard.doc_item_2_title', 'Biên bản giao ban chuyên môn lâm sàng')}
                  </div>
                  <div className="text-muted small mt-0.5" style={{ fontSize: '11.5px', lineHeight: 1.4 }}>
                    {t('dashboard.doc_item_2_desc', 'Tổng hợp số liệu cấp cứu 24h, ca bệnh nặng và kết luận chỉ đạo của Ban Giám đốc viện.')}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Card: Important Dates */}
          <Card className="wd-card mb-4">
            <Card.Header className="wd-card-header">
              <span className="wd-card-title">{t('dashboard.important_dates', 'Ngày Quan Trọng')}</span>
            </Card.Header>
            <Card.Body className="p-3">
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-start gap-3">
                  <div
                    className="rounded-2 text-center p-1.5 flex-shrink-0"
                    style={{ width: '42px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}
                  >
                    <div className="fw-bold text-uppercase text-danger" style={{ fontSize: '9.5px' }}>{lang === 'vi' ? 'T10' : 'OCT'}</div>
                    <div className="fw-bold text-dark" style={{ fontSize: '15px', lineHeight: 1.1 }}>01</div>
                  </div>
                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                      {t('dashboard.shift_transition_event', 'Kỳ chuyển giao ca trực Tháng 10')}
                    </div>
                    <div className="text-muted small" style={{ fontSize: '11.5px' }}>
                      {t('dashboard.shift_transition_desc', 'Toàn viện • Điều chỉnh định mức làm thêm giờ và trực đêm')}
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
