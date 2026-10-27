import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Modal,
  Form,
  Alert,
  ButtonGroup
} from 'react-bootstrap';
import {
  Users,
  Award,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  LayoutGrid,
  List,
  Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeApi } from '../api/employeeApi';
import { departmentApi, Department } from '../api/departmentApi';
import { useTranslation } from '../i18n/useTranslation';
import { TheoryOfNextLoader } from '../components/common/TheoryOfNextLoader';

export interface EmployeeItem {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department_code?: string;
  department_id?: number;
  department_name: string;
  role: 'SUPER_ADMIN' | 'HR_MANAGER' | 'DEPARTMENT_HEAD' | 'DOCTOR' | 'NURSE' | 'TECHNICIAN' | 'STAFF';
  specialty: string | null;
  hire_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ON_LEAVE';
}

export interface LicenseItem {
  id: number;
  employee_id: number;
  staff_code: string;
  staff_name: string;
  department_name: string;
  license_type: string;
  license_number: string;
  issuing_authority: string;
  issue_date: string;
  expiration_date: string;
  days_until_expiry: number;
  verification_status: 'VERIFIED' | 'PENDING' | 'EXPIRED' | 'REVOKED';
  document_url?: string;
}

export interface StaffDirectoryProps {
  defaultTab?: 'staff' | 'licenses';
}

