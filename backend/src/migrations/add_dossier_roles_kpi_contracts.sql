-- ==============================================================================
-- Migration: Add Dossier, Roles, Ward Delegation, KPI, Contracts & Insurances
-- Database: hrm_db (Local MySQL localhost:3306)
-- Non-destructive: Safe ALTER and CREATE TABLE IF NOT EXISTS
-- ==============================================================================

USE `hrm_db`;

-- 1. Update Roles with 12 standard hospital roles
INSERT INTO `Roles` (`role_code`, `name`, `description`) VALUES
  ('HOSPITAL_DIRECTOR', 'Giám Đốc Bệnh Viện', 'Lãnh đạo tối cao toàn diện bệnh viện, phê duyệt chủ trương, quy hoạch và ngân sách.'),
  ('VICE_DIRECTOR', 'Phó Giám Đốc Bệnh Viện', 'Phụ trách khối chuyên môn lâm sàng hoặc hậu cần, điều hành giao ban và ký văn bản.'),
  ('HEAD_OF_GENERAL_PLANNING', 'Trưởng Phòng Kế Hoạch Tổng Hợp', 'Điều phối chuyên môn, quy chế bệnh viện, thanh kiểm tra lâm sàng và lịch trực viện.'),
  ('HEAD_OF_NURSING', 'Trưởng Phòng Điều Dưỡng Viện', 'Chỉ đạo toàn bộ hệ thống điều dưỡng, nữ hộ sinh, kỹ thuật chăm sóc người bệnh toàn viện.'),
  ('HEAD_OF_HR', 'Trưởng Phòng Tổ Chức Cán Bộ', 'Trưởng phòng Nhân sự, phụ trách quy hoạch nhân lực, hợp đồng, kỷ luật và lương thưởng.'),
  ('HR_STAFF', 'Chuyên Viên Phòng Tổ Chức Cán Bộ', 'Thực hiện nghiệp vụ hồ sơ nhân sự, chấm công, bảo hiểm và cấp phát thẻ.'),
  ('CHIEF_NURSE', 'Điều Dưỡng Trưởng Khoa', 'Quản lý điều dưỡng khoa, phân chia ca kíp chăm sóc, kiểm kê thuốc và vật tư tiêu hao.'),
  ('ADMIN_STAFF', 'Nhân Viên Hành Chính & Dược Sĩ', 'Dược sĩ quản lý kho thuốc, nhân viên văn thư, tiếp đón bệnh nhân và hậu cần.'),
  ('IT_ADMIN', 'Admin IT / Kỹ Thuật Viên Viện', 'Quản trị hệ thống máy chủ, mạng LAN, thiết bị y tế và hỗ trợ kỹ thuật helpdesk.')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`);

-- Modify Employees.role ENUM safely to include all 12 roles
ALTER TABLE `Employees` MODIFY COLUMN `role` ENUM(
  'SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'VICE_DIRECTOR', 'HEAD_OF_GENERAL_PLANNING',
  'HEAD_OF_NURSING', 'HEAD_OF_HR', 'HR_MANAGER', 'HR_STAFF', 'DEPARTMENT_HEAD',
  'DOCTOR', 'CHIEF_NURSE', 'NURSE', 'ADMIN_STAFF', 'IT_ADMIN', 'TECHNICIAN', 'STAFF'
) NOT NULL DEFAULT 'STAFF';

-- 2. Table: Academic_Degrees (Bằng cấp đào tạo & học vị y khoa)
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

-- 3. Table: Specialized_Certifications (Chứng chỉ chuyên môn & CME)
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

-- 4. Table: Department_Roster_Delegations (Ủy quyền Thư ký khoa lập lịch)
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

-- 5. Safe add columns to Shifts
SET @exist_approval := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Shifts' AND COLUMN_NAME = 'approval_status');
SET @sql_approval := IF(@exist_approval = 0, 'ALTER TABLE Shifts ADD COLUMN approval_status ENUM(\'DRAFT\', \'PENDING_APPROVAL\', \'APPROVED\') NOT NULL DEFAULT \'APPROVED\'', 'SELECT 1');
PREPARE stmt_app FROM @sql_approval; EXECUTE stmt_app; DEALLOCATE PREPARE stmt_app;

SET @exist_subby := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Shifts' AND COLUMN_NAME = 'submitted_by');
SET @sql_subby := IF(@exist_subby = 0, 'ALTER TABLE Shifts ADD COLUMN submitted_by VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt_sub FROM @sql_subby; EXECUTE stmt_sub; DEALLOCATE PREPARE stmt_sub;

SET @exist_appby := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Shifts' AND COLUMN_NAME = 'approved_by');
SET @sql_appby := IF(@exist_appby = 0, 'ALTER TABLE Shifts ADD COLUMN approved_by VARCHAR(50) NULL', 'SELECT 1');
PREPARE stmt_appb FROM @sql_appby; EXECUTE stmt_appb; DEALLOCATE PREPARE stmt_appb;

SET @exist_appat := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Shifts' AND COLUMN_NAME = 'approved_at');
SET @sql_appat := IF(@exist_appat = 0, 'ALTER TABLE Shifts ADD COLUMN approved_at DATETIME NULL', 'SELECT 1');
PREPARE stmt_appa FROM @sql_appat; EXECUTE stmt_appa; DEALLOCATE PREPARE stmt_appa;

-- 6. Safe add columns to Pay_Rates
SET @exist_salinc := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Pay_Rates' AND COLUMN_NAME = 'last_salary_increment_date');
SET @sql_salinc := IF(@exist_salinc = 0, 'ALTER TABLE Pay_Rates ADD COLUMN last_salary_increment_date DATE NULL', 'SELECT 1');
PREPARE stmt_sali FROM @sql_salinc; EXECUTE stmt_sali; DEALLOCATE PREPARE stmt_sali;

SET @exist_salhid := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Pay_Rates' AND COLUMN_NAME = 'is_salary_increment_hidden');
SET @sql_salhid := IF(@exist_salhid = 0, 'ALTER TABLE Pay_Rates ADD COLUMN is_salary_increment_hidden BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT 1');
PREPARE stmt_salh FROM @sql_salhid; EXECUTE stmt_salh; DEALLOCATE PREPARE stmt_salh;

-- 7. Table: Monthly_KPIs (Đánh giá KPI y tế hàng tháng)
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

-- 8. Table: Employment_Contracts (Hợp đồng lao động)
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

-- 9. Table: Social_Insurances (Bảo hiểm xã hội, y tế, thất nghiệp, TNLĐ)
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

-- 10. Table: Commendations_Disciplines (Khen thưởng & Kỷ luật)
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
