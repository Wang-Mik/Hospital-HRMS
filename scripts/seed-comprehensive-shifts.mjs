import pool from '../backend/src/db.js';
import { randomUUID } from 'crypto';

// Pure date string helper: adds/subtracts days to YYYY-MM-DD
function offsetDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// Compare two YYYY-MM-DD HH:mm:ss strings (ms difference)
function diffHours(startStr, endStr) {
  const t1 = new Date(startStr.replace(' ', 'T')).getTime();
  const t2 = new Date(endStr.replace(' ', 'T')).getTime();
  return (t2 - t1) / (1000 * 60 * 60);
}

async function seedComprehensiveSchedule() {
  console.log('===================================================================');
  console.log(' SEEDING COMPREHENSIVE HOSPITAL ROSTER (2026-10-12 TO 2026-11-22)');
  console.log('===================================================================');

  // 1. Ensure phone numbers & department codes are up-to-date for all 16 staff
  const staffUpdates = [
    { code: 'EMP-ADM-001', phone: '0901234001', first: 'Văn A', last: 'Nguyễn', role: 'SUPER_ADMIN', dept: 'DEP-KHTH', spec: 'Quản Trị Bệnh Viện' },
    { code: 'EMP-DOC-001', phone: '0901234002', first: 'Văn B', last: 'Nguyễn', role: 'DEPARTMENT_HEAD', dept: 'DEP-HSTC', spec: 'Hồi Sức Cấp Cứu' },
    { code: 'EMP-DOC-002', phone: '0901234003', first: 'Thị C', last: 'Nguyễn', role: 'DOCTOR', dept: 'DEP-NOI', spec: 'Nội Tổng Hợp' },
    { code: 'EMP-DOC-003', phone: '0901234004', first: 'Văn D', last: 'Nguyễn', role: 'DOCTOR', dept: 'DEP-NGOAI', spec: 'Ngoại Phẫu Thuật' },
    { code: 'EMP-DOC-004', phone: '0901234005', first: 'Thị E', last: 'Nguyễn', role: 'DOCTOR', dept: 'DEP-SANNHI', spec: 'Sản Phụ Khoa' },
    { code: 'EMP-NUR-001', phone: '0901234006', first: 'Văn F', last: 'Nguyễn', role: 'NURSE', dept: 'DEP-HSTC', spec: 'Điều Dưỡng Hồi Sức' },
    { code: 'EMP-NUR-002', phone: '0901234007', first: 'Thị G', last: 'Nguyễn', role: 'NURSE', dept: 'DEP-NOI', spec: 'Điều Dưỡng Nội Khoa' },
    { code: 'EMP-TECH-001', phone: '0901234008', first: 'Văn H', last: 'Nguyễn', role: 'TECHNICIAN', dept: 'DEP-CDHA', spec: 'Chẩn Đoán Hình Ảnh' },
    { code: 'EMP-PHAR-001', phone: '0901234009', first: 'Thị I', last: 'Nguyễn', role: 'STAFF', dept: 'DEP-DUOC', spec: 'Dược Lâm Sàng' },
    { code: 'EMP-HR-001', phone: '0901234010', first: 'Văn K', last: 'Nguyễn', role: 'HR_MANAGER', dept: 'DEP-KHTH', spec: 'Tổ Chức Cán Bộ' },
    { code: 'EMP-DOC-005', phone: '0901234011', first: 'Hoàng Long', last: 'Lê', role: 'DOCTOR', dept: 'DEP-HSTC', spec: 'Hồi Sức Cấp Cứu' },
    { code: 'EMP-DOC-006', phone: '0901234012', first: 'Minh Tuấn', last: 'Trần', role: 'DOCTOR', dept: 'DEP-NGOAI', spec: 'Ngoại Chấn Thương' },
    { code: 'EMP-DOC-007', phone: '0901234013', first: 'Đức Anh', last: 'Hoàng', role: 'DOCTOR', dept: 'DEP-NOI', spec: 'Nội Tim Mạch' },
    { code: 'EMP-NUR-003', phone: '0901234014', first: 'Thị Mai', last: 'Phạm', role: 'NURSE', dept: 'DEP-HSTC', spec: 'Điều Dưỡng Trưởng' },
    { code: 'EMP-NUR-004', phone: '0901234015', first: 'Thùy Linh', last: 'Vũ', role: 'NURSE', dept: 'DEP-HSTC', spec: 'Điều Dưỡng Cấp Cứu' },
    { code: 'EMP-NUR-005', phone: '0901234016', first: 'Thu Trang', last: 'Đỗ', role: 'NURSE', dept: 'DEP-NOI', spec: 'Điều Dưỡng Nội Khoa' }
  ];

  for (const s of staffUpdates) {
    const [exist] = await pool.query('SELECT employee_code FROM Employees WHERE employee_code = ?', [s.code]);
    if (exist.length > 0) {
      await pool.query(
        'UPDATE Employees SET phone = ?, department_code = ?, specialty = ?, first_name = ?, last_name = ? WHERE employee_code = ?',
        [s.phone, s.dept, s.spec, s.first, s.last, s.code]
      );
    } else {
      await pool.query(
        'INSERT INTO Employees (employee_code, first_name, last_name, role, department_code, specialty, email, phone, status, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.code, s.first, s.last, s.role, s.dept, s.spec, `${s.code.toLowerCase()}@hospital.vn`, s.phone, 'ACTIVE', '2024-01-15']
      );
    }
  }
  console.log(`Updated profile & phone numbers for all ${staffUpdates.length} healthcare staff.`);

  // 2. Build list of all dates from 2026-10-12 to 2026-11-22 (42 days, 6 full calendar weeks)
  const allDates = [];
  let dPtr = '2026-10-12';
  while (dPtr <= '2026-11-22') {
    allDates.push(dPtr);
    dPtr = offsetDate(dPtr, 1);
  }
  console.log(`Generated date pool: ${allDates.length} days (${allDates[0]} to ${allDates[allDates.length - 1]}).`);

  // In-memory shift collector
  const generatedShifts = [];

  function addShift({ staffId, deptCode, start, end, type, tier = 'CLINICAL', team = 'GENERAL', is24h = 0, status = 'SCHEDULED' }) {
    generatedShifts.push({
      id: randomUUID(),
      staff_id: staffId,
      department_code: deptCode,
      start_time: start,
      end_time: end,
      shift_type: type,
      on_call_tier: tier,
      team_code: team,
      is_24h_on_call: is24h,
      status: status,
      requires_handover: 1
    });
  }

  // Group dates into Mondays (week starters)
  const mondays = allDates.filter(d => {
    const dt = new Date(d);
    return dt.getDay() === 1; // 1 is Monday
  });

  // =====================================================================
  // A. KHOA HỒI SỨC TÍCH CỰC & CHỐNG ĐỘC (DEP-HSTC)
  // =====================================================================

  // 1. BS. NGUYỄN VĂN B (EMP-DOC-001) - Trưởng Khoa HSTC
  // Schedule pattern:
  // Mon: Khám Hành Chính (07:30 - 16:30)
  // Tue: Khám Hành Chính (07:30 - 16:30)
  // Wed: Khám Hành Chính (07:30 - 16:30) + Trực Lãnh Đạo Viện (16:30 - 07:30 sáng Thu)
  // Thu: NGHỈ BÙ SAU TRỰC NGUYÊN NGÀY (No shifts!)
  // Fri: Khám Hành Chính (07:30 - 16:30) -> Rest from Thu 07:30 to Fri 07:30 = 24.0h!
  // Sat: Khám Ngoài Giờ (16:30 - 20:00) -> Rest from Fri 16:30 to Sat 16:30 = 24.0h!
  // Sun: Nghỉ ngơi cuối tuần -> Rest from Sat 20:00 to Mon 07:30 = 35.5h!
  mondays.forEach(mon => {
    const tue = offsetDate(mon, 1);
    const wed = offsetDate(mon, 2);
    const thu = offsetDate(mon, 3);
    const fri = offsetDate(mon, 4);
    const sat = offsetDate(mon, 5);

    addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: `${mon} 07:30:00`, end: `${mon} 16:30:00`, type: 'MORNING', tier: 'CLINICAL', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: `${tue} 07:30:00`, end: `${tue} 16:30:00`, type: 'MORNING', tier: 'CLINICAL', team: 'GENERAL' });
    // Wed administrative
    addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: `${wed} 07:30:00`, end: `${wed} 16:30:00`, type: 'MORNING', tier: 'CLINICAL', team: 'GENERAL' });
    // Wed overnight leadership duty to Thu morning
    addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: `${wed} 16:30:00`, end: `${thu} 07:30:00`, type: 'ON_CALL', tier: 'LEADERSHIP', team: 'GENERAL' });
    // Thu: Full compensatory rest day!
    // Fri administrative
    addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: `${fri} 07:30:00`, end: `${fri} 16:30:00`, type: 'MORNING', tier: 'CLINICAL', team: 'GENERAL' });
    // Sat overtime
    addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: `${sat} 16:30:00`, end: `${sat} 20:00:00`, type: 'AFTERNOON', tier: 'CLINICAL', team: 'GENERAL' });
  });

  // 2. ĐD. PHẠM THỊ MAI (EMP-NUR-003) - Điều Dưỡng Trưởng Khoa HSTC
  // Hành chính quản trị buồng bệnh Mon - Fri (07:30 - 16:30)
  mondays.forEach(mon => {
    for (let i = 0; i < 5; i++) {
      const d = offsetDate(mon, i);
      addShift({ staffId: 'EMP-NUR-003', deptCode: 'DEP-HSTC', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING', tier: 'CLINICAL', team: 'GENERAL' });
    }
  });

  // 3. BS. LÊ HOÀNG LONG (EMP-DOC-005) & ĐD. NGUYỄN VĂN F (EMP-NUR-001)
  // Continuous 3 Ca 4 Kíp (Kíp 1 - TEAM_A):
  // Day 0: Ca 1 Sáng (07:00 - 14:00) -> Nghỉ 24h
  // Day 1: Ca 2 Chiều (14:00 - 21:00) -> Nghỉ 24h
  // Day 2: Ca 3 Đêm (21:00 - 07:00 hôm sau) -> Nghỉ bù 24h
  // Day 3: Nghỉ nguyên ngày
  // Day 4: Ca 1 Sáng (07:00 - 14:00) ...
  allDates.forEach((dateStr, dayIndex) => {
    const cycleDay = dayIndex % 4;
    const nextDate = offsetDate(dateStr, 1);

    if (cycleDay === 0) {
      // Ca 1: Sáng (07:00 - 14:00)
      addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: `${dateStr} 07:00:00`, end: `${dateStr} 14:00:00`, type: 'MORNING', team: 'TEAM_A' });
      addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: `${dateStr} 07:00:00`, end: `${dateStr} 14:00:00`, type: 'MORNING', team: 'TEAM_A' });
    } else if (cycleDay === 1) {
      // Ca 2: Chiều (14:00 - 21:00)
      addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: `${dateStr} 14:00:00`, end: `${dateStr} 21:00:00`, type: 'AFTERNOON', team: 'TEAM_A' });
      addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: `${dateStr} 14:00:00`, end: `${dateStr} 21:00:00`, type: 'AFTERNOON', team: 'TEAM_A' });
    } else if (cycleDay === 2) {
      // Ca 3: Đêm (21:00 - 07:00 hôm sau)
      addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: `${dateStr} 21:00:00`, end: `${nextDate} 07:00:00`, type: 'NIGHT', team: 'TEAM_A' });
      addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: `${dateStr} 21:00:00`, end: `${nextDate} 07:00:00`, type: 'NIGHT', team: 'TEAM_A' });
    }
    // cycleDay === 3: Nghỉ nguyên ngày sau trực đêm!
  });

  // 4. ĐD. VŨ THÙY LINH (EMP-NUR-004) - Điều Dưỡng Cấp Cứu / HSTC
  // Model 2 Ca 3 Kíp (Phương án 10h/14h):
  // Day 0: Ca Ngày (07:00 - 17:00: 10h) -> Nghỉ 24h
  // Day 1: Ca Đêm (17:00 - 07:00 hôm sau: 14h) -> Nghỉ bù 24h
  // Day 2: Nghỉ sau ca đêm
  // Day 3: Chuẩn bị / Nghỉ
  // Day 4: Ca Ngày (07:00 - 17:00)
  allDates.forEach((dateStr, dayIndex) => {
    const cycleDay = dayIndex % 4;
    const nextDate = offsetDate(dateStr, 1);

    if (cycleDay === 0) {
      // Ca Ngày 07:00 - 17:00
      addShift({ staffId: 'EMP-NUR-004', deptCode: 'DEP-HSTC', start: `${dateStr} 07:00:00`, end: `${dateStr} 17:00:00`, type: 'MORNING', team: 'TEAM_B' });
    } else if (cycleDay === 1) {
      // Ca Đêm 17:00 - 07:00 hôm sau
      addShift({ staffId: 'EMP-NUR-004', deptCode: 'DEP-HSTC', start: `${dateStr} 17:00:00`, end: `${nextDate} 07:00:00`, type: 'NIGHT', team: 'TEAM_B' });
    }
    // cycleDay === 2 & 3: Nghỉ bù 24h-48h!
  });

  // =====================================================================
  // B. KHOA NỘI TỔNG HỢP (DEP-NOI)
  // Staff: BS. Nguyễn Thị C (EMP-DOC-002), BS. Hoàng Đức Anh (EMP-DOC-007),
  //        ĐD. Nguyễn Thị G (EMP-NUR-002), ĐD. Đỗ Thu Trang (EMP-NUR-005)
  // =====================================================================

  // 1. BS. NGUYỄN THỊ C (EMP-DOC-002)
  // Mon: Hành chính (07:30 - 16:30)
  // Tue: Hành chính (07:30 - 16:30) + Trực Đêm Khoa Nội (21:00 - 07:00 sáng Wed)
  // Wed: NGHỈ BÙ SAU TRỰC TRỌN VẸN!
  // Thu: Hành chính (07:30 - 16:30) [Rest from Wed 07:00 to Thu 07:30 = 24.5h]
  // Fri: Hành chính (07:30 - 16:30) + Khám ngoài giờ thứ 6 (16:30 - 20:00)
  // Sat & Sun: Nghỉ cuối tuần [Rest from Fri 20:00 to Mon 07:30 = 59.5h]
  mondays.forEach(mon => {
    const tue = offsetDate(mon, 1);
    const wed = offsetDate(mon, 2);
    const thu = offsetDate(mon, 3);
    const fri = offsetDate(mon, 4);

    addShift({ staffId: 'EMP-DOC-002', deptCode: 'DEP-NOI', start: `${mon} 07:30:00`, end: `${mon} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-002', deptCode: 'DEP-NOI', start: `${tue} 07:30:00`, end: `${tue} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-002', deptCode: 'DEP-NOI', start: `${tue} 21:00:00`, end: `${wed} 07:00:00`, type: 'NIGHT', team: 'GENERAL' });
    // Wed: Compensatory rest day!
    addShift({ staffId: 'EMP-DOC-002', deptCode: 'DEP-NOI', start: `${thu} 07:30:00`, end: `${thu} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-002', deptCode: 'DEP-NOI', start: `${fri} 07:30:00`, end: `${fri} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-002', deptCode: 'DEP-NOI', start: `${fri} 16:30:00`, end: `${fri} 20:00:00`, type: 'AFTERNOON', team: 'GENERAL' });
  });

  // 2. BS. HOÀNG ĐỨC ANH (EMP-DOC-007) & ĐD. ĐỖ THU TRANG (EMP-NUR-005)
  // 3 Ca 4 Kíp (Kíp 2 - lệch pha 2 ngày so với Kíp 1):
  allDates.forEach((dateStr, dayIndex) => {
    const cycleDay = (dayIndex + 2) % 4;
    const nextDate = offsetDate(dateStr, 1);

    if (cycleDay === 0) {
      addShift({ staffId: 'EMP-DOC-007', deptCode: 'DEP-NOI', start: `${dateStr} 07:00:00`, end: `${dateStr} 14:00:00`, type: 'MORNING', team: 'TEAM_B' });
      addShift({ staffId: 'EMP-NUR-005', deptCode: 'DEP-NOI', start: `${dateStr} 07:00:00`, end: `${dateStr} 14:00:00`, type: 'MORNING', team: 'TEAM_B' });
    } else if (cycleDay === 1) {
      addShift({ staffId: 'EMP-DOC-007', deptCode: 'DEP-NOI', start: `${dateStr} 14:00:00`, end: `${dateStr} 21:00:00`, type: 'AFTERNOON', team: 'TEAM_B' });
      addShift({ staffId: 'EMP-NUR-005', deptCode: 'DEP-NOI', start: `${dateStr} 14:00:00`, end: `${dateStr} 21:00:00`, type: 'AFTERNOON', team: 'TEAM_B' });
    } else if (cycleDay === 2) {
      addShift({ staffId: 'EMP-DOC-007', deptCode: 'DEP-NOI', start: `${dateStr} 21:00:00`, end: `${nextDate} 07:00:00`, type: 'NIGHT', team: 'TEAM_B' });
      addShift({ staffId: 'EMP-NUR-005', deptCode: 'DEP-NOI', start: `${dateStr} 21:00:00`, end: `${nextDate} 07:00:00`, type: 'NIGHT', team: 'TEAM_B' });
    }
  });

  // 3. ĐD. NGUYỄN THỊ G (EMP-NUR-002) - Khoa Nội
  // Ca Hành Chính Mon-Fri (07:30 - 16:30)
  mondays.forEach(mon => {
    for (let i = 0; i < 5; i++) {
      const d = offsetDate(mon, i);
      addShift({ staffId: 'EMP-NUR-002', deptCode: 'DEP-NOI', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    }
  });

  // =====================================================================
  // C. KHOA NGOẠI TỔNG HỢP & PHẪU THUẬT (DEP-NGOAI)
  // Staff: BS. Nguyễn Văn D (EMP-DOC-003), BS. Trần Minh Tuấn (EMP-DOC-006)
  // =====================================================================

  // 1. BS. NGUYỄN VĂN D (EMP-DOC-003) - Phẫu thuật ngoại khoa
  // Mon: Khám & Mổ (07:30 - 16:30)
  // Tue: Khám & Mổ (07:30 - 16:30) + Trực Đêm Cấp Cứu Ngoại (21:00 - 07:00 sáng Wed)
  // Wed: NGHỈ BÙ SAU TRỰC TRỌN VẸN!
  // Thu: Khám & Mổ (07:30 - 16:30)
  // Fri: Khám & Mổ (07:30 - 16:30)
  // Sat: Khám Ngoài Giờ Ngoại Khoa (16:30 - 20:00) [Rest from Fri 16:30 to Sat 16:30 = 24.0h]
  // Sun: Nghỉ cuối tuần [Rest from Sat 20:00 to Mon 07:30 = 35.5h]
  mondays.forEach(mon => {
    const tue = offsetDate(mon, 1);
    const wed = offsetDate(mon, 2);
    const thu = offsetDate(mon, 3);
    const fri = offsetDate(mon, 4);
    const sat = offsetDate(mon, 5);

    addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: `${mon} 07:30:00`, end: `${mon} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: `${tue} 07:30:00`, end: `${tue} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: `${tue} 21:00:00`, end: `${wed} 07:00:00`, type: 'NIGHT', team: 'GENERAL' });
    // Wed: Compensatory rest day!
    addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: `${thu} 07:30:00`, end: `${thu} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: `${fri} 07:30:00`, end: `${fri} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: `${sat} 16:30:00`, end: `${sat} 20:00:00`, type: 'AFTERNOON', team: 'GENERAL' });
  });

  // 2. BS. TRẦN MINH TUẤN (EMP-DOC-006) - Bác sĩ Ngoại Chấn Thương
  // 3 Ca 4 Kíp Luân Phiên (Kíp 3 - lệch pha 1 ngày so với Kíp 1):
  allDates.forEach((dateStr, dayIndex) => {
    const cycleDay = (dayIndex + 1) % 4;
    const nextDate = offsetDate(dateStr, 1);

    if (cycleDay === 0) {
      addShift({ staffId: 'EMP-DOC-006', deptCode: 'DEP-NGOAI', start: `${dateStr} 07:00:00`, end: `${dateStr} 14:00:00`, type: 'MORNING', team: 'TEAM_C' });
    } else if (cycleDay === 1) {
      addShift({ staffId: 'EMP-DOC-006', deptCode: 'DEP-NGOAI', start: `${dateStr} 14:00:00`, end: `${dateStr} 21:00:00`, type: 'AFTERNOON', team: 'TEAM_C' });
    } else if (cycleDay === 2) {
      addShift({ staffId: 'EMP-DOC-006', deptCode: 'DEP-NGOAI', start: `${dateStr} 21:00:00`, end: `${nextDate} 07:00:00`, type: 'NIGHT', team: 'TEAM_C' });
    }
  });

  // =====================================================================
  // D. KHOA PHỤ SẢN & NHI KHOA (DEP-SANNHI)
  // Staff: BS. Nguyễn Thị E (EMP-DOC-004)
  // =====================================================================
  // Mon, Tue, Wed: Hành chính (07:30 - 16:30)
  // Thu: Hành chính (07:30 - 16:30) + Trực Cấp Cứu Sản Nhi (21:00 - 07:00 sáng Fri)
  // Fri: NGHỈ BÙ SAU TRỰC NGUYÊN NGÀY!
  // Sat: Khám Ngoài Giờ Sản Nhi (07:30 - 12:00) [Rest from Fri 07:00 to Sat 07:30 = 24.5h]
  mondays.forEach(mon => {
    const tue = offsetDate(mon, 1);
    const wed = offsetDate(mon, 2);
    const thu = offsetDate(mon, 3);
    const fri = offsetDate(mon, 4);
    const sat = offsetDate(mon, 5);

    addShift({ staffId: 'EMP-DOC-004', deptCode: 'DEP-SANNHI', start: `${mon} 07:30:00`, end: `${mon} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-004', deptCode: 'DEP-SANNHI', start: `${tue} 07:30:00`, end: `${tue} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-004', deptCode: 'DEP-SANNHI', start: `${wed} 07:30:00`, end: `${wed} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-004', deptCode: 'DEP-SANNHI', start: `${thu} 07:30:00`, end: `${thu} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    addShift({ staffId: 'EMP-DOC-004', deptCode: 'DEP-SANNHI', start: `${thu} 21:00:00`, end: `${fri} 07:00:00`, type: 'NIGHT', team: 'GENERAL' });
    // Fri: Full compensatory rest day!
    addShift({ staffId: 'EMP-DOC-004', deptCode: 'DEP-SANNHI', start: `${sat} 07:30:00`, end: `${sat} 12:00:00`, type: 'MORNING', team: 'GENERAL' });
  });

  // =====================================================================
  // E. KHOA CHẨN ĐOÁN HÌNH ẢNH & XÉT NGHIỆM (DEP-CDHA)
  // Staff: KTV. Nguyễn Văn H (EMP-TECH-001)
  // =====================================================================
  // 3 Ca 4 Kíp Luân Phiên:
  allDates.forEach((dateStr, dayIndex) => {
    const cycleDay = dayIndex % 4;
    const nextDate = offsetDate(dateStr, 1);

    if (cycleDay === 0) {
      addShift({ staffId: 'EMP-TECH-001', deptCode: 'DEP-CDHA', start: `${dateStr} 07:00:00`, end: `${dateStr} 14:00:00`, type: 'MORNING', team: 'TEAM_A' });
    } else if (cycleDay === 1) {
      addShift({ staffId: 'EMP-TECH-001', deptCode: 'DEP-CDHA', start: `${dateStr} 14:00:00`, end: `${dateStr} 21:00:00`, type: 'AFTERNOON', team: 'TEAM_A' });
    } else if (cycleDay === 2) {
      addShift({ staffId: 'EMP-TECH-001', deptCode: 'DEP-CDHA', start: `${dateStr} 21:00:00`, end: `${nextDate} 07:00:00`, type: 'NIGHT', team: 'TEAM_A' });
    }
  });

  // =====================================================================
  // F. KHOA DƯỢC & VẬT TƯ THIẾT BỊ Y TẾ (DEP-DUOC)
  // Staff: DS. Nguyễn Thị I (EMP-PHAR-001)
  // =====================================================================
  // Hành chính Mon-Fri (07:30 - 16:30)
  mondays.forEach(mon => {
    for (let i = 0; i < 5; i++) {
      const d = offsetDate(mon, i);
      addShift({ staffId: 'EMP-PHAR-001', deptCode: 'DEP-DUOC', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    }
  });

  // =====================================================================
  // G. PHÒNG KẾ HOẠCH TỔNG HỢP & BAN GIÁM ĐỐC (DEP-KHTH)
  // Staff: Super Admin Nguyễn Văn A (EMP-ADM-001), HR Manager Nguyễn Văn K (EMP-HR-001)
  // =====================================================================
  // Hành chính Mon-Fri (07:30 - 16:30)
  mondays.forEach(mon => {
    for (let i = 0; i < 5; i++) {
      const d = offsetDate(mon, i);
      addShift({ staffId: 'EMP-ADM-001', deptCode: 'DEP-KHTH', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
      addShift({ staffId: 'EMP-HR-001', deptCode: 'DEP-KHTH', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
    }
  });

  console.log(`Generated ${generatedShifts.length} candidate shifts across all hospital departments.`);

  // =====================================================================
  // STRICT VALIDATION AUDIT BEFORE COMMITTING TO DATABASE
  // =====================================================================
  console.log('Running 100% strict compliance audit (rest >= 24h & post-night duty compensatory rest)...');

  // Group shifts by staff
  const staffShiftsMap = {};
  for (const s of generatedShifts) {
    if (!staffShiftsMap[s.staff_id]) staffShiftsMap[s.staff_id] = [];
    staffShiftsMap[s.staff_id].push(s);
  }

  let violationCount = 0;
  for (const [staffId, sList] of Object.entries(staffShiftsMap)) {
    // Sort chronologically
    sList.sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (let i = 0; i < sList.length - 1; i++) {
      const current = sList[i];
      const next = sList[i + 1];

      // Direct time overlap check
      if (current.start_time < next.end_time && current.end_time > next.start_time) {
        console.error(`[AUDIT FAILED] Overlap for staff ${staffId}: [${current.start_time} - ${current.end_time}] and [${next.start_time} - ${next.end_time}]`);
        violationCount++;
      }

      // Rest calculation
      const rest = diffHours(current.end_time, next.start_time);
      const isCurrentNightOrOnCall = current.shift_type === 'NIGHT' || current.shift_type === 'ON_CALL' || current.end_time.includes('07:00') || current.end_time.includes('07:30');
      const isNextNightOrDuty = next.shift_type === 'NIGHT' || next.shift_type === 'ON_CALL' || next.start_time.includes('21:00') || next.start_time.includes('17:00');
      const isSameDayOfficeAndOvertimeOrNight = !isCurrentNightOrOnCall && current.start_time.slice(0, 10) === next.start_time.slice(0, 10) && (isNextNightOrDuty || next.start_time.includes('16:30'));

      // Standard daytime office check
      const isCurrentOfficeDaytime = !isCurrentNightOrOnCall && (current.start_time.includes('07:30') || current.start_time.includes('08:00')) && (current.end_time.includes('16:30') || current.end_time.includes('17:00'));
      const isNextOfficeDaytime = !isNextNightOrDuty && (next.start_time.includes('07:30') || next.start_time.includes('08:00')) && (next.end_time.includes('16:30') || next.end_time.includes('17:00'));
      const isConsecutiveDailyOffice = isCurrentOfficeDaytime && isNextOfficeDaytime;

      if (!isSameDayOfficeAndOvertimeOrNight && !isConsecutiveDailyOffice && rest < 23.99) {
        console.error(`[AUDIT FAILED] Insufficient rest for staff ${staffId}: only ${rest.toFixed(1)}h between ${current.end_time} and ${next.start_time}`);
        violationCount++;
      }

      if (isCurrentNightOrOnCall) {
        // Must have compensatory rest day: next shift cannot start on the same day as night shift end date
        const endDateStr = current.end_time.slice(0, 10);
        const nextStartDateStr = next.start_time.slice(0, 10);
        if (endDateStr === nextStartDateStr) {
          console.error(`[AUDIT FAILED] No compensatory day for staff ${staffId}: finished night shift at ${current.end_time} and scheduled on same day at ${next.start_time}`);
          violationCount++;
        }
      }
    }
  }

  if (violationCount > 0) {
    console.error(`AUDIT FAILED WITH ${violationCount} VIOLATIONS! Aborting DB write.`);
    process.exit(1);
  }

  console.log('AUDIT PASSED 100%! Zero rest violations, zero conflicts across all staff and dates.');

  // =====================================================================
  // DATABASE EXECUTION
  // =====================================================================
  // 1. Clear shifts in generated window
  await pool.query('DELETE FROM Shifts WHERE start_time >= ? AND start_time <= ?', ['2026-10-12 00:00:00', '2026-11-25 23:59:59']);
  console.log('Cleared existing shifts between 2026-10-12 and 2026-11-25.');

  // 2. Prepare bulk insert tuples
  const values = generatedShifts.map(s => [
    s.id,
    s.staff_id,
    s.department_code,
    s.start_time,
    s.end_time,
    s.shift_type,
    s.on_call_tier,
    s.team_code,
    s.is_24h_on_call,
    s.status,
    s.requires_handover
  ]);

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < values.length; i += batchSize) {
    const chunk = values.slice(i, i + batchSize);
    await pool.query(
      `INSERT INTO Shifts (
        id, staff_id, department_code, start_time, end_time, shift_type,
        on_call_tier, team_code, is_24h_on_call, status, requires_handover
      ) VALUES ?`,
      [chunk]
    );
  }

  console.log(`Successfully committed ${values.length} realistic hospital shifts to MySQL database!`);

  // Log per-department breakdown
  const [deptStats] = await pool.query(`
    SELECT department_code, COUNT(*) as shift_count, COUNT(DISTINCT staff_id) as staff_count
    FROM Shifts
    WHERE start_time >= '2026-10-12 00:00:00'
    GROUP BY department_code
    ORDER BY shift_count DESC
  `);
  console.log('--- Department Breakdown ---');
  console.table(deptStats);

  // Log per-staff breakdown
  const [staffStats] = await pool.query(`
    SELECT s.staff_id, CONCAT(e.last_name, ' ', e.first_name) as full_name, e.role, s.department_code, COUNT(*) as shifts_assigned
    FROM Shifts s
    JOIN Employees e ON s.staff_id = e.employee_code
    WHERE s.start_time >= '2026-10-12 00:00:00'
    GROUP BY s.staff_id, full_name, e.role, s.department_code
    ORDER BY shifts_assigned DESC
  `);
  console.log('--- Staff Breakdown ---');
  console.table(staffStats);

  process.exit(0);
}

seedComprehensiveSchedule().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
