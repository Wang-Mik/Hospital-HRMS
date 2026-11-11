import pool from '../db.js';

async function addColumnIfNotExists(conn, table, column, definition) {
  const [cols] = await conn.query(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (cols[0].cnt === 0) {
    console.log(`[Migration] Adding column ${table}.${column}...`);
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  } else {
    console.log(`[Migration] Column ${table}.${column} already exists.`);
  }
}

async function run() {
  console.log('[Migration] Starting database migration for Dossier, Roles, Ward Delegation, KPI, Contracts & Insurances...');
  const conn = await pool.getConnection();

  try {
    // 1. Roles
    console.log('[Migration] Updating Roles with 12 standard roles...');
    await conn.query(`
      INSERT INTO \`Roles\` (\`role_code\`, \`name\`, \`description\`) VALUES
        ('HOSPITAL_DIRECTOR', 'Giám Đốc Bệnh Viện', 'Lãnh đạo tối cao toàn diện bệnh viện, phê duyệt chủ trương, quy hoạch và ngân sách.'),
        ('VICE_DIRECTOR', 'Phó Giám Đốc Bệnh Viện', 'Phụ trách khối chuyên môn lâm sàng hoặc hậu cần, điều hành giao ban và ký văn bản.'),
        ('HEAD_OF_GENERAL_PLANNING', 'Trưởng Phòng Kế Hoạch Tổng Hợp', 'Điều phối chuyên môn, quy chế bệnh viện, thanh kiểm tra lâm sàng và lịch trực viện.'),
        ('HEAD_OF_NURSING', 'Trưởng Phòng Điều Dưỡng Viện', 'Chỉ đạo toàn bộ hệ thống điều dưỡng, nữ hộ sinh, kỹ thuật chăm sóc người bệnh toàn viện.'),
        ('HEAD_OF_HR', 'Trưởng Phòng Tổ Chức Cán Bộ', 'Trưởng phòng Nhân sự, phụ trách quy hoạch nhân lực, hợp đồng, kỷ luật và lương thưởng.'),
        ('HR_STAFF', 'Chuyên Viên Phòng Tổ Chức Cán Bộ', 'Thực hiện nghiệp vụ hồ sơ nhân sự, chấm công, bảo hiểm và cấp phát thẻ.'),
        ('CHIEF_NURSE', 'Điều Dưỡng Trưởng Khoa', 'Quản lý điều dưỡng khoa, phân chia ca kíp chăm sóc, kiểm kê thuốc và vật tư tiêu hao.'),
        ('ADMIN_STAFF', 'Nhân Viên Hành Chính & Dược Sĩ', 'Dược sĩ quản lý kho thuốc, nhân viên văn thư, tiếp đón bệnh nhân và hậu cần.'),
        ('IT_ADMIN', 'Admin IT / Kỹ Thuật Viên Viện', 'Quản trị hệ thống máy chủ, mạng LAN, thiết bị y tế và hỗ trợ kỹ thuật helpdesk.')
      ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`), \`description\` = VALUES(\`description\`)
    `);

    // Modify Employees.role safely
    console.log('[Migration] Expanding Employees.role ENUM...');
    await conn.query(`
      ALTER TABLE \`Employees\` MODIFY COLUMN \`role\` ENUM(
        'SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'VICE_DIRECTOR', 'HEAD_OF_GENERAL_PLANNING',
        'HEAD_OF_NURSING', 'HEAD_OF_HR', 'HR_MANAGER', 'HR_STAFF', 'DEPARTMENT_HEAD',
        'DOCTOR', 'CHIEF_NURSE', 'NURSE', 'ADMIN_STAFF', 'IT_ADMIN', 'TECHNICIAN', 'STAFF'
      ) NOT NULL DEFAULT 'STAFF'
    `);

    // 2. Academic_Degrees
    console.log('[Migration] Creating Academic_Degrees table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`Academic_Degrees\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`staff_id\` VARCHAR(50) NOT NULL,
        \`degree_level\` ENUM('COLLEGE', 'BACHELOR', 'MASTER', 'SPECIALIST_1', 'SPECIALIST_2', 'DOCTORATE', 'OTHER') NOT NULL DEFAULT 'BACHELOR',
        \`degree_name\` VARCHAR(255) NOT NULL,
        \`institution_name\` VARCHAR(255) NOT NULL,
        \`graduation_year\` INT NOT NULL,
        \`classification\` VARCHAR(50) NULL DEFAULT 'Giỏi',
        \`degree_number\` VARCHAR(100) NULL,
        \`document_url\` VARCHAR(500) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_degrees_staff\` (\`staff_id\`),
        CONSTRAINT \`fk_degrees_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`Employees\` (\`employee_code\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Specialized_Certifications
    console.log('[Migration] Creating Specialized_Certifications table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`Specialized_Certifications\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`staff_id\` VARCHAR(50) NOT NULL,
        \`certificate_name\` VARCHAR(255) NOT NULL,
        \`issuing_organization\` VARCHAR(255) NOT NULL,
        \`issue_date\` DATE NOT NULL,
        \`expiration_date\` DATE NULL,
        \`certificate_code\` VARCHAR(100) NULL,
        \`cme_hours\` INT NOT NULL DEFAULT 0,
        \`document_url\` VARCHAR(500) NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_certs_staff\` (\`staff_id\`),
        CONSTRAINT \`fk_certs_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`Employees\` (\`employee_code\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. Department_Roster_Delegations
    console.log('[Migration] Creating Department_Roster_Delegations table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`Department_Roster_Delegations\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`department_code\` VARCHAR(50) NOT NULL,
        \`delegated_staff_id\` VARCHAR(50) NOT NULL,
        \`assigned_by\` VARCHAR(50) NOT NULL,
        \`notes\` VARCHAR(255) NULL,
        \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_dept_delegation\` (\`department_code\`, \`delegated_staff_id\`),
        CONSTRAINT \`fk_delegation_dept\` FOREIGN KEY (\`department_code\`) REFERENCES \`Departments\` (\`department_code\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_delegation_staff\` FOREIGN KEY (\`delegated_staff_id\`) REFERENCES \`Employees\` (\`employee_code\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_delegation_assigner\` FOREIGN KEY (\`assigned_by\`) REFERENCES \`Employees\` (\`employee_code\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Add columns to Shifts
    await addColumnIfNotExists(conn, 'Shifts', 'approval_status', "ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED') NOT NULL DEFAULT 'APPROVED'");
    await addColumnIfNotExists(conn, 'Shifts', 'submitted_by', 'VARCHAR(50) NULL');
    await addColumnIfNotExists(conn, 'Shifts', 'approved_by', 'VARCHAR(50) NULL');
    await addColumnIfNotExists(conn, 'Shifts', 'approved_at', 'DATETIME NULL');

    // 6. Add columns to Pay_Rates
    await addColumnIfNotExists(conn, 'Pay_Rates', 'last_salary_increment_date', 'DATE NULL');
    await addColumnIfNotExists(conn, 'Pay_Rates', 'is_salary_increment_hidden', 'BOOLEAN NOT NULL DEFAULT FALSE');

    // 7. Monthly_KPIs
    console.log('[Migration] Creating Monthly_KPIs table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`Monthly_KPIs\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`staff_id\` VARCHAR(50) NOT NULL,
        \`kpi_month\` VARCHAR(7) NOT NULL,
        \`target_shifts\` INT NOT NULL DEFAULT 20,
        \`actual_shifts\` INT NOT NULL DEFAULT 0,
        \`target_hours\` DECIMAL(5,1) NOT NULL DEFAULT 160.0,
        \`actual_hours\` DECIMAL(5,1) NOT NULL DEFAULT 0.0,
        \`on_time_attendance_rate\` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
        \`handover_compliance_rate\` DECIMAL(5,2) NOT NULL DEFAULT 100.00,
        \`clinical_performance_score\` DECIMAL(5,2) NOT NULL DEFAULT 90.00,
        \`patient_satisfaction_score\` DECIMAL(5,2) NOT NULL DEFAULT 95.00,
        \`disciplinary_penalty_points\` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        \`total_kpi_score\` DECIMAL(5,2) NOT NULL DEFAULT 92.50,
        \`kpi_grade\` ENUM('GRADE_A', 'GRADE_B', 'GRADE_C', 'GRADE_D') NOT NULL DEFAULT 'GRADE_A',
        \`evaluation_notes\` TEXT NULL,
        \`evaluated_by\` VARCHAR(50) NULL,
        \`status\` ENUM('DRAFT', 'SUBMITTED', 'APPROVED') NOT NULL DEFAULT 'APPROVED',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_kpi_staff_month\` (\`staff_id\`, \`kpi_month\`),
        KEY \`idx_kpi_staff\` (\`staff_id\`),
        KEY \`idx_kpi_month\` (\`kpi_month\`),
        CONSTRAINT \`fk_kpi_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`Employees\` (\`employee_code\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. Employment_Contracts
    console.log('[Migration] Creating Employment_Contracts table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`Employment_Contracts\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`staff_id\` VARCHAR(50) NOT NULL,
        \`contract_number\` VARCHAR(100) NOT NULL,
        \`contract_type\` ENUM('PROBATION', 'APPRENTICE', 'DEFINITE_1YR', 'DEFINITE_3YR', 'INDEFINITE') NOT NULL DEFAULT 'DEFINITE_1YR',
        \`start_date\` DATE NOT NULL,
        \`end_date\` DATE NULL,
        \`job_title\` VARCHAR(100) NOT NULL,
        \`base_salary\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
        \`file_url\` VARCHAR(500) NULL,
        \`notes\` TEXT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_contract_number\` (\`contract_number\`),
        KEY \`idx_contracts_staff\` (\`staff_id\`),
        KEY \`idx_contracts_end_date\` (\`end_date\`),
        KEY \`idx_contracts_status\` (\`status\`),
        CONSTRAINT \`fk_contracts_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`Employees\` (\`employee_code\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 9. Social_Insurances
    console.log('[Migration] Creating Social_Insurances table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`Social_Insurances\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`staff_id\` VARCHAR(50) NOT NULL,
        \`bhxh_book_number\` VARCHAR(50) NOT NULL,
        \`bhyt_card_number\` VARCHAR(50) NOT NULL,
        \`primary_hospital_name\` VARCHAR(150) NOT NULL DEFAULT 'Bệnh viện Đa khoa Trung tâm',
        \`has_bhxh\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`has_bhyt\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`has_bhtn\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`has_occupational_accident\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`insurance_salary\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`status\` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_insurances_staff\` (\`staff_id\`),
        KEY \`idx_insurances_staff\` (\`staff_id\`),
        CONSTRAINT \`fk_insurances_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`Employees\` (\`employee_code\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 10. Commendations_Disciplines
    console.log('[Migration] Creating Commendations_Disciplines table...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`Commendations_Disciplines\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`staff_id\` VARCHAR(50) NOT NULL,
        \`record_type\` ENUM('COMMENDATION', 'DISCIPLINE') NOT NULL,
        \`decision_number\` VARCHAR(100) NOT NULL,
        \`decision_date\` DATE NOT NULL,
        \`signatory_authority\` VARCHAR(150) NOT NULL,
        \`title\` VARCHAR(255) NOT NULL,
        \`reason\` TEXT NOT NULL,
        \`reward_or_fine_amount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        \`effective_date\` DATE NOT NULL,
        \`expiration_date\` DATE NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_records_staff\` (\`staff_id\`),
        KEY \`idx_records_type\` (\`record_type\`),
        CONSTRAINT \`fk_records_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`Employees\` (\`employee_code\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 11. Inserting Clinical Seed Data
    console.log('[Migration] Inserting Clinical Seed Data...');
    await conn.query(`
      INSERT INTO \`Academic_Degrees\` (\`id\`, \`staff_id\`, \`degree_level\`, \`degree_name\`, \`institution_name\`, \`graduation_year\`, \`classification\`, \`degree_number\`)
      VALUES
        ('deg-doc1-1', 'EMP-DOC-001', 'BACHELOR', 'Bác sĩ Đa khoa', 'Đại học Y Hà Nội', 2012, 'Giỏi', 'BS-2012-YHN-0891'),
        ('deg-doc1-2', 'EMP-DOC-001', 'SPECIALIST_1', 'Bác sĩ Chuyên khoa I - Hồi sức Cấp cứu', 'Đại học Y Hà Nội', 2017, 'Xuất sắc', 'CK1-2017-0412'),
        ('deg-doc2-1', 'EMP-DOC-002', 'BACHELOR', 'Bác sĩ Đa khoa', 'Đại học Y Dược TP.HCM', 2014, 'Giỏi', 'BS-2014-YD-1102'),
        ('deg-doc2-2', 'EMP-DOC-002', 'MASTER', 'Thạc sĩ Y học Lâm sàng - Hồi sức Chống độc', 'Đại học Y Dược TP.HCM', 2019, 'Giỏi', 'ThS-2019-0921'),
        ('deg-nur1-1', 'EMP-NUR-001', 'BACHELOR', 'Cử nhân Điều dưỡng Đa khoa', 'Đại học Điều dưỡng Nam Định', 2018, 'Giỏi', 'CN-2018-DD-3341'),
        ('deg-nur2-1', 'EMP-NUR-002', 'COLLEGE', 'Cao đẳng Điều dưỡng', 'Cao đẳng Y tế Hà Nội', 2020, 'Khá', 'CĐ-2020-0512'),
        ('deg-tech1-1', 'EMP-TECH-001', 'BACHELOR', 'Cử nhân Kỹ thuật Xét nghiệm Y học', 'Đại học Y tế Công cộng', 2019, 'Giỏi', 'KTYH-2019-0219'),
        ('deg-phar1-1', 'EMP-PHAR-001', 'BACHELOR', 'Dược sĩ Đại học', 'Đại học Dược Hà Nội', 2016, 'Giỏi', 'DS-2016-DH-0842')
      ON DUPLICATE KEY UPDATE \`degree_name\` = VALUES(\`degree_name\`)
    `);

    await conn.query(`
      INSERT INTO \`Specialized_Certifications\` (\`id\`, \`staff_id\`, \`certificate_name\`, \`issuing_organization\`, \`issue_date\`, \`expiration_date\`, \`certificate_code\`, \`cme_hours\`)
      VALUES
        ('cme-doc1-1', 'EMP-DOC-001', 'Cấp cứu Tim mạch Nâng cao (ACLS)', 'Hiệp hội Tim mạch Hoa Kỳ (AHA) / BV Bạch Mai', '2024-03-10', '2026-03-10', 'AHA-ACLS-2024-991', 48),
        ('cme-doc1-2', 'EMP-DOC-001', 'Kỹ thuật Lọc máu liên tục trong HSTC (CRRT)', 'Bệnh viện Hữu nghị Việt Đức', '2023-08-15', '2028-08-15', 'CRRT-VD-2023-112', 72),
        ('cme-doc2-1', 'EMP-DOC-002', 'Hồi sức Nhi khoa Nâng cao (PALS)', 'Viện Nhi Trung Ương', '2024-05-20', '2026-05-20', 'PALS-VN-2024-041', 48),
        ('cme-doc2-2', 'EMP-DOC-002', 'Siêu âm Tim Cấp cứu tại Giường (FOCUS/POCUS)', 'Viện Tim Mạch Quốc Gia', '2023-11-01', NULL, 'POCUS-2023-8819', 60),
        ('cme-nur1-1', 'EMP-NUR-001', 'Chăm sóc Người bệnh Thở máy & Đặt Catheter', 'Hội Điều dưỡng Việt Nam', '2024-02-18', '2027-02-18', 'CC-DD-2024-0021', 36),
        ('cme-nur1-2', 'EMP-NUR-001', 'Kiểm soát Nhiễm khuẩn Bệnh viện Chuẩn Quốc gia', 'Sở Y Tế Hà Nội', '2024-01-12', NULL, 'KSNK-2024-4412', 24)
      ON DUPLICATE KEY UPDATE \`certificate_name\` = VALUES(\`certificate_name\`)
    `);

    await conn.query(`
      INSERT INTO \`Employment_Contracts\` (\`id\`, \`staff_id\`, \`contract_number\`, \`contract_type\`, \`start_date\`, \`end_date\`, \`job_title\`, \`base_salary\`, \`status\`, \`notes\`)
      VALUES
        ('cnt-doc1', 'EMP-DOC-001', 'HĐLĐ-BV-2020-001', 'INDEFINITE', '2020-03-15', NULL, 'Bác sĩ Trưởng Khoa Hồi Sức Cấp Cứu', 35000000.00, 'ACTIVE', 'Hợp đồng không xác định thời hạn theo chế độ viên chức y tế'),
        ('cnt-doc2', 'EMP-DOC-002', 'HĐLĐ-BV-2023-042', 'DEFINITE_3YR', '2023-06-01', '2026-06-01', 'Bác sĩ Điều trị Hồi Sức Tích Cực', 28000000.00, 'ACTIVE', 'Hợp đồng 3 năm chuyên gia lâm sàng'),
        ('cnt-nur1', 'EMP-NUR-001', 'HĐLĐ-BV-2024-118', 'DEFINITE_1YR', '2025-11-20', '2026-11-20', 'Điều Dưỡng Viên Hồi Sức Cấp Cứu', 15000000.00, 'EXPIRING_SOON', 'Hợp đồng 1 năm sắp hết hạn trong 30 ngày tới cần tái ký'),
        ('cnt-nur2', 'EMP-NUR-002', 'HĐLĐ-BV-2026-012', 'PROBATION', '2026-09-01', '2026-11-30', 'Điều Dưỡng Viên Thử Việc', 11000000.00, 'ACTIVE', 'Hợp đồng thử việc 60 ngày theo luật lao động'),
        ('cnt-doc3', 'EMP-DOC-003', 'HĐLĐ-BV-2026-088', 'APPRENTICE', '2026-01-15', '2027-07-15', 'Bác Sĩ Học Việc Lâm Sàng (18 tháng CCHN)', 9000000.00, 'ACTIVE', 'Hợp đồng học việc thực hành 18 tháng để cấp chứng chỉ hành nghề khám chữa bệnh')
      ON DUPLICATE KEY UPDATE \`contract_number\` = VALUES(\`contract_number\`)
    `);

    await conn.query(`
      INSERT INTO \`Social_Insurances\` (\`id\`, \`staff_id\`, \`bhxh_book_number\`, \`bhyt_card_number\`, \`primary_hospital_name\`, \`has_bhxh\`, \`has_bhyt\`, \`has_bhtn\`, \`has_occupational_accident\`, \`insurance_salary\`, \`status\`)
      VALUES
        ('ins-doc1', 'EMP-DOC-001', '0123456789', 'DN4010123456789', 'Bệnh viện Đa khoa Trung tâm Hà Nội', TRUE, TRUE, TRUE, TRUE, 29800000.00, 'ACTIVE'),
        ('ins-doc2', 'EMP-DOC-002', '0198765432', 'DN4010198765432', 'Bệnh viện Đại học Y Hà Nội', TRUE, TRUE, TRUE, TRUE, 24500000.00, 'ACTIVE'),
        ('ins-nur1', 'EMP-NUR-001', '0177665544', 'DN4010177665544', 'Bệnh viện Bạch Mai', TRUE, TRUE, TRUE, TRUE, 14200000.00, 'ACTIVE'),
        ('ins-nur2', 'EMP-NUR-002', '0188990011', 'DN4010188990011', 'Bệnh viện Đa khoa Đống Đa', TRUE, TRUE, FALSE, TRUE, 10500000.00, 'ACTIVE')
      ON DUPLICATE KEY UPDATE \`bhxh_book_number\` = VALUES(\`bhxh_book_number\`)
    `);

    await conn.query(`
      INSERT INTO \`Commendations_Disciplines\` (\`id\`, \`staff_id\`, \`record_type\`, \`decision_number\`, \`decision_date\`, \`signatory_authority\`, \`title\`, \`reason\`, \`reward_or_fine_amount\`, \`effective_date\`)
      VALUES
        ('rw-doc1-1', 'EMP-DOC-001', 'COMMENDATION', '152/QĐ-SYT', '2025-12-20', 'Giám Đốc Sở Y Tế Hà Nội', 'Chiến sĩ Thi đua Cấp Cơ Sở', 'Thành tích xuất sắc trong công tác cấp cứu hồi sinh tim phổi và điều hành khoa', 5000000.00, '2025-12-20'),
        ('rw-doc1-2', 'EMP-DOC-001', 'COMMENDATION', '88/QĐ-BV', '2026-02-27', 'Giám Đốc Bệnh Viện', 'Giấy Khen Ngày Thầy Thuốc Việt Nam 27/2', 'Gương mẫu tận tụy cứu chữa ca bệnh hiểm nghèo', 2000000.00, '2026-02-27'),
        ('rw-doc2-1', 'EMP-DOC-002', 'COMMENDATION', '45/QĐ-BV', '2026-06-30', 'Ban Chấp Hành Công Đoàn Bệnh Viện', 'Điển hình Tiên tiến Đổi mới Phong cách Thái độ phục vụ', 'Nhận thư khen từ thân nhân người bệnh khoa Hồi sức tích cực', 1500000.00, '2026-06-30'),
        ('rw-nur1-1', 'EMP-NUR-001', 'COMMENDATION', '12/QĐ-BV', '2025-10-26', 'Giám Đốc Bệnh Viện', 'Điều Dưỡng Viên Tiêu Biểu Bệnh Viện', 'Thao tác kỹ thuật chuẩn xác, an toàn không để xảy ra sai sót y khoa', 1000000.00, '2025-10-26')
      ON DUPLICATE KEY UPDATE \`title\` = VALUES(\`title\`)
    `);

    await conn.query(`
      INSERT INTO \`Monthly_KPIs\` (\`id\`, \`staff_id\`, \`kpi_month\`, \`target_shifts\`, \`actual_shifts\`, \`target_hours\`, \`actual_hours\`, \`on_time_attendance_rate\`, \`handover_compliance_rate\`, \`clinical_performance_score\`, \`patient_satisfaction_score\`, \`total_kpi_score\`, \`kpi_grade\`, \`evaluation_notes\`, \`evaluated_by\`, \`status\`)
      VALUES
        ('kpi-doc1-10', 'EMP-DOC-001', '2026-10', 22, 24, 168.0, 184.0, 98.50, 100.00, 96.00, 98.00, 97.50, 'GRADE_A', 'Chỉ đạo cấp cứu chuẩn xác, hoàn thành vượt định mức giờ trực lâm sàng', 'EMP-ADM-001', 'APPROVED'),
        ('kpi-doc1-09', 'EMP-DOC-001', '2026-09', 22, 22, 168.0, 172.0, 100.00, 100.00, 94.00, 96.00, 95.80, 'GRADE_A', 'Chấp hành nghiêm ngặt giao ban viện và an toàn người bệnh', 'EMP-ADM-001', 'APPROVED'),
        ('kpi-doc2-10', 'EMP-DOC-002', '2026-10', 20, 20, 160.0, 165.0, 95.00, 98.00, 92.00, 94.00, 93.40, 'GRADE_A', 'Chuyên môn vững vàng, bàn giao ca bệnh nặng đầy đủ', 'EMP-DOC-001', 'APPROVED'),
        ('kpi-nur1-10', 'EMP-NUR-001', '2026-10', 24, 24, 168.0, 176.0, 96.00, 100.00, 90.00, 95.00, 92.80, 'GRADE_A', 'Chăm sóc người bệnh chu đáo, ghi chép sổ trực khoa cẩn thận', 'EMP-DOC-001', 'APPROVED')
      ON DUPLICATE KEY UPDATE \`total_kpi_score\` = VALUES(\`total_kpi_score\`)
    `);

    await conn.query(`
      UPDATE \`Pay_Rates\` SET 
        \`last_salary_increment_date\` = '2026-01-01',
        \`is_salary_increment_hidden\` = FALSE
      WHERE \`staff_id\` = 'EMP-DOC-001'
    `);

    await conn.query(`
      UPDATE \`Pay_Rates\` SET 
        \`last_salary_increment_date\` = '2025-07-01',
        \`is_salary_increment_hidden\` = FALSE
      WHERE \`staff_id\` = 'EMP-DOC-002'
    `);

    await conn.query(`
      UPDATE \`Pay_Rates\` SET 
        \`last_salary_increment_date\` = '2026-03-01',
        \`is_salary_increment_hidden\` = FALSE
      WHERE \`staff_id\` = 'EMP-NUR-001'
    `);

    // 8. Elastic Overrun Duty (Ca Trực Co Giãn & Ghi Nhận Giờ Vượt Trực)
    console.log('[Migration] Adding columns for Elastic Shift Overrun & Clinical Case Reference...');
    await addColumnIfNotExists(conn, 'Shifts', 'scheduled_end_time', 'DATETIME NULL');
    await addColumnIfNotExists(conn, 'Shifts', 'is_overrun', 'BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumnIfNotExists(conn, 'Shifts', 'overrun_minutes', 'INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists(conn, 'Shifts', 'overrun_reason', 'VARCHAR(100) NULL');
    await addColumnIfNotExists(conn, 'Shifts', 'clinical_case_ref', 'VARCHAR(100) NULL');
    await addColumnIfNotExists(conn, 'Shifts', 'overrun_notes', 'TEXT NULL');
    await addColumnIfNotExists(conn, 'Shifts', 'overrun_approval_status', "ENUM('NOT_APPLICABLE', 'AUTO_APPROVED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_APPLICABLE'");
    await addColumnIfNotExists(conn, 'Shifts', 'overrun_approved_by', 'VARCHAR(50) NULL');
    await addColumnIfNotExists(conn, 'Shifts', 'overrun_approved_at', 'DATETIME NULL');

    await addColumnIfNotExists(conn, 'Attendances', 'overrun_reason', 'VARCHAR(100) NULL');
    await addColumnIfNotExists(conn, 'Attendances', 'clinical_case_ref', 'VARCHAR(100) NULL');
    await addColumnIfNotExists(conn, 'Attendances', 'overrun_approval_status', "ENUM('NOT_APPLICABLE', 'AUTO_APPROVED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_APPLICABLE'");
    await addColumnIfNotExists(conn, 'Attendances', 'overrun_approved_by', 'VARCHAR(50) NULL');
    await addColumnIfNotExists(conn, 'Attendances', 'overrun_approved_at', 'DATETIME NULL');

    // Backfill scheduled_end_time with end_time for existing shifts
    console.log('[Migration] Backfilling Shifts.scheduled_end_time...');
    await conn.query('UPDATE `Shifts` SET `scheduled_end_time` = `end_time` WHERE `scheduled_end_time` IS NULL');

    console.log('[Migration] ALL MIGRATIONS AND SEEDING COMPLETED 100%!');
  } catch (err) {
    console.error('[Migration Error]:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
