/**
 * Centralized Role Groups & RBAC Helpers for Hospital HRMS
 * Synchronized across backend routes/controllers/services and frontend navigation/UI.
 */
export const ROLE_GROUPS = {
  // Hospital Executive Leadership (Lãnh đạo Viện)
  EXECUTIVE: ['SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'VICE_DIRECTOR'],

  // Human Resources Department (Phòng Tổ chức Cán bộ)
  HR_TEAM: ['HR_MANAGER', 'HEAD_OF_HR', 'HR_STAFF'],

  // Operational HR + Executive (Quản trị & Tác nghiệp Hồ sơ, Hợp đồng, BHXH, Nghỉ phép)
  HR_OPERATIONS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'HR_STAFF'
  ],

  // Final Approvers at Hospital Level (Phê duyệt cấp Viện: Hợp đồng, Nghỉ phép bước 2, Chốt lương)
  HOSPITAL_APPROVERS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR'
  ],

  // Finance & Accounting Department (Phòng Tài chính Kế toán - DEP-TCKT)
  ACCOUNTING: ['ACCOUNTANT'],

  // Payroll Operational Access (Xuất bảng công, Nhập bảng lương Kế toán, Kiểm tra chi tiết đợt lương)
  PAYROLL_OPERATORS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'HR_STAFF',
    'ACCOUNTANT'
  ],

  // Payroll Final Approvers (Duyệt chốt chi trả lương: tách biệt với Chuyên viên HR & Kế toán viên)
  PAYROLL_APPROVERS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR'
  ],

  // Clinical Quality Assurance & Hospital Functional Heads (KHTH & Điều dưỡng viện)
  CLINICAL_QA: ['HEAD_OF_GENERAL_PLANNING', 'HEAD_OF_NURSING'],

  // Department-level Clinical Supervisors
  DEPARTMENT_LEADERS: ['DEPARTMENT_HEAD', 'CHIEF_NURSE'],

  // Hospital-wide & Departmental Rostering Approvers
  ROSTER_APPROVERS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'HEAD_OF_GENERAL_PLANNING',
    'HEAD_OF_NURSING',
    'DEPARTMENT_HEAD',
    'CHIEF_NURSE'
  ],

  // Batch Roster / Auto-Rotate Operators
  ROSTER_ADMIN_OPERATORS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'HEAD_OF_GENERAL_PLANNING',
    'HEAD_OF_NURSING'
  ],

  // Surge & Fill-Gap Dispatchers
  SURGE_DISPATCHERS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'HEAD_OF_GENERAL_PLANNING',
    'HEAD_OF_NURSING',
    'DEPARTMENT_HEAD',
    'CHIEF_NURSE',
    'DOCTOR'
  ],

  // Overrun Duty Submitters
  CLINICAL_STAFF: [
    'DOCTOR',
    'NURSE',
    'DEPARTMENT_HEAD',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HEAD_OF_GENERAL_PLANNING',
    'HEAD_OF_NURSING',
    'CHIEF_NURSE',
    'TECHNICIAN'
  ],

  // Monthly Clinical KPI Evaluators
  KPI_EVALUATORS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'HEAD_OF_GENERAL_PLANNING',
    'HEAD_OF_NURSING',
    'DEPARTMENT_HEAD',
    'CHIEF_NURSE'
  ]
};

/**
 * Helper to verify if a role or user object belongs to any of the allowed roles
 * @param {string|{role?: string, role_code?: string}|null|undefined} userOrRole
 * @param {string[]} allowedRoles
 * @returns {boolean}
 */
export function hasAnyRole(userOrRole, allowedRoles = []) {
  if (!userOrRole) return false;
  const role =
    typeof userOrRole === 'string'
      ? userOrRole
      : userOrRole.role || userOrRole.role_code;
  if (!role) return false;
  return allowedRoles.includes(role);
}

export default ROLE_GROUPS;
