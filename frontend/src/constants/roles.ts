/**
 * Centralized Role Groups & RBAC Helpers for Hospital HRMS Frontend
 * Must stay synchronized with backend/src/constants/roles.js
 */
export const ROLE_GROUPS = {
  EXECUTIVE: ['SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'VICE_DIRECTOR'] as const,
  HR_TEAM: ['HR_MANAGER', 'HEAD_OF_HR', 'HR_STAFF'] as const,
  HR_OPERATIONS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'HR_STAFF'
  ] as const,
  HOSPITAL_APPROVERS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR'
  ] as const,
  ACCOUNTING: ['ACCOUNTANT'] as const,
  PAYROLL_OPERATORS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR',
    'HR_STAFF',
    'ACCOUNTANT'
  ] as const,
  PAYROLL_APPROVERS: [
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HR_MANAGER',
    'HEAD_OF_HR'
  ] as const,
  CLINICAL_QA: ['HEAD_OF_GENERAL_PLANNING', 'HEAD_OF_NURSING'] as const,
  DEPARTMENT_LEADERS: ['DEPARTMENT_HEAD', 'CHIEF_NURSE'] as const
};

export function hasAnyRole(
  userOrRole: string | { role?: string; role_code?: string } | null | undefined,
  allowedRoles: readonly string[]
): boolean {
  if (!userOrRole) return false;
  const role =
    typeof userOrRole === 'string'
      ? userOrRole
      : userOrRole.role || userOrRole.role_code;
  if (!role) return false;
  return allowedRoles.includes(role);
}
