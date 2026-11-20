import React, { useMemo, useState, useEffect } from 'react';
import { Modal, Row, Col, Alert } from 'react-bootstrap';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi } from '../../api/payrollApi';
import { employeeApi } from '../../api/employeeApi';
import {
  downloadAccountingTemplateCsv,
  parseAccountingSpreadsheetText
} from '../../utils/payrollCsv';

interface AccountingImportModalProps {
  show: boolean;
  onHide: () => void;
  runs: Array<{
    id: string;
    period_label: string;
    status: string;
  }>;
  initialRunId?: string;
  onSuccess: (message: string) => void;
}

export const AccountingImportModal: React.FC<AccountingImportModalProps> = ({
  show,
  onHide,
  runs,
  initialRunId,
  onSuccess
}) => {
  const queryClient = useQueryClient();
  const editableRuns = useMemo(
    () => runs.filter((r) => !['APPROVED', 'COMPLETED', 'CANCELLED'].includes(r.status)),
    [runs]
  );

  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [importMode, setImportMode] = useState<'UPSERT' | 'REPLACE_RUN_SLIPS'>('UPSERT');
  const [slipStatus, setSlipStatus] = useState<'CALCULATED' | 'DRAFT'>('CALCULATED');
  const [rawText, setRawText] = useState<string>('');
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setSubmitError(null);
      if (initialRunId && editableRuns.some((r) => r.id === initialRunId)) {
        setSelectedRunId(initialRunId);
      } else if (editableRuns.length > 0 && !editableRuns.some((r) => r.id === selectedRunId)) {
        setSelectedRunId(editableRuns[0].id);
      }
    }
  }, [show, initialRunId, editableRuns, selectedRunId]);

  const { data: employees } = useQuery({
    queryKey: ['employeesForPayrollImport'],
    queryFn: () => employeeApi.getAll(),
    enabled: show,
    staleTime: 60000
  });

  const employeeMap = useMemo(() => {
    const map = new Map<string, { full_name: string; department_code: string }>();
    if (Array.isArray(employees)) {
      employees.forEach((emp: any) => {
        if (emp.employee_code) {
          map.set(emp.employee_code, {
            full_name: `${emp.last_name || ''} ${emp.first_name || ''}`.trim() || emp.employee_code,
            department_code: emp.department_code || ''
          });
        }
      });
    }
    return map;
  }, [employees]);

  const parsed = useMemo(
    () => parseAccountingSpreadsheetText(rawText, slipStatus),
    [rawText, slipStatus]
  );

  const previewAnalysis = useMemo(() => {
    const seen = new Set<string>();
    const duplicateIds = new Set<string>();
    const unknownIds = new Set<string>();
    let totalNet = 0;

    parsed.rows.forEach((row) => {
      totalNet += Number(row.net_pay || 0);
      if (seen.has(row.staff_id)) {
        duplicateIds.add(row.staff_id);
      }
      seen.add(row.staff_id);
      if (employeeMap.size > 0 && !employeeMap.has(row.staff_id)) {
        unknownIds.add(row.staff_id);
      }
    });

    return {
      duplicateIds: [...duplicateIds],
      unknownIds: [...unknownIds],
      totalNet
    };
  }, [parsed.rows, employeeMap]);

  const importMutation = useMutation({
    mutationFn: () =>
      payrollApi.importRunSlips(selectedRunId, {
        mode: importMode,
        source_filename: sourceFilename || 'manual_paste_or_csv',
        slips: parsed.rows
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payrollRuns'] });
      queryClient.invalidateQueries({ queryKey: ['runSlips', selectedRunId] });
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      setRawText('');
      setSourceFilename(null);
      onSuccess(
        `Đã nhập thành công ${data?.imported_count || parsed.rows.length} phiếu lương từ Kế toán vào đợt ${selectedRunId}.`
      );
      onHide();
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.message || err.message || 'Lỗi khi nhập bảng lương.');
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawText(String(ev.target?.result || ''));
    };
    reader.readAsText(file, 'utf-8');
  };

  const formatVnd = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

  const hasBlockingErrors =
    !selectedRunId ||
    parsed.rows.length === 0 ||
    parsed.errors.length > 0 ||
    previewAnalysis.duplicateIds.length > 0 ||
    previewAnalysis.unknownIds.length > 0;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
        <div className="d-flex align-items-center gap-2">
          <FileSpreadsheet size={20} style={{ color: 'var(--wd-blue)' }} />
          <div>
            <Modal.Title className="fw-bold fs-6 text-dark mb-0">
              Nhập Bảng Lương Từ Phòng Tài Chính Kế Toán
            </Modal.Title>
            <div className="text-muted" style={{ fontSize: '11px' }}>
              Tải file CSV chuẩn hoặc dán trực tiếp vùng bảng tính từ Excel của Kế toán
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {submitError && (
          <Alert variant="danger" className="small py-2 mb-3">
            {submitError}
          </Alert>
        )}

        {editableRuns.length === 0 && (
          <Alert variant="warning" className="small py-2 mb-3 d-flex align-items-center gap-2">
            <AlertTriangle size={16} />
            <span>
              Không có đợt quyết toán nào ở trạng thái DRAFT hoặc PROCESSING. Vui lòng khởi tạo chu kỳ mới trước khi nhập bảng lương.
            </span>
          </Alert>
        )}

        <Row className="g-3 mb-3">
          <Col md={5}>
            <label className="wd-label">1. Đợt Quyết Toán Tiếp Nhận</label>
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="wd-select w-100"
              disabled={editableRuns.length === 0}
            >
              {editableRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.period_label} ({run.status})
                </option>
              ))}
            </select>
          </Col>
          <Col md={4}>
            <label className="wd-label">Chế Độ Nhập Dữ Liệu</label>
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as 'UPSERT' | 'REPLACE_RUN_SLIPS')}
              className="wd-select w-100"
            >
              <option value="UPSERT">Cập nhật / Bổ sung (An toàn, không trùng dòng)</option>
              <option value="REPLACE_RUN_SLIPS">Thay thế toàn bộ phiếu cũ trong đợt</option>
            </select>
          </Col>
          <Col md={3}>
            <label className="wd-label">Trạng Thái Phát Hành</label>
            <select
              value={slipStatus}
              onChange={(e) => setSlipStatus(e.target.value as 'CALCULATED' | 'DRAFT')}
              className="wd-select w-100"
            >
              <option value="CALCULATED">Đã tính toán (Sẵn sàng kiểm tra)</option>
              <option value="DRAFT">Bản nháp (Ẩn với Y Bác sĩ)</option>
            </select>
          </Col>
        </Row>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <label className="wd-label mb-0">2. Tải File CSV Hoặc Dán Dữ Liệu Bảng Tính Excel</label>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={downloadAccountingTemplateCsv}
            >
              <Download size={14} />
              <span>Tải File Mẫu CSV</span>
            </button>
            <label className="wd-pill-btn mb-0" style={{ cursor: 'pointer' }}>
              <Upload size={14} />
              <span>{sourceFilename ? sourceFilename : 'Chọn File CSV'}</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt"
                className="d-none"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        <textarea
          rows={5}
          className="wd-input w-100 font-mono mb-3"
          style={{ fontSize: '12px' }}
          placeholder="staff_id,base_pay,night_differential,overtime_pay,on_call_allowance,surgery_allowance,kpi_bonus,social_insurance,tax_deductions,other_deductions,net_pay,notes&#10;EMP-DOC-001,18000000,2400000,1600000,1200000,3500000,2000000,1890000,610000,0,26200000,Bang luong TCKT"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
        />

        {(parsed.errors.length > 0 ||
          previewAnalysis.duplicateIds.length > 0 ||
          previewAnalysis.unknownIds.length > 0) && (
          <Alert variant="danger" className="small py-2 mb-3">
            {parsed.errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
            {previewAnalysis.duplicateIds.length > 0 && (
              <div>Mã nhân viên bị trùng trong file: {previewAnalysis.duplicateIds.join(', ')}</div>
            )}
            {previewAnalysis.unknownIds.length > 0 && (
              <div>Mã nhân viên không tồn tại trong danh bạ: {previewAnalysis.unknownIds.join(', ')}</div>
            )}
          </Alert>
        )}

        {parsed.rows.length > 0 && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-semibold text-dark small d-flex align-items-center gap-1.5">
                <CheckCircle2 size={15} style={{ color: 'var(--wd-green)' }} />
                <span>
                  Xem trước: {parsed.rows.length} nhân sự &bull; Tổng thực lĩnh: {formatVnd(previewAnalysis.totalNet)}
                </span>
              </div>
            </div>
            <div className="table-responsive border rounded-2" style={{ maxHeight: '240px', overflowY: 'auto' }}>
              <table className="wd-table mb-0" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>MÃ NV</th>
                    <th>HỌ VÀ TÊN</th>
                    <th className="text-end">LƯƠNG CB</th>
                    <th className="text-end">TRỰC ĐÊM + THƯỜNG TRỰC</th>
                    <th className="text-end">PHẪU THUẬT</th>
                    <th className="text-end">OT + KPI</th>
                    <th className="text-end">BHXH + THUẾ</th>
                    <th className="text-end">THỰC LĨNH</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r, idx) => {
                    const emp = employeeMap.get(r.staff_id);
                    const isInvalid = !emp && employeeMap.size > 0;
                    const isDup = previewAnalysis.duplicateIds.includes(r.staff_id);
                    return (
                      <tr key={`${r.staff_id}-${idx}`} style={isInvalid || isDup ? { backgroundColor: '#fef2f2' } : undefined}>
                        <td className="font-mono fw-semibold">{r.staff_id}</td>
                        <td>{emp ? `${emp.full_name} (${emp.department_code})` : 'Không tìm thấy'}</td>
                        <td className="text-end font-mono">{formatVnd(r.base_pay)}</td>
                        <td className="text-end font-mono">{formatVnd(r.night_differential + r.on_call_allowance)}</td>
                        <td className="text-end font-mono">{formatVnd(r.surgery_allowance)}</td>
                        <td className="text-end font-mono">{formatVnd(r.overtime_pay + r.kpi_bonus)}</td>
                        <td className="text-end font-mono text-danger">
                          -{formatVnd(r.social_insurance + r.tax_deductions + r.other_deductions)}
                        </td>
                        <td className="text-end font-mono fw-bold">{formatVnd(r.net_pay || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-top py-2.5 d-flex justify-content-between" style={{ borderColor: 'var(--wd-border)' }}>
        <div className="text-muted small">
          Dữ liệu nhập sẽ tự động ghi nhận vào nhật ký kiểm toán (Audit Log).
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="wd-pill-btn-outline" onClick={onHide}>
            Hủy
          </button>
          <button
            type="button"
            className="wd-pill-btn-primary"
            disabled={hasBlockingErrors || importMutation.isPending}
            onClick={() => importMutation.mutate()}
          >
            {importMutation.isPending
              ? 'Đang nhập dữ liệu...'
              : `Xác Nhận Nhập ${parsed.rows.length} Phiếu Lương`}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default AccountingImportModal;