export const StaffDirectory: React.FC<StaffDirectoryProps> = ({ defaultTab = 'staff' }) => {
  const queryClient = useQueryClient();
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'staff' | 'licenses'>(defaultTab);

  // TanStack Query: Fetch employees live from MySQL hrm_db
  const { data: serverEmployees, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.getAll(),
    staleTime: 10000
  });

  // TanStack Query: Fetch departments dynamically from MySQL hrm_db
  const { data: serverDepartments = [] } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => departmentApi.getAll(),
    staleTime: 60000
  });

  // TanStack Query: Fetch licenses dynamically from MySQL hrm_db
  const { data: serverLicenses, isLoading: isLicensesLoading } = useQuery<any[]>({
    queryKey: ['licenses'],
    queryFn: () => employeeApi.getAllLicenses(),
    staleTime: 10000
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [viewFormat, setViewFormat] = useState<'grid' | 'table'>('grid');

  // Modals
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [showAddLicenseModal, setShowAddLicenseModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<EmployeeItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [newCode, setNewCode] = useState('EMP-DOC-005');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+84-90-');
  const [newDept, setNewDept] = useState('DEP-CAPCUU');
  const [newRole, setNewRole] = useState<EmployeeItem['role']>('DOCTOR');
  const [newSpecialty, setNewSpecialty] = useState('');

  // New License form
  const [licStaff, setLicStaff] = useState('EMP-DOC-002');
  const [licType, setLicType] = useState(t('directory.default_acls', 'Chứng chỉ Hồi sức Tim mạch Nâng cao (ACLS)'));
  const [licNumber, setLicNumber] = useState('');
  const [licAuthority, setLicAuthority] = useState(t('directory.default_authority', 'Bộ Y tế Việt Nam'));
  const [licExpiry, setLicExpiry] = useState('2028-12-31');

  // Mutation: Enroll staff live in backend
  const createEmployeeMutation = useMutation({
    mutationFn: (payload: any) => employeeApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setShowAddEmpModal(false);
      setToastMessage(t('directory.onboard_success', 'Cán bộ y tế đã được tiếp nhận và lưu vào cơ sở dữ liệu bệnh viện!'));
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || t('directory.create_staff_error', 'Không thể tạo hồ sơ nhân viên');
      setToastMessage(`${t('common.error', 'Lỗi')}: ${msg}`);
    }
  });

  // Mutation: Create license live in backend
  const createLicenseMutation = useMutation({
    mutationFn: (payload: any) => employeeApi.createLicense(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      setShowAddLicenseModal(false);
      setToastMessage(t('directory.license_saved', 'Chứng chỉ hành nghề đã được lưu thành công vào cơ sở dữ liệu bệnh viện!'));
      setTimeout(() => setToastMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || t('directory.create_license_error', 'Không thể đăng ký chứng chỉ hành nghề');
      setToastMessage(`${t('common.error', 'Lỗi')}: ${msg}`);
    }
  });

  // Map server employees
  const employees: EmployeeItem[] = (serverEmployees && serverEmployees.length > 0)
    ? serverEmployees.map((e: any) => ({
        id: e.id,
        employee_code: e.employee_code,
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email,
        phone: e.phone || '',
        department_code: e.department_code,
        department_id: e.department_id,
        department_name: e.department_name || (e.department_code ? `${t('directory.department', 'Khoa')} ${e.department_code}` : `${t('directory.department', 'Khoa')} #${e.department_id}`),
        role: e.role,
        specialty: e.specialty,
        hire_date: e.hire_date ? e.hire_date.slice(0, 10) : '2026-01-01',
        status: e.status
      }))
    : [];

  // Map server licenses from MySQL
  const licenses: LicenseItem[] = (serverLicenses && serverLicenses.length > 0)
    ? serverLicenses.map((l: any) => ({
        id: l.id,
        employee_id: l.employee_id,
        staff_code: l.staff_code,
        staff_name: l.staff_name,
        department_name: l.department_name || t('directory.default_clinical_dept', 'Khoa Lâm Sàng'),
        license_type: l.license_type,
        license_number: l.license_number,
        issuing_authority: l.issuing_authority || t('directory.default_authority', 'Bộ Y tế Việt Nam'),
        issue_date: l.issue_date ? l.issue_date.slice(0, 10) : '2026-01-01',
        expiration_date: l.expiration_date ? l.expiration_date.slice(0, 10) : '2028-12-31',
        days_until_expiry: Number(l.days_until_expiry) || 0,
        verification_status: l.verification_status || 'VERIFIED',
        document_url: l.document_url
      }))
    : [];

  const filteredEmployees = employees.filter((e) => {
    const matchesDept =
      selectedDept === 'ALL' ||
      e.department_code === selectedDept ||
      (e.department_name && e.department_name.toLowerCase().includes(selectedDept.toLowerCase()));
    const matchesRole = selectedRole === 'ALL' || e.role === selectedRole;
    const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.specialty && e.specialty.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesRole && matchesSearch;
  });

  const filteredLicenses = licenses.filter((l) => {
    return (
      l.staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.license_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.license_number.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    createEmployeeMutation.mutate({
      employee_code: newCode,
      first_name: newFirstName,
      last_name: newLastName,
      email: newEmail,
      phone: newPhone,
      department_code: newDept,
      role: newRole,
      specialty: newSpecialty
    });
  };

  const handleAddLicense = (e: React.FormEvent) => {
    e.preventDefault();
    createLicenseMutation.mutate({
      staff_code: licStaff,
      license_type: licType,
      license_number: licNumber || `CCHN-${Date.now().toString().slice(-5)}-VN`,
      issuing_authority: licAuthority,
      expiration_date: licExpiry,
      verification_status: 'VERIFIED'
    });
  };

  const getRoleBadge = (role: EmployeeItem['role']) => {
    switch (role) {
      case 'DEPARTMENT_HEAD':
        return <span className="wd-badge-blue">{t('directory.role_dept_head', 'Trưởng Khoa')}</span>;
      case 'DOCTOR':
        return <span className="wd-badge-neutral">{t('directory.role_doctor', 'Bác Sĩ')}</span>;
      case 'NURSE':
        return <span className="wd-badge-success">{t('directory.role_nurse', 'Điều Dưỡng')}</span>;
      case 'HR_MANAGER':
        return <span className="wd-badge-neutral">{t('directory.role_hr_manager', 'Quản Trị HR')}</span>;
      default:
        return <span className="wd-badge-neutral">{role}</span>;
    }
  };

  return (
    <Container fluid className="px-0">
      {/* Header Banner */}
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 mb-4">
        <div>
          <h1 className="wd-page-title">{t('directory.title', 'Danh Bạ Cán Bộ Y Tế')}</h1>
          <p className="wd-page-subtitle">
            {t('directory.subtitle', 'Tra cứu thông tin liên lạc, chứng chỉ hành nghề và phân khoa')}
          </p>
        </div>
        <div className="d-flex gap-2">
          {activeTab === 'staff' ? (
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowAddEmpModal(true)}
            >
              <Plus size={15} />
              <span>{t('directory.btn_onboard', 'Tiếp Nhận Cán Bộ Y Tế')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="wd-pill-btn-primary"
              onClick={() => setShowAddLicenseModal(true)}
            >
              <Award size={15} />
              <span>{t('directory.btn_register_license', 'Đăng Ký Chứng Chỉ Y Tế')}</span>
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <Alert
          variant={toastMessage.startsWith(t('common.error', 'Lỗi')) || toastMessage.toLowerCase().startsWith('error') ? 'danger' : 'success'}
          dismissible
          onClose={() => setToastMessage(null)}
          className="d-flex align-items-center gap-2 py-2.5 mb-4 small rounded-2"
        >
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </Alert>
      )}

      {/* Support Banner */}
      <div className="wd-support-banner">
        <div className="wd-support-icon">
          <Info size={18} />
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold text-dark" style={{ fontSize: '13px' }}>
            {t('directory.credentialing_title', 'Hỗ trợ Cấp phép & Quản trị Nhân sự')}
          </div>
          <div className="text-muted" style={{ fontSize: '12px' }}>
            {t('directory.credentialing_desc', 'Cần đối chiếu số chứng chỉ hành nghề, bổ nhiệm chức danh chuyên môn hoặc điều chuyển khoa phòng? Liên hệ')}{' '}
            <a href="mailto:credentialing@hospital.vn" className="fw-semibold text-decoration-none" style={{ color: 'var(--wd-blue)' }}>
              credentialing@hospital.vn
            </a>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="wd-tabs">
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          {t('directory.tab_colleagues', 'Danh Bạ Đồng Nghiệp')} ({employees.length})
        </button>
        <button
          type="button"
          className={`wd-tab-btn ${activeTab === 'licenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('licenses')}
        >
          {t('directory.tab_compliance', 'Chứng Chỉ Hành Nghề & Giám Sát Tuân Thủ')} ({licenses.length})
        </button>
      </div>

      {/* Filter Row */}
      <div className="wd-card mb-4 p-3.5">
        <Row className="g-3 align-items-center">
          <Col xs={12} md={activeTab === 'staff' ? 5 : 8}>
            <div className="position-relative">
              <Search size={15} aria-hidden="true" className="position-absolute text-muted" style={{ left: '12px', top: '11px' }} />
              <input
                type="text"
                placeholder={
                  activeTab === 'staff'
                    ? t('directory.search_staff_placeholder', 'Tìm kiếm họ tên bác sĩ, mã nhân viên, chuyên khoa lâm sàng...')
                    : t('directory.search_license_placeholder', 'Tìm theo tên bác sĩ, loại chứng chỉ hành nghề, số hiệu CCHN...')
                }
                aria-label={
                  activeTab === 'staff'
                    ? t('directory.search_staff_placeholder', 'Tìm kiếm họ tên bác sĩ, mã nhân viên, chuyên khoa lâm sàng...')
                    : t('directory.search_license_placeholder', 'Tìm theo tên bác sĩ, loại chứng chỉ hành nghề, số hiệu CCHN...')
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="wd-input w-100 ps-5"
              />
            </div>
          </Col>
          {activeTab === 'staff' && (
            <>
              <Col xs={6} md={3}>
                <select
                  aria-label={t('directory.all_departments', 'Tất Cả Khoa Phòng')}
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="wd-select w-100"
                >
                  <option value="ALL">{t('directory.all_departments', 'Tất Cả Khoa Phòng')}</option>
                  {serverDepartments.map((dept) => (
                    <option key={dept.department_code} value={dept.department_code}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </Col>
              <Col xs={6} md={2}>
                <select
                  aria-label={t('directory.all_roles', 'Tất Cả Chức Danh')}
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="wd-select w-100"
                >
                  <option value="ALL">{t('directory.all_roles', 'Tất Cả Chức Danh')}</option>
                  <option value="DEPARTMENT_HEAD">{t('directory.role_dept_head', 'Trưởng Khoa')}</option>
                  <option value="DOCTOR">{t('directory.doctor_attending', 'Bác Sĩ Điều Trị')}</option>
                  <option value="NURSE">{t('directory.role_nurse', 'Điều Dưỡng')}</option>
                </select>
              </Col>
              <Col xs={12} md={2} className="text-md-end">
                <ButtonGroup size="sm">
                  <button
                    type="button"
                    aria-label={t('directory.view_grid', 'Xem dạng lưới')}
                    className={`btn btn-sm ${viewFormat === 'grid' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setViewFormat('grid')}
                  >
                    <LayoutGrid size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={t('directory.view_table', 'Xem dạng bảng')}
                    className={`btn btn-sm ${viewFormat === 'table' ? 'btn-secondary text-white' : 'btn-outline-secondary'}`}
                    onClick={() => setViewFormat('table')}
                  >
                    <List size={14} aria-hidden="true" />
                  </button>
                </ButtonGroup>
              </Col>
            </>
          )}
        </Row>
      </div>

      {/* Tab 1: Staff Directory View */}
      {activeTab === 'staff' && (
        <>
          {viewFormat === 'grid' ? (
            <Row className="g-3">
              {isEmployeesLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <Col xs={12} sm={6} lg={4} key={idx}>
                    <TheoryOfNextLoader variant="card" />
                  </Col>
                ))
              ) : filteredEmployees.length === 0 ? (
                <Col xs={12}>
                  <div className="wd-card text-center py-5 text-muted">
                    {t('directory.no_records', 'Không tìm thấy cán bộ y tế nào phù hợp với bộ lọc.')}
                  </div>
                </Col>
              ) : (
                filteredEmployees.map((emp) => (
                  <Col xs={12} sm={6} lg={4} key={emp.id}>
                  <div className="wd-card h-100 p-4 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex align-items-start justify-content-between mb-3">
                        <div className="wd-avatar" style={{ width: '42px', height: '42px', fontSize: '14px' }}>
                          {emp.first_name?.[0] || 'V'}{emp.last_name?.[0] || 'A'}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {getRoleBadge(emp.role)}
                          <span className={emp.status === 'ACTIVE' ? 'wd-badge-success' : 'wd-badge-warning'}>
                            {emp.status === 'ACTIVE' ? t('directory.status_active', 'Đang Công Tác') : emp.status}
                          </span>
                        </div>
                      </div>

                      <div className="fw-bold text-dark mb-1" style={{ fontSize: '15.5px' }}>
                        {lang === 'vi' ? `${emp.last_name || ''} ${emp.first_name || ''}`.trim() : `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}
                      </div>
                      <div className="font-mono text-muted mb-2.5" style={{ fontSize: '11px' }}>
                        {emp.employee_code}
                      </div>

                      <div className="text-secondary small mb-2 d-flex align-items-center gap-2" style={{ fontSize: '12.5px' }}>
                        <Building2 size={14} className="text-muted flex-shrink-0" />
                        <span>{emp.department_name}</span>
                      </div>

                      {emp.specialty && (
                        <div className="mb-3.5">
                          <span className="wd-badge-neutral" style={{ fontSize: '11.5px', padding: '3px 10px' }}>
                            {emp.specialty}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="border-top pt-3 mt-3" style={{ borderColor: 'var(--wd-border-light)' }}>
                      <div className="text-muted small mb-1.5 d-flex align-items-center gap-2" style={{ fontSize: '11.5px' }}>
                        <Mail size={13} className="text-muted flex-shrink-0" />
                        <span>{emp.email}</span>
                      </div>
                      <div className="text-muted small mb-3 d-flex align-items-center justify-content-between" style={{ fontSize: '11.5px' }}>
                        <span className="d-flex align-items-center gap-2">
                          <Phone size={13} className="text-muted flex-shrink-0" />
                          <span>{emp.phone}</span>
                        </span>
                        <span className="font-mono text-muted">{t('directory.hire_date_prefix', 'Nhận việc:')} {emp.hire_date}</span>
                      </div>

                      <button
                        type="button"
                        className="wd-pill-btn-outline w-100 py-2 justify-content-center mt-2"
                        onClick={() => setSelectedProfile(emp)}
                      >
                        {t('directory.view_profile_btn', 'Xem Hồ Sơ Chi Tiết')}
                      </button>
                    </div>
                  </div>
                </Col>
              ))
            )}
          </Row>
          ) : (
            <div className="wd-card">
              <div className="table-responsive">
                <table className="wd-table">
                  <thead>
                    <tr>
                      <th>{t('directory.th_staff', 'CÁN BỘ Y TẾ')}</th>
                      <th>{t('directory.th_department', 'KHOA PHÒNG')}</th>
                      <th>{t('directory.th_role_specialty', 'CHỨC DANH & CHUYÊN MÔN')}</th>
                      <th>{t('directory.th_contact', 'LIÊN HỆ')}</th>
                      <th>{t('directory.th_hire_date', 'NGÀY TIẾP NHẬN')}</th>
                      <th>{t('directory.th_status', 'TRẠNG THÁI')}</th>
                      <th className="text-end">{t('directory.th_actions', 'THAO TÁC')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isEmployeesLoading ? (
                      <TheoryOfNextLoader isTableBody columns={7} rows={5} />
                    ) : filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-5 text-muted">
                          {t('directory.no_records', 'Không tìm thấy cán bộ y tế nào phù hợp với bộ lọc.')}
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="wd-avatar-sm">
                              {e.first_name?.[0] || 'V'}{e.last_name?.[0] || 'A'}
                            </div>
                            <div>
                              <div className="fw-semibold text-dark">
                                {lang === 'vi' ? `${e.last_name || ''} ${e.first_name || ''}`.trim() : `${e.first_name || ''} ${e.last_name || ''}`.trim()}
                              </div>
                              <span className="font-mono text-muted" style={{ fontSize: '11px' }}>{e.employee_code}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-dark" style={{ fontSize: '12px' }}>{e.department_name}</span>
                        </td>
                        <td>
                          <div>{getRoleBadge(e.role)}</div>
                          <small className="text-muted">{e.specialty || t('directory.default_specialty', 'Đa khoa lâm sàng')}</small>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px' }}>{e.email}</div>
                          <small className="text-muted">{e.phone}</small>
                        </td>
                        <td>
                          <small className="text-secondary font-mono">{e.hire_date}</small>
                        </td>
                        <td>
                          <span className={e.status === 'ACTIVE' ? 'wd-badge-success' : 'wd-badge-warning'}>
                            {e.status === 'ACTIVE' ? t('directory.status_active', 'Đang Công Tác') : e.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="wd-pill-btn-outline"
                            onClick={() => setSelectedProfile(e)}
                          >
                            {t('directory.profile_short_btn', 'Hồ Sơ')}
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
        </>
      )}

      {/* Tab 2: Medical Licenses & Compliance View */}
      {activeTab === 'licenses' && (
        <div>
          {/* Licenses KPI banner */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-4">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('directory.kpi_total_licenses', 'Tổng Chứng Chỉ Giám Sát')}
                </div>
                <div className="fw-bold text-dark my-2 font-mono" style={{ fontSize: '24px' }}>
                  {licenses.length}
                </div>
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  {t('directory.kpi_total_sub', 'Bác sĩ, dược sĩ & điều dưỡng')}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-4">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('directory.kpi_valid', 'Hiệu Lực Pháp Lý Hợp Lệ')}
                </div>
                <div className="fw-bold my-2 font-mono" style={{ fontSize: '24px', color: 'var(--wd-green)' }}>
                  {licenses.filter((l) => l.verification_status === 'VERIFIED').length}
                </div>
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  {t('directory.kpi_valid_sub', 'Đã xác thực với Bộ Y tế')}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-4">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('directory.kpi_expiring', 'Hết Hạn Trong < 60 Ngày')}
                </div>
                <div className="fw-bold my-2 font-mono" style={{ fontSize: '24px', color: 'var(--wd-amber)' }}>
                  {licenses.filter((l) => l.days_until_expiry > 0 && l.days_until_expiry <= 60).length}
                </div>
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  {t('directory.kpi_expiring_sub', 'Cần liên hệ gia hạn kịp thời')}
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={3}>
              <div className="wd-card mb-0 p-4">
                <div className="text-muted fw-semibold" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  {t('directory.kpi_expired', 'Hết Hiệu Lực / Quá Hạn')}
                </div>
                <div className="fw-bold my-2 font-mono" style={{ fontSize: '24px', color: 'var(--wd-red)' }}>
                  {licenses.filter((l) => l.days_until_expiry <= 0).length}
                </div>
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  {t('directory.kpi_expired_sub', 'Đình chỉ công tác lâm sàng')}
                </div>
              </div>
            </Col>
          </Row>

          {/* Licenses Compliance Table */}
          <div className="wd-card">
            <div className="wd-card-header">
              <span className="wd-card-title">{t('personal.practicing_license', 'Chứng Chỉ Hành Nghề Khám Chữa Bệnh')}</span>
            </div>
            <div className="table-responsive">
              <table className="wd-table">
                <thead>
                  <tr>
                    <th>{t('directory.th_clinician', 'BÁC SĨ / ĐIỀU DƯỠNG')}</th>
                    <th>{t('directory.th_license_type', 'LOẠI CHỨNG CHỈ HÀNH NGHỀ')}</th>
                    <th>{t('directory.th_license_num', 'SỐ HIỆU CHỨNG CHỈ')}</th>
                    <th>{t('directory.th_issuing_auth', 'CƠ QUAN CẤP PHÉP')}</th>
                    <th>{t('directory.th_expiry_date', 'NGÀY HẾT HẠN')}</th>
                    <th>{t('directory.th_expiry_monitor', 'GIÁM SÁT HẠN DÙNG')}</th>
                    <th>{t('directory.th_lic_status', 'TRẠNG THÁI')}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLicensesLoading ? (
                    <TheoryOfNextLoader isTableBody columns={7} rows={5} />
                  ) : filteredLicenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        {t('directory.no_licenses', 'Chưa có dữ liệu chứng chỉ hành nghề nào trong danh sách.')}
                      </td>
                    </tr>
                  ) : (
                    filteredLicenses.map((lic) => (
                    <tr key={lic.id}>
                      <td>
                        <div className="fw-semibold text-dark">{lic.staff_name}</div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>
                          <span className="font-mono">{lic.staff_code}</span> &bull; {lic.department_name}
                        </div>
                      </td>
                      <td>
                        <span className="fw-medium text-dark">{lic.license_type}</span>
                      </td>
                      <td>
                        <span className="font-mono fw-semibold" style={{ color: 'var(--wd-blue)' }}>{lic.license_number}</span>
                      </td>
                      <td>
                        <span className="text-secondary">{lic.issuing_authority}</span>
                      </td>
                      <td>
                        <span className="font-mono text-dark">{lic.expiration_date}</span>
                      </td>
                      <td>
                        {lic.days_until_expiry <= 0 ? (
                          <span className="wd-badge-urgent">
                            <AlertTriangle size={11} />
                            {t('directory.status_expired_prefix', 'Hết hạn')} ({Math.abs(lic.days_until_expiry)} {t('directory.days_ago', 'ngày trước')})
                          </span>
                        ) : lic.days_until_expiry <= 60 ? (
                          <span className="wd-badge-warning">
                            <Clock size={11} />
                            {t('directory.remaining_prefix', 'Còn')} {lic.days_until_expiry} {t('directory.days', 'ngày')}
                          </span>
                        ) : (
                          <span className="wd-badge-success">
                            <CheckCircle2 size={11} />
                            {t('directory.valid_prefix', 'Hợp lệ')} ({lic.days_until_expiry} {t('directory.days', 'ngày')})
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={lic.verification_status === 'VERIFIED' ? 'wd-badge-success' : 'wd-badge-warning'}>
                          {lic.verification_status === 'VERIFIED' ? t('directory.status_verified', 'Đã Xác Thực') : t('directory.status_pending_verify', 'Chờ Đối Chiếu')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Profile Modal */}
      {selectedProfile && (
        <Modal show={true} onHide={() => setSelectedProfile(null)} size="lg" centered>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('directory.modal_profile_title', 'Hồ Sơ Cán Bộ Y Tế')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--wd-border-light)' }}>
              <div className="wd-avatar" style={{ width: '52px', height: '52px', fontSize: '18px' }}>
                {selectedProfile.first_name?.[0] || 'V'}{selectedProfile.last_name?.[0] || 'A'}
              </div>
              <div>
                <h5 className="fw-bold text-dark mb-0.5">
                  {lang === 'vi' ? `${selectedProfile.last_name || ''} ${selectedProfile.first_name || ''}`.trim() : `${selectedProfile.first_name || ''} ${selectedProfile.last_name || ''}`.trim()}
                </h5>
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  <span className="font-mono">{selectedProfile.employee_code}</span> &bull; {selectedProfile.role} &bull; {selectedProfile.department_name}
                </div>
              </div>
            </div>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px' }}>{t('directory.lbl_internal_mail', 'Hòm Thư Nội Bộ')}</div>
                <div className="fw-medium text-dark">{selectedProfile.email}</div>
              </Col>
              <Col xs={6}>
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px' }}>{t('directory.lbl_shift_phone', 'Điện Thoại Trực Ca')}</div>
                <div className="fw-medium text-dark">{selectedProfile.phone}</div>
              </Col>
              <Col xs={6}>
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px' }}>{t('directory.lbl_clinical_spec', 'Chuyên Khoa Lâm Sàng')}</div>
                <div className="fw-medium text-dark">{selectedProfile.specialty || t('directory.default_general_spec', 'Khám bệnh đa khoa')}</div>
              </Col>
              <Col xs={6}>
                <div className="text-muted text-uppercase fw-semibold" style={{ fontSize: '10px' }}>{t('directory.lbl_hire_date', 'Ngày Tiếp Nhận Nhân Sự')}</div>
                <div className="fw-medium font-mono text-dark">{selectedProfile.hire_date}</div>
              </Col>
            </Row>

            <div className="p-3 rounded-2 small text-muted border" style={{ backgroundColor: '#f9fafb', borderColor: 'var(--wd-border)' }}>
              {t('directory.compliance_disclaimer', 'Nhân viên y tế được bảo trợ pháp lý bởi Bệnh viện Đa khoa Quốc tế và đăng ký hành nghề với Sở Y tế.')}
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setSelectedProfile(null)}
            >
              {t('directory.btn_close', 'Đóng')}
            </button>
          </Modal.Footer>
        </Modal>
      )}

      {/* Add Employee Modal */}
      <Modal show={showAddEmpModal} onHide={() => setShowAddEmpModal(false)} centered>
        <Form onSubmit={handleAddEmployee}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('directory.modal_new_emp_title', 'Tiếp Nhận Nhân Viên Y Tế Mới')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">{t('directory.lbl_emp_code', 'Mã Cán Bộ Y Tế')}</label>
              <input
                required
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="wd-input w-100 font-mono"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <label className="wd-label">{t('directory.lbl_first_name', 'Họ & Tên Đệm')}</label>
                <input
                  required
                  placeholder={t('directory.placeholder_first_name', 'VD: Nguyễn Văn')}
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="wd-input w-100"
                />
              </Col>
              <Col xs={6}>
                <label className="wd-label">{t('directory.lbl_last_name', 'Tên')}</label>
                <input
                  required
                  placeholder={t('directory.placeholder_last_name', 'VD: An')}
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="wd-input w-100"
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('directory.lbl_internal_email', 'Email Nội Bộ')}</label>
              <input
                type="email"
                required
                placeholder="bacsi.an@hospital.vn"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('directory.lbl_assign_dept', 'Khoa Phòng Phân Công')}</label>
              <select
                aria-label={t('directory.lbl_assign_dept', 'Khoa Phòng Phân Công')}
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="wd-select w-100"
              >
                {serverDepartments.map((dept) => (
                  <option key={dept.department_code} value={dept.department_code}>
                    {dept.name} ({dept.department_code})
                  </option>
                ))}
              </select>
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <label className="wd-label">{t('directory.lbl_role_title', 'Chức Vụ Chuyên Môn')}</label>
                <select
                  aria-label={t('directory.lbl_role_title', 'Chức Vụ Chuyên Môn')}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="wd-select w-100"
                >
                  <option value="DOCTOR">{t('directory.role_doctor', 'Bác Sĩ')}</option>
                  <option value="NURSE">{t('directory.role_nurse', 'Điều Dưỡng')}</option>
                  <option value="DEPARTMENT_HEAD">{t('directory.role_dept_head', 'Trưởng Khoa')}</option>
                  <option value="HR_MANAGER">{t('directory.role_hr_manager', 'Nhân Sự HR')}</option>
                </select>
              </Col>
              <Col xs={6}>
                <label className="wd-label">{t('directory.lbl_specific_spec', 'Chuyên Khoa Cụ Thể')}</label>
                <input
                  aria-label={t('directory.lbl_specific_spec', 'Chuyên Khoa Cụ Thể')}
                  placeholder={t('directory.placeholder_spec', 'VD: Hồi Sức Cấp Cứu')}
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  className="wd-input w-100"
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowAddEmpModal(false)}
            >
              {t('directory.btn_cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={createEmployeeMutation.isPending}
              className="wd-pill-btn-primary"
            >
              {createEmployeeMutation.isPending ? t('directory.btn_saving', 'Đang lưu...') : t('directory.btn_save_emp', 'Lưu Hồ Sơ Nhân Viên')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add License Modal */}
      <Modal show={showAddLicenseModal} onHide={() => setShowAddLicenseModal(false)} centered>
        <Form onSubmit={handleAddLicense}>
          <Modal.Header closeButton className="border-bottom py-3" style={{ borderColor: 'var(--wd-border)' }}>
            <Modal.Title className="fw-bold fs-6 text-dark">
              {t('directory.modal_new_lic_title', 'Đăng Ký Chứng Chỉ Hành Nghề Y Tế Mới')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Form.Group className="mb-3">
              <label className="wd-label">{t('directory.lbl_lic_staff', 'Cán Bộ Y Tế Đăng Ký')}</label>
              <select
                aria-label={t('directory.lbl_lic_staff', 'Cán Bộ Y Tế Đăng Ký')}
                value={licStaff}
                onChange={(e) => setLicStaff(e.target.value)}
                className="wd-select w-100"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.employee_code}>
                    {lang === 'vi' ? `${e.last_name || ''} ${e.first_name || ''}`.trim() : `${e.first_name || ''} ${e.last_name || ''}`.trim()} ({e.employee_code}) - {e.department_name}
                  </option>
                ))}
              </select>
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('directory.lbl_lic_type', 'Tên Loại Chứng Chỉ')}</label>
              <input
                required
                value={licType}
                onChange={(e) => setLicType(e.target.value)}
                className="wd-input w-100"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <label className="wd-label">{t('personal.license_number', 'Số Hiệu Chứng Chỉ')}</label>
              <input
                required
                placeholder="VD: CCHN-00892-BYT"
                value={licNumber}
                onChange={(e) => setLicNumber(e.target.value)}
                className="wd-input w-100 font-mono"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col xs={6}>
                <label className="wd-label">{t('directory.lbl_authority', 'Cơ Quan Cấp')}</label>
                <input
                  required
                  value={licAuthority}
                  onChange={(e) => setLicAuthority(e.target.value)}
                  className="wd-input w-100"
                />
              </Col>
              <Col xs={6}>
                <label className="wd-label">{t('directory.lbl_expiry', 'Ngày Hết Hạn')}</label>
                <input
                  type="date"
                  required
                  value={licExpiry}
                  onChange={(e) => setLicExpiry(e.target.value)}
                  className="wd-input w-100"
                />
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-top py-2.5" style={{ borderColor: 'var(--wd-border)' }}>
            <button
              type="button"
              className="wd-pill-btn-outline"
              onClick={() => setShowAddLicenseModal(false)}
            >
              {t('directory.btn_cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              className="wd-pill-btn-primary"
            >
              {t('directory.btn_register_lic', 'Đăng Ký Chứng Chỉ')}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default StaffDirectory;
