-- ==============================================================================
-- Sample Clinical Seed Data for Dossier, Contracts, Insurances, KPIs & Commendations
-- ==============================================================================

USE `hrm_db`;

-- Seed Academic Degrees for existing medical staff
INSERT INTO `Academic_Degrees` (`id`, `staff_id`, `degree_level`, `degree_name`, `institution_name`, `graduation_year`, `classification`, `degree_number`)
VALUES
  ('deg-doc1-1', 'EMP-DOC-001', 'BACHELOR', 'Bác sĩ Đa khoa', 'Đại học Y Hà Nội', 2012, 'Giỏi', 'BS-2012-YHN-0891'),
  ('deg-doc1-2', 'EMP-DOC-001', 'SPECIALIST_1', 'Bác sĩ Chuyên khoa I - Hồi sức Cấp cứu', 'Đại học Y Hà Nội', 2017, 'Xuất sắc', 'CK1-2017-0412'),
  ('deg-doc2-1', 'EMP-DOC-002', 'BACHELOR', 'Bác sĩ Đa khoa', 'Đại học Y Dược TP.HCM', 2014, 'Giỏi', 'BS-2014-YD-1102'),
  ('deg-doc2-2', 'EMP-DOC-002', 'MASTER', 'Thạc sĩ Y học Lâm sàng - Hồi sức Chống độc', 'Đại học Y Dược TP.HCM', 2019, 'Giỏi', 'ThS-2019-0921'),
  ('deg-nur1-1', 'EMP-NUR-001', 'BACHELOR', 'Cử nhân Điều dưỡng Đa khoa', 'Đại học Điều dưỡng Nam Định', 2018, 'Giỏi', 'CN-2018-DD-3341'),
  ('deg-nur2-1', 'EMP-NUR-002', 'COLLEGE', 'Cao đẳng Điều dưỡng', 'Cao đẳng Y tế Hà Nội', 2020, 'Khá', 'CĐ-2020-0512'),
  ('deg-tech1-1', 'EMP-TECH-001', 'BACHELOR', 'Cử nhân Kỹ thuật Xét nghiệm Y học', 'Đại học Y tế Công cộng', 2019, 'Giỏi', 'KTYH-2019-0219'),
  ('deg-phar1-1', 'EMP-PHAR-001', 'BACHELOR', 'Dược sĩ Đại học', 'Đại học Dược Hà Nội', 2016, 'Giỏi', 'DS-2016-DH-0842')
ON DUPLICATE KEY UPDATE `degree_name` = VALUES(`degree_name`);

-- Seed Specialized Certifications (CME & Technical)
INSERT INTO `Specialized_Certifications` (`id`, `staff_id`, `certificate_name`, `issuing_organization`, `issue_date`, `expiration_date`, `certificate_code`, `cme_hours`)
VALUES
  ('cme-doc1-1', 'EMP-DOC-001', 'Cấp cứu Tim mạch Nâng cao (ACLS)', 'Hiệp hội Tim mạch Hoa Kỳ (AHA) / BV Bạch Mai', '2024-03-10', '2026-03-10', 'AHA-ACLS-2024-991', 48),
  ('cme-doc1-2', 'EMP-DOC-001', 'Kỹ thuật Lọc máu liên tục trong HSTC (CRRT)', 'Bệnh viện Hữu nghị Việt Đức', '2023-08-15', '2028-08-15', 'CRRT-VD-2023-112', 72),
  ('cme-doc2-1', 'EMP-DOC-002', 'Hồi sức Nhi khoa Nâng cao (PALS)', 'Viện Nhi Trung Ương', '2024-05-20', '2026-05-20', 'PALS-VN-2024-041', 48),
  ('cme-doc2-2', 'EMP-DOC-002', 'Siêu âm Tim Cấp cứu tại Giường (FOCUS/POCUS)', 'Viện Tim Mạch Quốc Gia', '2023-11-01', NULL, 'POCUS-2023-8819', 60),
  ('cme-nur1-1', 'EMP-NUR-001', 'Chăm sóc Người bệnh Thở máy & Đặt Catheter', 'Hội Điều dưỡng Việt Nam', '2024-02-18', '2027-02-18', 'CC-DD-2024-0021', 36),
  ('cme-nur1-2', 'EMP-NUR-001', 'Kiểm soát Nhiễm khuẩn Bệnh viện Chuẩn Quốc gia', 'Sở Y Tế Hà Nội', '2024-01-12', NULL, 'KSNK-2024-4412', 24)
