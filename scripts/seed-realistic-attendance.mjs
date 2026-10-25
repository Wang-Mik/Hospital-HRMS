import pool from '../backend/src/db.js';
import { randomUUID } from 'crypto';

const HANDOVER_NOTES = {
  HSTC_DOC: [
    'Đã khám & hội chẩn hồi sức 14 BN nặng. BN Nguyễn V. (G04) sốc nhiễm khuẩn cải thiện tốt, liều Noradrenaline giảm còn 0.1 mcg/kg/p. Bàn giao máy thở Bennett 840.',
    'BN Trần T. (G02) đã rút ống nội khí quản, SpO2 duy trì 98% qua kính oxy 3L/p. Bàn giao theo dõi khí máu động mạch lúc 15:00.',
    'Hoàn tất cấp cứu ngưng tuần hoàn thành công cho BN chuyển từ tuyến dưới lúc 03:20, sinh hiệu tạm ổn định, huyết áp 110/70 mmHg.'
  ],
  HSTC_NUR: [
    'Hoàn tất thay băng buồng vô khuẩn, kiểm tra catheter tĩnh mạch trung tâm 6 người bệnh. Đã truyền kháng sinh Meropenem đúng y lệnh.',
    'Đã hút đờm qua nội khí quản, vỗ rung dẫn lưu tư thế cho 4 BN thở máy. Bàn giao bình oxy trung tâm áp lực 4.2 bar.',
    'Bàn giao 12 bơm tiêm điện và 6 máy truyền dịch hoạt động bình thường. Đã bù dịch Ringer Lactate đủ cơ số tủ trực.'
  ],
  NOI_DOC: [
    'Khám 26 lượt ngoại trú, xử trí 2 ca cơn đau thắt ngực ổn định. Chuyển phòng nội soi tiêu hóa 1 BN nghi ngờ xuất huyết tiêu hóa nhẹ.',
    'Bệnh nhân phòng 302 kiểm soát đường huyết ổn định (6.4 mmol/L). Đã dặn dò thân nhân chế độ ăn đái tháo đường và theo dõi huyết áp định kỳ.',
    'Hội chẩn cùng chuyên khoa Tim mạch cho BN cao tuổi suy tim độ III phòng 308, thống nhất phác đồ lợi tiểu quai.'
  ],
  NOI_NUR: [
    'Đã phát thuốc và đo dấu hiệu sinh tồn buổi sáng cho toàn bộ 22 bệnh nhân phòng bệnh 301-306. Sinh hiệu tất cả ổn định.',
    'Hoàn tất tiêm Insulin dưới da trước bữa ăn cho 8 bệnh nhân đái tháo đường khoa Nội. Bàn giao danh sách xét nghiệm máu sáng mai.',
    'Đã hướng dẫn giáo dục sức khỏe cho 5 bệnh nhân chuẩn bị xuất viện chiều nay, hồ sơ bệnh án đã hoàn thiện.'
  ],
  NGOAI_DOC: [
    'Hoàn thành 2 ca phẫu thuật nội soi viêm ruột thừa cấp và khâu nối gân gấp cổ tay. Bệnh nhân hậu phẫu tỉnh táo, đã chuyển về phòng hồi tỉnh.',
    'Thực hiện ca phẫu thuật kết hợp xương đùi kín dưới C-Arm cho BN nam 45 tuổi. Mạch mu chân bắt rõ, sinh hiệu ổn định.',
    'Khám tiền phẫu cho 4 ca mổ phiên ngày mai (2 ca cắt túi mật nội soi, 2 ca thoát vị bẹn). Bệnh nhân đủ điều kiện gây mê.'
  ],
  NGOAI_NUR: [
    'Chuẩn bị đầy đủ bàn mổ vô khuẩn và dụng cụ nội soi cho 3 ca phẫu thuật chương trình. Đếm gạc và dụng cụ chính xác 100%.',
    'Chăm sóc vết mổ và thay băng dẫn lưu cho 14 bệnh nhân hậu phẫu khoa Ngoại. Không phát hiện dấu hiệu nhiễm trùng vết mổ.',
    'Bàn giao phòng mổ số 3 đã khử khuẩn bằng tia cực tím và dung dịch Surfanios, sẵn sàng đón ca mổ cấp cứu.'
  ],
  SANNHI_DOC: [
    'Đỡ đẻ an toàn 3 ca chuyển dạ tự nhiên, 2 bé trai và 1 bé gái chỉ số Apgar 9/10 điểm. 1 ca theo dõi dọa sinh non phòng 204.',
    'Khám sàng lọc sơ sinh và siêu âm kiểm tra tử cung sau sinh cho 8 sản phụ buồng hậu sản. Tất cả co hồi tử cung tốt.',
    'Thực hiện mổ lấy thai cấp cứu do suy thai cấp lúc 04:15, mẹ tròn con vuông, bé gái 3.2kg khóc to ngay sau sinh.'
  ],
  SANNHI_NUR: [
    'Đã tắm bé, tiêm Vitamin K1 và vắc-xin Viêm gan B sơ sinh cho 8 bé buồng dưỡng nhi. Bàn giao bình ủ ấm và máy hút nhớt.',
    'Hướng dẫn cho 6 sản phụ tập cho con bú sớm bằng sữa mẹ hoàn toàn. Bàn giao máy theo dõi tim thai Doppler cầm tay.',
    'Theo dõi sát dấu hiệu vàng da sơ sinh cho bé phòng 206, chỉ số Bilirubin qua da trong giới hạn an toàn.'
  ],
  CDHA: [
    'Thực hiện chụp và đọc 42 phim X-quang kỹ thuật số, 16 ca CT sọ não và ngực. Phát hiện 1 ca nhồi máu não diện rộng đã báo ngay cho Khoa Cấp Cứu.',
    'Hoàn tất 28 ca siêu âm ổ bụng tổng quát và siêu âm Doppler mạch máu chi dưới. Bàn giao máy siêu âm GE Voluson E8.',
    'Chụp MRI cột sống thắt lưng cho 6 bệnh nhân ngoại trú. Hệ thống máy cộng hưởng từ 1.5 Tesla vận hành ổn định.'
  ],
  DUOC: [
    'Đối soát và cấp phát 180 lượt thuốc BHYT ngoại trú, cấp phát cơ số tủ thuốc cấp cứu cho Khoa Hồi Sức Tích Cực và Khoa Ngoại.',
    'Nhập kho 45 danh mục kháng sinh thế hệ mới và dịch truyền tĩnh mạch. Nhiệt độ kho lạnh bảo quản vắc-xin đạt chuẩn 4-6°C.',
    'Kiểm kê hạn dùng thuốc gây nghiện và hướng thần tại tủ trực khoa Dược, khớp 100% sổ sách và phần mềm quản lý.'
  ],
  KHTH: [
    'Rà soát lịch trực lâm sàng tuần 43 cho toàn viện, xử lý 3 đơn xin đổi ca và cập nhật hồ sơ CCHN cán bộ mới bổ nhiệm.',
    'Tổng hợp số liệu báo cáo giao ban viện sáng thứ 2: 124 bệnh nhân nội trú, công suất sử dụng giường bệnh đạt 92%.',
    'Hoàn thiện hồ sơ thẩm định danh mục kỹ thuật mới gửi Sở Y Tế phê duyệt, chuẩn bị lịch kiểm tra chất lượng bệnh viện định kỳ.'
  ]
};

