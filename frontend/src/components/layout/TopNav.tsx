import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { Search, Bell, CheckSquare, User, LogOut, CreditCard, Activity, Users, CheckCheck, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { employeeApi } from '../../api/employeeApi';
import { taskApi } from '../../api/taskApi';
import { handoverApi } from '../../api/handoverApi';
import { notificationApi } from '../../api/notificationApi';
import { useTranslation } from '../../i18n/useTranslation';

interface TopNavProps {
  onSearch?: (query: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { t, lang } = useTranslation();

  const currentStaffId = user?.employee_code || 'EMP-DOC-001';
  const { data: employeeData } = useQuery({
    queryKey: ['employeeDetail', currentStaffId],
    queryFn: () => employeeApi.getById(currentStaffId),
    staleTime: 15000
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => taskApi.getAll(),
    staleTime: 15000
  });

  const { data: handovers } = useQuery({
    queryKey: ['handovers'],
    queryFn: () => handoverApi.getAll(),
    staleTime: 15000
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', currentStaffId],
    queryFn: () => notificationApi.getByStaffId(currentStaffId),
    staleTime: 30000
  });

  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(currentStaffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const pendingTasksCount = tasks?.filter((taskItem: any) => taskItem.status !== 'COMPLETED').length || 0;
  const pendingHandoversCount = handovers?.filter((h: any) => h.status === 'PENDING_SIGNATURE').length || 0;
  const inboxCount = pendingTasksCount + pendingHandoversCount;
  const unreadNotificationsCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  const displayName = employeeData
    ? `${employeeData.first_name} ${employeeData.last_name}`.trim()
    : (user?.name || t('common.hospital_staff', 'Cán Bộ Bệnh Viện'));

  const cleanParts = displayName.trim().split(/\s+/).filter(Boolean);
  const initials = cleanParts.length >= 2
    ? `${cleanParts[cleanParts.length - 2]?.[0] || ''}${cleanParts[cleanParts.length - 1]?.[0] || ''}`.toUpperCase()
    : (cleanParts[0]?.slice(0, 2) || 'CB').toUpperCase();

  const userRoleText = user?.role
    ? t(`role.${user.role}`, user.role)
    : t('role.DOCTOR', 'Bác Sĩ Điều Trị');

  return (
    <header className="wd-topbar">
      <div className="wd-topbar-accent" />

      {/* Hospital Logo & Brand Title */}
      <div className="d-flex align-items-center gap-3">
        <Link to="/" className="d-flex align-items-center gap-2 text-decoration-none">
          <div className="wd-logo-emblem">
            <Activity size={18} strokeWidth={2.4} aria-hidden="true" />
          </div>
          <span className="fw-bold text-dark d-none d-sm-inline" style={{ fontSize: '15px', letterSpacing: '-0.02em' }}>
            Hospital HRMS
          </span>
        </Link>
      </div>

      {/* Center Search Bar */}
      <div className="position-relative flex-grow-1 mx-3 d-flex justify-content-center">
        <div className="position-relative w-100" style={{ maxWidth: '480px' }}>
          <Search
            size={14}
            className="position-absolute text-muted"
            style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }}
            aria-hidden="true"
          />
          <input
            type="text"
            className="wd-search-pill"
            placeholder={t('nav.search_placeholder', 'Tìm kiếm cán bộ y tế, khoa phòng, ca trực...')}
            aria-label={t('nav.search_placeholder', 'Tìm kiếm cán bộ y tế, khoa phòng, ca trực...')}
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Right: Notifications, Inbox, User Profile */}
      <div className="d-flex align-items-center gap-2">
        <Link
          to="/tasks"
          className="btn btn-sm btn-link p-1.5 text-secondary text-decoration-none position-relative rounded-circle"
          title={t('nav.tasks', 'Nhiệm vụ')}
          aria-label={t('nav.tasks', 'Nhiệm vụ')}
        >
          <CheckSquare size={20} aria-hidden="true" />
          {inboxCount > 0 && (
            <span className="wd-badge-count" aria-hidden="true">{inboxCount}</span>
          )}
        </Link>

        {/* Notification Bell Dropdown */}
        <Dropdown align="end">
          <Dropdown.Toggle
            as="button"
            className="btn btn-sm btn-link p-1.5 text-secondary text-decoration-none position-relative rounded-circle me-1 border-0 bg-transparent shadow-none"
            title={t('nav.notifications_tooltip', 'Thông báo hệ thống')}
            aria-label={t('nav.notifications_tooltip', 'Thông báo hệ thống')}
          >
            <Bell size={20} aria-hidden="true" />
            {unreadNotificationsCount > 0 && (
              <span className="wd-badge-count" aria-hidden="true">{unreadNotificationsCount}</span>
            )}
          </Dropdown.Toggle>

          <Dropdown.Menu className="shadow-lg border p-0 rounded-3" style={{ width: '360px', maxHeight: '440px', overflowY: 'auto' }}>
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between bg-light rounded-top-3">
              <div className="d-flex align-items-center gap-1.5">
                <span className="fw-bold text-dark" style={{ fontSize: '13.5px' }}>
                  {t('nav.notifications', 'Thông Báo Bệnh Viện')}
                </span>
                {unreadNotificationsCount > 0 && (
                  <span className="badge bg-danger rounded-pill px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                    {unreadNotificationsCount} {t('nav.new_badge', 'mới')}
                  </span>
                )}
              </div>
              {unreadNotificationsCount > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-link p-0 text-decoration-none small text-primary d-flex align-items-center gap-1"
                  style={{ fontSize: '11px' }}
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                >
                  <CheckCheck size={13} aria-hidden="true" />
                  <span>{t('nav.mark_all_read', 'Đánh dấu đã đọc tất cả')}</span>
                </button>
              )}
            </div>

            <div className="py-1">
              {!notifications || notifications.length === 0 ? (
                <div className="p-4 text-center text-muted small">
                  {t('nav.no_unread_notifications', 'Không có thông báo mới')}
                </div>
              ) : (
                notifications.slice(0, 5).map((n: any) => (
                  <div
                    key={n.id}
                    className={`px-3 py-2.5 border-bottom d-flex align-items-start gap-2.5 ${!n.is_read ? 'bg-primary bg-opacity-10' : ''}`}
                    style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                    onClick={() => {
                      if (!n.is_read) {
                        markReadMutation.mutate(n.id);
                      }
                      navigate('/notifications');
                    }}
                  >
                    <div
                      className={`p-1.5 rounded-2 flex-shrink-0 mt-0.5 ${
                        n.type === 'ALERT'
                          ? 'bg-danger bg-opacity-15 text-danger'
                          : n.type === 'TASK'
                          ? 'bg-info bg-opacity-15 text-info'
                          : 'bg-primary bg-opacity-15 text-primary'
                      }`}
                    >
                      <Bell size={14} aria-hidden="true" />
                    </div>
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="d-flex align-items-center justify-content-between gap-1 mb-0.5">
                        <span className="fw-bold text-dark text-truncate" style={{ fontSize: '12.5px' }}>
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="badge bg-primary rounded-circle p-1" style={{ width: '6px', height: '6px' }} />
                        )}
                      </div>
                      <div className="text-muted text-truncate small" style={{ fontSize: '11.5px' }}>
                        {n.message}
                      </div>
                      <div className="text-muted mt-1" style={{ fontSize: '10px' }}>
                        {n.created_at ? new Date(n.created_at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : t('common.today', 'Hôm nay')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link
              to="/notifications"
              className="dropdown-item text-center py-2 fw-semibold text-primary small border-top bg-white rounded-bottom-3"
              style={{ fontSize: '12px' }}
            >
              {t('nav.view_all_notifications', 'Xem tất cả thông báo')} &rarr;
            </Link>
          </Dropdown.Menu>
        </Dropdown>

        {/* User Profile Avatar Dropdown */}
        <Dropdown align="end">
          <Dropdown.Toggle
            as="button"
            type="button"
            aria-label={`${displayName} ${user?.employee_code || 'EMP-DOC-001'} - ${t('nav.user_menu', 'Menu người dùng')}`}
            className="d-flex align-items-center gap-2 cursor-pointer p-1 rounded-pill border-0 bg-transparent shadow-none"
            style={{ cursor: 'pointer' }}
          >
            {employeeData?.avatar_url ? (
              <img
                src={employeeData.avatar_url}
                alt={displayName || t('personal.avatar_alt', 'Ảnh hồ sơ cán bộ y tế')}
                width={32}
                height={32}
                className="rounded-circle object-fit-cover border shadow-sm"
                style={{ width: '32px', height: '32px', borderColor: 'var(--wd-border)' }}
              />
            ) : (
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                style={{
                  width: '32px',
                  height: '32px',
                  fontSize: '12px',
                  backgroundColor: '#0369a1'
                }}
                aria-hidden="true"
              >
                {initials}
              </div>
            )}
            <div className="d-none d-md-block text-start me-1">
              <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '12px', maxWidth: '140px' }}>
                {displayName}
              </div>
              <div className="text-muted" style={{ fontSize: '10px', marginTop: '-2px' }}>
                {user?.employee_code || 'EMP-DOC-001'}
              </div>
            </div>
          </Dropdown.Toggle>

          <Dropdown.Menu className="shadow border-0 rounded-3 p-2 mt-2" style={{ minWidth: '220px' }}>
            <div className="px-2 py-1.5 border-bottom mb-1">
              <div className="fw-bold text-dark small">{displayName}</div>
              <div className="text-muted" style={{ fontSize: '11px' }}>
                {userRoleText}
              </div>
            </div>
            <Dropdown.Item as={Link} to="/profile" className="small py-2 rounded-2 d-flex align-items-center gap-2">
              <User size={15} aria-hidden="true" />
              <span>{t('nav.personal', 'Hồ sơ cá nhân')}</span>
            </Dropdown.Item>
            <Dropdown.Item as={Link} to="/employees" className="small py-2 rounded-2 d-flex align-items-center gap-2">
              <Users size={15} aria-hidden="true" />
              <span>{t('nav.directory', 'Danh bạ cán bộ')}</span>
            </Dropdown.Item>
            <Dropdown.Item as={Link} to="/payroll" className="small py-2 rounded-2 d-flex align-items-center gap-2">
              <CreditCard size={15} aria-hidden="true" />
              <span>{t('nav.payroll', 'Bảng lương')}</span>
            </Dropdown.Item>
            <Dropdown.Item as={Link} to="/settings" className="small py-2 rounded-2 d-flex align-items-center gap-2">
              <Settings size={15} aria-hidden="true" />
              <span>{t('common.settings', 'Cài đặt')}</span>
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleLogout} className="small py-2 text-danger rounded-2 d-flex align-items-center gap-2">
              <LogOut size={15} aria-hidden="true" />
              <span>{t('nav.sign_out', 'Đăng xuất')}</span>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </header>
  );
};

export default TopNav;
