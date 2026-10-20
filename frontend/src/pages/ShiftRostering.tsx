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
  CalendarDays,
  Plus,
  Clock,
  Building2,
  CheckCircle2,
  Search,
  ChevronRight,
  Info,
  ShieldCheck,
  Activity,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi, OnCallTier, TeamCode } from '../api/shiftApi';
import { employeeApi } from '../api/employeeApi';
import { departmentApi, Department } from '../api/departmentApi';
import { useTranslation } from '../i18n/useTranslation';

export interface ShiftItem {
  id: string;
  staff_id: string;
  staff_name: string;
  role: string;
  department_code?: string;
  department_id?: number;
  department_name: string;
  shift_type: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'SWING' | 'ON_CALL' | 'EMERGENCY_COVER';
  on_call_tier?: OnCallTier;
  team_code?: TeamCode;
  is_24h_on_call?: boolean;
  start_time: string;
  end_time: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'SWAPPED';
  requires_handover: boolean;
}

export const ShiftRostering: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, lang } = useTranslation();
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedShiftType, setSelectedShiftType] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // TanStack Query: Fetch shifts live from MySQL
  const { data: serverShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.getAll(),
    staleTime: 10000
  });

  // Query departments dynamically from MySQL hrm_db
  const { data: serverDepartments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getAll(),
    staleTime: 60000
  });

  // Query employees for schedule dropdown
  const { data: serverEmployees } = useQuery({
    queryKey: ['employeesList'],
    queryFn: () => employeeApi.getAll(),
    staleTime: 60000
  });

  // Form state
  const [newStaffCode, setNewStaffCode] = useState('EMP-DOC-001');
  const [newDeptCode, setNewDeptCode] = useState('DEP-CC-HSTC');
  const [newType, setNewType] = useState<'MORNING' | 'AFTERNOON' | 'NIGHT' | 'SWING' | 'ON_CALL' | 'EMERGENCY_COVER'>('MORNING');
  const [newOnCallTier, setNewOnCallTier] = useState<OnCallTier>('CLINICAL');
  const [newTeamCode, setNewTeamCode] = useState<TeamCode>('TEAM_A');
  const [newIs24hOnCall, setNewIs24hOnCall] = useState<boolean>(false);
  const [newStartTime, setNewStartTime] = useState('2026-09-26 07:00:00');
  const [newEndTime, setNewEndTime] = useState('2026-09-26 15:30:00');
  const [newRequiresHandover, setNewRequiresHandover] = useState(true);

  // Mutation: Create shift live in backend
  const createShiftMutation = useMutation({
    mutationFn: (payload: any) => shiftApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowModal(false);
      setActionSuccess(t('shifts.assign_success', 'Ca trực đã được phân bổ thành công theo Quy chế Thường trực bệnh viện!'));
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || t('shifts.assign_error', 'Không thể xếp ca trực.');
      setActionSuccess(`${t('common.error', 'Lỗi')}: ${msg}`);
    }
  });

  // Process shifts list directly from database
  const activeShifts: ShiftItem[] = (serverShifts && serverShifts.length > 0)
    ? serverShifts.map((s: any) => {
        const staffName = s.staff_name || (s.last_name && s.first_name ? `${s.last_name} ${s.first_name}` : s.staff_id);

        return {
          id: s.id,
          staff_id: s.staff_id,
          staff_name: staffName,
          role: s.role || 'DOCTOR',
          department_code: s.department_code,
          department_id: s.department_id,
          department_name: s.department_name || (s.department_code ? `${t('nav.department', 'Khoa')} ${s.department_code}` : `${t('nav.department', 'Khoa')} #${s.department_id}`),
          shift_type: s.shift_type,
          on_call_tier: s.on_call_tier || 'CLINICAL',
          team_code: s.team_code || 'GENERAL',
          is_24h_on_call: Boolean(s.is_24h_on_call),
          start_time: s.start_time,
          end_time: s.end_time,
          status: s.status,
          requires_handover: Boolean(s.requires_handover)
        };
      })
    : [];

  const shifts = activeShifts;

  const filteredShifts = activeShifts.filter((s) => {
    const matchesDept =
      selectedDept === 'ALL' ||
      s.department_code === selectedDept ||
      (s.department_name && s.department_name.toLowerCase().includes(selectedDept.toLowerCase()));
    const matchesType = selectedShiftType === 'ALL' || s.shift_type === selectedShiftType;
    const matchesTier = selectedTier === 'ALL' || s.on_call_tier === selectedTier;
    const matchesTeam = selectedTeam === 'ALL' || s.team_code === selectedTeam;
    const matchesSearch =
      s.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.staff_id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDept && matchesType && matchesTier && matchesTeam && matchesSearch;
  });

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    createShiftMutation.mutate({
      staff_id: newStaffCode,
      department_code: newDeptCode,
      shift_type: newType,
      on_call_tier: newOnCallTier,
      team_code: newTeamCode,
      is_24h_on_call: newIs24hOnCall,
      start_time: newStartTime,
      end_time: newEndTime,
      requires_handover: newRequiresHandover
    });
  };

  const getShiftBadge = (type: ShiftItem['shift_type']) => {
    switch (type) {
      case 'MORNING':
        return <span className="wd-badge-warning">{t('shifts.morning', 'Ca Sáng')}</span>;
      case 'AFTERNOON':
        return <span className="wd-badge-blue">{t('shifts.afternoon', 'Ca Chiều')}</span>;
      case 'NIGHT':
        return <span className="wd-badge-urgent">{t('shifts.night', 'Ca Đêm')}</span>;
      case 'ON_CALL':
        return <span className="wd-badge-urgent">{t('shifts.on_call', 'Trực Thường Trú')}</span>;
      case 'EMERGENCY_COVER':
        return <span className="wd-badge-urgent">{t('shifts.emergency', 'Trực Tăng Cường Khẩn')}</span>;
      default:
        return <span className="wd-badge-neutral">{type}</span>;
    }
  };

  const getTierBadge = (tier?: OnCallTier) => {
    switch (tier) {
      case 'LEADERSHIP':
        return (
          <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1 px-2 py-0.5" style={{ fontSize: '11px' }}>
            <ShieldCheck size={11} />
            <span>{t('tier.LEADERSHIP', 'Trực Lãnh Đạo')}</span>
          </span>
        );
      case 'CLINICAL':
        return (
          <span className="badge bg-primary-subtle text-primary border border-primary-subtle d-inline-flex align-items-center gap-1 px-2 py-0.5" style={{ fontSize: '11px' }}>
            <Activity size={11} />
            <span>{t('tier.CLINICAL', 'Trực Lâm Sàng')}</span>
          </span>
        );
      case 'PARACLINICAL':
        return (
          <span className="badge bg-info-subtle text-info border border-info-subtle d-inline-flex align-items-center gap-1 px-2 py-0.5" style={{ fontSize: '11px' }}>
            <Building2 size={11} />
            <span>{t('tier.PARACLINICAL', 'Trực Cận Lâm Sàng')}</span>
          </span>
        );
      case 'LOGISTICS':
        return (
          <span className="badge bg-secondary-subtle text-secondary border d-inline-flex align-items-center gap-1 px-2 py-0.5" style={{ fontSize: '11px' }}>
            <Users size={11} />
            <span>{t('tier.LOGISTICS', 'Trực Hậu Cần')}</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getTeamBadge = (team?: TeamCode) => {
    switch (team) {
      case 'TEAM_A':
        return <span className="badge bg-light text-dark border px-2 py-0.5 small">{t('team.TEAM_A', 'Kíp A')}</span>;
      case 'TEAM_B':
        return <span className="badge bg-light text-dark border px-2 py-0.5 small">{t('team.TEAM_B', 'Kíp B')}</span>;
      case 'TEAM_C':
        return <span className="badge bg-light text-dark border px-2 py-0.5 small">{t('team.TEAM_C', 'Kíp C')}</span>;
      case 'TEAM_D':
        return <span className="badge bg-light text-dark border px-2 py-0.5 small">{t('team.TEAM_D', 'Kíp D')}</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: ShiftItem['status']) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="wd-badge-success">{t('attendance.status_on_duty', 'Đang Trực')}</span>;
      case 'SCHEDULED':
        return <span className="wd-badge-neutral">{t('status.scheduled', 'Theo Lịch')}</span>;
      case 'COMPLETED':
        return <span className="wd-badge-success">{t('common.completed', 'Hoàn Tất')}</span>;
      case 'CANCELLED':
        return <span className="wd-badge-urgent">{t('status.cancelled', 'Đã Hủy')}</span>;
      default:
        return <span className="wd-badge-neutral">{status}</span>;
    }
  };

  return (
    <Container fluid className="px-0 py-3">
      {/* Header Banner */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4 pb-2 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="wd-page-title mb-0">{t('shifts.title', 'Lịch Trực Bệnh Viện')}</h1>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5" style={{ fontSize: '11px' }}>
              {t('shifts.rule_title', 'Quy Chế Thường Trực 4 Cấp')}
            </span>
          </div>
          <p className="wd-page-subtitle mb-0">
            {t('shifts.rule_desc', 'Tổ chức thường trực 4 cấp: Lãnh đạo viện, Lâm sàng, Cận lâm sàng và Hậu cần - Luân phiên 4 kíp trực A/B/C/D')}
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/attendance" className="wd-pill-btn-outline text-decoration-none">
            <Clock size={14} />
            <span>{t('shifts.clock_in_btn', 'Chấm Công Vào Ca')}</span>
          </Link>
          <button
            type="button"
            className="wd-pill-btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={15} />
            <span>{t('shifts.assign_shift_btn', 'Phân Bổ Ca Trực Mới')}</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <Alert
          variant={actionSuccess.startsWith(t('common.error', 'Lỗi')) ? 'danger' : 'success'}
          dismissible
          onClose={() => setActionSuccess(null)}
          className="d-flex align-items-center gap-2 py-2.5 mb-4 small rounded-2"
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </Alert>
      )}

      {/* Support Banner */}
      <div className="wd-support-banner mb-4">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            {t('shifts.policy_title', 'Quy Chế Thường Trực Bệnh Viện')}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {t('shifts.policy_desc', 'Bệnh viện tổ chức thường trực 24/24 giờ vào các ngày làm việc, ngày nghỉ cuối tuần và lễ tết. Thường trực gồm 4 cấp: Trực Lãnh đạo, Trực Lâm sàng, Trực Cận lâm sàng, và Trực Hậu cần.')}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {t('shifts.stat_on_duty', 'Đang Có Mặt Trong Ca')}
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '24px', color: 'var(--wd-green)' }}>
              {shifts.filter((s) => s.status === 'IN_PROGRESS').length} {t('shifts.staff_unit', 'Cán Bộ')}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('shifts.stat_on_duty_sub', 'Trực tiếp điều trị tại giường')}</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {t('shifts.stat_leadership_clinical', 'Trực Lãnh Đạo & Lâm Sàng')}
            </div>
            <div className="fw-bold text-dark mt-1 font-mono" style={{ fontSize: '24px' }}>
              {shifts.filter((s) => s.on_call_tier === 'LEADERSHIP' || s.on_call_tier === 'CLINICAL').length} {t('shifts.shift_unit', 'Ca')}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('shifts.stat_leadership_clinical_sub', 'Chỉ đạo chuyên môn 24/7')}</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {t('shifts.stat_handover_req', 'Ca Yêu Cầu Giao Ban Sổ')}
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '24px', color: 'var(--wd-amber)' }}>
              {shifts.filter((s) => s.requires_handover).length} {t('shifts.shift_unit', 'Ca')}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('shifts.stat_handover_req_sub', 'Ký sổ giao ca khoa phòng')}</div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card mb-0 p-3">
            <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
              {t('shifts.stat_24h', 'Trực 24/24 Giờ')}
            </div>
            <div className="fw-bold mt-1 font-mono" style={{ fontSize: '24px', color: 'var(--wd-blue)' }}>
              {shifts.filter((s) => s.is_24h_on_call).length} {t('shifts.shift_unit', 'Ca')}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>{t('shifts.stat_24h_sub', 'Hưởng chế độ phụ cấp trực 24h')}</div>
          </div>
        </Col>
      </Row>

      {/* Filter Bar */}
      <div className="wd-card mb-4 p-3">
        <Row className="g-2">
          <Col xs={12} md={3}>
            <div className="position-relative">
              <Search size={15} className="position-absolute text-muted" style={{ left: '12px', top: '11px' }} />
              <input
                type="text"
                placeholder={t('shifts.search_placeholder', 'Tìm bác sĩ, điều dưỡng...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="wd-input w-100 ps-5 py-1.5"
                style={{ fontSize: '12px' }}
              />
            </div>
          </Col>

          <Col xs={6} md={3}>
            <select
              aria-label={t('shifts.all_tiers', 'Cấp Thường Trực')}
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="wd-select w-100 py-1.5"
              style={{ fontSize: '12px' }}
            >
              <option value="ALL">{t('shifts.all_tiers', '-- Tất cả Cấp Thường Trực --')}</option>
              <option value="LEADERSHIP">🏛️ {t('shifts.level_1', 'Trực Lãnh Đạo')}</option>
              <option value="CLINICAL">🩺 {t('shifts.level_2', 'Trực Lâm Sàng')}</option>
              <option value="PARACLINICAL">🔬 {t('shifts.level_3', 'Trực Cận Lâm Sàng')}</option>
              <option value="LOGISTICS">📦 {t('shifts.level_4', 'Trực Hậu Cần')}</option>
            </select>
          </Col>

          <Col xs={6} md={2}>
            <select
              aria-label={t('shifts.all_teams', 'Kíp Trực')}
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="wd-select w-100 py-1.5"
              style={{ fontSize: '12px' }}
            >
              <option value="ALL">{t('shifts.all_teams', '-- Kíp Trực --')}</option>
              <option value="TEAM_A">{t('team.team_a', 'Kíp A')}</option>
              <option value="TEAM_B">{t('team.team_b', 'Kíp B')}</option>
              <option value="TEAM_C">{t('team.team_c', 'Kíp C')}</option>
              <option value="TEAM_D">{t('team.team_d', 'Kíp D')}</option>
              <option value="GENERAL">{t('shifts.team_general', 'Kíp Chung')}</option>
            </select>
          </Col>

          <Col xs={6} md={2}>
            <select
              aria-label={t('shifts.all_departments', 'Khoa Phòng')}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="wd-select w-100 py-1.5"
              style={{ fontSize: '12px' }}
            >
              <option value="ALL">{t('shifts.all_departments', '-- Khoa Phòng --')}</option>
              {serverDepartments.map((d) => (
                <option key={d.department_code} value={d.department_code}>
                  {d.name}
                </option>
              ))}
            </select>
          </Col>

          <Col xs={6} md={2}>
            <select
              aria-label={t('shifts.all_shift_types', 'Loại Ca')}
              value={selectedShiftType}
              onChange={(e) => setSelectedShiftType(e.target.value)}
              className="wd-select w-100 py-1.5"
              style={{ fontSize: '12px' }}
            >
              <option value="ALL">{t('shifts.all_shift_types', '-- Loại Ca --')}</option>
              <option value="MORNING">{t('shifts.morning', 'Ca Sáng')}</option>
              <option value="AFTERNOON">{t('shifts.afternoon', 'Ca Chiều')}</option>
              <option value="NIGHT">{t('shifts.night', 'Ca Đêm')}</option>
              <option value="ON_CALL">{t('shifts.on_call', 'Trực Thường Trú')}</option>
              <option value="EMERGENCY_COVER">{t('shifts.emergency', 'Trực Tăng Cường')}</option>
            </select>
          </Col>
        </Row>
      </div>

      {/* Shifts Table */}
      <div className="wd-card">
        <div className="wd-card-header">
          <span className="wd-card-title">{t('shifts.roster_title', 'Danh Sách Kíp Thường Trực Bệnh Viện')}</span>
          <div className="d-flex align-items-center gap-3">
            <Link to="/briefings" className="text-decoration-none small d-flex align-items-center gap-1 text-primary fw-medium" style={{ fontSize: '12px' }}>
              <span>{t('shifts.view_briefing_book', 'Xem Sổ Giao Ban')}</span>
              <ChevronRight size={13} />
            </Link>
            <Link to="/handovers" className="text-decoration-none small d-flex align-items-center gap-1 text-primary fw-medium" style={{ fontSize: '12px' }}>
              <span>{t('shifts.view_handover_book', 'Xem Sổ Giao Ca')}</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
        <div className="table-responsive">
          <table className="wd-table">
            <thead>
              <tr>
                <th>{t('shifts.th_staff', 'CÁN BỘ Y TẾ')}</th>
                <th>{t('shifts.th_tier_team', 'CẤP THƯỜNG TRỰC & KÍP')}</th>
                <th>{t('shifts.th_department', 'KHOA PHÒNG PHÂN BỔ')}</th>
                <th>{t('shifts.th_shift_type', 'LOẠI CA TRỰC')}</th>
                <th>{t('shifts.th_time_window', 'KHUNG GIỜ TRỰC')}</th>
                <th>{t('shifts.th_handover_policy', 'QUY CHẾ BÀN GIAO')}</th>
                <th>{t('common.status', 'TRẠNG THÁI')}</th>
                <th className="text-end">{t('common.actions', 'THAO TÁC')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredShifts.map((shift) => (
                <tr key={shift.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="wd-avatar-sm">
                        {shift.staff_name.split(' ').slice(-1)[0]?.[0] || 'A'}
                      </div>
                      <div>
                        <div className="fw-semibold text-dark">{shift.staff_name}</div>
                        <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                          {shift.staff_id} &bull; {shift.role}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-column gap-1">
                      <div>{getTierBadge(shift.on_call_tier)}</div>
                      <div className="d-flex align-items-center gap-1">
                        {getTeamBadge(shift.team_code)}
                        {shift.is_24h_on_call && (
                          <span className="badge bg-warning text-dark px-1.5 py-0.5" style={{ fontSize: '10px' }}>
                            24/24h
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-1.5 text-dark" style={{ fontSize: '12px' }}>
                      <Building2 size={13} className="text-muted" />
                      <span>{shift.department_name}</span>
                    </div>
                  </td>
                  <td>{getShiftBadge(shift.shift_type)}</td>
                  <td>
                    <div className="font-mono text-dark fw-medium" style={{ fontSize: '12px' }}>
                      {shift.start_time?.slice(11, 16)} – {shift.end_time?.slice(11, 16)}
                    </div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>
                      {shift.start_time?.slice(0, 10)}
                    </div>
                  </td>
                  <td>
                    {shift.requires_handover ? (
                      <span className="wd-badge-warning">
                        {t('shifts.handover_required', 'Bắt Buộc Ký Sổ Giao Ca')}
                      </span>
                    ) : (
                      <span className="wd-badge-neutral">{t('shifts.standard_shift', 'Ca Tiêu Chuẩn')}</span>
                    )}
                  </td>
                  <td>{getStatusBadge(shift.status)}</td>
                  <td className="text-end">
                    <Link
                      to="/attendance"
                      className="wd-pill-btn-outline text-decoration-none"
                      style={{ fontSize: '11px', padding: '3px 10px' }}
                    >
                      <Clock size={12} />
                      <span>{t('shifts.clock_btn', 'Chấm Công')}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Shift Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Form onSubmit={handleCreateShift}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('shifts.modal_assign_title', 'Phân Bổ Kíp Trực Bệnh Viện')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Row className="g-3 mb-3">
              <Col md={6}>
                <label className="wd-label">{t('shifts.modal_staff_label', 'Cán Bộ Y Tế Nhận Ca')} *</label>
                <select
                  aria-label={t('shifts.modal_staff_label', 'Cán Bộ Y Tế Nhận Ca')}
                  value={newStaffCode}
                  onChange={(e) => setNewStaffCode(e.target.value)}
                  className="wd-select w-100"
                >
                  {serverEmployees && serverEmployees.length > 0 ? (
                    serverEmployees.map((emp: any) => (
                      <option key={emp.employee_code} value={emp.employee_code}>
                        {emp.first_name} {emp.last_name} &bull; {emp.role}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="EMP-DOC-001">{t('staff.emp_doc_001', 'BS.CKII Alexander Wright')}</option>
                      <option value="EMP-DOC-002">{t('staff.emp_doc_002', 'ThS.BS Elena Rostova')}</option>
                      <option value="EMP-NUR-001">{t('staff.emp_nur_001', 'ĐD. Sarah Jenkins')}</option>
                    </>
                  )}
                </select>
              </Col>

              <Col md={6}>
                <label className="wd-label">{t('shifts.department_select', 'Khoa Phòng Phân Bổ')} *</label>
                <select
                  aria-label={t('shifts.department_select', 'Khoa Phòng Phân Bổ')}
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  className="wd-select w-100"
                >
                  {serverDepartments.map((dept) => (
                    <option key={dept.department_code} value={dept.department_code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col md={4}>
                <label className="wd-label">{t('shifts.modal_tier_label', 'Cấp Thường Trực')} *</label>
                <select
                  aria-label={t('shifts.modal_tier_label', 'Cấp Thường Trực')}
                  value={newOnCallTier}
                  onChange={(e) => setNewOnCallTier(e.target.value as OnCallTier)}
                  className="wd-select w-100"
                >
                  <option value="LEADERSHIP">🏛️ {t('shifts.level_1', 'Trực Lãnh Đạo')}</option>
                  <option value="CLINICAL">🩺 {t('shifts.level_2', 'Trực Lâm Sàng')}</option>
                  <option value="PARACLINICAL">🔬 {t('shifts.level_3', 'Trực Cận Lâm Sàng')}</option>
                  <option value="LOGISTICS">📦 {t('shifts.level_4', 'Trực Hậu Cần')}</option>
                </select>
              </Col>

              <Col md={4}>
                <label className="wd-label">{t('shifts.modal_team_label', 'Kíp Trực Luân Phiên')} *</label>
                <select
                  aria-label={t('shifts.modal_team_label', 'Kíp Trực Luân Phiên')}
                  value={newTeamCode}
                  onChange={(e) => setNewTeamCode(e.target.value as TeamCode)}
                  className="wd-select w-100"
                >
                  <option value="TEAM_A">{t('team.team_a', 'Kíp A')}</option>
                  <option value="TEAM_B">{t('team.team_b', 'Kíp B')}</option>
                  <option value="TEAM_C">{t('team.team_c', 'Kíp C')}</option>
                  <option value="TEAM_D">{t('team.team_d', 'Kíp D')}</option>
                  <option value="GENERAL">{t('shifts.team_general', 'Kíp Chung')}</option>
                </select>
              </Col>

              <Col md={4}>
                <label className="wd-label">{t('shifts.modal_type_label', 'Loại Ca Trực')} *</label>
                <select
                  aria-label={t('shifts.modal_type_label', 'Loại Ca Trực')}
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="wd-select w-100"
                >
                  <option value="MORNING">{t('shifts.morning', 'Ca Sáng')}</option>
                  <option value="AFTERNOON">{t('shifts.afternoon', 'Ca Chiều')}</option>
                  <option value="NIGHT">{t('shifts.night', 'Ca Đêm')}</option>
                  <option value="ON_CALL">{t('shifts.on_call', 'Trực Thường Trú')}</option>
                  <option value="EMERGENCY_COVER">{t('shifts.emergency', 'Trực Tăng Cường')}</option>
                </select>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <label className="wd-label">{t('shifts.modal_start_time', 'Thời Gian Bắt Đầu')}</label>
                <input
                  type="text"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm:ss"
                  className="wd-input w-100 font-mono"
                />
              </Col>
              <Col xs={6}>
                <label className="wd-label">{t('shifts.modal_end_time', 'Thời Gian Kết Thúc')}</label>
                <input
                  type="text"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm:ss"
                  className="wd-input w-100 font-mono"
                />
              </Col>
            </Row>

            <div className="p-3 rounded-2 border bg-light mb-3">
              <Form.Check
                type="checkbox"
                id="is-24h-check"
                label={t('shifts.modal_is_24h_label', 'Ca trực 24/24 giờ')}
                checked={newIs24hOnCall}
                onChange={(e) => setNewIs24hOnCall(e.target.checked)}
                className="small fw-semibold text-dark mb-2"
              />

              <Form.Check
                type="checkbox"
                id="handover-check"
                label={t('shifts.modal_handover_req_label', 'Bắt buộc thực hiện bàn giao ca và ghi sổ trực khoa phòng')}
                checked={newRequiresHandover}
                onChange={(e) => setNewRequiresHandover(e.target.checked)}
                className="small fw-semibold text-dark"
              />
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowModal(false)}
            >
              {t('common.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={createShiftMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {createShiftMutation.isPending ? t('common.processing', 'Đang xử lý...') : t('shifts.modal_confirm_btn', 'Xác Nhận Phân Ca Trực')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ShiftRostering;
