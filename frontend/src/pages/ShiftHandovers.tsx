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
  Plus,
  Clock,
  FileText,
  ShieldCheck,
  BookOpen,
  Camera,
  Link as LinkIcon,
  ExternalLink,
  Eye,
  MapPin,
  Building2,
  Calendar,
  Search,
  Info,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handoverApi, ShiftHandoverRecord, DocType } from '../api/handoverApi';
import { shiftApi } from '../api/shiftApi';
import { departmentApi } from '../api/departmentApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

export const ShiftHandovers: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentStaffId = user?.employee_code || 'EMP-DOC-001';
  const { t, lang } = useTranslation();

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'physical' | 'image' | 'link'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Modals
  const [selectedHandover, setSelectedHandover] = useState<ShiftHandoverRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Create Form State
  const [departmentCode, setDepartmentCode] = useState('DEP-CC-HSTC');
  const [outgoingShiftId, setOutgoingShiftId] = useState('');
  const [incomingShiftId, setIncomingShiftId] = useState('');
  const [docType, setDocType] = useState<DocType>('PHYSICAL_BOOK');
  const [physicalBookName, setPhysicalBookName] = useState('');
  const [physicalBookPage, setPhysicalBookPage] = useState('');
  const [physicalStorageLocation, setPhysicalStorageLocation] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [criticalNotes, setCriticalNotes] = useState('');

  // 1. Fetch Shift Handovers (category = SHIFT_HANDOVER)
  const { data: serverHandovers, isLoading } = useQuery({
    queryKey: ['shift_handovers'],
    queryFn: () => handoverApi.getAll({ handover_category: 'SHIFT_HANDOVER' }),
    staleTime: 10000
  });

  // 2. Fetch Shifts for selection
  const { data: serverShifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftApi.getAll(),
    staleTime: 30000
  });

  // 3. Fetch Departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getAll(),
    staleTime: 60000
  });

  // Create Mutation
  const createHandoverMutation = useMutation({
    mutationFn: (payload: any) => handoverApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_handovers'] });
      setShowCreateModal(false);
      resetForm();
      setSuccessToast('Biên bản bàn giao ca trực đã được ghi nhận vào hệ thống thành công!');
      setTimeout(() => setSuccessToast(null), 5000);
    },
    onError: (err: any) => {
      setSuccessToast(`Lỗi: ${err.response?.data?.message || err.message}`);
    }
  });

  const resetForm = () => {
    setOutgoingShiftId('');
    setIncomingShiftId('');
    setDocType('PHYSICAL_BOOK');
    setPhysicalBookName('');
    setPhysicalBookPage('');
    setPhysicalStorageLocation('');
    setFileUrl('');
    setExternalLink('');
    setCriticalNotes('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createHandoverMutation.mutate({
      outgoing_shift_id: outgoingShiftId || null,
      incoming_shift_id: incomingShiftId || null,
      department_code: departmentCode,
      handover_category: 'SHIFT_HANDOVER',
      doc_type: docType,
      physical_book_name: docType === 'PHYSICAL_BOOK' ? physicalBookName : null,
      physical_book_page: docType === 'PHYSICAL_BOOK' ? physicalBookPage : null,
      physical_storage_location: docType === 'PHYSICAL_BOOK' ? physicalStorageLocation : null,
      file_url: docType === 'IMAGE_UPLOAD' ? fileUrl : null,
      external_link: docType === 'DOCUMENT_LINK' ? externalLink : null,
      critical_notes: criticalNotes,
      logged_by: currentStaffId,
      status: 'COMPLETED'
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openDetail = (handover: ShiftHandoverRecord) => {
    setSelectedHandover(handover);
    setShowDetailModal(true);
  };

  // Filter handovers
  const handovers = serverHandovers || [];
  const filteredHandovers = handovers.filter((h) => {
    if (activeTab === 'physical' && h.doc_type !== 'PHYSICAL_BOOK') return false;
    if (activeTab === 'image' && h.doc_type !== 'IMAGE_UPLOAD') return false;
    if (activeTab === 'link' && h.doc_type !== 'DOCUMENT_LINK' && h.doc_type !== 'TEXT_NOTES') return false;

    if (selectedDeptFilter && h.department_code !== selectedDeptFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = h.id?.toLowerCase().includes(q);
      const matchBook = h.physical_book_name?.toLowerCase().includes(q);
      const matchNotes = h.critical_notes?.toLowerCase().includes(q);
      const matchStaff = h.logged_by_name?.toLowerCase().includes(q) || h.logged_by?.toLowerCase().includes(q);
      const matchDept = h.department_name?.toLowerCase().includes(q) || h.department_code?.toLowerCase().includes(q);
      return matchId || matchBook || matchNotes || matchStaff || matchDept;
    }

    return true;
  });

  const renderDocTypeBadge = (type: DocType) => {
    switch (type) {
      case 'PHYSICAL_BOOK':
        return (
          <span className="badge rounded-pill bg-light text-primary border border-primary-subtle d-inline-flex align-items-center gap-1.5 px-2.5 py-1 fw-medium" style={{ fontSize: '11px' }}>
            <BookOpen size={12} />
            <span>Sổ Vật Lý</span>
          </span>
        );
      case 'IMAGE_UPLOAD':
        return (
          <span className="badge rounded-pill bg-light text-success border border-success-subtle d-inline-flex align-items-center gap-1.5 px-2.5 py-1 fw-medium" style={{ fontSize: '11px' }}>
            <Camera size={12} />
            <span>Ảnh Chụp Trang Sổ</span>
          </span>
        );
      case 'DOCUMENT_LINK':
        return (
          <span className="badge rounded-pill bg-light text-info border border-info-subtle d-inline-flex align-items-center gap-1.5 px-2.5 py-1 fw-medium" style={{ fontSize: '11px' }}>
            <LinkIcon size={12} />
            <span>Link Tài Liệu</span>
          </span>
        );
      case 'TEXT_NOTES':
        return (
          <span className="badge rounded-pill bg-light text-secondary border d-inline-flex align-items-center gap-1.5 px-2.5 py-1 fw-medium" style={{ fontSize: '11px' }}>
            <FileText size={12} />
            <span>Ghi Chú Text</span>
          </span>
        );
    }
  };

  return (
    <Container fluid className="px-0 py-3">
      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-2 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="wd-page-title mb-0">Biên Bản Bàn Giao Ca Trực Lâm Sàng</h1>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5" style={{ fontSize: '11px' }}>
              Quy Chế Bệnh Viện (QĐ 1895/1997/QĐ-BYT)
            </span>
          </div>
          <p className="wd-page-subtitle mb-0">
            Lưu vết bàn giao ca trực 24/7 theo sổ bàn giao vật lý, ảnh scan/chụp trang sổ có chữ ký hai bên, hoặc hồ sơ điện tử
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="wd-pill-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            <span>Ghi Sổ Bàn Giao Ca Mới</span>
          </button>
        </div>
      </div>

      {successToast && (
        <Alert
          variant={successToast.startsWith('Lỗi') ? 'danger' : 'success'}
          dismissible
          onClose={() => setSuccessToast(null)}
          className="d-flex align-items-center gap-2 py-2.5 mb-4 small rounded-2"
        >
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </Alert>
      )}

      {/* Hospital Regulation Notice */}
      <div className="wd-support-banner mb-4">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            Quy Định Bàn Giao Giờ Trực (Khoản 3 Điều 39 - QĐ 1895/1997/QĐ-BYT)
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            Người giao ca và người nhận ca phải trực tiếp đối chiếu tình hình người bệnh nặng, thuốc men, tài sản và ký xác nhận vào <strong>Sổ bàn giao trực khoa</strong>. Hệ thống hỗ trợ tra cứu vị trí lưu trữ sổ vật lý tại tủ trực, tải ảnh chụp trang sổ đã ký hoặc liên kết hồ sơ bệnh án.
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
        {/* Navigation Tabs */}
        <div className="wd-tabs mb-0">
          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất Cả Biên Bản ({handovers.length})
          </button>
          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'physical' ? 'active' : ''}`}
            onClick={() => setActiveTab('physical')}
          >
            <BookOpen size={13} className="me-1 inline-block" />
            Sổ Vật Lý ({handovers.filter((h) => h.doc_type === 'PHYSICAL_BOOK').length})
          </button>
          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            <Camera size={13} className="me-1 inline-block" />
            Ảnh Chụp Trang Sổ ({handovers.filter((h) => h.doc_type === 'IMAGE_UPLOAD').length})
          </button>
          <button
            type="button"
            className={`wd-tab-btn ${activeTab === 'link' ? 'active' : ''}`}
            onClick={() => setActiveTab('link')}
          >
            <LinkIcon size={13} className="me-1 inline-block" />
            Link / Ghi Chú ({handovers.filter((h) => h.doc_type === 'DOCUMENT_LINK' || h.doc_type === 'TEXT_NOTES').length})
          </button>
        </div>

        {/* Search & Dept Filter */}
        <div className="d-flex align-items-center gap-2">
          <div className="position-relative" style={{ minWidth: '220px' }}>
            <Search size={14} className="position-absolute text-muted" style={{ top: '10px', left: '10px' }} />
            <input
              type="text"
              placeholder="Tìm theo sổ, người lập, nội dung..."
              className="wd-input ps-4 py-1.5 w-100"
              style={{ fontSize: '12px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="wd-select py-1.5"
            style={{ fontSize: '12px', minWidth: '180px' }}
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
          >
            <option value="">-- Tất cả khoa phòng --</option>
            {departments?.map((d) => (
              <option key={d.department_code} value={d.department_code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="wd-card">
        <div className="table-responsive">
          <table className="wd-table">
            <thead>
              <tr>
                <th>MÃ BIÊN BẢN</th>
                <th>KHOA PHÒNG &amp; CA TRỰC</th>
                <th>HÌNH THỨC LƯU TRỮ</th>
                <th>THÔNG TIN LƯU TRỮ SỔ</th>
                <th>CÁN BỘ BÀN GIAO</th>
                <th className="text-end">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted small">
                    Đang tải danh sách biên bản bàn giao...
                  </td>
                </tr>
              ) : filteredHandovers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted small">
                    Chưa có biên bản bàn giao nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredHandovers.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="font-mono fw-semibold text-primary" style={{ fontSize: '12px' }}>
                        #{item.id.slice(0, 8)}
                      </span>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        {item.created_at ? item.created_at.slice(0, 16).replace('T', ' ') : ''}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1.5">
                        <Building2 size={13} className="text-muted" />
                        <span className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                          {item.department_name || item.department_code || 'Toàn Viện'}
                        </span>
                      </div>
                      <div className="text-muted ps-3.5" style={{ fontSize: '11px' }}>
                        {item.outgoing_shift_type ? `Ca ${item.outgoing_shift_type}` : 'Ca trực bàn giao'}
                        {item.outgoing_start_time && ` (${item.outgoing_start_time.slice(11, 16)} - ${item.outgoing_end_time?.slice(11, 16)})`}
                      </div>
                    </td>
                    <td>
                      {renderDocTypeBadge(item.doc_type)}
                    </td>
                    <td>
                      {item.doc_type === 'PHYSICAL_BOOK' && (
                        <div>
                          <div className="text-dark fw-medium" style={{ fontSize: '12px' }}>
                            📖 {item.physical_book_name || 'Sổ bàn giao trực khoa'}
                          </div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>
                            {item.physical_book_page ? `Trang: ${item.physical_book_page}` : ''}
                            {item.physical_storage_location && ` • Vị trí: ${item.physical_storage_location}`}
                          </div>
                        </div>
                      )}

                      {item.doc_type === 'IMAGE_UPLOAD' && (
                        <div className="d-flex align-items-center gap-2">
                          {item.file_url ? (
                            <img
                              src={item.file_url}
                              alt="Trang sổ bàn giao"
                              className="rounded border"
                              style={{ width: '40px', height: '40px', objectFit: 'cover', cursor: 'pointer' }}
                              onClick={() => setPreviewImage(item.file_url || null)}
                            />
                          ) : (
                            <div className="rounded border bg-light d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
                              <Camera size={16} className="text-muted" />
                            </div>
                          )}
                          <div style={{ fontSize: '11px' }} className="text-muted">
                            Ảnh chụp trang sổ có chữ ký
                          </div>
                        </div>
                      )}

                      {item.doc_type === 'DOCUMENT_LINK' && (
                        <div>
                          <a
                            href={item.external_link || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none d-inline-flex align-items-center gap-1 small text-info fw-medium"
                          >
                            <span>Mở hồ sơ liên kết</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}

                      {item.doc_type === 'TEXT_NOTES' && (
                        <div className="text-muted text-truncate" style={{ maxWidth: '240px', fontSize: '12px' }}>
                          {item.critical_notes || 'Không có ghi chú thêm'}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="text-dark fw-medium" style={{ fontSize: '13px' }}>
                        {item.logged_by_name || item.logged_by}
                      </div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        {item.logged_by_role || 'Cán bộ trực giao ca'}
                      </div>
                    </td>
                    <td className="text-end">
                      <div className="d-flex align-items-center justify-content-end gap-1.5">
                        {item.file_url && (
                          <button
                            type="button"
                            className="btn btn-sm btn-light border py-1 px-2 text-dark"
                            title="Xem ảnh chụp trang sổ"
                            onClick={() => setPreviewImage(item.file_url || null)}
                          >
                            <Eye size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="wd-pill-btn-outline py-1 px-2.5"
                          onClick={() => openDetail(item)}
                        >
                          <span>Xem Chi Tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Handover Details */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
      >
        {selectedHandover && (
          <>
            <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
              <div className="d-flex align-items-center gap-2">
                <FileText size={18} style={{ color: 'var(--wd-blue)' }} />
                <Modal.Title className="fs-6 fw-bold text-dark mb-0">
                  Biên Bản Bàn Giao Ca #{selectedHandover.id.slice(0, 8)}
                </Modal.Title>
                <div className="ms-2">{renderDocTypeBadge(selectedHandover.doc_type)}</div>
              </div>
            </Modal.Header>

            <Modal.Body className="p-4">
              {/* Department & Shift Header */}
              <div
                className="p-3 rounded-2 border mb-3"
                style={{ backgroundColor: '#f8fafc', borderColor: 'var(--wd-border)' }}
              >
                <Row className="g-2 small">
                  <Col md={6}>
                    <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>
                      Khoa Phòng Thực Hiện
                    </div>
                    <div className="fw-semibold text-dark mt-0.5 fs-6">
                      {selectedHandover.department_name || selectedHandover.department_code || 'Toàn Bệnh Viện'}
                    </div>
                    <div className="text-secondary small mt-0.5">
                      Thời điểm lập: {selectedHandover.created_at ? selectedHandover.created_at.slice(0, 16).replace('T', ' ') : ''}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>
                      Cán Bộ Bàn Giao (Rời Ca)
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">
                      {selectedHandover.logged_by_name || selectedHandover.logged_by}
                    </div>
                    <div className="text-secondary small mt-0.5">
                      {selectedHandover.logged_by_role || 'Bác sĩ / Điều dưỡng trưởng ca'}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Physical Book Details if applicable */}
              {selectedHandover.doc_type === 'PHYSICAL_BOOK' && (
                <div className="p-3 rounded-2 border mb-3" style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}>
                  <div className="d-flex align-items-center gap-2 mb-2 text-warning-emphasis fw-bold small">
                    <BookOpen size={16} />
                    <span>HỒ SƠ SỔ BÀN GIAO VẬT LÝ TẠI KHOA</span>
                  </div>
                  <Row className="g-2 small text-dark">
                    <Col md={6}>
                      <span className="text-muted">Tên quyển sổ:</span>{' '}
                      <strong>{selectedHandover.physical_book_name || 'Sổ giao ca trực khoa'}</strong>
                    </Col>
                    <Col md={6}>
                      <span className="text-muted">Số trang biên bản:</span>{' '}
                      <strong>{selectedHandover.physical_book_page || 'Chưa ghi trang'}</strong>
                    </Col>
                    <Col md={12}>
                      <span className="text-muted">Vị trí tủ/kệ lưu trữ:</span>{' '}
                      <strong>{selectedHandover.physical_storage_location || 'Tủ hồ sơ phòng trực khoa'}</strong>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Photo Evidence if applicable */}
              {selectedHandover.doc_type === 'IMAGE_UPLOAD' && selectedHandover.file_url && (
                <div className="mb-3">
                  <label className="wd-label">{t('handovers.logbook_photo', 'Ảnh Chụp Trang Sổ Bàn Giao')}</label>
                  <div className="border rounded-2 p-2 text-center bg-light">
                    <img
                      src={selectedHandover.file_url}
                      alt={t('handovers.logbook_alt', 'Ảnh trang sổ bàn giao ca trực')}
                      className="img-fluid rounded"
                      style={{ maxHeight: '350px', cursor: 'pointer' }}
                      onClick={() => setPreviewImage(selectedHandover.file_url || null)}
                    />
                    <div className="small text-muted mt-1">Nhấp vào ảnh để phóng to toàn màn hình</div>
                  </div>
                </div>
              )}

              {/* External Link if applicable */}
              {selectedHandover.doc_type === 'DOCUMENT_LINK' && selectedHandover.external_link && (
                <div className="p-3 rounded-2 border mb-3 bg-light">
                  <div className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '10px' }}>
                    Đường Dẫn Hồ Sơ Điện Tử
                  </div>
                  <a
                    href={selectedHandover.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary fw-medium text-break d-inline-flex align-items-center gap-1"
                  >
                    <span>{selectedHandover.external_link}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {/* Critical Notes */}
              <div className="mb-3">
                <label className="wd-label">Tình Hình Người Bệnh Nặng &amp; Y Lệnh Bàn Giao</label>
                <div
                  className="p-3 rounded-2 border text-dark"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: 'var(--wd-border)',
                    fontSize: '13px',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-line'
                  }}
                >
                  {selectedHandover.critical_notes || 'Không ghi nhận biến động bất thường.'}
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
              <button
                type="button"
                className="wd-pill-btn-outline"
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Modal 2: Create Handover */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fs-6 fw-bold text-dark">
              {t('handovers.create', 'Lập Biên Bản Bàn Giao Ca Trực')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Row className="g-3 mb-3">
              <Col md={6}>
                <label className="wd-label">{t('nav.department', 'Khoa / Phòng Trực')} *</label>
                <select
                  required
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                  className="wd-select w-100"
                >
                  {departments?.map((d) => (
                    <option key={d.department_code} value={d.department_code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Col>

              <Col md={6}>
                <label className="wd-label">{t('shifts.assign_shift', 'Ca Trực Bàn Giao')}</label>
                <select
                  value={outgoingShiftId}
                  onChange={(e) => setOutgoingShiftId(e.target.value)}
                  className="wd-select w-100"
                >
                  <option value="">{lang === 'vi' ? '-- Chọn ca trực nếu có trên lịch --' : '-- Select scheduled shift --'}</option>
                  {serverShifts?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.department_name || s.department_code} — Ca {s.shift_type} : {s.start_time?.slice(11, 16)} - {s.end_time?.slice(11, 16)}
                    </option>
                  ))}
                </select>
              </Col>
            </Row>

            {/* Document Option Radio Cards */}
            <div className="mb-3">
              <label className="wd-label mb-2">Hình Thức Lưu Trữ Biên Bản Bàn Giao *</label>
              <Row className="g-2">
                <Col sm={6} md={3}>
                  <div
                    className={`p-2.5 rounded-2 border text-center cursor-pointer transition-all ${
                      docType === 'PHYSICAL_BOOK'
                        ? 'border-primary bg-primary-subtle text-primary fw-bold'
                        : 'bg-light text-secondary'
                    }`}
                    onClick={() => setDocType('PHYSICAL_BOOK')}
                    style={{ cursor: 'pointer' }}
                  >
                    <BookOpen size={18} className="mb-1 d-block mx-auto" />
                    <span style={{ fontSize: '12px' }}>1. Sổ Vật Lý Tại Khoa</span>
                  </div>
                </Col>

                <Col sm={6} md={3}>
                  <div
                    className={`p-2.5 rounded-2 border text-center cursor-pointer transition-all ${
                      docType === 'IMAGE_UPLOAD'
                        ? 'border-success bg-success-subtle text-success fw-bold'
                        : 'bg-light text-secondary'
                    }`}
                    onClick={() => setDocType('IMAGE_UPLOAD')}
                    style={{ cursor: 'pointer' }}
                  >
                    <Camera size={18} className="mb-1 d-block mx-auto" />
                    <span style={{ fontSize: '12px' }}>2. Tải Ảnh Chụp Sổ</span>
                  </div>
                </Col>

                <Col sm={6} md={3}>
                  <div
                    className={`p-2.5 rounded-2 border text-center cursor-pointer transition-all ${
                      docType === 'DOCUMENT_LINK'
                        ? 'border-info bg-info-subtle text-info fw-bold'
                        : 'bg-light text-secondary'
                    }`}
                    onClick={() => setDocType('DOCUMENT_LINK')}
                    style={{ cursor: 'pointer' }}
                  >
                    <LinkIcon size={18} className="mb-1 d-block mx-auto" />
                    <span style={{ fontSize: '12px' }}>3. Dán Link Tài Liệu</span>
                  </div>
                </Col>

                <Col sm={6} md={3}>
                  <div
                    className={`p-2.5 rounded-2 border text-center cursor-pointer transition-all ${
                      docType === 'TEXT_NOTES'
                        ? 'border-dark bg-secondary-subtle text-dark fw-bold'
                        : 'bg-light text-secondary'
                    }`}
                    onClick={() => setDocType('TEXT_NOTES')}
                    style={{ cursor: 'pointer' }}
                  >
                    <FileText size={18} className="mb-1 d-block mx-auto" />
                    <span style={{ fontSize: '12px' }}>4. Ghi Chú Trực Tiếp</span>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Dynamic Input based on docType */}
            {docType === 'PHYSICAL_BOOK' && (
              <div className="p-3 rounded-2 border mb-3 bg-light">
                <div className="fw-semibold text-dark small mb-2 d-flex align-items-center gap-1.5">
                  <BookOpen size={14} className="text-primary" />
                  <span>Khai Báo Định Danh Sổ Bàn Giao Vật Lý</span>
                </div>
                <Row className="g-2">
                  <Col md={6}>
                    <label className="form-label small text-muted mb-1">Tên Quyển Sổ *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Sổ Giao Ca Cấp Cứu - Quyển 02/2026"
                      className="wd-input w-100"
                      value={physicalBookName}
                      onChange={(e) => setPhysicalBookName(e.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <label className="form-label small text-muted mb-1">Số Trang Biên Bản *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Trang 34 - 35"
                      className="wd-input w-100"
                      value={physicalBookPage}
                      onChange={(e) => setPhysicalBookPage(e.target.value)}
                    />
                  </Col>
                  <Col md={12}>
                    <label className="form-label small text-muted mb-1">Vị Trí Tủ / Kệ Lưu Trữ Tại Khoa</label>
                    <input
                      type="text"
                      placeholder="VD: Tủ hồ sơ phòng trực Bác sĩ, ngăn số 2"
                      className="wd-input w-100"
                      value={physicalStorageLocation}
                      onChange={(e) => setPhysicalStorageLocation(e.target.value)}
                    />
                  </Col>
                </Row>
              </div>
            )}

            {docType === 'IMAGE_UPLOAD' && (
              <div className="p-3 rounded-2 border mb-3 bg-light">
                <div className="fw-semibold text-dark small mb-2 d-flex align-items-center gap-1.5">
                  <Camera size={14} className="text-success" />
                  <span>Tải Lên Ảnh Chụp Trang Sổ Đã Ký Tên Hai Bên</span>
                </div>
                <Form.Group className="mb-2">
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="wd-input w-100"
                  />
                </Form.Group>
                {fileUrl && (
                  <div className="mt-2 text-center">
                    <img
                      src={fileUrl}
                      alt={t('handovers.preview_alt', 'Xem trước ảnh biên bản bàn giao')}
                      className="img-thumbnail"
                      style={{ maxHeight: '180px' }}
                    />
                    <div className="small text-success mt-1">{lang === 'vi' ? 'Đã chọn ảnh thành công!' : 'Image selected successfully!'}</div>
                  </div>
                )}
              </div>
            )}

            {docType === 'DOCUMENT_LINK' && (
              <div className="p-3 rounded-2 border mb-3 bg-light">
                <div className="fw-semibold text-dark small mb-2 d-flex align-items-center gap-1.5">
                  <LinkIcon size={14} className="text-info" />
                  <span>{t('handovers.document_link', 'Đường Dẫn Tài Liệu Bệnh Viện')}</span>
                </div>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/... hoặc link hệ thống EMR"
                  className="wd-input w-100"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                />
              </div>
            )}

            <Form.Group className="mb-3">
              <label className="wd-label">
                Tóm Tắt Tình Hình Bệnh Nhân Nặng &amp; Y Lệnh Bàn Giao
              </label>
              <textarea
                rows={4}
                placeholder="Ghi nhận số lượng bệnh nhân nặng thở máy, các ca phẫu thuật cấp cứu cần theo dõi, thuốc đặc trị..."
                value={criticalNotes}
                onChange={(e) => setCriticalNotes(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <div className="p-3 rounded-2 small text-muted border bg-light">
              <div className="d-flex align-items-center gap-1.5 fw-medium text-dark mb-0.5">
                <ShieldCheck size={14} className="text-success" />
                <span>Xác nhận tuân thủ Quy chế Bệnh viện:</span>
              </div>
              Bác sĩ và điều dưỡng giao - nhận ca đã trực tiếp kiểm tra và ký tay xác nhận trong sổ trực vật lý tại khoa phòng.
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowCreateModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createHandoverMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {createHandoverMutation.isPending ? 'Đang lưu...' : 'Lưu Biên Bản Vào Hệ Thống'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal 3: Fullscreen Image Preview */}
      <Modal show={!!previewImage} onHide={() => setPreviewImage(null)} size="lg" centered>
        <Modal.Header closeButton className="py-2">
          <Modal.Title className="fs-6 fw-bold">Ảnh Chụp Sổ Bàn Giao Ca Trực</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-2 text-center bg-dark">
          {previewImage && (
            <img
              src={previewImage}
              alt={t('handovers.logbook_alt', 'Ảnh trang sổ bàn giao ca trực')}
              className="img-fluid"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ShiftHandovers;
