import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'admin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
const DB_NAME = process.env.DB_NAME || 'hrm_db';

async function createConnection() {
  return await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
    dateStrings: true
  });
}

/**
 * Unified Hospital HRMS Database Seeder for hrm_db
 */
async function seedDatabase() {
  console.log('====================================================================');
  console.log('🌱 Starting Hospital HRMS Unified Database Seeding (hrm_db)');
  console.log(`📡 Connecting to MySQL Server at ${DB_HOST}:${DB_PORT} as '${DB_USER}'...`);
  console.log('====================================================================');

  const conn = await createConnection();

  try {
    // --------------------------------------------------------------------------
    // 1. Truncate all 18 tables in hrm_db
    // --------------------------------------------------------------------------
    console.log('\n🧹 Step 1: Cleaning existing data from hrm_db...');
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
    console.log('   ✔ Successfully cleared all 18 tables.');

    // --------------------------------------------------------------------------
    // 2. Seed 5 Clinical Departments
    // --------------------------------------------------------------------------
    console.log('\n🏥 Step 2: Seeding 5 Hospital Departments...');
    const departments = [
      {
        department_code: 'DEP-CAPCUU',
        name: 'Khoa Cấp Cứu & Hồi Sức Tim Mạch (Emergency ER)',
        description: 'Đơn vị cấp cứu 24/7, xử trí ca bệnh nguy kịch và chấn thương cấp tính.',
        location: 'Tòa nhà A - Tầng 1 (Khu Cấp Cứu)'
      },
      {
        department_code: 'DEP-HOISUC',
        name: 'Khoa Hồi Sức Tích Cực & Chống Độc (ICU)',
        description: 'Đơn vị chăm sóc đặc biệt cho bệnh nhân suy đa tạng, thở máy và lọc máu liên tục.',
        location: 'Tòa nhà A - Tầng 2 (Khu Hồi Sức)'
      },
      {
        department_code: 'DEP-NGOAIKHOA',
        name: 'Khoa Ngoại Tổng Hợp & Phẫu Thuật (General Surgery)',
        description: 'Phòng mổ vô khuẩn và điều trị hậu phẫu các ca phẫu thuật ổ bụng, lồng ngực.',
        location: 'Tòa nhà B - Tầng 3 (Khu Phẫu Thuật)'
      },
      {
        department_code: 'DEP-NOIKHOA',
        name: 'Khoa Nội Tổng Hợp & Tim Mạch (Internal Medicine)',
        description: 'Chẩn đoán và điều trị bệnh lý tim mạch, nội tiết, đái tháo đường và hô hấp.',
        location: 'Tòa nhà B - Tầng 4 (Khu Nội Trú)'
      },
      {
        department_code: 'DEP-NHIKHOA',
        name: 'Khoa Nhi & Sơ Sinh Chuyên Sâu (Pediatrics & Neonatal)',
        description: 'Chăm sóc và điều trị chuyên sâu cho bệnh nhi và trẻ sơ sinh non tháng.',
        location: 'Tòa nhà C - Tầng 2 (Khu Nhi Khoa)'
      }
    ];

    const departmentMap = {};
    for (const d of departments) {
      const [res] = await conn.execute(
        `INSERT INTO Departments (department_code, name, description, location, status) VALUES (?, ?, ?, ?, 'ACTIVE')`,
        [d.department_code, d.name, d.description, d.location]
      );
      departmentMap[d.department_code] = res.insertId;
    }
    console.log(`   ✔ Created 5 hospital departments.`);

    // --------------------------------------------------------------------------
    // 3. Seed Clinicians & Employees
    // --------------------------------------------------------------------------
    console.log('\n👨‍⚕️ Step 3: Seeding Hospital Clinicians and Staff...');
    const employeesData = [
      {
        employee_code: 'EMP-DOC-001',
        first_name: 'Văn An',
        last_name: 'Nguyễn',
        email: 'dr.an@hospital.org',
        phone: '+84-90-123-4567',
        department_code: 'DEP-CAPCUU',
        role: 'DEPARTMENT_HEAD',
        specialty: 'Cấp cứu & Hồi sức Tim mạch Cấp tính',
        hire_date: '2021-03-15',
        username: 'dr.an'
      },
      {
        employee_code: 'EMP-DOC-002',
        first_name: 'Văn Bình',
        last_name: 'Trần',
        email: 'dr.binh@hospital.org',
        phone: '+84-90-234-5678',
        department_code: 'DEP-HOISUC',
        role: 'DOCTOR',
        specialty: 'Hồi sức Tích cực & Chống độc (CCM)',
        hire_date: '2022-08-01',
        username: 'dr.binh'
      },
      {
        employee_code: 'EMP-NUR-001',
        first_name: 'Thị Mai',
        last_name: 'Lê',
        email: 'rn.mai@hospital.org',
        phone: '+84-90-345-6789',
        department_code: 'DEP-HOISUC',
        role: 'NURSE',
        specialty: 'Điều dưỡng Hồi sức Cấp cứu (CCRN)',
        hire_date: '2023-01-10',
        username: 'rn.mai'
      },
      {
        employee_code: 'EMP-DOC-003',
        first_name: 'Quốc Cường',
        last_name: 'Phạm',
        email: 'dr.cuong@hospital.org',
        phone: '+84-90-456-7890',
        department_code: 'DEP-NGOAIKHOA',
        role: 'DOCTOR',
        specialty: 'Phẫu thuật Nội soi & Ngoại Tiêu hóa',
        hire_date: '2020-11-20',
        username: 'dr.cuong'
      },
      {
        employee_code: 'EMP-NUR-002',
        first_name: 'Minh Tuấn',
        last_name: 'Hoàng',
        email: 'rn.tuan@hospital.org',
        phone: '+84-90-567-8901',
        department_code: 'DEP-CAPCUU',
        role: 'NURSE',
        specialty: 'Điều dưỡng Cấp cứu & Phân luồng',
        hire_date: '2024-02-15',
        username: 'rn.tuan'
      },
      {
        employee_code: 'EMP-NUR-003',
        first_name: 'Ngọc Ánh',
        last_name: 'Vũ',
        email: 'rn.anh@hospital.org',
        phone: '+84-90-678-9012',
        department_code: 'DEP-NHIKHOA',
        role: 'NURSE',
        specialty: 'Chăm sóc Sơ sinh & Hồi sức Nhi',
        hire_date: '2023-06-01',
        username: 'rn.anh'
      },
      {
        employee_code: 'EMP-HR-001',
        first_name: 'Thu Trang',
        last_name: 'Đỗ',
        email: 'hr.trang@hospital.org',
        phone: '+84-90-789-0123',
        department_code: 'DEP-NOIKHOA',
        role: 'HR_MANAGER',
        specialty: 'Quản trị Nguồn nhân lực Y tế',
        hire_date: '2021-01-05',
        username: 'hr.trang'
      },
      {
        employee_code: 'EMP-ADM-001',
        first_name: 'Hoàng Nam',
        last_name: 'Nguyễn',
        email: 'admin@hospital.org',
        phone: '+84-90-890-1234',
        department_code: 'DEP-CAPCUU',
        role: 'SUPER_ADMIN',
        specialty: 'Quản trị Bệnh viện & Hệ thống Thông tin',
        hire_date: '2020-01-01',
        username: 'admin'
      }
    ];

    const employees = [];
    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    const adminPasswordHash = await bcrypt.hash('admin123', 10);

    for (const emp of employeesData) {
      const [res] = await conn.execute(
        `INSERT INTO Employees (
          employee_code, first_name, last_name, email, phone, department_code, role, specialty, hire_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [emp.employee_code, emp.first_name, emp.last_name, emp.email, emp.phone, emp.department_code, emp.role, emp.specialty, emp.hire_date]
      );

      const empId = res.insertId;
      employees.push({ ...emp, id: empId });

      // Create Account for login
      const accountId = randomUUID();
      const pwHash = emp.username === 'admin' ? adminPasswordHash : defaultPasswordHash;
      await conn.execute(
        `INSERT INTO Accounts (id, employee_id, username, password_hash, is_locked)
         VALUES (?, ?, ?, ?, FALSE)`,
        [accountId, empId, emp.username, pwHash]
      );

      // Add alias credentials for test suite compatibility
      if (emp.employee_code === 'EMP-DOC-001') {
        await conn.execute(
          `INSERT INTO Accounts (id, employee_id, username, password_hash, is_locked) VALUES (?, ?, 'dr.wright', ?, FALSE)`,
          [randomUUID(), empId, pwHash]
        );
      } else if (emp.employee_code === 'EMP-DOC-002') {
        await conn.execute(
          `INSERT INTO Accounts (id, employee_id, username, password_hash, is_locked) VALUES (?, ?, 'dr.vance', ?, FALSE)`,
          [randomUUID(), empId, pwHash]
        );
      } else if (emp.employee_code === 'EMP-NUR-001') {
        await conn.execute(
          `INSERT INTO Accounts (id, employee_id, username, password_hash, is_locked) VALUES (?, ?, 'rn.elena', ?, FALSE)`,
          [randomUUID(), empId, pwHash]
        );
      }
    }
    console.log(`   ✔ Inserted ${employees.length} core hospital personnel with Vietnamese login accounts.`);
    console.log('     🔑 Default logins: admin / admin123 | dr.an / password123 | dr.binh / password123 | rn.mai / password123');

    // --------------------------------------------------------------------------
    // 4. Seed Medical Licenses
    // --------------------------------------------------------------------------
    console.log('\n📜 Step 4: Seeding Medical Licenses & Credentials...');
    const licensesData = [
      {
        employee_code: 'EMP-DOC-001',
        license_type: 'State Medical Board License (MD)',
        license_number: 'MD-99281-ER',
        issuing_authority: 'National Medical Licensure Board',
        issue_date: '2021-01-01',
        expiration_date: '2026-12-31',
        verification_status: 'VERIFIED',
        notes: 'Verified by Medical Board Review.'
      },
      {
        employee_code: 'EMP-DOC-001',
        license_type: 'Advanced Trauma Life Support (ATLS)',
        license_number: 'ATLS-2024-881',
        issuing_authority: 'American College of Surgeons',
        issue_date: '2024-02-10',
        expiration_date: '2026-10-15',
        verification_status: 'VERIFIED',
        notes: 'Recertification due in 30 days.'
      },
      {
        employee_code: 'EMP-DOC-002',
        license_type: 'Board Certification in Critical Care (CCM)',
        license_number: 'CCM-84920-VN',
        issuing_authority: 'Critical Care Board of Examiners',
        issue_date: '2022-05-15',
        expiration_date: '2027-05-15',
        verification_status: 'VERIFIED',
        notes: 'Active and verified.'
      },
      {
        employee_code: 'EMP-NUR-001',
        license_type: 'Critical Care Registered Nurse (CCRN)',
        license_number: 'CCRN-91822',
        issuing_authority: 'Association of Critical-Care Nurses',
        issue_date: '2023-01-01',
        expiration_date: '2026-09-01',
        verification_status: 'EXPIRED',
        notes: 'Renewal application under review.'
      },
      {
        employee_code: 'EMP-NUR-002',
        license_type: 'Pediatric Advanced Life Support (PALS)',
        license_number: 'PALS-2025-412',
        issuing_authority: 'American Heart Association',
        issue_date: '2025-03-01',
        expiration_date: '2027-03-01',
        verification_status: 'PENDING',
        notes: 'Awaiting primary source document.'
      }
    ];

    for (const lic of licensesData) {
      const emp = employees.find((e) => e.employee_code === lic.employee_code);
      if (emp) {
        await conn.execute(
          `INSERT INTO Medical_Licenses (
            employee_id, license_type, license_number, issuing_authority, issue_date, expiration_date, verification_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [emp.id, lic.license_type, lic.license_number, lic.issuing_authority, lic.issue_date, lic.expiration_date, lic.verification_status, lic.notes]
        );
      }
    }
    console.log('   ✔ Seeded clinical board licenses and certifications.');

    // --------------------------------------------------------------------------
    // 5. Seed Emergency Contacts & Documents
    // --------------------------------------------------------------------------
    console.log('\n📞 Step 5: Seeding Emergency Contacts & Documents...');
    for (const emp of employees) {
      await conn.execute(
        `INSERT INTO Emergency_Contacts (id, staff_id, contact_name, relationship, phone_number)
         VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), emp.employee_code, `Người thân của ${emp.last_name}`, 'Gia đình', '+84-98-999-8888']
      );

      await conn.execute(
        `INSERT INTO Documents (id, staff_id, document_name, document_type, file_url)
         VALUES (?, ?, ?, 'CERTIFICATE', ?)`,
        [randomUUID(), emp.employee_code, `${emp.employee_code}_Medical_Board_Certificate.pdf`, `https://storage.hospital.org/docs/${emp.employee_code}.pdf`]
      );
    }
    console.log('   ✔ Seeded emergency contacts and personnel documents.');

    // --------------------------------------------------------------------------
    // 6. Seed 24/7 Clinical Shifts
    // --------------------------------------------------------------------------
    console.log('\n⏰ Step 6: Seeding 24/7 Clinical Shifts...');
    const shiftsData = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        staff_id: 'EMP-DOC-001',
        dept_code: 'DEP-CAPCUU',
        start_time: '2026-09-19 07:00:00',
        end_time: '2026-09-19 15:30:00',
        shift_type: 'MORNING',
        status: 'IN_PROGRESS',
        requires_handover: true
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        staff_id: 'EMP-DOC-002',
        dept_code: 'DEP-HOISUC',
        start_time: '2026-09-19 23:00:00',
        end_time: '2026-09-20 07:30:00',
        shift_type: 'NIGHT',
        status: 'SCHEDULED',
        requires_handover: true
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        staff_id: 'EMP-NUR-001',
        dept_code: 'DEP-HOISUC',
        start_time: '2026-09-19 15:00:00',
        end_time: '2026-09-19 23:30:00',
        shift_type: 'AFTERNOON',
        status: 'SCHEDULED',
        requires_handover: true
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        staff_id: 'EMP-DOC-003',
        dept_code: 'DEP-NGOAIKHOA',
        start_time: '2026-09-19 08:00:00',
        end_time: '2026-09-19 20:00:00',
        shift_type: 'ON_CALL',
        status: 'SCHEDULED',
        requires_handover: false
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        staff_id: 'EMP-NUR-002',
        dept_code: 'DEP-CAPCUU',
        start_time: '2026-09-19 12:00:00',
        end_time: '2026-09-19 20:00:00',
        shift_type: 'EMERGENCY_COVER',
        status: 'IN_PROGRESS',
        requires_handover: true
      },
      {
        id: '66666666-6666-4666-8666-666666666666',
        staff_id: 'EMP-NUR-003',
        dept_code: 'DEP-NHIKHOA',
        start_time: '2026-09-19 07:00:00',
        end_time: '2026-09-19 15:30:00',
        shift_type: 'MORNING',
        status: 'COMPLETED',
        requires_handover: true
      }
    ];

    for (const s of shiftsData) {
      await conn.execute(
        `INSERT INTO Shifts (id, staff_id, department_code, start_time, end_time, shift_type, status, requires_handover)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.staff_id, s.dept_code, s.start_time, s.end_time, s.shift_type, s.status, s.requires_handover]
      );
    }
    console.log(`   ✔ Seeded ${shiftsData.length} hospital shifts for 24/7 coverage.`);

    // --------------------------------------------------------------------------
    // 7. Seed Biometric & Kiosk Attendance Records
    // --------------------------------------------------------------------------
    console.log('\n⏱️ Step 7: Seeding Attendance & Overtime Records...');
    const attendancesData = [
      {
        id: randomUUID(),
        shift_id: '11111111-1111-4111-8111-111111111111',
        staff_id: 'EMP-DOC-001',
        clock_in_time: '2026-09-19 06:55:12',
        clock_out_time: null,
        clock_in_method: 'BIOMETRIC',
        attendance_status: 'PRESENT',
        overtime_minutes: 0,
        handover_notes: null
      },
      {
        id: randomUUID(),
        shift_id: '55555555-5555-4555-8555-555555555555',
        staff_id: 'EMP-NUR-002',
        clock_in_time: '2026-09-19 12:02:40',
        clock_out_time: null,
        clock_in_method: 'RFID_CARD',
        attendance_status: 'PRESENT',
        overtime_minutes: 0,
        handover_notes: null
      },
      {
        id: randomUUID(),
        shift_id: '66666666-6666-4666-8666-666666666666',
        staff_id: 'EMP-NUR-003',
        clock_in_time: '2026-09-19 07:18:05',
        clock_out_time: '2026-09-19 15:45:20',
        clock_in_method: 'KIOSK_TERMINAL',
        attendance_status: 'LATE',
        overtime_minutes: 15,
        handover_notes: 'Bàn giao theo dõi bệnh nhi hen phế quản phòng 10.'
      }
    ];

    for (const att of attendancesData) {
      await conn.execute(
        `INSERT INTO Attendances (
          id, shift_id, staff_id, clock_in_time, clock_out_time, clock_in_method, attendance_status, overtime_minutes, handover_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [att.id, att.shift_id, att.staff_id, att.clock_in_time, att.clock_out_time, att.clock_in_method, att.attendance_status, att.overtime_minutes, att.handover_notes]
      );
    }
    console.log('   ✔ Seeded attendance punch logs and overtime tracking.');

    // --------------------------------------------------------------------------
    // 8. Seed Leave Balances & Leave Requests
    // --------------------------------------------------------------------------
    console.log('\n🏖️ Step 8: Seeding Leave Balances (2026) & Requests...');
    const leaveTypes = ['ANNUAL', 'SICK', 'MATERNITY', 'UNPAID'];
    for (const emp of employees) {
      for (const lt of leaveTypes) {
        const total = lt === 'ANNUAL' ? 12.0 : lt === 'SICK' ? 10.0 : lt === 'MATERNITY' ? 180.0 : 5.0;
        const used = lt === 'ANNUAL' ? (emp.employee_code === 'EMP-DOC-001' ? 5.5 : 3.0) : 0.0;
        await conn.execute(
          `INSERT INTO Leave_Balances (id, staff_id, accrual_year, leave_type, total_days, used_days)
           VALUES (?, ?, 2026, ?, ?, ?)`,
          [randomUUID(), emp.employee_code, lt, total, used]
        );
      }
    }

    // Insert sample pending & approved leave requests (including half-day 0.5 days like in Workday PDF Page 8)
    await conn.execute(
      `INSERT INTO Leave_Requests (id, staff_id, start_date, end_date, leave_type, status, reason, day_part, days_requested)
       VALUES (?, 'EMP-DOC-001', '2026-07-29', '2026-07-29', 'ANNUAL', 'APPROVED', 'Nghỉ phép nửa ngày buổi chiều (Afternoon leave).', 'SECOND_HALF', 0.5)`,
      [randomUUID()]
    );
    await conn.execute(
      `INSERT INTO Leave_Requests (id, staff_id, start_date, end_date, leave_type, status, reason, day_part, days_requested)
       VALUES (?, 'EMP-DOC-001', '2026-10-01', '2026-10-03', 'ANNUAL', 'PENDING', 'Nghỉ phép thường niên cùng gia đình.', 'FULL', 3.0)`,
      [randomUUID()]
    );
    await conn.execute(
      `INSERT INTO Leave_Requests (id, staff_id, start_date, end_date, leave_type, status, reason, day_part, days_requested)
       VALUES (?, 'EMP-NUR-003', '2026-09-22', '2026-09-22', 'ANNUAL', 'APPROVED', 'Nghỉ nửa ngày buổi sáng giải quyết việc gia đình.', 'FIRST_HALF', 0.5)`,
      [randomUUID()]
    );
    console.log('   ✔ Seeded leave balance quotas and requests (including half-day leaves).');

    // --------------------------------------------------------------------------
    // 9. Seed Pay Rates, Payroll Runs, Pay Slips, & Payment Elections
    // --------------------------------------------------------------------------
    console.log('\n💵 Step 9: Seeding Payroll Runs, Differentials, & Direct Deposits...');
    for (const emp of employees) {
      const baseRate = emp.role.includes('DOC') || emp.role === 'DEPARTMENT_HEAD' ? 65.0 : 35.0;
      await conn.execute(
        `INSERT INTO Pay_Rates (staff_id, base_hourly_rate, tax_tier) VALUES (?, ?, 'TIER_2')`,
        [emp.employee_code, baseRate]
      );

      await conn.execute(
        `INSERT INTO Payment_Elections (id, staff_id, bank_name, account_number, routing_number, is_primary)
         VALUES (?, ?, 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)', '0011004128912', 'VCB-VN-001', TRUE)`,
        [randomUUID(), emp.employee_code]
      );
    }

    const runId = 'run-2026-08-B';
    await conn.execute(
      `INSERT INTO Payroll_Runs (id, start_date, end_date, status)
       VALUES (?, '2026-08-16', '2026-08-31', 'COMPLETED')`,
      [runId]
    );

    await conn.execute(
      `INSERT INTO Pay_Slips (id, run_id, staff_id, base_pay, night_differential, overtime_pay, net_pay, status)
       VALUES (?, ?, 'EMP-DOC-001', 5200.0, 312.0, 1218.75, 5182.68, 'PAID')`,
      [randomUUID(), runId]
    );
    console.log('   ✔ Seeded compensation rates, payroll runs, and itemized pay slips.');

    // --------------------------------------------------------------------------
    // 10. Seed Notifications
    // --------------------------------------------------------------------------
    console.log('\n🔔 Step 10: Seeding Clinical Notifications & Alerts...');
    const notifs = [
      {
        target: 'EMP-DOC-001',
        title: 'Bàn giao ca Trực Cấp Cứu đêm qua',
        message: 'Bác sĩ Marcus Vance đã hoàn tất biên bản bàn giao ICU A. Vui lòng ký duyệt.',
        type: 'TASK'
      },
      {
        target: 'EMP-DOC-001',
        title: 'Cảnh báo Chứng chỉ ATLS sắp hết hạn',
        message: 'Chứng chỉ Advanced Trauma Life Support của bạn sẽ hết hạn trong 26 ngày nữa.',
        type: 'ALERT'
      },
      {
        target: 'EMP-NUR-001',
        title: 'Thông báo Tập huấn An toàn Bệnh viện',
        message: 'Khóa tập huấn quy chuẩn kiểm soát nhiễm khuẩn vô trùng tổ chức vào 14:00 thứ Năm.',
        type: 'ANNOUNCEMENT'
      }
    ];

    for (const n of notifs) {
      await conn.execute(
        `INSERT INTO Notifications (id, target_staff_id, title, message, type, is_read)
         VALUES (?, ?, ?, ?, ?, FALSE)`,
        [randomUUID(), n.target, n.title, n.message, n.type]
      );
    }
    console.log('   ✔ Seeded internal clinical alerts and notifications.');

    // --------------------------------------------------------------------------
    // 11. Seed Daily Tasks & Shift Handovers
    // --------------------------------------------------------------------------
    console.log('\n📋 Step 11: Seeding Clinical Daily Tasks & Shift Handovers...');
    const dailyTasks = [
      {
        id: randomUUID(),
        title: 'Hiệu chuẩn áp lực máy thở ICU phòng 402',
        description: 'Kiểm tra thông số PEEP, FiO2 và hiệu chuẩn cảm biến trên toàn bộ 12 máy thở khu Hồi sức A.',
        assigned_to: 'EMP-DOC-002',
        assigned_by: 'EMP-DOC-001',
        shift_id: '11111111-1111-4111-8111-111111111111',
        status: 'IN_PROGRESS',
        due_date: '2026-09-19 10:00:00'
      },
      {
        id: randomUUID(),
        title: 'Lấy mẫu khí máu động mạch (ABG) cấp cứu',
        description: 'Lấy mẫu ABG khẩn cho bệnh nhân giường 4 sau phẫu thuật mở thăm dò ổ bụng.',
        assigned_to: 'EMP-NUR-001',
        assigned_by: 'EMP-DOC-002',
        shift_id: '33333333-3333-4333-8333-333333333333',
        status: 'PENDING',
        due_date: '2026-09-19 16:30:00'
      },
      {
        id: randomUUID(),
        title: 'Kiểm tra hộp thuốc chống sốc phản vệ Crash Cart',
        description: 'Kiểm tra niêm phong Adrenaline, Hydrocortisone và máy sốc điện tại sảnh Cấp cứu.',
        assigned_to: 'EMP-NUR-002',
        assigned_by: 'EMP-DOC-001',
        shift_id: '55555555-5555-4555-8555-555555555555',
        status: 'COMPLETED',
        due_date: '2026-09-19 14:00:00'
      }
    ];

    for (const t of dailyTasks) {
      await conn.execute(
        `INSERT INTO Daily_Tasks (id, title, description, assigned_to, assigned_by, shift_id, status, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.title, t.description, t.assigned_to, t.assigned_by, t.shift_id, t.status, t.due_date]
      );
    }

    const handoverId = randomUUID();
    await conn.execute(
      `INSERT INTO Shift_Handovers (id, outgoing_shift_id, incoming_shift_id, critical_notes, status, logged_by, acknowledged_by)
       VALUES (?, '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', ?, 'PENDING_SIGNATURE', 'EMP-DOC-001', 'EMP-NUR-001')`,
      [
        handoverId,
        'Chuyển giao 4 ca cấp cứu thở máy. Bệnh nhân giường 4 đã chụp CT ổ bụng lúc 14:00. Kháng sinh Meropenem đã truyền đủ liều.'
      ]
    );

    const checklistItems = [
      'Xác nhận đối chiếu tủ thuốc hướng thần & thuốc độc bảng A (Morphine, Fentanyl)',
      'Xem xét các kết quả xét nghiệm sinh hóa & cấy máu bất thường',
      'Kiểm tra pin dự phòng máy sốc tim và bình oxy di động'
    ];

    for (const desc of checklistItems) {
      await conn.execute(
        `INSERT INTO Handover_Checklists (id, handover_id, item_description, is_verified)
         VALUES (?, ?, ?, TRUE)`,
        [randomUUID(), handoverId, desc]
      );
    }
    console.log('   ✔ Seeded clinical tasks, shift handovers, and safety checklists.');

    console.log('\n====================================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log('All 18 tables in hrm_db now contain rich, cohesive hospital records.');
    console.log('====================================================================');
  } catch (error) {
    console.error('❌ Database Seeding Failed:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seedDatabase();
