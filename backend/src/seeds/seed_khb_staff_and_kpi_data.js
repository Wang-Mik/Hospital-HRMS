import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrm_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function runSeed() {
  console.log('[Seed KHB] Starting seeding staff and KPI data for Khoa Khám Bệnh & Cấp Cứu Ban Đầu (DEP-KHB)...');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Verify DEP-KHB exists
    const [deptRows] = await conn.query("SELECT department_code, name FROM Departments WHERE department_code = 'DEP-KHB'");
    if (deptRows.length === 0) {
      throw new Error("Không tìm thấy phòng ban DEP-KHB trong bảng Departments!");
    }
    console.log(`[Seed KHB] Found Department: ${deptRows[0].name} (${deptRows[0].department_code})`);

    // 2. Define 7 clinical and administrative staff members
    const passwordHash = await bcrypt.hash('password123', 10);

    const staffList = [
      {
        employee_code: 'EMP-DOC-008',
        first_name: 'Văn Khang',
        last_name: 'Lê',
        email: 'dr.khang@hospital.org',
        phone: '0908123456',
        gender: 'MALE',
        dob: '1978-05-14',
        department_code: 'DEP-KHB',
        role: 'DEPARTMENT_HEAD',
        specialty: 'Cấp Cứu Ban Đầu & Đa Khoa Lâm Sàng',
        hire_date: '2016-03-01',
        username: 'head.khb',
        role_code: 'DEPARTMENT_HEAD',
        hourly_rate: 150000.00,
        tax_tier: 'Bậc 2 - Trưởng khoa',
        license: {
          license_type: 'DOCTOR_PRACTICING_CERTIFICATE',
          license_number: '004561/BYT-CCHN',
          issuing_authority: 'Bộ Y Tế',
          issue_date: '2011-08-15',
          expiration_date: '2028-08-15'
        },
        degree: {
          degree_level: 'SPECIALIST_2',
          degree_name: 'Bác sĩ Chuyên khoa II - Hồi sức Cấp cứu',
          institution_name: 'Đại học Y Dược TP.HCM',
          graduation_year: 2018,
          classification: 'Xuất sắc',
          degree_number: 'CK2-2018-0112'
        }
      },
      {
        employee_code: 'EMP-DOC-009',
        first_name: 'Minh Trí',
        last_name: 'Nguyễn',
        email: 'dr.tri@hospital.org',
        phone: '0908234567',
        gender: 'MALE',
        dob: '1986-11-20',
        department_code: 'DEP-KHB',
        role: 'DOCTOR',
        specialty: 'Hồi Sức Cấp Cứu & Ngoại Viện',
        hire_date: '2019-07-15',
        username: 'dr.tri',
        role_code: 'DOCTOR',
        hourly_rate: 120000.00,
        tax_tier: 'Bậc 3 - Bác sĩ',
        license: {
          license_type: 'DOCTOR_PRACTICING_CERTIFICATE',
          license_number: '005123/BYT-CCHN',
          issuing_authority: 'Bộ Y Tế',
          issue_date: '2015-06-20',
          expiration_date: '2027-06-20'
        },
        degree: {
          degree_level: 'MASTER',
          degree_name: 'Thạc sĩ Y học - Hồi sức Cấp cứu',
          institution_name: 'Đại học Y Hà Nội',
          graduation_year: 2017,
          classification: 'Giỏi',
          degree_number: 'ThS-2017-0889'
        }
      },
      {
        employee_code: 'EMP-DOC-010',
        first_name: 'Phương Thảo',
        last_name: 'Trần',
        email: 'dr.thao@hospital.org',
        phone: '0908345678',
        gender: 'FEMALE',
        dob: '1990-09-08',
        department_code: 'DEP-KHB',
        role: 'DOCTOR',
        specialty: 'Khám Bệnh Nội Tổng Quát & Tầm Soát',
        hire_date: '2021-02-01',
        username: 'dr.thao',
        role_code: 'DOCTOR',
        hourly_rate: 110000.00,
        tax_tier: 'Bậc 3 - Bác sĩ',
        license: {
          license_type: 'DOCTOR_PRACTICING_CERTIFICATE',
          license_number: '006789/BYT-CCHN',
          issuing_authority: 'Sở Y Tế Hà Nội',
          issue_date: '2018-09-10',
          expiration_date: '2028-09-10'
        },
        degree: {
          degree_level: 'BACHELOR',
          degree_name: 'Bác sĩ Đa khoa',
          institution_name: 'Đại học Y Dược Huế',
          graduation_year: 2016,
          classification: 'Giỏi',
          degree_number: 'BS-2016-YDH-0541'
        }
      },
      {
        employee_code: 'EMP-NUR-006',
        first_name: 'Thị Bích Hạnh',
        last_name: 'Phạm',
        email: 'nurse.hanh@hospital.org',
        phone: '0908456789',
        gender: 'FEMALE',
        dob: '1984-03-25',
        department_code: 'DEP-KHB',
        role: 'CHIEF_NURSE',
        specialty: 'Quản Lý Chăm Sóc & Phân Luồng Cấp Cứu',
        hire_date: '2015-10-10',
        username: 'nurse.hanh',
        role_code: 'CHIEF_NURSE',
        hourly_rate: 95000.00,
        tax_tier: 'Bậc 4 - Điều dưỡng trưởng',
        license: {
          license_type: 'NURSE_PRACTICING_CERTIFICATE',
          license_number: '011234/BYT-CCHN',
          issuing_authority: 'Bộ Y Tế',
          issue_date: '2014-04-12',
          expiration_date: '2029-04-12'
        },
        degree: {
          degree_level: 'SPECIALIST_1',
          degree_name: 'Chuyên khoa I - Quản lý Điều dưỡng',
          institution_name: 'Đại học Điều dưỡng Nam Định',
          graduation_year: 2019,
          classification: 'Xuất sắc',
          degree_number: 'CK1-DD-2019-0211'
        }
      },
      {
        employee_code: 'EMP-NUR-007',
        first_name: 'Văn Hùng',
        last_name: 'Đặng',
        email: 'nurse.hung@hospital.org',
        phone: '0908567890',
        gender: 'MALE',
        dob: '1993-12-05',
        department_code: 'DEP-KHB',
        role: 'NURSE',
        specialty: 'Tiếp Đón & Hồi Sức Cấp Cứu Ban Đầu',
        hire_date: '2022-04-01',
        username: 'nurse.hung',
        role_code: 'NURSE',
        hourly_rate: 75000.00,
        tax_tier: 'Bậc 5 - Điều dưỡng viên',
        license: {
          license_type: 'NURSE_PRACTICING_CERTIFICATE',
          license_number: '012345/BYT-CCHN',
          issuing_authority: 'Sở Y Tế Hà Nội',
          issue_date: '2019-11-20',
          expiration_date: '2029-11-20'
        },
        degree: {
          degree_level: 'BACHELOR',
          degree_name: 'Cử nhân Điều dưỡng Đa khoa',
          institution_name: 'Cao đẳng Y tế Hà Nội',
          graduation_year: 2018,
          classification: 'Khá',
          degree_number: 'CĐ-2018-0912'
        }
      },
      {
        employee_code: 'EMP-TECH-002',
        first_name: 'Quốc Toàn',
        last_name: 'Vũ',
        email: 'tech.toan@hospital.org',
        phone: '0908678901',
        gender: 'MALE',
        dob: '1991-07-18',
        department_code: 'DEP-KHB',
        role: 'TECHNICIAN',
        specialty: 'Kỹ Thuật Điện Tim Cấp Cứu & Hỗ Trợ Sơ Cứu',
        hire_date: '2020-08-15',
        username: 'tech.toan',
        role_code: 'TECHNICIAN',
        hourly_rate: 80000.00,
        tax_tier: 'Bậc 5 - Kỹ thuật viên',
        license: {
          license_type: 'TECHNICIAN_PRACTICING_CERTIFICATE',
          license_number: '023456/BYT-CCHN',
          issuing_authority: 'Bộ Y Tế',
          issue_date: '2017-03-15',
          expiration_date: '2027-03-15'
        },
        degree: {
          degree_level: 'BACHELOR',
          degree_name: 'Cử nhân Kỹ thuật Hình ảnh Y học',
          institution_name: 'Đại học Y Hà Nội',
          graduation_year: 2015,
          classification: 'Giỏi',
          degree_number: 'KTYH-2015-0341'
        }
      },
      {
        employee_code: 'EMP-STAFF-001',
        first_name: 'Thị Thanh Thủy',
        last_name: 'Lê',
        email: 'staff.thuy@hospital.org',
        phone: '0908789012',
        gender: 'FEMALE',
        dob: '1994-01-30',
        department_code: 'DEP-KHB',
        role: 'ADMIN_STAFF',
        specialty: 'Tiếp Đón Ngoại Trú & Giám Định BHYT',
        hire_date: '2021-06-01',
        username: 'staff.thuy',
        role_code: 'ADMIN_STAFF',
        hourly_rate: 65000.00,
        tax_tier: 'Bậc 6 - Nhân viên nghiệp vụ',
        license: null,
        degree: {
          degree_level: 'BACHELOR',
          degree_name: 'Cử nhân Quản trị Bệnh viện',
          institution_name: 'Đại học Y tế Công cộng',
          graduation_year: 2017,
          classification: 'Giỏi',
          degree_number: 'QTBV-2017-0105'
        }
      }
    ];

    const insertedEmpIds = {};

    for (const s of staffList) {
      // Insert or Update Employee
      await conn.query(`
        INSERT INTO Employees (
          employee_code, first_name, last_name, email, phone, gender, dob,
          department_code, role, specialty, hire_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE
          first_name = VALUES(first_name),
          last_name = VALUES(last_name),
          email = VALUES(email),
          phone = VALUES(phone),
          department_code = VALUES(department_code),
          role = VALUES(role),
          specialty = VALUES(specialty),
          status = 'ACTIVE'
      `, [
        s.employee_code, s.first_name, s.last_name, s.email, s.phone, s.gender, s.dob,
        s.department_code, s.role, s.specialty, s.hire_date
      ]);

      const [empRow] = await conn.query('SELECT id FROM Employees WHERE employee_code = ?', [s.employee_code]);
      const empId = empRow[0].id;
      insertedEmpIds[s.employee_code] = empId;

      // Create or Update Account
      const [accRow] = await conn.query('SELECT id FROM Accounts WHERE username = ? OR employee_id = ?', [s.username, empId]);
      if (accRow.length > 0) {
        await conn.query(`
          UPDATE Accounts 
          SET role_code = ?, password_hash = ?, is_locked = FALSE 
          WHERE id = ?
        `, [s.role_code, passwordHash, accRow[0].id]);
      } else {
        await conn.query(`
          INSERT INTO Accounts (id, employee_id, username, role_code, password_hash, is_locked)
          VALUES (?, ?, ?, ?, ?, FALSE)
        `, [randomUUID(), empId, s.username, s.role_code, passwordHash]);
      }

      // Create or Update Pay_Rate
      await conn.query(`
        INSERT INTO Pay_Rates (staff_id, base_hourly_rate, tax_tier, last_salary_increment_date)
        VALUES (?, ?, ?, '2026-01-01')
        ON DUPLICATE KEY UPDATE
          base_hourly_rate = VALUES(base_hourly_rate),
          tax_tier = VALUES(tax_tier)
      `, [s.employee_code, s.hourly_rate, s.tax_tier]);

      // Create or Update Academic_Degree
      if (s.degree) {
        const degId = `deg-${s.employee_code.toLowerCase()}`;
        await conn.query(`
          INSERT INTO Academic_Degrees (id, staff_id, degree_level, degree_name, institution_name, graduation_year, classification, degree_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE degree_name = VALUES(degree_name)
        `, [degId, s.employee_code, s.degree.degree_level, s.degree.degree_name, s.degree.institution_name, s.degree.graduation_year, s.degree.classification, s.degree.degree_number]);
      }

      // Create or Update Medical_License
      if (s.license) {
        const [licRows] = await conn.query('SELECT id FROM Medical_Licenses WHERE employee_id = ?', [empId]);
        if (licRows.length === 0) {
          await conn.query(`
            INSERT INTO Medical_Licenses (employee_id, license_type, license_number, issuing_authority, issue_date, expiration_date, verification_status)
            VALUES (?, ?, ?, ?, ?, ?, 'VERIFIED')
          `, [empId, s.license.license_type, s.license.license_number, s.license.issuing_authority, s.license.issue_date, s.license.expiration_date]);
        }
      }

      // Create or Update Leave_Balances (Year 2026)
      const leaveTypes = [
        { type: 'ANNUAL', total: 12.0, used: 2.0 },
        { type: 'SICK', total: 30.0, used: 1.0 },
        { type: 'UNPAID', total: 10.0, used: 0.0 }
      ];
      for (const lt of leaveTypes) {
        const [lbRows] = await conn.query(
          'SELECT id FROM Leave_Balances WHERE staff_id = ? AND accrual_year = 2026 AND leave_type = ?',
          [s.employee_code, lt.type]
        );
        if (lbRows.length === 0) {
          await conn.query(`
            INSERT INTO Leave_Balances (id, staff_id, accrual_year, leave_type, total_days, used_days)
            VALUES (?, ?, 2026, ?, ?, ?)
          `, [randomUUID(), s.employee_code, lt.type, lt.total, lt.used]);
        }
      }

      // Employment Contract
      const cntId = `cnt-${s.employee_code.toLowerCase()}`;
      await conn.query(`
        INSERT INTO Employment_Contracts (id, staff_id, contract_number, contract_type, start_date, job_title, base_salary, status)
        VALUES (?, ?, ?, 'INDEFINITE', ?, ?, ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE job_title = VALUES(job_title)
      `, [cntId, s.employee_code, `HĐLĐ-BV-${s.employee_code}`, s.hire_date, s.specialty, s.hourly_rate * 160]);

      // Social Insurance
      const insId = `ins-${s.employee_code.toLowerCase()}`;
      const numSuffix = s.employee_code.replace(/\D/g, '').padStart(6, '0');
      await conn.query(`
        INSERT INTO Social_Insurances (id, staff_id, bhxh_book_number, bhyt_card_number, primary_hospital_name, has_bhxh, has_bhyt, has_bhtn, has_occupational_accident, insurance_salary, status)
        VALUES (?, ?, ?, ?, 'Bệnh Viện Đa Khoa Trung Tâm', TRUE, TRUE, TRUE, TRUE, ?, 'ACTIVE')
        ON DUPLICATE KEY UPDATE primary_hospital_name = VALUES(primary_hospital_name)
      `, [insId, s.employee_code, `079${numSuffix}`, `GD479${numSuffix}`, s.hourly_rate * 160 * 0.8]);

      console.log(`[Seed KHB] Initialized Employee: ${s.employee_code} - ${s.last_name} ${s.first_name} (${s.role})`);
    }

    // 3. Generate Shift and Attendance records for Tháng 10/2026 (2026-10)
    console.log('[Seed KHB] Generating Shifts and Attendances for 2026-10...');
    const octDays = 31;
    const shiftDefs = [
      { type: 'MORNING', start: '07:00:00', end: '15:30:00', inTime: '06:48:00', outTime: '15:35:00' },
      { type: 'AFTERNOON', start: '15:00:00', end: '23:00:00', inTime: '14:50:00', outTime: '23:08:00' },
      { type: 'NIGHT', start: '22:30:00', end: '07:30:00', inTime: '22:15:00', outTime: '07:35:00' }
    ];

    // For each staff member, create 20 to 22 shifts in October 2026
    let shiftCounter = 0;
    const completedShiftIds = [];

    for (let i = 0; i < staffList.length; i++) {
      const staff = staffList[i];
      let assignedShifts = 0;

      for (let day = 1; day <= octDays; day++) {
        // Staff works approx 5 days a week (skip weekends or alternating days)
        if ((day + i) % 7 === 0 || (day + i) % 7 === 6) continue;
        if (assignedShifts >= 21) break;

        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const shiftDef = shiftDefs[(day + i) % 3];

        const shiftId = `shift-khb-202610-${staff.employee_code.toLowerCase()}-${dayStr}`;
        const startTime = `2026-10-${dayStr} ${shiftDef.start}`;
        let endTime = `2026-10-${dayStr} ${shiftDef.end}`;
        if (shiftDef.type === 'NIGHT') {
          const nextDay = day + 1 <= octDays ? (day + 1 < 10 ? `0${day + 1}` : `${day + 1}`) : '01';
          const nextMonth = day + 1 <= octDays ? '10' : '11';
          endTime = `2026-${nextMonth}-${nextDay} ${shiftDef.end}`;
        }

        // Insert Shift
        await conn.query(`
          INSERT INTO Shifts (id, staff_id, department_code, start_time, end_time, shift_type, status, requires_handover)
          VALUES (?, ?, 'DEP-KHB', ?, ?, ?, 'COMPLETED', 1)
          ON DUPLICATE KEY UPDATE status = 'COMPLETED', requires_handover = 1
        `, [shiftId, staff.employee_code, startTime, endTime, shiftDef.type]);

        completedShiftIds.push({ id: shiftId, staff_id: staff.employee_code, startTime });

        // Insert Attendance
        // Simulate 1 late day for EMP-NUR-007 on Oct 12, and EMP-DOC-010 on Oct 19
        const isLate = (staff.employee_code === 'EMP-NUR-007' && day === 12) || (staff.employee_code === 'EMP-DOC-010' && day === 19);
        const clockIn = isLate ? `2026-10-${dayStr} 07:22:00` : `2026-10-${dayStr} ${shiftDef.inTime}`;
        const clockOut = shiftDef.type === 'NIGHT'
          ? (day + 1 <= octDays ? `2026-10-${day + 1 < 10 ? `0${day + 1}` : day + 1} 07:35:00` : `2026-11-01 07:35:00`)
          : `2026-10-${dayStr} ${shiftDef.outTime}`;
        const attStatus = isLate ? 'LATE' : 'PRESENT';

        const attId = `att-khb-202610-${staff.employee_code.toLowerCase()}-${dayStr}`;
        await conn.query(`
          INSERT INTO Attendances (id, shift_id, staff_id, clock_in_time, clock_out_time, clock_in_method, attendance_status)
          VALUES (?, ?, ?, ?, ?, 'BIOMETRIC', ?)
          ON DUPLICATE KEY UPDATE attendance_status = VALUES(attendance_status), clock_in_time = VALUES(clock_in_time)
        `, [attId, shiftId, staff.employee_code, clockIn, clockOut, attStatus]);

        assignedShifts++;
        shiftCounter++;
      }
    }
    console.log(`[Seed KHB] Created ${shiftCounter} completed Shifts and Attendances for October 2026.`);

    // 4. Create Shift Handovers linking outgoing shifts
    for (let k = 0; k < completedShiftIds.length - 1; k += 2) {
      const outShift = completedShiftIds[k];
      const inShift = completedShiftIds[k + 1];
      const hoId = randomUUID();

      await conn.query(`
        INSERT INTO Shift_Handovers (
          id, outgoing_shift_id, incoming_shift_id, department_code, status,
          logged_by, acknowledged_by, critical_notes, handover_category
        ) VALUES (?, ?, ?, 'DEP-KHB', 'COMPLETED', ?, ?, 'Bàn giao ca trực khám bệnh & cấp cứu an toàn, không có tai biến.', 'SHIFT_HANDOVER')
        ON DUPLICATE KEY UPDATE status = 'COMPLETED'
      `, [hoId, outShift.id, inShift.id, outShift.staff_id, inShift.staff_id]);
    }
    console.log('[Seed KHB] Seeded completed Shift Handovers.');

    // 5. Generate November 2026 (2026-11) Shifts and Attendances
    console.log('[Seed KHB] Generating Shifts for 2026-11 (Current Month)...');
    let novShiftCounter = 0;
    for (let i = 0; i < staffList.length; i++) {
      const staff = staffList[i];
      for (let day = 1; day <= 28; day++) {
        if ((day + i) % 7 === 0 || (day + i) % 7 === 6) continue;

        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const shiftDef = shiftDefs[(day + i) % 3];
        const shiftId = `shift-khb-202611-${staff.employee_code.toLowerCase()}-${dayStr}`;
        const startTime = `2026-11-${dayStr} ${shiftDef.start}`;
        const endTime = `2026-11-${dayStr} ${shiftDef.end}`;
        
        // Days 1 to 4: COMPLETED with Attendances
        const isPast = day <= 4;
        const status = isPast ? 'COMPLETED' : 'SCHEDULED';

        await conn.query(`
          INSERT INTO Shifts (id, staff_id, department_code, start_time, end_time, shift_type, status, requires_handover)
          VALUES (?, ?, 'DEP-KHB', ?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE status = VALUES(status)
        `, [shiftId, staff.employee_code, startTime, endTime, shiftDef.type, status]);

        if (isPast) {
          const attId = `att-khb-202611-${staff.employee_code.toLowerCase()}-${dayStr}`;
          const clockIn = `2026-11-${dayStr} ${shiftDef.inTime}`;
          const clockOut = `2026-11-${dayStr} ${shiftDef.outTime}`;
          await conn.query(`
            INSERT INTO Attendances (id, shift_id, staff_id, clock_in_time, clock_out_time, clock_in_method, attendance_status)
            VALUES (?, ?, ?, ?, ?, 'BIOMETRIC', 'PRESENT')
            ON DUPLICATE KEY UPDATE attendance_status = 'PRESENT'
          `, [attId, shiftId, staff.employee_code, clockIn, clockOut]);
        }
        novShiftCounter++;
      }
    }
    console.log(`[Seed KHB] Created ${novShiftCounter} Shifts for November 2026.`);

    // 6. Pre-evaluate Monthly KPIs for October 2026 (2026-10)
    console.log('[Seed KHB] Seeding Monthly_KPIs for October 2026 (2026-10)...');
    const kpiSeeds = [
      {
        staff_id: 'EMP-DOC-008',
        kpi_month: '2026-10',
        actual_shifts: 21,
        actual_hours: 168.0,
        score_discipline: 100.0,
        score_task_completion: 98.0,
        score_work_quality: 96.0,
        score_communication: 95.0,
        score_competence: 96.0,
        score_innovation: 90.0,
        incident_cause: 'NONE',
        incident_penalty: 0.0,
        total_kpi_score: 96.2,
        kpi_grade: 'GRADE_A',
        notes: 'Chỉ đạo cấp cứu khẩn trương, điều hành khoa khám bệnh thông suốt, không xảy ra sai sót y khoa.',
        evaluated_by: 'EMP-ADM-001'
      },
      {
        staff_id: 'EMP-DOC-009',
        kpi_month: '2026-10',
        actual_shifts: 20,
        actual_hours: 162.0,
        score_discipline: 100.0,
        score_task_completion: 95.0,
        score_work_quality: 92.0,
        score_communication: 90.0,
        score_competence: 92.0,
        score_innovation: 85.0,
        incident_cause: 'NEAR_MISS_PREVENTED',
        incident_penalty: 0.0,
        total_kpi_score: 92.8,
        kpi_grade: 'GRADE_A',
        notes: 'Xử trí ca sốc phản vệ ngoại trú kịp thời. Báo cáo sự cố suýt xảy ra (Near-miss) chuẩn xác giúp cải tiến quy trình tiêm an toàn.',
        evaluated_by: 'EMP-DOC-008'
      },
      {
        staff_id: 'EMP-DOC-010',
        kpi_month: '2026-10',
        actual_shifts: 20,
        actual_hours: 160.0,
        score_discipline: 95.0,
        score_task_completion: 92.0,
        score_work_quality: 90.0,
        score_communication: 92.0,
        score_competence: 88.0,
        score_innovation: 80.0,
        incident_cause: 'NONE',
        incident_penalty: 0.0,
        total_kpi_score: 89.9,
        kpi_grade: 'GRADE_B',
        notes: 'Thăm khám bệnh nhân ngoại trú kỹ lưỡng, tư vấn nhiệt tình, đi muộn 1 lần đã có giải trình.',
        evaluated_by: 'EMP-DOC-008'
      },
      {
        staff_id: 'EMP-NUR-006',
        kpi_month: '2026-10',
        actual_shifts: 21,
        actual_hours: 168.0,
        score_discipline: 100.0,
        score_task_completion: 96.0,
        score_work_quality: 95.0,
        score_communication: 96.0,
        score_competence: 95.0,
        score_innovation: 85.0,
        incident_cause: 'NONE',
        incident_penalty: 0.0,
        total_kpi_score: 95.4,
        kpi_grade: 'GRADE_A',
        notes: 'Điều dưỡng trưởng gương mẫu, phân luồng bệnh nhân cấp cứu khoa học, sổ bàn giao đầy đủ.',
        evaluated_by: 'EMP-DOC-008'
      },
      {
        staff_id: 'EMP-NUR-007',
        kpi_month: '2026-10',
        actual_shifts: 21,
        actual_hours: 168.0,
        score_discipline: 95.2,
        score_task_completion: 90.0,
        score_work_quality: 88.0,
        score_communication: 90.0,
        score_competence: 88.0,
        score_innovation: 80.0,
        incident_cause: 'NONE',
        incident_penalty: 0.0,
        total_kpi_score: 89.1,
        kpi_grade: 'GRADE_B',
        notes: 'Tận tình hỗ trợ cấp cứu người bệnh, đi muộn 1 ca trực ngày 12/10.',
        evaluated_by: 'EMP-DOC-008'
      },
      {
        staff_id: 'EMP-TECH-002',
        kpi_month: '2026-10',
        actual_shifts: 20,
        actual_hours: 160.0,
        score_discipline: 100.0,
        score_task_completion: 95.0,
        score_work_quality: 94.0,
        score_communication: 92.0,
        score_competence: 90.0,
        score_innovation: 82.0,
        incident_cause: 'NONE',
        incident_penalty: 0.0,
        total_kpi_score: 93.6,
        kpi_grade: 'GRADE_A',
        notes: 'Điện tim cấp cứu nhanh chóng, hỗ trợ sơ cứu kịp thời tại phòng khám ngoại trú.',
        evaluated_by: 'EMP-DOC-008'
      },
      {
        staff_id: 'EMP-STAFF-001',
        kpi_month: '2026-10',
        actual_shifts: 21,
        actual_hours: 168.0,
        score_discipline: 100.0,
        score_task_completion: 95.0,
        score_work_quality: 90.0,
        score_communication: 95.0,
        score_competence: 90.0,
        score_innovation: 80.0,
        incident_cause: 'NONE',
        incident_penalty: 0.0,
        total_kpi_score: 93.8,
        kpi_grade: 'GRADE_A',
        notes: 'Tiếp đón người bệnh ân cần, hướng dẫn làm thủ tục BHYT nhanh chóng, giảm thời gian chờ đợi.',
        evaluated_by: 'EMP-DOC-008'
      }
    ];

    for (const k of kpiSeeds) {
      const kpiId = `kpi-khb-202610-${k.staff_id.toLowerCase()}`;
      await conn.query(`
        INSERT INTO Monthly_KPIs (
          id, staff_id, kpi_month, target_shifts, actual_shifts, target_hours, actual_hours,
          on_time_attendance_rate, handover_compliance_rate,
          score_discipline, score_task_completion, score_work_quality,
          score_communication, score_competence, score_innovation,
          clinical_performance_score, patient_satisfaction_score,
          incident_cause, incident_penalty_points, disciplinary_penalty_points,
          total_kpi_score, kpi_grade, evaluation_notes, evaluated_by, status
        ) VALUES (?, ?, ?, 20, ?, 160.0, ?, ?, 100.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED')
        ON DUPLICATE KEY UPDATE
          actual_shifts = VALUES(actual_shifts),
          actual_hours = VALUES(actual_hours),
          on_time_attendance_rate = VALUES(on_time_attendance_rate),
          score_discipline = VALUES(score_discipline),
          score_task_completion = VALUES(score_task_completion),
          score_work_quality = VALUES(score_work_quality),
          score_communication = VALUES(score_communication),
          score_competence = VALUES(score_competence),
          score_innovation = VALUES(score_innovation),
          total_kpi_score = VALUES(total_kpi_score),
          kpi_grade = VALUES(kpi_grade),
          incident_cause = VALUES(incident_cause),
          evaluation_notes = VALUES(evaluation_notes)
      `, [
        kpiId, k.staff_id, k.kpi_month, k.actual_shifts, k.actual_hours,
        k.score_discipline, k.score_discipline, k.score_task_completion, k.score_work_quality,
        k.score_communication, k.score_competence, k.score_innovation,
        k.score_work_quality, k.score_communication,
        k.incident_cause, k.incident_penalty, k.incident_penalty,
        k.total_kpi_score, k.kpi_grade, k.notes, k.evaluated_by
      ]);
    }

    await conn.commit();
    console.log('[Seed KHB] SUCCESS! Successfully seeded 7 staff and full KPI data for Khoa Khám Bệnh & Cấp Cứu Ban Đầu.');
  } catch (err) {
    await conn.rollback();
    console.error('[Seed KHB] FAILED:', err);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

runSeed();
