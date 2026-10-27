import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Modal, Form, Alert, ButtonGroup } from 'react-bootstrap';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  User,
  Check,
  Trash2,
  FileText,
  ShieldCheck,
  Stethoscope,
  Moon,
  Sun,
  Activity,
  ArrowRight,
  CornerDownRight,
  X,
  Users,
  Phone,
  Mail,
  Briefcase,
  RotateCw,
  CalendarDays,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftApi } from '../api/shiftApi';
import { employeeApi } from '../api/employeeApi';
import { departmentApi, Department } from '../api/departmentApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';
import { TheoryOfNextLoader } from '../components/common/TheoryOfNextLoader';
import './ShiftRostering.css';

export interface ShiftItem {
  id: string;
  staff_id: string;
  staff_name: string;
  role: string;
  department_code?: string;
  department_id?: number;
  department_name: string;
  shift_type: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'SWING' | 'ON_CALL' | 'EMERGENCY_COVER';
  on_call_tier?: string;
  team_code?: string;
  is_24h_on_call?: boolean;
  start_time: string;
  end_time: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'SWAPPED';
  requires_handover: boolean;
}

// 6 Core Clinical Shift Categories matching Google Calendar colors
export type ShiftCategoryKey = 'OFFICE' | 'CA1' | 'CA2' | 'CA3' | 'OVERTIME' | 'LEADERSHIP';

interface ShiftCategoryMeta {
  key: ShiftCategoryKey;
  label: string;
  timeRange: string;
  color: string;
  defaultStart: string;
  defaultEnd: string;
  shiftType: string;
  onCallTier?: string;
}

const SHIFT_CATEGORIES: Record<ShiftCategoryKey, ShiftCategoryMeta> = {
  OFFICE: {
    key: 'OFFICE',
    label: 'Hành Chính',
    timeRange: '07:30 – 16:30',
    color: '#1a73e8', // Google Blue
    defaultStart: '07:30',
    defaultEnd: '16:30',
    shiftType: 'SWING'
  },
  CA1: {
    key: 'CA1',
    label: 'Ca 1: Sáng',
    timeRange: '07:00 – 14:00',
    color: '#f9ab00', // Google Amber / Yellow
    defaultStart: '07:00',
    defaultEnd: '14:00',
    shiftType: 'MORNING'
  },
  CA2: {
    key: 'CA2',
    label: 'Ca 2: Chiều',
    timeRange: '14:00 – 21:00',
    color: '#137333', // Google Green
    defaultStart: '14:00',
    defaultEnd: '21:00',
    shiftType: 'AFTERNOON'
  },
  CA3: {
    key: 'CA3',
    label: 'Ca 3: Trực Đêm',
    timeRange: '21:00 – 07:00',
    color: '#7c3aed', // Google Purple
    defaultStart: '21:00',
    defaultEnd: '07:00',
    shiftType: 'NIGHT'
  },
  OVERTIME: {
    key: 'OVERTIME',
    label: 'Ngoài Giờ',
    timeRange: '16:30 – 20:00',
    color: '#e37400', // Google Tangerine / Orange
    defaultStart: '16:30',
    defaultEnd: '20:00',
    shiftType: 'SWING'
  },
  LEADERSHIP: {
    key: 'LEADERSHIP',
    label: 'Trực Lãnh Đạo Viện',
    timeRange: '16:30 – 07:30',
    color: '#d93025', // Google Red
    defaultStart: '16:30',
    defaultEnd: '07:30',
    shiftType: 'ON_CALL',
    onCallTier: 'LEADERSHIP'
  }
};

/**
 * Returns professional role-aware shift labels matching Vietnamese healthcare standards:
 * - Doctors: Khám Bệnh Hành Chính, Khám Ngoài Giờ, Ca 1 Sáng, v.v.
 * - Nurses: Hành Chính Điều Dưỡng, Ca 1 Sáng, v.v.
 * - Techs: Kỹ Thuật Cận Lâm Sàng, Chẩn Đoán Hình Ảnh, v.v.
 * - Pharmacists: Cấp Phát Dược Phẩm BHYT, Thường Trực Kho Dược
 * - HR & Admin: Làm Việc Hành Chính, Xử Lý Nghiệp Vụ Ngoài Giờ (NO "Khám Bệnh")
 */
export function getRoleAwareShiftLabel(
  cat: ShiftCategoryKey,
  role?: string,
  deptCode?: string
): string {
  const isDoctor = role === 'DOCTOR' || role === 'DEPARTMENT_HEAD';
  const isNurse = role === 'NURSE';
  const isTech = role === 'TECHNICIAN';
  const isPharm = deptCode === 'DEP-DUOC' || role === 'STAFF';
  const isHRorAdmin = role === 'HR_MANAGER' || role === 'SUPER_ADMIN' || deptCode === 'DEP-KHTH';

  switch (cat) {
    case 'OFFICE':
      if (isDoctor) return 'Khám Bệnh Hành Chính';
      if (isNurse) return 'Hành Chính Điều Dưỡng';
      if (isTech) return 'Kỹ Thuật Cận Lâm Sàng';
      if (isPharm) return 'Cấp Phát Dược Phẩm BHYT';
      if (isHRorAdmin) return 'Làm Việc Hành Chính';
      return 'Làm Việc Hành Chính';

    case 'CA1':
      if (isDoctor) return 'Ca 1: Sáng (Khám Lâm Sàng)';
      if (isNurse) return 'Ca 1: Sáng (Chăm Sóc & Buồng Bệnh)';
      if (isTech) return 'Ca 1: Sáng (Kỹ Thuật CĐHA)';
      return 'Ca 1: Sáng';

    case 'CA2':
      if (isDoctor) return 'Ca 2: Chiều (Khám Lâm Sàng)';
      if (isNurse) return 'Ca 2: Chiều (Chăm Sóc & Theo Dõi)';
      if (isTech) return 'Ca 2: Chiều (Kỹ Thuật CĐHA)';
      return 'Ca 2: Chiều';

    case 'CA3':
      if (isDoctor) return 'Ca 3: Trực Đêm Lâm Sàng';
      if (isNurse) return 'Ca 3: Trực Đêm Điều Dưỡng';
      if (isTech) return 'Ca 3: Trực Đêm CĐHA 24/7';
      return 'Ca 3: Trực Đêm';

    case 'OVERTIME':
      if (isDoctor) return 'Khám Ngoài Giờ';
      if (isNurse) return 'Trực Điều Dưỡng Tăng Cường';
      if (isTech) return 'Kỹ Thuật Ngoài Giờ';
      if (isPharm) return 'Thường Trực Kho Dược';
      if (isHRorAdmin) return 'Xử Lý Nghiệp Vụ Ngoài Giờ';
      return 'Làm Ngoài Giờ';

    case 'LEADERSHIP':
      return 'Trực Lãnh Đạo Viện';

    default:
      return 'Ca Làm Việc';
  }
}

// Date math helper (pure local YYYY-MM-DD string)
function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse YYYY-MM-DD to Date object at local 00:00:00
function parseDateYMD(str: string): Date {
  const parts = str.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// Pure date math helper to add/subtract days
function offsetDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return formatDateYMD(dt);
}

