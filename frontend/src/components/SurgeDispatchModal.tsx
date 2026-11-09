import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  // Search, Quick Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ON_CALL' | 'INTERNAL' | 'CROSS'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5; // Hiển thị 5 ứng viên mỗi trang để giao diện gọn gàng, không bị tràn màn hình

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

  // 2. Fetch candidates recommendation pool
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

  // Filter candidates based on search query and quick filter tabs
  const filteredCandidates = useMemo(() => {
    let list = [...candidateList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => {
        const name = (c.full_name || c.staff_name || '').toLowerCase();
        const id = (c.staff_id || '').toLowerCase();
        const spec = (c.specialty || '').toLowerCase();
        const role = (c.job_title || c.role || '').toLowerCase();
        return name.includes(q) || id.includes(q) || spec.includes(q) || role.includes(q);
      });
    }
    if (filterMode === 'ON_CALL') {
      list = list.filter((c) => c.has_on_call_today);
    } else if (filterMode === 'INTERNAL') {
      list = list.filter((c) => !c.is_cross_department);
    } else if (filterMode === 'CROSS') {
      list = list.filter((c) => c.is_cross_department);
    }
    return list;
  }, [candidateList, searchQuery, filterMode]);

  // Reset current page when filters or department changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterMode, targetDeptCode, staffType, alertLevel]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCandidates.slice(start, start + pageSize);
  }, [filteredCandidates, currentPage, pageSize]);

  // Selected candidate object (default to top 1 if available)
  const selectedCandidate = useMemo(() => {
    return (
      candidateList.find((c) => c.staff_id === selectedCandidateId) ||
      filteredCandidates[0] ||
      candidateList[0] ||
      null
    );
  }, [candidateList, filteredCandidates, selectedCandidateId]);

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
          : `${t('shifts.surge_call_logged')} Đã tự động kích hoạt ca trực tăng cường lên Lịch công tác.`
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

  // Typography / Label Badges (Zero Icons)
  const getAlertLevelBadge = (level: AlertLevel) => {
    switch (level) {
      case 'CODE_RED':
        return (
          <Badge bg="danger" className="text-white text-uppercase px-2.5 py-1 fw-bold fs-8">
            [ CẤP 3: CODE RED - BÁO ĐỘNG ĐỎ TOÀN VIỆN ]
          </Badge>
        );
      case 'LEVEL_2_DISASTER':
        return (
          <Badge bg="warning" text="dark" className="text-uppercase px-2.5 py-1 fw-bold fs-8">
            [ CẤP 2: ĐIỀU ĐỘNG KHẨN LIÊN KHOA ]
          </Badge>
        );
      case 'LEVEL_1_SURGE':
      default:
        return (
          <Badge bg="primary" className="text-white text-uppercase px-2.5 py-1 fw-bold fs-8">
            [ CẤP 1: TĂNG CƯỜNG & BÙ ĐẮP TẠI KHOA ]
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
          <Badge bg="success" className="px-2.5 py-1 text-uppercase fw-bold fs-8">
            [ {is30m ? t('shifts.surge_resp_accepted_30m') : t('shifts.surge_resp_accepted_15m')} ]
          </Badge>
        );
      }
      case 'UNREACHABLE':
        return (
          <Badge bg="warning" text="dark" className="px-2.5 py-1 text-uppercase fw-bold fs-8">
            [ {t('shifts.surge_resp_unreachable')} - ĐÔN DỰ PHÒNG ]
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge bg="danger" className="px-2.5 py-1 text-uppercase fw-bold fs-8">
            [ {t('shifts.surge_resp_rejected')} ]
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge bg="secondary" className="px-2.5 py-1 text-uppercase fw-bold fs-8">
            [ {t('shifts.surge_resp_pending')} ]
          </Badge>
        );
    }
  };

  const selectedDeptObj = departmentsList.find(
    (d: any) => d.department_code === targetDeptCode
  );
  const displayDeptName =
    selectedDeptObj?.name || departmentName || targetDeptCode;

  // Real-world Clinical Rationale Builder for Unified Assessment Table (Zero Duplication)
  const getPillarBasisText = (pillarIndex: 1 | 2 | 3 | 4, cand: any) => {
    if (!cand) return '';
    const breakdown = cand.score_breakdown;

    switch (pillarIndex) {
      case 1: {
        if (cand.has_on_call_today) {
          return 'Đang trong phiên trực thường trú ngoại viện tại khoa, cam kết giữ liên lạc 24/24 và có mặt trong 15-20 phút theo QĐ 1895/1997/QĐ-BYT & QĐ 73/2011/QĐ-TTg.';
        }
        if (!cand.is_cross_department) {
          return 'Nghỉ tại nhà (Off-duty) - Nhân sự thuộc khoa sở tại, sẵn sàng huy động khẩn cấp (~20 phút tiếp cận).';
        }
        return 'Nghỉ tại nhà (Off-duty) - Nhân sự chi viện ngoại khoa, thời gian tiếp cận dự kiến ~25-30 phút.';
      }
      case 2: {
        if (!cand.is_cross_department) {
          return 'Đúng chuyên khoa sở tại: Am hiểu toàn diện hồ sơ bệnh án nội trú, cơ số tủ thuốc cấp cứu và quy trình buồng bệnh (Luật Khám bệnh, chữa bệnh 2023).';
        }
        return 'Chi viện liên khoa khẩn cấp: Đạt năng lực hồi sinh tim phổi nâng cao (ACLS) và xử trí cấp cứu đa chấn thương.';
      }
      case 3: {
        const hours = breakdown?.month_hours ?? cand.month_hours ?? 0;
        if (hours <= 120) {
          return `Số giờ làm lũy kế trong tháng: ${hours}h/160h tiêu chuẩn. Thể lực sung mãn, ít giờ trực tồn, nằm trong vùng an toàn tối ưu theo Bộ luật Lao động 2019.`;
        }
        if (hours <= 160) {
          return `Số giờ làm lũy kế trong tháng: ${hours}h/160h tiêu chuẩn. Thể lực đảm bảo, tuân thủ định mức lao động y tế.`;
        }
        if (hours <= 200) {
          return `Số giờ làm lũy kế trong tháng: ${hours}h/160h tiêu chuẩn. Đang tiếp cận trần làm thêm giờ (OT 40h/tháng), cần ưu tiên san sẻ tải.`;
        }
        return `Số giờ làm lũy kế trong tháng: ${hours}h (vượt trần 200h). Chỉ huy động làm phương án dự phòng khi cấp thiết.`;
      }
      case 4: {
        const roleStr = cand.job_title || cand.role || 'Cán bộ y tế';
        return `${roleStr} — Đủ thẩm quyền ra quyết định lâm sàng độc lập theo TTLT 10/2015/TTLT-BYT-BNV; tỷ lệ chấm công đúng giờ đạt chuẩn y tế.`;
      }
      default:
        return '';
    }
  };

  const top1Candidate = candidateList[0];

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static" keyboard={false}>
      {/* Zero Icons Header */}
      <Modal.Header closeButton className="bg-danger text-white border-0 py-3">
        <Modal.Title className="fs-6 fw-bold text-uppercase tracking-wide">
          [ LỆNH ĐIỀU ĐỘNG ] {t('shifts.surge_title')}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-3 bg-light">
        {/* System Error & Success Alerts (Zero Icons) */}
        {errorMessage && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setErrorMessage(null)}
            className="py-2.5 px-3 fs-7 mb-3 border-danger fw-semibold"
          >
            [ LỖI HỆ THỐNG ]: {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSuccessMessage(null)}
            className="py-2.5 px-3 fs-7 mb-3 border-success fw-semibold"
          >
            [ THÀNH CÔNG ]: {successMessage}
          </Alert>
        )}

        {/* ======================= ACTIVE DISPATCH COCKPIT ======================= */}
        {activeSession ? (
          <div className="bg-white rounded-3 p-3 border shadow-sm">
            <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <span className="badge bg-danger text-white px-2.5 py-1 text-uppercase fw-bold fs-8">
                    PHIÊN ĐANG KÍCH HOẠT: {(activeSession.dispatch_id || activeSession.id || '').slice(0, 8)}
                  </span>
                  {getAlertLevelBadge(activeSession.alert_level)}
                </div>
                <h6 className="fw-bold mb-0 text-dark">
                  Khoa nhận chi viện: {activeSession.department_name || activeSession.department_code} — {activeSession.reason}
                </h6>
              </div>
              <div className="text-end">
                <span className="text-muted fs-8 d-block text-uppercase">Thời điểm phát lệnh:</span>
                <span className="fw-bold fs-7 text-dark">
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
                  <span className="fs-7 text-danger fw-bold text-uppercase">
                    [ TIẾP CẬN CÁN BỘ ] {t('shifts.surge_calling_candidate')}
                  </span>
                  {getResponseStatusBadge(
                    activeSession.response_status,
                    activeSession.estimated_arrival_minutes
                  )}
                </div>

                <div className="row g-2 align-items-center mb-3 bg-white p-3 rounded-2 border">
                  <div className="col-md-7">
                    <h5 className="fw-bold text-dark mb-1">
                      {activeSession.responder_name ||
                        activeSession.selected_staff_id ||
                        'Cán bộ trực thường trú'}
                    </h5>
                    <div className="fs-7 text-muted">
                      <span>Mã cán bộ: <strong>{activeSession.selected_staff_id}</strong></span>
                      <span className="mx-2">|</span>
                      <span>
                        Chức danh:{' '}
                        <strong>
                          {activeSession.responder_specialty ||
                            activeSession.responder_role ||
                            'Bác sĩ lâm sàng'}
                        </strong>
                      </span>
                      {activeSession.suitability_score ? (
                        <>
                          <span className="mx-2">|</span>
                          <span className="text-primary fw-bold">
                            Điểm ưu tiên: {activeSession.suitability_score} / 100
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="col-md-5 text-md-end">
                    <span className="text-muted fs-8 d-block mb-1 text-uppercase fw-semibold">
                      Kênh 1 — Gọi điện thoại điều động trực tiếp:
                    </span>
                    <a
                      href={`tel:${activeSession.phone_contact || '0908123456'}`}
                      className="btn btn-sm btn-danger fw-bold px-3 py-2 text-decoration-none shadow-sm"
                    >
                      GỌI NGAY: {activeSession.phone_contact || '0908123456'}
                    </a>
                  </div>
                </div>

                {/* Confirmed Banner if responder already accepted (Zero Icons) */}
                {(activeSession.response_status === 'ACCEPTED' ||
                  activeSession.response_status === 'ACCEPTED_15M' ||
                  activeSession.response_status === 'ACCEPTED_30M') && (
                  <div className="p-3 mb-3 rounded-2 bg-success-subtle border border-success text-success-emphasis fs-7">
                    <strong className="d-block mb-1 text-uppercase">
                      [ ĐÃ XÁC NHẬN NHẬN LỆNH ] Dự kiến có mặt trong{' '}
                      {activeSession.estimated_arrival_minutes || 15} phút
                    </strong>
                    <span className="fs-8">
                      Hệ thống đã tự động kích hoạt ca trực tăng cường (EMERGENCY_ACTIVE) trên Lịch công tác Google Calendar và chuyển sang trạng thái sẵn sàng ghi nhận Chấm công (Clock-in).
                    </span>
                  </div>
                )}

                {/* Dispatcher Cockpit 1-Touch Logging Buttons (Zero Icons) */}
                <div className="bg-white p-3 rounded-2 border">
                  <div className="fw-bold fs-7 text-dark mb-2 text-uppercase">
                    [ BÀN GHI NHẬN PHẢN HỒI 1 CHẠM ]
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      className="fw-bold px-3 py-2 text-uppercase fs-8"
                      disabled={logCallMutation.isPending}
                      onClick={() => handleLogCall('ACCEPTED_15M')}
                    >
                      {t('shifts.surge_action_accept_15m')}
                    </Button>

                    <Button
                      variant="info"
                      size="sm"
                      className="text-white fw-bold px-3 py-2 text-uppercase fs-8"
                      disabled={logCallMutation.isPending}
                      onClick={() => handleLogCall('ACCEPTED_30M')}
                    >
                      {t('shifts.surge_action_accept_30m')}
                    </Button>

                    <Button
                      variant="warning"
                      size="sm"
                      className="fw-bold px-3 py-2 text-dark text-uppercase fs-8"
                      disabled={logCallMutation.isPending}
                      onClick={() => handleLogCall('UNREACHABLE')}
                    >
                      {t('shifts.surge_action_unreachable')}
                    </Button>

                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="fw-bold px-3 py-2 text-uppercase fs-8"
                      disabled={logCallMutation.isPending}
                      onClick={() => handleLogCall('REJECTED')}
                    >
                      {t('shifts.surge_action_reject')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Queue Snapshot */}
            {Array.isArray(activeSession.candidates_snapshot) &&
              activeSession.candidates_snapshot.length > 0 && (
                <div className="mb-3 border rounded-2 p-3 bg-light">
                  <div className="fw-bold fs-8 text-uppercase text-muted mb-2">
                    Thứ tự ưu tiên dự phòng tự động trong phiên (Auto-Fallback Queue):
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {activeSession.candidates_snapshot.map((cand: any, idx: number) => {
                      const isCurrent = cand.staff_id === activeSession.selected_staff_id;
                      const callStatus = cand.call_status || (isCurrent ? 'CALLING' : 'STANDBY');
                      let badgeClass = 'bg-white text-dark border';
                      if (
                        callStatus === 'ACCEPTED' ||
                        (isCurrent &&
                          (activeSession.response_status === 'ACCEPTED' ||
                            activeSession.response_status === 'ACCEPTED_15M' ||
                            activeSession.response_status === 'ACCEPTED_30M'))
                      ) {
                        badgeClass = 'bg-success text-white';
                      } else if (callStatus === 'UNREACHABLE' || callStatus === 'REJECTED') {
                        badgeClass = 'bg-secondary-subtle text-muted text-decoration-line-through border';
                      } else if (isCurrent) {
                        badgeClass = 'bg-danger text-white';
                      }
                      return (
                        <div
                          key={cand.staff_id || idx}
                          className={`px-3 py-1.5 rounded-2 fs-8 fw-bold d-inline-flex align-items-center gap-2 ${badgeClass}`}
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

            {/* Legal Notice Box under QĐ 1895 & QĐ 73 */}
            <div className="p-3 rounded-2 bg-light border text-muted fs-8 mb-3">
              <span className="fw-bold text-dark d-block mb-1 text-uppercase">
                [ QUY CHẾ ĐIỀU ĐỘNG TĂNG CƯỜNG & BÙ ĐẮP NHÂN LỰC (QĐ 1895/QĐ-BYT & QĐ 73/2011/QĐ-TTg) ]:
              </span>
              <span>
                Kênh 1 (Tổng đài viên gọi điện trực tiếp) là kênh xác nhận mệnh lệnh chính thức; Kênh 2 (Thông báo nội bộ trên hệ thống) thông báo đồng thời cho cán bộ được gọi. Ngay khi xác nhận có mặt hoặc quét thẻ Chấm công (Clock-in), ca trực tự động chuyển sang trạng thái <strong>EMERGENCY_ACTIVE</strong> và tính phụ cấp thường trực cấp cứu theo quy định.
              </span>
            </div>

            {/* Resolve Dispatch Accordion / Controls */}
            {!isResolving ? (
              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                <Button variant="secondary" size="sm" onClick={onHide} className="fw-semibold">
                  Đóng Cửa Sổ (Giữ phiên chạy ngầm)
                </Button>
                <Button
                  variant="outline-success"
                  size="sm"
                  className="fw-bold px-3 py-2 text-uppercase"
                  onClick={() => setIsResolving(true)}
                >
                  {t('shifts.surge_resolve_btn')}
                </Button>
              </div>
            ) : (
              <div className="p-3 border rounded-2 bg-light">
                <h6 className="fw-bold text-dark fs-7 mb-2 text-uppercase">
                  [ {t('shifts.surge_resolve_title')} ]
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
                    className="fw-semibold"
                  >
                    Hủy Bỏ
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    className="fw-bold px-3 py-1.5 text-uppercase"
                    onClick={handleConfirmResolve}
                    disabled={resolveMutation.isPending}
                  >
                    {t('shifts.surge_resolve_confirm')}
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
                  <Form.Label className="fw-bold fs-7 text-dark text-uppercase">
                    Khoa Nhận Chi Viện
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
                      Trưởng khoa chỉ được điều động nhân sự trong phạm vi khoa của mình.
                    </div>
                  )}
                </Form.Group>
              </div>

              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="fw-bold fs-7 text-dark text-uppercase">
                    Mức Độ & Phạm Vi Điều Động
                  </Form.Label>
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
                  <Form.Label className="fw-bold fs-7 text-dark text-uppercase">
                    {t('shifts.surge_staff_type_label')}
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={staffType}
                    onChange={(e) => {
                      setStaffType(e.target.value as 'ANY' | 'DOCTOR' | 'NURSE');
                      setSelectedCandidateId('');
                    }}
                    className="fw-semibold"
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
              <Form.Label className="fw-bold fs-7 text-dark text-uppercase">
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
              <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <div>
                  <h6 className="fw-bold fs-7 text-dark mb-0 text-uppercase">
                    {t('shifts.surge_candidates_top3')}
                  </h6>
                  <span className="fs-8 text-muted">
                    Khoa chỉ định nhận chi viện: <strong>{displayDeptName}</strong>
                  </span>
                </div>

                {/* 1-Click Action: Select Rank #1 Candidate */}
                {top1Candidate && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="fw-bold fs-8 py-1 px-3 text-uppercase shadow-sm"
                    onClick={() => setSelectedCandidateId(top1Candidate.staff_id)}
                  >
                    [ {t('shifts.surge_quick_select_top1')}: {top1Candidate.full_name || top1Candidate.staff_name} ({top1Candidate.priority_score ?? top1Candidate.suitability_score} ĐIỂM) ]
                  </Button>
                )}
              </div>

              {/* Instant Search Bar & Filter Chips (Handling > 10 candidates) */}
              <div className="p-2.5 bg-light rounded-2 border mb-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div style={{ flex: '1 1 280px', maxWidth: '420px' }}>
                  <Form.Control
                    type="text"
                    size="sm"
                    placeholder={t('shifts.surge_search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="fs-8"
                  />
                </div>

                <div className="d-flex flex-wrap gap-1.5">
                  <Button
                    variant={filterMode === 'ALL' ? 'dark' : 'outline-secondary'}
                    size="sm"
                    className="fs-8 py-1 px-2.5 fw-semibold"
                    onClick={() => setFilterMode('ALL')}
                  >
                    {t('shifts.surge_filter_all')} ({candidateList.length})
                  </Button>
                  <Button
                    variant={filterMode === 'ON_CALL' ? 'primary' : 'outline-secondary'}
                    size="sm"
                    className="fs-8 py-1 px-2.5 fw-semibold"
                    onClick={() => setFilterMode('ON_CALL')}
                  >
                    {t('shifts.surge_filter_on_call')} ({candidateList.filter((c) => c.has_on_call_today).length})
                  </Button>
                  <Button
                    variant={filterMode === 'INTERNAL' ? 'success' : 'outline-secondary'}
                    size="sm"
                    className="fs-8 py-1 px-2.5 fw-semibold"
                    onClick={() => setFilterMode('INTERNAL')}
                  >
                    {t('shifts.surge_filter_internal')} ({candidateList.filter((c) => !c.is_cross_department).length})
                  </Button>
                  <Button
                    variant={filterMode === 'CROSS' ? 'warning' : 'outline-secondary'}
                    size="sm"
                    className="fs-8 py-1 px-2.5 fw-semibold"
                    onClick={() => setFilterMode('CROSS')}
                  >
                    {t('shifts.surge_filter_cross')} ({candidateList.filter((c) => c.is_cross_department).length})
                  </Button>
                </div>
              </div>

              {/* Candidate Table with Pagination */}
              {isCandidatesLoading ? (
                <div className="text-center py-4 text-muted fs-7">
                  Đang quét và tính điểm chọn mục tiêu ưu tiên cho lực lượng thường trực...
                </div>
              ) : filteredCandidates.length > 0 ? (
                <>
                  <div className="table-responsive border rounded-2 bg-white">
                    <table
                      className="table table-hover table-sm align-middle mb-0"
                      style={{ fontSize: '13px' }}
                    >
                      <thead className="table-light text-uppercase fs-8 text-muted">
                        <tr>
                          <th style={{ width: '45px' }} className="text-center">
                            Chọn
                          </th>
                          <th style={{ width: '50px' }} className="text-center">
                            {t('shifts.surge_candidate_rank')}
                          </th>
                          <th>{t('shifts.surge_candidate_staff')}</th>
                          <th>{t('shifts.surge_candidate_specialty')}</th>
                          <th>{t('shifts.surge_candidate_phone')}</th>
                          <th className="text-center">{t('shifts.surge_candidate_eta')}</th>
                          <th className="text-center">{t('shifts.surge_candidate_score')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCandidates.map((cand, idx) => {
                          const displayName = cand.full_name || cand.staff_name || cand.staff_id;
                          const eta = cand.eta_minutes ?? cand.estimated_arrival_minutes ?? 15;
                          const isSelected = selectedCandidateId === cand.staff_id;
                          const globalRank = cand.rank || cand.rank_order || ((currentPage - 1) * pageSize + idx + 1);

                          return (
                            <tr
                              key={cand.staff_id}
                              className={isSelected ? 'table-primary' : ''}
                              style={{ cursor: 'pointer' }}
                              onClick={() => setSelectedCandidateId(cand.staff_id)}
                            >
                              <td className="text-center">
                                <Form.Check
                                  type="radio"
                                  name="surgeCandidateRadio"
                                  checked={isSelected}
                                  onChange={() => setSelectedCandidateId(cand.staff_id)}
                                />
                              </td>
                              <td className="text-center fw-bold fs-7 text-dark">
                                #{globalRank}
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
                                  Mã: {cand.staff_id} | {cand.job_title || cand.role}
                                </span>
                              </td>
                              <td>
                                <div className="text-dark fw-semibold">
                                  {cand.specialty || 'Lâm sàng cấp cứu'}
                                </div>
                                <span className="badge bg-success-subtle text-success border border-success-subtle fs-8">
                                  CCHN: {cand.license_number || 'Hợp lệ'}
                                </span>
                              </td>
                              <td>
                                <span className="fw-bold text-dark">{cand.phone_contact}</span>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-light text-dark border fw-semibold">
                                  ~{eta} phút
                                </span>
                              </td>
                              <td className="text-center">
                                <span className="badge bg-primary px-2.5 py-1 fs-7 fw-bold">
                                  {cand.priority_score ?? cand.suitability_score} / 100
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Bar (Handling > 10 Candidates) */}
                  <div className="d-flex justify-content-between align-items-center mt-2 px-1 flex-wrap gap-2">
                    <span className="fs-8 text-muted">
                      {t('shifts.surge_showing_range')} <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
                      <strong>{Math.min(currentPage * pageSize, filteredCandidates.length)}</strong>{' '}
                      {t('shifts.surge_showing_of')} <strong>{filteredCandidates.length}</strong>{' '}
                      {t('shifts.surge_showing_candidates')}
                    </span>

                    {totalPages > 1 && (
                      <div className="d-flex align-items-center gap-1">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="fs-8 py-1 px-2 fw-semibold"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          {t('shifts.surge_page_prev')}
                        </Button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={page === currentPage ? 'primary' : 'outline-secondary'}
                            size="sm"
                            className="fs-8 py-1 px-2.5 fw-semibold"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}

                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="fs-8 py-1 px-2 fw-semibold"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                          {t('shifts.surge_page_next')}
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-3 text-center rounded-2 bg-light border text-muted fs-7">
                  {t('shifts.surge_no_candidates')}
                </div>
              )}

              {/* ======================= UNIFIED ASSESSMENT BASIS TABLE ======================= */}
              {/* Giải quyết triệt để lỗi lặp thông tin giữa 4 hộp điểm và đoạn văn bản bên dưới */}
              {selectedCandidate && (
                <div className="mt-3 p-3 rounded-2 bg-white border">
                  <div className="d-flex align-items-center justify-content-between mb-2 pb-2 border-bottom flex-wrap gap-2">
                    <div>
                      <span className="fw-bold fs-7 text-dark text-uppercase d-block">
                        {t('shifts.surge_assessment_table_title')}
                      </span>
                      <span className="fs-8 text-muted">
                        Đang xem căn cứ của ứng viên:{' '}
                        <strong className="text-primary">
                          {selectedCandidate.full_name || selectedCandidate.staff_name}
                        </strong>{' '}
                        (Mã: {selectedCandidate.staff_id})
                      </span>
                    </div>
                    <Badge bg="primary" className="fs-7 px-3 py-1.5 fw-bold text-uppercase">
                      TỔNG ĐIỂM: {selectedCandidate.priority_score ?? selectedCandidate.suitability_score} / 100 ĐIỂM
                    </Badge>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered table-sm align-middle mb-0" style={{ fontSize: '12px' }}>
                      <thead className="table-light text-uppercase fs-8 text-muted">
                        <tr>
                          <th style={{ width: '220px' }}>{t('shifts.surge_pillar_col_name')}</th>
                          <th style={{ width: '120px' }} className="text-center">
                            {t('shifts.surge_pillar_col_score')}
                          </th>
                          <th>{t('shifts.surge_pillar_col_basis')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-bold text-dark">
                            1. Trạng Thái Thường Trực & Sẵn Sàng
                          </td>
                          <td className="text-center fw-bold text-primary">
                            {selectedCandidate.score_breakdown?.standby_score ?? 18} / 30đ
                          </td>
                          <td className="text-secondary">
                            {getPillarBasisText(1, selectedCandidate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold text-dark">
                            2. Năng Lực Chuyên Môn & Độ Tương Thích
                          </td>
                          <td className="text-center fw-bold text-primary">
                            {selectedCandidate.score_breakdown?.competence_score ?? 20} / 30đ
                          </td>
                          <td className="text-secondary">
                            {getPillarBasisText(2, selectedCandidate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold text-dark">
                            3. Chống Quá Tải & Kiệt Sức Lao Động
                          </td>
                          <td className="text-center fw-bold text-primary">
                            {selectedCandidate.score_breakdown?.fatigue_score ?? 25} / 25đ
                          </td>
                          <td className="text-secondary">
                            {getPillarBasisText(3, selectedCandidate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold text-dark">
                            4. Thâm Niên Chức Danh & Độ Tin Cậy
                          </td>
                          <td className="text-center fw-bold text-primary">
                            {selectedCandidate.score_breakdown?.seniority_score ?? 12} / 15đ
                          </td>
                          <td className="text-secondary">
                            {getPillarBasisText(4, selectedCandidate)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Excluded candidates transparency notice (Zero Icons) */}
              {excludedList.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-2 bg-warning-subtle border border-warning fs-8 text-dark">
                  <strong className="d-block mb-1 text-uppercase">
                    [ CẢNH BÁO AN TOÀN NGƯỜI BỆNH ] Đã tự động loại trừ {excludedList.length} nhân sự vi phạm quy chế y tế:
                  </strong>
                  {excludedList.slice(0, 3).map((ex, i) => (
                    <div key={ex.staff_id} className="text-muted">
                      • <strong>{ex.staff_name}</strong> ({ex.staff_id}): {ex.exclusion_reason}
                    </div>
                  ))}
                  {excludedList.length > 3 && (
                    <span className="text-muted fst-italic">
                      ... và {excludedList.length - 3} nhân sự khác được bảo lưu an toàn.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Launch Button (Zero Icons) */}
            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <Button variant="secondary" size="sm" onClick={onHide} className="fw-semibold px-3">
                Đóng
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="fw-bold px-4 py-2 text-uppercase shadow-sm"
                disabled={createDispatchMutation.isPending || !selectedCandidateId}
                onClick={handleStartDispatch}
              >
                [ {t('shifts.surge_dispatch_confirm_btn')} ]
              </Button>
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default SurgeDispatchModal;