function getNote(role, deptCode) {
  let list = HANDOVER_NOTES.KHTH;
  if (deptCode === 'DEP-HSTC') {
    list = (role === 'DOCTOR' || role === 'DEPARTMENT_HEAD') ? HANDOVER_NOTES.HSTC_DOC : HANDOVER_NOTES.HSTC_NUR;
  } else if (deptCode === 'DEP-NOI') {
    list = (role === 'DOCTOR' || role === 'DEPARTMENT_HEAD') ? HANDOVER_NOTES.NOI_DOC : HANDOVER_NOTES.NOI_NUR;
  } else if (deptCode === 'DEP-NGOAI') {
    list = (role === 'DOCTOR' || role === 'DEPARTMENT_HEAD') ? HANDOVER_NOTES.NGOAI_DOC : HANDOVER_NOTES.NGOAI_NUR;
  } else if (deptCode === 'DEP-SANNHI') {
    list = (role === 'DOCTOR' || role === 'DEPARTMENT_HEAD') ? HANDOVER_NOTES.SANNHI_DOC : HANDOVER_NOTES.SANNHI_NUR;
  } else if (deptCode === 'DEP-CDHA') {
    list = HANDOVER_NOTES.CDHA;
  } else if (deptCode === 'DEP-DUOC') {
    list = HANDOVER_NOTES.DUOC;
  } else {
    list = HANDOVER_NOTES.KHTH;
  }
  return list[Math.floor(Math.random() * list.length)];
}

