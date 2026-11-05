-- ==============================================================================
-- Unified Database Schema for Hospital HRMS
-- Database: hrm_db
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `hrm_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `hrm_db`;

-- ------------------------------------------------------------------------------
-- 1. Table: Departments
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Departments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `department_code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `location` VARCHAR(100) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_departments_code` (`department_code`),
  KEY `idx_departments_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table: Employees
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Employees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_code` VARCHAR(50) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `avatar_url` MEDIUMTEXT NULL,
  `dob` DATE NULL,
  `gender` ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL DEFAULT 'MALE',
  `marital_status` ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED') NOT NULL DEFAULT 'MARRIED',
  `national_id` VARCHAR(50) NULL,
  `nationality` VARCHAR(50) NOT NULL DEFAULT 'Việt Nam',
  `personal_email` VARCHAR(150) NULL,
  `personal_phone` VARCHAR(30) NULL,
  `home_phone` VARCHAR(30) NULL,
  `home_address` VARCHAR(255) NULL,
  `district` VARCHAR(100) NULL,
  `city_province` VARCHAR(100) NULL,
  `postal_code` VARCHAR(20) NULL DEFAULT '700000',
  `work_location` VARCHAR(150) NOT NULL DEFAULT 'Cơ sở 1 - Khu Lâm sàng Trung tâm A',
  `office_location` VARCHAR(100) NOT NULL DEFAULT 'Phòng Trực A-302, Tầng 3',
  `department_code` VARCHAR(50) NULL,
  `role` ENUM('SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'VICE_DIRECTOR', 'HEAD_OF_GENERAL_PLANNING', 'HEAD_OF_NURSING', 'HEAD_OF_HR', 'HR_MANAGER', 'HR_STAFF', 'DEPARTMENT_HEAD', 'DOCTOR', 'CHIEF_NURSE', 'NURSE', 'ADMIN_STAFF', 'IT_ADMIN', 'TECHNICIAN', 'STAFF') NOT NULL DEFAULT 'STAFF',
  `specialty` VARCHAR(100) NULL,
  `hire_date` DATE NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employees_code` (`employee_code`),
  UNIQUE KEY `uk_employees_email` (`email`),
  KEY `idx_employees_dept` (`department_code`),
  KEY `idx_employees_role` (`role`),
  KEY `idx_employees_status` (`status`),
  CONSTRAINT `fk_employees_department`
    FOREIGN KEY (`department_code`)
    REFERENCES `Departments` (`department_code`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Table: Medical_Licenses
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Medical_Licenses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `license_type` VARCHAR(100) NOT NULL,
  `license_number` VARCHAR(100) NOT NULL,
  `issuing_authority` VARCHAR(255) NULL,
  `issue_date` DATE NOT NULL,
  `expiration_date` DATE NOT NULL,
  `verification_status` ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
  `document_url` VARCHAR(500) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_medical_licenses_number` (`license_number`),
  KEY `idx_medical_licenses_emp` (`employee_id`),
  KEY `idx_medical_licenses_expiry` (`expiration_date`),
  KEY `idx_medical_licenses_status` (`verification_status`),
  CONSTRAINT `fk_medical_licenses_employee`
    FOREIGN KEY (`employee_id`)
    REFERENCES `Employees` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table: Emergency_Contacts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Contacts` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `contact_name` VARCHAR(100) NOT NULL,
  `relationship` VARCHAR(50) NOT NULL,
  `phone_number` VARCHAR(30) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emergency_contacts_staff` (`staff_id`),
  CONSTRAINT `fk_emergency_contacts_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table: Documents
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Documents` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `document_name` VARCHAR(255) NOT NULL,
  `document_type` ENUM(
    'RESUME',
    'CONTRACT',
    'CERTIFICATE',
    'IDENTIFICATION',
    'TAX_FORM',
    'OTHER'
  ) NOT NULL DEFAULT 'OTHER',
  `file_url` VARCHAR(500) NOT NULL,
  `uploaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_documents_staff` (`staff_id`),
  KEY `idx_documents_type` (`document_type`),
  CONSTRAINT `fk_documents_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5.1 Table: Emergency_Contacts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Emergency_Contacts` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `contact_name` VARCHAR(100) NOT NULL,
  `relationship` VARCHAR(50) NOT NULL,
  `phone_number` VARCHAR(30) NOT NULL,
  `priority` VARCHAR(50) NOT NULL DEFAULT 'Primary (Ưu tiên 1)',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_emergency_contacts_staff` (`staff_id`),
  CONSTRAINT `fk_emergency_contacts_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table: Shifts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Shifts` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `department_code` VARCHAR(50) NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `shift_type` ENUM(
    'MORNING',
    'AFTERNOON',
    'NIGHT',
    'SWING',
    'ON_CALL',
    'EMERGENCY_COVER'
  ) NOT NULL DEFAULT 'MORNING',
  `on_call_tier` ENUM(
    'LEADERSHIP',
    'CLINICAL',
    'PARACLINICAL',
    'LOGISTICS'
  ) NOT NULL DEFAULT 'CLINICAL',
  `team_code` ENUM(
    'TEAM_A',
    'TEAM_B',
    'TEAM_C',
    'TEAM_D',
    'GENERAL'
  ) NOT NULL DEFAULT 'GENERAL',
  `is_24h_on_call` BOOLEAN NOT NULL DEFAULT FALSE,
  `status` ENUM(
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'SWAPPED',
    'ON_CALL',
    'EMERGENCY_ACTIVE',
    'RESTING_POST_NIGHT'
  ) NOT NULL DEFAULT 'SCHEDULED',
  `requires_handover` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shifts_staff` (`staff_id`),
  KEY `idx_shifts_dept` (`department_code`),
  KEY `idx_shifts_time` (`start_time`, `end_time`),
  KEY `idx_shifts_status` (`status`),
  KEY `idx_shifts_type` (`shift_type`),
  KEY `idx_shifts_tier` (`on_call_tier`),
  KEY `idx_shifts_team` (`team_code`),
  CONSTRAINT `fk_shifts_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_shifts_department`
    FOREIGN KEY (`department_code`)
    REFERENCES `Departments` (`department_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table: Attendances
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Attendances` (
  `id` VARCHAR(36) NOT NULL,
  `shift_id` VARCHAR(36) NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `clock_in_time` DATETIME NOT NULL,
  `clock_out_time` DATETIME NULL,
  `clock_in_method` ENUM(
    'BIOMETRIC',
    'RFID_CARD',
    'MOBILE_GEOFENCE',
    'KIOSK_TERMINAL',
    'MANUAL_OVERRIDE'
  ) NOT NULL DEFAULT 'KIOSK_TERMINAL',
  `attendance_status` ENUM(
    'PRESENT',
    'LATE',
    'HALF_DAY',
    'EARLY_DEPARTURE',
    'OVERTIME',
    'ABSENT',
    'EXCUSED'
  ) NOT NULL DEFAULT 'PRESENT',
  `overtime_minutes` INT NOT NULL DEFAULT 0,
  `handover_notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attendances_shift` (`shift_id`),
  KEY `idx_attendances_staff` (`staff_id`),
  KEY `idx_attendances_clock_in` (`clock_in_time`),
  KEY `idx_attendances_status` (`attendance_status`),
  CONSTRAINT `fk_attendances_shift`
    FOREIGN KEY (`shift_id`)
    REFERENCES `Shifts` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_attendances_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Table: Leave_Requests
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Leave_Requests` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `leave_type` ENUM(
    'SICK',
    'ANNUAL',
    'UNPAID',
    'MATERNITY'
  ) NOT NULL DEFAULT 'ANNUAL',
  `status` ENUM(
    'PENDING',
    'DEPT_APPROVED',
    'APPROVED',
    'REJECTED'
  ) NOT NULL DEFAULT 'PENDING',
  `day_part` ENUM('FULL', 'FIRST_HALF', 'SECOND_HALF') NOT NULL DEFAULT 'FULL',
  `days_requested` DECIMAL(3, 1) NOT NULL DEFAULT 1.0,
  `reason` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leave_staff` (`staff_id`),
  KEY `idx_leave_dates` (`start_date`, `end_date`),
  KEY `idx_leave_status` (`status`),
  KEY `idx_leave_type` (`leave_type`),
  CONSTRAINT `fk_leave_requests_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Table: Leave_Balances
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Leave_Balances` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `accrual_year` INT NOT NULL,
  `leave_type` ENUM(
    'SICK',
    'ANNUAL',
    'UNPAID',
    'MATERNITY'
  ) NOT NULL DEFAULT 'ANNUAL',
  `total_days` DECIMAL(5, 1) NOT NULL DEFAULT 0.0,
  `used_days` DECIMAL(5, 1) NOT NULL DEFAULT 0.0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_leave_balances_staff_year_type` (`staff_id`, `accrual_year`, `leave_type`),
  KEY `idx_leave_balances_staff` (`staff_id`),
  KEY `idx_leave_balances_year` (`accrual_year`),
  CONSTRAINT `fk_leave_balances_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Table: Pay_Rates
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Pay_Rates` (
  `staff_id` VARCHAR(50) NOT NULL,
  `base_hourly_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `tax_tier` VARCHAR(50) NOT NULL DEFAULT 'TIER_1',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_id`),
  CONSTRAINT `fk_pay_rates_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Table: Payroll_Runs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Payroll_Runs` (
  `id` VARCHAR(36) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `status` ENUM(
    'DRAFT',
    'PROCESSING',
    'APPROVED',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'DRAFT',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payroll_runs_dates` (`start_date`, `end_date`),
  KEY `idx_payroll_runs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Table: Pay_Slips
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Pay_Slips` (
  `id` VARCHAR(36) NOT NULL,
  `run_id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `base_pay` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `night_differential` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `overtime_pay` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `on_call_allowance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `surgery_allowance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `net_pay` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `status` ENUM(
    'DRAFT',
    'CALCULATED',
    'PAID',
    'CANCELLED'
  ) NOT NULL DEFAULT 'DRAFT',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payslips_run` (`run_id`),
  KEY `idx_payslips_staff` (`staff_id`),
  KEY `idx_payslips_status` (`status`),
  CONSTRAINT `fk_payslips_payroll_run`
    FOREIGN KEY (`run_id`)
    REFERENCES `Payroll_Runs` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_payslips_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Table: Payment_Elections
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Payment_Elections` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `bank_name` VARCHAR(100) NOT NULL,
  `account_number` VARCHAR(50) NOT NULL,
  `routing_number` VARCHAR(50) NOT NULL,
  `is_primary` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_elections_staff` (`staff_id`),
  KEY `idx_elections_primary` (`is_primary`),
  CONSTRAINT `fk_payment_elections_staff`
    FOREIGN KEY (`staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. Table: Notifications
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Notifications` (
  `id` VARCHAR(36) NOT NULL,
  `target_staff_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM(
    'ALERT',
    'ANNOUNCEMENT',
    'TASK'
  ) NOT NULL DEFAULT 'ANNOUNCEMENT',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_target` (`target_staff_id`),
  KEY `idx_notifications_is_read` (`is_read`),
  KEY `idx_notifications_type` (`type`),
  CONSTRAINT `fk_notifications_staff`
    FOREIGN KEY (`target_staff_id`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Sample Seed Data for Local Development
-- ------------------------------------------------------------------------------
INSERT INTO `Departments` (`department_code`, `name`, `description`, `location`, `status`)
VALUES 
  ('DEP-EMERG', 'Emergency Medicine (ER)', '24/7 Acute care and resuscitation unit', 'Building A, Ground Floor', 'ACTIVE'),
  ('DEP-ICU', 'Intensive Care Unit (ICU)', 'Critical care and life support unit', 'Building A, 2nd Floor', 'ACTIVE'),
  ('DEP-SURG', 'General & Specialized Surgery', 'Operating theaters and pre/post-op care', 'Building B, 3rd Floor', 'ACTIVE'),
  ('DEP-PED', 'Pediatrics & Neonatal Care', 'Child and infant inpatient care', 'Building B, 1st Floor', 'ACTIVE'),
  ('DEP-HR', 'Human Resources & Administration', 'Hospital personnel, licensing and payroll administration', 'Admin Tower, 4th Floor', 'ACTIVE')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `Employees` (`employee_code`, `first_name`, `last_name`, `email`, `phone`, `department_code`, `role`, `specialty`, `hire_date`, `status`)
VALUES
  ('EMP-DOC-001', 'Alexander', 'Wright', 'dr.wright@hospital.org', '+1-555-0192', 'DEP-EMERG', 'DEPARTMENT_HEAD', 'Emergency Medicine', '2020-03-15', 'ACTIVE'),
  ('EMP-DOC-002', 'Elena', 'Rostova', 'dr.rostova@hospital.org', '+1-555-0193', 'DEP-ICU', 'DOCTOR', 'Critical Care & Pulmonology', '2021-06-01', 'ACTIVE'),
  ('EMP-NUR-001', 'Sarah', 'Jenkins', 's.jenkins@hospital.org', '+1-555-0194', 'DEP-EMERG', 'NURSE', 'Trauma Nursing', '2022-01-10', 'ACTIVE'),
  ('EMP-ADM-001', 'Marcus', 'Vance', 'm.vance@hospital.org', '+1-555-0195', 'DEP-HR', 'HR_MANAGER', 'Healthcare HR Administration', '2019-11-01', 'ACTIVE')
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

INSERT INTO `Medical_Licenses` (`employee_id`, `license_type`, `license_number`, `issuing_authority`, `issue_date`, `expiration_date`, `verification_status`)
VALUES
  (1, 'State Medical Board License (MD)', 'MD-99281-ER', 'State Board of Medicine', '2020-01-01', '2026-12-31', 'VERIFIED'),
  (1, 'DEA Federal Registration', 'BW-9920192', 'Drug Enforcement Administration', '2021-05-10', '2027-05-10', 'VERIFIED'),
  (1, 'Advanced Cardiac Life Support (ACLS)', 'ACLS-2024-8172', 'American Heart Association', '2024-02-15', '2026-02-15', 'VERIFIED'),
  (2, 'State Medical Board License (MD)', 'MD-88301-CC', 'State Board of Medicine', '2021-04-12', '2027-04-12', 'VERIFIED'),
  (3, 'Registered Nurse License (RN)', 'RN-44019-TN', 'State Board of Nursing', '2022-01-05', '2026-01-05', 'VERIFIED')
ON DUPLICATE KEY UPDATE `license_number` = VALUES(`license_number`);

INSERT INTO `Emergency_Contacts` (`id`, `staff_id`, `contact_name`, `relationship`, `phone_number`)
VALUES
  ('11111111-ec11-4111-8111-111111111111', 'EMP-DOC-001', 'Rachel Wright', 'Spouse', '+1-555-0811'),
  ('22222222-ec22-4222-8222-222222222222', 'EMP-NUR-001', 'David Jenkins', 'Brother', '+1-555-0822')
ON DUPLICATE KEY UPDATE `contact_name` = VALUES(`contact_name`);

INSERT INTO `Documents` (`id`, `staff_id`, `document_name`, `document_type`, `file_url`)
VALUES
  ('11111111-doc1-4111-8111-111111111111', 'EMP-DOC-001', 'Curriculum_Vitae_Dr_Wright.pdf', 'RESUME', 'https://storage.hospital-hrm.org/docs/cv_wright.pdf'),
  ('22222222-doc2-4222-8222-222222222222', 'EMP-NUR-001', 'Employment_Contract_Jenkins.pdf', 'CONTRACT', 'https://storage.hospital-hrm.org/docs/contract_jenkins.pdf')
ON DUPLICATE KEY UPDATE `document_name` = VALUES(`document_name`);

INSERT INTO `Shifts` (`id`, `staff_id`, `department_code`, `start_time`, `end_time`, `shift_type`, `status`, `requires_handover`)
VALUES 
  ('11111111-1111-4111-8111-111111111111', 'EMP-DOC-001', 'DEP-EMERG', '2026-08-18 07:00:00', '2026-08-18 15:00:00', 'MORNING', 'COMPLETED', TRUE),
  ('22222222-2222-4222-8222-222222222222', 'EMP-NUR-001', 'DEP-EMERG', '2026-08-18 15:00:00', '2026-08-18 23:00:00', 'AFTERNOON', 'IN_PROGRESS', TRUE),
  ('33333333-3333-4333-8333-333333333333', 'EMP-DOC-002', 'DEP-ICU', '2026-08-18 23:00:00', '2026-08-19 07:00:00', 'NIGHT', 'SCHEDULED', TRUE)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

INSERT INTO `Attendances` (`id`, `shift_id`, `staff_id`, `clock_in_time`, `clock_out_time`, `clock_in_method`, `attendance_status`, `overtime_minutes`, `handover_notes`)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'EMP-DOC-001',
    '2026-08-18 06:55:00',
    '2026-08-18 15:30:00',
    'BIOMETRIC',
    'OVERTIME',
    30,
    'Transferred 4 ICU admissions to incoming shift Dr. Wright. Patient in Bed 4 scheduled for CT scan at 16:00.'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'EMP-NUR-001',
    '2026-08-18 14:58:00',
    NULL,
    'RFID_CARD',
    'PRESENT',
    0,
    NULL
  )
ON DUPLICATE KEY UPDATE `attendance_status` = VALUES(`attendance_status`);

INSERT INTO `Leave_Requests` (`id`, `staff_id`, `start_date`, `end_date`, `leave_type`, `status`, `reason`)
VALUES
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'EMP-DOC-001',
    '2026-09-01',
    '2026-09-05',
    'ANNUAL',
    'APPROVED',
    'Attending Emergency Medicine Annual Conference'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'EMP-NUR-001',
    '2026-08-25',
    '2026-08-26',
    'SICK',
    'PENDING',
    'Medical leave due to acute flu symptoms'
  )
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

INSERT INTO `Leave_Balances` (`id`, `staff_id`, `accrual_year`, `leave_type`, `total_days`, `used_days`)
VALUES
  ('11111111-lb11-4111-8111-111111111111', 'EMP-DOC-001', 2026, 'ANNUAL', 25, 5),
  ('22222222-lb22-4222-8222-222222222222', 'EMP-DOC-001', 2026, 'SICK', 12, 0),
  ('33333333-lb33-4333-8333-333333333333', 'EMP-NUR-001', 2026, 'ANNUAL', 20, 2),
  ('44444444-lb44-4444-8444-444444444444', 'EMP-NUR-001', 2026, 'SICK', 10, 1)
ON DUPLICATE KEY UPDATE `total_days` = VALUES(`total_days`);

INSERT INTO `Pay_Rates` (`staff_id`, `base_hourly_rate`, `tax_tier`)
VALUES
  ('EMP-DOC-001', 95.00, 'TIER_3'),
  ('EMP-DOC-002', 88.50, 'TIER_3'),
  ('EMP-NUR-001', 42.00, 'TIER_2'),
  ('EMP-ADM-001', 35.00, 'TIER_1')
ON DUPLICATE KEY UPDATE `base_hourly_rate` = VALUES(`base_hourly_rate`), `tax_tier` = VALUES(`tax_tier`);

INSERT INTO `Payroll_Runs` (`id`, `start_date`, `end_date`, `status`)
VALUES
  ('11111111-2222-3333-4444-555555555555', '2026-08-01', '2026-08-15', 'APPROVED')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

INSERT INTO `Pay_Slips` (`id`, `run_id`, `staff_id`, `base_pay`, `night_differential`, `overtime_pay`, `net_pay`, `status`)
VALUES
  (
    'aaaaaaaa-1111-2222-3333-444444444444',
    '11111111-2222-3333-4444-555555555555',
    'EMP-DOC-001',
    7600.00,
    450.00,
    712.50,
    6850.00,
    'CALCULATED'
  ),
  (
    'bbbbbbbb-1111-2222-3333-444444444444',
    '11111111-2222-3333-4444-555555555555',
    'EMP-NUR-001',
    3360.00,
    280.00,
    315.00,
    3050.00,
    'CALCULATED'
  )
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

INSERT INTO `Payment_Elections` (`id`, `staff_id`, `bank_name`, `account_number`, `routing_number`, `is_primary`)
VALUES
  (
    'eeeeeeee-1111-2222-3333-444444444444',
    'EMP-DOC-001',
    'JPMorgan Chase Bank',
    '1234567890',
    '021000021',
    TRUE
  ),
  (
    'ffffffff-1111-2222-3333-444444444444',
    'EMP-NUR-001',
    'Bank of America',
    '9876543210',
    '026009593',
    TRUE
  )
ON DUPLICATE KEY UPDATE `bank_name` = VALUES(`bank_name`);

INSERT INTO `Notifications` (`id`, `target_staff_id`, `title`, `message`, `type`, `is_read`)
VALUES
  (
    '11111111-aaaa-bbbb-cccc-111111111111',
    'EMP-DOC-001',
    'Emergency Shift Cover Request',
    'You have been requested to cover the ICU morning shift on Aug 22 due to emergency surge.',
    'ALERT',
    FALSE
  ),
  (
    '22222222-aaaa-bbbb-cccc-222222222222',
    'EMP-DOC-001',
    'Annual HIPAA & Data Privacy Training',
    'Please complete your annual HIPAA compliance refresher module before end of the month.',
    'TASK',
    FALSE
  ),
  (
    '33333333-aaaa-bbbb-cccc-333333333333',
    'EMP-NUR-001',
    'Hospital-Wide System Maintenance',
    'EMR system maintenance scheduled for this Sunday from 02:00 to 04:00 AM.',
    'ANNOUNCEMENT',
    TRUE
  )
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- ------------------------------------------------------------------------------
-- 15. Table: Daily_Tasks
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Daily_Tasks` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `assigned_to` VARCHAR(50) NOT NULL,
  `assigned_by` VARCHAR(50) NULL,
  `shift_id` VARCHAR(36) NULL,
  `status` ENUM(
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'PENDING',
  `due_date` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_daily_tasks_assigned_to` (`assigned_to`),
  KEY `idx_daily_tasks_assigned_by` (`assigned_by`),
  KEY `idx_daily_tasks_shift` (`shift_id`),
  KEY `idx_daily_tasks_status` (`status`),
  KEY `idx_daily_tasks_due_date` (`due_date`),
  CONSTRAINT `fk_daily_tasks_assigned_to`
    FOREIGN KEY (`assigned_to`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_daily_tasks_assigned_by`
    FOREIGN KEY (`assigned_by`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_daily_tasks_shift`
    FOREIGN KEY (`shift_id`)
    REFERENCES `Shifts` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 16. Table: Shift_Handovers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Shift_Handovers` (
  `id` VARCHAR(36) NOT NULL,
  `outgoing_shift_id` VARCHAR(36) NULL,
  `incoming_shift_id` VARCHAR(36) NULL,
  `department_code` VARCHAR(50) NULL,
  `handover_category` ENUM(
    'SHIFT_HANDOVER',
    'DEPT_BRIEFING',
    'HOSPITAL_BRIEFING'
  ) NOT NULL DEFAULT 'SHIFT_HANDOVER',
  `doc_type` ENUM(
    'PHYSICAL_BOOK',
    'IMAGE_UPLOAD',
    'DOCUMENT_LINK',
    'TEXT_NOTES'
  ) NOT NULL DEFAULT 'PHYSICAL_BOOK',
  `file_url` MEDIUMTEXT NULL,
  `external_link` VARCHAR(500) NULL,
  `physical_book_name` VARCHAR(150) NULL,
  `physical_book_page` VARCHAR(50) NULL,
  `physical_storage_location` VARCHAR(150) NULL,
  `summary_metrics` VARCHAR(255) NULL,
  `critical_notes` TEXT NULL,
  `status` ENUM(
    'DRAFT',
    'PENDING_SIGNATURE',
    'COMPLETED'
  ) NOT NULL DEFAULT 'COMPLETED',
  `logged_by` VARCHAR(50) NOT NULL,
  `acknowledged_by` VARCHAR(50) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shift_handovers_outgoing` (`outgoing_shift_id`),
  KEY `idx_shift_handovers_incoming` (`incoming_shift_id`),
  KEY `idx_shift_handovers_category` (`handover_category`),
  KEY `idx_shift_handovers_logged_by` (`logged_by`),
  KEY `idx_shift_handovers_acknowledged_by` (`acknowledged_by`),
  KEY `idx_shift_handovers_status` (`status`),
  CONSTRAINT `fk_shift_handovers_outgoing`
    FOREIGN KEY (`outgoing_shift_id`)
    REFERENCES `Shifts` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_shift_handovers_incoming`
    FOREIGN KEY (`incoming_shift_id`)
    REFERENCES `Shifts` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_shift_handovers_department`
    FOREIGN KEY (`department_code`)
    REFERENCES `Departments` (`department_code`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_shift_handovers_logged_by`
    FOREIGN KEY (`logged_by`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_shift_handovers_acknowledged_by`
    FOREIGN KEY (`acknowledged_by`)
    REFERENCES `Employees` (`employee_code`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 17. Table: Handover_Checklists
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Handover_Checklists` (
  `id` VARCHAR(36) NOT NULL,
  `handover_id` VARCHAR(36) NOT NULL,
  `item_description` VARCHAR(255) NOT NULL,
  `is_verified` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_handover_checklists_handover` (`handover_id`),
  KEY `idx_handover_checklists_verified` (`is_verified`),
  CONSTRAINT `fk_handover_checklists_handover`
    FOREIGN KEY (`handover_id`)
    REFERENCES `Shift_Handovers` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Sample Seed Data for Tasks & Handovers
-- ------------------------------------------------------------------------------
INSERT INTO `Daily_Tasks` (`id`, `title`, `description`, `assigned_to`, `assigned_by`, `shift_id`, `status`, `due_date`)
VALUES
  (
    '11111111-task-4111-8111-111111111111',
    'Morning ICU Ventilator Checks',
    'Perform morning calibration and patient circuit checks across all 12 beds in ICU Ward A.',
    'EMP-DOC-002',
    'EMP-DOC-001',
    '11111111-1111-4111-8111-111111111111',
    'COMPLETED',
    '2026-08-18 10:00:00'
  ),
  (
    '22222222-task-4222-8222-222222222222',
    'Emergency Crash Cart Stock Inventory',
    'Verify emergency medication seals and oxygen cylinder pressure on ER Crash Cart #2.',
    'EMP-NUR-001',
    'EMP-DOC-001',
    '22222222-2222-4222-8222-222222222222',
    'IN_PROGRESS',
    '2026-08-18 18:00:00'
  )
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

INSERT INTO `Shift_Handovers` (`id`, `outgoing_shift_id`, `incoming_shift_id`, `critical_notes`, `status`, `logged_by`, `acknowledged_by`)
VALUES
  (
    '11111111-hand-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'Transferred 4 ICU admissions. Patient in Bed 4 scheduled for abdominal CT scan at 16:00. Blood culture pending for Bed 2.',
    'COMPLETED',
    'EMP-DOC-001',
    'EMP-NUR-001'
  )
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

INSERT INTO `Handover_Checklists` (`id`, `handover_id`, `item_description`, `is_verified`)
VALUES
  ('11111111-chkl-4111-8111-111111111111', '11111111-hand-4111-8111-111111111111', 'Controlled substances & narcotics count verified against safe log', TRUE),
  ('22222222-chkl-4222-8222-222222222222', '11111111-hand-4111-8111-111111111111', 'Critical lab alerts & pending blood culture results reviewed', TRUE),
  ('33333333-chkl-4333-8333-333333333333', '11111111-hand-4111-8111-111111111111', 'Emergency resuscitation equipment & defibrillator battery checked', TRUE)
ON DUPLICATE KEY UPDATE `item_description` = VALUES(`item_description`);

-- ------------------------------------------------------------------------------
-- 18. Table: Roles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 19. Table: Permissions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `permission_code` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permissions_code` (`permission_code`),
  KEY `idx_permissions_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 20. Table: Role_Permissions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Role_Permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `Roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `Permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 21. Table: Accounts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Accounts` (
  `id` VARCHAR(36) NOT NULL,
  `employee_id` INT UNSIGNED NOT NULL,
  `username` VARCHAR(150) NOT NULL,
  `role_code` VARCHAR(50) NOT NULL DEFAULT 'STAFF',
  `password_hash` VARCHAR(255) NOT NULL,
  `last_login` DATETIME NULL,
  `is_locked` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_accounts_username` (`username`),
  KEY `idx_accounts_employee` (`employee_id`),
  KEY `idx_accounts_role` (`role_code`),
  CONSTRAINT `fk_accounts_employee`
    FOREIGN KEY (`employee_id`)
    REFERENCES `Employees` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_accounts_role`
    FOREIGN KEY (`role_code`)
    REFERENCES `Roles` (`role_code`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 23. Table: Audit_Logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Audit_Logs` (
  `id` VARCHAR(36) NOT NULL,
  `actor_id` VARCHAR(50) NOT NULL,
  `actor_name` VARCHAR(150) NULL,
  `action` VARCHAR(50) NOT NULL,
  `resource_type` VARCHAR(50) NOT NULL,
  `resource_id` VARCHAR(100) NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `ip_address` VARCHAR(50) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_actor` (`actor_id`),
  KEY `idx_audit_resource` (`resource_type`, `resource_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 24. Table: Academic_Degrees (Bằng Cấp & Học Vị Y Khoa)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Academic_Degrees` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `degree_level` ENUM('COLLEGE', 'BACHELOR', 'MASTER', 'SPECIALIST_1', 'SPECIALIST_2', 'DOCTORATE', 'OTHER') NOT NULL DEFAULT 'BACHELOR',
  `degree_name` VARCHAR(255) NOT NULL,
  `institution_name` VARCHAR(255) NOT NULL,
  `graduation_year` INT NOT NULL,
  `classification` VARCHAR(50) NULL DEFAULT 'Giỏi',
  `degree_number` VARCHAR(100) NULL,
  `document_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_degrees_staff` (`staff_id`),
  CONSTRAINT `fk_degrees_staff` FOREIGN KEY (`staff_id`) REFERENCES `Employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 25. Table: Specialized_Certifications (Chứng Chỉ Chuyên Môn & CME)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Specialized_Certifications` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `certificate_name` VARCHAR(255) NOT NULL,
  `issuing_organization` VARCHAR(255) NOT NULL,
  `issue_date` DATE NOT NULL,
  `expiration_date` DATE NULL,
  `certificate_code` VARCHAR(100) NULL,
  `cme_hours` INT NOT NULL DEFAULT 0,
  `document_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_certs_staff` (`staff_id`),
  CONSTRAINT `fk_certs_staff` FOREIGN KEY (`staff_id`) REFERENCES `Employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 26. Table: Department_Roster_Delegations (Ủy Quyền Thư Ký Khoa Lập Lịch)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Department_Roster_Delegations` (
  `id` VARCHAR(36) NOT NULL,
  `department_code` VARCHAR(50) NOT NULL,
  `delegated_staff_id` VARCHAR(50) NOT NULL,
  `assigned_by` VARCHAR(50) NOT NULL,
  `notes` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dept_delegation` (`department_code`, `delegated_staff_id`),
  CONSTRAINT `fk_delegation_dept` FOREIGN KEY (`department_code`) REFERENCES `Departments` (`department_code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_delegation_staff` FOREIGN KEY (`delegated_staff_id`) REFERENCES `Employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_delegation_assigner` FOREIGN KEY (`assigned_by`) REFERENCES `Employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 27. Table: Monthly_KPIs (Đánh Giá KPI Y Tế Hàng Tháng)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Monthly_KPIs` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `kpi_month` VARCHAR(7) NOT NULL,
  `target_shifts` INT NOT NULL DEFAULT 20,
  `actual_shifts` INT NOT NULL DEFAULT 0,
  `target_hours` DECIMAL(5,1) NOT NULL DEFAULT 160.0,
  `actual_hours` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
  `on_time_attendance_rate` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  `handover_compliance_rate` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  `clinical_performance_score` DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  `patient_satisfaction_score` DECIMAL(5,2) NOT NULL DEFAULT 95.00,
  `disciplinary_penalty_points` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `score_discipline` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  `score_task_completion` DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  `score_work_quality` DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  `score_communication` DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  `score_competence` DECIMAL(5,2) NOT NULL DEFAULT 90.00,
  `score_innovation` DECIMAL(5,2) NOT NULL DEFAULT 80.00,
  `incident_cause` ENUM('NONE', 'INDIVIDUAL_ERROR', 'SYSTEM_PROCESS', 'FACILITY_EQUIPMENT', 'NEAR_MISS_PREVENTED') NOT NULL DEFAULT 'NONE',
  `incident_penalty_points` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `incident_notes` TEXT NULL,
  `total_kpi_score` DECIMAL(5,2) NOT NULL DEFAULT 92.50,
  `kpi_grade` ENUM('GRADE_A', 'GRADE_B', 'GRADE_C', 'GRADE_D') NOT NULL DEFAULT 'GRADE_A',
  `evaluation_notes` TEXT NULL,
  `evaluated_by` VARCHAR(50) NULL,
  `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED') NOT NULL DEFAULT 'APPROVED',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_kpi_staff_month` (`staff_id`, `kpi_month`),
  KEY `idx_kpi_staff` (`staff_id`),
  KEY `idx_kpi_month` (`kpi_month`),
  CONSTRAINT `fk_kpi_staff` FOREIGN KEY (`staff_id`) REFERENCES `Employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 28. Table: Employment_Contracts (Hợp Đồng Lao Động Y Tế)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Employment_Contracts` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `contract_number` VARCHAR(100) NOT NULL,
  `contract_type` ENUM('PROBATION', 'APPRENTICE', 'DEFINITE_1YR', 'DEFINITE_3YR', 'INDEFINITE') NOT NULL DEFAULT 'DEFINITE_1YR',
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `job_title` VARCHAR(100) NOT NULL,
  `base_salary` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  `file_url` VARCHAR(500) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_contract_number` (`contract_number`),
  KEY `idx_contracts_staff` (`staff_id`),
  KEY `idx_contracts_end_date` (`end_date`),
  KEY `idx_contracts_status` (`status`),
  CONSTRAINT `fk_contracts_staff` FOREIGN KEY (`staff_id`) REFERENCES `Employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 29. Table: Social_Insurances (Bảo Hiểm Xã Hội, Y Tế & Chế Độ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Social_Insurances` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `bhxh_book_number` VARCHAR(50) NOT NULL,
  `bhyt_card_number` VARCHAR(50) NOT NULL,
  `primary_hospital_name` VARCHAR(150) NOT NULL DEFAULT 'Bệnh viện Đa khoa Trung tâm',
  `has_bhxh` BOOLEAN NOT NULL DEFAULT TRUE,
  `has_bhyt` BOOLEAN NOT NULL DEFAULT TRUE,
  `has_bhtn` BOOLEAN NOT NULL DEFAULT TRUE,
  `has_occupational_accident` BOOLEAN NOT NULL DEFAULT TRUE,
  `insurance_salary` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_insurances_staff` (`staff_id`),
  KEY `idx_insurances_staff` (`staff_id`),
  CONSTRAINT `fk_insurances_staff` FOREIGN KEY (`staff_id`) REFERENCES `Employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 30. Table: Commendations_Disciplines (Khen Thưởng & Kỷ Luật)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Commendations_Disciplines` (
  `id` VARCHAR(36) NOT NULL,
  `staff_id` VARCHAR(50) NOT NULL,
  `record_type` ENUM('COMMENDATION', 'DISCIPLINE') NOT NULL,
  `decision_number` VARCHAR(100) NOT NULL,
  `decision_date` DATE NOT NULL,
  `signatory_authority` VARCHAR(150) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `reason` TEXT NOT NULL,
  `reward_or_fine_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `effective_date` DATE NOT NULL,
  `expiration_date` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_records_staff` (`staff_id`),
  KEY `idx_records_type` (`record_type`),
  CONSTRAINT `fk_records_staff` FOREIGN KEY (`staff_id`) REFERENCES `Employees` (`employee_code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------------------------
-- 31. Table: Surge_Dispatches (Phiên Điều Động Tăng Cường Thảm Họa & Bù Đắp Ca Trực)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Surge_Dispatches` (
  `id` VARCHAR(36) NOT NULL,
  `department_code` VARCHAR(50) NOT NULL,
  `alert_level` ENUM('LEVEL_1_SURGE', 'LEVEL_2_DISASTER', 'CODE_RED') NOT NULL DEFAULT 'LEVEL_1_SURGE',
  `reason` VARCHAR(255) NOT NULL,
  `clinical_notes` TEXT NULL,
  `initiated_by` VARCHAR(50) NOT NULL,
  `status` ENUM('IN_PROGRESS', 'RESOLVED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
  `selected_staff_id` VARCHAR(50) NULL,
  `phone_contact` VARCHAR(20) NULL,
  `suitability_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `response_status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'UNREACHABLE') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` VARCHAR(255) NULL,
  `coordinator_notes` VARCHAR(255) NULL,
  `acknowledged_at` DATETIME NULL,
  `estimated_arrival_minutes` INT NULL DEFAULT 15,
  `actual_clock_in_time` DATETIME NULL,
  `candidates_snapshot` JSON NULL,
  `resolved_at` DATETIME NULL,
  `resolved_by` VARCHAR(50) NULL,
  `resolution_notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_surge_dept_status` (`department_code`, `status`),
  KEY `idx_surge_staff` (`selected_staff_id`),
  KEY `idx_surge_created` (`created_at`),
  CONSTRAINT `fk_surge_dept` FOREIGN KEY (`department_code`) REFERENCES `Departments` (`department_code`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_surge_initiator` FOREIGN KEY (`initiated_by`) REFERENCES `Employees` (`employee_code`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
