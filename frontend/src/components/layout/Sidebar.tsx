import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  User,
  Users,
  Calendar,
  CreditCard,
  CalendarDays,
  Clock,
  CheckSquare,
  ClipboardList,
  FileText,
  Settings,
  ShieldCheck,
  UserCheck,
  Award,
  Bell,
  BookOpen
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../i18n/useTranslation';

interface RailItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

export const Sidebar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  const isHRorAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';

  const hrRailItems: RailItem[] = [
    { label: t('nav.dashboard', 'Trang Chủ'), to: '/', icon: Home },
    { label: t('nav.admin', 'Quản Trị'), to: '/admin', icon: ShieldCheck },
    { label: t('nav.hr_management', 'Nhân Sự'), to: '/hr', icon: UserCheck },
    { label: t('nav.briefings', 'Giao Ban'), to: '/briefings', icon: BookOpen },
    { label: t('nav.directory', 'Danh Bạ'), to: '/employees', icon: Users },
    { label: t('nav.timeoff', 'Nghỉ Phép'), to: '/leave', icon: Calendar },
    { label: t('nav.payroll', 'Bảng Lương'), to: '/payroll', icon: CreditCard },
    { label: t('personal.practicing_license', 'Chứng Chỉ'), to: '/licenses', icon: Award },
    { label: t('nav.notifications', 'Thông Báo'), to: '/notifications', icon: Bell },
    { label: t('nav.personal', 'Hồ Sơ'), to: '/profile', icon: User }
  ];

  const clinicalRailItems: RailItem[] = [
    { label: t('nav.dashboard', 'Trang Chủ'), to: '/', icon: Home },
    { label: t('nav.personal', 'Hồ Sơ'), to: '/profile', icon: User },
    { label: t('nav.directory', 'Danh Bạ'), to: '/employees', icon: Users },
    { label: t('nav.shifts', 'Lịch Trực'), to: '/shifts', icon: CalendarDays },
    { label: t('nav.attendance', 'Chấm Công'), to: '/attendance', icon: Clock },
    { label: t('nav.handovers', 'Giao Ca'), to: '/handovers', icon: ClipboardList },
    { label: t('nav.briefings', 'Giao Ban'), to: '/briefings', icon: BookOpen },
    { label: t('nav.tasks', 'Công Việc'), to: '/tasks', icon: CheckSquare },
    { label: t('nav.timeoff', 'Nghỉ Phép'), to: '/leave', icon: Calendar },
    { label: t('nav.payroll', 'Bảng Lương'), to: '/payroll', icon: CreditCard },
    { label: t('nav.notifications', 'Thông Báo'), to: '/notifications', icon: Bell }
  ];

  const activeRailItems = isHRorAdmin ? hrRailItems : clinicalRailItems;

  return (
    <nav className="wd-nav-rail" aria-label={t('nav.navigation_rail', 'Thanh điều hướng bệnh viện')}>
      {/* Top Primary Navigation Icons */}
      <div className="d-flex flex-column gap-1 w-100">
        {activeRailItems.map((item) => {
          const Icon = item.icon;
          const label = item.label;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `wd-rail-link ${isActive ? 'active' : ''}`}
              title={label}
              aria-label={label}
            >
              <Icon size={20} strokeWidth={2} aria-hidden="true" />
              <span className="wd-rail-label">{label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Utility Icons */}
      <div className="d-flex flex-column gap-1 w-100 border-top pt-2">
        <button
          type="button"
          className="wd-rail-link border-0 bg-transparent text-start w-100 p-0"
          title={t('common.archive', 'Lưu Trữ')}
          aria-label={t('common.archive', 'Lưu Trữ')}
          style={{ cursor: 'pointer' }}
        >
          <FileText size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="wd-rail-label">{t('common.archive', 'Lưu Trữ')}</span>
        </button>
        <button
          type="button"
          className="wd-rail-link border-0 bg-transparent text-start w-100 p-0"
          title={t('common.settings', 'Cài Đặt')}
          aria-label={t('common.settings', 'Cài Đặt')}
          style={{ cursor: 'pointer' }}
        >
          <Settings size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="wd-rail-label">{t('common.settings', 'Cài Đặt')}</span>
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
