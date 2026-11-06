import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  PhoneCall,
  PhoneOff,
  CheckCircle,
  Clock,
  ShieldAlert,
  Activity,
  Award,
  FileText,
  XCircle,
  PhoneForwarded,
  Building2,
  UserCheck
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';
import {
  surgeDispatchApi,
  AlertLevel,
  CallOutcome,
  SurgeDispatchSession
} from '../api/surgeDispatchApi';

interface SurgeDispatchModalProps {
  show: boolean;
  onHide: () => void;
  departmentCode: string;
  departmentName?: string;
  onSuccess?: () => void;
}

export const SurgeDispatchModal: React.FC<SurgeDispatchModalProps> = ({
  show,
  onHide,
  departmentCode,
  departmentName,
  onSuccess
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Quyền điều phối toàn viện (Ban Giám Đốc / Phòng Nhân Sự - KHTH) vs Quyền Trưởng Khoa (Chỉ điều động nội bộ khoa)
  const isHospitalCoordinator =
    user?.role === 'SUPER_ADMIN' || user?.role === 'HR_MANAGER';
  const enforcedDeptCode =
    !isHospitalCoordinator && user?.department_code
      ? user.department_code
      : departmentCode && departmentCode !== 'ALL'
        ? departmentCode
        : 'DEP-CC-HSTC';

  // Department & Form State
  const [targetDeptCode, setTargetDeptCode] = useState<string>(enforcedDeptCode);
  const [alertLevel, setAlertLevel] = useState<AlertLevel>('LEVEL_1_SURGE');
  const [reason, setReason] = useState<string>(
    'Bổ sung nhân lực trực tăng cường & bù đắp thiếu hụt ca trực lâm sàng'
  );
  const [staffType, setStaffType] = useState<'ANY' | 'DOCTOR' | 'NURSE'>('ANY');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<SurgeDispatchSession | null>(null);

  // Resolution State
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolutionNotes, setResolutionNotes] = useState<string>(
    'Đã hoàn tất điều động tăng cường & bù đắp nhân lực, tình hình khoa phòng ổn định.'
  );

  // Notification / Alert states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isHospitalCoordinator && user?.department_code) {
      setTargetDeptCode(user.department_code);
      setAlertLevel('LEVEL_1_SURGE');
    } else if (departmentCode && departmentCode !== 'ALL') {
      setTargetDeptCode(departmentCode);
    }
  }, [departmentCode, isHospitalCoordinator, user?.department_code]);

  // 0. Fetch Departments list so coordinator can switch target department
  const { data: departmentsList = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments');
      return res.data?.data || [];
    },
    enabled: show
  });

  // 1. Check for existing active dispatch session for target department
  const { data: activeDispatches } = useQuery({
    queryKey: ['activeSurgeDispatches', targetDeptCode],
    queryFn: () => surgeDispatchApi.getActiveDispatches(targetDeptCode),
    enabled: show && !!targetDeptCode
  });

  useEffect(() => {
    if (activeDispatches && activeDispatches.length > 0) {
      setActiveSession(activeDispatches[0]);
    } else {
      setActiveSession(null);
    }
  }, [activeDispatches]);

  // 2. Fetch candidates recommendation pool (Mức 1: chỉ lấy nhân sự thuộc đúng khoa; Mức 2 / Code Red: mở rộng liên khoa)
  const {
    data: candidatesData,
    isLoading: isCandidatesLoading
  } = useQuery({
    queryKey: ['surgeCandidates', targetDeptCode, staffType, alertLevel],
    queryFn: () =>
      surgeDispatchApi.getCandidates(
        targetDeptCode,
        staffType === 'ANY' ? undefined : staffType,
        alertLevel
      ),
    enabled: show && !!targetDeptCode && !activeSession
  });

  const candidateList = candidatesData?.candidates || candidatesData?.top_candidates || [];
  const excludedList = candidatesData?.excluded_candidates || [];

  // Default selection to candidate rank #1 when department or list changes
  useEffect(() => {
    if (candidateList.length > 0) {
      const stillExists = candidateList.some((c) => c.staff_id === selectedCandidateId);
      if (!selectedCandidateId || !stillExists) {
        setSelectedCandidateId(candidateList[0].staff_id);
      }
    } else {
      setSelectedCandidateId('');
    }
  }, [candidateList, selectedCandidateId]);

  // 3. Mutation: Create Surge Dispatch
  const createDispatchMutation = useMutation({
    mutationFn: (payload: {
      department_code: string;
      alert_level: AlertLevel;
      reason: string;
      staff_type?: 'DOCTOR' | 'NURSE' | 'ANY';
      selected_candidate_id?: string;
    }) => surgeDispatchApi.createDispatch(payload),
    onSuccess: (data) => {
      setActiveSession(data);
      setSuccessMessage(t('shifts.surge_dispatch_success'));
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['activeSurgeDispatches'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || err.message || 'Không thể khởi tạo phiên điều động';
      setErrorMessage(msg);
      setSuccessMessage(null);
    }
  });

  // 4. Mutation: Log Call Result & Auto-Fallback
  const logCallMutation = useMutation({
    mutationFn: (payload: { dispatchId: string; outcome: CallOutcome }) =>
      surgeDispatchApi.logCallResult(payload.dispatchId, {
        call_outcome: payload.outcome,
        call_result: payload.outcome
      }),
    onSuccess: (data, variables) => {
      if (data) {
        setActiveSession(data);
      }
      setSuccessMessage(
        variables.outcome === 'UNREACHABLE' || variables.outcome === 'REJECTED'
          ? t('shifts.surge_candidate_promoted_msg')
          : `${t('shifts.surge_call_logged')} Đã tự động đồng bộ ca trực tăng cường lên Lịch công tác.`
      );
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['activeSurgeDispatches'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || err.message || 'Lỗi ghi nhận kết quả cuộc gọi điều phối';
      setErrorMessage(msg);
    }
  });

  // 5. Mutation: Resolve Surge Dispatch
  const resolveMutation = useMutation({
    mutationFn: (payload: { dispatchId: string; notes: string }) =>
      surgeDispatchApi.resolveDispatch(payload.dispatchId, {
        resolution_notes: payload.notes
      }),
    onSuccess: () => {
      setActiveSession(null);
      setIsResolving(false);
      setSuccessMessage(t('shifts.surge_resolved_success'));
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['activeSurgeDispatches'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || err.message || 'Lỗi kết thúc phiên điều động';
      setErrorMessage(msg);
    }
  });

  const handleStartDispatch = () => {
    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do điều động tăng cường / bù đắp nhân lực');
      return;
    }
    setErrorMessage(null);
    createDispatchMutation.mutate({
      department_code: targetDeptCode,
      alert_level: alertLevel,
      reason: reason.trim(),
      staff_type: staffType,
      selected_candidate_id: selectedCandidateId || undefined
    });
  };

  const handleLogCall = (outcome: CallOutcome) => {
    if (!activeSession) return;
    const sessionId = activeSession.dispatch_id || activeSession.id;
    if (!sessionId) return;
    logCallMutation.mutate({
      dispatchId: sessionId,
      outcome
    });
  };

  const handleConfirmResolve = () => {
    if (!activeSession) return;
    const sessionId = activeSession.dispatch_id || activeSession.id;
    if (!sessionId) return;
    resolveMutation.mutate({
      dispatchId: sessionId,
      notes: resolutionNotes
    });
  };

  const getAlertLevelBadge = (level: AlertLevel) => {
    switch (level) {
      case 'CODE_RED':
        return <Badge bg="danger" className="px-2 py-1 fs-7">CODE RED - BÁO ĐỘNG ĐỎ</Badge>;
      case 'LEVEL_2_DISASTER':
        return (
          <Badge bg="warning" text="dark" className="px-2 py-1 fs-7">
            MỨC 2 - KHẨN CẤP LIÊN KHOA
          </Badge>
        );
      case 'LEVEL_1_SURGE':
      default:
        return (
          <Badge bg="primary" className="px-2 py-1 fs-7">
            MỨC 1 - TĂNG CƯỜNG & BÙ ĐẮP CA
          </Badge>
        );
    }
  };

  const getResponseStatusBadge = (status: string, etaMinutes?: number) => {
    switch (status) {
      case 'ACCEPTED':
      case 'ACCEPTED_15M':
      case 'ACCEPTED_30M': {
        const is30m = status === 'ACCEPTED_30M' || etaMinutes === 30;
        return (
          <Badge bg="success" className="px-2 py-1 d-inline-flex align-items-center gap-1">
            <CheckCircle size={13} />{' '}
            {is30m ? t('shifts.surge_resp_accepted_30m') : t('shifts.surge_resp_accepted_15m')}
          </Badge>
        );
      }
      case 'UNREACHABLE':
        return (
          <Badge
            bg="warning"
            text="dark"
            className="px-2 py-1 d-inline-flex align-items-center gap-1"
          >
            <PhoneOff size={13} /> {t('shifts.surge_resp_unreachable')}
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge bg="danger" className="px-2 py-1 d-inline-flex align-items-center gap-1">
            <XCircle size={13} /> {t('shifts.surge_resp_rejected')}
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge bg="secondary" className="px-2 py-1 d-inline-flex align-items-center gap-1">
            <Clock size={13} /> {t('shifts.surge_resp_pending')}
          </Badge>
        );
    }
  };

  const selectedDeptObj = departmentsList.find(
    (d: any) => d.department_code === targetDeptCode
  );
  const displayDeptName =
    selectedDeptObj?.name || departmentName || targetDeptCode;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton className="bg-danger text-white border-0 py-3">
        <Modal.Title className="fs-6 fw-bold d-flex align-items-center gap-2">
          <ShieldAlert size={20} className="text-warning" />
          <span>{t('shifts.surge_title')}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3 bg-light">
        {/* Alerts / Error feedback */}
        {errorMessage && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setErrorMessage(null)}
            className="py-2 px-3 fs-7 mb-3"
          >
            <div className="d-flex align-items-center gap-2">
              <AlertTriangle size={16} className="text-danger flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </Alert>
        )}

        {successMessage && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSuccessMessage(null)}
            className="py-2 px-3 fs-7 mb-3"
          >
            <div className="d-flex align-items-center gap-2">
              <CheckCircle size={16} className="text-success flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          </Alert>
        )}

        {/* ======================= ACTIVE DISPATCH COCKPIT ======================= */}
        {activeSession ? (
          <div className="bg-white rounded-3 p-3 border shadow-sm">
            <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-danger text-white px-2 py-1 text-uppercase fw-bold">
                    PHIÊN ĐANG KÍCH HOẠT:{' '}
                    {(activeSession.dispatch_id || activeSession.id || '').slice(0, 8)}
                  </span>
                  {getAlertLevelBadge(activeSession.alert_level)}
                </div>
                <h6 className="fw-bold mb-0 text-dark">
                  {activeSession.department_name || activeSession.department_code} —{' '}
                  {activeSession.reason}
                </h6>
              </div>
              <div className="text-end">
                <span className="text-muted fs-8 d-block">Thời điểm phát lệnh:</span>
                <span className="fw-semibold fs-7 text-dark">
                  {activeSession.created_at
                    ? new Date(activeSession.created_at).toLocaleTimeString('vi-VN')
                    : 'Vừa xong'}
                </span>
              </div>
            </div>

            {/* Calling Card & Action Buttons */}
            <div className="card border-danger mb-3 bg-danger-subtle">
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fs-7 text-danger fw-bold d-flex align-items-center gap-1.5">
                    <Activity size={16} className="text-danger" />
                    {t('shifts.surge_calling_candidate')}
                  </span>
                  {getResponseStatusBadge(
                    activeSession.response_status,
                    activeSession.estimated_arrival_minutes
                  )}
                </div>

                <div className="row g-2 align-items-center mb-3 bg-white p-2.5 rounded-2 border">
                  <div className="col-md-7">
                    <h5 className="fw-bold text-dark mb-1">
                      {activeSession.responder_name ||
                        activeSession.selected_staff_id ||
                        'Cán bộ trực thường trú'}
                    </h5>
                    <div className="fs-7 text-muted">
                      <span>Mã: {activeSession.selected_staff_id}</span>
                      <span className="mx-2">•</span>
                      <span>
                        Chức danh:{' '}
                        {activeSession.responder_specialty ||
                          activeSession.responder_role ||
                          'Bác sĩ lâm sàng'}
                      </span>
                      {activeSession.suitability_score ? (
                        <>
                          <span className="mx-2">•</span>
                          <span className="text-primary fw-semibold">
                            Điểm phù hợp: {activeSession.suitability_score}/100
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="col-md-5 text-md-end">
                    <span className="text-muted fs-8 d-block mb-1">
                      Kênh 1 — Gọi điện điều phối trực tiếp:
                    </span>
                    <a
                      href={`tel:${activeSession.phone_contact || '0908123456'}`}
                      className="btn btn-sm btn-danger fw-bold px-3 py-1.5 d-inline-flex align-items-center gap-2 shadow-sm text-decoration-none"
                    >
                      <PhoneCall size={16} />
                      <span>{activeSession.phone_contact || '0908123456'}</span>
                    </a>
                  </div>
                </div>

                {/* Confirmed Banner if responder already accepted */}
                {(activeSession.response_status === 'ACCEPTED' ||
                  activeSession.response_status === 'ACCEPTED_15M' ||
                  activeSession.response_status === 'ACCEPTED_30M') && (
                  <div className="p-2.5 mb-3 rounded-2 bg-success-subtle border border-success text-success-emphasis fs-7 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <UserCheck size={18} className="text-success flex-shrink-0" />
                      <div>
                        <strong className="d-block">
                          Đã xác nhận nhận lệnh — Dự kiến có mặt trong{' '}
                          {activeSession.estimated_arrival_minutes || 15} phút
                        </strong>
                        <span className="fs-8">
                          Hệ thống đã tự động kích hoạt ca trực tăng cường (EMERGENCY_ACTIVE) trên
                          Lịch công tác Google Calendar và sẵn sàng chờ cán bộ chấm công vào ca.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dispatcher Cockpit 1-Touch Logging Buttons */}
                <div className="bg-white p-2.5 rounded-2 border">
                  <label className="form-label fw-bold fs-7 text-dark mb-2 d-flex align-items-center gap-1.5">
                    <PhoneForwarded size={15} className="text-primary" />
                    <span>{t('shifts.surge_call_cockpit_title')}</span>
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      className="d-inline-flex align-items-center gap-1.5 fw-semibold"
                      disabled={logCallMutation.isPending}
                      onClick={() => handleLogCall('ACCEPTED_15M')}
                    >
                      <CheckCircle size={15} />
                      <span>{t('shifts.surge_action_accept_15m')}</span>
                    </Button>

                    <Button
                      variant="info"
                      size="sm"
                      className="text-white d-inline-flex align-items-center gap-1.5 fw-semibold"
                      disabled={logCallMutation.isPending}
                      onClick={() => handleLogCall('ACCEPTED_30M')}
                    >
                      <Clock size={15} />
                      <span>{t('shifts.surge_action_accept_30m')}</span>
                    </Button>

                    <Button
                      variant="warning"
                      size="sm"
                      className="d-inline-flex align-items-center gap-1.5 fw-semibold"
                      disabled={logCallMutation.isPending}
                      onClick={() => handleLogCall('UNREACHABLE')}
                    >
                      <PhoneOff size={15} />
                      <span>{t('shifts.surge_action_unreachable')}</span>
                    </Button>

                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="d-inline-flex align-items-center gap-1.5"
                      disabled={logCallMutation.isPending}
                      onClick={() => handleLogCall('REJECTED')}
                    >
                      <XCircle size={15} />
                      <span>{t('shifts.surge_action_reject')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Queue Snapshot */}
            {Array.isArray(activeSession.candidates_snapshot) &&
              activeSession.candidates_snapshot.length > 0 && (
                <div className="mb-3 border rounded-2 p-2.5 bg-light">
                  <div className="fw-bold fs-8 text-uppercase text-muted mb-2">
                    Danh sách thứ tự ưu tiên dự phòng trong phiên (Auto-Fallback Queue):
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {activeSession.candidates_snapshot.map((cand: any, idx: number) => {
                      const isCurrent = cand.staff_id === activeSession.selected_staff_id;
                      const callStatus = cand.call_status || (isCurrent ? 'CALLING' : 'STANDBY');
                      let badgeClass = 'bg-white text-dark border';
                      if (callStatus === 'ACCEPTED' || (isCurrent && activeSession.response_status === 'ACCEPTED')) {
                        badgeClass = 'bg-success text-white';
                      } else if (callStatus === 'UNREACHABLE' || callStatus === 'REJECTED') {
                        badgeClass = 'bg-secondary-subtle text-muted text-decoration-line-through border';
                      } else if (isCurrent) {
                        badgeClass = 'bg-danger text-white';
                      }
                      return (
                        <div
                          key={cand.staff_id || idx}
                          className={`px-2.5 py-1 rounded-2 fs-8 fw-semibold d-inline-flex align-items-center gap-1.5 ${badgeClass}`}
                        >
                          <span>#{cand.rank || cand.rank_order || idx + 1}</span>
                          <span>{cand.full_name || cand.staff_name || cand.staff_id}</span>
                          <span className="opacity-75">({cand.phone_contact || '0908123456'})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Legal Notice Box under QĐ 73/2011/QĐ-TTg */}
            <div className="p-2.5 rounded-2 bg-light border text-muted fs-8 mb-3">
              <span className="fw-bold text-dark d-block mb-1">
                Quy chế điều động tăng cường & Bù đắp nhân lực (QĐ 1895/QĐ-BYT & QĐ 73/2011/QĐ-TTg):
              </span>
              <span>
                Kênh 1 (Tổng đài viên gọi điện trực tiếp) là kênh xác nhận chính thức; Kênh 2 (Thông
                báo nội bộ trên hệ thống) hiển thị đồng thời cho cán bộ được gọi. Ngay khi xác nhận
                hoặc quét thẻ Chấm công (Clock-in), ca trực tự động chuyển sang{' '}
                <strong>EMERGENCY_ACTIVE</strong> và tính phụ cấp trực tăng cường theo quy định.
              </span>
            </div>

            {/* Resolve Dispatch Accordion / Controls */}
            {!isResolving ? (
              <div className="d-flex justify-content-between align-items-center">
                <Button variant="secondary" size="sm" onClick={onHide}>
                  Đóng cửa sổ (Giữ phiên chạy ngầm)
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  className="d-inline-flex align-items-center gap-1.5 fw-semibold"
                  onClick={() => setIsResolving(true)}
                >
                  <FileText size={15} />
                  <span>{t('shifts.surge_resolve_btn')}</span>
                </Button>
              </div>
            ) : (
              <div className="p-3 border rounded-2 bg-light">
                <h6 className="fw-bold text-dark fs-7 mb-2 d-flex align-items-center gap-1.5">
                  <CheckCircle size={16} className="text-success" />
                  <span>{t('shifts.surge_resolve_title')}</span>
                </h6>
                <Form.Group className="mb-2">
                  <Form.Label className="fs-8 fw-semibold text-muted">
                    {t('shifts.surge_resolve_notes_label')}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    size="sm"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </Form.Group>
                <div className="d-flex justify-content-end gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsResolving(false)}
                    disabled={resolveMutation.isPending}
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    className="fw-bold d-inline-flex align-items-center gap-1.5"
                    onClick={handleConfirmResolve}
                    disabled={resolveMutation.isPending}
                  >
                    <CheckCircle size={15} />
                    <span>{t('shifts.surge_resolve_confirm')}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ======================= PRE-DISPATCH CONFIGURATION ======================= */
          <div className="bg-white rounded-3 p-3 border shadow-sm">
            <p className="text-muted fs-7 mb-3">{t('shifts.surge_subtitle')}</p>

            {/* Target Department, Alert Level & Staff Type Selector */}
            <div className="row g-2 mb-3">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="fw-bold fs-7 text-dark d-flex align-items-center gap-1">
                    <Building2 size={14} className="text-danger" />
                    <span>Khoa Cần Điều Động</span>
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={targetDeptCode}
                    disabled={!isHospitalCoordinator}
                    onChange={(e) => {
                      setTargetDeptCode(e.target.value);
                      setSelectedCandidateId('');
                    }}
                    className="fw-semibold"
                  >
                    {departmentsList.length > 0 ? (
                      departmentsList.map((dept: any) => (
                        <option key={dept.department_code} value={dept.department_code}>
                          {dept.name} ({dept.department_code})
                        </option>
                      ))
                    ) : (
                      <option value={targetDeptCode}>{displayDeptName}</option>
                    )}
                  </Form.Select>
                  {!isHospitalCoordinator && (
                    <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                      Trưởng khoa chỉ điều động nhân sự thuộc khoa mình.
                    </div>
                  )}
                </Form.Group>
              </div>

              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="fw-bold fs-7 text-dark">Mức Độ & Phạm Vi Điều Động</Form.Label>
                  <Form.Select
                    size="sm"
                    value={alertLevel}
                    onChange={(e) => {
                      setAlertLevel(e.target.value as AlertLevel);
                      setSelectedCandidateId('');
                    }}
                    className="fw-semibold"
                  >
                    <option value="LEVEL_1_SURGE">{t('shifts.surge_level_level_1')}</option>
                    {isHospitalCoordinator && (
                      <>
                        <option value="LEVEL_2_DISASTER">{t('shifts.surge_level_level_2')}</option>
                        <option value="CODE_RED">{t('shifts.surge_level_code_red')}</option>
                      </>
                    )}
                  </Form.Select>
                  <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                    {alertLevel === 'LEVEL_1_SURGE'
                      ? 'Phạm vi: Chỉ điều động bác sĩ / điều dưỡng nội bộ khoa.'
                      : 'Phạm vi cấp Viện: Cho phép huy động chi viện liên chuyên khoa.'}
                  </div>
                </Form.Group>
              </div>

              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="fw-bold fs-7 text-dark">
                    {t('shifts.surge_staff_type_label')}
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={staffType}
                    onChange={(e) => {
                      setStaffType(e.target.value as 'ANY' | 'DOCTOR' | 'NURSE');
                      setSelectedCandidateId('');
                    }}
                  >
                    <option value="ANY">{t('shifts.surge_staff_type_all')}</option>
                    <option value="DOCTOR">{t('shifts.surge_staff_type_doctor')}</option>
                    <option value="NURSE">{t('shifts.surge_staff_type_nurse')}</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            {/* Reason Textarea */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold fs-7 text-dark">
                {t('shifts.surge_reason_label')}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                size="sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('shifts.surge_reason_placeholder')}
              />
            </Form.Group>

            {/* Candidates Recommendation Pool */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold fs-7 text-dark mb-0 d-flex align-items-center gap-1.5">
                  <Award size={16} className="text-warning" />
                  <span>{t('shifts.surge_candidates_top3')}</span>
                </h6>
                <span className="fs-8 text-muted">
                  Khoa nhận chi viện: <strong>{displayDeptName}</strong>
                </span>
              </div>

              {isCandidatesLoading ? (
                <div className="text-center py-4 text-muted fs-7">
                  <Activity size={20} className="spinner-border spinner-border-sm me-2" />
                  Đang quét và tính điểm đa mục tiêu lực lượng trực thường trú...
                </div>
              ) : candidateList.length > 0 ? (
                <div className="table-responsive border rounded-2">
                  <table
                    className="table table-hover table-sm align-middle mb-0"
                    style={{ fontSize: '13px' }}
                  >
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '40px' }} className="text-center">
                          Chọn
                        </th>
                        <th>{t('shifts.surge_candidate_staff')}</th>
                        <th>{t('shifts.surge_candidate_specialty')}</th>
                        <th>{t('shifts.surge_candidate_phone')}</th>
                        <th className="text-center">{t('shifts.surge_candidate_eta')}</th>
                        <th className="text-center">{t('shifts.surge_candidate_score')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidateList.map((cand) => {
                        const displayName = cand.full_name || cand.staff_name || cand.staff_id;
                        const eta = cand.eta_minutes ?? cand.estimated_arrival_minutes ?? 15;
                        return (
                          <tr
                            key={cand.staff_id}
                            className={
                              selectedCandidateId === cand.staff_id ? 'table-primary' : ''
                            }
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedCandidateId(cand.staff_id)}
                          >
                            <td className="text-center">
                              <Form.Check
                                type="radio"
                                name="surgeCandidateRadio"
                                checked={selectedCandidateId === cand.staff_id}
                                onChange={() => setSelectedCandidateId(cand.staff_id)}
                              />
                            </td>
                            <td>
                              <div className="fw-bold text-dark d-flex align-items-center flex-wrap gap-1.5">
                                <span>{displayName}</span>
                                {cand.is_cross_department ? (
                                  <span className="badge bg-warning text-dark border border-warning fs-8">
                                    Chi viện từ: {cand.department_name || cand.department_code}
                                  </span>
                                ) : (
                                  <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle fs-8">
                                    Nhân sự tại khoa
                                  </span>
                                )}
                                {cand.has_on_call_today && (
                                  <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle fs-8">
                                    Đang trực thường trú
                                  </span>
                                )}
                              </div>
                              <span className="text-muted fs-8">
                                {cand.staff_id} • {cand.job_title || cand.role}
                              </span>
                            </td>
                            <td>
                              <div className="text-dark fw-semibold">
                                {cand.specialty || 'Lâm sàng cấp cứu'}
                              </div>
                              <span className="badge bg-success-subtle text-success border border-success-subtle fs-8">
                                CCHN: {cand.license_number || 'Đã xác thực'}
                              </span>
                            </td>
                            <td>
                              <span className="fw-semibold text-dark">{cand.phone_contact}</span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-light text-dark border fw-semibold">
                                ~{eta} phút
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-primary px-2 py-1 fs-7">
                                {cand.suitability_score} / 100
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center rounded-2 bg-light border text-muted fs-7">
                  <AlertTriangle size={20} className="text-warning mb-1 d-block mx-auto" />
                  <span>{t('shifts.surge_no_candidates')}</span>
                </div>
              )}

              {/* Excluded candidates transparency notice */}
              {excludedList.length > 0 && (
                <div className="mt-2 p-2 rounded-2 bg-warning-subtle border border-warning-subtle fs-8 text-dark">
                  <strong>
                    Đã tự động loại trừ {excludedList.length} nhân sự để bảo vệ an toàn người bệnh:
                  </strong>{' '}
                  {excludedList.slice(0, 2).map((ex, i) => (
                    <span key={ex.staff_id}>
                      {i > 0 ? '; ' : ''}
                      {ex.staff_name} ({ex.exclusion_reason})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Launch Button */}
            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <Button variant="secondary" size="sm" onClick={onHide}>
                Đóng
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="fw-bold d-inline-flex align-items-center gap-2 shadow-sm"
                disabled={createDispatchMutation.isPending || !selectedCandidateId}
                onClick={handleStartDispatch}
              >
                <ShieldAlert size={16} />
                <span>{t('shifts.surge_dispatch_confirm_btn')}</span>
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default SurgeDispatchModal;
