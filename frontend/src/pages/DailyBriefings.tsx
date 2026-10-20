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
  BookOpen,
  Camera,
  Link as LinkIcon,
  ExternalLink,
  Eye,
  Building2,
  Calendar,
  Search,
  Info,
  CheckCircle2,
  CheckSquare,
  Users,
  Activity,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { handoverApi, ShiftHandoverRecord, DocType, HandoverCategory } from '../api/handoverApi';
import { departmentApi } from '../api/departmentApi';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../i18n/useTranslation';

export const DailyBriefings: React.FC = () => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentStaffId = user?.employee_code || 'EMP-DOC-001';

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'ALL' | 'HOSPITAL_BRIEFING' | 'DEPT_BRIEFING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  // Modals
  const [selectedBriefing, setSelectedBriefing] = useState<ShiftHandoverRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [briefingCategory, setBriefingCategory] = useState<HandoverCategory>('HOSPITAL_BRIEFING');
  const [departmentCode, setDepartmentCode] = useState('DEP-KHTH');
  const [docType, setDocType] = useState<DocType>('PHYSICAL_BOOK');
  const [physicalBookName, setPhysicalBookName] = useState(t('briefings.default_book_name', 'Sổ Giao Ban Bệnh Viện'));
  const [physicalBookPage, setPhysicalBookPage] = useState('');
  const [physicalStorageLocation, setPhysicalStorageLocation] = useState(t('briefings.default_storage_loc', 'Phòng Kế Hoạch Tổng Hợp'));
  const [fileUrl, setFileUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [criticalNotes, setCriticalNotes] = useState('');

  // 24h Metrics State
  const [metricEmergency, setMetricEmergency] = useState<number>(0);
  const [metricAdmitted, setMetricAdmitted] = useState<number>(0);
  const [metricSurgeries, setMetricSurgeries] = useState<number>(0);
  const [metricDeaths, setMetricDeaths] = useState<number>(0);

  // 1. Fetch All Briefings (categories: HOSPITAL_BRIEFING, DEPT_BRIEFING)
  const { data: serverBriefings, isLoading } = useQuery({
    queryKey: ['daily_briefings'],
    queryFn: async () => {
      const [hosp, dept] = await Promise.all([
        handoverApi.getAll({ handover_category: 'HOSPITAL_BRIEFING' }),
        handoverApi.getAll({ handover_category: 'DEPT_BRIEFING' })
      ]);
      return [...hosp, ...dept].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    staleTime: 10000
  });

  // 2. Fetch Departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getAll(),
    staleTime: 60000
  });

  // Create Mutation
  const createBriefingMutation = useMutation({
    mutationFn: (payload: any) => handoverApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_briefings'] });
      setShowCreateModal(false);
      resetForm();
      setSuccessToast(t('briefings.create_success', 'Biên bản sổ giao ban đã được lưu thành công!'));
      setTimeout(() => setSuccessToast(null), 5000);
    },
    onError: (err: any) => {
      setSuccessToast(`${t('common.error', 'Lỗi')}: ${err.response?.data?.message || err.message}`);
    }
  });

  const resetForm = () => {
    setBriefingCategory('HOSPITAL_BRIEFING');
    setDepartmentCode('DEP-KHTH');
    setDocType('PHYSICAL_BOOK');
    setPhysicalBookName(t('briefings.default_book_name', 'Sổ Giao Ban Bệnh Viện'));
    setPhysicalBookPage('');
    setPhysicalStorageLocation(t('briefings.default_storage_loc', 'Phòng Kế Hoạch Tổng Hợp'));
    setFileUrl('');
    setExternalLink('');
    setCriticalNotes('');
    setMetricEmergency(0);
    setMetricAdmitted(0);
    setMetricSurgeries(0);
    setMetricDeaths(0);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const summaryMetrics = {
      emergency: Number(metricEmergency) || 0,
      admitted: Number(metricAdmitted) || 0,
      surgeries: Number(metricSurgeries) || 0,
      deaths: Number(metricDeaths) || 0
    };

    createBriefingMutation.mutate({
      department_code: briefingCategory === 'HOSPITAL_BRIEFING' ? 'DEP-KHTH' : departmentCode,
      handover_category: briefingCategory,
      doc_type: docType,
      physical_book_name: docType === 'PHYSICAL_BOOK' ? physicalBookName : null,
      physical_book_page: docType === 'PHYSICAL_BOOK' ? physicalBookPage : null,
      physical_storage_location: docType === 'PHYSICAL_BOOK' ? physicalStorageLocation : null,
      file_url: docType === 'IMAGE_UPLOAD' ? fileUrl : null,
      external_link: docType === 'DOCUMENT_LINK' ? externalLink : null,
      summary_metrics: summaryMetrics,
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

  const openDetail = (briefing: ShiftHandoverRecord) => {
    setSelectedBriefing(briefing);
    setShowDetailModal(true);
  };

  // Safe parsing helper for metrics
  const parseMetrics = (metricsString?: string | null) => {
    if (!metricsString) return { emergency: 0, admitted: 0, surgeries: 0, deaths: 0 };
    try {
      if (typeof metricsString === 'object') return metricsString;
      return JSON.parse(metricsString);
    } catch {
      return { emergency: 0, admitted: 0, surgeries: 0, deaths: 0 };
    }
  };

  // Filter briefings
  const briefings = serverBriefings || [];
  const filteredBriefings = briefings.filter((b) => {
    if (activeTab === 'HOSPITAL_BRIEFING' && b.handover_category !== 'HOSPITAL_BRIEFING') return false;
    if (activeTab === 'DEPT_BRIEFING' && b.handover_category !== 'DEPT_BRIEFING') return false;

    if (selectedDeptFilter && b.department_code !== selectedDeptFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = b.id?.toLowerCase().includes(q);
      const matchBook = b.physical_book_name?.toLowerCase().includes(q);
      const matchNotes = b.critical_notes?.toLowerCase().includes(q);
      const matchStaff = b.logged_by_name?.toLowerCase().includes(q) || b.logged_by?.toLowerCase().includes(q);
      const matchDept = b.department_name?.toLowerCase().includes(q) || b.department_code?.toLowerCase().includes(q);
      return matchId || matchBook || matchNotes || matchStaff || matchDept;
    }

    return true;
  });

  // Calculate 24h Totals for top ribbon
  const aggregateMetrics = briefings.reduce(
    (acc, item) => {
      const m = parseMetrics(item.summary_metrics);
      acc.emergency += Number(m.emergency || 0);
      acc.admitted += Number(m.admitted || 0);
      acc.surgeries += Number(m.surgeries || 0);
      acc.deaths += Number(m.deaths || 0);
      return acc;
    },
    { emergency: 0, admitted: 0, surgeries: 0, deaths: 0 }
  );

  return (
    <Container fluid className="px-0 py-3">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4 pb-2 border-bottom">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h1 className="wd-page-title mb-0">{t('briefings.page_title', 'Sổ Giao Ban Bệnh Viện & Khoa Lâm Sàng')}</h1>
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5" style={{ fontSize: '11px' }}>
              {t('briefings.rule_badge', 'Quy Chế Bệnh Viện')}
            </span>
          </div>
          <p className="wd-page-subtitle mb-0">
            {t('briefings.rule_desc', 'Theo dõi giao ban toàn viện và giao ban khoa, tổng hợp chỉ số 24h và kết luận chỉ đạo')}
          </p>
        </div>
        <div>
          <button
            type="button"
            className="wd-pill-btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={15} />
            <span>{t('briefings.new_btn', 'Lập Biên Bản Giao Ban Mới')}</span>
          </button>
        </div>
      </div>

      {successToast && (
        <Alert
          variant={successToast.startsWith(t('common.error', 'Lỗi')) ? 'danger' : 'success'}
          dismissible
          onClose={() => setSuccessToast(null)}
          className="d-flex align-items-center gap-2 py-2.5 mb-4 small rounded-2"
        >
          <CheckCircle2 size={16} />
          <span>{successToast}</span>
        </Alert>
      )}

      {/* 24h Metrics Dashboard Ribbon */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card p-3 d-flex align-items-center gap-3 border-start border-4 border-danger">
            <div className="p-2.5 rounded-3 bg-danger-subtle text-danger">
              <Activity size={24} />
            </div>
            <div>
              <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                {t('briefings.kpi_emergency', 'Cấp Cứu 24 Giờ')}
              </div>
              <div className="fs-4 fw-bold text-dark">{aggregateMetrics.emergency}</div>
              <div className="text-secondary" style={{ fontSize: '11px' }}>{t('briefings.kpi_emergency_sub', 'Lượt khám cấp cứu')}</div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card p-3 d-flex align-items-center gap-3 border-start border-4 border-primary">
            <div className="p-2.5 rounded-3 bg-primary-subtle text-primary">
              <Building2 size={24} />
            </div>
            <div>
              <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                {t('briefings.kpi_admission', 'Vào Viện / Nhập Viện')}
              </div>
              <div className="fs-4 fw-bold text-dark">{aggregateMetrics.admitted}</div>
              <div className="text-secondary" style={{ fontSize: '11px' }}>{t('briefings.kpi_admission_sub', 'Bệnh nhân nội trú mới')}</div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card p-3 d-flex align-items-center gap-3 border-start border-4 border-warning">
            <div className="p-2.5 rounded-3 bg-warning-subtle text-warning-emphasis">
              <CheckSquare size={24} />
            </div>
            <div>
              <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                {t('briefings.kpi_surgery', 'Phẫu Thuật Cấp Cứu')}
              </div>
              <div className="fs-4 fw-bold text-dark">{aggregateMetrics.surgeries}</div>
              <div className="text-secondary" style={{ fontSize: '11px' }}>{t('briefings.kpi_surgery_sub', 'Ca mổ trong ca trực')}</div>
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} lg={3}>
          <div className="wd-card p-3 d-flex align-items-center gap-3 border-start border-4 border-secondary">
            <div className="p-2.5 rounded-3 bg-secondary-subtle text-secondary">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                {t('briefings.kpi_death', 'Tử Vong / Tiên Lượng Nặng')}
              </div>
              <div className="fs-4 fw-bold text-dark">{aggregateMetrics.deaths}</div>
              <div className="text-secondary" style={{ fontSize: '11px' }}>{t('briefings.kpi_death_sub', 'Ca cần báo cáo viện')}</div>
            </div>
          </div>
        </Col>
      </Row>

      {/* Hospital Regulation Banner */}
      <div className="wd-support-banner mb-4">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            {t('briefings.guide_title', 'Quy Định Giao Ban Hàng Ngày')}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            <strong>{t('briefings.guide_point1', '1. Giao ban Bệnh viện: Giám đốc bệnh viện chủ trì, thành phần gồm Trưởng khoa lâm sàng, cận lâm sàng, Bác sĩ trực viện, Điều dưỡng trưởng, Trưởng phòng KHTH.')}</strong><br />
            <strong>{t('briefings.guide_point2', '2. Giao ban Khoa lâm sàng: Trưởng khoa chủ trì kiểm điểm tình hình người bệnh nặng và phân công công tác trong ngày.')}</strong>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
        <div className="wd-tabs mb-0">
          <button
            type="button"
            className={`wd-tab-btn d-inline-flex align-items-center gap-1.5 ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <span>{t('briefings.tab_all', 'Tất Cả Buổi Giao Ban')}</span>
            <span className="badge bg-secondary rounded-pill fw-normal">{briefings.length}</span>
          </button>
          <button
            type="button"
            className={`wd-tab-btn d-inline-flex align-items-center gap-1.5 ${activeTab === 'HOSPITAL_BRIEFING' ? 'active' : ''}`}
            onClick={() => setActiveTab('HOSPITAL_BRIEFING')}
          >
            <Users size={13} className="inline-block" />
            <span>{t('briefings.tab_hospital', 'Giao Ban Toàn Viện')}</span>
            <span className="badge bg-secondary rounded-pill fw-normal">{briefings.filter((b) => b.handover_category === 'HOSPITAL_BRIEFING').length}</span>
          </button>
          <button
            type="button"
            className={`wd-tab-btn d-inline-flex align-items-center gap-1.5 ${activeTab === 'DEPT_BRIEFING' ? 'active' : ''}`}
            onClick={() => setActiveTab('DEPT_BRIEFING')}
          >
            <Building2 size={13} className="inline-block" />
            <span>{t('briefings.tab_dept', 'Giao Ban Khoa Lâm Sàng')}</span>
            <span className="badge bg-secondary rounded-pill fw-normal">{briefings.filter((b) => b.handover_category === 'DEPT_BRIEFING').length}</span>
          </button>
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative" style={{ minWidth: '220px' }}>
            <Search size={14} aria-hidden="true" className="position-absolute text-muted" style={{ top: '10px', left: '10px' }} />
            <input
              type="text"
              aria-label={t('briefings.search_placeholder', 'Tìm nội dung, chỉ đạo, người ghi sổ...')}
              placeholder={t('briefings.search_placeholder', 'Tìm nội dung, chỉ đạo, người ghi sổ...')}
              className="wd-input ps-4 py-1.5 w-100"
              style={{ fontSize: '12px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            aria-label={t('briefings.all_departments', 'Lọc theo khoa phòng')}
            className="wd-select py-1.5"
            style={{ fontSize: '12px', minWidth: '180px' }}
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
          >
            <option value="">{t('briefings.all_departments', '-- Lọc theo khoa phòng --')}</option>
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
                <th>{t('briefings.th_date', 'NGÀY GIAO BAN')}</th>
                <th>{t('briefings.th_level_unit', 'CẤP GIAO BAN & ĐƠN VỊ')}</th>
                <th>{t('briefings.th_metrics', 'CHỈ SỐ 24 GIỜ QUA')}</th>
                <th>{t('briefings.th_archive', 'HỒ SƠ LƯU TRỮ')}</th>
                <th>{t('briefings.th_directives', 'Ý KIẾN CHỈ ĐẠO & KẾT LUẬN')}</th>
                <th className="text-end">{t('common.actions', 'THAO TÁC')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted small">
                    {t('briefings.loading', 'Đang tải danh sách biên bản sổ giao ban...')}
                  </td>
                </tr>
              ) : filteredBriefings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted small">
                    {t('briefings.empty', 'Không có biên bản giao ban nào phù hợp với bộ lọc hiện tại.')}
                  </td>
                </tr>
              ) : (
                filteredBriefings.map((item) => {
                  const m = parseMetrics(item.summary_metrics);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="fw-semibold text-dark" style={{ fontSize: '13px' }}>
                          {item.created_at ? item.created_at.slice(0, 10) : ''}
                        </div>
                        <div className="text-muted small" style={{ fontSize: '11px' }}>
                          {item.created_at ? item.created_at.slice(11, 16) : ''}
                        </div>
                      </td>
                      <td>
                        <div>
                          {item.handover_category === 'HOSPITAL_BRIEFING' ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-0.5" style={{ fontSize: '11px' }}>
                              🏛️ {t('briefings.level_hospital', 'Giao Ban Toàn Viện')}
                            </span>
                          ) : (
                            <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-0.5" style={{ fontSize: '11px' }}>
                              🩺 {t('briefings.level_dept', 'Giao Ban Khoa Lâm Sàng')}
                            </span>
                          )}
                        </div>
                        <div className="text-dark fw-medium mt-1" style={{ fontSize: '12px' }}>
                          {item.department_name || item.department_code || t('briefings.entire_hospital', 'Bệnh Viện')}
                        </div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          {t('briefings.logger_prefix', 'Thư ký ghi sổ:')} {item.logged_by_name || item.logged_by}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '240px' }}>
                          <span className="badge bg-light text-danger border" style={{ fontSize: '10px' }}>
                            {t('briefings.metric_emergency', 'Cấp cứu:')} {m.emergency}
                          </span>
                          <span className="badge bg-light text-primary border" style={{ fontSize: '10px' }}>
                            {t('briefings.metric_admission', 'Vào viện:')} {m.admitted}
                          </span>
                          <span className="badge bg-light text-warning-emphasis border" style={{ fontSize: '10px' }}>
                            {t('briefings.metric_surgery', 'Mổ cấp cứu:')} {m.surgeries}
                          </span>
                          {Number(m.deaths) > 0 && (
                            <span className="badge bg-danger text-white" style={{ fontSize: '10px' }}>
                              {t('briefings.metric_death', 'Tử vong:')} {m.deaths}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {item.doc_type === 'PHYSICAL_BOOK' && (
                          <div>
                            <div className="text-dark fw-medium" style={{ fontSize: '12px' }}>
                              📖 {item.physical_book_name || t('briefings.default_book_name', 'Sổ giao ban bệnh viện')}
                            </div>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              {item.physical_book_page ? `${t('handovers.book_page', 'Trang')}: ${item.physical_book_page}` : ''}
                              {item.physical_storage_location && ` • ${t('handovers.location_prefix', 'Vị trí')}: ${item.physical_storage_location}`}
                            </div>
                          </div>
                        )}

                        {item.doc_type === 'IMAGE_UPLOAD' && (
                          <div className="d-flex align-items-center gap-2">
                            {item.file_url ? (
                              <img
                                src={item.file_url}
                                alt={t('briefings.signed_photo_alt', 'Ảnh sổ giao ban')}
                                className="rounded border"
                                style={{ width: '38px', height: '38px', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setPreviewImage(item.file_url || null)}
                              />
                            ) : (
                              <div className="rounded border bg-light d-flex align-items-center justify-content-center" style={{ width: '38px', height: '38px' }}>
                                <Camera size={14} className="text-muted" />
                              </div>
                            )}
                            <div style={{ fontSize: '11px' }} className="text-muted">
                              {t('briefings.signed_photo_label', 'Ảnh chụp sổ giao ban')}
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
                              <span>{t('briefings.online_briefing', 'Biên bản trực tuyến')}</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}

                        {item.doc_type === 'TEXT_NOTES' && (
                          <span className="text-muted small">{t('briefings.digital_notes', 'Ghi chép điện tử')}</span>
                        )}
                      </td>
                      <td>
                        <div className="text-truncate text-dark" style={{ maxWidth: '280px', fontSize: '12px' }}>
                          {item.critical_notes || t('briefings.no_extra_directives', 'Không ghi nhận ý kiến chỉ đạo bổ sung.')}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="d-flex align-items-center justify-content-end gap-1.5">
                          {item.file_url && (
                            <button
                              type="button"
                              className="btn btn-sm btn-light border py-1 px-2 text-dark"
                              title={t('briefings.view_photo', 'Xem ảnh trang sổ')}
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
                            <span>{t('briefings.view_details', 'Xem Chi Tiết')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Briefing Detail */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
      >
        {selectedBriefing && (
          <>
            <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
              <div className="d-flex align-items-center gap-2">
                <BookOpen size={18} style={{ color: 'var(--wd-blue)' }} />
                <Modal.Title className="fs-6 fw-bold text-dark mb-0">
                  {t('briefings.detail_title', 'Biên Bản Giao Ban:')} {selectedBriefing.handover_category === 'HOSPITAL_BRIEFING' ? t('briefings.entire_hospital', 'Bệnh Viện') : selectedBriefing.department_name}
                </Modal.Title>
              </div>
            </Modal.Header>

            <Modal.Body className="p-4">
              {/* Header Box */}
              <div className="p-3 rounded-2 border mb-3 bg-light">
                <Row className="g-2 small">
                  <Col md={6}>
                    <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>
                      {t('briefings.detail_level', 'Cấp Giao Ban')}
                    </div>
                    <div className="fw-semibold text-dark fs-6 mt-0.5">
                      {selectedBriefing.handover_category === 'HOSPITAL_BRIEFING'
                        ? `🏛️ ${t('briefings.level_hospital', 'Giao Ban Toàn Viện')}`
                        : `🩺 ${t('briefings.level_dept', 'Giao Ban Khoa')}: ${selectedBriefing.department_name || selectedBriefing.department_code}`}
                    </div>
                    <div className="text-secondary small mt-0.5">
                      {t('briefings.detail_time', 'Thời điểm ghi:')} {selectedBriefing.created_at ? selectedBriefing.created_at.slice(0, 16).replace('T', ' ') : ''}
                    </div>
                  </Col>

                  <Col md={6}>
                    <div className="text-muted text-uppercase fw-bold" style={{ fontSize: '10px' }}>
                      {t('briefings.detail_logger', 'Người Ghi Biên Bản')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">
                      {selectedBriefing.logged_by_name || selectedBriefing.logged_by}
                    </div>
                    <div className="text-secondary small mt-0.5">
                      {t('briefings.detail_dept_default', 'Phòng Kế Hoạch Tổng Hợp / Khoa Lâm Sàng')}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* 24h Metrics Box */}
              <div className="p-3 rounded-2 border mb-3 bg-white">
                <div className="text-muted text-uppercase fw-bold mb-2 small" style={{ fontSize: '10px' }}>
                  {t('briefings.detail_metrics_title', 'Số Liệu Báo Cáo 24 Giờ Qua')}
                </div>
                {(() => {
                  const m = parseMetrics(selectedBriefing.summary_metrics);
                  return (
                    <Row className="g-2 text-center">
                      <Col xs={6} sm={3}>
                        <div className="p-2 border rounded-2 bg-light">
                          <div className="text-muted small" style={{ fontSize: '11px' }}>{t('briefings.metric_label_emergency', 'Khám cấp cứu')}</div>
                          <div className="fs-5 fw-bold text-danger">{m.emergency}</div>
                        </div>
                      </Col>
                      <Col xs={6} sm={3}>
                        <div className="p-2 border rounded-2 bg-light">
                          <div className="text-muted small" style={{ fontSize: '11px' }}>{t('briefings.metric_label_admission', 'Vào viện')}</div>
                          <div className="fs-5 fw-bold text-primary">{m.admitted}</div>
                        </div>
                      </Col>
                      <Col xs={6} sm={3}>
                        <div className="p-2 border rounded-2 bg-light">
                          <div className="text-muted small" style={{ fontSize: '11px' }}>{t('briefings.metric_label_surgery', 'Mổ cấp cứu')}</div>
                          <div className="fs-5 fw-bold text-warning-emphasis">{m.surgeries}</div>
                        </div>
                      </Col>
                      <Col xs={6} sm={3}>
                        <div className="p-2 border rounded-2 bg-light">
                          <div className="text-muted small" style={{ fontSize: '11px' }}>{t('briefings.metric_label_critical', 'Tử vong / Nặng')}</div>
                          <div className="fs-5 fw-bold text-dark">{m.deaths}</div>
                        </div>
                      </Col>
                    </Row>
                  );
                })()}
              </div>

              {/* Storage Details */}
              {selectedBriefing.doc_type === 'PHYSICAL_BOOK' && (
                <div className="p-3 rounded-2 border mb-3 bg-warning-subtle text-warning-emphasis small">
                  <div className="fw-bold mb-1 d-flex align-items-center gap-1.5">
                    <BookOpen size={15} />
                    <span>{t('briefings.physical_storage_title', 'LƯU TRỮ TẠI SỔ GIAO BAN VẬT LÝ')}</span>
                  </div>
                  <div>{t('briefings.book_name_label', 'Tên quyển sổ:')} <strong>{selectedBriefing.physical_book_name || t('briefings.default_book_name', 'Sổ giao ban bệnh viện')}</strong></div>
                  <div>{t('briefings.book_page_label', 'Số trang biên bản:')} <strong>{selectedBriefing.physical_book_page || t('handovers.unspecified_page', 'Chưa ghi trang')}</strong></div>
                  <div>{t('briefings.book_location_label', 'Vị trí tủ lưu:')} <strong>{selectedBriefing.physical_storage_location || t('briefings.default_khth', 'Phòng KHTH')}</strong></div>
                </div>
              )}

              {selectedBriefing.doc_type === 'IMAGE_UPLOAD' && selectedBriefing.file_url && (
                <div className="mb-3">
                  <label className="wd-label">{t('briefings.signed_photo_label', 'Ảnh Chụp Trang Sổ Giao Ban Có Chữ Ký')}</label>
                  <div className="border rounded-2 p-2 text-center bg-light">
                    <img
                      src={selectedBriefing.file_url}
                      alt={t('briefings.signed_photo_alt', 'Ảnh trang sổ')}
                      className="img-fluid rounded"
                      style={{ maxHeight: '350px', cursor: 'pointer' }}
                      onClick={() => setPreviewImage(selectedBriefing.file_url || null)}
                    />
                    <div className="small text-muted mt-1">{t('briefings.click_to_zoom', 'Nhấp vào ảnh để xem toàn màn hình')}</div>
                  </div>
                </div>
              )}

              {selectedBriefing.doc_type === 'DOCUMENT_LINK' && selectedBriefing.external_link && (
                <div className="p-3 rounded-2 border mb-3 bg-light">
                  <div className="text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '10px' }}>
                    {t('briefings.online_doc_link', 'Tài Liệu Liên Kết Trực Tuyến')}
                  </div>
                  <a
                    href={selectedBriefing.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary fw-medium text-break d-inline-flex align-items-center gap-1"
                  >
                    <span>{selectedBriefing.external_link}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {/* Directive & Conclusions */}
              <div className="mb-2">
                <label className="wd-label">
                  {t('briefings.conclusion_title', 'Ý Kiến Kết Luận & Chỉ Đạo Của Giám Đốc / Trưởng Khoa')}
                </label>
                <div
                  className="p-3 rounded-2 border text-dark"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: 'var(--wd-border)',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line'
                  }}
                >
                  {selectedBriefing.critical_notes || t('briefings.no_extra_directives', 'Không ghi nhận ý kiến chỉ đạo bổ sung.')}
                </div>
              </div>
            </Modal.Body>

            <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
              <button
                type="button"
                className="wd-pill-btn-outline"
                onClick={() => setShowDetailModal(false)}
              >
                {t('common.close', 'Đóng')}
              </button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Modal 2: Create Briefing */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered size="lg">
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fs-6 fw-bold text-dark">
              {t('briefings.modal_create_title', 'Lập Biên Bản Sổ Giao Ban')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Row className="g-3 mb-3">
              <Col md={6}>
                <label className="wd-label">{t('briefings.modal_level_label', 'Cấp Tổ Chức Giao Ban *')}</label>
                <select
                  required
                  aria-label={t('briefings.modal_level_label', 'Cấp Tổ Chức Giao Ban')}
                  value={briefingCategory}
                  onChange={(e) => setBriefingCategory(e.target.value as HandoverCategory)}
                  className="wd-select w-100"
                >
                  <option value="HOSPITAL_BRIEFING">{t('briefings.level_hospital', 'Giao Ban Toàn Viện')}</option>
                  <option value="DEPT_BRIEFING">{t('briefings.level_dept', 'Giao Ban Khoa Lâm Sàng')}</option>
                </select>
              </Col>

              <Col md={6}>
                <label className="wd-label">{t('briefings.modal_dept_label', 'Đơn Vị / Khoa Phòng Ghi Sổ *')}</label>
                <select
                  required
                  disabled={briefingCategory === 'HOSPITAL_BRIEFING'}
                  aria-label={t('briefings.modal_dept_label', 'Đơn Vị / Khoa Phòng Ghi Sổ')}
                  value={briefingCategory === 'HOSPITAL_BRIEFING' ? 'DEP-KHTH' : departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value)}
                  className="wd-select w-100"
                >
                  {briefingCategory === 'HOSPITAL_BRIEFING' ? (
                    <option value="DEP-KHTH">{t('briefings.modal_dept_khth', 'Phòng Kế Hoạch Tổng Hợp')}</option>
                  ) : (
                    departments?.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.name}
                      </option>
                    ))
                  )}
                </select>
              </Col>
            </Row>

            {/* 24h Metrics Inputs */}
            <div className="p-3 rounded-2 border mb-3 bg-light">
              <div className="fw-semibold text-dark small mb-2 d-flex align-items-center gap-1.5">
                <Activity size={15} className="text-primary" />
                <span>{t('briefings.modal_metrics_title', 'Số Liệu Thống Kê 24 Giờ Qua')}</span>
              </div>
              <Row className="g-2">
                <Col xs={6} md={3}>
                  <label className="form-label small text-muted mb-1">{t('briefings.modal_opt_emergency', 'Khám Cấp Cứu')}</label>
                  <input
                    type="number"
                    min="0"
                    className="wd-input w-100"
                    value={metricEmergency}
                    onChange={(e) => setMetricEmergency(parseInt(e.target.value) || 0)}
                  />
                </Col>
                <Col xs={6} md={3}>
                  <label className="form-label small text-muted mb-1">{t('briefings.modal_opt_admission', 'Vào Viện')}</label>
                  <input
                    type="number"
                    min="0"
                    className="wd-input w-100"
                    value={metricAdmitted}
                    onChange={(e) => setMetricAdmitted(parseInt(e.target.value) || 0)}
                  />
                </Col>
                <Col xs={6} md={3}>
                  <label className="form-label small text-muted mb-1">{t('briefings.modal_opt_surgery', 'Mổ Cấp Cứu')}</label>
                  <input
                    type="number"
                    min="0"
                    className="wd-input w-100"
                    value={metricSurgeries}
                    onChange={(e) => setMetricSurgeries(parseInt(e.target.value) || 0)}
                  />
                </Col>
                <Col xs={6} md={3}>
                  <label className="form-label small text-muted mb-1">{t('briefings.modal_opt_death', 'Tử Vong / Tiên Lượng')}</label>
                  <input
                    type="number"
                    min="0"
                    className="wd-input w-100"
                    value={metricDeaths}
                    onChange={(e) => setMetricDeaths(parseInt(e.target.value) || 0)}
                  />
                </Col>
              </Row>
            </div>

            {/* Document Option Radio Cards */}
            <div className="mb-3">
              <label className="wd-label mb-2">{t('briefings.modal_storage_type', 'Hình Thức Lưu Trữ Biên Bản Sổ Giao Ban *')}</label>
              <Row className="g-2">
                <Col sm={6} md={4}>
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
                    <span style={{ fontSize: '12px' }}>{t('briefings.modal_opt_physical', '1. Sổ Giao Ban Vật Lý')}</span>
                  </div>
                </Col>

                <Col sm={6} md={4}>
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
                    <span style={{ fontSize: '12px' }}>{t('briefings.modal_opt_upload', '2. Tải Ảnh Chụp Sổ')}</span>
                  </div>
                </Col>

                <Col sm={6} md={4}>
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
                    <span style={{ fontSize: '12px' }}>{t('briefings.modal_opt_link', '3. Dán Link Biên Bản')}</span>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Dynamic Input based on docType */}
            {docType === 'PHYSICAL_BOOK' && (
              <div className="p-3 rounded-2 border mb-3 bg-light">
                <div className="fw-semibold text-dark small mb-2 d-flex align-items-center gap-1.5">
                  <BookOpen size={14} className="text-primary" />
                  <span>{t('briefings.modal_section_physical', 'Khai Báo Thông Tin Sổ Giao Ban Giấy')}</span>
                </div>
                <Row className="g-2">
                  <Col md={6}>
                    <label className="form-label small text-muted mb-1">{t('briefings.modal_book_name', 'Tên Quyển Sổ *')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('briefings.modal_book_placeholder', 'VD: Sổ Giao Ban Toàn Viện - Quyển 01/2026')}
                      className="wd-input w-100"
                      value={physicalBookName}
                      onChange={(e) => setPhysicalBookName(e.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <label className="form-label small text-muted mb-1">{t('briefings.modal_book_page', 'Số Trang Biên Bản *')}</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Trang 88 - 89"
                      className="wd-input w-100"
                      value={physicalBookPage}
                      onChange={(e) => setPhysicalBookPage(e.target.value)}
                    />
                  </Col>
                  <Col md={12}>
                    <label className="form-label small text-muted mb-1">{t('briefings.modal_book_location', 'Vị Trí Tủ Lưu Trữ Hồ Sơ Giao Ban')}</label>
                    <input
                      type="text"
                      placeholder={t('briefings.modal_location_placeholder', 'VD: Tủ hồ sơ phòng KHTH / Phòng Trưởng khoa')}
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
                  <span>{t('briefings.modal_section_upload', 'Tải Lên Ảnh Chụp Trang Sổ Giao Ban Đã Có Kết Luận & Chữ Ký')}</span>
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
                      alt="Preview"
                      className="img-thumbnail"
                      style={{ maxHeight: '180px' }}
                    />
                    <div className="small text-success mt-1">{t('handovers.image_selected_success', 'Đã chọn ảnh thành công!')}</div>
                  </div>
                )}
              </div>
            )}

            {docType === 'DOCUMENT_LINK' && (
              <div className="p-3 rounded-2 border mb-3 bg-light">
                <div className="fw-semibold text-dark small mb-2 d-flex align-items-center gap-1.5">
                  <LinkIcon size={14} className="text-info" />
                  <span>{t('briefings.modal_section_link', 'Dán Liên Kết Biên Bản Giao Ban')}</span>
                </div>
                <input
                  type="url"
                  required
                  placeholder={t('briefings.modal_link_placeholder', 'https://docs.google.com/... hoặc link hồ sơ nội bộ')}
                  className="wd-input w-100"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                />
              </div>
            )}

            <Form.Group className="mb-3">
              <label className="wd-label">
                {t('briefings.modal_conclusion_label', 'Ý Kiến Kết Luận & Chỉ Đạo Của Chủ Trì *')}
              </label>
              <textarea
                rows={4}
                required
                placeholder={t('briefings.modal_conclusion_placeholder', 'Ghi nhận đánh giá tình hình ca trực, phân công mổ phiên, điều chuyển nhân lực, giải quyết vướng mắc phát sinh...')}
                value={criticalNotes}
                onChange={(e) => setCriticalNotes(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowCreateModal(false)}
            >
              {t('common.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={createBriefingMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {createBriefingMutation.isPending ? t('handovers.saving', 'Đang lưu...') : t('briefings.save_btn', 'Lưu Vào Sổ Giao Ban')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal 3: Fullscreen Image Preview */}
      <Modal show={!!previewImage} onHide={() => setPreviewImage(null)} size="lg" centered>
        <Modal.Header closeButton className="py-2">
          <Modal.Title className="fs-6 fw-bold">{t('briefings.photo_modal_title', 'Ảnh Chụp Sổ Giao Ban')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-2 text-center bg-dark">
          {previewImage && (
            <img
              src={previewImage}
              alt="Full Preview"
              className="img-fluid"
              style={{ maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export const DailyBriefingsPage = DailyBriefings;
export default DailyBriefings;
