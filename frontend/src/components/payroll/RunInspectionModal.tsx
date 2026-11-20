import React, { useState } from 'react';
import { Modal, Row, Col, Alert } from 'react-bootstrap';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Lock,
  Landmark
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../../api/payrollApi';
import { exportTimesheetsToCsv, exportBankDisbursementToCsv } from '../../utils/payrollCsv';
import { TheoryOfNextLoader } from '../common/TheoryOfNextLoader';

interface RunInspectionModalProps {
  runId: string | null;
  onHide: () => void;
  canApprove: boolean;
  onOpenImport: (runId: string) => void;
  onStatusUpdated: (message: string) => void;
}

export const RunInspectionModal: React.FC<RunInspectionModalProps> = ({
  runId,
  onHide,
  canApprove,
  onOpenImport,
  onStatusUpdated
}) => {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bankWarning, setBankWarning] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingBank, setExportingBank] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['runSlips', runId],
    queryFn: () => payrollApi.getRunSlips(runId!),
    enabled: Boolean(runId),
    staleTime: 10000
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => payrollApi.updateRunStatus(runId!, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['runSlips', runId] });
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      setErrorMsg(null);
      onStatusUpdated(`Đã cập nhật trạng thái đợt lương ${runId} thành ${updated?.status}.`);
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || err.message || 'Không thể cập nhật trạng thái.');
    }
  });

  const handleExportTimesheets = async () => {
    if (!runId) return;
    try {
      setExporting(true);
      setErrorMsg(null);
      const exportData = await payrollApi.exportTimesheets(runId);
      exportTimesheetsToCsv(exportData);
      onStatusUpdated(`Đã xuất bảng tổng hợp công, trực đêm, vượt trực & KPI cho Kế toán (${exportData?.count || 0} nhân sự).`);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'Lỗi khi xuất bảng công.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportBankDisbursement = async () => {
    if (!runId) return;
    try {
      setExportingBank(true);
      setErrorMsg(null);
      setBankWarning(null);
      const disbursement = await payrollApi.getBankDisbursement(runId);
      exportBankDisbursementToCsv(disbursement);
      const missingCount = disbursement?.summary?.missing_bank_count || 0;
      if (missingCount > 0) {
        setBankWarning(
          `Lưu ý: Có ${missingCount} nhân sự trong danh sách chuyển khoản chưa khai báo tài khoản ngân hàng chính (cột account_number đang trống).`
        );
      }
      onStatusUpdated(
        `Đã xuất file Ủy nhiệm chi ngân hàng (${disbursement?.summary?.ready_count || 0}/${disbursement?.summary?.total_slips || 0} nhân sự đủ STK).`
      );
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err.message || 'Lỗi khi xuất danh sách chuyển khoản ngân hàng.');
    } finally {
      setExportingBank(false);
    }
  };

  const formatVnd = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  const run = data?.run;
  const summary = data?.summary;
  const slips: any[] = data?.slips || [];
  const isLocked = run && ['APPROVED', 'COMPLETED', 'CANCELLED'].includes(run.status);

  return (
    <Modal show={Boolean(runId)} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
        <div className="d-flex align-items-center gap-2">
          <FileSpreadsheet size={20} style={{ color: 'var(--wd-blue)' }} />
          <div>
            <Modal.Title className="fw-bold fs-6 text-dark mb-0">
              Kiểm Tra & Đối Soát Đợt Quyết Toán Lương
            </Modal.Title>
            <div className="text-muted font-mono" style={{ fontSize: '11px' }}>
              {run ? `${run.id} (${run.start_date} – ${run.end_date}) • Trạng thái: ${run.status}` : runId}
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {errorMsg && (
          <Alert variant="danger" className="small py-2 mb-3">
            {errorMsg}
          </Alert>
        )}
        {bankWarning && (
          <Alert variant="warning" className="small py-2 mb-3 d-flex align-items-center gap-2">
            <AlertTriangle size={16} />
            <span>{bankWarning}</span>
          </Alert>
        )}

        {isLoading ? (
          <div className="py-4">
            <TheoryOfNextLoader columns={6} rows={4} />
          </div>
        ) : (
          <>
            {summary && (
              <Row className="g-3 mb-4">
                <Col xs={6} md={3}>
                  <div className="wd-card mb-0 p-3">
                    <div className="text-muted fw-semibold" style={{ fontSize: '11px' }}>SỐ PHIẾU LƯƠNG</div>
                    <div className="fw-bold fs-5 font-mono text-dark mt-1">{summary.total_slips}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="wd-card mb-0 p-3">
                    <div className="text-muted fw-semibold" style={{ fontSize: '11px' }}>TỔNG THU NHẬP (GROSS)</div>
                    <div className="fw-bold fs-6 font-mono text-dark mt-1">{formatVnd(summary.total_gross)}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="wd-card mb-0 p-3">
                    <div className="text-muted fw-semibold" style={{ fontSize: '11px' }}>TỔNG KHẤU TRỪ (BHXH/THUẾ)</div>
                    <div className="fw-bold fs-6 font-mono text-danger mt-1">-{formatVnd(summary.total_deductions)}</div>
                  </div>
                </Col>
                <Col xs={6} md={3}>
                  <div className="wd-card mb-0 p-3">
                    <div className="text-muted fw-semibold" style={{ fontSize: '11px' }}>TỔNG THỰC LĨNH CHI TRẢ</div>
                    <div className="fw-bold fs-6 font-mono mt-1" style={{ color: 'var(--wd-green)' }}>
                      {formatVnd(summary.total_net_pay)}
                    </div>
                  </div>
                </Col>
              </Row>
            )}

            {summary?.mismatch_count > 0 && (
              <Alert variant="warning" className="small py-2 mb-3 d-flex align-items-center gap-2">
                <AlertTriangle size={16} />
                <span>
                  Phát hiện {summary.mismatch_count} nhân sự có dữ liệu vượt trực / ca đêm đã duyệt nhưng tiền phụ cấp tương ứng bằng 0. Vui lòng đối chiếu lại với Kế toán trước khi duyệt chi.
                </span>
              </Alert>
            )}

            <div className="table-responsive border rounded-2" style={{ maxHeight: '340px', overflowY: 'auto' }}>
              <table className="wd-table mb-0" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>NHÂN SỰ</th>
                    <th className="text-end">LƯƠNG CƠ BẢN</th>
                    <th className="text-end">TRỰC ĐÊM + THƯỜNG TRỰC</th>
                    <th className="text-end">PHẪU THUẬT</th>
                    <th className="text-end">OT + KPI</th>
                    <th className="text-end">BHXH + THUẾ</th>
                    <th className="text-end">THỰC LĨNH</th>
                    <th>ĐỐI SOÁT / NGUỒN</th>
                  </tr>
                </thead>
                <tbody>
                  {slips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-muted">
                        Đợt quyết toán này chưa có phiếu lương nào. Hãy xuất bảng công cho Kế toán hoặc nhập bảng lương từ Kế toán vào.
                      </td>
                    </tr>
                  ) : (
                    slips.map((s) => (
                      <tr key={s.id} style={s.discrepancy_warning ? { backgroundColor: '#fffbeb' } : undefined}>
                        <td>
                          <div className="fw-semibold text-dark">{s.staff_name || s.staff_id}</div>
                          <div className="text-muted font-mono" style={{ fontSize: '11px' }}>
                            {s.staff_id} {s.department_code ? `• ${s.department_code}` : ''}
                          </div>
                        </td>
                        <td className="text-end font-mono">{formatVnd(Number(s.base_pay))}</td>
                        <td className="text-end font-mono">
                          {formatVnd(Number(s.night_differential) + Number(s.on_call_allowance || 0))}
                        </td>
                        <td className="text-end font-mono">{formatVnd(Number(s.surgery_allowance || 0))}</td>
                        <td className="text-end font-mono">
                          {formatVnd(Number(s.overtime_pay) + Number(s.kpi_bonus || 0))}
                        </td>
                        <td className="text-end font-mono text-danger">
                          -{formatVnd(Number(s.social_insurance || 0) + Number(s.tax_deductions || 0) + Number(s.other_deductions || 0))}
                        </td>
                        <td className="text-end font-mono fw-bold text-dark">{formatVnd(Number(s.net_pay))}</td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            <span className={s.import_source === 'ACCOUNTING_IMPORT' ? 'wd-badge-blue' : 'wd-badge-neutral'}>
                              {s.import_source === 'ACCOUNTING_IMPORT' ? 'Kế Toán Nhập' : 'Hệ Thống'}
                            </span>
                            {s.discrepancy_warning && (
                              <span className="text-warning fw-semibold" style={{ fontSize: '11px' }}>
                                {s.discrepancy_warning}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top py-2.5 d-flex flex-wrap justify-content-between gap-2" style={{ borderColor: 'var(--wd-border)' }}>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="wd-pill-btn-outline"
            disabled={exporting || !runId}
            onClick={handleExportTimesheets}
          >
            <Download size={14} />
            <span>{exporting ? 'Đang xuất...' : 'Xuất Bảng Công & Trực Cho Kế Toán (CSV)'}</span>
          </button>
          {slips.length > 0 && (
            <button
              type="button"
              className="wd-pill-btn-outline"
              disabled={exportingBank || !runId}
              onClick={handleExportBankDisbursement}
            >
              <Landmark size={14} />
              <span>{exportingBank ? 'Đang tạo UNC...' : 'Xuất DS Chuyển Khoản NH (CSV)'}</span>
            </button>
          )}
          {!isLocked && runId && (
            <button
              type="button"
              className="wd-pill-btn"
              onClick={() => {
                onHide();
                onOpenImport(runId);
              }}
            >
              <FileSpreadsheet size={14} />
              <span>Nhập Bảng Lương Kế Toán</span>
            </button>
          )}
          {isLocked && (
            <span className="d-inline-flex align-items-center gap-1 text-muted small px-2">
              <Lock size={14} />
              <span>Đợt lương đã khóa bất biến ({run?.status})</span>
            </span>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2">
          {canApprove && run && run.status === 'PROCESSING' && (
            <button
              type="button"
              className="wd-pill-btn"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate('APPROVED')}
            >
              <ShieldCheck size={14} />
              <span>Phê Duyệt Đợt Lương</span>
            </button>
          )}
          {canApprove && run && (run.status === 'APPROVED' || run.status === 'PROCESSING') && slips.length > 0 && (
            <button
              type="button"
              className="wd-pill-btn-primary"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate('COMPLETED')}
            >
              <CheckCircle2 size={14} />
              <span>Hoàn Tất Chi Trả & Phát Hành</span>
            </button>
          )}
          <button type="button" className="wd-pill-btn-outline" onClick={onHide}>
            Đóng
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default RunInspectionModal;
