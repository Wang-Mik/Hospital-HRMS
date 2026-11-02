import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Modal,
  Form,
  Alert,
  Badge
} from 'react-bootstrap';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Lock,
  Edit2,
  Camera,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  FileText,
  Award,
  CheckCircle2,
  AlertTriangle,
  Info,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  Star,
  Clock,
  Briefcase
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { employeeApi } from '../api/employeeApi';
import { hrApi } from '../api/hrApi';
import { useTranslation } from '../i18n/useTranslation';

type DossierTab = 'profile' | 'degrees' | 'licenses' | 'certs' | 'contracts_salary' | 'insurances' | 'kpi_rewards';

export const PersonalInformation: React.FC = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const currentStaffId = user?.employee_code || 'EMP-DOC-001';
  const { t, lang } = useTranslation();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isHR = user?.role === 'HR_MANAGER' || user?.role === 'HEAD_OF_HR';

  // Active Tab
  const [activeTab, setActiveTab] = useState<DossierTab>('profile');

  // Notification and Modals
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showAddEmergencyModal, setShowAddEmergencyModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAddDegreeModal, setShowAddDegreeModal] = useState(false);
  const [showAddCertModal, setShowAddCertModal] = useState(false);

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
  const [maritalStatus, setMaritalStatus] = useState<'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED'>('MARRIED');

  // Form States (Emergency Contact)
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('SPOUSE');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyPriority, setEmergencyPriority] = useState('Primary');

  // Form States (Degree)
  const [degLevel, setDegLevel] = useState('BACHELOR');
  const [degName, setDegName] = useState('');
  const [degInstitution, setDegInstitution] = useState('');
  const [degYear, setDegYear] = useState<number>(new Date().getFullYear());
  const [degClass, setDegClass] = useState('Giỏi');
  const [degNumber, setDegNumber] = useState('');

  // Form States (Specialized Cert / CME)
  const [certName, setCertName] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certIssueDate, setCertIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [certExpDate, setCertExpDate] = useState('');
  const [certCode, setCertCode] = useState('');
  const [certHours, setCertHours] = useState<number>(24);

  // 1. Fetch live employee data
  const { data: employeeData } = useQuery({
    queryKey: ['employeeDetail', currentStaffId],
    queryFn: () => employeeApi.getById(currentStaffId),
    staleTime: 10000
  });

  // 2. Fetch full dossier (Degrees, CCHN, CME, Contracts, Insurances, KPIs, Pay Rates)
  const { data: dossierData } = useQuery({
    queryKey: ['employeeDossier', currentStaffId],
    queryFn: () => employeeApi.getDossier(currentStaffId),
    staleTime: 10000
  });

  // 3. Fetch emergency contacts
  const { data: serverEmergencyContacts } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['employeeDossier', currentStaffId] });
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
      queryClient.invalidateQueries({ queryKey: ['employeeDossier', currentStaffId] });
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

  // Mutation: Add Academic Degree
  const addDegreeMutation = useMutation({
    mutationFn: (payload: any) => employeeApi.addDegree(currentStaffId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDossier', currentStaffId] });
      setShowAddDegreeModal(false);
      setDegName('');
      setDegInstitution('');
      setDegNumber('');
      setToastMsg({ type: 'success', text: 'Đã thêm văn bằng học vị vào hồ sơ thành công!' });
      setTimeout(() => setToastMsg(null), 4000);
    },
    onError: (err: any) => {
      setToastMsg({ type: 'danger', text: err.response?.data?.message || 'Lỗi khi lưu văn bằng' });
    }
  });

  // Mutation: Delete Academic Degree
  const deleteDegreeMutation = useMutation({
    mutationFn: (degreeId: string) => employeeApi.deleteDegree(currentStaffId, degreeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDossier', currentStaffId] });
      setToastMsg({ type: 'success', text: 'Đã xóa văn bằng khỏi hồ sơ.' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  });

  // Mutation: Add Specialized Cert / CME
  const addCertMutation = useMutation({
    mutationFn: (payload: any) => employeeApi.addCertification(currentStaffId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDossier', currentStaffId] });
      setShowAddCertModal(false);
      setCertName('');
      setCertOrg('');
      setCertCode('');
      setToastMsg({ type: 'success', text: 'Đã thêm chứng chỉ chuyên môn & CME vào hồ sơ!' });
      setTimeout(() => setToastMsg(null), 4000);
    },
    onError: (err: any) => {
      setToastMsg({ type: 'danger', text: err.response?.data?.message || 'Lỗi khi lưu chứng chỉ chuyên môn' });
    }
  });

  // Mutation: Delete Specialized Cert
  const deleteCertMutation = useMutation({
    mutationFn: (certId: string) => employeeApi.deleteCertification(currentStaffId, certId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDossier', currentStaffId] });
      setToastMsg({ type: 'success', text: 'Đã xóa chứng chỉ chuyên môn khỏi hồ sơ.' });
      setTimeout(() => setToastMsg(null), 4000);
    }
  });

  // Mutation: Toggle Salary Increment Date Privacy
  const toggleSalaryPrivacyMutation = useMutation({
    mutationFn: (newHiddenState: boolean) =>
      hrApi.updateSalaryIncrement(currentStaffId, { is_salary_increment_hidden: newHiddenState }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeDossier', currentStaffId] });
      setToastMsg({ type: 'success', text: 'Đã cập nhật chế độ bảo mật ngày nâng lương!' });
      setTimeout(() => setToastMsg(null), 4000);
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

  const handleSaveDegree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!degName || !degInstitution) return;
    addDegreeMutation.mutate({
      degree_level: degLevel,
      degree_name: degName,
      institution_name: degInstitution,
      graduation_year: Number(degYear),
      classification: degClass,
      degree_number: degNumber || null
    });
  };

  const handleSaveCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName || !certOrg) return;
    addCertMutation.mutate({
      certificate_name: certName,
      issuing_organization: certOrg,
      issue_date: certIssueDate,
      expiration_date: certExpDate || null,
      certificate_code: certCode || null,
      cme_hours: Number(certHours)
    });
  };

  // Derived display values
  const legalName = employeeData
    ? `${employeeData.last_name} ${employeeData.first_name}`.trim()
    : (user?.name || t('personal.default_staff_name', 'Cán Bộ Y Tế'));

  const roleTitle = t(`role.${employeeData?.role || user?.role || 'STAFF'}`, employeeData?.role || 'Cán Bộ Y Tế');
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

  // Dossier sub-lists
  const academicDegrees = dossierData?.academic_degrees || [];
  const medicalLicenses = dossierData?.medical_licenses || [];
  const specializedCerts = dossierData?.specialized_certifications || [];
  const employmentContracts = dossierData?.employment_contracts || [];
  const socialInsurance = dossierData?.social_insurances || null;
  const commendationsDisciplines = dossierData?.commendations_disciplines || [];
  const monthlyKpis = dossierData?.monthly_kpis || [];
  const payRate = dossierData?.pay_rate || null;

  const isSalaryHidden = Boolean(payRate?.is_salary_increment_hidden);
  const lastSalaryIncrementDate = payRate?.last_salary_increment_date
    ? new Date(payRate.last_salary_increment_date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')
    : null;

  return (
    <Container fluid className="px-0">
      {/* Header Banner */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-3">
        <div>
          <h1 className="wd-page-title d-flex align-items-center gap-2">
            <span>{t('dossier.title', 'Hồ Sơ Cán Bộ Y Tế & Năng Lực Lâm Sàng')}</span>
            <Badge bg="primary" className="fw-normal fs-7 px-2.5 py-1">
              {currentStaffId}
            </Badge>
          </h1>
          <p className="wd-page-subtitle">
            {t('personal.subtitle', 'Quản lý toàn diện hồ sơ năng lực: bằng cấp, CCHN, đào tạo liên tục (CME), hợp đồng lao động, bảo hiểm và đánh giá KPI.')}
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
            <Edit2 size={14} />
            <span>{t('common.edit', 'Cập Nhật Hồ Sơ')}</span>
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

      {/* 7 Tab Navigation Strip */}
      <div className="wd-tabs mb-4 flex-wrap gap-1">
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={15} />
          <span>{t('personal.title', 'Lý Lịch & Liên Hệ')}</span>
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'degrees' ? 'active' : ''}`}
          onClick={() => setActiveTab('degrees')}
        >
          <GraduationCap size={15} />
          <span>{t('dossier.academic_degrees', 'Văn Bằng & Học Vị')} ({academicDegrees.length})</span>
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          <Award size={15} />
          <span>{t('dossier.medical_licenses', 'Chứng Chỉ Hành Nghề (CCHN)')} ({medicalLicenses.length})</span>
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'certs' ? 'active' : ''}`}
          onClick={() => setActiveTab('certs')}
        >
          <FileText size={15} />
          <span>{t('dossier.specialized_certifications', 'Chứng Chỉ Chuyên Môn & CME')} ({specializedCerts.length})</span>
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'contracts_salary' ? 'active' : ''}`}
          onClick={() => setActiveTab('contracts_salary')}
        >
          <Briefcase size={15} />
          <span>{t('dossier.employment_contracts', 'Hợp Đồng & Nâng Lương')}</span>
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'insurances' ? 'active' : ''}`}
          onClick={() => setActiveTab('insurances')}
        >
          <ShieldCheck size={15} />
          <span>{t('dossier.social_insurances', 'Bảo Hiểm Xã Hội & Y Tế')}</span>
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'kpi_rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('kpi_rewards')}
        >
          <Star size={15} />
          <span>{t('dossier.monthly_kpi', 'KPI Tháng & Khen Thưởng')}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROFILE & CONTACT DETAILS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <Row className="g-4">
          <Col lg={7} xl={8}>
            {/* Basic Identity Card */}
            <div className="wd-card mb-4">
              <div className="wd-card-header">
                <div className="d-flex align-items-center gap-2">
                  <User size={16} style={{ color: 'var(--wd-blue)' }} />
                  <span className="wd-card-title">{t('personal.title', 'Thông Tin Cán Bộ Y Tế')}</span>
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
                      <span className="wd-badge-locked">
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

                <Row className="g-3" style={{ fontSize: '13px' }}>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.dob', 'Ngày Sinh')}
                    </div>
                    <div className="fw-semibold font-mono text-dark mt-0.5">{dob}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.gender', 'Giới Tính')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">{gender}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.marital_status', 'Tình Trạng Hôn Nhân')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">{maritalDisplay}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.national_id', 'Số CCCD / Hộ Chiếu')}
                    </div>
                    <div className="fw-bold font-mono text-dark mt-0.5">{nationalId}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.nationality', 'Quốc Tịch')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">{nationality}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.work_location', 'Cơ Sở Bệnh Viện')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">{workLocation}</div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Residential Contact Details Card */}
            <div className="wd-card mb-4">
              <div className="wd-card-header">
                <div className="d-flex align-items-center gap-2">
                  <MapPin size={16} style={{ color: 'var(--wd-blue)' }} />
                  <span className="wd-card-title">{t('personal.card_home_contact_title', 'Thông Tin Cư Trú & Liên Lạc Riêng')}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                  style={{ color: 'var(--wd-blue)', fontSize: '13px' }}
                  onClick={() => setShowEditProfileModal(true)}
                >
                  {t('common.edit', 'Chỉnh sửa')}
                </button>
              </div>

              <div className="wd-card-body">
                <Row className="g-3" style={{ fontSize: '13px' }}>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.phone', 'Điện Thoại Di Động')}
                    </div>
                    <div className="fw-semibold font-mono text-dark mt-0.5">{personalPhone || '—'}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.lbl_home_phone', 'Điện Thoại Nhà Riêng')}
                    </div>
                    <div className="fw-semibold font-mono text-dark mt-0.5">{homePhone || '—'}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.personal_email', 'Email Cá Nhân')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">{personalEmail || '—'}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.lbl_postal_code', 'Mã Bưu Chính')}
                    </div>
                    <div className="fw-bold font-mono text-dark mt-0.5">{postalCode || '—'}</div>
                  </Col>
                  <Col sm={12}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.address', 'Địa Chỉ Thường Trú')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">
                      {homeAddress ? `${homeAddress}${district ? `, ${district}` : ''}${cityProvince ? `, ${cityProvince}` : ''}` : '—'}
                    </div>
                  </Col>
                </Row>
              </div>
            </div>

            {/* Official Hospital Work Contact */}
            <div className="wd-card mb-4">
              <div className="wd-card-header">
                <div className="d-flex align-items-center gap-2">
                  <Building2 size={16} style={{ color: 'var(--wd-blue)' }} />
                  <span className="wd-card-title">{t('personal.card_work_contact_title', 'Thông Tin Công Vụ Y Tế')}</span>
                </div>
                <span className="wd-badge-locked">
                  <Lock size={9} /> {t('personal.badge_hospital_managed', 'Quản lý bởi Bệnh viện')}
                </span>
              </div>
              <div className="wd-card-body">
                <Row className="g-3" style={{ fontSize: '13px' }}>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.lbl_work_phone', 'Điện Thoại Nội Bộ')}
                    </div>
                    <div className="fw-semibold font-mono text-dark mt-0.5">{workPhone}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.work_email', 'Email Bệnh Viện')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">{workEmail}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('nav.department', 'Khoa / Phòng')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">{departmentTitle}</div>
                  </Col>
                  <Col sm={6}>
                    <div className="text-muted small fw-semibold text-uppercase" style={{ fontSize: '11px' }}>
                      {t('personal.lbl_hospital_facility', 'Địa Chỉ Bệnh Viện')}
                    </div>
                    <div className="fw-semibold text-dark mt-0.5">{t('personal.val_hospital_address', '215 Hồng Bàng, Phường 11, Quận 5, TP.HCM')}</div>
                  </Col>
                </Row>
              </div>
            </div>
          </Col>

          {/* Right Column: Emergency Contacts */}
          <Col lg={5} xl={4}>
            <div className="wd-card mb-4">
              <div className="wd-card-header py-2.5">
                <div className="d-flex align-items-center gap-2">
                  <User size={15} style={{ color: 'var(--wd-blue)' }} />
                  <span className="wd-card-title" style={{ fontSize: '13.5px' }}>{t('personal.contacts_table_title', 'Người Thân Khẩn Cấp')}</span>
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
                              : c.relationship === 'GUARDIAN' ? t('personal.relation_guardian', 'Người bảo hộ')
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACADEMIC DEGREES & QUALIFICATIONS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'degrees' && (
        <div className="wd-card">
          <div className="wd-card-header">
            <div className="d-flex align-items-center gap-2">
              <GraduationCap size={18} style={{ color: 'var(--wd-blue)' }} />
              <div>
                <span className="wd-card-title">{t('dossier.academic_degrees', 'Văn Bằng Học Vị Y Khoa & Chuyên Nghiệp')}</span>
                <div className="text-muted small">Văn bằng cử nhân, bác sĩ, thạc sĩ, tiến sĩ, chuyên khoa I, chuyên khoa II theo chuẩn Bộ GD&ĐT & Bộ Y Tế.</div>
              </div>
            </div>
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowAddDegreeModal(true)}
            >
              <Plus size={14} />
              <span>Thêm Văn Bằng</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>Loại Văn Bằng</th>
                  <th>Tên Văn Bằng</th>
                  <th>Cơ Sở Đào Tạo</th>
                  <th>Năm Tốt Nghiệp</th>
                  <th>Xếp Loại</th>
                  <th>Số Hiệu Bằng</th>
                  <th className="text-end">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {academicDegrees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      Chưa có dữ liệu văn bằng nào trong hồ sơ. Nhấn "+ Thêm Văn Bằng" để cập nhật.
                    </td>
                  </tr>
                ) : (
                  academicDegrees.map((deg: any) => (
                    <tr key={deg.id}>
                      <td>
                        <Badge bg="info" className="text-dark fw-semibold">
                          {deg.degree_level === 'SPECIALIST_2' ? 'Bác Sĩ CKII'
                            : deg.degree_level === 'SPECIALIST_1' ? 'Bác Sĩ CKI'
                            : deg.degree_level === 'DOCTORATE' ? 'Tiến Sĩ'
                            : deg.degree_level === 'MASTER' ? 'Thạc Sĩ'
                            : deg.degree_level === 'RESIDENT' ? 'Bác Sĩ Nội Trú'
                            : 'Cử Nhân / Bác Sĩ'}
                        </Badge>
                      </td>
                      <td className="fw-semibold text-dark">{deg.degree_name}</td>
                      <td>{deg.institution_name}</td>
                      <td className="font-mono fw-bold">{deg.graduation_year}</td>
                      <td><span className="badge bg-light text-dark border">{deg.classification}</span></td>
                      <td className="font-mono text-muted">{deg.degree_number || '—'}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={() => deleteDegreeMutation.mutate(deg.id)}
                          title="Xóa văn bằng này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MEDICAL LICENSES (CCHN)                                            */}
      {/* ========================================================================= */}
      {activeTab === 'licenses' && (
        <div className="wd-card">
          <div className="wd-card-header">
            <div className="d-flex align-items-center gap-2">
              <Award size={18} style={{ color: 'var(--wd-blue)' }} />
              <div>
                <span className="wd-card-title">{t('dossier.medical_licenses', 'Chứng Chỉ Hành Nghề Khám Bệnh, Chữa Bệnh (CCHN)')}</span>
                <div className="text-muted small">Cấp bởi Bộ Y Tế hoặc Sở Y Tế theo Luật Khám bệnh, chữa bệnh 2023. Gating kiểm tra hợp lệ khi xếp ca trực lâm sàng.</div>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>Số Chứng Chỉ (CCHN)</th>
                  <th>Phạm Vi Chuyên Môn CCHN</th>
                  <th>Cơ Quan Cấp</th>
                  <th>Ngày Cấp</th>
                  <th>Hạn Sử Dụng</th>
                  <th>Trạng Thái CCHN</th>
                </tr>
              </thead>
              <tbody>
                {medicalLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted">
                      Chưa có thông tin chứng chỉ hành nghề nào được phê duyệt cho cán bộ này.
                    </td>
                  </tr>
                ) : (
                  medicalLicenses.map((lic: any) => {
                    const isExpired = lic.days_until_expiry !== null && lic.days_until_expiry <= 0;
                    const isExpiringSoon = lic.days_until_expiry !== null && lic.days_until_expiry > 0 && lic.days_until_expiry <= 60;
                    return (
                      <tr key={lic.id}>
                        <td className="font-mono fw-bold text-primary">{lic.license_number}</td>
                        <td className="fw-semibold text-dark">{lic.license_type}</td>
                        <td>{lic.issuing_authority || 'Bộ Y Tế / Sở Y Tế'}</td>
                        <td className="font-mono">{lic.issue_date ? lic.issue_date.split('T')[0] : '—'}</td>
                        <td className="font-mono">
                          {lic.expiration_date ? lic.expiration_date.split('T')[0] : 'Không thời hạn'}
                          {isExpiringSoon && (
                            <span className="badge bg-warning text-dark ms-2">Hết hạn sau {lic.days_until_expiry} ngày</span>
                          )}
                          {isExpired && (
                            <span className="badge bg-danger ms-2">Đã hết hạn</span>
                          )}
                        </td>
                        <td>
                          {lic.verification_status === 'VERIFIED' ? (
                            <span className="badge bg-success-subtle text-success border border-success d-inline-flex align-items-center gap-1">
                              <CheckCircle2 size={12} /> Hợp Lệ & Phê Duyệt
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning d-inline-flex align-items-center gap-1">
                              <Clock size={12} /> Chờ Xác Thực
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SPECIALIZED CERTIFICATIONS & CME                                   */}
      {/* ========================================================================= */}
      {activeTab === 'certs' && (
        <div className="wd-card">
          <div className="wd-card-header">
            <div className="d-flex align-items-center gap-2">
              <FileText size={18} style={{ color: 'var(--wd-blue)' }} />
              <div>
                <span className="wd-card-title">{t('dossier.specialized_certifications', 'Chứng Chỉ Chuyên Môn & Đào Tạo Y Khoa Liên Tục (CME)')}</span>
                <div className="text-muted small">Chứng chỉ kỹ thuật thủ thuật, hồi sức cấp cứu nâng cao (ACLS/ATLS), nội soi, siêu âm và tích lũy giờ CME bắt buộc.</div>
              </div>
            </div>
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowAddCertModal(true)}
            >
              <Plus size={14} />
              <span>Thêm Chứng Chỉ CME</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="wd-table">
              <thead>
                <tr>
                  <th>Tên Chứng Chỉ / Khóa Học</th>
                  <th>Cơ Sở Cấp Đào Tạo</th>
                  <th>Số Hiệu / Mã</th>
                  <th>Giờ Tích Lũy CME</th>
                  <th>Ngày Cấp</th>
                  <th>Ngày Hết Hạn</th>
                  <th className="text-end">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {specializedCerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      Chưa có chứng chỉ chuyên môn / CME nào trong hồ sơ. Nhấn "+ Thêm Chứng Chỉ CME" để cập nhật.
                    </td>
                  </tr>
                ) : (
                  specializedCerts.map((c: any) => (
                    <tr key={c.id}>
                      <td className="fw-semibold text-dark">{c.certificate_name}</td>
                      <td>{c.issuing_organization}</td>
                      <td className="font-mono text-muted">{c.certificate_code || '—'}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary font-mono fw-bold">
                          {c.cme_hours || 0} giờ CME
                        </span>
                      </td>
                      <td className="font-mono">{c.issue_date ? c.issue_date.split('T')[0] : '—'}</td>
                      <td className="font-mono">{c.expiration_date ? c.expiration_date.split('T')[0] : 'Vô thời hạn'}</td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-danger p-0"
                          onClick={() => deleteCertMutation.mutate(c.id)}
                          title="Xóa chứng chỉ này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: EMPLOYMENT CONTRACTS & SALARY INCREMENT (KEY REQUIREMENT)          */}
      {/* ========================================================================= */}
      {activeTab === 'contracts_salary' && (
        <div>
          {/* Top Banner: Last Salary Increment Date Card */}
          <div className="p-3 mb-4 rounded-3 border bg-white shadow-sm d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white"
                style={{ width: '48px', height: '48px', backgroundColor: '#0284c7' }}
              >
                <DollarSign size={24} />
              </div>
              <div>
                <div className="text-muted small fw-semibold text-uppercase" style={{ letterSpacing: '0.04em' }}>
                  {t('dossier.last_salary_increment', 'Ngày Tăng Lương Cuối Cùng (Lịch Sử Nâng Bậc Lương)')}
                </div>
                <div className="d-flex align-items-center gap-2 mt-0.5">
                  {isSalaryHidden ? (
                    <span className="text-muted fst-italic fs-6 d-flex align-items-center gap-1.5">
                      <Lock size={14} /> {t('dossier.salary_hidden', 'Thông tin ngày tăng lương đã được ẩn bảo mật theo chính sách bệnh viện')}
                    </span>
                  ) : (
                    <span className="fs-5 fw-bold font-mono text-dark">
                      {lastSalaryIncrementDate || 'Chưa ghi nhận ngày tăng lương'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Toggle Action (HR / Admin only) */}
            {(isHR || isAdmin) ? (
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="wd-pill-btn-outline"
                  onClick={() => toggleSalaryPrivacyMutation.mutate(!isSalaryHidden)}
                  title="Ẩn hoặc hiển thị thông tin ngày tăng lương trên hồ sơ"
                >
                  {isSalaryHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{isSalaryHidden ? 'Hiện Ngày Tăng Lương' : 'Ẩn Ngày Tăng Lương'}</span>
                </button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-1.5 text-muted small bg-light px-3 py-1.5 rounded-pill border">
                <ShieldCheck size={14} className="text-secondary" />
                <span>{t('dossier.hr_privacy_managed', 'Chế độ hiển thị do Phòng Tổ chức Cán bộ quản lý')}</span>
              </div>
            )}
          </div>

          {/* Contracts Table */}
          <div className="wd-card">
            <div className="wd-card-header">
              <div className="d-flex align-items-center gap-2">
                <Briefcase size={18} style={{ color: 'var(--wd-blue)' }} />
                <span className="wd-card-title">{t('dossier.employment_contracts', 'Hợp Đồng Lao Động & Tuyển Dụng')}</span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>Số Hợp Đồng</th>
                    <th>Loại Hợp Đồng</th>
                    <th>Chức Danh Ký HĐ</th>
                    <th>Ngày Bắt Đầu</th>
                    <th>Ngày Hết Hạn</th>
                    <th>Trạng Thái</th>
                    <th>Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  {employmentContracts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        Chưa có hợp đồng lao động nào được liên kết với cán bộ này.
                      </td>
                    </tr>
                  ) : (
                    employmentContracts.map((con: any) => {
                      const isExpiringSoon = con.days_until_expiry !== null && con.days_until_expiry >= 0 && con.days_until_expiry <= 30;
                      return (
                        <tr key={con.id}>
                          <td className="font-mono fw-bold text-dark">{con.contract_number}</td>
                          <td>
                            <Badge bg="secondary" className="fw-semibold">
                              {con.contract_type === 'PROBATION' ? 'Thử Việc'
                                : con.contract_type === 'APPRENTICESHIP' ? 'Học Việc'
                                : con.contract_type === 'DEFINITE_1YR' ? 'Xác định 1 năm'
                                : con.contract_type === 'DEFINITE_3YR' ? 'Xác định 3 năm'
                                : con.contract_type === 'INDEFINITE' ? 'Không xác định thời hạn'
                                : con.contract_type}
                            </Badge>
                          </td>
                          <td className="fw-semibold text-dark">{con.job_title}</td>
                          <td className="font-mono">{con.start_date ? con.start_date.split('T')[0] : '—'}</td>
                          <td className="font-mono">
                            {con.end_date ? con.end_date.split('T')[0] : 'Không xác định'}
                            {isExpiringSoon && (
                              <span className="badge bg-warning text-dark ms-2">Hết hạn sau {con.days_until_expiry} ngày</span>
                            )}
                          </td>
                          <td>
                            {con.status === 'ACTIVE' ? (
                              <span className="badge bg-success">Đang hiệu lực</span>
                            ) : (
                              <span className="badge bg-secondary">Hết hiệu lực</span>
                            )}
                          </td>
                          <td className="text-muted small">{con.notes || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SOCIAL & HEALTH INSURANCES                                         */}
      {/* ========================================================================= */}
      {activeTab === 'insurances' && (
        <div className="wd-card">
          <div className="wd-card-header">
            <div className="d-flex align-items-center gap-2">
              <ShieldCheck size={18} style={{ color: 'var(--wd-blue)' }} />
              <div>
                <span className="wd-card-title">{t('dossier.social_insurances', 'Bảo Hiểm Xã Hội, Y Tế & Chế Độ Phúc Lợi Y Tế')}</span>
                <div className="text-muted small">Căn cứ chế độ bảo hiểm bắt buộc theo Luật BHXH và BHYT Việt Nam cho cán bộ y tế.</div>
              </div>
            </div>
          </div>

          <div className="wd-card-body">
            {socialInsurance ? (
              <Row className="g-4">
                <Col md={6}>
                  <div className="p-3 rounded-2 border bg-light">
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Mã Số Sổ BHXH</div>
                    <div className="fs-5 fw-bold font-mono text-dark">{socialInsurance.bhxh_book_number}</div>
                    <div className="text-muted small mt-2 d-flex align-items-center gap-2">
                      <span className={`badge ${socialInsurance.has_bhxh ? 'bg-success' : 'bg-danger'}`}>
                        {socialInsurance.has_bhxh ? 'Đang đóng BHXH bắt buộc' : 'Chưa tham gia'}
                      </span>
                      <span className={`badge ${socialInsurance.has_bhtn ? 'bg-info text-dark' : 'bg-secondary'}`}>
                        {socialInsurance.has_bhtn ? 'Có BHTN' : 'Không có BHTN'}
                      </span>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="p-3 rounded-2 border bg-light">
                    <div className="text-muted small fw-semibold text-uppercase mb-1">Số Thẻ BHYT</div>
                    <div className="fs-5 fw-bold font-mono text-primary">{socialInsurance.bhyt_card_number}</div>
                    <div className="text-muted small mt-1">
                      Nơi ĐK KCB Ban Đầu: <strong>{socialInsurance.primary_hospital_name}</strong>
                    </div>
                  </div>
                </Col>

                <Col md={12}>
                  <div className="p-3 rounded-2 border bg-white">
                    <div className="fw-bold text-dark mb-2">Chế Độ Bảo Hiểm Tai Nạn Nghề Nghiệp & Bệnh Nghề Nghiệp Y Tế:</div>
                    <div className="d-flex align-items-center gap-3">
                      <span className={`badge ${socialInsurance.has_occupational_accident ? 'bg-success' : 'bg-secondary'} p-2`}>
                        {socialInsurance.has_occupational_accident
                          ? 'Đã tham gia Bảo hiểm Tai nạn Lao động & Bệnh Nghề nghiệp Lâm sàng'
                          : 'Chưa kích hoạt gói TNLĐ-BNN'}
                      </span>
                      <span className="text-muted small">Mức lương đóng BHXH: <strong>{Number(socialInsurance.insurance_salary).toLocaleString('vi-VN')} VND</strong></span>
                    </div>
                  </div>
                </Col>
              </Row>
            ) : (
              <div className="text-center py-4 text-muted">
                Chưa có dữ liệu sổ BHXH và BHYT được ghi nhận cho cán bộ này.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: COMMENDATIONS, DISCIPLINES & MONTHLY KPIS                          */}
      {/* ========================================================================= */}
      {activeTab === 'kpi_rewards' && (
        <Row className="g-4">
          {/* Commendations & Disciplines */}
          <Col lg={6}>
            <div className="wd-card">
              <div className="wd-card-header">
                <div className="d-flex align-items-center gap-2">
                  <Star size={18} style={{ color: 'var(--wd-blue)' }} />
                  <span className="wd-card-title">{t('dossier.rewards_disciplines', 'Khen Thưởng & Kỷ Luật')}</span>
                </div>
              </div>

              <div className="table-responsive">
                <table className="wd-table">
                  <thead>
                    <tr>
                      <th>Phân Loại</th>
                      <th>Quyết Định</th>
                      <th>Tiêu Đề / Nội Dung</th>
                      <th>Ngày Ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commendationsDisciplines.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-3 text-muted">
                          Chưa có ghi nhận khen thưởng hoặc kỷ luật.
                        </td>
                      </tr>
                    ) : (
                      commendationsDisciplines.map((rec: any) => (
                        <tr key={rec.id}>
                          <td>
                            <Badge bg={rec.record_type === 'COMMENDATION' ? 'success' : 'danger'}>
                              {rec.record_type === 'COMMENDATION' ? 'Khen Thưởng' : 'Kỷ Luật'}
                            </Badge>
                          </td>
                          <td className="font-mono small">{rec.decision_number}</td>
                          <td>
                            <div className="fw-semibold text-dark">{rec.title}</div>
                            <div className="text-muted small">{rec.reason}</div>
                          </td>
                          <td className="font-mono small">{rec.decision_date ? rec.decision_date.split('T')[0] : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Col>

          {/* Monthly KPIs History */}
          <Col lg={6}>
            <div className="wd-card">
              <div className="wd-card-header">
                <div className="d-flex align-items-center gap-2">
                  <Award size={18} style={{ color: 'var(--wd-blue)' }} />
                  <span className="wd-card-title">{t('dossier.monthly_kpi', 'Lịch Sử Đánh Giá KPI Hàng Tháng')}</span>
                </div>
              </div>

              <div className="table-responsive">
                <table className="wd-table">
                  <thead>
                    <tr>
                      <th>Tháng</th>
                      <th>Ca Thực Tế</th>
                      <th>Đúng Giờ</th>
                      <th>Bàn Giao</th>
                      <th>Điểm Tổng</th>
                      <th>Xếp Loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyKpis.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-3 text-muted">
                          Chưa có dữ liệu KPI tháng nào được tính toán.
                        </td>
                      </tr>
                    ) : (
                      monthlyKpis.map((k: any) => (
                        <tr key={k.id}>
                          <td className="font-mono fw-bold text-dark">{k.kpi_month}</td>
                          <td className="font-mono">{k.actual_shifts} ca ({k.actual_hours}h)</td>
                          <td className="font-mono">{k.on_time_attendance_rate}%</td>
                          <td className="font-mono">{k.handover_compliance_rate}%</td>
                          <td className="font-mono fw-bold">{k.total_kpi_score}</td>
                          <td>
                            <Badge
                              bg={
                                k.kpi_grade === 'GRADE_A' ? 'success'
                                  : k.kpi_grade === 'GRADE_B' ? 'primary'
                                  : k.kpi_grade === 'GRADE_C' ? 'warning'
                                  : 'danger'
                              }
                              className="px-2 py-1"
                            >
                              {k.kpi_grade === 'GRADE_A' ? 'Hạng A'
                                : k.kpi_grade === 'GRADE_B' ? 'Hạng B'
                                : k.kpi_grade === 'GRADE_C' ? 'Hạng C'
                                : 'Hạng D'}
                            </Badge>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD ACADEMIC DEGREE                                             */}
      {/* ========================================================================= */}
      <Modal show={showAddDegreeModal} onHide={() => setShowAddDegreeModal(false)} centered>
        <Form onSubmit={handleSaveDegree}>
          <Modal.Header closeButton className="border-bottom py-3">
            <Modal.Title className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
              <GraduationCap size={18} style={{ color: 'var(--wd-blue)' }} />
              <span>Thêm Văn Bằng & Học Vị Y Khoa</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">Cấp Bậc Học Vị</label>
              <select
                className="wd-select w-100"
                value={degLevel}
                onChange={(e) => setDegLevel(e.target.value)}
              >
                <option value="BACHELOR">Cử Nhân / Bác Sĩ Đa Khoa</option>
                <option value="RESIDENT">Bác Sĩ Nội Trú</option>
                <option value="SPECIALIST_1">Bác Sĩ Chuyên Khoa I (CK1)</option>
                <option value="MASTER">Thạc Sĩ Y Học / Dược Học</option>
                <option value="SPECIALIST_2">Bác Sĩ Chuyên Khoa II (CK2)</option>
                <option value="DOCTORATE">Tiến Sĩ Y Khoa</option>
              </select>
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">Tên Văn Bằng / Chuyên Ngành</label>
              <input
                type="text"
                className="wd-input w-100"
                placeholder="VD: Bác sĩ Chuyên khoa 1 Hồi sức cấp cứu"
                value={degName}
                onChange={(e) => setDegName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">Cơ Sở Đào Tạo (Đại Học / Học Viện)</label>
              <input
                type="text"
                className="wd-input w-100"
                placeholder="VD: Đại học Y Dược TP.HCM"
                value={degInstitution}
                onChange={(e) => setDegInstitution(e.target.value)}
                required
              />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col sm={6}>
                <label className="wd-label">Năm Tốt Nghiệp</label>
                <input
                  type="number"
                  className="wd-input w-100"
                  value={degYear}
                  onChange={(e) => setDegYear(Number(e.target.value))}
                  required
                />
              </Col>
              <Col sm={6}>
                <label className="wd-label">Xếp Loại Tốt Nghiệp</label>
                <select
                  className="wd-select w-100"
                  value={degClass}
                  onChange={(e) => setDegClass(e.target.value)}
                >
                  <option value="Xuất sắc">Xuất sắc</option>
                  <option value="Giỏi">Giỏi</option>
                  <option value="Khá">Khá</option>
                  <option value="Trung bình">Trung bình</option>
                </select>
              </Col>
            </Row>

            <Form.Group className="mb-2">
              <label className="wd-label">Số Hiệu Văn Bằng</label>
              <input
                type="text"
                className="wd-input w-100"
                placeholder="VD: B-2022-HSTC-0042"
                value={degNumber}
                onChange={(e) => setDegNumber(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5">
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowAddDegreeModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={addDegreeMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {addDegreeMutation.isPending ? 'Đang lưu...' : 'Lưu Văn Bằng'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: ADD SPECIALIZED CERT / CME                                       */}
      {/* ========================================================================= */}
      <Modal show={showAddCertModal} onHide={() => setShowAddCertModal(false)} centered>
        <Form onSubmit={handleSaveCert}>
          <Modal.Header closeButton className="border-bottom py-3">
            <Modal.Title className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
              <FileText size={18} style={{ color: 'var(--wd-blue)' }} />
              <span>Thêm Chứng Chỉ Chuyên Môn / Đào Tạo CME</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">Tên Chứng Chỉ / Khóa CME</label>
              <input
                type="text"
                className="wd-input w-100"
                placeholder="VD: Hồi sức tim phổi nâng cao (ACLS)"
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">Cơ Quan Cấp / Đơn Vị Đào Tạo</label>
              <input
                type="text"
                className="wd-input w-100"
                placeholder="VD: Bệnh viện Chợ Rẫy / Đại học Y Dược"
                value={certOrg}
                onChange={(e) => setCertOrg(e.target.value)}
                required
              />
            </Form.Group>

            <Row className="g-2 mb-3">
              <Col sm={6}>
                <label className="wd-label">Ngày Cấp</label>
                <input
                  type="date"
                  className="wd-input w-100"
                  value={certIssueDate}
                  onChange={(e) => setCertIssueDate(e.target.value)}
                  required
                />
              </Col>
              <Col sm={6}>
                <label className="wd-label">Ngày Hết Hạn (nếu có)</label>
                <input
                  type="date"
                  className="wd-input w-100"
                  value={certExpDate}
                  onChange={(e) => setCertExpDate(e.target.value)}
                />
              </Col>
            </Row>

            <Row className="g-2 mb-2">
              <Col sm={6}>
                <label className="wd-label">Mã Chứng Chỉ</label>
                <input
                  type="text"
                  className="wd-input w-100"
                  placeholder="VD: CME-2026-ACLS-01"
                  value={certCode}
                  onChange={(e) => setCertCode(e.target.value)}
                />
              </Col>
              <Col sm={6}>
                <label className="wd-label">Số Giờ Tích Lũy CME</label>
                <input
                  type="number"
                  className="wd-input w-100"
                  value={certHours}
                  onChange={(e) => setCertHours(Number(e.target.value))}
                  min={1}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5">
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowAddCertModal(false)}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={addCertMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {addCertMutation.isPending ? 'Đang lưu...' : 'Lưu Chứng Chỉ CME'}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PROFILE CONTACTS                                            */}
      {/* ========================================================================= */}
      <Modal
        show={showEditProfileModal}
        onHide={handleCloseEditModal}
        size="lg"
        centered
        scrollable
      >
        <Form onSubmit={handleSaveProfile}>
          <Modal.Header closeButton className="border-bottom py-3">
            <Modal.Title className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
              <Edit2 size={17} style={{ color: 'var(--wd-blue)' }} />
              <span>{t('personal.modal_edit_title', 'Chỉnh Sửa Hồ Sơ Cá Nhân')}</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            <div className="mb-4 p-3 rounded-2" style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '12.5px' }}>
              <div className="d-flex align-items-start gap-2">
                <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="fw-bold text-dark mb-0.5">{t('personal.modal_guideline_title', 'Quy định cập nhật thông tin hồ sơ:')}</div>
                  <div className="text-muted" style={{ fontSize: '12px', lineHeight: 1.5 }}>
                    Cán bộ y tế được chủ động cập nhật tình trạng hôn nhân và thông tin liên hệ cư trú. Thông tin định danh pháp lý được quản lý bởi Phòng Tổ Chức Cán Bộ.
                  </div>
                </div>
              </div>
            </div>

            <Row className="g-3">
              <Col sm={6}>
                <label className="wd-label">{t('personal.marital_status', 'Tình Trạng Hôn Nhân')}</label>
                <select
                  className="wd-select w-100"
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value as any)}
                >
                  <option value="SINGLE">{t('personal.single', 'Độc thân')}</option>
                  <option value="MARRIED">{t('personal.married', 'Đã kết hôn')}</option>
                  <option value="DIVORCED">{t('personal.divorced', 'Ly hôn')}</option>
                  <option value="WIDOWED">{t('personal.widowed', 'Góa')}</option>
                </select>
              </Col>
              <Col sm={6}>
                <label className="wd-label">{t('personal.phone', 'Điện Thoại Di Động')}</label>
                <input
                  type="text"
                  className="wd-input w-100"
                  value={personalPhone}
                  onChange={(e) => setPersonalPhone(e.target.value)}
                />
              </Col>
              <Col sm={6}>
                <label className="wd-label">{t('personal.lbl_home_phone', 'Điện Thoại Nhà Riêng')}</label>
                <input
                  type="text"
                  className="wd-input w-100"
                  value={homePhone}
                  onChange={(e) => setHomePhone(e.target.value)}
                />
              </Col>
              <Col sm={6}>
                <label className="wd-label">{t('personal.personal_email', 'Email Cá Nhân')}</label>
                <input
                  type="email"
                  className="wd-input w-100"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                />
              </Col>
              <Col sm={12}>
                <label className="wd-label">{t('personal.address', 'Địa Chỉ Nhà Riêng')}</label>
                <input
                  type="text"
                  className="wd-input w-100"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                />
              </Col>
              <Col sm={4}>
                <label className="wd-label">{t('personal.lbl_district', 'Quận / Huyện')}</label>
                <input
                  type="text"
                  className="wd-input w-100"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />
              </Col>
              <Col sm={4}>
                <label className="wd-label">{t('personal.lbl_city_province', 'Tỉnh / Thành Phố')}</label>
                <input
                  type="text"
                  className="wd-input w-100"
                  value={cityProvince}
                  onChange={(e) => setCityProvince(e.target.value)}
                />
              </Col>
              <Col sm={4}>
                <label className="wd-label">{t('personal.lbl_postal_code', 'Mã Bưu Chính')}</label>
                <input
                  type="text"
                  className="wd-input w-100"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5">
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
              {updateProfileMutation.isPending ? t('personal.btn_saving_db', 'Đang lưu...') : t('common.save', 'Lưu Thay Đổi')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: AVATAR CHANGE                                                    */}
      {/* ========================================================================= */}
      <Modal show={showPhotoModal} onHide={() => setShowPhotoModal(false)} centered>
        <Modal.Header closeButton className="border-bottom py-3">
          <Modal.Title className="fw-bold fs-6 text-dark">
            {t('personal.modal_photo_title', 'Thay Đổi Ảnh Thẻ Cán Bộ Y Tế')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
          <div className="mb-3">
            {selectedAvatarFile || avatarUrl ? (
              <img
                src={selectedAvatarFile || avatarUrl}
                alt="Avatar Preview"
                className="rounded-circle object-fit-cover shadow border mx-auto"
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
            {t('personal.photo_note', 'Tải lên ảnh thẻ chân dung nền xanh hoặc trắng (dung lượng tối đa 2MB).')}
          </p>

          <input
            type="file"
            className="form-control form-control-sm"
            accept="image/*"
            onChange={handleFileChange}
          />
        </Modal.Body>
        <Modal.Footer className="border-top py-2.5">
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
            {updateAvatarMutation.isPending ? t('personal.btn_saving_db', 'Đang lưu...') : t('personal.btn_save_photo', 'Lưu Ảnh')}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: ADD EMERGENCY CONTACT                                            */}
      {/* ========================================================================= */}
      <Modal show={showAddEmergencyModal} onHide={() => setShowAddEmergencyModal(false)} centered>
        <Form onSubmit={handleSaveEmergency}>
          <Modal.Header closeButton className="border-bottom py-3">
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('personal.modal_contact_title', 'Thêm Người Thân Khẩn Cấp')}
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
          <Modal.Footer className="border-top py-2.5">
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
              {addEmergencyMutation.isPending ? t('personal.btn_saving_db', 'Đang lưu...') : t('personal.btn_save_contact', 'Lưu Người Thân')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default PersonalInformation;
