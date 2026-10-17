import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'admin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
const DB_NAME = process.env.DB_NAME || 'hrm_db';

async function migrate() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true
  });

  console.log('Migrating profile fields in hrm_db...');

  // Check existing columns in Employees
  const [cols] = await conn.query('DESCRIBE Employees');
  const existingCols = new Set(cols.map(c => c.Field));

  const columnsToAdd = [
    { name: 'avatar_url', sql: 'ADD COLUMN avatar_url MEDIUMTEXT NULL AFTER phone' },
    { name: 'dob', sql: "ADD COLUMN dob DATE NULL DEFAULT '1982-08-15' AFTER avatar_url" },
    { name: 'gender', sql: "ADD COLUMN gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL DEFAULT 'MALE' AFTER dob" },
    { name: 'marital_status', sql: "ADD COLUMN marital_status ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED') NOT NULL DEFAULT 'MARRIED' AFTER gender" },
    { name: 'national_id', sql: "ADD COLUMN national_id VARCHAR(50) NULL DEFAULT '079084001234' AFTER marital_status" },
    { name: 'nationality', sql: "ADD COLUMN nationality VARCHAR(50) NOT NULL DEFAULT 'Việt Nam' AFTER national_id" },
    { name: 'personal_email', sql: "ADD COLUMN personal_email VARCHAR(150) NULL DEFAULT 'nguyenvanan.md@gmail.com' AFTER nationality" },
    { name: 'personal_phone', sql: "ADD COLUMN personal_phone VARCHAR(30) NULL DEFAULT '+84 912 345 678' AFTER personal_email" },
    { name: 'home_phone', sql: "ADD COLUMN home_phone VARCHAR(30) NULL DEFAULT '+84 (028) 3855 4269' AFTER personal_phone" },
    { name: 'home_address', sql: "ADD COLUMN home_address VARCHAR(255) NULL DEFAULT '124/15 Nguyễn Tri Phương, Phường 9' AFTER home_phone" },
    { name: 'district', sql: "ADD COLUMN district VARCHAR(100) NULL DEFAULT 'Quận 5' AFTER home_address" },
    { name: 'city_province', sql: "ADD COLUMN city_province VARCHAR(100) NULL DEFAULT 'TP. Hồ Chí Minh' AFTER district" },
    { name: 'postal_code', sql: "ADD COLUMN postal_code VARCHAR(20) NULL DEFAULT '700000' AFTER city_province" },
    { name: 'work_location', sql: "ADD COLUMN work_location VARCHAR(150) NOT NULL DEFAULT 'Cơ sở 1 - Khu Lâm sàng Trung tâm A' AFTER postal_code" },
    { name: 'office_location', sql: "ADD COLUMN office_location VARCHAR(100) NOT NULL DEFAULT 'Phòng Trực A-302, Tầng 3' AFTER work_location" }
  ];

  for (const col of columnsToAdd) {
    if (!existingCols.has(col.name)) {
      console.log(`Adding column ${col.name} to Employees...`);
      await conn.query(`ALTER TABLE Employees ${col.sql}`);
    }
  }

  // Check emergency_contacts priority column
  const [emCols] = await conn.query('DESCRIBE emergency_contacts');
  const emExisting = new Set(emCols.map(c => c.Field));
  if (!emExisting.has('priority')) {
    console.log('Adding priority column to emergency_contacts...');
    await conn.query("ALTER TABLE emergency_contacts ADD COLUMN priority VARCHAR(50) NOT NULL DEFAULT 'Primary (Ưu tiên 1)' AFTER phone_number");
  }

  // Populate seed emergency contacts for EMP-DOC-001 if none exist
  const [existingContacts] = await conn.query("SELECT COUNT(*) as count FROM emergency_contacts WHERE staff_id = 'EMP-DOC-001'");
  if (existingContacts[0].count === 0) {
    console.log('Seeding initial emergency contacts for EMP-DOC-001...');
    await conn.query(`
      INSERT INTO emergency_contacts (id, staff_id, contact_name, relationship, phone_number, priority)
      VALUES 
        ('ec-001', 'EMP-DOC-001', 'Trần Thị Mai', 'Vợ / Chồng (Spouse)', '0987 654 321', 'Primary (Ưu tiên 1)'),
        ('ec-002', 'EMP-DOC-001', 'Nguyễn Văn Hùng', 'Anh / Em ruột (Brother)', '0901 234 567', 'Secondary (Ưu tiên 2)')
    `);
  }

  console.log('Migration finished successfully!');
  await conn.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
