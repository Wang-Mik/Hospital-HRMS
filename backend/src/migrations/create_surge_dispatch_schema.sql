-- ==============================================================================
-- Schema Migration: Hệ Thống Điều Động Tăng Cường & Bù Đắp Nhân Lực
-- Conforms to: Quy chế Bệnh viện (QĐ 1895/1997/QĐ-BYT), QĐ 73/2011/QĐ-TTg, Luật KBCB 2023
-- ==============================================================================

USE `hrm_db`;

-- 1. Mở rộng ENUM trạng thái bảng Shifts (Bảo toàn PENDING_APPROVAL cho Thư ký Y khoa)
ALTER TABLE `Shifts` 
MODIFY COLUMN `status` ENUM(
  'SCHEDULED',
  'PENDING_APPROVAL',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'SWAPPED',
  'ON_CALL',
  'EMERGENCY_ACTIVE',
  'RESTING_POST_NIGHT'
) NOT NULL DEFAULT 'SCHEDULED';

-- 2. Tạo bảng duy nhất Surge_Dispatches (Quản lý phiên điều động khẩn cấp & ứng viên)
CREATE TABLE IF NOT EXISTS `Surge_Dispatches` (
  `id` VARCHAR(36) NOT NULL,
  `department_code` VARCHAR(50) NOT NULL,
  `alert_level` ENUM('LEVEL_1_SURGE', 'LEVEL_2_DISASTER', 'CODE_RED') NOT NULL DEFAULT 'LEVEL_1_SURGE',
  `reason` VARCHAR(255) NOT NULL,
  `clinical_notes` TEXT NULL,
  `initiated_by` VARCHAR(50) NOT NULL,
  `status` ENUM('IN_PROGRESS', 'RESOLVED', 'CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
  
  -- Thông tin ứng viên On-Call được điều động trực tiếp
  `selected_staff_id` VARCHAR(50) NULL,
  `phone_contact` VARCHAR(20) NULL,
  `suitability_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `response_status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'UNREACHABLE') NOT NULL DEFAULT 'PENDING',
  `rejection_reason` VARCHAR(255) NULL,
  `coordinator_notes` VARCHAR(255) NULL,
  `acknowledged_at` DATETIME NULL,
  `estimated_arrival_minutes` INT NULL DEFAULT 15,
  `actual_clock_in_time` DATETIME NULL,
  
  -- Danh sách Top 3 ứng viên thuật toán gợi ý tại thời điểm phát lệnh (dạng JSON)
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
