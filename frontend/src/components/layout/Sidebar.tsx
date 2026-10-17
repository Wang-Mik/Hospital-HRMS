import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  User,
  Users,
  CalendarCheck,
  CreditCard,
  CalendarDays,
  Clock,
  CheckSquare,
  ClipboardList,
  Bookmark,
  Settings,
  ShieldCheck,
  Award,
  Bell,
  BookOpen
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../i18n/useTranslation';

interface RailItem {
  key: string;
  defaultName: string;
  to: string;
  icon: React.ElementType;
}

const hrRailItems: RailItem[] = [
  { key: 'nav.dashboard', defaultName: 'Trang Chủ', to: '/', icon: Home },
  { key: 'nav.admin', defaultName: 'Quản Trị', to: '/admin', icon: ShieldCheck },
  { key: 'nav.briefings', defaultName: 'Giao Ban', to: '/briefings', icon: BookOpen },
  { key: 'nav.directory', defaultName: 'Danh Bạ', to: '/employees', icon: Users },
  { key: 'nav.timeoff', defaultName: 'Nghỉ Phép', to: '/leave', icon: CalendarCheck },
  { key: 'nav.payroll', defaultName: 'Bảng Lương', to: '/payroll', icon: CreditCard },
  { key: 'personal.practicing_license', defaultName: 'Chứng Chỉ', to: '/licenses', icon: Award },
  { key: 'nav.notifications', defaultName: 'Thông Báo', to: '/notifications', icon: Bell },
  { key: 'nav.personal', defaultName: 'Hồ Sơ', to: '/profile', icon: User }
];

const clinicalRailItems: RailItem[] = [
  { key: 'nav.dashboard', defaultName: 'Trang Chủ', to: '/', icon: Home },
  { key: 'nav.personal', defaultName: 'Hồ Sơ', to: '/profile', icon: User },
  { key: 'nav.directory', defaultName: 'Danh Bạ', to: '/employees', icon: Users },
  { key: 'nav.shifts', defaultName: 'Lịch Trực', to: '/shifts', icon: CalendarDays },
  { key: 'nav.attendance', defaultName: 'Chấm Công', to: '/attendance', icon: Clock },
  { key: 'nav.handovers', defaultName: 'Giao Ca', to: '/handovers', icon: ClipboardList },
  { key: 'nav.briefings', defaultName: 'Giao Ban', to: '/briefings', icon: BookOpen },
  { key: 'nav.tasks', defaultName: 'Công Việc', to: '/tasks', icon: CheckSquare },
  { key: 'nav.timeoff', defaultName: 'Nghỉ Phép', to: '/leave', icon: CalendarCheck },
  { key: 'nav.payroll', defaultName: 'Bảng Lương', to: '/payroll', icon: CreditCard },
  { key: 'nav.notifications', defaultName: 'Thông Báo', to: '/notifications', icon: Bell }
];

export const Sidebar: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  const isHRorAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';
  const activeRailItems = isHRorAdmin ? hrRailItems : clinicalRailItems;

  return (
    <nav className="wd-nav-rail" aria-label={t('nav.navigation_rail', 'Thanh điều hướng bệnh viện')}>
      {/* Top Primary Navigation Icons */}
      <div className="d-flex flex-column gap-1 w-100">
        {activeRailItems.map((item) => {
          const Icon = item.icon;
          const label = t(item.key, item.defaultName);
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
        <div
          className="wd-rail-link"
          role="button"
          tabIndex={0}
          title={t('common.details', 'Lưu trữ')}
          aria-label={t('common.details', 'Lưu trữ')}
          style={{ cursor: 'pointer' }}
        >
          <Bookmark size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="wd-rail-label">{t('common.details', 'Lưu trữ')}</span>
        </div>
        <div
          className="wd-rail-link"
          role="button"
          tabIndex={0}
          title={t('admin.title', 'Cấu hình')}
          aria-label={t('admin.title', 'Cài đặt')}
          style={{ cursor: 'pointer' }}
        >
          <Settings size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="wd-rail-label">{t('admin.title', 'Cài đặt')}</span>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