// Count matching days of week between start and end date
function countMatchingDays(startStr: string, endStr: string, daysList: number[]): number {
  if (!startStr || !endStr || daysList.length === 0) return 0;
  const daysSet = new Set(daysList.map(n => (n === 7 ? 0 : n)));
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T23:59:59`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
  let count = 0;
  const curr = new Date(start);
  while (curr <= end) {
    if (daysSet.has(curr.getDay())) {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }
  return count;
}

// Classify ShiftItem into ShiftCategoryKey
function classifyShift(s: ShiftItem): ShiftCategoryKey {
  if (s.on_call_tier === 'LEADERSHIP' || s.shift_type === 'ON_CALL') {
    return 'LEADERSHIP';
  }
  if (s.shift_type === 'NIGHT' || (s.start_time || '').includes('21:00')) {
    return 'CA3';
  }
  if ((s.start_time || '').includes('16:30') && (s.end_time || '').includes('20:00')) {
    return 'OVERTIME';
  }
  if ((s.start_time || '').includes('07:00') && (s.end_time || '').includes('14:00')) {
    return 'CA1';
  }
  if ((s.start_time || '').includes('14:00') && (s.end_time || '').includes('21:00')) {
    return 'CA2';
  }
  return 'OFFICE';
}

// Cross-Midnight / Overnight Shift Segment Structure
export interface ShiftSegment {
  shift: ShiftItem;
  segmentKey: string;
  startMin: number;
  endMin: number;
  topPx: number;
  heightPx: number;
  isContinuationFromYesterday: boolean;
  isContinuingToTomorrow: boolean;
  displayTitle: string;
  displayTime: string;
  badgeNote?: string;
}

/**
 * Decomposes shifts into daily visual segments for a given column date.
 * Perfectly reflects overnight shifts (e.g. 21:00 - 07:00 next day):
 * - Starting day: from 21:00 to 24:00 (marked as continuing tomorrow)
 * - Next day: from 00:00 to 07:00 (marked as continuing from yesterday)
 */
function getShiftSegmentsForDay(
  shifts: ShiftItem[],
  colDateStr: string,
  staffRole?: string,
  staffDept?: string
): ShiftSegment[] {
  const segments: ShiftSegment[] = [];

  for (const s of shifts) {
    const startDate = (s.start_time || '').slice(0, 10);
    const endDate = (s.end_time || '').slice(0, 10);
    const cat = classifyShift(s);
    const roleAwareLabel = getRoleAwareShiftLabel(cat, s.role || staffRole, s.department_code || staffDept);

    const startH = Number(s.start_time.slice(11, 13));
    const startM = Number(s.start_time.slice(14, 16));
    const startTotalMin = (isNaN(startH) ? 7 : startH) * 60 + (isNaN(startM) ? 0 : startM);

    const endH = Number(s.end_time.slice(11, 13));
    const endM = Number(s.end_time.slice(14, 16));
    const endTotalMin = (isNaN(endH) ? 16 : endH) * 60 + (isNaN(endM) ? 0 : endM);

    // Case 1: Same-day shift (e.g. 07:30 to 16:30, or 07:00 to 14:00)
    if (startDate === colDateStr && (endDate === colDateStr || !endDate || endDate < startDate)) {
      const topPx = startTotalMin * (52 / 60);
      const duration = Math.max(30, endTotalMin - startTotalMin);
      const heightPx = Math.max(34, duration * (52 / 60) - 2);

      segments.push({
        shift: s,
        segmentKey: `${s.id}-sameday`,
        startMin: startTotalMin,
        endMin: endTotalMin,
        topPx,
        heightPx,
        isContinuationFromYesterday: false,
        isContinuingToTomorrow: false,
        displayTitle: roleAwareLabel,
        displayTime: `${s.start_time.slice(11, 16)} – ${s.end_time.slice(11, 16)}`
      });
      continue;
    }

    // Case 2: Multi-day / Overnight shift (startDate < endDate)
    if (startDate < endDate) {
      // 2A: Today is the starting day (e.g. 21:00 to 24:00)
      if (startDate === colDateStr) {
        const topPx = startTotalMin * (52 / 60);
        const duration = Math.max(30, 1440 - startTotalMin);
        const heightPx = Math.max(34, duration * (52 / 60) - 2);

        segments.push({
          shift: s,
          segmentKey: `${s.id}-start`,
          startMin: startTotalMin,
          endMin: 1440,
          topPx,
          heightPx,
          isContinuationFromYesterday: false,
          isContinuingToTomorrow: true,
          displayTitle: `${roleAwareLabel} (Đến sáng mai)`,
          displayTime: `${s.start_time.slice(11, 16)} – ${s.end_time.slice(11, 16)}`,
          badgeNote: 'Tiếp tục sáng hôm sau'
        });
      }

      // 2B: Today is the next day morning (e.g. 00:00 to 07:00)
      if (endDate === colDateStr) {
        const topPx = 0;
        const duration = Math.max(30, endTotalMin);
        const heightPx = Math.max(34, duration * (52 / 60) - 2);

        segments.push({
          shift: s,
          segmentKey: `${s.id}-end`,
          startMin: 0,
          endMin: endTotalMin,
          topPx,
          heightPx,
          isContinuationFromYesterday: true,
          isContinuingToTomorrow: false,
          displayTitle: `${roleAwareLabel} (tiếp)`,
          displayTime: `00:00 – ${s.end_time.slice(11, 16)}`,
          badgeNote: 'Từ ca đêm hôm qua'
        });
      }
    }
  }

  return segments;
}

export const ShiftRostering: React.FC = () => {
  const { t, lang } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Role Restriction: STRICTLY ONLY HR (HR_MANAGER) or Admin (SUPER_ADMIN) can manage shifts
  const isHR = user?.role === 'HR_MANAGER' || user?.role === 'SUPER_ADMIN';

  // 1. Staff selection: default to logged-in user or doctor EMP-DOC-001
  const defaultStaffId = user?.employee_code || 'EMP-DOC-001';
  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaffId);

  // 2. View Mode: 'WEEK' | 'MONTH' | 'AGENDA'
  const [viewMode, setViewMode] = useState<'WEEK' | 'MONTH' | 'AGENDA'>('WEEK');

  // 3. UI State: Left Sidebar Toggle & Modals
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [selectedShiftDetail, setSelectedShiftDetail] = useState<ShiftItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // 4. Anchor Date: Today as base date
  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateYMD(todayDate), [todayDate]);
  const [activeDate, setActiveDate] = useState<Date>(() => new Date());

  // 5. Mini Month Calendar browsing month
  const [miniCalMonth, setMiniCalMonth] = useState<Date>(() => new Date());

  // 6. Active shift category filters (all checked by default)
  const [enabledCategories, setEnabledCategories] = useState<Record<ShiftCategoryKey, boolean>>({
    OFFICE: true,
    CA1: true,
    CA2: true,
    CA3: true,
    OVERTIME: true,
    LEADERSHIP: true
  });

  // 7. Time grid scroller ref for auto-scrolling to 07:00
  const gridScrollerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll time grid to ~07:00 AM on initial mount
  useEffect(() => {
    if (gridScrollerRef.current && viewMode === 'WEEK') {
      gridScrollerRef.current.scrollTop = 7 * 52; // ~364px
    }
  }, [viewMode]);

  // Current system minute tracker for red line indicator
  const [currentMinuteOfDay, setCurrentMinuteOfDay] = useState<number>(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date();
      setCurrentMinuteOfDay(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // TanStack Query: Live shifts from MySQL
  const {
    data: serverShifts,
    isLoading: isShiftsLoading,
    isFetching: isShiftsFetching
  } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.getAll(),
    staleTime: 10000
  });
  const shifts: ShiftItem[] = Array.isArray(serverShifts) ? serverShifts : [];

  // Query employees for staff switcher dropdown
  const { data: serverEmployees } = useQuery({
    queryKey: ['employeesList'],
    queryFn: () => employeeApi.getAll(),
    staleTime: 60000
  });
  const employees: any[] = Array.isArray(serverEmployees) ? serverEmployees : [];

  // Query departments
  const { data: serverDepartments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getAll(),
    staleTime: 60000
  });

  // Selected Staff Details
  const selectedStaff = useMemo(() => {
    const found = employees.find((e: any) => e.employee_code === selectedStaffId);
    if (found) return found;
    return {
      employee_code: selectedStaffId,
      first_name: 'Văn B',
      last_name: 'Nguyễn',
      role: 'DEPARTMENT_HEAD',
      department_code: 'DEP-HSTC',
      specialty: 'Hồi Sức Cấp Cứu'
    };
  }, [employees, selectedStaffId]);

  const isHead = selectedStaff.role === 'DEPARTMENT_HEAD';
  const isDoctor = selectedStaff.role === 'DOCTOR' || isHead;
  const isNurse = selectedStaff.role === 'NURSE';
  const staffTitle = isHead ? 'Trưởng Khoa' : isDoctor ? 'Bác Sĩ' : isNurse ? 'Điều Dưỡng' : selectedStaff.role;
  const staffPrefix = isDoctor ? 'BS. ' : isNurse ? 'ĐD. ' : '';
  const initials = `${(selectedStaff.last_name || '').slice(0, 1)}${(selectedStaff.first_name || '').slice(0, 1)}`.toUpperCase() || 'BS';

  const deptObj = serverDepartments.find((d) => d.department_code === selectedStaff.department_code);
  const deptName = deptObj?.name || selectedStaff.department_code || 'Khoa Khám Bệnh';

  // State for inspecting an employee profile (Chức danh, Tên, Thư, Điện thoại)
  const [inspectedStaffCode, setInspectedStaffCode] = useState<string | null>(null);

  // Fetch employee profile when inspected
  const { data: fetchedEmployeeProfile } = useQuery({
    queryKey: ['employeeProfile', inspectedStaffCode],
    queryFn: () => employeeApi.getById(inspectedStaffCode!),
    enabled: !!inspectedStaffCode,
    staleTime: 60000
  });

  const inspectedEmployee = useMemo(() => {
    if (!inspectedStaffCode) return null;
    if (fetchedEmployeeProfile) return fetchedEmployeeProfile;
    const foundInList = employees.find((e: any) => e.employee_code === inspectedStaffCode);
    if (foundInList) return foundInList;
    return null;
  }, [inspectedStaffCode, fetchedEmployeeProfile, employees]);

  // Colleagues in the same shift team (STRICTLY same department - "chỉ thấy cùng khoa")
  const teamColleagues = useMemo(() => {
    if (!selectedShiftDetail) return [];

    return shifts.filter((s) => {
      // 1. Exclude the current staff member
      if (s.staff_id === selectedShiftDetail.staff_id) return false;

      // 2. Exclude cancelled shifts
      if (s.status === 'CANCELLED') return false;

      // 3. STRICT DENY / BUSINESS RULE: SAME DEPARTMENT ONLY ("chỉ thấy cùng khoa")
      if (s.department_code !== selectedShiftDetail.department_code) return false;

      // 4. Overlapping duty slot: start_time < selectedEnd AND end_time > selectedStart
      const hasTimeOverlap = s.start_time < selectedShiftDetail.end_time && s.end_time > selectedShiftDetail.start_time;

      return hasTimeOverlap;
    });
  }, [selectedShiftDetail, shifts]);

  // Compute 7 days of the active week (Monday to Sunday)
  const currentWeekDays = useMemo(() => {
    const day = activeDate.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(activeDate);
    mon.setDate(activeDate.getDate() + diffToMon);

    const weekDays = [];
    const dowNamesVi = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const dowNamesEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateStr = formatDateYMD(d);
      weekDays.push({
        date: d,
        dateStr,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        year: d.getFullYear(),
        labelVi: dowNamesVi[i],
        labelEn: dowNamesEn[i],
        isToday: dateStr === todayStr
      });
    }
    return weekDays;
  }, [activeDate, todayStr]);

  // Compute Active Title based on activeDate and viewMode
  const activeViewTitle = useMemo(() => {
    const m = activeDate.getMonth() + 1;
    const y = activeDate.getFullYear();
    if (viewMode === 'WEEK') {
      const first = currentWeekDays[0];
      const last = currentWeekDays[6];
      if (first.monthNum === last.monthNum) {
        return lang === 'en' ? `October ${y}` : `Tháng ${m} năm ${y}`;
      }
      return lang === 'en'
        ? `${first.monthNum}/${first.year} – ${last.monthNum}/${last.year}`
        : `Tháng ${first.monthNum} – Tháng ${last.monthNum} năm ${y}`;
    }
    return lang === 'en' ? `October ${y}` : `Tháng ${m} năm ${y}`;
  }, [activeDate, viewMode, currentWeekDays, lang]);

  // Filter personal shifts: strictly selectedStaffId + enabledCategories
  const personalShifts = useMemo(() => {
    return shifts.filter((s) => {
      if (s.staff_id !== selectedStaffId) return false;
      const cat = classifyShift(s);
      return enabledCategories[cat];
    });
  }, [shifts, selectedStaffId, enabledCategories]);

  // Shifts strictly in the active week (including shifts starting or ending in the week)
  const personalWeekShifts = useMemo(() => {
    const weekStart = currentWeekDays[0]?.dateStr || '';
    const weekEnd = currentWeekDays[6]?.dateStr || '';
    return personalShifts.filter((s) => {
      const sStart = (s.start_time || '').slice(0, 10);
      const sEnd = (s.end_time || '').slice(0, 10);
      return (sStart >= weekStart && sStart <= weekEnd) || (sEnd >= weekStart && sEnd <= weekEnd);
    });
  }, [personalShifts, currentWeekDays]);

  // Weekly hours workload
  const weeklyHoursCount = useMemo(() => {
    let total = 0;
    personalWeekShifts.forEach((s) => {
      try {
        const st = new Date(s.start_time.replace(' ', 'T')).getTime();
        const et = new Date(s.end_time.replace(' ', 'T')).getTime();
        if (!isNaN(st) && !isNaN(et) && et > st) {
          total += (et - st) / (1000 * 60 * 60);
        } else {
          total += 7;
        }
      } catch {
        total += 7;
      }
    });
    return Math.round(total * 10) / 10;
  }, [personalWeekShifts]);

  // Night shifts count
  const nightShiftsCount = useMemo(() => {
    return personalWeekShifts.filter((s) => classifyShift(s) === 'CA3').length;
  }, [personalWeekShifts]);

  // Mini Month Calendar Days Generation (7 cols x 6 rows = 42 days standard Google Calendar)
  const miniCalDays = useMemo(() => {
    const y = miniCalMonth.getFullYear();
    const m = miniCalMonth.getMonth();
    const firstDay = new Date(y, m, 1);
    const day = firstDay.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const start = new Date(y, m, 1 + diffToMon);

    const days = [];
    const activeDateStr = formatDateYMD(activeDate);

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = formatDateYMD(d);
      days.push({
        date: d,
        dateStr: dStr,
        dayNum: d.getDate(),
        isCurrentMonth: d.getMonth() === m,
        isToday: dStr === todayStr,
        isSelected: dStr === activeDateStr
      });
    }
    return days;
  }, [miniCalMonth, activeDate, todayStr]);

  // Month View Days Generation (standard 6 weeks = 42 days, ensures complete coverage for 31-day months)
  const monthViewWeeks = useMemo(() => {
    const y = activeDate.getFullYear();
    const m = activeDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const day = firstDay.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const start = new Date(y, m, 1 + diffToMon);

    const weeks = [];
    let currentWeek = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dStr = formatDateYMD(d);

      // Collect shifts that either start today or end today (overnight continuation)
      const daySegments = getShiftSegmentsForDay(personalShifts, dStr, selectedStaff.role, selectedStaff.department_code);

      currentWeek.push({
        date: d,
        dateStr: dStr,
        dayNum: d.getDate(),
        isCurrentMonth: d.getMonth() === m,
        isToday: dStr === todayStr,
        segments: daySegments
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    return weeks;
  }, [activeDate, todayStr, personalShifts]);

  // Agenda View Grouped Shifts
  const agendaGroupedShifts = useMemo(() => {
    const map: Record<string, ShiftItem[]> = {};
    personalShifts.forEach((s) => {
      const dateStr = (s.start_time || '').slice(0, 10);
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(s);
    });

    const sortedDates = Object.keys(map).sort();
    return sortedDates.map((dateStr) => {
      const d = parseDateYMD(dateStr);
      const isToday = dateStr === todayStr;
      const dowVi = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
      return {
        dateStr,
        date: d,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        dowVi,
        isToday,
        shifts: map[dateStr]
      };
    });
  }, [personalShifts, todayStr]);

  // Handlers for Navigation
  const handleTodayClick = () => {
    const now = new Date();
    setActiveDate(now);
    setMiniCalMonth(now);
  };

  const handlePrev = () => {
    if (viewMode === 'WEEK') {
      const d = new Date(activeDate);
      d.setDate(d.getDate() - 7);
      setActiveDate(d);
      setMiniCalMonth(d);
    } else {
      const d = new Date(activeDate.getFullYear(), activeDate.getMonth() - 1, 1);
      setActiveDate(d);
      setMiniCalMonth(d);
    }
  };

  const handleNext = () => {
    if (viewMode === 'WEEK') {
      const d = new Date(activeDate);
      d.setDate(d.getDate() + 7);
      setActiveDate(d);
      setMiniCalMonth(d);
    } else {
      const d = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1);
      setActiveDate(d);
      setMiniCalMonth(d);
    }
  };

  const toggleCategoryFilter = (catKey: ShiftCategoryKey) => {
    setEnabledCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey]
    }));
  };

  // Delete shift handler (Reserved for HR/Admin)
  const handleDeleteShift = async () => {
    if (!selectedShiftDetail) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa/hủy ca công tác này khỏi lịch?')) return;

    try {
      setIsDeleting(true);
      await shiftApi.delete(selectedShiftDetail.id);
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setSelectedShiftDetail(null);
    } catch (err: any) {
      alert('Không thể xóa ca trực: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Create Shift Modal Mode: 'SINGLE' | 'BATCH' | 'AUTO_ROTATE'
  const [createTab, setCreateTab] = useState<'SINGLE' | 'BATCH' | 'AUTO_ROTATE'>('SINGLE');
  const [modalDeptFilter, setModalDeptFilter] = useState<string>('ALL');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filtered employees for create modal dropdown
  const modalEmployees = useMemo(() => {
    if (modalDeptFilter === 'ALL') return employees;
    return employees.filter((e: any) => e.department_code === modalDeptFilter);
  }, [employees, modalDeptFilter]);

  // Single shift form state
  const [createForm, setCreateForm] = useState({
    staff_id: selectedStaffId,
    category: 'OFFICE' as ShiftCategoryKey,
    date: todayStr,
    start_time: '07:30',
    end_time: '16:30',
    requires_handover: false
  });

  // Batch recurring form state
  const [batchForm, setBatchForm] = useState({
    staff_id: selectedStaffId,
    work_type: 'OFFICE' as 'OFFICE' | 'CA1' | 'CA2' | 'CA3' | 'LEADERSHIP' | 'OVERTIME' | 'CUSTOM',
    start_date: todayStr,
    end_date: offsetDateString(todayStr, 28),
    days_of_week: [1, 2, 3, 4, 5],
    custom_start: '07:30',
    custom_end: '16:30',
    requires_handover: false
  });

  // Auto-rotate form state (supports 3-ca 4-kip & 2-ca 3-kip)
  const [rotateForm, setRotateForm] = useState({
    rotation_model: '3CA_4KIP' as '3CA_4KIP' | '2CA_3KIP',
    department_code: selectedStaff.department_code || 'DEP-HSTC',
    start_date: todayStr,
    end_date: offsetDateString(todayStr, 28)
  });

  // Auto-rotate staff selection and confirmation preview state
  const [selectedStaffForRotate, setSelectedStaffForRotate] = useState<string[]>([]);
  const [rotatePreviewData, setRotatePreviewData] = useState<any | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [previewFilterSearch, setPreviewFilterSearch] = useState<string>('');

  // Department employees available for rotation
  const deptEmployeesForRotate = useMemo(() => {
    if (!serverEmployees || serverEmployees.length === 0) return [];
    return serverEmployees.filter((emp: any) => emp.department_code === rotateForm.department_code);
  }, [serverEmployees, rotateForm.department_code]);

  // Sync selected staff when department changes or modal opens
  useEffect(() => {
    if (deptEmployeesForRotate.length > 0) {
      setSelectedStaffForRotate(deptEmployeesForRotate.map((e: any) => e.employee_code));
    } else {
      setSelectedStaffForRotate([]);
    }
    setRotatePreviewData(null);
  }, [rotateForm.department_code, deptEmployeesForRotate.length]);

  // Filter shifts in preview table
  const previewShiftsToRender = useMemo(() => {
    if (!rotatePreviewData?.shifts) return [];
    if (!previewFilterSearch.trim()) return rotatePreviewData.shifts;
    const q = previewFilterSearch.toLowerCase().trim();
    return rotatePreviewData.shifts.filter((s: any) => {
      const name = (s.staff_name || '').toLowerCase();
      const code = (s.staff_id || '').toLowerCase();
      const type = (s.shift_type || '').toLowerCase();
      const team = (s.team_code || '').toLowerCase();
      const date = (s.start_time || '').toLowerCase();
      return name.includes(q) || code.includes(q) || type.includes(q) || team.includes(q) || date.includes(q);
    });
  }, [rotatePreviewData, previewFilterSearch]);

  // State to hold insufficient rest confirmation requirement
  const [restConfirmationNeeded, setRestConfirmationNeeded] = useState<boolean>(false);

  // Dynamic preview count of shifts in batch range
  const batchPreviewCount = useMemo(() => {
    return countMatchingDays(batchForm.start_date, batchForm.end_date, batchForm.days_of_week);
  }, [batchForm.start_date, batchForm.end_date, batchForm.days_of_week]);

  // Keep create forms staff_id synced with selectedStaffId
  useEffect(() => {
    setCreateForm((prev) => ({ ...prev, staff_id: selectedStaffId }));
    setBatchForm((prev) => ({ ...prev, staff_id: selectedStaffId }));
  }, [selectedStaffId]);

  // Reset alerts when modal opens/closes & default department for DEPARTMENT_HEAD
  useEffect(() => {
    if (isCreateModalOpen) {
      setFormError(null);
      setFormSuccess(null);
      setRestConfirmationNeeded(false);
      setIsSubmitting(false);
      if (user?.role === 'DEPARTMENT_HEAD') {
        const headEmp = employees.find((e: any) => e.employee_code === user?.employee_code);
        const dept = user?.department_code || headEmp?.department_code;
        if (dept) setModalDeptFilter(dept);
      }
    }
  }, [isCreateModalOpen, user, employees]);

  const handleCreateCategoryChange = (cat: ShiftCategoryKey) => {
    const meta = SHIFT_CATEGORIES[cat];
    setCreateForm((prev) => ({
      ...prev,
      category: cat,
      start_time: meta.defaultStart,
      end_time: meta.defaultEnd
    }));
  };

  // Toggle single day in batch selection
  const toggleBatchDay = (dayNum: number) => {
    setBatchForm((prev) => {
      const exists = prev.days_of_week.includes(dayNum);
      const nextDays = exists
        ? prev.days_of_week.filter((d) => d !== dayNum)
        : [...prev.days_of_week, dayNum];
      return { ...prev, days_of_week: nextDays };
    });
  };

  const setBatchWeekdays = () => {
    setBatchForm((prev) => ({ ...prev, days_of_week: [1, 2, 3, 4, 5] }));
  };

  const setBatchAllDays = () => {
    setBatchForm((prev) => ({ ...prev, days_of_week: [1, 2, 3, 4, 5, 6, 0] }));
  };

  const clearBatchDays = () => {
    setBatchForm((prev) => ({ ...prev, days_of_week: [] }));
  };

  // 1. Submit Single Shift (with support for insufficient rest confirmation override)
  const handleCreateSubmit = async (e?: React.FormEvent, overrideRest: boolean = false) => {
    if (e) e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!overrideRest) setRestConfirmationNeeded(false);

    const meta = SHIFT_CATEGORIES[createForm.category];
    const fullStart = `${createForm.date} ${createForm.start_time}:00`;

    // Handle end date (if night shift crosses to next day)
    let endDateStr = createForm.date;
    if (createForm.category === 'CA3' || createForm.category === 'LEADERSHIP') {
      const startH = Number(createForm.start_time.split(':')[0]);
      const endH = Number(createForm.end_time.split(':')[0]);
      if (endH <= startH) {
        const d = parseDateYMD(createForm.date);
        d.setDate(d.getDate() + 1);
        endDateStr = formatDateYMD(d);
      }
    }
    const fullEnd = `${endDateStr} ${createForm.end_time}:00`;

    // FIX BUG: Look up actual department of the selected staff member in the form!
    const assignedEmp = employees.find((e: any) => e.employee_code === createForm.staff_id);
    const actualDeptCode = assignedEmp?.department_code || selectedStaff.department_code || 'DEP-HSTC';

    try {
      setIsSubmitting(true);
      await shiftApi.create({
        staff_id: createForm.staff_id,
        department_code: actualDeptCode,
        start_time: fullStart,
        end_time: fullEnd,
        shift_type: meta.shiftType,
        on_call_tier: (meta.onCallTier as any) || undefined,
        requires_handover: createForm.requires_handover,
        allow_insufficient_rest: overrideRest
      });

      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setRestConfirmationNeeded(false);
      setFormSuccess(overrideRest ? 'Đã xác nhận phân công trực tăng cường / đổi ca khẩn cấp!' : 'Tạo ca công tác thành công!');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setFormSuccess(null);
      }, 1000);
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.requires_confirmation || errData?.code === 'INSUFFICIENT_REST_INTERVAL') {
        setRestConfirmationNeeded(true);
      }
      setFormError(errData?.message || err.message || 'Không thể tạo ca công tác');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Batch Recurring Schedule
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (batchForm.days_of_week.length === 0) {
      setFormError('Vui lòng chọn ít nhất một thứ trong tuần để sinh lịch.');
      return;
    }

    const assignedEmp = employees.find((e: any) => e.employee_code === batchForm.staff_id);
    const actualDeptCode = assignedEmp?.department_code || selectedStaff.department_code || 'DEP-HSTC';

    try {
      setIsSubmitting(true);
      const res = await shiftApi.createBatch({
        staff_id: batchForm.staff_id,
        department_code: actualDeptCode,
        work_type: batchForm.work_type,
        start_date: batchForm.start_date,
        end_date: batchForm.end_date,
        days_of_week: batchForm.days_of_week,
        requires_handover: batchForm.requires_handover,
        custom_start_time: batchForm.work_type === 'CUSTOM' ? batchForm.custom_start : undefined,
        custom_end_time: batchForm.work_type === 'CUSTOM' ? batchForm.custom_end : undefined
      });

      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      const createdCount = res.data?.created_count ?? res.created_count ?? 0;
      const conflictsCount = res.data?.conflicts_count ?? res.conflicts_count ?? 0;

      let msg = `Tạo thành công ${createdCount} ca công tác!`;
      if (conflictsCount > 0) {
        msg += ` (${conflictsCount} ca trùng lịch đã tự động bỏ qua)`;
      }
      setFormSuccess(msg);
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setFormSuccess(null);
      }, 1800);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Không thể tạo lịch định kỳ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Generate Auto-Rotate Preview (Step 1)
  const handleAutoRotatePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const minRequired = rotateForm.rotation_model === '2CA_3KIP' ? 3 : 4;
    if (selectedStaffForRotate.length < minRequired) {
      setFormError(`Cần chọn tối thiểu ${minRequired} cán bộ trong khoa để phân bổ đủ các kíp và bảo đảm thời gian nghỉ >= 24h.`);
      return;
    }

    try {
      setIsGeneratingPreview(true);
      const res = await shiftApi.autoRotate({
        department_code: rotateForm.department_code,
        start_date: rotateForm.start_date,
        end_date: rotateForm.end_date,
        rotation_model: rotateForm.rotation_model,
        staff_ids: selectedStaffForRotate,
        preview_only: true
      });

      if (res.data?.shifts) {
        setRotatePreviewData(res.data);
      } else {
        setFormError('Không thể tạo sơ đồ xem trước');
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Không thể tính toán sơ đồ xoay kíp tự động');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // 4. Confirm and Commit Auto-Rotation (Step 2)
  const handleConfirmAutoRotate = async () => {
    setFormError(null);
    setFormSuccess(null);

    try {
      setIsSubmitting(true);
      const res = await shiftApi.autoRotate({
        department_code: rotateForm.department_code,
        start_date: rotateForm.start_date,
        end_date: rotateForm.end_date,
        rotation_model: rotateForm.rotation_model,
        staff_ids: selectedStaffForRotate,
        preview_only: false
      });

      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      const createdCount = res.data?.count ?? res.count ?? 0;
      setFormSuccess(res.message || `Đã lưu thành công ${createdCount} ca trực xoay kíp vào hệ thống!`);
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setRotatePreviewData(null);
        setFormSuccess(null);
      }, 1600);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Không thể lưu sơ đồ xoay kíp');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gcal-wrapper my-2">
      {/* 1. GOOGLE CALENDAR TOPBAR */}
      <header className="gcal-topbar">
        {/* Left: Hamburger, Dynamic Calendar Emblem, Brand, [Hôm nay], < >, Date Title */}
        <div className="gcal-topbar-left">
          <button
            type="button"
            className="gcal-icon-btn"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            title="Ẩn / Hiện menu chính"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="gcal-brand">
            <div className="gcal-calendar-icon">
              <div className="gcal-cal-top" />
              <div className="gcal-cal-number">{todayDate.getDate()}</div>
            </div>
            <span className="gcal-brand-title">Lịch Công Tác</span>
          </div>

          <button
            type="button"
            className="gcal-today-btn"
            onClick={handleTodayClick}
          >
            Hôm nay
          </button>

          <div className="gcal-nav-group">
            <button
              type="button"
              className="gcal-icon-btn gcal-icon-btn-sm"
              onClick={handlePrev}
              title="Kỳ trước"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="gcal-icon-btn gcal-icon-btn-sm"
              onClick={handleNext}
              title="Kỳ tiếp"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <h1 className="gcal-date-title mb-0">{activeViewTitle}</h1>
        </div>

        {/* Right: Staff Switcher Dropdown, View Mode Segmented Switcher, Clock-in Link */}
        <div className="gcal-topbar-right">
          {/* Staff Switcher Dropdown */}
          <select
            aria-label="Chọn cán bộ y tế"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="gcal-select"
            style={{ maxWidth: '240px' }}
          >
            <optgroup label="Bác Sĩ & Trưởng Khoa">
              {employees
                .filter((e) => e.role === 'DOCTOR' || e.role === 'DEPARTMENT_HEAD')
                .map((emp) => (
                  <option key={emp.employee_code} value={emp.employee_code}>
                    BS. {emp.last_name} {emp.first_name} ({emp.employee_code})
                  </option>
                ))}
            </optgroup>
            <optgroup label="Điều Dưỡng Viên">
              {employees
                .filter((e) => e.role === 'NURSE')
                .map((emp) => (
                  <option key={emp.employee_code} value={emp.employee_code}>
                    ĐD. {emp.last_name} {emp.first_name} ({emp.employee_code})
                  </option>
                ))}
            </optgroup>
            <optgroup label="Cán Bộ Y Tế Khác">
              {employees
                .filter((e) => e.role !== 'DOCTOR' && e.role !== 'DEPARTMENT_HEAD' && e.role !== 'NURSE')
                .map((emp) => (
                  <option key={emp.employee_code} value={emp.employee_code}>
                    {emp.last_name} {emp.first_name} ({emp.employee_code})
                  </option>
                ))}
            </optgroup>
          </select>

          {/* View Mode Segmented Switcher */}
          <div className="gcal-view-switch">
            <button
              type="button"
              className={`gcal-view-btn ${viewMode === 'WEEK' ? 'active' : ''}`}
              onClick={() => setViewMode('WEEK')}
            >
              Tuần
            </button>
            <button
              type="button"
              className={`gcal-view-btn ${viewMode === 'MONTH' ? 'active' : ''}`}
              onClick={() => setViewMode('MONTH')}
            >
              Tháng
            </button>
            <button
              type="button"
              className={`gcal-view-btn ${viewMode === 'AGENDA' ? 'active' : ''}`}
              onClick={() => setViewMode('AGENDA')}
            >
              Lịch biểu
            </button>
          </div>

          {/* Attendance quick button */}
          <Link
            to="/attendance"
            className="btn btn-sm btn-primary text-white d-inline-flex align-items-center gap-1.5 rounded-pill px-3 py-1.5"
            style={{ fontSize: '13px' }}
            title="Chuyển đến màn hình chấm công"
          >
            <Clock size={14} />
            <span>Chấm Công</span>
          </Link>
        </div>
      </header>

      {/* 2. MAIN BODY: LEFT SIDEBAR + CALENDAR CONTENT */}
      <div className="gcal-body">
        {/* LEFT SIDEBAR (256px) */}
        <aside className={`gcal-sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
          {/* "+ Tạo Ca" Material FAB - ONLY FOR HR/ADMIN */}
          {isHR && (
            <div>
              <button
                type="button"
                className="gcal-fab"
                onClick={() => setIsCreateModalOpen(true)}
                title="Thêm ca làm việc hoặc trực"
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white"
                  style={{ width: '28px', height: '28px', backgroundColor: '#1a73e8' }}
                >
                  <Plus size={18} strokeWidth={2.8} />
                </div>
                <span>Tạo Ca</span>
              </button>
            </div>
          )}

          {/* MINI MONTH CALENDAR WIDGET */}
          <div className="gcal-mini-cal">
            <div className="gcal-mini-cal-header">
              <span className="gcal-mini-cal-title">
                {lang === 'en'
                  ? `October ${miniCalMonth.getFullYear()}`
                  : `Tháng ${miniCalMonth.getMonth() + 1} năm ${miniCalMonth.getFullYear()}`}
              </span>
              <div className="d-flex align-items-center gap-1">
                <button
                  type="button"
                  className="gcal-icon-btn gcal-icon-btn-sm"
                  onClick={() =>
                    setMiniCalMonth(
                      new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() - 1, 1)
                    )
                  }
                  title="Tháng trước"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="gcal-icon-btn gcal-icon-btn-sm"
                  onClick={() =>
                    setMiniCalMonth(
                      new Date(miniCalMonth.getFullYear(), miniCalMonth.getMonth() + 1, 1)
                    )
                  }
                  title="Tháng sau"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="gcal-mini-cal-grid">
              {['H', 'B', 'T', 'N', 'S', 'B', 'C'].map((dow, idx) => (
                <div key={idx} className="gcal-mini-cal-dow">
                  {dow}
                </div>
              ))}
              {miniCalDays.map((d) => (
                <div
                  key={d.dateStr}
                  onClick={() => {
                    setActiveDate(d.date);
                    setMiniCalMonth(d.date);
                  }}
                  className={`gcal-mini-cal-day ${d.isCurrentMonth ? '' : 'other-month'} ${
                    d.isToday ? 'today' : ''
                  } ${d.isSelected ? 'selected' : ''}`}
                >
                  {d.dayNum}
                </div>
              ))}
            </div>
          </div>

          {/* SELECTED STAFF PROFILE CARD */}
          <div className="gcal-staff-card">
            <div className="d-flex align-items-center gap-2.5">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-xs flex-shrink-0"
                style={{
                  width: '40px',
                  height: '40px',
                  fontSize: '15px',
                  backgroundColor: isHead ? '#7c3aed' : isDoctor ? '#1a73e8' : isNurse ? '#137333' : '#5f6368'
                }}
              >
                {initials}
              </div>
              <div className="overflow-hidden">
                <div className="fw-bold text-dark text-truncate" style={{ fontSize: '13px' }}>
                  {staffPrefix}{selectedStaff.last_name} {selectedStaff.first_name}
                </div>
                <div className="text-muted text-truncate" style={{ fontSize: '11px' }}>
                  {staffTitle} &bull; {selectedStaff.employee_code}
                </div>
                <div className="text-secondary text-truncate mt-0.5" style={{ fontSize: '11px' }}>
                  {deptName}
                </div>
              </div>
            </div>
          </div>

          {/* "LỊCH CỦA TÔI" (SHIFT CATEGORIES CHECKBOX FILTER) */}
          <div>
            <div className="gcal-calendar-list-title">
              <span>Lịch Của Tôi</span>
              <span className="badge bg-light text-muted border font-mono" style={{ fontSize: '10px' }}>
                {personalShifts.length} ca
              </span>
            </div>

            <div className="d-flex flex-column gap-1">
              {(Object.keys(SHIFT_CATEGORIES) as ShiftCategoryKey[]).map((catKey) => {
                const meta = SHIFT_CATEGORIES[catKey];
                const isChecked = enabledCategories[catKey];

                return (
                  <div
                    key={catKey}
                    className="gcal-filter-item"
                    onClick={() => toggleCategoryFilter(catKey)}
                  >
                    <div
                      className="gcal-checkbox-custom"
                      style={{
                        backgroundColor: isChecked ? meta.color : 'transparent',
                        border: `2px solid ${meta.color}`
                      }}
                    >
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="d-flex flex-column" style={{ lineHeight: 1.2 }}>
                      <span className="fw-medium text-dark" style={{ fontSize: '12.5px' }}>
                        {getRoleAwareShiftLabel(catKey, selectedStaff.role, selectedStaff.department_code)}
                      </span>
                      <span className="text-muted font-mono" style={{ fontSize: '10.5px' }}>
                        {meta.timeRange}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PERSONAL WEEKLY SUMMARY STATS */}
          <div className="p-2.5 rounded-2 bg-light border mt-auto" style={{ fontSize: '11.5px' }}>
            <div className="fw-bold text-dark mb-1">Thống Kê Tuần Này</div>
            <div className="d-flex justify-content-between text-muted mb-0.5">
              <span>Tổng ca phân bổ:</span>
              <strong className="text-dark font-mono">{personalWeekShifts.length} ca</strong>
            </div>
            <div className="d-flex justify-content-between text-muted mb-0.5">
              <span>Tổng giờ làm việc:</span>
              <strong className="text-dark font-mono">{weeklyHoursCount} giờ</strong>
            </div>
            <div className="d-flex justify-content-between text-muted">
              <span>Ca trực đêm:</span>
              <strong className="text-purple font-mono">{nightShiftsCount} ca</strong>
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN CALENDAR AREA */}
        <main className="gcal-view-area position-relative">
          {(isShiftsLoading || isShiftsFetching) && (
            <TheoryOfNextLoader variant="calendar" />
          )}
          {/* ===================== 1. WEEK VIEW ===================== */}
          {viewMode === 'WEEK' && (
            <div className="d-flex flex-column flex-1 overflow-hidden h-100">
              {/* Scrollable 24-Hour Time Grid with Integrated Sticky Header */}
              <div ref={gridScrollerRef} className="gcal-grid-scroller">
                {/* Sticky Top Header: GMT+07 + 7 Columns (Placed inside scroller for 100% column alignment!) */}
                <div className="gcal-week-header">
                  <div className="gcal-timezone-corner">GMT+07</div>
                  <div className="gcal-week-cols-header">
                    {currentWeekDays.map((col) => (
                      <div key={col.dateStr} className="gcal-col-header-cell">
                        <div className={`gcal-dow-name ${col.isToday ? 'today' : ''}`}>
                          {lang === 'en' ? col.labelEn : col.labelVi}
                        </div>
                        <div className={`gcal-day-circle ${col.isToday ? 'today' : ''}`}>
                          {col.dayNum}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 24-Hour Grid Body */}
                <div className="gcal-time-grid">
                  {/* Left Column: Time Axis (00:00 - 23:00) */}
                  <div className="gcal-time-axis">
                    {Array.from({ length: 24 }).map((_, hour) => (
                      <div key={hour} className="gcal-time-label">
                        {hour > 0 ? `${String(hour).padStart(2, '0')}:00` : ''}
                      </div>
                    ))}
                  </div>

                  {/* 7 Columns: Monday to Sunday */}
                  <div className="gcal-days-grid">
                    {currentWeekDays.map((col) => {
                      // Get all shift segments active on this day column (including overnight portions)
                      const daySegments = getShiftSegmentsForDay(personalShifts, col.dateStr, selectedStaff.role, selectedStaff.department_code);

                      return (
                        <div key={col.dateStr} className="gcal-day-column">
                          {/* 24 Hour Slots */}
                          {Array.from({ length: 24 }).map((_, hour) => (
                            <div key={hour} className="gcal-hour-slot" />
                          ))}

                          {/* RED CURRENT TIME INDICATOR (Only on today's column) */}
                          {col.isToday && (
                            <div
                              className="gcal-current-time-marker"
                              style={{
                                top: `${currentMinuteOfDay * (52 / 60)}px`
                              }}
                            >
                              <div className="gcal-current-time-dot" />
                            </div>
                          )}

                          {/* Shift Event Segment Cards */}
                          {daySegments.map((segment) => {
                            const shift = segment.shift;
                            const cat = classifyShift(shift);
                            const meta = SHIFT_CATEGORIES[cat];

                            return (
                              <div
                                key={segment.segmentKey}
                                onClick={() => setSelectedShiftDetail(shift)}
                                className={`gcal-event-card ${
                                  segment.isContinuingToTomorrow ? 'overnight-start' : ''
                                } ${segment.isContinuationFromYesterday ? 'overnight-end' : ''}`}
                                style={{
                                  top: `${segment.topPx}px`,
                                  height: `${segment.heightPx}px`,
                                  backgroundColor: meta.color
                                }}
                                title={`${segment.displayTitle}: ${shift.start_time.slice(11, 16)} - ${shift.end_time.slice(11, 16)}`}
                              >
                                <div className="gcal-event-title d-flex align-items-center gap-1">
                                  {segment.isContinuationFromYesterday && <CornerDownRight size={11} className="flex-shrink-0" />}
                                  <span className="text-truncate">{segment.displayTitle}</span>
                                </div>
                                <div className="gcal-event-time">
                                  {segment.displayTime}
                                </div>
                                {segment.heightPx > 48 && (
                                  <div className="gcal-event-meta">
                                    {deptName}
                                  </div>
                                )}
                                {segment.badgeNote && segment.heightPx > 60 && (
                                  <div className="gcal-event-note">
                                    {segment.badgeNote}
                                  </div>
                                )}
                                {segment.heightPx > 80 && shift.requires_handover && (
                                  <div className="gcal-event-meta d-flex align-items-center gap-1 mt-auto">
                                    <FileText size={10} />
                                    <span>Giao ca bắt buộc</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* NOTE: If no shifts on this day, grid slot remains completely empty and clean. 
                              0 cards saying "Nghỉ Ngơi", matching authentic Google Calendar behavior! */}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== 2. MONTH VIEW ===================== */}
          {viewMode === 'MONTH' && (
            <div className="gcal-month-grid">
              {/* Day Headers (T2 to CN) */}
              <div className="gcal-month-header-row">
                {(lang === 'en'
                  ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                  : ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']
                ).map((dow, idx) => (
                  <div key={idx} className="gcal-month-header-cell">
                    {dow}
                  </div>
                ))}
              </div>

              {/* Weeks Container */}
              <div className="gcal-month-weeks-container">
                {monthViewWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="gcal-month-week-row">
                    {week.map((cell) => (
                      <div
                        key={cell.dateStr}
                        onClick={() => {
                          setActiveDate(cell.date);
                          setViewMode('WEEK');
                        }}
                        className={`gcal-month-cell ${cell.isCurrentMonth ? '' : 'other-month'}`}
                      >
                        <div className="gcal-month-cell-header">
                          <div
                            className={`gcal-month-day-num ${
                              cell.isToday ? 'today' : ''
                            } ${cell.isCurrentMonth ? '' : 'other-month'}`}
                          >
                            {cell.dayNum}
                          </div>
                        </div>

                        {/* Event Chips (Including overnight continuation chips) */}
                        <div className="d-flex flex-column gap-1 flex-grow-1 overflow-hidden">
                          {cell.segments.slice(0, 3).map((segment) => {
                            const shift = segment.shift;
                            const cat = classifyShift(shift);
                            const meta = SHIFT_CATEGORIES[cat];
                            return (
                              <div
                                key={segment.segmentKey}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedShiftDetail(shift);
                                }}
                                className="gcal-month-chip"
                                style={{ backgroundColor: meta.color }}
                                title={`${segment.displayTitle} (${shift.start_time.slice(11, 16)} – ${shift.end_time.slice(11, 16)})`}
                              >
                                {segment.isContinuationFromYesterday ? (
                                  <span>➔ {shift.end_time.slice(11, 16)}</span>
                                ) : (
                                  <span>{shift.start_time.slice(11, 16)}</span>
                                )}
                                <span className="text-truncate">{segment.displayTitle}</span>
                              </div>
                            );
                          })}
                          {cell.segments.length > 3 && (
                            <div className="text-muted fw-bold px-1" style={{ fontSize: '10px' }}>
                              +{cell.segments.length - 3} mục khác
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== 3. AGENDA (LỊCH BIỂU) VIEW ===================== */}
          {viewMode === 'AGENDA' && (
            <div className="gcal-agenda-container">
              {agendaGroupedShifts.length > 0 ? (
                agendaGroupedShifts.map((group) => (
                  <div key={group.dateStr} className="gcal-agenda-group">
                    {/* Date Column */}
                    <div className="gcal-agenda-date-col">
                      <div className={`gcal-agenda-day-circle ${group.isToday ? 'today' : ''}`}>
                        {group.dayNum}
                      </div>
                      <div>
                        <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                          {group.dowVi}
                        </div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          Tháng {group.monthNum}
                        </div>
                        {group.isToday && (
                          <span className="badge bg-primary-subtle text-primary mt-1" style={{ fontSize: '9px' }}>
                            Hôm nay
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shifts for this date */}
                    <div className="gcal-agenda-items">
                      {group.shifts.map((shift) => {
                        const cat = classifyShift(shift);
                        const meta = SHIFT_CATEGORIES[cat];
                        const isOvernight = shift.start_time.slice(0, 10) < shift.end_time.slice(0, 10);

                        return (
                          <div
                            key={shift.id}
                            onClick={() => setSelectedShiftDetail(shift)}
                            className="gcal-agenda-card"
                          >
                            <div className="d-flex align-items-center gap-3">
                              {/* Color bar */}
                              <div
                                style={{
                                  width: '4px',
                                  height: '36px',
                                  borderRadius: '2px',
                                  backgroundColor: meta.color
                                }}
                              />
                              <div>
                                <div className="fw-bold text-dark fs-6 d-flex align-items-center gap-2">
                                  <span>{getRoleAwareShiftLabel(cat, shift.role || selectedStaff.role, shift.department_code || selectedStaff.department_code)}</span>
                                  <span className="badge bg-light text-dark border font-mono" style={{ fontSize: '11px' }}>
                                    {shift.start_time.slice(11, 16)} – {shift.end_time.slice(11, 16)}
                                    {isOvernight && ' (➜ Hôm sau)'}
                                  </span>
                                </div>
                                <div className="text-muted small mt-0.5">
                                  {deptName} &bull; Phân bổ: {staffPrefix}{selectedStaff.last_name} {selectedStaff.first_name}
                                </div>
                              </div>
                            </div>

                            <div className="d-flex align-items-center gap-2">
                              {shift.requires_handover && (
                                <span className="badge bg-success-subtle text-success border border-success-subtle small">
                                  ✓ Sổ giao ca
                                </span>
                              )}
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary px-2.5 py-1"
                                style={{ fontSize: '12px' }}
                              >
                                Chi Tiết
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-5 text-muted">
                  <CalendarIcon size={32} className="opacity-25 mb-2" />
                  <div>Không có lịch công tác nào phù hợp với bộ lọc hiện tại.</div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ===================== SHIFT DETAIL MODAL (Google Style Popover) ===================== */}
      <Modal show={!!selectedShiftDetail} onHide={() => setSelectedShiftDetail(null)} centered>
        {selectedShiftDetail && (() => {
          const cat = classifyShift(selectedShiftDetail);
          const meta = SHIFT_CATEGORIES[cat];
          const isOvernight = selectedShiftDetail.start_time.slice(0, 10) < selectedShiftDetail.end_time.slice(0, 10);

          return (
            <>
              {/* Header colored banner */}
              <div
                style={{
                  height: '8px',
                  backgroundColor: meta.color,
                  borderTopLeftRadius: 'var(--bs-modal-inner-border-radius)',
                  borderTopRightRadius: 'var(--bs-modal-inner-border-radius)'
                }}
              />
              <Modal.Header closeButton className="border-bottom-0 pb-0">
                <Modal.Title className="fw-bold fs-5 text-dark d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle"
                    style={{ width: '12px', height: '12px', backgroundColor: meta.color }}
                  />
                  <span>{getRoleAwareShiftLabel(cat, selectedShiftDetail.role || selectedStaff.role, selectedShiftDetail.department_code || selectedStaff.department_code)}</span>
                </Modal.Title>
              </Modal.Header>

              <Modal.Body className="pt-2">
                <div className="d-flex flex-column gap-3">
                  {/* Time Row */}
                  <div className="d-flex align-items-start gap-3">
                    <Clock size={18} className="text-secondary mt-0.5" />
                    <div>
                      <div className="fw-semibold text-dark">
                        {selectedShiftDetail.start_time.slice(0, 10)}
                        {isOvernight && ` ➔ ${selectedShiftDetail.end_time.slice(0, 10)} (Qua đêm)`}
                      </div>
                      <div className="text-muted font-mono" style={{ fontSize: '13px' }}>
                        {selectedShiftDetail.start_time.slice(11, 16)} – {selectedShiftDetail.end_time.slice(11, 16)}
                      </div>
                    </div>
                  </div>

                  {/* Staff Row */}
                  <div className="d-flex align-items-start gap-3">
                    <User size={18} className="text-secondary mt-0.5" />
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="fw-semibold text-dark">
                          {staffPrefix}{lang === 'vi' ? `${selectedStaff.last_name || ''} ${selectedStaff.first_name || ''}`.trim() : `${selectedStaff.first_name || ''} ${selectedStaff.last_name || ''}`.trim()}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-link p-0 text-primary text-decoration-none"
                          style={{ fontSize: '12px' }}
                          onClick={() => setInspectedStaffCode(selectedShiftDetail.staff_id)}
                        >
                          {t('shifts.view_profile', 'Xem thông tin')}
                        </button>
                      </div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        {staffTitle} &bull; Mã: <span className="font-mono">{selectedShiftDetail.staff_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Department Row */}
                  <div className="d-flex align-items-start gap-3">
                    <Building2 size={18} className="text-secondary mt-0.5" />
                    <div>
                      <div className="fw-semibold text-dark">{deptName}</div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        Khoa phòng lâm sàng được phân bổ
                      </div>
                    </div>
                  </div>

                  {/* Handover Policy Row */}
                  <div className="d-flex align-items-start gap-3">
                    <FileText size={18} className="text-secondary mt-0.5" />
                    <div>
                      <div className="fw-semibold text-dark">
                        {selectedShiftDetail.requires_handover
                          ? 'Bắt buộc ký sổ bàn giao ca trực'
                          : 'Không yêu cầu ký sổ giao ca'}
                      </div>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        Quy chế an toàn người bệnh & hồ sơ bệnh án
                      </div>
                    </div>
                  </div>

                  {/* Colleagues in same shift team (Strictly same department - "chỉ thấy cùng khoa") */}
                  <div className="border-top pt-3 mt-1">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <Users size={16} className="text-secondary" />
                        <span className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                          {t('shifts.colleagues_title', 'Đồng Nghiệp Trong Kíp Trực (Cùng Khoa)')}
                        </span>
                      </div>
                      <span className="badge bg-light text-secondary border font-mono" style={{ fontSize: '11px' }}>
                        {teamColleagues.length} {t('shifts.colleagues_count', 'cán bộ cùng khoa')}
                      </span>
                    </div>

                    {teamColleagues.length === 0 ? (
                      <div className="p-2.5 rounded-2 text-muted fst-italic border bg-light text-center" style={{ fontSize: '12px' }}>
                        {t('shifts.no_colleagues', 'Chưa có cán bộ cùng khoa khác trong kíp trực này.')}
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-2" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {teamColleagues.map((colleague) => {
                          const emp = employees.find((e: any) => e.employee_code === colleague.staff_id);
                          const colRole = emp?.role || colleague.role;
                          const isDoc = colRole === 'DOCTOR' || colRole === 'DEPARTMENT_HEAD';
                          const isNur = colRole === 'NURSE';
                          const isTch = colRole === 'TECHNICIAN';
                          const pfx = isDoc ? 'BS. ' : isNur ? 'ĐD. ' : isTch ? 'KTV. ' : '';
                          const name = emp
                            ? (lang === 'vi'
                                ? `${pfx}${emp.last_name || ''} ${emp.first_name || ''}`.trim()
                                : `${pfx}${emp.first_name || ''} ${emp.last_name || ''}`.trim())
                            : `${pfx}${colleague.staff_name}`;
                          const initials = emp
                            ? `${(emp.last_name || '').slice(0, 1)}${(emp.first_name || '').slice(0, 1)}`.toUpperCase()
                            : colleague.staff_name.slice(0, 2).toUpperCase();
                          const roleLabel = colRole === 'DEPARTMENT_HEAD'
                            ? 'Trưởng Khoa'
                            : colRole === 'DOCTOR'
                            ? 'Bác Sĩ'
                            : colRole === 'NURSE'
                            ? 'Điều Dưỡng'
                            : colRole === 'TECHNICIAN'
                            ? 'Kỹ Thuật Viên'
                            : colRole;

                          return (
                            <div
                              key={colleague.id}
                              onClick={() => setInspectedStaffCode(colleague.staff_id)}
                              className="p-2 rounded-2 border d-flex align-items-center justify-content-between gcal-colleague-item"
                              style={{ cursor: 'pointer', backgroundColor: '#fcfcfd' }}
                            >
                              <div className="d-flex align-items-center gap-2.5 overflow-hidden">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    fontSize: '12px',
                                    backgroundColor: isDoc ? '#1a73e8' : isNur ? '#137333' : '#7c3aed',
                                    flexShrink: 0
                                  }}
                                >
                                  {initials}
                                </div>
                                <div className="overflow-hidden">
                                  <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '13px' }}>
                                    {name}
                                  </div>
                                  <div className="text-muted text-truncate" style={{ fontSize: '11px' }}>
                                    <span className="font-mono">{colleague.staff_id}</span> &bull; {roleLabel}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-0.5 px-2 text-nowrap"
                                style={{ fontSize: '11px', borderRadius: '12px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectedStaffCode(colleague.staff_id);
                                }}
                              >
                                {t('shifts.view_profile', 'Xem thông tin')}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Modal.Body>

              <Modal.Footer className="border-top py-2 d-flex justify-content-between">
                {/* Delete button: ONLY FOR HR/ADMIN */}
                {isHR ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                    onClick={handleDeleteShift}
                    disabled={isDeleting}
                  >
                    <Trash2 size={14} />
                    <span>{isDeleting ? 'Đang xóa...' : 'Hủy Ca Này'}</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="d-flex align-items-center gap-2">
                  <Link
                    to="/attendance"
                    className="btn btn-sm btn-primary text-white px-3"
                    onClick={() => setSelectedShiftDetail(null)}
                  >
                    Chấm Công
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3"
                    onClick={() => setSelectedShiftDetail(null)}
                  >
                    Đóng
                  </button>
                </div>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* ===================== STREAMLINED STAFF PROFILE MODAL (Chức danh, Tên, Thư, Điện thoại) ===================== */}
      <Modal
        show={!!inspectedStaffCode}
        onHide={() => setInspectedStaffCode(null)}
        centered
        size="sm"
        style={{ zIndex: 1060 }}
      >
        {inspectedEmployee && (() => {
          const role = inspectedEmployee.role;
          const isHead = role === 'DEPARTMENT_HEAD';
          const isDoctor = role === 'DOCTOR' || isHead;
          const isNurse = role === 'NURSE';
          const isTech = role === 'TECHNICIAN';
          const titleLabel = isHead
            ? 'Trưởng Khoa'
            : isDoctor
            ? 'Bác Sĩ'
            : isNurse
            ? 'Điều Dưỡng'
            : isTech
            ? 'Kỹ Thuật Viên'
            : role || 'Cán Bộ Y Tế';
          const clinicalTitle = inspectedEmployee.specialty
            ? inspectedEmployee.specialty
            : titleLabel;
          const prefix = isDoctor ? 'BS. ' : isNurse ? 'ĐD. ' : isTech ? 'KTV. ' : '';
          const fullName = inspectedEmployee
            ? (lang === 'vi'
                ? `${prefix}${inspectedEmployee.last_name || ''} ${inspectedEmployee.first_name || ''}`.trim()
                : `${prefix}${inspectedEmployee.first_name || ''} ${inspectedEmployee.last_name || ''}`.trim())
            : inspectedStaffCode;
          const initials = `${(inspectedEmployee.last_name || '').slice(0, 1)}${(inspectedEmployee.first_name || '').slice(0, 1)}`.toUpperCase() || 'CB';

          return (
            <>
              <Modal.Header closeButton className="border-bottom py-2.5">
                <Modal.Title className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                  <User size={18} className="text-primary" />
                  <span>{t('shifts.profile_modal_title', 'Thông Tin Cán Bộ Y Tế')}</span>
                </Modal.Title>
              </Modal.Header>

              <Modal.Body className="p-3">
                {/* Header Card: Avatar + Name + Title badge */}
                <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 mb-3 border">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                    style={{
                      width: '46px',
                      height: '46px',
                      fontSize: '16px',
                      backgroundColor: isDoctor ? '#1a73e8' : isNurse ? '#137333' : '#7c3aed',
                      flexShrink: 0
                    }}
                  >
                    {initials}
                  </div>
                  <div className="overflow-hidden">
                    <div className="fw-bold text-dark text-truncate" style={{ fontSize: '15px' }}>
                      {fullName}
                    </div>
                    <div className="text-muted text-truncate font-mono" style={{ fontSize: '11px' }}>
                      {inspectedStaffCode}
                    </div>
                  </div>
                </div>

                {/* 4 Essential Fields Only: Chức danh, Họ và tên, Thư, Điện thoại */}
                <div className="d-flex flex-column gap-2">
                  {/* 1. Chức danh */}
                  <div className="p-2.5 rounded-2 border bg-white">
                    <div className="d-flex align-items-center gap-1.5 text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                      <Briefcase size={13} className="text-secondary" />
                      <span>{t('shifts.profile_role', 'Chức Danh')}</span>
                    </div>
                    <div className="fw-semibold text-dark ps-4" style={{ fontSize: '13px' }}>
                      {clinicalTitle}
                    </div>
                  </div>

                  {/* 2. Tên */}
                  <div className="p-2.5 rounded-2 border bg-white">
                    <div className="d-flex align-items-center gap-1.5 text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                      <User size={13} className="text-secondary" />
                      <span>{t('shifts.profile_name', 'Họ và Tên')}</span>
                    </div>
                    <div className="fw-semibold text-dark ps-4" style={{ fontSize: '13px' }}>
                      {fullName}
                    </div>
                  </div>

                  {/* 3. Thư */}
                  <div className="p-2.5 rounded-2 border bg-white">
                    <div className="d-flex align-items-center gap-1.5 text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                      <Mail size={13} className="text-secondary" />
                      <span>{t('shifts.profile_email', 'Hòm Thư')}</span>
                    </div>
                    <div className="ps-4">
                      {inspectedEmployee.email ? (
                        <a
                          href={`mailto:${inspectedEmployee.email}`}
                          className="fw-semibold text-primary text-decoration-none text-truncate d-block"
                          style={{ fontSize: '13px' }}
                        >
                          {inspectedEmployee.email}
                        </a>
                      ) : (
                        <span className="text-muted fst-italic" style={{ fontSize: '12px' }}>Chưa cập nhật</span>
                      )}
                    </div>
                  </div>

                  {/* 4. Điện thoại */}
                  <div className="p-2.5 rounded-2 border bg-white">
                    <div className="d-flex align-items-center gap-1.5 text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                      <Phone size={13} className="text-secondary" />
                      <span>{t('shifts.profile_phone', 'Điện Thoại')}</span>
                    </div>
                    <div className="ps-4">
                      {inspectedEmployee.phone ? (
                        <a
                          href={`tel:${inspectedEmployee.phone}`}
                          className="fw-semibold text-primary text-decoration-none font-mono text-truncate d-block"
                          style={{ fontSize: '13px' }}
                        >
                          {inspectedEmployee.phone}
                        </a>
                      ) : (
                        <span className="text-muted fst-italic" style={{ fontSize: '12px' }}>Chưa cập nhật</span>
                      )}
                    </div>
                  </div>
                </div>
              </Modal.Body>

              <Modal.Footer className="border-top py-2 d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary px-3"
                  onClick={() => setInspectedStaffCode(null)}
                >
                  {t('common.close', 'Đóng')}
                </button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* ===================== "+ TẠO CA" MODAL (HR MANAGEMENT ROSTERING TABS) ===================== */}
      {isHR && (
        <Modal show={isCreateModalOpen} onHide={() => setIsCreateModalOpen(false)} size="lg" centered>
          <Modal.Header closeButton className="border-bottom py-2.5">
            <Modal.Title className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
              <Plus size={18} className="text-primary" />
              <span>{t('shifts.modal_assign_title', 'Phân Bổ Lịch Làm Việc & Ca Trực (Phòng Nhân Sự HR)')}</span>
            </Modal.Title>
          </Modal.Header>

          {/* HR Mode Tab Bar */}
          <div className="px-3 pt-3 bg-light border-bottom">
            <div className="d-flex gap-2">
              <button
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-top-2 border-bottom-0 ${
                  createTab === 'SINGLE'
                    ? 'btn-white fw-bold text-primary bg-white border'
                    : 'btn-light text-secondary'
                }`}
                onClick={() => {
                  setCreateTab('SINGLE');
                  setFormError(null);
                  setFormSuccess(null);
                }}
              >
                <Clock size={14} />
                <span>{t('shifts.modal_tab_single', 'Ca Đơn Lẻ')}</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-top-2 border-bottom-0 ${
                  createTab === 'BATCH'
                    ? 'btn-white fw-bold text-primary bg-white border'
                    : 'btn-light text-secondary'
                }`}
                onClick={() => {
                  setCreateTab('BATCH');
                  setFormError(null);
                  setFormSuccess(null);
                }}
              >
                <CalendarDays size={14} />
                <span>{t('shifts.modal_tab_batch', 'Lịch Định Kỳ (Hàng Loạt)')}</span>
              </button>

              <button
                type="button"
                className={`btn btn-sm d-flex align-items-center gap-1.5 px-3 py-1.5 rounded-top-2 border-bottom-0 ${
                  createTab === 'AUTO_ROTATE'
                    ? 'btn-white fw-bold text-primary bg-white border'
                    : 'btn-light text-secondary'
                }`}
                onClick={() => {
                  setCreateTab('AUTO_ROTATE');
                  setFormError(null);
                  setFormSuccess(null);
                }}
              >
                <RotateCw size={14} />
                <span>{t('shifts.modal_tab_rotate', 'Tự Động Xoay Kíp')}</span>
              </button>
            </div>
          </div>

          <Modal.Body className="p-3">
            {/* Alert Notifications */}
            {formError && (
              <Alert
                variant={restConfirmationNeeded ? 'warning' : 'danger'}
                className="py-2.5 px-3 small mb-3 border"
                style={{
                  backgroundColor: restConfirmationNeeded ? '#fffbeb' : undefined,
                  borderColor: restConfirmationNeeded ? '#f59e0b' : undefined,
                  color: restConfirmationNeeded ? '#92400e' : undefined
                }}
              >
                <div className="d-flex align-items-start gap-2">
                  <AlertTriangle
                    size={17}
                    className={`flex-shrink-0 mt-0.5 ${restConfirmationNeeded ? 'text-warning' : 'text-danger'}`}
                  />
                  <div className="flex-grow-1">
                    <div className="fw-semibold mb-1">{formError}</div>
                    {restConfirmationNeeded && (
                      <div className="mt-2 pt-2 border-top border-warning-subtle d-flex align-items-center justify-content-between">
                        <span style={{ fontSize: '12px' }}>
                          Xác nhận phân công trường hợp Trực Tăng Cường / Trực Thay Đột Xuất?
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-warning text-dark fw-semibold px-2.5 py-1"
                          style={{ fontSize: '12px' }}
                          onClick={() => handleCreateSubmit(undefined, true)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Trực Tăng Cường'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            )}
            {formSuccess && (
              <Alert variant="success" className="py-2 px-3 small mb-3 d-flex align-items-center gap-2">
                <Check size={16} className="flex-shrink-0 text-success" />
                <span>{formSuccess}</span>
              </Alert>
            )}

            {/* TAB 1: SINGLE SHIFT */}
            {createTab === 'SINGLE' && (
              <Form onSubmit={handleCreateSubmit}>
                <div className="d-flex flex-column gap-3">
                  <div className="row g-2">
                    {/* Department Quick Filter */}
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-dark d-flex align-items-center gap-1">
                          <Building2 size={13} className="text-secondary" />
                          <span>{t('shifts.dept_filter', 'Lọc Theo Khoa Phòng')}</span>
                        </Form.Label>
                        <Form.Select
                          value={modalDeptFilter}
                          onChange={(e) => setModalDeptFilter(e.target.value)}
                          style={{ fontSize: '13px' }}
                        >
                          <option value="ALL">-- {t('shifts.all_depts', 'Tất Cả Khoa Phòng')} --</option>
                          {serverDepartments.map((dept) => (
                            <option key={dept.department_code} value={dept.department_code}>
                              {dept.name} ({dept.department_code})
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </div>

                    {/* Staff Member */}
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-dark d-flex align-items-center gap-1">
                          <User size={13} className="text-secondary" />
                          <span>{t('shifts.modal_staff_label', 'Cán Bộ Y Tế Nhận Ca')} *</span>
                        </Form.Label>
                        <Form.Select
                          value={createForm.staff_id}
                          onChange={(e) => setCreateForm({ ...createForm, staff_id: e.target.value })}
                          required
                          style={{ fontSize: '13px' }}
                        >
                          {modalEmployees.map((emp) => {
                            const isDoc = emp.role === 'DOCTOR' || emp.role === 'DEPARTMENT_HEAD';
                            const isNur = emp.role === 'NURSE';
                            const pfx = isDoc ? 'BS. ' : isNur ? 'ĐD. ' : '';
                            return (
                              <option key={emp.employee_code} value={emp.employee_code}>
                                {pfx}{emp.last_name} {emp.first_name} ({emp.employee_code}) - {emp.department_code}
                              </option>
                            );
                          })}
                        </Form.Select>
                      </Form.Group>
                    </div>
                  </div>

                  {/* Shift Category */}
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-dark">{t('shifts.modal_type_label', 'Loại Hình Công Tác')}</Form.Label>
                    <Form.Select
                      value={createForm.category}
                      onChange={(e) => handleCreateCategoryChange(e.target.value as ShiftCategoryKey)}
                      style={{ fontSize: '13px' }}
                    >
                      {(() => {
                        const targetEmp = modalEmployees.find((e) => e.employee_code === createForm.staff_id);
                        return (Object.keys(SHIFT_CATEGORIES) as ShiftCategoryKey[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {getRoleAwareShiftLabel(cat, targetEmp?.role, targetEmp?.department_code)} ({SHIFT_CATEGORIES[cat].timeRange})
                          </option>
                        ));
                      })()}
                    </Form.Select>
                  </Form.Group>

                  {/* Date */}
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-dark">{t('shifts.modal_date', 'Ngày Trực / Làm Việc')}</Form.Label>
                    <Form.Control
                      type="date"
                      value={createForm.date}
                      onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                      required
                      style={{ fontSize: '13px' }}
                    />
                  </Form.Group>

                  {/* Time Window */}
                  <div className="row g-2">
                    <div className="col-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-dark">{t('shifts.modal_start_time', 'Giờ Bắt Đầu')}</Form.Label>
                        <Form.Control
                          type="time"
                          value={createForm.start_time}
                          onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })}
                          required
                          style={{ fontSize: '13px' }}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-dark">{t('shifts.modal_end_time', 'Giờ Kết Thúc')}</Form.Label>
                        <Form.Control
                          type="time"
                          value={createForm.end_time}
                          onChange={(e) => setCreateForm({ ...createForm, end_time: e.target.value })}
                          required
                          style={{ fontSize: '13px' }}
                        />
                      </Form.Group>
                    </div>
                  </div>

                  {/* Handover Checkbox */}
                  <Form.Check
                    type="checkbox"
                    id="handover-req-single"
                    label={t('shifts.modal_handover_req_label', 'Bắt buộc ký sổ bàn giao ca trực')}
                    checked={createForm.requires_handover}
                    onChange={(e) => setCreateForm({ ...createForm, requires_handover: e.target.checked })}
                    className="small text-dark"
                  />

                  <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary px-3"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      {t('common.cancel', 'Hủy')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary text-white px-3"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t('shifts.modal_submitting', 'Đang xử lý...') : t('shifts.modal_confirm_duty_btn', 'Lưu Ca Công Tác')}
                    </button>
                  </div>
                </div>
              </Form>
            )}

            {/* TAB 2: BATCH RECURRING SCHEDULE */}
            {createTab === 'BATCH' && (
              <Form onSubmit={handleBatchSubmit}>
                <div className="d-flex flex-column gap-3">
                  <div className="row g-2">
                    {/* Department Quick Filter */}
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-dark d-flex align-items-center gap-1">
                          <Building2 size={13} className="text-secondary" />
                          <span>{t('shifts.dept_filter', 'Lọc Theo Khoa Phòng')}</span>
                        </Form.Label>
                        <Form.Select
                          value={modalDeptFilter}
                          onChange={(e) => setModalDeptFilter(e.target.value)}
                          style={{ fontSize: '13px' }}
                        >
                          <option value="ALL">-- {t('shifts.all_depts', 'Tất Cả Khoa Phòng')} --</option>
                          {serverDepartments.map((dept) => (
                            <option key={dept.department_code} value={dept.department_code}>
                              {dept.name} ({dept.department_code})
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </div>

                    {/* Staff Member */}
                    <div className="col-md-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-dark d-flex align-items-center gap-1">
                          <User size={13} className="text-secondary" />
                          <span>{t('shifts.modal_staff_label', 'Cán Bộ Y Tế Nhận Ca')} *</span>
                        </Form.Label>
                        <Form.Select
                          value={batchForm.staff_id}
                          onChange={(e) => setBatchForm({ ...batchForm, staff_id: e.target.value })}
                          required
                          style={{ fontSize: '13px' }}
                        >
                          {modalEmployees.map((emp) => {
                            const isDoc = emp.role === 'DOCTOR' || emp.role === 'DEPARTMENT_HEAD';
                            const isNur = emp.role === 'NURSE';
                            const pfx = isDoc ? 'BS. ' : isNur ? 'ĐD. ' : '';
                            return (
                              <option key={emp.employee_code} value={emp.employee_code}>
                                {pfx}{emp.last_name} {emp.first_name} ({emp.employee_code}) - {emp.department_code}
                              </option>
                            );
                          })}
                        </Form.Select>
                      </Form.Group>
                    </div>
                  </div>

                  {/* Work Type */}
                  <Form.Group>
                    <Form.Label className="fw-semibold small text-dark">{t('shifts.work_time_slot_label', 'Khung Giờ Làm Việc / Ca Trực')}</Form.Label>
                    <Form.Select
                      value={batchForm.work_type}
                      onChange={(e) => setBatchForm({ ...batchForm, work_type: e.target.value as any })}
                      style={{ fontSize: '13px' }}
                    >
                      {(() => {
                        const targetEmp = modalEmployees.find((e) => e.employee_code === batchForm.staff_id);
                        return (
                          <>
                            <option value="OFFICE">{getRoleAwareShiftLabel('OFFICE', targetEmp?.role, targetEmp?.department_code)} (07:30 – 16:30)</option>
                            <option value="CA1">{getRoleAwareShiftLabel('CA1', targetEmp?.role, targetEmp?.department_code)} (07:00 – 14:00)</option>
                            <option value="CA2">{getRoleAwareShiftLabel('CA2', targetEmp?.role, targetEmp?.department_code)} (14:00 – 21:00)</option>
                            <option value="CA3">{getRoleAwareShiftLabel('CA3', targetEmp?.role, targetEmp?.department_code)} (21:00 – 07:00 Sáng mai)</option>
                            <option value="LEADERSHIP">Trực Lãnh Đạo Viện 24h (07:30 – 07:30)</option>
                            <option value="OVERTIME">{getRoleAwareShiftLabel('OVERTIME', targetEmp?.role, targetEmp?.department_code)} (16:30 – 20:00)</option>
                            <option value="CUSTOM">Khung Giờ Tùy Chỉnh</option>
                          </>
                        );
                      })()}
                    </Form.Select>
                  </Form.Group>

                  {/* Custom times if CUSTOM */}
                  {batchForm.work_type === 'CUSTOM' && (
                    <div className="row g-2">
                      <div className="col-6">
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-dark">{t('shifts.modal_start_time', 'Giờ Bắt Đầu')}</Form.Label>
                          <Form.Control
                            type="time"
                            value={batchForm.custom_start}
                            onChange={(e) => setBatchForm({ ...batchForm, custom_start: e.target.value })}
                            required
                            style={{ fontSize: '13px' }}
                          />
                        </Form.Group>
                      </div>
                      <div className="col-6">
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-dark">{t('shifts.modal_end_time', 'Giờ Kết Thúc')}</Form.Label>
                          <Form.Control
                            type="time"
                            value={batchForm.custom_end}
                            onChange={(e) => setBatchForm({ ...batchForm, custom_end: e.target.value })}
                            required
                            style={{ fontSize: '13px' }}
                          />
                        </Form.Group>
                      </div>
                    </div>
                  )}

                  {/* Date Range: From Date to To Date */}
                  <div className="row g-2">
                    <div className="col-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-dark">{t('shifts.date_from', 'Từ Ngày')}</Form.Label>
                        <Form.Control
                          type="date"
                          value={batchForm.start_date}
                          onChange={(e) => setBatchForm({ ...batchForm, start_date: e.target.value })}
                          required
                          style={{ fontSize: '13px' }}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-6">
                      <Form.Group>
                        <Form.Label className="fw-semibold small text-dark">{t('shifts.date_to', 'Đến Ngày')}</Form.Label>
                        <Form.Control
                          type="date"
                          value={batchForm.end_date}
                          onChange={(e) => setBatchForm({ ...batchForm, end_date: e.target.value })}
                          required
                          style={{ fontSize: '13px' }}
                        />
                      </Form.Group>
                    </div>
                  </div>

                  {/* Days of week selection */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-1.5">
                      <Form.Label className="fw-semibold small text-dark mb-0">
                        {t('shifts.dow_label', 'Chọn Các Thứ Trong Tuần (Tự Động Sinh Lịch)')}
                      </Form.Label>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-secondary py-0.5 px-2"
                          style={{ fontSize: '11px' }}
                          onClick={setBatchWeekdays}
                        >
                          {t('shifts.dow_weekdays_btn', 'Thứ 2 - Thứ 6')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-secondary py-0.5 px-2"
                          style={{ fontSize: '11px' }}
                          onClick={setBatchAllDays}
                        >
                          {t('shifts.dow_all_btn', 'Cả Tuần')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline-danger py-0.5 px-2"
                          style={{ fontSize: '11px' }}
                          onClick={clearBatchDays}
                        >
                          {t('shifts.dow_clear_btn', 'Bỏ Chọn')}
                        </button>
                      </div>
                    </div>

                    <div className="d-flex flex-wrap gap-1.5">
                      {[
                        { num: 1, label: 'Thứ Hai' },
                        { num: 2, label: 'Thứ Ba' },
                        { num: 3, label: 'Thứ Tư' },
                        { num: 4, label: 'Thứ Năm' },
                        { num: 5, label: 'Thứ Sáu' },
                        { num: 6, label: 'Thứ Bảy' },
                        { num: 0, label: 'Chủ Nhật' }
                      ].map((day) => {
                        const isSelected = batchForm.days_of_week.includes(day.num);
                        return (
                          <button
                            key={day.num}
                            type="button"
                            onClick={() => toggleBatchDay(day.num)}
                            className={`btn btn-sm py-1 px-2.5 rounded-2 font-mono ${
                              isSelected ? 'btn-primary text-white' : 'btn-outline-secondary'
                            }`}
                            style={{ fontSize: '12px' }}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Batch Preview Info Box */}
                  <div className="p-2.5 rounded-2 border bg-light text-secondary d-flex align-items-center gap-2" style={{ fontSize: '12.5px' }}>
                    <CalendarDays size={16} className="text-primary flex-shrink-0" />
                    <span>
                      Đã chọn <strong>{batchForm.days_of_week.length}</strong> ngày trong tuần. Dự kiến tạo tự động{' '}
                      <strong className="text-primary">{batchPreviewCount}</strong> ca làm việc định kỳ (Tối ưu batch insert, tự động kiểm tra trùng lịch).
                    </span>
                  </div>

                  {/* Handover Checkbox */}
                  <Form.Check
                    type="checkbox"
                    id="handover-req-batch"
                    label={t('shifts.modal_handover_req_label', 'Bắt buộc ký sổ bàn giao ca trực')}
                    checked={batchForm.requires_handover}
                    onChange={(e) => setBatchForm({ ...batchForm, requires_handover: e.target.checked })}
                    className="small text-dark"
                  />

                  <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary px-3"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      {t('common.cancel', 'Hủy')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary text-white px-3"
                      disabled={isSubmitting || batchPreviewCount === 0}
                    >
                      {isSubmitting ? t('shifts.modal_submitting', 'Đang xử lý...') : `Tạo Hàng Loạt ${batchPreviewCount} Ca`}
                    </button>
                  </div>
                </div>
              </Form>
            )}

            {/* TAB 3: AUTO-ROTATE TEAMS (3 CA 4 KÍP OR 2 CA 3 KÍP) */}
            {createTab === 'AUTO_ROTATE' && (
              rotatePreviewData ? (
                /* STEP 2: PREVIEW CONFIRMATION TABLE */
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 rounded-2 border bg-light d-flex flex-column gap-2" style={{ borderColor: '#cbd5e1' }}>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-dark" style={{ fontSize: '14px' }}>
                          Bảng Danh Sách Xác Nhận Ca Xoay Kíp
                        </span>
                        <span className="badge bg-success rounded-pill fw-semibold font-mono" style={{ fontSize: '11px' }}>
                          {rotatePreviewData.count} ca dự kiến
                        </span>
                      </div>
                      <div className="d-flex align-items-center gap-1.5">
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle" style={{ fontSize: '11px' }}>
                          {rotatePreviewData.rotation_model === '2CA_3KIP' ? '2 Ca 3 Kíp (10h/14h)' : '3 Ca 4 Kíp (Sáng/Chiều/Đêm)'}
                        </span>
                        <span className="badge bg-light text-secondary border font-mono" style={{ fontSize: '11px' }}>
                          {rotateForm.start_date} &rarr; {rotateForm.end_date}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted small" style={{ fontSize: '12px' }}>
                      Khoa áp dụng: <strong>{rotatePreviewData.department_code}</strong> với <strong>{selectedStaffForRotate.length} cán bộ</strong> tham gia. Vui lòng kiểm tra kỹ danh sách phân công trước khi lưu vào lịch chính thức.
                    </div>
                  </div>

                  {/* Filter search in preview table */}
                  <div className="d-flex align-items-center gap-2">
                    <div className="position-relative flex-grow-1">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Tìm theo tên cán bộ, mã NV, ca trực, kíp..."
                        value={previewFilterSearch}
                        onChange={(e) => setPreviewFilterSearch(e.target.value)}
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                    {previewFilterSearch && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        style={{ fontSize: '11px' }}
                        onClick={() => setPreviewFilterSearch('')}
                      >
                        Xóa tìm kiếm
                      </button>
                    )}
                  </div>

                  {/* Scrollable Preview Table */}
                  <div
                    className="table-responsive border rounded-2"
                    style={{ maxHeight: '340px', overflowY: 'auto' }}
                  >
                    <table className="table table-sm table-hover align-middle mb-0" style={{ fontSize: '12px' }}>
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th>NGÀY TRỰC</th>
                          <th>CA TRỰC</th>
                          <th>KHUNG GIỜ</th>
                          <th>KÍP</th>
                          <th>CÁN BỘ ĐƯỢC PHÂN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewShiftsToRender.length > 0 ? (
                          previewShiftsToRender.map((s: any, idx: number) => {
                            const dateOnly = s.start_time.split(' ')[0];
                            const startTimeOnly = s.start_time.split(' ')[1]?.slice(0, 5) || s.start_time.slice(11, 16);
                            const endTimeOnly = s.end_time.split(' ')[1]?.slice(0, 5) || s.end_time.slice(11, 16);

                            const isNight = s.shift_type === 'NIGHT';
                            const isAfternoon = s.shift_type === 'AFTERNOON';
                            const shiftBadgeClass = isNight
                              ? 'bg-purple-subtle text-purple border-purple'
                              : isAfternoon
                              ? 'bg-warning-subtle text-dark border-warning'
                              : 'bg-primary-subtle text-primary border-primary';

                            const shiftTitle = isNight
                              ? (rotatePreviewData.rotation_model === '2CA_3KIP' ? 'Ca Đêm (14h)' : 'Ca 3: Trực Đêm')
                              : isAfternoon
                              ? 'Ca 2: Chiều'
                              : (rotatePreviewData.rotation_model === '2CA_3KIP' ? 'Ca Ngày (10h)' : 'Ca 1: Sáng');

                            const teamBadgeColor =
                              s.team_code === 'TEAM_A' ? '#16a34a' :
                              s.team_code === 'TEAM_B' ? '#0284c7' :
                              s.team_code === 'TEAM_C' ? '#ea580c' : '#9333ea';

                            return (
                              <tr key={`${s.id}-${idx}`}>
                                <td className="text-muted font-mono" style={{ fontSize: '11px' }}>{idx + 1}</td>
                                <td>
                                  <div className="fw-semibold text-dark font-mono">{dateOnly}</div>
                                </td>
                                <td>
                                  <span className={`badge border ${shiftBadgeClass}`} style={{ fontSize: '11px' }}>
                                    {shiftTitle}
                                  </span>
                                </td>
                                <td>
                                  <span className="font-mono text-dark">{startTimeOnly} &ndash; {endTimeOnly}</span>
                                </td>
                                <td>
                                  <span
                                    className="badge font-mono"
                                    style={{
                                      backgroundColor: `${teamBadgeColor}15`,
                                      color: teamBadgeColor,
                                      border: `1px solid ${teamBadgeColor}40`,
                                      fontSize: '11px'
                                    }}
                                  >
                                    {s.team_code?.replace('TEAM_', 'Kíp ')}
                                  </span>
                                </td>
                                <td>
                                  <div className="fw-semibold text-dark">{s.staff_name}</div>
                                  <div className="text-muted font-mono" style={{ fontSize: '10px' }}>
                                    {s.staff_id} {s.specialty ? `• ${s.specialty}` : ''}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-muted">
                              Không tìm thấy ca trực nào phù hợp với từ khóa "{previewFilterSearch}"
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Confirmation Footer Actions */}
                  <div className="d-flex align-items-center justify-content-between pt-2 border-top">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary px-3"
                      onClick={() => setRotatePreviewData(null)}
                      disabled={isSubmitting}
                    >
                      &lsaquo; Quay Lại Chỉnh Sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-success text-white px-3 d-flex align-items-center gap-1.5"
                      onClick={handleConfirmAutoRotate}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span>Đang lưu vào hệ thống...</span>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Xác Nhận & Lưu Vào Lịch ({rotatePreviewData.count} ca)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 1: CONFIGURATION & STAFF SELECTION */
                <Form onSubmit={handleAutoRotatePreview}>
                  <div className="d-flex flex-column gap-3">
                    {/* Rotation Model Selector */}
                    <Form.Group>
                      <Form.Label className="fw-semibold small text-dark d-flex align-items-center gap-1 mb-2">
                        <RotateCw size={14} className="text-primary" />
                        <span>Chọn Mô Hình Ca Kíp Bệnh Viện</span>
                      </Form.Label>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className={`btn btn-sm flex-fill text-start p-2.5 rounded-2 border ${
                            rotateForm.rotation_model === '3CA_4KIP'
                              ? 'border-primary bg-primary-subtle text-primary fw-semibold'
                              : 'bg-white text-dark'
                          }`}
                          onClick={() => setRotateForm({ ...rotateForm, rotation_model: '3CA_4KIP' })}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span style={{ fontSize: '13px' }}>3 Ca 4 Kíp (Tiêu Chuẩn)</span>
                            {rotateForm.rotation_model === '3CA_4KIP' && <Check size={14} className="text-primary" />}
                          </div>
                          <div className="small text-muted fw-normal" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                            Ca 1: 07:00-14:00 | Ca 2: 14:00-21:00 | Ca 3: 21:00-07:00. Luân phiên 4 kíp (A, B, C, D). Nghỉ đúng 24h giữa các ca.
                          </div>
                        </button>

                        <button
                          type="button"
                          className={`btn btn-sm flex-fill text-start p-2.5 rounded-2 border ${
                            rotateForm.rotation_model === '2CA_3KIP'
                              ? 'border-primary bg-primary-subtle text-primary fw-semibold'
                              : 'bg-white text-dark'
                          }`}
                          onClick={() => setRotateForm({ ...rotateForm, rotation_model: '2CA_3KIP' })}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span style={{ fontSize: '13px' }}>2 Ca 3 Kíp (10h / 14h)</span>
                            {rotateForm.rotation_model === '2CA_3KIP' && <Check size={14} className="text-primary" />}
                          </div>
                          <div className="small text-muted fw-normal" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                            Ca Ngày: 07:00-17:00 (10h) | Ca Đêm: 17:00-07:00 (14h). Luân phiên 3 kíp (A, B, C). Nghỉ đúng 24h giữa các ca.
                          </div>
                        </button>
                      </div>
                    </Form.Group>

                    {/* Explanatory Banner */}
                    <div className="p-3 rounded-2 border bg-light" style={{ borderColor: '#cbd5e1' }}>
                      <div className="fw-semibold text-dark d-flex align-items-center gap-1.5 mb-1" style={{ fontSize: '13px' }}>
                        <RotateCw size={14} className="text-primary" />
                        <span>
                          {rotateForm.rotation_model === '2CA_3KIP'
                            ? 'Mô Hình 2 Ca / Ngày (Luân Phiên 3 Kíp A, B, C - Chuẩn 10h/14h)'
                            : 'Mô Hình 3 Ca / Ngày (Luân Phiên 4 Kíp A, B, C, D - Chuẩn Sáng/Chiều/Đêm)'}
                        </span>
                      </div>
                      <div className="text-muted small" style={{ fontSize: '12px', lineHeight: '1.5' }}>
                        {rotateForm.rotation_model === '2CA_3KIP'
                          ? 'Hệ thống tự động chia nhân sự thành 3 kíp (A, B, C) xoay tua: Ngày 1 làm Ca Ngày (07:00-17:00), nghỉ đúng 24h vào Ca Đêm (17:00-07:00), ra ca nghỉ bù đúng 24h trước khi quay lại ca ngày. Bảo đảm 100% thời gian nghỉ ngơi hợp chuẩn.'
                          : 'Hệ thống tự động chia nhân sự khoa thành 4 kíp (A, B, C, D) và xoay tua Ca 1 (Sáng 07:00-14:00), Ca 2 (Chiều 14:00-21:00), Ca 3 (Đêm 21:00-07:00 sáng sau), bảo đảm nghỉ ít nhất 24 tiếng giữa các ca và không trực 2 đêm liên tiếp.'}
                      </div>
                    </div>

                    {/* Target Department */}
                    <Form.Group>
                      <Form.Label className="fw-semibold small text-dark d-flex align-items-center gap-1">
                        <Building2 size={13} className="text-secondary" />
                        <span>{t('shifts.rotate_dept', 'Khoa Phòng Áp Dụng Xoay Kíp')} *</span>
                      </Form.Label>
                      <Form.Select
                        value={rotateForm.department_code}
                        onChange={(e) => setRotateForm({ ...rotateForm, department_code: e.target.value })}
                        required
                        style={{ fontSize: '13px' }}
                      >
                        {serverDepartments.map((dept) => (
                          <option key={dept.department_code} value={dept.department_code}>
                            {dept.name} ({dept.department_code})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {/* Staff Selection in Department */}
                    <Form.Group>
                      <div className="d-flex align-items-center justify-content-between mb-1.5">
                        <Form.Label className="fw-semibold small text-dark d-flex align-items-center gap-1 mb-0">
                          <Users size={13} className="text-secondary" />
                          <span>Chọn Cán Bộ Tham Gia Xoay Kíp</span>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle ms-1" style={{ fontSize: '10px' }}>
                            Đã chọn {selectedStaffForRotate.length} / {deptEmployeesForRotate.length}
                          </span>
                        </Form.Label>
                        <div className="d-flex align-items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-decoration-none small"
                            style={{ fontSize: '11px' }}
                            onClick={() => setSelectedStaffForRotate(deptEmployeesForRotate.map((e: any) => e.employee_code))}
                          >
                            Chọn Tất Cả
                          </button>
                          <span className="text-muted" style={{ fontSize: '11px' }}>&bull;</span>
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-decoration-none small text-danger"
                            style={{ fontSize: '11px' }}
                            onClick={() => setSelectedStaffForRotate([])}
                          >
                            Bỏ Chọn
                          </button>
                        </div>
                      </div>

                      <div
                        className="p-2.5 rounded-2 border bg-white"
                        style={{ maxHeight: '180px', overflowY: 'auto', borderColor: '#e2e8f0' }}
                      >
                        {deptEmployeesForRotate.length > 0 ? (
                          deptEmployeesForRotate.map((emp: any) => {
                            const isChecked = selectedStaffForRotate.includes(emp.employee_code);
                            return (
                              <label
                                key={emp.employee_code}
                                className={`d-flex align-items-center justify-content-between p-2 rounded-2 mb-1 cursor-pointer transition-all ${
                                  isChecked ? 'bg-primary-subtle border border-primary-subtle' : 'hover-bg-light border border-transparent'
                                }`}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <input
                                    type="checkbox"
                                    className="form-check-input mt-0"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedStaffForRotate([...selectedStaffForRotate, emp.employee_code]);
                                      } else {
                                        setSelectedStaffForRotate(selectedStaffForRotate.filter((c) => c !== emp.employee_code));
                                      }
                                    }}
                                  />
                                  <div>
                                    <span className="fw-semibold text-dark small" style={{ fontSize: '12px' }}>
                                      {emp.last_name} {emp.first_name}
                                    </span>
                                    <span className="text-muted font-mono ms-1.5" style={{ fontSize: '11px' }}>
                                      {emp.employee_code}
                                    </span>
                                  </div>
                                </div>
                                <span className="badge bg-light text-secondary border font-normal" style={{ fontSize: '10px' }}>
                                  {emp.specialty || emp.role}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                          <div className="text-muted small text-center py-3">
                            Không tìm thấy nhân sự thuộc khoa này
                          </div>
                        )}
                      </div>
                    </Form.Group>

                    {/* Date Range: From Date to To Date */}
                    <div className="row g-2">
                      <div className="col-6">
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-dark">{t('shifts.date_from', 'Từ Ngày')}</Form.Label>
                          <Form.Control
                            type="date"
                            value={rotateForm.start_date}
                            onChange={(e) => setRotateForm({ ...rotateForm, start_date: e.target.value })}
                            required
                            style={{ fontSize: '13px' }}
                          />
                        </Form.Group>
                      </div>
                      <div className="col-6">
                        <Form.Group>
                          <Form.Label className="fw-semibold small text-dark">{t('shifts.date_to', 'Đến Ngày')}</Form.Label>
                          <Form.Control
                            type="date"
                            value={rotateForm.end_date}
                            onChange={(e) => setRotateForm({ ...rotateForm, end_date: e.target.value })}
                            required
                            style={{ fontSize: '13px' }}
                          />
                        </Form.Group>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary px-3"
                        onClick={() => setIsCreateModalOpen(false)}
                        disabled={isGeneratingPreview}
                      >
                        {t('common.cancel', 'Hủy')}
                      </button>
                      <button
                        type="submit"
                        className="btn btn-sm btn-primary text-white px-3 d-flex align-items-center gap-1.5"
                        disabled={isGeneratingPreview || selectedStaffForRotate.length < (rotateForm.rotation_model === '2CA_3KIP' ? 3 : 4)}
                      >
                        {isGeneratingPreview ? (
                          <span>Đang tính toán sơ đồ...</span>
                        ) : (
                          <>
                            <Calendar size={14} />
                            <span>Xem Trước Lịch Xoay Kíp</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Form>
              )
            )}
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
};

export default ShiftRostering;
