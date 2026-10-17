import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: 'monolith-backend/.env' });

async function runMigration() {
  console.log('Connecting to MySQL...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'hrm_db'
  });

  console.log('Applying hospital standard columns...');

  // 1. Shift_Handovers columns
  const [hoCols] = await conn.query('SHOW COLUMNS FROM Shift_Handovers');
  const hoColNames = hoCols.map(c => c.Field);

  if (!hoColNames.includes('handover_category')) {
    await conn.query(`
      ALTER TABLE Shift_Handovers 
      ADD COLUMN handover_category ENUM('SHIFT_HANDOVER', 'DEPT_BRIEFING', 'HOSPITAL_BRIEFING') NOT NULL DEFAULT 'SHIFT_HANDOVER'
    `);
    console.log('+ Added handover_category to Shift_Handovers');
  }

  if (!hoColNames.includes('doc_type')) {
    await conn.query(`
      ALTER TABLE Shift_Handovers 
      ADD COLUMN doc_type ENUM('PHYSICAL_BOOK', 'IMAGE_UPLOAD', 'DOCUMENT_LINK', 'TEXT_NOTES') NOT NULL DEFAULT 'PHYSICAL_BOOK'
    `);
    console.log('+ Added doc_type to Shift_Handovers');
  }

  if (!hoColNames.includes('file_url')) {
    await conn.query(`ALTER TABLE Shift_Handovers ADD COLUMN file_url MEDIUMTEXT NULL`);
    console.log('+ Added file_url to Shift_Handovers');
  }

  if (!hoColNames.includes('external_link')) {
    await conn.query(`ALTER TABLE Shift_Handovers ADD COLUMN external_link VARCHAR(500) NULL`);
    console.log('+ Added external_link to Shift_Handovers');
  }

  if (!hoColNames.includes('physical_book_name')) {
    await conn.query(`ALTER TABLE Shift_Handovers ADD COLUMN physical_book_name VARCHAR(150) NULL`);
    console.log('+ Added physical_book_name to Shift_Handovers');
  }

  if (!hoColNames.includes('physical_book_page')) {
    await conn.query(`ALTER TABLE Shift_Handovers ADD COLUMN physical_book_page VARCHAR(50) NULL`);
    console.log('+ Added physical_book_page to Shift_Handovers');
  }

  if (!hoColNames.includes('physical_storage_location')) {
    await conn.query(`ALTER TABLE Shift_Handovers ADD COLUMN physical_storage_location VARCHAR(150) NULL`);
    console.log('+ Added physical_storage_location to Shift_Handovers');
  }

  if (!hoColNames.includes('summary_metrics')) {
    await conn.query(`ALTER TABLE Shift_Handovers ADD COLUMN summary_metrics VARCHAR(255) NULL`);
    console.log('+ Added summary_metrics to Shift_Handovers');
  }

  if (!hoColNames.includes('department_code')) {
    await conn.query(`ALTER TABLE Shift_Handovers ADD COLUMN department_code VARCHAR(50) NULL`);
    console.log('+ Added department_code to Shift_Handovers');
  }

  // Make incoming_shift_id and outgoing_shift_id nullable in Shift_Handovers so Briefings can work seamlessly without dummy shift
  await conn.query(`ALTER TABLE Shift_Handovers MODIFY COLUMN outgoing_shift_id VARCHAR(36) NULL`);
  console.log('+ Modified outgoing_shift_id to be NULLable for general briefings');

  // 2. Shifts columns: 4 Cấp Thường Trực & Kíp trực
  const [shiftCols] = await conn.query('SHOW COLUMNS FROM Shifts');
  const shiftColNames = shiftCols.map(c => c.Field);

  if (!shiftColNames.includes('on_call_tier')) {
    await conn.query(`
      ALTER TABLE Shifts 
      ADD COLUMN on_call_tier ENUM('LEADERSHIP', 'CLINICAL', 'PARACLINICAL', 'LOGISTICS') NOT NULL DEFAULT 'CLINICAL'
    `);
    console.log('+ Added on_call_tier to Shifts');
  }

  if (!shiftColNames.includes('team_code')) {
    await conn.query(`
      ALTER TABLE Shifts 
      ADD COLUMN team_code ENUM('TEAM_A', 'TEAM_B', 'TEAM_C', 'TEAM_D', 'GENERAL') NOT NULL DEFAULT 'GENERAL'
    `);
    console.log('+ Added team_code to Shifts');
  }

  if (!shiftColNames.includes('is_24h_on_call')) {
    await conn.query(`
      ALTER TABLE Shifts 
      ADD COLUMN is_24h_on_call BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('+ Added is_24h_on_call to Shifts');
  }

  // 3. Pay_Slips columns: Phụ cấp trực & phẫu thuật thủ thuật
  const [psCols] = await conn.query('SHOW COLUMNS FROM Pay_Slips');
  const psColNames = psCols.map(c => c.Field);

  if (!psColNames.includes('on_call_allowance')) {
    await conn.query(`ALTER TABLE Pay_Slips ADD COLUMN on_call_allowance DECIMAL(10, 2) NOT NULL DEFAULT 0.00`);
    console.log('+ Added on_call_allowance to Pay_Slips');
  }

  if (!psColNames.includes('surgery_allowance')) {
    await conn.query(`ALTER TABLE Pay_Slips ADD COLUMN surgery_allowance DECIMAL(10, 2) NOT NULL DEFAULT 0.00`);
    console.log('+ Added surgery_allowance to Pay_Slips');
  }

  // 4. Update standard hospital departments according to Tier II/III model
  console.log('Ensuring standard hospital departments (Tier II/III model)...');
  const standardDepts = [
    { code: 'DEP-KHTH', name: 'Phòng Kế Hoạch Tổng Hợp', location: 'Tòa Nhà A - Tầng 4 (Khu Hành Chính)' },
    { code: 'DEP-DD', name: 'Phòng Điều Dưỡng', location: 'Tòa Nhà A - Tầng 4 (Khu Hành Chính)' },
    { code: 'DEP-TCCB', name: 'Phòng Tổ Chức Cán Bộ & Hành Chính Quản Trị', location: 'Tòa Nhà A - Tầng 4 (Khu Hành Chính)' },
    { code: 'DEP-TCKT', name: 'Phòng Tài Chính Kế Toán', location: 'Tòa Nhà A - Tầng 3 (Khu Hành Chính)' },
    { code: 'DEP-KB', name: 'Khoa Khám Bệnh', location: 'Tòa Nhà A - Tầng 1 (Khu Khám Bệnh Ngoại Trú)' },
    { code: 'DEP-CC-HSTC', name: 'Khoa Cấp Cứu & Hồi Sức Tích Cực (ICU)', location: 'Tòa Nhà A - Tầng 1-2 (Khu Cấp Cứu 24/7)' },
    { code: 'DEP-NOI', name: 'Khoa Nội Tổng Hợp', location: 'Tòa Nhà A - Tầng 3 (Khu Nội Trú)' },
    { code: 'DEP-NGOAI', name: 'Khoa Ngoại Tổng Hợp & Phẫu Thuật', location: 'Tòa Nhà B - Tầng 2 (Khu Phẫu Thuật Gây Mê)' },
    { code: 'DEP-SAN', name: 'Khoa Phụ Sản', location: 'Tòa Nhà B - Tầng 3 (Khu Sản Phụ Khoa)' },
    { code: 'DEP-NHI', name: 'Khoa Nhi', location: 'Tòa Nhà B - Tầng 3 (Khu Nhi Khoa)' },
    { code: 'DEP-CDHA-XN', name: 'Khoa Chẩn Đoán Hình Ảnh & Xét Nghiệm', location: 'Tòa Nhà B - Tầng 1 (Khu Cận Lâm Sàng)' },
    { code: 'DEP-DUOC-VTTB', name: 'Khoa Dược & Vật Tư Thiết Bị Y Tế', location: 'Tòa Nhà C - Tầng 1 (Kho Dược Trung Tâm)' }
  ];

  for (const d of standardDepts) {
    await conn.query(`
      INSERT INTO Departments (department_code, name, location, status)
      VALUES (?, ?, ?, 'ACTIVE')
      ON DUPLICATE KEY UPDATE name = VALUES(name), location = VALUES(location)
    `, [d.code, d.name, d.location]);
  }
  console.log(`+ Seeded/Verified ${standardDepts.length} standard departments.`);

  // 5. Update sample shifts with tiers & teams
  await conn.query(`
    UPDATE Shifts SET on_call_tier = 'CLINICAL', team_code = 'TEAM_A' WHERE on_call_tier IS NULL;
  `);

  console.log('Migration completed successfully!');
  await conn.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
