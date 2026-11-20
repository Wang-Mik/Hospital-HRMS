-- ============================================================================
-- Migration: 2026-11-20 Hospital Payroll Two-Way Workflow & Accountant Role
-- Target: Local MySQL (localhost:3306 hrm_db) ONLY (DENY-02 Compliant)
-- ============================================================================

-- 1. Add ACCOUNTANT role for Finance & Accounting Department (DEP-TCKT)
INSERT INTO `Roles` (`role_code`, `name`, `description`)
VALUES (
  'ACCOUNTANT',
  'Kế Toán Tiền Lương / Phòng Tài Chính Kế Toán',
  'Tiếp nhận bảng công, ca trực, KPI từ TCCB, đối chiếu tài khoản chi trả, tính toán và nhập dự thảo bảng lương.'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`);

-- 2. Upgrade Pay_Slips to store real accounting deductions/bonuses and enforce 1 slip per staff per run
ALTER TABLE `Pay_Slips`
  ADD COLUMN `kpi_bonus` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER `surgery_allowance`,
  ADD COLUMN `social_insurance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER `kpi_bonus`,
  ADD COLUMN `tax_deductions` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER `social_insurance`,
  ADD COLUMN `other_deductions` DECIMAL(15, 2) NOT NULL DEFAULT 0.00 AFTER `tax_deductions`,
  ADD COLUMN `import_source` ENUM('SYSTEM_AUTO', 'ACCOUNTING_IMPORT', 'MANUAL') NOT NULL DEFAULT 'SYSTEM_AUTO' AFTER `status`,
  ADD COLUMN `notes` VARCHAR(500) NULL AFTER `import_source`,
  ADD UNIQUE KEY `uq_payslips_run_staff` (`run_id`, `staff_id`);

-- 3. Extend Employees.role ENUM to include ACCOUNTANT
ALTER TABLE `Employees`
  MODIFY COLUMN `role` ENUM(
    'SUPER_ADMIN',
    'HOSPITAL_DIRECTOR',
    'VICE_DIRECTOR',
    'HEAD_OF_GENERAL_PLANNING',
    'HEAD_OF_NURSING',
    'HEAD_OF_HR',
    'HR_MANAGER',
    'HR_STAFF',
    'ACCOUNTANT',
    'DEPARTMENT_HEAD',
    'DOCTOR',
    'CHIEF_NURSE',
    'NURSE',
    'ADMIN_STAFF',
    'IT_ADMIN',
    'TECHNICIAN',
    'STAFF'
  ) NOT NULL DEFAULT 'STAFF';
