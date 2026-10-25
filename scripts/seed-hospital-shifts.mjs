import pool from '../backend/src/db.js';
import { randomUUID } from 'crypto';

async function seedHospitalData() {
  console.log('--- Seeding Realistic Clinical Hospital Roster ---');

  const newStaff = [
    { code: 'EMP-DOC-005', first: 'Hoàng Long', last: 'Lê', role: 'DOCTOR', dept: 'DEP-HSTC', spec: 'Hồi Sức Cấp Cứu' },
    { code: 'EMP-DOC-006', first: 'Minh Tuấn', last: 'Trần', role: 'DOCTOR', dept: 'DEP-NGOAI', spec: 'Phẫu Thuật Ngoại Khoa' },
    { code: 'EMP-DOC-007', first: 'Đức Anh', last: 'Hoàng', role: 'DOCTOR', dept: 'DEP-NOI', spec: 'Nội Tim Mạch' },
    { code: 'EMP-NUR-003', first: 'Thị Mai', last: 'Phạm', role: 'NURSE', dept: 'DEP-HSTC', spec: 'Điều Dưỡng Trưởng' },
    { code: 'EMP-NUR-004', first: 'Thùy Linh', last: 'Vũ', role: 'NURSE', dept: 'DEP-HSTC', spec: 'Điều Dưỡng Cấp Cứu' },
    { code: 'EMP-NUR-005', first: 'Thu Trang', last: 'Đỗ', role: 'NURSE', dept: 'DEP-NOI', spec: 'Điều Dưỡng Nội Khoa' }
  ];

  for (const s of newStaff) {
    const [exist] = await pool.query('SELECT employee_code FROM Employees WHERE employee_code = ?', [s.code]);
    if (exist.length === 0) {
      await pool.query(
        'INSERT INTO Employees (employee_code, first_name, last_name, role, department_code, specialty, email, status, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.code, s.first, s.last, s.role, s.dept, s.spec, s.code.toLowerCase() + '@benhvien.vn', 'ACTIVE', '2024-01-15']
      );
      console.log('Created Employee:', s.code, s.last, s.first);
    }
  }

  // Clear shifts in range Oct 15 - Nov 15
  await pool.query('DELETE FROM Shifts WHERE start_time >= ? AND start_time <= ?', ['2026-10-15 00:00:00', '2026-11-15 23:59:59']);
  console.log('Cleaned Shifts between 2026-10-15 and 2026-11-15.');

  const shiftsToInsert = [];

  // Helper to add shift
  function addShift({ staffId, deptCode, start, end, type, tier = 'CLINICAL', team = 'GENERAL', is24h = 0, status = 'SCHEDULED' }) {
    shiftsToInsert.push([
      randomUUID(),
      staffId,
      deptCode,
      start,
      end,
      type,
      tier,
      team,
      is24h,
      status,
      1
    ]);
  }

  // Dates for Week 42 (Current Week: Oct 19 - Oct 25)
  // Mon: 2026-10-19, Tue: 2026-10-20, Wed: 2026-10-21, Thu: 2026-10-22 (TODAY), Fri: 2026-10-23, Sat: 2026-10-24, Sun: 2026-10-25
  const week42 = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];

  // 1. DR. NGUYỄN VĂN B (Trưởng Khoa HSTC - EMP-DOC-001)
  // Mon, Tue, Thu, Fri: Khám Hành Chính (07:30 - 16:30)
  ['2026-10-19', '2026-10-20', '2026-10-22', '2026-10-23'].forEach(d => {
    addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING', tier: 'CLINICAL', team: 'GENERAL' });
  });
  // Wed: Trực Lãnh Đạo Viện (16:30 - 07:30 ngày hôm sau)
  addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: '2026-10-21 16:30:00', end: '2026-10-22 07:30:00', type: 'ON_CALL', tier: 'LEADERSHIP', team: 'GENERAL' });
  // Sat: Khám Ngoài Giờ (16:30 - 20:00)
  addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: '2026-10-24 16:30:00', end: '2026-10-24 20:00:00', type: 'AFTERNOON', tier: 'CLINICAL', team: 'GENERAL' });

  // 2. DR. LÊ HOÀNG LONG (Bác sĩ HSTC - EMP-DOC-005)
  // Mon: Ca 1 Sáng (07:00 - 14:00)
  addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: '2026-10-19 07:00:00', end: '2026-10-19 14:00:00', type: 'MORNING', team: 'TEAM_A' });
  // Tue: Ca 2 Chiều (14:00 - 21:00)
  addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: '2026-10-20 14:00:00', end: '2026-10-20 21:00:00', type: 'AFTERNOON', team: 'TEAM_A' });
  // Wed: Ca 3 Trực Đêm (21:00 - 07:00 hôm sau)
  addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: '2026-10-21 21:00:00', end: '2026-10-22 07:00:00', type: 'NIGHT', team: 'TEAM_A' });
  // Thu: Nghỉ hồi sức
  // Fri: Khám Hành Chính (07:30 - 16:30)
  addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: '2026-10-23 07:30:00', end: '2026-10-23 16:30:00', type: 'MORNING', team: 'GENERAL' });
  // Sun: Ca 3 Trực Đêm (21:00 - 07:00)
  addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: '2026-10-25 21:00:00', end: '2026-10-26 07:00:00', type: 'NIGHT', team: 'TEAM_A' });

  // 3. ĐD. PHẠM THỊ MAI (Điều dưỡng trưởng HSTC - EMP-NUR-003)
  // Mon - Fri: Khám Hành Chính & Quản lý buồng bệnh (07:30 - 16:30)
  ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].forEach(d => {
    addShift({ staffId: 'EMP-NUR-003', deptCode: 'DEP-HSTC', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
  });

  // 4. ĐD. NGUYỄN VĂN F (Điều dưỡng viên HSTC - EMP-NUR-001)
  // Mon: Ca 2 Chiều (14:00 - 21:00)
  addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: '2026-10-19 14:00:00', end: '2026-10-19 21:00:00', type: 'AFTERNOON', team: 'TEAM_B' });
  // Tue: Ca 3 Trực Đêm (21:00 - 07:00)
  addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: '2026-10-20 21:00:00', end: '2026-10-21 07:00:00', type: 'NIGHT', team: 'TEAM_B' });
  // Thu: Ca 1 Sáng (07:00 - 14:00)
  addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: '2026-10-22 07:00:00', end: '2026-10-22 14:00:00', type: 'MORNING', team: 'TEAM_B' });
  // Fri: Ca 2 Chiều (14:00 - 21:00)
  addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: '2026-10-23 14:00:00', end: '2026-10-23 21:00:00', type: 'AFTERNOON', team: 'TEAM_B' });
  // Sat: Ca 3 Trực Đêm (21:00 - 07:00)
  addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: '2026-10-24 21:00:00', end: '2026-10-25 07:00:00', type: 'NIGHT', team: 'TEAM_B' });

  // 5. ĐD. VŨ THÙY LINH (Điều dưỡng Cấp Cứu - EMP-NUR-004)
  // Mon: Ca 3 Trực Đêm (21:00 - 07:00)
  addShift({ staffId: 'EMP-NUR-004', deptCode: 'DEP-HSTC', start: '2026-10-19 21:00:00', end: '2026-10-20 07:00:00', type: 'NIGHT', team: 'TEAM_C' });
  // Wed: Ca 1 Sáng (07:00 - 14:00)
  addShift({ staffId: 'EMP-NUR-004', deptCode: 'DEP-HSTC', start: '2026-10-21 07:00:00', end: '2026-10-21 14:00:00', type: 'MORNING', team: 'TEAM_C' });
  // Thu: Ca 2 Chiều (14:00 - 21:00)
  addShift({ staffId: 'EMP-NUR-004', deptCode: 'DEP-HSTC', start: '2026-10-22 14:00:00', end: '2026-10-22 21:00:00', type: 'AFTERNOON', team: 'TEAM_C' });
  // Fri: Ca 3 Trực Đêm (21:00 - 07:00)
  addShift({ staffId: 'EMP-NUR-004', deptCode: 'DEP-HSTC', start: '2026-10-23 21:00:00', end: '2026-10-24 07:00:00', type: 'NIGHT', team: 'TEAM_C' });
  // Sun: Ca 1 Sáng (07:00 - 14:00)
  addShift({ staffId: 'EMP-NUR-004', deptCode: 'DEP-HSTC', start: '2026-10-25 07:00:00', end: '2026-10-25 14:00:00', type: 'MORNING', team: 'TEAM_C' });

  // 6. KHOA NỘI TỔNG HỢP (DEP-NOI)
  // BS. NGUYỄN THỊ C (EMP-DOC-002) - Khám HC Mon-Fri + Khám ngoài giờ Thứ 3 & Thứ 5
  ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].forEach(d => {
    addShift({ staffId: 'EMP-DOC-002', deptCode: 'DEP-NOI', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING', team: 'GENERAL' });
  });
  ['2026-10-20', '2026-10-22'].forEach(d => {
    addShift({ staffId: 'EMP-DOC-002', deptCode: 'DEP-NOI', start: `${d} 16:30:00`, end: `${d} 20:00:00`, type: 'AFTERNOON', team: 'GENERAL' });
  });

  // BS. HOÀNG ĐỨC ANH (EMP-DOC-007) - Ca trực khoa nội
  addShift({ staffId: 'EMP-DOC-007', deptCode: 'DEP-NOI', start: '2026-10-19 07:30:00', end: '2026-10-19 16:30:00', type: 'MORNING' });
  addShift({ staffId: 'EMP-DOC-007', deptCode: 'DEP-NOI', start: '2026-10-20 21:00:00', end: '2026-10-21 07:00:00', type: 'NIGHT' });
  addShift({ staffId: 'EMP-DOC-007', deptCode: 'DEP-NOI', start: '2026-10-22 07:30:00', end: '2026-10-22 16:30:00', type: 'MORNING' });
  addShift({ staffId: 'EMP-DOC-007', deptCode: 'DEP-NOI', start: '2026-10-24 21:00:00', end: '2026-10-25 07:00:00', type: 'NIGHT' });

  // ĐD. NGUYỄN THỊ G (EMP-NUR-002) & ĐD. ĐỖ THU TRANG (EMP-NUR-005)
  ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].forEach(d => {
    addShift({ staffId: 'EMP-NUR-002', deptCode: 'DEP-NOI', start: `${d} 07:00:00`, end: `${d} 14:00:00`, type: 'MORNING' });
    addShift({ staffId: 'EMP-NUR-005', deptCode: 'DEP-NOI', start: `${d} 14:00:00`, end: `${d} 21:00:00`, type: 'AFTERNOON' });
  });

  // 7. KHOA NGOẠI (DEP-NGOAI)
  // BS. NGUYỄN VĂN D (EMP-DOC-003) & BS. TRẦN MINH TUẤN (EMP-DOC-006)
  ['2026-10-19', '2026-10-21', '2026-10-23'].forEach(d => {
    addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING' });
  });
  addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: '2026-10-20 21:00:00', end: '2026-10-21 07:00:00', type: 'NIGHT' });
  addShift({ staffId: 'EMP-DOC-003', deptCode: 'DEP-NGOAI', start: '2026-10-24 07:30:00', end: '2026-10-24 16:30:00', type: 'MORNING' });

  ['2026-10-20', '2026-10-22', '2026-10-24'].forEach(d => {
    addShift({ staffId: 'EMP-DOC-006', deptCode: 'DEP-NGOAI', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING' });
  });
  addShift({ staffId: 'EMP-DOC-006', deptCode: 'DEP-NGOAI', start: '2026-10-22 21:00:00', end: '2026-10-23 07:00:00', type: 'NIGHT' });

  // 8. TUẦN KẾ TIẾP (Week 43: 2026-10-26 to 2026-11-01) - Tự động tạo một số ca để test chuyển tuần
  ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'].forEach(d => {
    addShift({ staffId: 'EMP-DOC-001', deptCode: 'DEP-HSTC', start: `${d} 07:30:00`, end: `${d} 16:30:00`, type: 'MORNING' });
    addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: `${d} 14:00:00`, end: `${d} 21:00:00`, type: 'AFTERNOON' });
    addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: `${d} 07:00:00`, end: `${d} 14:00:00`, type: 'MORNING' });
  });
  addShift({ staffId: 'EMP-NUR-004', deptCode: 'DEP-HSTC', start: '2026-10-26 21:00:00', end: '2026-10-27 07:00:00', type: 'NIGHT' });
  addShift({ staffId: 'EMP-DOC-005', deptCode: 'DEP-HSTC', start: '2026-10-28 21:00:00', end: '2026-10-29 07:00:00', type: 'NIGHT' });
  addShift({ staffId: 'EMP-NUR-001', deptCode: 'DEP-HSTC', start: '2026-10-30 21:00:00', end: '2026-10-31 07:00:00', type: 'NIGHT' });

  console.log(`Inserting ${shiftsToInsert.length} realistic hospital shifts into database...`);

  const sql = `
    INSERT INTO Shifts (
      id, staff_id, department_code, start_time, end_time, shift_type,
      on_call_tier, team_code, is_24h_on_call, status, requires_handover
    ) VALUES ?
  `;

  await pool.query(sql, [shiftsToInsert]);
  console.log(`Successfully seeded ${shiftsToInsert.length} shifts across departments!`);
  process.exit(0);
}

seedHospitalData().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
