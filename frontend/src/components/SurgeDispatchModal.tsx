import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  PhoneCall,
  PhoneOff,
  CheckCircle,
  Clock,
  UserCheck,
  ShieldAlert,
  Users,
  Activity,
  Award,
  ArrowRight,
  FileText,
  XCircle,
  PhoneForwarded
} from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import {
  surgeDispatchApi,
  AlertLevel,
  CallOutcome,
  SurgeCandidate,
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

  // Form State
  const [alertLevel, setAlertLevel] = useState<AlertLevel>('LEVEL_1_SURGE');
  const [reason, setReason] = useState<string>('Quá tải cấp cứu khẩn cấp / Cần tăng cường nhân lực trực thường trú');
  const [staffType, setStaffType] = useState<'ANY' | 'DOCTOR' | 'NURSE'>('ANY');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<SurgeDispatchSession | null>(null);

  // Resolution State
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolutionNotes, setResolutionNotes] = useState<string>('Tình hình cấp cứu tại khoa đã ổn định.');

  // Notification / Alert states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Check for existing active dispatch session
  const { data: activeDispatches, refetch: refetchActive } = useQuery({
    queryKey: ['activeSurgeDispatches', departmentCode],
    queryFn: () => surgeDispatchApi.getActiveDispatches(departmentCode),
    enabled: show && !!departmentCode
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
    isLoading: isCandidatesLoading,
    refetch: refetchCandidates
  } = useQuery({
    queryKey: ['surgeCandidates', departmentCode, staffType],
    queryFn: () => surgeDispatchApi.getCandidates(departmentCode, staffType === 'ANY' ? undefined : staffType),
    enabled: show && !!departmentCode && !activeSession
  });

  // Default selection to candidate rank #1
  useEffect(() => {
    if (candidatesData?.candidates && candidatesData.candidates.length > 0 && !selectedCandidateId) {
      setSelectedCandidateId(candidatesData.candidates[0].staff_id);
    }
  }, [candidatesData, selectedCandidateId]);

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
      const msg = err.response?.data?.message || err.message || 'Không thể tạo phiên điều động';
      setErrorMessage(msg);
      setSuccessMessage(null);
    }
  });

  // 4. Mutation: Log Call Result & Auto-Fallback
  const logCallMutation = useMutation({
    mutationFn: (payload: { dispatchId: string; outcome: CallOutcome }) =>
      surgeDispatchApi.logCallResult(payload.dispatchId, { call_outcome: payload.outcome }),
    onSuccess: (data, variables) => {
      setActiveSession(data);
      setSuccessMessage(
        variables.outcome === 'UNREACHABLE'
          ? t('shifts.surge_candidate_promoted_msg')
          : t('shifts.surge_call_logged')
      );
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['activeSurgeDispatches'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Lỗi ghi nhận cuộc gọi';
      setErrorMessage(msg);
    }
  });

  // 5. Mutation: Resolve Surge Dispatch
  const resolveMutation = useMutation({
    mutationFn: (payload: { dispatchId: string; notes: string }) =>
      surgeDispatchApi.resolveDispatch(payload.dispatchId, { resolution_notes: payload.notes }),
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
      const msg = err.response?.data?.message || err.message || 'Lỗi kết thúc phiên báo động';
      setErrorMessage(msg);
    }
  });

  const handleStartDispatch = () => {
    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do chuyên môn / tình huống cấp cứu');
      return;
    }
    setErrorMessage(null);
    createDispatchMutation.mutate({
      department_code: departmentCode,
      alert_level: alertLevel,
      reason: reason.trim(),
      staff_type: staffType,
      selected_candidate_id: selectedCandidateId || undefined
    });
  };

  const handleLogCall = (outcome: CallOutcome) => {
    if (!activeSession) return;
    logCallMutation.mutate({
      dispatchId: activeSession.dispatch_id,
      outcome
    });
  };

  const handleConfirmResolve = () => {
    if (!activeSession) return;
    resolveMutation.mutate({
      dispatchId: activeSession.dispatch_id,
      notes: resolutionNotes
    });
  };

  const getAlertLevelBadge = (level: AlertLevel) => {
    switch (level) {
      case 'CODE_RED':
        return <Badge bg="danger" className="px-2 py-1 fs-7">CODE RED - BÁO ĐỘNG ĐỎ</Badge>;
      case 'LEVEL_2_DISASTER':
        return <Badge bg="warning" text="dark" className="px-2 py-1 fs-7">MỨC 2 - THẢM HỌA</Badge>;
      case 'LEVEL_1_SURGE':
      default:
        return <Badge bg="primary" className="px-2 py-1 fs-7">MỨC 1 - QUÁ TẢI CỤC BỘ</Badge>;
    }
  };

  const getResponseStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED_15M':
        return (
          <Badge bg="success" className="px-2 py-1 d-inline-flex align-items-center gap-1">
            <CheckCircle size={13} /> {t('shifts.surge_resp_accepted_15m')}
          </Badge>
        );
      case 'ACCEPTED_30M':
        return (
          <Badge bg="info" className="px-2 py-1 d-inline-flex align-items-center gap-1">
            <Clock size={13} /> {t('shifts.surge_resp_accepted_30m')}
          </Badge>
        );
      case 'UNREACHABLE':
        return (
          <Badge bg="warning" text="dark" className="px-2 py-1 d-inline-flex align-items-center gap-1">
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
          <Alert variant="danger" dismissible onClose={() => setErrorMessage(null)} className="py-2 px-3 fs-7 mb-3">
            <div className="d-flex align-items-center gap-2">
              <AlertTriangle size={16} className="text-danger flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="py-2 px-3 fs-7 mb-3">
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
                    PHIÊN ĐANG KÍCH HOẠT: {activeSession.dispatch_id}
                  </span>
                  {getAlertLevelBadge(activeSession.alert_level)}
                </div>
                <h6 className="fw-bold mb-0 text-dark">
                  {activeSession.department_name || activeSession.department_code} - {activeSession.reason}
                </h6>
              </div>
              <div className="text-end">
                <span className="text-muted fs-8 d-block">Thời điểm phát lệnh:</span>
                <span className="fw-semibold fs-7 text-dark">
                  {new Date(activeSession.created_at).toLocaleTimeString('vi-VN')}
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
                  {getResponseStatusBadge(activeSession.response_status)}
                </div>

                <div className="row g-2 align-items-center mb-3 bg-white p-2.5 rounded-2 border">
                  <div className="col-md-7">
                    <h5 className="fw-bold text-dark mb-1">
                      {activeSession.responder_name || 'Bác sĩ trực thường trú'}
                    </h5>
                    <div className="fs-7 text-muted">
                      <span>Mã: {activeSession.selected_staff_id}</span>
                      <span className="mx-2">•</span>
                      <span>Chức vụ: {activeSession.responder_role || 'Bác sĩ'}</span>
                    </div>
                  </div>
                  <div className="col-md-5 text-md-end">
                    <span className="text-muted fs-8 d-block mb-1">Đường dây nóng khẩn cấp:</span>
                    <a
                      href={`tel:${activeSession.phone_contact || '0988123456'}`}
                      className="btn btn-sm btn-danger fw-bold px-3 py-1.5 d-inline-flex align-items-center gap-2 shadow-sm text-decoration-none"
                    >
                      <PhoneCall size={16} />
                      <span>{activeSession.phone_contact || '0988 123 456'}</span>
                    </a>
                  </div>
                </div>

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

            {/* Legal Notice Box under QĐ 73/2011/QĐ-TTg */}
            <div className="p-2.5 rounded-2 bg-light border text-muted fs-8 mb-3">
              <span className="fw-bold text-dark d-block mb-1">
                Quy chế thường trực & Bù đắp phụ cấp (QĐ 1895/QĐ-BYT & QĐ 73/2011/QĐ-TTg):
              </span>
              <span>
                Khi cán bộ trực thường trú ngoại viện quét thẻ Chấm công (Clock-in) tại bệnh viện, hệ thống sẽ tự động
                chuyển đổi trạng thái ca trực từ <strong>ON_CALL</strong> sang <strong>EMERGENCY_ACTIVE</strong> và hạch toán
                chế độ phụ cấp cấp cứu và tính giờ làm thêm khẩn cấp lũy tiến theo quy định.
              </span>
            </div>

            {/* Resolve Dispatch Accordion / Controls */}
            {!isResolving ? (
              <div className="d-flex justify-content-end">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="d-inline-flex align-items-center gap-1.5"
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

            {/* Alert Level Selector */}
            <div className="row g-2 mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-bold fs-7 text-dark">Mức Độ Khẩn Cấp</Form.Label>
                  <Form.Select
                    size="sm"
                    value={alertLevel}
                    onChange={(e) => setAlertLevel(e.target.value as AlertLevel)}
                    className="fw-semibold"
                  >
                    <option value="LEVEL_1_SURGE">{t('shifts.surge_level_level_1')}</option>
                    <option value="LEVEL_2_DISASTER">{t('shifts.surge_level_level_2')}</option>
                    <option value="CODE_RED">{t('shifts.surge_level_code_red')}</option>
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="fw-bold fs-7 text-dark">{t('shifts.surge_staff_type_label')}</Form.Label>
                  <Form.Select
                    size="sm"
                    value={staffType}
                    onChange={(e) => setStaffType(e.target.value as 'ANY' | 'DOCTOR' | 'NURSE')}
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
              <Form.Label className="fw-bold fs-7 text-dark">{t('shifts.surge_reason_label')}</Form.Label>
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
                  Khoa: <strong>{departmentName || departmentCode}</strong>
                </span>
              </div>

              {isCandidatesLoading ? (
                <div className="text-center py-4 text-muted fs-7">
                  <Activity size={20} className="spinner-border spinner-border-sm me-2" />
                  Đang quét và tính điểm đa mục tiêu lực lượng trực thường trú...
                </div>
              ) : candidatesData?.candidates && candidatesData.candidates.length > 0 ? (
                <div className="table-responsive border rounded-2">
                  <table className="table table-hover table-sm align-middle mb-0" style={{ fontSize: '13px' }}>
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '40px' }} className="text-center">Chọn</th>
                        <th>{t('shifts.surge_candidate_staff')}</th>
                        <th>{t('shifts.surge_candidate_specialty')}</th>
                        <th>{t('shifts.surge_candidate_phone')}</th>
                        <th className="text-center">{t('shifts.surge_candidate_eta')}</th>
                        <th className="text-center">{t('shifts.surge_candidate_score')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatesData.candidates.map((cand) => (
                        <tr
                          key={cand.staff_id}
                          className={selectedCandidateId === cand.staff_id ? 'table-primary' : ''}
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
                            <div className="fw-bold text-dark">{cand.full_name}</div>
                            <span className="text-muted fs-8">{cand.staff_id} • {cand.job_title || cand.role}</span>
                          </td>
                          <td>
                            <div className="text-dark fw-semibold">{cand.specialty || 'Hồi Sức Cấp Cứu'}</div>
                            <span className="badge bg-success-subtle text-success border border-success-subtle fs-8">
                              CCHN: {cand.license_number || 'Đầy đủ'}
                            </span>
                          </td>
                          <td>
                            <span className="fw-semibold text-dark">{cand.phone_contact}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-light text-dark border fw-semibold">
                              ~{cand.eta_minutes} phút
                            </span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-primary px-2 py-1 fs-7">
                              {cand.suitability_score} / 100
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center rounded-2 bg-light border text-muted fs-7">
                  <AlertTriangle size={20} className="text-warning mb-1 d-block mx-auto" />
                  <span>{t('shifts.surge_no_candidates')}</span>
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