function adjustMinutes(dateStr, minutesDelta) {
  const dt = new Date(dateStr.replace(' ', 'T'));
  dt.setMinutes(dt.getMinutes() + minutesDelta);
  const pad = (n) => String(n).padStart(2, '0');
  const y = dt.getFullYear();
  const m = pad(dt.getMonth() + 1);
  const d = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mm = pad(dt.getMinutes());
  const ss = pad(dt.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

async function seedRealisticAttendance() {
  console.log('===================================================================');
  console.log(' SEEDING REALISTIC ATTENDANCE RECORDS FOR CURRENT WEEK (OCT 19 - OCT 25)');
  console.log('===================================================================');

  // 1. Clear obsolete historical attendance records
  console.log('Clearing old attendance records...');
  await pool.query('DELETE FROM Attendances');

  // 2. Fetch shifts for the current week: Oct 19 - Oct 25, 2026
  const [shifts] = await pool.query(`
    SELECT s.id AS shift_id, s.staff_id, s.department_code, s.start_time, s.end_time, s.shift_type, s.on_call_tier, s.status,
           e.role, e.specialty, e.first_name, e.last_name
    FROM Shifts s
    JOIN Employees e ON s.staff_id = e.employee_code
    WHERE s.start_time >= '2026-10-19 00:00:00' AND s.start_time <= '2026-10-25 23:59:59'
    ORDER BY s.start_time ASC, s.staff_id ASC
  `);

  console.log(`Found ${shifts.length} shifts scheduled for current week.`);

  const methods = ['BIOMETRIC', 'BIOMETRIC', 'BIOMETRIC', 'RFID_CARD', 'RFID_CARD', 'KIOSK_TERMINAL'];
  let insertedCount = 0;
  let activeTodayCount = 0;

  for (const s of shifts) {
    const startStr = typeof s.start_time === 'string' ? s.start_time : s.start_time.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = typeof s.end_time === 'string' ? s.end_time : s.end_time.toISOString().slice(0, 19).replace('T', ' ');
    const isToday = startStr.startsWith('2026-10-25');
    const isMorningToday = isToday && (startStr.includes('07:00') || startStr.includes('07:30'));
    const isAfternoonToday = isToday && startStr.includes('14:00');
    const isNightToday = isToday && (startStr.includes('21:00') || startStr.includes('17:00'));

    const method = methods[Math.floor(Math.random() * methods.length)];

    if (isNightToday) {
      // Future shift tonight - keep as SCHEDULED, no attendance yet
      await pool.query('UPDATE Shifts SET status = ? WHERE id = ?', ['SCHEDULED', s.shift_id]);
      continue;
    }

    if (isMorningToday || isAfternoonToday) {
      // Current active shift right now (Oct 25):
      // Clock in was ~6-12 mins before start time
      const clockInDelta = -(Math.floor(Math.random() * 8) + 6); // e.g. 13:48 - 13:54
      const clockInTime = adjustMinutes(startStr, clockInDelta);
      const status = 'PRESENT';

      await pool.query(`
        INSERT INTO Attendances (id, shift_id, staff_id, clock_in_time, clock_out_time, clock_in_method, attendance_status, overtime_minutes, handover_notes)
        VALUES (?, ?, ?, ?, NULL, ?, ?, 0, NULL)
      `, [randomUUID(), s.shift_id, s.staff_id, clockInTime, method, status]);

      await pool.query('UPDATE Shifts SET status = ? WHERE id = ?', ['IN_PROGRESS', s.shift_id]);
      insertedCount++;
      activeTodayCount++;
      continue;
    }

    // Past completed shifts (Oct 19 - Oct 24, plus night shift ending Oct 25 morning)
    const isLate = Math.random() < 0.08; // 8% chance of being late
    const clockInDelta = isLate ? Math.floor(Math.random() * 12) + 16 : -(Math.floor(Math.random() * 14) + 3);
    const clockInTime = adjustMinutes(startStr, clockInDelta);

    const hasOvertime = Math.random() < 0.18; // 18% emergency overtime
    const otMinutes = hasOvertime ? (Math.floor(Math.random() * 5) + 3) * 15 : 0; // 45, 60, 75, 90, 105 mins
    const clockOutDelta = (Math.floor(Math.random() * 10) + 5) + otMinutes;
    const clockOutTime = adjustMinutes(endStr, clockOutDelta);

    let status = 'PRESENT';
    if (isLate) status = 'LATE';
    else if (otMinutes > 0) status = 'OVERTIME';

    const notes = getNote(s.role, s.department_code);

    await pool.query(`
      INSERT INTO Attendances (id, shift_id, staff_id, clock_in_time, clock_out_time, clock_in_method, attendance_status, overtime_minutes, handover_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [randomUUID(), s.shift_id, s.staff_id, clockInTime, clockOutTime, method, status, otMinutes, notes]);

    await pool.query('UPDATE Shifts SET status = ? WHERE id = ?', ['COMPLETED', s.shift_id]);
    insertedCount++;
  }

  console.log(`Successfully seeded ${insertedCount} realistic attendance records!`);
  console.log(`Active shifts on duty right now: ${activeTodayCount}`);
  process.exit(0);
}

seedRealisticAttendance().catch((err) => {
  console.error('Seeding attendance failed:', err);
  process.exit(1);
});