ON DUPLICATE KEY UPDATE `certificate_name` = VALUES(`certificate_name`);

-- Seed Employment Contracts (including Probation, Apprentice, Definite, Indefinite, Expiring Soon)
INSERT INTO `Employment_Contracts` (`id`, `staff_id`, `contract_number`, `contract_type`, `start_date`, `end_date`, `job_title`, `base_salary`, `status`, `notes`)
VALUES
  ('cnt-doc1', 'EMP-DOC-001', 'HĐLĐ-BV-2020-001', 'INDEFINITE', '2020-03-15', NULL, 'Bác sĩ Trưởng Khoa Hồi Sức Cấp Cứu', 35000000.00, 'ACTIVE', 'Hợp đồng không xác định thời hạn theo chế độ viên chức y tế'),
  ('cnt-doc2', 'EMP-DOC-002', 'HĐLĐ-BV-2023-042', 'DEFINITE_3YR', '2023-06-01', '2026-06-01', 'Bác sĩ Điều trị Hồi Sức Tích Cực', 28000000.00, 'ACTIVE', 'Hợp đồng 3 năm chuyên gia lâm sàng'),
  ('cnt-nur1', 'EMP-NUR-001', 'HĐLĐ-BV-2024-118', 'DEFINITE_1YR', '2025-11-20', '2026-11-20', 'Điều Dưỡng Viên Hồi Sức Cấp Cứu', 15000000.00, 'EXPIRING_SOON', 'Hợp đồng 1 năm sắp hết hạn trong 30 ngày tới cần tái ký'),
  ('cnt-nur2', 'EMP-NUR-002', 'HĐLĐ-BV-2026-012', 'PROBATION', '2026-09-01', '2026-11-30', 'Điều Dưỡng Viên Thử Việc', 11000000.00, 'ACTIVE', 'Hợp đồng thử việc 60 ngày theo luật lao động'),
  ('cnt-doc3', 'EMP-DOC-003', 'HĐLĐ-BV-2026-088', 'APPRENTICE', '2026-01-15', '2027-07-15', 'Bác Sĩ Học Việc Lâm Sàng (18 tháng CCHN)', 9000000.00, 'ACTIVE', 'Hợp đồng học việc thực hành 18 tháng để cấp chứng chỉ hành nghề khám chữa bệnh')
ON DUPLICATE KEY UPDATE `contract_number` = VALUES(`contract_number`);

-- Seed Social Insurances (BHXH, BHYT, BHTN, TNLĐ)
INSERT INTO `Social_Insurances` (`id`, `staff_id`, `bhxh_book_number`, `bhyt_card_number`, `primary_hospital_name`, `has_bhxh`, `has_bhyt`, `has_bhtn`, `has_occupational_accident`, `insurance_salary`, `status`)
VALUES
  ('ins-doc1', 'EMP-DOC-001', '0123456789', 'DN4010123456789', 'Bệnh viện Đa khoa Trung tâm Hà Nội', TRUE, TRUE, TRUE, TRUE, 29800000.00, 'ACTIVE'),
  ('ins-doc2', 'EMP-DOC-002', '0198765432', 'DN4010198765432', 'Bệnh viện Đại học Y Hà Nội', TRUE, TRUE, TRUE, TRUE, 24500000.00, 'ACTIVE'),
  ('ins-nur1', 'EMP-NUR-001', '0177665544', 'DN4010177665544', 'Bệnh viện Bạch Mai', TRUE, TRUE, TRUE, TRUE, 14200000.00, 'ACTIVE'),
  ('ins-nur2', 'EMP-NUR-002', '0188990011', 'DN4010188990011', 'Bệnh viện Đa khoa Đống Đa', TRUE, TRUE, FALSE, TRUE, 10500000.00, 'ACTIVE')
ON DUPLICATE KEY UPDATE `bhxh_book_number` = VALUES(`bhxh_book_number`);

