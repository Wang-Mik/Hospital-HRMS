import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Modal,
  Form,
  Alert
} from 'react-bootstrap';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Lock,
  Edit3,
  Camera,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  FileText,
  Award,
  CheckCircle2,
  HeartHandshake,
  ShieldAlert,
  Info,
  BookOpen,
  HelpCircle,
  Stethoscope
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { employeeApi } from '../api/employeeApi';
import { useTranslation } from '../i18n/useTranslation';

export const PersonalInformation: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentStaffId = user?.employee_code || 'EMP-DOC-001';
  const { t, lang } = useTranslation();

  // Notification and Modals
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddEmergencyModal, setShowAddEmergencyModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Avatar Upload State
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<string | null>(null);

  // Editable Form States (Contact Info)
  const [personalEmail, setPersonalEmail] = useState('');
  const [personalPhone, setPersonalPhone] = useState('');
  const [homePhone, setHomePhone] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [cityProvince, setCityProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Editable Form States (Personal Info)
  const [maritalStatus, setMaritalStatus] = useState<'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'>('MARRIED');

  // Form States (Emergency Contact)
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('SPOUSE');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyPriority, setEmergencyPriority] = useState('Primary');

  // 1. Fetch live employee data from database
  const { data: employeeData, isLoading: isEmpLoading } = useQuery({
    queryKey: ['employeeDetail', currentStaffId],
    queryFn: () => employeeApi.getById(currentStaffId),
    staleTime: 10000
  });

  // 2. Fetch live emergency contacts from database
  const { data: serverEmergencyContacts, isLoading: isContactsLoading } = useQuery({
    queryKey: ['emergencyContacts', currentStaffId],
    queryFn: () => employeeApi.getEmergencyContacts(currentStaffId),
    staleTime: 10000
  });

  // Synchronize form fields when data loads
  useEffect(() => {
    if (employeeData) {
      setPersonalEmail(employeeData.personal_email || '');
      setPersonalPhone(employeeData.personal_phone || '');
      setHomePhone(employeeData.home_phone || '');
      setHomeAddress(employeeData.home_address || '');
      setDistrict(employeeData.district || '');
      setCityProvince(employeeData.city_province || '');
      setPostalCode(employeeData.postal_code || '');
      setMaritalStatus(employeeData.marital_status || 'MARRIED');
    }
  }, [employeeData]);

  const handleCloseEditModal = () => {
    setShowEditProfileModal(false);
    if (employeeData) {
      setPersonalEmail(employeeData.personal_email || '');
      setPersonalPhone(employeeData.personal_phone || '');
      setHomePhone(employeeData.home_phone || '');
      setHomeAddress(employeeData.home_address || '');
      setDistrict(employeeData.district || '');
      setCityProvince(employeeData.city_province || '');
      setPostalCode(employeeData.postal_code || '');
      setMaritalStatus(employeeData.marital_status || 'MARRIED');
    }
  };

  // Mutation: Update Profile
  const updateProfileMutation = useMutation({
    mutationFn: (payload: any) => employeeApi.updateProfile(currentStaffId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDetail', currentStaffId] });
      setShowEditProfileModal(false);
      setToastMsg({ type: 'success', text: t('personal.save_success', 'Thông tin hồ sơ đã được lưu thành công vào cơ sở dữ liệu!') });
      setTimeout(() => setToastMsg(null), 4000);
    },
    onError: (err: any) => {
      setToastMsg({ type: 'danger', text: err.response?.data?.message || t('personal.save_error', 'Không thể lưu hồ sơ') });
    }
  });

  // Mutation: Update Avatar
  const updateAvatarMutation = useMutation({
    mutationFn: (avatarUrl: string) => employeeApi.updateAvatar(currentStaffId, avatarUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDetail', currentStaffId] });
      setShowPhotoModal(false);
      setSelectedAvatarFile(null);
      setToastMsg({ type: 'success', text: t('personal.avatar_saved', 'Ảnh đại diện thẻ cán bộ y tế đã được lưu vào cơ sở dữ liệu!') });
      setTimeout(() => setToastMsg(null), 4000);
    },
    onError: (err: any) => {
      setToastMsg({ type: 'danger', text: err.response?.data?.message || t('personal.save_error', 'Không thể cập nhật ảnh thẻ') });
    }
  });

  // Mutation: Add Emergency Contact
  const addEmergencyMutation = useMutation({
    mutationFn: (payload: any) => employeeApi.addEmergencyContact(currentStaffId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencyContacts', currentStaffId] });
      setShowAddEmergencyModal(false);
      setEmergencyName('');
      setEmergencyPhone('');
      setToastMsg({ type: 'success', text: t('personal.contact_saved', 'Người liên hệ khẩn cấp đã được ghi nhận vào cơ sở dữ liệu!') });
      setTimeout(() => setToastMsg(null), 4000);
    },
    onError: (err: any) => {
      setToastMsg({ type: 'danger', text: err.response?.data?.message || t('personal.save_error', 'Lỗi khi thêm liên hệ khẩn cấp') });
    }
  });

  // Mutation: Delete Emergency Contact
  const deleteEmergencyMutation = useMutation({
    mutationFn: (contactId: string | number) => employeeApi.deleteEmergencyContact(currentStaffId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencyContacts', currentStaffId] });
      setToastMsg({ type: 'success', text: t('personal.contact_deleted', 'Đã xóa người liên hệ khẩn cấp khỏi cơ sở dữ liệu.') });
      setTimeout(() => setToastMsg(null), 4000);
    },
    onError: (err: any) => {
      setToastMsg({ type: 'danger', text: err.response?.data?.message || t('personal.save_error', 'Lỗi khi xóa người liên hệ') });
    }
  });

  // Handle Photo File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(t('personal.photo_note', 'Dung lượng ảnh tối đa là 2MB'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedAvatarFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = () => {
    if (selectedAvatarFile) {
      updateAvatarMutation.mutate(selectedAvatarFile);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      personal_email: personalEmail,
      personal_phone: personalPhone,
      home_phone: homePhone,
      home_address: homeAddress,
      district,
      city_province: cityProvince,
      postal_code: postalCode,
      marital_status: maritalStatus
    });
  };

  const handleSaveEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyName || !emergencyPhone) return;
    addEmergencyMutation.mutate({
      contact_name: emergencyName,
      relationship: emergencyRelation,
      phone_number: emergencyPhone,
      priority: emergencyPriority
    });
  };

  // Derived display values
  const legalName = employeeData
    ? `${employeeData.last_name} ${employeeData.first_name}`.trim()
    : (user?.name || t('personal.default_staff_name', 'Cán Bộ Y Tế'));

  const roleTitle = employeeData?.role === 'DEPARTMENT_HEAD'
    ? t('roles.DEPARTMENT_HEAD', 'Trưởng Khoa Lâm Sàng')
    : employeeData?.role === 'DOCTOR'
    ? t('roles.DOCTOR', 'Bác Sĩ Điều Trị')
    : employeeData?.role === 'NURSE'
    ? t('roles.NURSE', 'Điều Dưỡng Viên')
    : t('roles.STAFF', 'Cán Bộ Y Tế');

  const departmentTitle = employeeData?.department_name || (employeeData?.department_code ? `${t('nav.department', 'Khoa')} ${employeeData.department_code}` : t('departments.clinical_dept', 'Khoa Lâm Sàng'));
  const workEmail = employeeData?.email || '—';
  const workPhone = employeeData?.phone || '—';
  const nationalId = employeeData?.national_id || '—';
  const dob = employeeData?.dob ? employeeData.dob.split('T')[0] : '—';
  const gender = employeeData?.gender === 'MALE' ? t('personal.gender_male', 'Nam') : employeeData?.gender === 'FEMALE' ? t('personal.gender_female', 'Nữ') : (employeeData?.gender || '—');
  const nationality = employeeData?.nationality || t('personal.val_country', 'Việt Nam');
  const workLocation = employeeData?.work_location || '—';
  const avatarUrl = employeeData?.avatar_url;

  const maritalDisplay = maritalStatus === 'MARRIED'
    ? t('personal.married', 'Đã kết hôn')
    : maritalStatus === 'SINGLE'
    ? t('personal.single', 'Độc thân')
    : maritalStatus === 'DIVORCED'
    ? t('personal.divorced', 'Ly hôn')
    : t('personal.widowed', 'Góa');

  const emergencyList = (serverEmergencyContacts && serverEmergencyContacts.length > 0)
    ? serverEmergencyContacts
    : [];

  return (
    <Container fluid className="px-0">
      {/* Single-Task Header */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-3">
        <div>
          <h1 className="wd-page-title">{t('personal.title', 'Hồ Sơ Cán Bộ Y Tế')}</h1>
          <p className="wd-page-subtitle">
            {t('personal.subtitle', 'Quản lý thông tin cán bộ, chứng chỉ hành nghề và liên hệ khẩn cấp')}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="wd-pill-btn-outline"
            onClick={() => setShowPhotoModal(true)}
          >
            <Camera size={14} />
            <span>{t('personal.sub_change_avatar', 'Đổi Ảnh Đại Diện')}</span>
          </button>
          <button
            type="button"
            className="wd-pill-btn-primary"
            onClick={() => setShowEditProfileModal(true)}
          >
            <Edit3 size={14} />
            <span>{t('common.edit', 'Cập Nhật Thông Tin')}</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <Alert
          variant={toastMsg.type}
          dismissible
          onClose={() => setToastMsg(null)}
          className="d-flex align-items-center gap-2 py-2.5 mb-4 small rounded-2"
        >
          <CheckCircle2 size={16} />
          <span>{toastMsg.text}</span>
        </Alert>
      )}

      {/* Tab Strip */}
      <div className="wd-tabs">
        <button
          type="button"
          className="wd-tab-btn active"
        >
          {t('personal.title', 'Thông Tin Cá Nhân')}
        </button>
      </div>

      {/* 2-Column Layout */}
      <Row className="g-4">
        {/* COLUMN 1 */}
        <Col lg={7} xl={8}>
          {/* CARD 1 */}
          <div className="wd-card mb-4">
            <div className="wd-card-header">
              <div className="d-flex align-items-center gap-2">
                <User size={16} style={{ color: 'var(--wd-blue)' }} />
                <span className="wd-card-title">{t('personal.title', 'Thông Tin Cá Nhân')}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                style={{ color: 'var(--wd-blue)', fontSize: '13px' }}
                onClick={() => setShowEditProfileModal(true)}
              >
                {t('common.edit', 'Chỉnh sửa thông tin')}
              </button>
            </div>

            <div className="wd-card-body">
              {/* Avatar + Basic Identity Banner */}
              <div className="d-flex align-items-center gap-3 pb-3 mb-3 border-bottom" style={{ borderColor: 'var(--wd-border-light)' }}>
                <div className="position-relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={legalName}
                      className="rounded-circle object-fit-cover shadow-sm border"
                      style={{ width: '68px', height: '68px', borderColor: 'var(--wd-border)' }}
                    />
                  ) : (
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                      style={{
                        width: '68px',
                        height: '68px',
                        fontSize: '24px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      }}
                    >
                      {legalName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <button
                    type="button"
                    className="position-absolute bottom-0 end-0 btn btn-sm btn-light rounded-circle p-1 shadow-sm border"
                    title={t('personal.sub_change_avatar', 'Thay đổi ảnh thẻ cá nhân')}
                    onClick={() => setShowPhotoModal(true)}
                    style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Camera size={12} className="text-secondary" />
                  </button>
                </div>

                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-dark" style={{ fontSize: '16.5px', letterSpacing: '-0.01em' }}>
                      {legalName}
                    </span>
                    <span className="wd-badge-locked" title={t('personal.guidance_legal_note', 'Các trường định danh pháp lý được khóa bởi Phòng Tổ Chức Cán Bộ để đảm bảo an toàn hành nghề y.')}>
                      <Lock size={10} /> {t('personal.badge_hr_locked', 'Khóa bởi HR')}
                    </span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '13px' }}>
                    {roleTitle} &bull; <span className="font-mono text-dark fw-semibold">{currentStaffId}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '12px' }}>
                    {departmentTitle}
                  </div>
                </div>
              </div>

              {/* Personal Details Table */}
              <Row className="g-3" style={{ fontSize: '13px' }}>
                <Col sm={6}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                      {t('personal.lbl_legal_name', 'Họ và Tên Pháp Lý')}
                    </span>
                    <span className="wd-badge-locked"><Lock size={9} /> {t('personal.badge_locked', 'Khóa')}</span>
                  </div>
                  <div className="fw-semibold text-dark">{legalName}</div>
                </Col>

                <Col sm={6}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                      {t('personal.employee_id', 'Mã Cán Bộ')}
                    </span>
                    <span className="wd-badge-locked"><Lock size={9} /> {t('personal.badge_locked', 'Khóa')}</span>
                  </div>
                  <div className="fw-bold font-mono text-dark">{currentStaffId}</div>
                </Col>

                <Col sm={6}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                      {t('personal.marital_status', 'Tình Trạng Hôn Nhân')}
                    </span>
                    <span
                      className="wd-badge-editable cursor-pointer"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowEditProfileModal(true)}
                    >
                      <Edit3 size={9} /> {t('personal.badge_editable', 'Cho phép sửa')}
                    </span>
                  </div>
                  <div className="fw-semibold text-dark">{maritalDisplay}</div>
                </Col>

                <Col sm={6}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                      {t('personal.gender', 'Giới Tính')}
                    </span>
                    <span className="wd-badge-locked"><Lock size={9} /> {t('personal.badge_locked', 'Khóa')}</span>
                  </div>
                  <div className="fw-semibold text-dark">{gender}</div>
                </Col>

                <Col sm={6}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                      {t('personal.dob', 'Ngày Sinh')}
                    </span>
                    <span className="wd-badge-locked"><Lock size={9} /> {t('personal.badge_locked', 'Khóa')}</span>
                  </div>
                  <div className="fw-semibold font-mono text-dark">{dob}</div>
                </Col>

                <Col sm={6}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                      {t('personal.national_id', 'Số Định Danh Cá Nhân')}
                    </span>
                    <span className="wd-badge-locked"><Lock size={9} /> {t('personal.badge_locked', 'Khóa')}</span>
                  </div>
                  <div className="fw-bold font-mono text-dark">{nationalId}</div>
                </Col>

                <Col sm={6}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                      {t('personal.nationality', 'Quốc Tịch')}
                    </span>
                    <span className="wd-badge-locked"><Lock size={9} /> {t('personal.badge_locked', 'Khóa')}</span>
                  </div>
                  <div className="fw-semibold text-dark">{nationality}</div>
                </Col>

                <Col sm={6}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                      {t('personal.lbl_hire_date', 'Ngày Ký Hợp Đồng')}
                    </span>
                    <span className="wd-badge-locked"><Lock size={9} /> {t('personal.badge_locked', 'Khóa')}</span>
                  </div>
                  <div className="fw-semibold font-mono text-dark">{employeeData?.hire_date || '2021-01-01'}</div>
                </Col>
              </Row>

              <div className="mt-3 pt-2 border-top text-muted d-flex align-items-center justify-content-between" style={{ borderColor: 'var(--wd-border-light)', fontSize: '11.5px' }}>
                <span>
                  <Lock size={12} className="me-1 text-secondary" />
                  {t('personal.guidance_legal_note', 'Các trường định danh pháp lý được khóa bởi Phòng Tổ Chức Cán Bộ để đảm bảo an toàn hành nghề y.')}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                  style={{ color: 'var(--wd-blue)', fontSize: '12.5px' }}
                  onClick={() => setShowEditProfileModal(true)}
                >
                  {t('common.edit', 'Cập nhật hồ sơ')}
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: PERSONAL CONTACT DETAILS */}
          <div className="wd-card mb-4">
            <div className="wd-card-header">
              <div className="d-flex align-items-center gap-2">
                <Phone size={16} style={{ color: 'var(--wd-blue)' }} />
                <span className="wd-card-title">{t('personal.card_contact_title', 'Thông Tin Liên Hệ Cá Nhân')}</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span className="wd-badge-editable">
                  <Edit3 size={9} /> {t('personal.badge_editable', 'Tự cập nhật')}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                  style={{ color: 'var(--wd-blue)', fontSize: '13px' }}
                  onClick={() => setShowEditProfileModal(true)}
                >
                  {t('common.edit', 'Chỉnh sửa')}
                </button>
              </div>
            </div>

            <div className="wd-card-body">
              <Row className="g-3" style={{ fontSize: '13px' }}>
                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.phone', 'Điện Thoại Di Động')}
                  </div>
                  <div className="fw-semibold font-mono text-dark mt-0.5">{personalPhone || '—'}</div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.lbl_home_phone', 'Điện Thoại Nhà Riêng')}
                  </div>
                  <div className="fw-semibold font-mono text-dark mt-0.5">{homePhone || '—'}</div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.personal_email', 'Email Cá Nhân')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">{personalEmail || '—'}</div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.lbl_address_usage', 'Mục Đích Sử Dụng')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">{t('personal.val_primary_home', 'Địa chỉ thường trú chính')}</div>
                </Col>

                <Col sm={12}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.address', 'Địa Chỉ Nhà Riêng')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">
                    {homeAddress ? `${homeAddress}${district ? `, ${district}` : ''}${cityProvince ? `, ${cityProvince}` : ''}` : '—'}
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.lbl_country', 'Quốc Gia')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">{t('personal.val_country', 'Việt Nam')}</div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.lbl_postal_code', 'Mã Bưu Chính')}
                  </div>
                  <div className="fw-bold font-mono text-dark mt-0.5">{postalCode || '—'}</div>
                </Col>
              </Row>

              <div className="mt-3 pt-2 border-top text-end" style={{ borderColor: 'var(--wd-border-light)' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                  style={{ color: 'var(--wd-blue)', fontSize: '12.5px' }}
                  onClick={() => setShowEditProfileModal(true)}
                >
                  {t('common.edit', 'Cập nhật hồ sơ')}...
                </button>
              </div>
            </div>
          </div>

          {/* CARD 3: WORK CONTACT DETAILS */}
          <div className="wd-card mb-4">
            <div className="wd-card-header">
              <div className="d-flex align-items-center gap-2">
                <Building2 size={16} style={{ color: 'var(--wd-blue)' }} />
                <span className="wd-card-title">{t('personal.card_work_contact_title', 'Thông Tin Liên Hệ Công Tác')}</span>
              </div>
              <span className="wd-badge-locked">
                <Lock size={9} /> {t('personal.badge_hospital_managed', 'Quản lý bởi Bệnh viện')}
              </span>
            </div>

            <div className="wd-card-body">
              <Row className="g-3" style={{ fontSize: '13px' }}>
                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.lbl_work_phone', 'Điện Thoại Công Tác')}
                  </div>
                  <div className="fw-semibold font-mono text-dark mt-0.5">{workPhone}</div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.work_email', 'Email Công Vụ')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">
                    <a href={`mailto:${workEmail}`} className="text-decoration-none" style={{ color: 'var(--wd-blue)' }}>
                      {workEmail}
                    </a>
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('nav.department', 'Khoa / Phòng')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">{departmentTitle}</div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.lbl_hospital_facility', 'Cơ Sở Làm Việc')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">{workLocation}</div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.lbl_work_location', 'Vị Trí Làm Việc')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">{departmentTitle}</div>
                </Col>

                <Col sm={6}>
                  <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>
                    {t('personal.lbl_hospital_address', 'Địa Chỉ Bệnh Viện')}
                  </div>
                  <div className="fw-semibold text-dark mt-0.5">{t('personal.val_hospital_address', '215 Hồng Bàng, Phường 11, Quận 5, TP.HCM')}</div>
                </Col>
              </Row>
            </div>
          </div>
        </Col>

        {/* COLUMN 2 */}
        <Col lg={5} xl={4}>
          <div className="text-muted text-uppercase fw-bold mb-2" style={{ fontSize: '11px', letterSpacing: '0.06em' }}>
            {t('personal.quick_actions_header', 'Tác Vụ & Liên Hệ')}
          </div>

          <div className="wd-hover-action-card">
            <div className="wd-hover-action-header">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: '13.5px' }}>
                  {t('personal.action_profile_title', 'Thao Tác Hồ Sơ')}
                </div>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  {t('personal.action_profile_sub', 'Rê chuột để mở các tùy chọn chỉnh sửa')}
                </div>
              </div>
              <ChevronRight size={15} className="text-muted" />
            </div>

            <div className="wd-hover-subpanel">
              <div
                className="wd-sub-action-item"
                onClick={() => setShowPhotoModal(true)}
              >
                <div className="d-flex align-items-center gap-2">
                  <Camera size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.sub_change_avatar', 'Thay Đổi Ảnh Đại Diện')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.sub_change_avatar_desc', 'Tải lên và lưu ảnh thẻ trực tiếp vào CSDL')}</div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-muted" />
              </div>

              <div
                className="wd-sub-action-item"
                onClick={() => setShowEditProfileModal(true)}
              >
                <div className="d-flex align-items-center gap-2">
                  <Phone size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.sub_contact_info', 'Thông Tin Liên Hệ')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.sub_contact_desc', 'Cập nhật SĐT di động, email riêng, địa chỉ nhà')}</div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-muted" />
              </div>

              <div
                className="wd-sub-action-item"
                onClick={() => setShowEditProfileModal(true)}
              >
                <div className="d-flex align-items-center gap-2">
                  <User size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.marital_status', 'Tình Trạng Hôn Nhân')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.sub_marital_desc', 'Đăng ký cập nhật tình trạng hôn nhân')}</div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-muted" />
              </div>
            </div>
          </div>

          {/* ITEM 2: EMERGENCY CONTACTS */}
          <div className="wd-hover-action-card">
            <div className="wd-hover-action-header">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: '13.5px' }}>
                  {t('personal.emergency_contact', 'Người Liên Hệ Khẩn Cấp')}
                </div>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  {`${t('personal.registered_contacts_prefix', 'Đã đăng ký')} ${emergencyList.length} ${t('personal.registered_contacts_suffix', 'người thân')}`}
                </div>
              </div>
              <ChevronRight size={15} className="text-muted" />
            </div>

            <div className="wd-hover-subpanel">
              <div
                className="wd-sub-action-item"
                onClick={() => setShowAddEmergencyModal(true)}
              >
                <div className="d-flex align-items-center gap-2">
                  <Plus size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.sub_add_contact', 'Thêm Người Thân Khẩn Cấp')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.sub_add_contact_desc', 'Đăng ký người liên hệ khẩn cấp mới')}</div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-muted" />
              </div>

              <div
                className="wd-sub-action-item"
                onClick={() => {
                  const el = document.getElementById('emergency-contacts-table');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <HeartHandshake size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.sub_view_contacts', 'Tra Cứu Danh Sách Người Thân')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.sub_view_contacts_desc', 'Xem và quản lý quyền ưu tiên liên lạc')}</div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-muted" />
              </div>
            </div>
          </div>

          {/* ITEM 3: ADDITIONAL ACTIONS */}
          <div className="wd-hover-action-card">
            <div className="wd-hover-action-header">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: '13.5px' }}>
                  {t('personal.action_extra_title', 'Tác Vụ Bổ Sung')}
                </div>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  {t('personal.action_extra_sub', 'Xuất chứng nhận & Giấy tờ công tác')}
                </div>
              </div>
              <ChevronRight size={15} className="text-muted" />
            </div>

            <div className="wd-hover-subpanel">
              <div
                className="wd-sub-action-item"
                onClick={() => {
                  setToastMsg({ type: 'success', text: t('personal.toast_cert_sent', 'Đã gửi yêu cầu cấp Giấy xác nhận công tác đến Phòng Nhân sự.') });
                  setTimeout(() => setToastMsg(null), 4000);
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <FileText size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.sub_work_cert', 'Giấy Xác Nhận Công Tác')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.sub_work_cert_desc', 'Xuất chứng nhận công tác điện tử có ký số')}</div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-muted" />
              </div>

              <div
                className="wd-sub-action-item"
                onClick={() => {
                  setToastMsg({ type: 'success', text: t('personal.toast_cchn_redirect', 'Chuyển tiếp đến cổng giám sát Chứng chỉ hành nghề Khám chữa bệnh Bộ Y tế.') });
                  setTimeout(() => setToastMsg(null), 4000);
                }}
              >
                <div className="d-flex align-items-center gap-2">
                  <Award size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.practicing_license', 'Chứng Chỉ Hành Nghề')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.sub_license_desc', 'Đối chiếu CCHN và thời hạn chứng chỉ y tế')}</div>
                  </div>
                </div>
                <ChevronRight size={13} className="text-muted" />
              </div>
            </div>
          </div>

          {/* ITEM 4: HELPFUL LINKS */}
          <div className="wd-hover-action-card mb-4">
            <div className="wd-hover-action-header">
              <div>
                <div className="fw-bold text-dark" style={{ fontSize: '13.5px' }}>
                  {t('personal.action_policy_title', 'Chính Sách & Hướng Dẫn')}
                </div>
                <div className="text-muted" style={{ fontSize: '11px' }}>
                  {t('personal.action_policy_sub', 'Quy định nhân sự & bảo mật y tế')}
                </div>
              </div>
              <ChevronRight size={15} className="text-muted" />
            </div>

            <div className="wd-hover-subpanel">
              <div className="wd-sub-action-item">
                <div className="d-flex align-items-center gap-2">
                  <BookOpen size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.link_handbook', 'Sổ Tay Cán Bộ Y Tế 2026')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.link_handbook_desc', 'Quy chuẩn đạo đức y đức và văn hóa bệnh viện')}</div>
                  </div>
                </div>
                <ExternalLink size={12} className="text-muted" />
              </div>

              <div className="wd-sub-action-item">
                <div className="d-flex align-items-center gap-2">
                  <ShieldAlert size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.link_hipaa', 'Chính Sách Bảo Mật Bệnh Án')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.link_hipaa_desc', 'Tuân thủ HIPAA và an toàn dữ liệu y tế BYT')}</div>
                  </div>
                </div>
                <ExternalLink size={12} className="text-muted" />
              </div>

              <div className="wd-sub-action-item">
                <div className="d-flex align-items-center gap-2">
                  <HelpCircle size={14} style={{ color: 'var(--wd-blue)' }} />
                  <div>
                    <div className="fw-semibold">{t('personal.link_askhr', 'Hỗ Trợ Nhân Sự AskHR')}</div>
                    <div className="text-muted" style={{ fontSize: '11px' }}>{t('personal.link_askhr_desc', 'askhr@hospital.vn • Giải đáp thủ tục nhân sự')}</div>
                  </div>
                </div>
                <ExternalLink size={12} className="text-muted" />
              </div>
            </div>
          </div>

          {/* EMERGENCY CONTACTS LIVE TABLE */}
          <div id="emergency-contacts-table" className="wd-card">
            <div className="wd-card-header py-2.5">
              <div className="d-flex align-items-center gap-2">
                <HeartHandshake size={15} style={{ color: 'var(--wd-blue)' }} />
                <span className="wd-card-title" style={{ fontSize: '13.5px' }}>{t('personal.contacts_table_title', 'Danh Sách Người Thân')}</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                style={{ color: 'var(--wd-blue)', fontSize: '12px' }}
                onClick={() => setShowAddEmergencyModal(true)}
              >
                {t('personal.contacts_add_btn', '+ Thêm mới')}
              </button>
            </div>

            <div className="table-responsive">
              <table className="wd-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>{t('personal.th_name', 'Họ và Tên')}</th>
                    <th>{t('personal.th_relation', 'Quan Hệ')}</th>
                    <th>{t('personal.th_phone', 'Điện Thoại')}</th>
                    <th className="text-end">{t('personal.th_actions', 'Thao Tác')}</th>
                  </tr>
                </thead>
                <tbody>
                  {emergencyList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-3 text-muted">
                        {t('personal.contacts_no_data', 'Chưa có thông tin người liên hệ khẩn cấp.')}
                      </td>
                    </tr>
                  ) : (
                    emergencyList.map((c: any) => (
                      <tr key={c.id}>
                        <td>
                          <div className="fw-semibold text-dark">{c.contact_name}</div>
                          <div className="text-muted" style={{ fontSize: '10px' }}>
                            {c.priority === 'Secondary' ? t('personal.priority_secondary', 'Ưu tiên 2') : t('personal.priority_primary', 'Ưu tiên 1')}
                          </div>
                        </td>
                        <td className="text-secondary">
                          {c.relationship === 'PARENT' ? t('personal.relation_parent', 'Cha / Mẹ')
                            : c.relationship === 'SIBLING' ? t('personal.relation_sibling', 'Anh / Chị / Em')
                            : c.relationship === 'CHILD' ? t('personal.relation_child', 'Con cái')
                            : c.relationship === 'GUARDIAN' ? t('personal.relation_guardian', 'Người bảo hộ hợp pháp')
                            : t('personal.relation_spouse', 'Vợ / Chồng')}
                        </td>
                        <td className="fw-bold font-mono text-dark">{c.phone_number}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0"
                            title={t('personal.btn_delete_title', 'Xóa người liên hệ')}
                            onClick={() => deleteEmergencyMutation.mutate(c.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Col>
      </Row>

      {/* ========================================================================= */}
      {/* COMPREHENSIVE EDIT PROFILE MODAL (ALL FIELDS DISPLAYED - LOCKED & EDITABLE) */}
      {/* ========================================================================= */}
      <Modal
        show={showEditProfileModal}
        onHide={handleCloseEditModal}
        size="lg"
        centered
        scrollable
      >
        <Form onSubmit={handleSaveProfile}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
              <Edit3 size={17} style={{ color: 'var(--wd-blue)' }} />
              <span>{t('personal.modal_edit_title', 'Chỉnh Sửa Hồ Sơ Cá Nhân')}</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Guidance Banner */}
            <div className="mb-4 p-3 rounded-2" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '12.5px' }}>
              <div className="d-flex align-items-start gap-2">
                <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="fw-bold text-dark mb-0.5">{t('personal.modal_guideline_title', 'Quy định hiển thị & cập nhật thông tin hồ sơ:')}</div>
                  <div className="text-muted" style={{ fontSize: '12px', lineHeight: 1.5 }}>
                    &bull; <strong>{t('personal.guideline_locked_prefix', 'Các trường bị khóa')} (<Lock size={10} className="text-secondary mx-0.5" /> {t('personal.badge_hr_locked', 'Khóa bởi HR')}):</strong> {t('personal.guideline_locked_desc', 'Bao gồm thông tin định danh pháp lý và phân công chuyên môn. Hệ thống hiển thị đầy đủ để cán bộ đối chiếu xem xét nhưng không được tự ý sửa đổi.')}<br />
                    &bull; <strong>{t('personal.guideline_editable_prefix', 'Các trường cho phép sửa')} (<Edit3 size={10} className="text-success mx-0.5" /> {t('personal.badge_editable', 'Được sửa')}):</strong> {t('personal.guideline_editable_desc', 'Cán bộ y tế được chủ động cập nhật tình trạng hôn nhân và thông tin liên hệ thường trú. Dữ liệu sau khi lưu sẽ được cập nhật trực tiếp vào cơ sở dữ liệu.')}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: LOCKED / READ-ONLY FIELDS */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-1 border-bottom" style={{ borderColor: 'var(--wd-border)' }}>
                <div className="fw-bold text-dark d-flex align-items-center gap-1.5" style={{ fontSize: '13.5px' }}>
                  <Building2 size={15} style={{ color: 'var(--wd-blue)' }} />
                  <span>{t('personal.sec1_title', '1. Thông Tin Định Danh & Công Tác')}</span>
                </div>
                <span className="wd-badge-locked" style={{ fontSize: '10px' }}>
                  <Lock size={9} /> {t('personal.badge_hospital_managed', 'Quản lý bởi Bệnh viện')}
                </span>
              </div>

              <Row className="g-3">
                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.full_name', 'Họ và Tên')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light text-muted"
                      value={legalName}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.employee_id', 'Mã Cán Bộ')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light font-mono text-muted"
                      value={currentStaffId}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.national_id', 'Số CCCD')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light font-mono text-muted"
                      value={nationalId}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.dob', 'Ngày Sinh')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light font-mono text-muted"
                      value={dob}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.gender', 'Giới Tính')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light text-muted"
                      value={gender}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.nationality', 'Quốc Tịch')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light text-muted"
                      value={nationality}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.lbl_clinical_title', 'Chức Danh Chuyên Môn')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light text-muted"
                      value={roleTitle}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('nav.department', 'Khoa / Phòng')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light text-muted"
                      value={departmentTitle}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.lbl_work_location', 'Vị Trí Làm Việc')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light text-muted"
                      value={departmentTitle}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.lbl_hospital_facility', 'Cơ Sở Làm Việc')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light text-muted"
                      value={workLocation}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.work_email', 'Email Công Vụ')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light font-mono text-muted"
                      value={workEmail}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.lbl_work_phone', 'Điện Thoại Công Tác')}</label>
                      <span className="wd-badge-locked" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Lock size={8} /> {t('personal.badge_locked', 'Khóa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100 bg-light font-mono text-muted"
                      value={workPhone}
                      disabled
                      readOnly
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* SECTION 2: EDITABLE FIELDS */}
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3 pb-1 border-bottom" style={{ borderColor: 'var(--wd-border)' }}>
                <div className="fw-bold text-dark d-flex align-items-center gap-1.5" style={{ fontSize: '13.5px' }}>
                  <User size={15} style={{ color: 'var(--wd-green)' }} />
                  <span>{t('personal.sec2_title', '2. Thông Tin Tình Trạng Cá Nhân & Liên Hệ')}</span>
                </div>
                <span className="wd-badge-editable" style={{ fontSize: '10px' }}>
                  <Edit3 size={9} /> {t('personal.badge_editable', 'Được phép chỉnh sửa')}
                </span>
              </div>

              <Row className="g-3">
                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.marital_status', 'Tình Trạng Hôn Nhân')}</label>
                      <span className="wd-badge-editable" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Edit3 size={8} /> {t('personal.badge_editable', 'Sửa')}
                      </span>
                    </div>
                    <select
                      className="wd-select w-100"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value as any)}
                    >
                      <option value="MARRIED">{t('personal.married', 'Đã kết hôn')}</option>
                      <option value="SINGLE">{t('personal.single', 'Độc thân')}</option>
                      <option value="DIVORCED">{t('personal.divorced', 'Ly hôn')}</option>
                      <option value="WIDOWED">{t('personal.widowed', 'Góa')}</option>
                    </select>
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.personal_email', 'Email Cá Nhân')}</label>
                      <span className="wd-badge-editable" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Edit3 size={8} /> {t('personal.badge_editable', 'Sửa')}
                      </span>
                    </div>
                    <input
                      type="email"
                      className="wd-input w-100"
                      placeholder="nguyenvanan.md@gmail.com"
                      value={personalEmail}
                      onChange={(e) => setPersonalEmail(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.phone', 'Điện Thoại Di Động')}</label>
                      <span className="wd-badge-editable" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Edit3 size={8} /> {t('personal.badge_editable', 'Sửa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100"
                      placeholder="+84 912 345 678"
                      value={personalPhone}
                      onChange={(e) => setPersonalPhone(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col sm={6}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.lbl_home_phone', 'Điện Thoại Nhà Riêng')}</label>
                      <span className="wd-badge-editable" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Edit3 size={8} /> {t('personal.badge_editable', 'Sửa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100"
                      placeholder="+84 28 3855 4269"
                      value={homePhone}
                      onChange={(e) => setHomePhone(e.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col sm={12}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.address', 'Địa Chỉ Nhà Riêng')}</label>
                      <span className="wd-badge-editable" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Edit3 size={8} /> {t('personal.badge_editable', 'Sửa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100"
                      placeholder={t('personal.ph_address', '124/15 Nguyễn Tri Phương, Phường 9')}
                      value={homeAddress}
                      onChange={(e) => setHomeAddress(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col sm={4}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.lbl_district', 'Quận / Huyện')}</label>
                      <span className="wd-badge-editable" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Edit3 size={8} /> {t('personal.badge_editable', 'Sửa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100"
                      placeholder={t('personal.ph_district', 'Quận 5')}
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col sm={4}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.lbl_city_province', 'Tỉnh / Thành Phố')}</label>
                      <span className="wd-badge-editable" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Edit3 size={8} /> {t('personal.badge_editable', 'Sửa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100"
                      placeholder={t('personal.ph_city', 'TP. Hồ Chí Minh')}
                      value={cityProvince}
                      onChange={(e) => setCityProvince(e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>

                <Col sm={4}>
                  <Form.Group>
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <label className="wd-label mb-0">{t('personal.lbl_postal_code', 'Mã Bưu Chính')}</label>
                      <span className="wd-badge-editable" style={{ fontSize: '9px', padding: '1px 6px' }}>
                        <Edit3 size={8} /> {t('personal.badge_editable', 'Sửa')}
                      </span>
                    </div>
                    <input
                      type="text"
                      className="wd-input w-100"
                      placeholder="700000"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5 d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--wd-border)' }}>
            <div className="text-muted small" style={{ fontSize: '12px' }}>
              <Lock size={12} className="me-1 text-secondary" />
              {t('personal.modal_locked_footer_note', 'Các trường có biểu tượng khóa do Bệnh viện quản lý. Cán bộ chỉ có thể cập nhật các trường được phép sửa.')}
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="wd-pill-btn-outline"
                onClick={handleCloseEditModal}
              >
                {t('personal.btn_cancel', 'Hủy Bỏ')}
              </button>
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="wd-pill-btn-primary"
              >
                {updateProfileMutation.isPending ? t('personal.btn_saving_db', 'Đang lưu vào CSDL...') : t('personal.btn_save_changes', 'Lưu Thay Đổi')}
              </button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: UPLOAD & SAVE AVATAR (STORES IN DATABASE)                        */}
      {/* ========================================================================= */}
      <Modal show={showPhotoModal} onHide={() => setShowPhotoModal(false)} centered>
        <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
          <Modal.Title className="fw-bold fs-6 text-dark">
            {t('personal.modal_photo_title', 'Thay Đổi Ảnh Đại Diện Cán Bộ Y Tế')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
          <div className="mb-3">
            {selectedAvatarFile ? (
              <img
                src={selectedAvatarFile}
                alt={t('personal.avatar_alt', 'Ảnh xem trước hồ sơ')}
                className="rounded-circle object-fit-cover shadow-sm border mx-auto"
                style={{ width: '90px', height: '90px', borderColor: 'var(--wd-blue)' }}
              />
            ) : avatarUrl ? (
              <img
                src={avatarUrl}
                alt={legalName || t('personal.avatar_alt', 'Ảnh hồ sơ cán bộ')}
                className="rounded-circle object-fit-cover shadow-sm border mx-auto"
                style={{ width: '90px', height: '90px', borderColor: 'var(--wd-border)' }}
              />
            ) : (
              <div
                className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold mx-auto shadow-sm"
                style={{
                  width: '90px',
                  height: '90px',
                  fontSize: '32px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                }}
              >
                {legalName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <p className="text-muted small mb-3">
            {t('personal.photo_note', 'Tải lên ảnh thẻ chân dung nền xanh hoặc trắng (dung lượng tối đa 2MB). Ảnh sẽ được lưu trực tiếp vào cơ sở dữ liệu hệ thống bệnh viện.')}
          </p>

          <input
            type="file"
            className="form-control form-control-sm"
            accept="image/*"
            onChange={handleFileChange}
          />
        </Modal.Body>
        <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
          <button
            type="button"
            className="wd-pill-btn-outline"
            onClick={() => {
              setShowPhotoModal(false);
              setSelectedAvatarFile(null);
            }}
          >
            {t('personal.btn_cancel', 'Hủy Bỏ')}
          </button>
          <button
            type="button"
            disabled={!selectedAvatarFile || updateAvatarMutation.isPending}
            className="wd-pill-btn-primary"
            onClick={handleSavePhoto}
          >
            {updateAvatarMutation.isPending ? t('personal.btn_saving_db', 'Đang lưu vào CSDL...') : t('personal.btn_save_photo', 'Lưu Ảnh Đại Diện')}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: ADD EMERGENCY CONTACT (STORES IN DATABASE)                      */}
      {/* ========================================================================= */}
      <Modal show={showAddEmergencyModal} onHide={() => setShowAddEmergencyModal(false)} centered>
        <Form onSubmit={handleSaveEmergency}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('personal.modal_contact_title', 'Thêm Người Liên Hệ Khẩn Cấp Mới')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">{t('personal.lbl_contact_name', 'Họ và Tên Người Thân')}</label>
              <input
                type="text"
                className="wd-input w-100"
                placeholder={t('personal.ph_contact_name', 'VD: Trần Thị Mai')}
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('personal.lbl_relation', 'Mối Quan Hệ')}</label>
              <select
                className="wd-select w-100"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
              >
                <option value="SPOUSE">{t('personal.relation_spouse', 'Vợ / Chồng')}</option>
                <option value="PARENT">{t('personal.relation_parent', 'Cha / Mẹ')}</option>
                <option value="SIBLING">{t('personal.relation_sibling', 'Anh / Chị / Em')}</option>
                <option value="CHILD">{t('personal.relation_child', 'Con cái')}</option>
                <option value="GUARDIAN">{t('personal.relation_guardian', 'Người bảo hộ hợp pháp')}</option>
              </select>
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('personal.lbl_emergency_phone', 'Số Điện Thoại Khẩn Cấp')}</label>
              <input
                type="text"
                className="wd-input w-100"
                placeholder="0987 654 321"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-2">
              <label className="wd-label">{t('personal.emergency_priority', 'Mức Độ Ưu Tiên')}</label>
              <select
                className="wd-select w-100"
                value={emergencyPriority}
                onChange={(e) => setEmergencyPriority(e.target.value)}
              >
                <option value="Primary">{t('personal.priority_primary', 'Ưu tiên 1')}</option>
                <option value="Secondary">{t('personal.priority_secondary', 'Ưu tiên 2')}</option>
              </select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowAddEmergencyModal(false)}
            >
              {t('personal.btn_cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={addEmergencyMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {addEmergencyMutation.isPending ? t('personal.btn_saving_db', 'Đang lưu vào CSDL...') : t('personal.btn_save_contact', 'Lưu Người Liên Hệ')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PersonalInformation;
