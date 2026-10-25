import mysql from 'mysql2/promise';
import localPool from '../backend/src/db.js';

async function syncToTiDBCloud() {
  console.log('====================================================');
  console.log(' SYNCHRONIZING LOCAL DATA TO TIDB CLOUD DATABASE');
  console.log('====================================================');

  const cloudConn = await mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '3RudpjDsQ3n2ty4.root',
    password: 'Ps24s7QdFmqEWw1X',
    database: 'hrm_db',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
  });

  console.log('Connected to TiDB Cloud successfully.');

  // 1. Sync Departments
  console.log('\n--- 1. Syncing Departments ---');
  const [localDepartments] = await localPool.query('SELECT * FROM Departments');
  console.log(`Found ${localDepartments.length} departments in local MySQL.`);

  for (const dept of localDepartments) {
    await cloudConn.query(`
      INSERT INTO Departments (id, department_code, name, description, location, status)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        location = VALUES(location),
        status = VALUES(status)
    `, [dept.id, dept.department_code, dept.name, dept.description || null, dept.location || null, dept.status || 'ACTIVE']);
  }
  console.log(`Synced ${localDepartments.length} departments to TiDB Cloud.`);

  // 2. Sync Employees
  console.log('\n--- 2. Syncing Employees ---');
  const [localEmployees] = await localPool.query('SELECT * FROM Employees');
  console.log(`Found ${localEmployees.length} employees in local MySQL.`);

  for (const emp of localEmployees) {
    const fields = [
      emp.id,
      emp.employee_code,
      emp.first_name,
      emp.last_name,
      emp.email || `${emp.employee_code.toLowerCase()}@hospital.vn`,
      emp.phone || null,
      emp.department_code,
      emp.role,
      emp.specialty || null,
      emp.status || 'ACTIVE',
      emp.hire_date || '2020-01-01'
    ];

    await cloudConn.query(`
      INSERT INTO Employees (
        id, employee_code, first_name, last_name, email, phone,
        department_code, role, specialty, status, hire_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        email = VALUES(email),
        phone = VALUES(phone),
        department_code = VALUES(department_code),
        role = VALUES(role),
        specialty = VALUES(specialty),
        status = VALUES(status)
    `, fields);
  }
  console.log(`Synced ${localEmployees.length} employees to TiDB Cloud.`);

  // 3. Sync Shifts
  console.log('\n--- 3. Syncing Shifts ---');
  const [localShifts] = await localPool.query('SELECT * FROM Shifts ORDER BY start_time ASC');
  console.log(`Found ${localShifts.length} shifts in local MySQL.`);

  // Clear existing shifts on TiDB Cloud
  await cloudConn.query('DELETE FROM Shifts');

  const shiftBatchSize = 100;
  for (let i = 0; i < localShifts.length; i += shiftBatchSize) {
    const batch = localShifts.slice(i, i + shiftBatchSize);
    const values = batch.map(s => [
      s.id,
      s.staff_id,
      s.department_code,
      typeof s.start_time === 'string' ? s.start_time : s.start_time.toISOString().slice(0, 19).replace('T', ' '),
      typeof s.end_time === 'string' ? s.end_time : s.end_time.toISOString().slice(0, 19).replace('T', ' '),
      s.shift_type,
      s.on_call_tier || 'TIER_1',
      s.team_code || null,
      s.is_24h_on_call ? 1 : 0,
      s.status || 'SCHEDULED',
      s.requires_handover ? 1 : 0
    ]);

    await cloudConn.query(`
      INSERT INTO Shifts (
        id, staff_id, department_code, start_time, end_time, shift_type,
        on_call_tier, team_code, is_24h_on_call, status, requires_handover
      ) VALUES ?
    `, [values]);
  }
  console.log(`Inserted ${localShifts.length} shifts to TiDB Cloud.`);

  // 4. Sync Attendances
  console.log('\n--- 4. Syncing Attendances ---');
  const [localAttendances] = await localPool.query('SELECT * FROM Attendances ORDER BY clock_in_time ASC');
  console.log(`Found ${localAttendances.length} attendances in local MySQL.`);

  await cloudConn.query('DELETE FROM Attendances');

  if (localAttendances.length > 0) {
    const attValues = localAttendances.map(a => [
      a.id,
      a.shift_id,
      a.staff_id,
      typeof a.clock_in_time === 'string' ? a.clock_in_time : a.clock_in_time.toISOString().slice(0, 19).replace('T', ' '),
      a.clock_out_time ? (typeof a.clock_out_time === 'string' ? a.clock_out_time : a.clock_out_time.toISOString().slice(0, 19).replace('T', ' ')) : null,
      a.clock_in_method || 'BIOMETRIC',
      a.attendance_status || 'PRESENT',
      a.overtime_minutes || 0,
      a.handover_notes || null
    ]);

    await cloudConn.query(`
      INSERT INTO Attendances (
        id, shift_id, staff_id, clock_in_time, clock_out_time,
        clock_in_method, attendance_status, overtime_minutes, handover_notes
      ) VALUES ?
    `, [attValues]);
  }
  console.log(`Inserted ${localAttendances.length} attendance records to TiDB Cloud.`);

  // 5. Verify Final Counts
  const [finalDept] = await cloudConn.query('SELECT count(*) as count FROM Departments');
  const [finalEmp] = await cloudConn.query('SELECT count(*) as count FROM Employees');
  const [finalShifts] = await cloudConn.query('SELECT count(*) as count FROM Shifts');
  const [finalAtt] = await cloudConn.query('SELECT count(*) as count FROM Attendances');

  console.log('\n====================================================');
  console.log(' VERIFICATION ON TIDB CLOUD:');
  console.log(' Departments:', finalDept[0].count);
  console.log(' Employees:', finalEmp[0].count);
  console.log(' Shifts:', finalShifts[0].count);
  console.log(' Attendances:', finalAtt[0].count);
  console.log('====================================================');

  await cloudConn.end();
  console.log('\nSuccessfully synchronized online database to TiDB Cloud!');
  process.exit(0);
}

syncToTiDBCloud().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
