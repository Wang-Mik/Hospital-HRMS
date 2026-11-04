-- Migration: Cập nhật cấu trúc bảng Monthly_KPIs hỗ trợ 6 nhóm tiêu chí chuẩn KPI.md
-- Ngày tạo: 2026-11-04

SET @dbname = DATABASE();
SET @tablename = "Monthly_KPIs";

-- 1. Cột score_discipline (Nhóm 1: Chấp hành kỷ luật lao động)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "score_discipline") > 0,
  "SELECT 'Column score_discipline already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `score_discipline` DECIMAL(5,2) NOT NULL DEFAULT 100.00 AFTER `actual_hours`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Cột score_task_completion (Nhóm 2: Hoàn thành nhiệm vụ)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "score_task_completion") > 0,
  "SELECT 'Column score_task_completion already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `score_task_completion` DECIMAL(5,2) NOT NULL DEFAULT 90.00 AFTER `score_discipline`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Cột score_work_quality (Nhóm 3: Chất lượng công việc & Chuyên môn)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "score_work_quality") > 0,
  "SELECT 'Column score_work_quality already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `score_work_quality` DECIMAL(5,2) NOT NULL DEFAULT 90.00 AFTER `score_task_completion`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4. Cột score_communication (Nhóm 4: Giao tiếp và ứng xử)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "score_communication") > 0,
  "SELECT 'Column score_communication already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `score_communication` DECIMAL(5,2) NOT NULL DEFAULT 90.00 AFTER `score_work_quality`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5. Cột score_competence (Nhóm 5: Năng lực và trách nhiệm)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "score_competence") > 0,
  "SELECT 'Column score_competence already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `score_competence` DECIMAL(5,2) NOT NULL DEFAULT 90.00 AFTER `score_communication`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6. Cột score_innovation (Nhóm 6: Đóng góp và cải tiến)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "score_innovation") > 0,
  "SELECT 'Column score_innovation already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `score_innovation` DECIMAL(5,2) NOT NULL DEFAULT 80.00 AFTER `score_competence`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7. Cột incident_cause (Phân loại nguyên nhân sự cố y khoa theo Mục V KPI.md)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "incident_cause") > 0,
  "SELECT 'Column incident_cause already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `incident_cause` ENUM('NONE', 'INDIVIDUAL_ERROR', 'SYSTEM_PROCESS', 'FACILITY_EQUIPMENT', 'NEAR_MISS_PREVENTED') NOT NULL DEFAULT 'NONE' AFTER `disciplinary_penalty_points`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 8. Cột incident_penalty_points (Điểm trừ sự cố y khoa được kết luận do lỗi cá nhân)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "incident_penalty_points") > 0,
  "SELECT 'Column incident_penalty_points already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `incident_penalty_points` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `incident_cause`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 9. Cột incident_notes (Ghi chú chi tiết kết luận nguyên nhân sự cố y khoa)
SET @query = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = "incident_notes") > 0,
  "SELECT 'Column incident_notes already exists';",
  "ALTER TABLE Monthly_KPIs ADD COLUMN `incident_notes` TEXT NULL AFTER `incident_penalty_points`;"
));
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;