-- Seed Commendations & Disciplines
INSERT INTO `Commendations_Disciplines` (`id`, `staff_id`, `record_type`, `decision_number`, `decision_date`, `signatory_authority`, `title`, `reason`, `reward_or_fine_amount`, `effective_date`)
VALUES
  ('rw-doc1-1', 'EMP-DOC-001', 'COMMENDATION', '152/QĐ-SYT', '2025-12-20', 'Giám Đốc Sở Y Tế Hà Nội', 'Chiến sĩ Thi đua Cấp Cơ Sở', 'Thành tích xuất sắc trong công tác cấp cứu hồi sinh tim phổi và điều hành khoa', 5000000.00, '2025-12-20'),
  ('rw-doc1-2', 'EMP-DOC-001', 'COMMENDATION', '88/QĐ-BV', '2026-02-27', 'Giám Đốc Bệnh Viện', 'Giấy Khen Ngày Thầy Thuốc Việt Nam 27/2', 'Gương mẫu tận tụy cứu chữa ca bệnh hiểm nghèo', 2000000.00, '2026-02-27'),
  ('rw-doc2-1', 'EMP-DOC-002', 'COMMENDATION', '45/QĐ-BV', '2026-06-30', 'Ban Chấp Hành Công Đoàn Bệnh Viện', 'Điển hình Tiên tiến Đổi mới Phong cách Thái độ phục vụ', 'Nhận thư khen từ thân nhân người bệnh khoa Hồi sức tích cực', 1500000.00, '2026-06-30'),
  ('rw-nur1-1', 'EMP-NUR-001', 'COMMENDATION', '12/QĐ-BV', '2025-10-26', 'Giám Đốc Bệnh Viện', 'Điều Dưỡng Viên Tiêu Biểu Bệnh Viện', 'Thao tác kỹ thuật chuẩn xác, an toàn không để xảy ra sai sót y khoa', 1000000.00, '2025-10-26')
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Seed Monthly KPIs
INSERT INTO `Monthly_KPIs` (`id`, `staff_id`, `kpi_month`, `target_shifts`, `actual_shifts`, `target_hours`, `actual_hours`, `on_time_attendance_rate`, `handover_compliance_rate`, `clinical_performance_score`, `patient_satisfaction_score`, `total_kpi_score`, `kpi_grade`, `evaluation_notes`, `evaluated_by`, `status`)
VALUES
  ('kpi-doc1-10', 'EMP-DOC-001', '2026-10', 22, 24, 168.0, 184.0, 98.50, 100.00, 96.00, 98.00, 97.50, 'GRADE_A', 'Chỉ đạo cấp cứu chuẩn xác, hoàn thành vượt định mức giờ trực lâm sàng', 'EMP-ADM-001', 'APPROVED'),
  ('kpi-doc1-09', 'EMP-DOC-001', '2026-09', 22, 22, 168.0, 172.0, 100.00, 100.00, 94.00, 96.00, 95.80, 'GRADE_A', 'Chấp hành nghiêm ngặt giao ban viện và an toàn người bệnh', 'EMP-ADM-001', 'APPROVED'),
  ('kpi-doc2-10', 'EMP-DOC-002', '2026-10', 20, 20, 160.0, 165.0, 95.00, 98.00, 92.00, 94.00, 93.40, 'GRADE_A', 'Chuyên môn vững vàng, bàn giao ca bệnh nặng đầy đủ', 'EMP-DOC-001', 'APPROVED'),
  ('kpi-nur1-10', 'EMP-NUR-001', '2026-10', 24, 24, 168.0, 176.0, 96.00, 100.00, 90.00, 95.00, 92.80, 'GRADE_A', 'Chăm sóc người bệnh chu đáo, ghi chép sổ trực khoa cẩn thận', 'EMP-DOC-001', 'APPROVED')
ON DUPLICATE KEY UPDATE `total_kpi_score` = VALUES(`total_kpi_score`);

-- Update Pay_Rates with Last Salary Increment Date & Privacy toggle
UPDATE `Pay_Rates` SET 
  `last_salary_increment_date` = '2026-01-01',
  `is_salary_increment_hidden` = FALSE
WHERE `staff_id` = 'EMP-DOC-001';

UPDATE `Pay_Rates` SET 
  `last_salary_increment_date` = '2025-07-01',
  `is_salary_increment_hidden` = FALSE
WHERE `staff_id` = 'EMP-DOC-002';

UPDATE `Pay_Rates` SET 
  `last_salary_increment_date` = '2026-03-01',
  `is_salary_increment_hidden` = FALSE
WHERE `staff_id` = 'EMP-NUR-001';
