import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'admin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
const DB_NAME = process.env.DB_NAME || 'hrm_db';
const isCloudSsl =
  process.env.DB_SSL === 'true' ||
  /tidbcloud\.com|aivencloud\.com|clever-cloud\.com|psdb\.cloud/i.test(DB_HOST);

async function seedVietnamHospital() {
  console.log('====================================================================');
  console.log('🏥 Khởi tạo dữ liệu Bệnh viện Đa khoa Việt Nam (Quy mô vừa & nhỏ)');
  console.log(`📡 Kết nối tới MySQL: ${DB_HOST}:${DB_PORT}, Database: ${DB_NAME}`);
  console.log('====================================================================');

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
    dateStrings: true,
    ...(isCloudSsl ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false } } : {})
  });

  try {
    // 0. Nâng cấp độ chính xác trường tiền tệ VND sang DECIMAL(15, 2)
    console.log('\n🔧 Bước 0: Tối ưu hoá kiểu dữ liệu tiền tệ VND trong Database...');
    await conn.query(`
      ALTER TABLE \`Pay_Rates\` MODIFY \`base_hourly_rate\` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE \`Pay_Slips\` MODIFY \`base_pay\` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE \`Pay_Slips\` MODIFY \`night_differential\` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE \`Pay_Slips\` MODIFY \`overtime_pay\` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;
      ALTER TABLE \`Pay_Slips\` MODIFY \`net_pay\` DECIMAL(15, 2) NOT NULL DEFAULT 0.00;
    `);
    console.log('   ✔ Đã cấu hình trường tiền tệ DECIMAL(15, 2) sẵn sàng cho VND.');

    // 1. Truncate sạch toàn bộ 18 bảng
    console.log('\n🧹 Bước 1: Dọn sạch các bảng trước khi nạp dữ liệu bệnh viện...');
    await conn.query(`
      SET FOREIGN_KEY_CHECKS = 0;
      TRUNCATE TABLE \`Handover_Checklists\`;
      TRUNCATE TABLE \`Shift_Handovers\`;
      TRUNCATE TABLE \`Daily_Tasks\`;
      TRUNCATE TABLE \`Notifications\`;
      TRUNCATE TABLE \`Payment_Elections\`;
      TRUNCATE TABLE \`Pay_Slips\`;
      TRUNCATE TABLE \`Payroll_Runs\`;
      TRUNCATE TABLE \`Pay_Rates\`;
      TRUNCATE TABLE \`Leave_Balances\`;
      TRUNCATE TABLE \`Leave_Requests\`;
      TRUNCATE TABLE \`Attendances\`;
      TRUNCATE TABLE \`Shifts\`;
      TRUNCATE TABLE \`Documents\`;
      TRUNCATE TABLE \`Emergency_Contacts\`;
      TRUNCATE TABLE \`Medical_Licenses\`;
      TRUNCATE TABLE \`Accounts\`;
      TRUNCATE TABLE \`Employees\`;
      TRUNCATE TABLE \`Departments\`;
      SET FOREIGN_KEY_CHECKS = 1;
    `);
    console.log('   ✔ Toàn bộ 18 bảng đã được làm sạch.');

    // 2. Thêm 8 Khoa / Phòng chức năng chuẩn bệnh viện tuyến quận/huyện Việt Nam
    console.log('\n🏥 Bước 2: Thiết lập 8 Khoa / Phòng chức năng Bệnh viện Việt Nam...');
    const departments = [
      {
        department_code: 'DEP-KHB',
        name: 'Khoa Khám Bệnh & Cấp Cứu Ban Đầu',
        description: 'Đón tiếp, phân luồng, khám bệnh ngoại trú BHYT/dịch vụ và sơ cấp cứu ban đầu 24/7.',
        location: 'Tòa nhà A - Tầng 1 (Khu Khám Bệnh Ngoại Trú)'
      },
      {
        department_code: 'DEP-HSTC',
        name: 'Khoa Hồi Sức Tích Cực & Chống Độc (ICU)',
        description: 'Điều trị hồi sức cho người bệnh nặng nguy kịch, thở máy, sốc nhiễm khuẩn và ngộ độc cấp.',
        location: 'Tòa nhà A - Tầng 2 (Khu Điều Trị Đặc Biệt)'
      },
      {
        department_code: 'DEP-NOI',
        name: 'Khoa Nội Tổng Hợp',
        description: 'Chẩn đoán và điều trị nội trú các bệnh lý tim mạch, đái tháo đường, hô hấp và lão khoa.',
        location: 'Tòa nhà A - Tầng 3 (Khu Nội Trú Tổng Hợp)'
      },
      {
        department_code: 'DEP-NGOAI',
        name: 'Khoa Ngoại Tổng Hợp & Phẫu Thuật',
        description: 'Thực hiện phẫu thuật nội soi, mổ tiểu phẫu, xử trí chấn thương và chăm sóc hậu phẫu.',
        location: 'Tòa nhà B - Tầng 2 (Khu Phẫu Thuật Vô Khuẩn)'
      },
      {
        department_code: 'DEP-SANNHI',
        name: 'Khoa Phụ Sản & Nhi Khoa',
        description: 'Chăm sóc sức khỏe bà mẹ và trẻ em, đỡ đẻ thường, chăm sóc sơ sinh và điều trị nhi khoa.',
        location: 'Tòa nhà B - Tầng 3 (Khu Sản - Nhi)'
      },
      {
        department_code: 'DEP-CDHA',
        name: 'Khoa Chẩn Đoán Hình Ảnh & Xét Nghiệm',
        description: 'Thực hiện chụp X-quang kỹ thuật số, siêu âm Doppler màu, xét nghiệm sinh hóa - huyết học.',
        location: 'Tòa nhà B - Tầng 1 (Khu Cận Lâm Sàng)'
      },
      {
        department_code: 'DEP-DUOC',
        name: 'Khoa Dược & Trang Thiết Bị Y Tế',
        description: 'Cung ứng, bảo quản và cấp phát thuốc BHYT, hóa chất sát khuẩn và vật tư y tế tiêu hao.',
        location: 'Tòa nhà C - Tầng 1 (Kho Dược Trung Tâm)'
      },
      {
        department_code: 'DEP-KHTH',
        name: 'Phòng Kế Hoạch Tổng Hợp & Hành Chính',
        description: 'Điều phối hoạt động chuyên môn, xếp lịch trực, quản lý hồ sơ bệnh án và nhân sự bệnh viện.',
        location: 'Tòa nhà A - Tầng 4 (Khu Hành Chính Quản Trị)'
      }
    ];

    for (const d of departments) {
      await conn.execute(
        `INSERT INTO Departments (department_code, name, description, location, status) VALUES (?, ?, ?, ?, 'ACTIVE')`,
        [d.department_code, d.name, d.description, d.location]
      );
    }
    console.log(`   ✔ Đã thiết lập 8 khoa phòng chức năng.`);

    // 3. Thêm nhân sự bệnh viện với tên chung chung Nguyễn Văn A, B, C, D...
    console.log('\n👨‍⚕️ Bước 3: Thêm nhân sự bệnh viện (Nguyễn Văn A, B, C, D...)...');
    const staffList = [
      {
        employee_code: 'EMP-ADM-001',
        first_name: 'Văn A',
        last_name: 'Nguyễn',
        email: 'admin@hospital.vn',
        phone: '0901234001',
        department_code: 'DEP-KHTH',
        role: 'SUPER_ADMIN',
        specialty: 'Bác sĩ CKI - Quản lý Bệnh viện & Cấp cứu',
        hire_date: '2018-01-15',
        username: 'admin',
        gender: 'MALE',
        dob: '1980-05-12',
        cccd: '001080001234',
        hourly_rate: 170000, // ~30.000.000 đ/tháng
        base_pay: 28000000,
        night_diff: 2500000,
        ot_pay: 3000000,
        net_pay: 30500000,
        bank_name: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
        bank_account: '0011004128912',
        routing: 'VCB-VN-001'
      },
      {
        employee_code: 'EMP-DOC-001',
        first_name: 'Văn B',
        last_name: 'Nguyễn',
        email: 'dr.b@hospital.vn',
        phone: '0901234002',
        department_code: 'DEP-HSTC',
        role: 'DEPARTMENT_HEAD',
        specialty: 'Bác sĩ CKI Hồi sức Cấp cứu & Chống độc',
        hire_date: '2019-03-01',
        username: 'dr.b',
        gender: 'MALE',
        dob: '1983-09-20',
        cccd: '001083002345',
        hourly_rate: 150000, // ~26.400.000 đ/tháng
        base_pay: 24500000,
        night_diff: 2200000,
        ot_pay: 2500000,
        net_pay: 26500000,
        bank_name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
        bank_account: '1201000067891',
        routing: 'BIDV-VN-018'
      },
      {
        employee_code: 'EMP-DOC-002',
        first_name: 'Thị C',
        last_name: 'Nguyễn',
        email: 'dr.c@hospital.vn',
        phone: '0901234003',
        department_code: 'DEP-NOI',
        role: 'DOCTOR',
        specialty: 'Bác sĩ Đa khoa - Nội Tim Mạch & Chuyển Hóa',
        hire_date: '2021-06-15',
        username: 'dr.c',
        gender: 'FEMALE',
        dob: '1988-11-05',
        cccd: '001088003456',
        hourly_rate: 120000, // ~21.000.000 đ/tháng
        base_pay: 20000000,
        night_diff: 1800000,
        ot_pay: 1500000,
        net_pay: 21200000,
        bank_name: 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)',
        bank_account: '108000543210',
        routing: 'CTG-VN-012'
      },
      {
        employee_code: 'EMP-DOC-003',
        first_name: 'Văn D',
        last_name: 'Nguyễn',
        email: 'dr.d@hospital.vn',
        phone: '0901234004',
        department_code: 'DEP-NGOAI',
        role: 'DOCTOR',
        specialty: 'Bác sĩ Ngoại khoa - Phẫu thuật Nội soi',
        hire_date: '2020-10-01',
        username: 'dr.d',
        gender: 'MALE',
        dob: '1985-04-18',
        cccd: '001085004567',
        hourly_rate: 125000, // ~22.000.000 đ/tháng
        base_pay: 21000000,
        night_diff: 2000000,
        ot_pay: 2200000,
        net_pay: 22800000,
        bank_name: 'Ngân hàng TMCP Quân Đội (MBBank)',
        bank_account: '0680100987654',
        routing: 'MB-VN-023'
      },
      {
        employee_code: 'EMP-DOC-004',
        first_name: 'Thị E',
        last_name: 'Nguyễn',
        email: 'dr.e@hospital.vn',
        phone: '0901234005',
        department_code: 'DEP-SANNHI',
        role: 'DOCTOR',
        specialty: 'Bác sĩ Chuyên khoa Sản Phụ khoa & Nhi',
        hire_date: '2022-02-10',
        username: 'dr.e',
        gender: 'FEMALE',
        dob: '1990-07-25',
        cccd: '001090005678',
        hourly_rate: 115000, // ~20.000.000 đ/tháng
        base_pay: 19500000,
        night_diff: 1500000,
        ot_pay: 1200000,
        net_pay: 20400000,
        bank_name: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
        bank_account: '0011007891234',
        routing: 'VCB-VN-001'
      },
      {
        employee_code: 'EMP-NUR-001',
        first_name: 'Văn F',
        last_name: 'Nguyễn',
        email: 'rn.f@hospital.vn',
        phone: '0901234006',
        department_code: 'DEP-HSTC',
        role: 'NURSE',
        specialty: 'Điều dưỡng Trưởng - Hồi sức Cấp cứu',
        hire_date: '2019-08-01',
        username: 'rn.f',
        gender: 'MALE',
        dob: '1987-12-14',
        cccd: '001087006789',
        hourly_rate: 80000, // ~14.000.000 đ/tháng
        base_pay: 13500000,
        night_diff: 1600000,
        ot_pay: 1200000,
        net_pay: 14700000,
        bank_name: 'Ngân hàng Nông nghiệp & Phát triển Nông thôn (Agribank)',
        bank_account: '1500205891234',
        routing: 'VBA-VN-005'
      },
      {
        employee_code: 'EMP-NUR-002',
        first_name: 'Thị G',
        last_name: 'Nguyễn',
        email: 'rn.g@hospital.vn',
        phone: '0901234007',
        department_code: 'DEP-NOI',
        role: 'NURSE',
        specialty: 'Điều dưỡng Chăm sóc Bệnh nhân Nội trú',
        hire_date: '2023-01-15',
        username: 'rn.g',
        gender: 'FEMALE',
        dob: '1995-03-30',
        cccd: '001095007890',
        hourly_rate: 60000, // ~10.500.000 đ/tháng
        base_pay: 9800000,
        night_diff: 1200000,
        ot_pay: 800000,
        net_pay: 10800000,
        bank_name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)',
        bank_account: '1201000088899',
        routing: 'BIDV-VN-018'
      },
      {
        employee_code: 'EMP-TECH-001',
        first_name: 'Văn H',
        last_name: 'Nguyễn',
        email: 'tech.h@hospital.vn',
        phone: '0901234008',
        department_code: 'DEP-CDHA',
        role: 'TECHNICIAN',
        specialty: 'Kỹ thuật viên X-Quang & Xét nghiệm Y học',
        hire_date: '2022-05-01',
        username: 'tech.h',
        gender: 'MALE',
        dob: '1992-08-08',
        cccd: '001092008901',
        hourly_rate: 65000, // ~11.500.000 đ/tháng
        base_pay: 11000000,
        night_diff: 1000000,
        ot_pay: 900000,
        net_pay: 11800000,
        bank_name: 'Ngân hàng TMCP Quân Đội (MBBank)',
        bank_account: '0680100112233',
        routing: 'MB-VN-023'
      },
      {
        employee_code: 'EMP-PHAR-001',
        first_name: 'Thị I',
        last_name: 'Nguyễn',
        email: 'phar.i@hospital.vn',
        phone: '0901234009',
        department_code: 'DEP-DUOC',
        role: 'STAFF',
        specialty: 'Dược sĩ Đại học - Quản lý Kho Dược & Cấp phát Thuốc BHYT',
        hire_date: '2021-09-10',
        username: 'phar.i',
        gender: 'FEMALE',
        dob: '1991-01-22',
        cccd: '001091009012',
        hourly_rate: 75000, // ~13.200.000 đ/tháng
        base_pay: 12500000,
        night_diff: 500000,
        ot_pay: 800000,
        net_pay: 12800000,
        bank_name: 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)',
        bank_account: '108000998877',
        routing: 'CTG-VN-012'
      },
      {
        employee_code: 'EMP-HR-001',
        first_name: 'Văn K',
        last_name: 'Nguyễn',
        email: 'hr.k@hospital.vn',
        phone: '0901234010',
        department_code: 'DEP-KHTH',
        role: 'HR_MANAGER',
        specialty: 'Cử nhân Quản trị Nhân lực Y tế & Pháp chế Bệnh viện',
        hire_date: '2020-03-01',
        username: 'hr.k',
        gender: 'MALE',
        dob: '1989-10-10',
        cccd: '001089010123',
        hourly_rate: 70000, // ~12.300.000 đ/tháng
        base_pay: 12000000,
        night_diff: 0,
        ot_pay: 1000000,
        net_pay: 12100000,
        bank_name: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
        bank_account: '0011005544332',
        routing: 'VCB-VN-001'
      }
    ];

    const adminPwHash = await bcrypt.hash('admin123', 10);
    const userPwHash = await bcrypt.hash('password123', 10);

    const insertedEmployees = [];

    for (const s of staffList) {
      const [empRes] = await conn.execute(
        `INSERT INTO Employees (
          employee_code, first_name, last_name, email, phone,
          dob, gender, marital_status, national_id, nationality,
          personal_email, personal_phone, home_phone, home_address, district, city_province, postal_code,
          work_location, office_location, department_code, role, specialty, hire_date, status
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, 'MARRIED', ?, 'Việt Nam',
          ?, ?, ?, 'Số 18 Phố Y Dược, Phường Bách Khoa', 'Quận Hai Bà Trưng', 'Hà Nội', '100000',
          'Bệnh viện Đa khoa Cơ sở 1', (SELECT name FROM Departments WHERE department_code = ? LIMIT 1), ?, ?, ?, ?, 'ACTIVE'
        )`,
        [
          s.employee_code, s.first_name, s.last_name, s.email, s.phone,
          s.dob, s.gender, s.cccd,
          `${s.username}@gmail.com`, s.phone, s.phone,
          s.department_code, s.department_code, s.role, s.specialty, s.hire_date
        ]
      );

      const empId = empRes.insertId;
      insertedEmployees.push({ ...s, id: empId });

      // Tạo Account đăng nhập
      const pwHash = s.username === 'admin' ? adminPwHash : userPwHash;
      await conn.execute(
        `INSERT INTO Accounts (id, employee_id, username, password_hash, is_locked)
         VALUES (?, ?, ?, ?, FALSE)`,
        [randomUUID(), empId, s.username, pwHash]
      );

      // Thêm Pay_Rates (Định mức lương VND)
      await conn.execute(
        `INSERT INTO Pay_Rates (staff_id, base_hourly_rate, tax_tier)
         VALUES (?, ?, ?)`,
        [s.employee_code, s.hourly_rate, `Bậc ${s.role === 'SUPER_ADMIN' ? '1 - Giám đốc' : s.role === 'DEPARTMENT_HEAD' ? '2 - Trưởng khoa' : s.role === 'DOCTOR' ? '3 - Bác sĩ' : '4 - Điều dưỡng/KTV'}`]
      );

      // Thêm Payment_Elections (Tài khoản ngân hàng chi trả VND)
      await conn.execute(
        `INSERT INTO Payment_Elections (id, staff_id, bank_name, account_number, routing_number, is_primary)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [randomUUID(), s.employee_code, s.bank_name, s.bank_account, s.routing]
      );

      // Thêm Người liên hệ khẩn cấp (Emergency Contacts)
      await conn.execute(
        `INSERT INTO Emergency_Contacts (id, staff_id, contact_name, relationship, phone_number)
         VALUES (?, ?, ?, 'Gia đình', '0988776655')`,
        [randomUUID(), s.employee_code, `Người thân của ${s.last_name} ${s.first_name}`]
      );

      // Thêm Tài liệu nhân sự (Documents)
      await conn.execute(
        `INSERT INTO Documents (id, staff_id, document_name, document_type, file_url)
         VALUES (?, ?, ?, 'CONTRACT', ?)`,
        [randomUUID(), s.employee_code, `Hop_Dong_Lao_Dong_${s.employee_code}.pdf`, `https://storage.hospital.vn/docs/${s.employee_code}_HDLD.pdf`]
      );

      // Thêm Quỹ phép năm (Leave Balances) theo Luật Lao Động VN (12 ngày phép năm + 30 ngày ốm)
      await conn.execute(
        `INSERT INTO Leave_Balances (id, staff_id, accrual_year, leave_type, total_days, used_days)
         VALUES 
          (?, ?, 2026, 'ANNUAL', 12.0, 2.5),
          (?, ?, 2026, 'SICK', 30.0, 1.0),
          (?, ?, 2026, 'UNPAID', 10.0, 0.0),
          (?, ?, 2026, 'MATERNITY', 180.0, 0.0)`,
        [randomUUID(), s.employee_code, randomUUID(), s.employee_code, randomUUID(), s.employee_code, randomUUID(), s.employee_code]
      );
    }
    console.log(`   ✔ Đã nạp 10 nhân sự y tế (EMP-ADM-001 đến EMP-HR-001) với tài khoản và định mức lương VND.`);

    // 4. Thêm Chứng chỉ hành nghề y tế Việt Nam (Medical Licenses) do Sở Y Tế cấp
    console.log('\n📜 Bước 4: Thêm Chứng chỉ hành nghề y tế (Sở Y Tế cấp)...');
    const licenses = [
      {
        emp_code: 'EMP-ADM-001',
        type: 'Chứng chỉ hành nghề Khám bệnh, Chữa bệnh',
        num: '001289/HN-CCHN',
        issuer: 'Sở Y Tế TP. Hà Nội',
        issue: '2016-04-10',
        exp: '2030-04-10',
        notes: 'Phạm vi chuyên môn: Khám bệnh, chữa bệnh Nội khoa - Hồi sức cấp cứu'
      },
      {
        emp_code: 'EMP-DOC-001',
        type: 'Chứng chỉ hành nghề Hồi sức Cấp cứu & Chống độc',
        num: '002456/HN-CCHN',
        issuer: 'Sở Y Tế TP. Hà Nội',
        issue: '2018-08-20',
        exp: '2032-08-20',
        notes: 'Phạm vi chuyên môn: Chuyên khoa Hồi sức cấp cứu'
      },
      {
        emp_code: 'EMP-DOC-002',
        type: 'Chứng chỉ hành nghề Nội Tổng Hợp & Tim Mạch',
        num: '003789/HN-CCHN',
        issuer: 'Sở Y Tế TP. Hà Nội',
        issue: '2020-01-15',
        exp: '2034-01-15',
        notes: 'Đã hoàn thành đào tạo Điện tâm đồ nâng cao tại Viện Tim Mạch'
      },
      {
        emp_code: 'EMP-DOC-003',
        type: 'Chứng chỉ hành nghề Ngoại Khoa & Phẫu Thuật Nội Soi',
        num: '004123/HN-CCHN',
        issuer: 'Bộ Y Tế / Bệnh viện Hữu nghị Việt Đức',
        issue: '2019-11-05',
        exp: '2033-11-05',
        notes: 'Phẫu thuật viên chính ngoại tiêu hóa và chấn thương'
      },
      {
        emp_code: 'EMP-DOC-004',
        type: 'Chứng chỉ hành nghề Sản Phụ Khoa & Nhi Khoa',
        num: '005678/HN-CCHN',
        issuer: 'Sở Y Tế TP. Hà Nội',
        issue: '2021-07-12',
        exp: '2035-07-12',
        notes: 'Chứng nhận siêu âm sản phụ khoa thực hành Đại học Y Hà Nội'
      },
      {
        emp_code: 'EMP-NUR-001',
        type: 'Chứng chỉ hành nghề Điều dưỡng Hồi sức Cấp cứu',
        num: 'DD-00981/HN',
        issuer: 'Sở Y Tế TP. Hà Nội',
        issue: '2019-09-01',
        exp: '2033-09-01',
        notes: 'Chứng nhận hồi sinh tim phổi nâng cao (ACLS)'
      }
    ];

    for (const lic of licenses) {
      const emp = insertedEmployees.find(e => e.employee_code === lic.emp_code);
      if (emp) {
        await conn.execute(
          `INSERT INTO Medical_Licenses (employee_id, license_type, license_number, issuing_authority, issue_date, expiration_date, verification_status, notes)
           VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED', ?)`,
          [emp.id, lic.type, lic.num, lic.issuer, lic.issue, lic.exp, lic.notes]
        );
      }
    }
    console.log(`   ✔ Đã thêm chứng chỉ hành nghề Sở Y Tế cho đội ngũ bác sĩ & điều dưỡng.`);

    // 5. Thêm 2 Kỳ quyết toán lương (Tháng 8/2026 và Tháng 9/2026) với số tiền VND
    console.log('\n💰 Bước 5: Thêm 2 Đợt quyết toán lương và Phiếu lương tiền đồng (VND)...');
    const runAugId = 'run-2026-08';
    const runSepId = 'run-2026-09';

    await conn.execute(
      `INSERT INTO Payroll_Runs (id, start_date, end_date, status, created_at)
       VALUES 
        (?, '2026-08-01', '2026-08-31', 'COMPLETED', '2026-09-02 08:00:00'),
        (?, '2026-09-01', '2026-09-30', 'COMPLETED', '2026-09-20 08:00:00')`,
      [runAugId, runSepId]
    );

    for (const emp of insertedEmployees) {
      // Phiếu lương Tháng 8
      await conn.execute(
        `INSERT INTO Pay_Slips (id, run_id, staff_id, base_pay, night_differential, overtime_pay, net_pay, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', '2026-09-02 10:00:00')`,
        [
          randomUUID(),
          runAugId,
          emp.employee_code,
          emp.base_pay,
          emp.night_diff,
          emp.ot_pay,
          emp.net_pay
        ]
      );

      // Phiếu lương Tháng 9
      await conn.execute(
        `INSERT INTO Pay_Slips (id, run_id, staff_id, base_pay, night_differential, overtime_pay, net_pay, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', '2026-09-20 10:00:00')`,
        [
          randomUUID(),
          runSepId,
          emp.employee_code,
          emp.base_pay,
          emp.night_diff,
          emp.ot_pay,
          emp.net_pay
        ]
      );
    }
    console.log(`   ✔ Đã tạo bảng kê thu nhập điện tử chuẩn VND cho toàn bộ nhân sự.`);

    // 6. Thêm Lịch trực ca (Shifts) bệnh viện
    console.log('\n⏰ Bước 6: Thêm Lịch trực ca bệnh viện (Sáng, Chiều, Đêm)...');
    const shifts = [
      {
        id: 'shift-001',
        staff_id: 'EMP-ADM-001',
        dept_code: 'DEP-KHTH',
        start_time: '2026-09-20 07:00:00',
        end_time: '2026-09-20 15:30:00',
        shift_type: 'MORNING',
        status: 'IN_PROGRESS',
        requires_handover: true
      },
      {
        id: 'shift-002',
        staff_id: 'EMP-DOC-001',
        dept_code: 'DEP-HSTC',
        start_time: '2026-09-19 19:00:00',
        end_time: '2026-09-20 07:30:00',
        shift_type: 'NIGHT',
        status: 'COMPLETED',
        requires_handover: true
      },
      {
        id: 'shift-003',
        staff_id: 'EMP-DOC-002',
        dept_code: 'DEP-NOI',
        start_time: '2026-09-20 07:00:00',
        end_time: '2026-09-20 15:30:00',
        shift_type: 'MORNING',
        status: 'IN_PROGRESS',
        requires_handover: true
      },
      {
        id: 'shift-004',
        staff_id: 'EMP-DOC-003',
        dept_code: 'DEP-NGOAI',
        start_time: '2026-09-20 13:30:00',
        end_time: '2026-09-20 21:00:00',
        shift_type: 'AFTERNOON',
        status: 'SCHEDULED',
        requires_handover: true
      },
      {
        id: 'shift-005',
        staff_id: 'EMP-NUR-001',
        dept_code: 'DEP-HSTC',
        start_time: '2026-09-19 19:00:00',
        end_time: '2026-09-20 07:30:00',
        shift_type: 'NIGHT',
        status: 'COMPLETED',
        requires_handover: true
      },
      {
        id: 'shift-006',
        staff_id: 'EMP-NUR-002',
        dept_code: 'DEP-NOI',
        start_time: '2026-09-20 07:00:00',
        end_time: '2026-09-20 15:30:00',
        shift_type: 'MORNING',
        status: 'IN_PROGRESS',
        requires_handover: false
      }
    ];

    for (const sh of shifts) {
      await conn.execute(
        `INSERT INTO Shifts (id, staff_id, department_code, start_time, end_time, shift_type, status, requires_handover)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sh.id, sh.staff_id, sh.dept_code, sh.start_time, sh.end_time, sh.shift_type, sh.status, sh.requires_handover]
      );
    }
    console.log(`   ✔ Đã thiết lập các ca trực lâm sàng.`);

    // 7. Thêm Bàn giao ca trực (Shift Handovers) với note là 1 chữ 'a', 'b', 'c'... theo đúng yêu cầu user!
    console.log("\n📋 Bước 7: Thêm Bàn giao ca trực với note là 1 chữ 'a', 'b', 'c' theo yêu cầu...");
    const handovers = [
      {
        id: 'handover-001',
        out_shift: 'shift-002',
        in_shift: 'shift-001',
        note: 'a', // Note 1 chữ theo yêu cầu user
        logged_by: 'EMP-DOC-001',
        ack_by: 'EMP-ADM-001'
      },
      {
        id: 'handover-002',
        out_shift: 'shift-005',
        in_shift: 'shift-003',
        note: 'b', // Note 1 chữ theo yêu cầu user
        logged_by: 'EMP-NUR-001',
        ack_by: 'EMP-DOC-002'
      },
      {
        id: 'handover-003',
        out_shift: 'shift-001',
        in_shift: 'shift-004',
        note: 'c', // Note 1 chữ theo yêu cầu user
        logged_by: 'EMP-ADM-001',
        ack_by: 'EMP-DOC-003'
      }
    ];

    for (const h of handovers) {
      await conn.execute(
        `INSERT INTO Shift_Handovers (id, outgoing_shift_id, incoming_shift_id, critical_notes, status, logged_by, acknowledged_by)
         VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?)`,
        [h.id, h.out_shift, h.in_shift, h.note, h.logged_by, h.ack_by]
      );

      // Thêm checklist cho từng biên bản giao ca
      await conn.execute(
        `INSERT INTO Handover_Checklists (id, handover_id, item_description, is_verified)
         VALUES 
          (?, ?, 'Kiểm kê số lượng bệnh nhân nặng đang thở máy', TRUE),
          (?, ?, 'Bàn giao cơ số thuốc cấp cứu & hộp chống sốc phản vệ', TRUE),
          (?, ?, 'Kiểm tra hoạt động máy hút đờm & máy sốc tim ngoài lồng ngực', TRUE)`,
        [randomUUID(), h.id, randomUUID(), h.id, randomUUID(), h.id]
      );
    }
    console.log("   ✔ Đã thêm biên bản bàn giao ca trực với critical_notes là 'a', 'b', 'c'.");

    // 8. Thêm Điểm danh chấm công (Attendances)
    console.log('\n⏱ Bước 8: Thêm dữ liệu Chấm công / Điểm danh...');
    await conn.execute(
      `INSERT INTO Attendances (id, staff_id, shift_id, clock_in_time, clock_out_time, clock_in_method, attendance_status, overtime_minutes, handover_notes)
       VALUES 
        (?, 'EMP-ADM-001', 'shift-001', '2026-09-20 06:55:00', NULL, 'BIOMETRIC', 'PRESENT', 0, 'Đúng giờ'),
        (?, 'EMP-DOC-001', 'shift-002', '2026-09-19 18:50:00', '2026-09-20 07:35:00', 'RFID_CARD', 'OVERTIME', 5, 'Trực đêm ICU'),
        (?, 'EMP-DOC-002', 'shift-003', '2026-09-20 06:58:00', NULL, 'KIOSK_TERMINAL', 'PRESENT', 0, 'Đúng giờ')`,
      [randomUUID(), randomUUID(), randomUUID()]
    );
    console.log('   ✔ Đã thêm dữ liệu chấm công vân tay & thẻ từ bệnh viện.');

    // 9. Thêm Nhiệm vụ lâm sàng trong ngày (Daily Tasks)
    console.log('\n📝 Bước 9: Thêm Nhiệm vụ lâm sàng trong ngày...');
    const tasks = [
      {
        title: 'Giao ban chuyên môn sáng toàn viện',
        desc: 'Họp giao ban trực viện tại Hội trường tầng 4, báo cáo tình hình cấp cứu trong đêm.',
        assigned_to: 'EMP-ADM-001',
        assigned_by: 'EMP-ADM-001',
        shift_id: 'shift-001',
        status: 'COMPLETED'
      },
      {
        title: 'Đi buồng thăm khám bệnh nhân nặng khoa Hồi sức cấp cứu',
        desc: 'Đánh giá chỉ số SpO2, huyết áp động mạch xâm lấn và thông số máy thở 8 giường bệnh.',
        assigned_to: 'EMP-DOC-001',
        assigned_by: 'EMP-ADM-001',
        shift_id: 'shift-002',
        status: 'COMPLETED'
      },
      {
        title: 'Hội chẩn ca phẫu thuật cấp cứu viêm ruột thừa vỡ mủ',
        desc: 'Phối hợp với Khoa Ngoại & Gây mê hồi sức tiến hành nội soi cắt ruột thừa.',
        assigned_to: 'EMP-DOC-003',
        assigned_by: 'EMP-ADM-001',
        shift_id: 'shift-004',
        status: 'IN_PROGRESS'
      },
      {
        title: 'Kiểm kê và hoàn tất dự trù thuốc BHYT tuần tới',
        desc: 'Tổng hợp danh mục thuốc thiết yếu gửi Phòng Kế hoạch Nghiệp vụ Dược.',
        assigned_to: 'EMP-PHAR-001',
        assigned_by: 'EMP-ADM-001',
        shift_id: null,
        status: 'PENDING'
      }
    ];

    for (const t of tasks) {
      await conn.execute(
        `INSERT INTO Daily_Tasks (id, title, description, assigned_to, assigned_by, shift_id, status, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, '2026-09-20 17:00:00')`,
        [randomUUID(), t.title, t.desc, t.assigned_to, t.assigned_by, t.shift_id, t.status]
      );
    }
    console.log('   ✔ Đã thêm danh mục nhiệm vụ chuyên môn y tế.');

    // 10. Thêm Đơn xin nghỉ phép (Leave Requests) có nghỉ nửa ngày
    console.log('\n🏖 Bước 10: Thêm Đơn xin nghỉ phép (bao gồm phép nửa ngày)...');
    await conn.execute(
      `INSERT INTO Leave_Requests (id, staff_id, start_date, end_date, leave_type, day_part, days_requested, reason, status)
       VALUES 
        (?, 'EMP-ADM-001', '2026-09-25', '2026-09-25', 'ANNUAL', 'FIRST_HALF', 0.5, 'Nghỉ nửa ngày buổi sáng giải quyết việc gia đình', 'APPROVED'),
        (?, 'EMP-DOC-002', '2026-09-28', '2026-09-30', 'ANNUAL', 'FULL', 3.0, 'Nghỉ phép năm kết hợp về thăm quê', 'PENDING')`,
      [randomUUID(), randomUUID()]
    );
    console.log('   ✔ Đã thêm đơn nghỉ phép (hỗ trợ phép nửa ngày FIRST_HALF).');

    // 11. Thêm Thông báo hệ thống bệnh viện (Notifications)
    console.log('\n🔔 Bước 11: Thêm Thông báo nội bộ bệnh viện...');
    const notifs = [
      {
        target: 'EMP-ADM-001',
        title: 'Quyết toán lương Tháng 09/2026 đã hoàn tất',
        msg: 'Phiếu lương điện tử kỳ 01/09 - 30/09/2026 đã được chuyển vào tài khoản Vietcombank của bạn.',
        type: 'ALERT'
      },
      {
        target: 'EMP-ADM-001',
        title: 'Lịch kiểm tra an toàn người bệnh Sở Y Tế',
        msg: 'Đoàn kiểm tra chất lượng bệnh viện của Sở Y Tế sẽ làm việc vào thứ Năm tuần tới.',
        type: 'ANNOUNCEMENT'
      },
      {
        target: 'EMP-DOC-001',
        title: 'Nhiệm vụ kiểm tra máy thở và bình oxy phòng cấp cứu',
        msg: 'Bác sĩ Nguyễn Văn A đã giao nhiệm vụ kiểm tra thiết bị y tế cấp cứu.',
        type: 'TASK'
      }
    ];

    for (const n of notifs) {
      await conn.execute(
        `INSERT INTO Notifications (id, target_staff_id, title, message, type, is_read)
         VALUES (?, ?, ?, ?, ?, FALSE)`,
        [randomUUID(), n.target, n.title, n.msg, n.type]
      );
    }
    console.log('   ✔ Đã thêm thông báo bệnh viện.');

    // 12. Báo cáo tổng kết số lượng bản ghi
    console.log('\n================ TỔNG KẾT DỮ LIỆU ĐÃ NẠP THÀNH CÔNG ================');
    const [allTables] = await conn.query('SHOW TABLES');
    const tableNames = allTables.map(t => Object.values(t)[0]);
    for (const t of tableNames) {
      const [[{ count }]] = await conn.query(`SELECT COUNT(*) as count FROM \`${t}\``);
      console.log(`  ${t.padEnd(24)}: ${count} dòng`);
    }
    console.log('====================================================================');
    console.log('🔑 Tài khoản đăng nhập quản trị: admin / admin123');
    console.log('🔑 Tài khoản nhân viên (Bác sĩ B): dr.b / password123');
    console.log('🔑 Tài khoản nhân viên (Bác sĩ C): dr.c / password123');
    console.log('✨ Hoàn tất thiết lập cơ sở dữ liệu Bệnh viện Việt Nam!');
  } catch (err) {
    console.error('❌ Lỗi khi nạp dữ liệu bệnh viện:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seedVietnamHospital();
