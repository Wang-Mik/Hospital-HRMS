import request from 'supertest';
import app from './app.js';
import pool, { testConnection } from './db.js';

async function testAllEndpointsLive() {
  console.log('======================================================================');
  console.log(' [LIVE ENDPOINT TESTS] Testing Monolithic Backend Endpoints on MySQL');
  console.log(' Database: hrm_db | User: admin');
  console.log('======================================================================\n');

  // Verify real DB connection
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('[-] Could not connect to MySQL database as admin:admin.');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  function assert(title, condition, extra = '') {
    if (condition) {
      console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${title} ${extra ? `(${extra})` : ''}`);
      passed++;
    } else {
      console.error(`  \x1b[31m✖ [FAIL]\x1b[0m ${title} ${extra ? `(${extra})` : ''}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // 1. Health & Database Probe
    // ------------------------------------------------------------------------
    console.log('\n--- [1. Health & System Probe] ---');
    const healthRes = await request(app).get('/health');
    assert('GET /health returns 200 UP', healthRes.status === 200 && healthRes.body.status === 'UP');
    assert('GET /health confirms connected DB name', healthRes.body.database?.name === 'hrm_db');

    const swaggerRes = await request(app).get('/api-docs.json');
    assert('GET /api-docs.json returns OpenAPI 3.0 spec', swaggerRes.status === 200 && swaggerRes.body.openapi === '3.0.0');

    // ------------------------------------------------------------------------
    // 1.1 Departments Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [1.1 Departments Endpoints] ---');
    const getDeptsRes = await request(app).get('/api/departments');
    assert('GET /api/departments returns 200 with list of departments', getDeptsRes.status === 200 && getDeptsRes.body.data.length >= 5);
    const firstDept = getDeptsRes.body.data[0];
    assert('GET /api/departments department contains department_code', typeof firstDept.department_code === 'string');

    const getSingleDeptRes = await request(app).get(`/api/departments/${firstDept.department_code}`);
    assert('GET /api/departments/:code returns 200 single department', getSingleDeptRes.status === 200 && getSingleDeptRes.body.data.department_code === firstDept.department_code);

    // ------------------------------------------------------------------------
    // 2. Core HR & Employees Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [2. Core HR & Employee Credentialing Endpoints] ---');
    const getEmpRes = await request(app).get('/api/employees/1');
    assert('GET /api/employees/1 returns 200 with seed employee', getEmpRes.status === 200 && getEmpRes.body.data.employee_code === 'EMP-DOC-001');
    assert('GET /api/employees/1 returns department_code and department_name', Boolean(getEmpRes.body.data.department_code && getEmpRes.body.data.department_name));
    assert('GET /api/employees/1 returns active medical licenses array', Array.isArray(getEmpRes.body.data.active_medical_licenses));

    const testStaffId = `EMP-TEST-${Date.now().toString().slice(-4)}`;
    const testEmail = `test.doctor.${Date.now()}@hospital.org`;

    const createEmpRes = await request(app)
      .post('/api/employees')
      .send({
        employee_code: testStaffId,
        first_name: 'Jonathan',
        last_name: 'Crane',
        email: testEmail,
        department_code: 'DEP-CAPCUU',
        role: 'DOCTOR',
        specialty: 'Trauma Surgery',
        medical_licenses: [
          {
            license_type: 'State Medical Board License (MD)',
            license_number: `MD-${Date.now().toString().slice(-6)}`,
            issuing_authority: 'State Board of Medicine',
            issue_date: '2022-01-01',
            expiration_date: '2028-12-31',
            verification_status: 'VERIFIED'
          }
        ]
      });

    assert('POST /api/employees creates employee with license and returns 201', createEmpRes.status === 201 && createEmpRes.body.success === true);
    const createdEmpId = createEmpRes.body.data.id;

    // Emergency Contacts
    const addContactRes = await request(app)
      .post(`/api/employees/${testStaffId}/emergency-contacts`)
      .send({
        contact_name: 'Mary Crane',
        relationship: 'Spouse',
        phone_number: '+1-555-9011'
      });
    assert('POST /api/employees/:staff_id/emergency-contacts returns 201', addContactRes.status === 201 && addContactRes.body.data.contact_name === 'Mary Crane');

    const getContactsRes = await request(app).get(`/api/employees/${testStaffId}/emergency-contacts`);
    assert('GET /api/employees/:staff_id/emergency-contacts returns 200 with contacts', getContactsRes.status === 200 && getContactsRes.body.data.length >= 1);

    // Documents
    const addDocRes = await request(app)
      .post(`/api/employees/${testStaffId}/documents`)
      .send({
        document_name: 'Board_Certification_Surgery.pdf',
        document_type: 'CERTIFICATE',
        file_url: 'https://storage.hospital-hrm.org/docs/surgery_cert.pdf'
      });
    assert('POST /api/employees/:staff_id/documents returns 201', addDocRes.status === 201 && addDocRes.body.data.document_type === 'CERTIFICATE');

    const getDocsRes = await request(app).get(`/api/employees/${testStaffId}/documents`);
    assert('GET /api/employees/:staff_id/documents returns 200 with documents', getDocsRes.status === 200 && getDocsRes.body.data.length >= 1);

    // ------------------------------------------------------------------------
    // 3. Shifts & Rostering Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [3. Shifts & Rostering Endpoints] ---');
    const scheduleShiftRes = await request(app)
      .post('/api/shifts')
      .send({
        staff_id: testStaffId,
        department_code: 'DEP-CAPCUU',
        start_time: '2026-08-25 07:00:00',
        end_time: '2026-08-25 15:00:00',
        shift_type: 'MORNING',
        requires_handover: true
      });

    assert('POST /api/shifts schedules shift and returns 201', scheduleShiftRes.status === 201 && scheduleShiftRes.body.success === true);
    assert('POST /api/shifts returns department_code and department_name', scheduleShiftRes.body.data.department_code === 'DEP-CAPCUU');
    const createdShiftId = scheduleShiftRes.body.data.id;

    // Shift Conflict Detection
    const conflictShiftRes = await request(app)
      .post('/api/shifts')
      .send({
        staff_id: testStaffId,
        department_id: 1,
        start_time: '2026-08-25 08:00:00',
        end_time: '2026-08-25 16:00:00',
        shift_type: 'MORNING'
      });
    assert('POST /api/shifts detects overlapping shift and returns 409 Conflict', conflictShiftRes.status === 409);

    const getShiftsRes = await request(app).get(`/api/shifts?staff_id=${testStaffId}`);
    assert('GET /api/shifts returns 200 with scheduled shifts', getShiftsRes.status === 200 && getShiftsRes.body.data.length >= 1);

    const getSingleShiftRes = await request(app).get(`/api/shifts/${createdShiftId}`);
    assert('GET /api/shifts/:id returns 200 single shift record', getSingleShiftRes.status === 200 && getSingleShiftRes.body.data.id === createdShiftId);

    // ------------------------------------------------------------------------
    // 4. Attendance & Clock-In/Out Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [4. Attendance & Clock-In/Out Endpoints] ---');
    const clockInRes = await request(app)
      .post('/api/attendance/clock-in')
      .send({
        staff_id: testStaffId,
        shift_id: createdShiftId,
        clock_in_method: 'BIOMETRIC',
        clock_in_time: '2026-08-25 06:55:00'
      });

    assert('POST /api/attendance/clock-in records clock-in and returns 201 PRESENT', clockInRes.status === 201 && clockInRes.body.data.attendance_status === 'PRESENT');
    const createdAttendanceId = clockInRes.body.data.id;

    // Active session duplicate prevention
    const dupClockInRes = await request(app)
      .post('/api/attendance/clock-in')
      .send({
        staff_id: testStaffId,
        shift_id: createdShiftId,
        clock_in_method: 'RFID_CARD'
      });
    assert('POST /api/attendance/clock-in prevents duplicate clock-in session (409 Conflict)', dupClockInRes.status === 409);

    // Clock Out with overtime
    const clockOutRes = await request(app)
      .post(`/api/attendance/${createdAttendanceId}/clock-out`)
      .send({
        clock_out_time: '2026-08-25 15:45:00',
        handover_notes: 'All trauma triage patients handed over to incoming shift.'
      });

    assert('POST /api/attendance/:id/clock-out records clock-out, calculates overtime and returns 200', clockOutRes.status === 200 && clockOutRes.body.data.overtime_minutes === 45);

    const getAttendanceRes = await request(app).get(`/api/attendance?staff_id=${testStaffId}`);
    assert('GET /api/attendance returns 200 with completed attendance records', getAttendanceRes.status === 200 && getAttendanceRes.body.data.length >= 1);

    // ------------------------------------------------------------------------
    // 5. Leave Management & Balances Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [5. Leave Management & Balances Endpoints] ---');
    const submitLeaveRes = await request(app)
      .post('/api/leave')
      .send({
        staff_id: testStaffId,
        start_date: '2026-09-10',
        end_date: '2026-09-15',
        leave_type: 'ANNUAL',
        reason: 'Surgical conference'
      });
    assert('POST /api/leave submits leave request and returns 201 PENDING', submitLeaveRes.status === 201 && submitLeaveRes.body.data.status === 'PENDING');

    const submitHalfDayRes = await request(app)
      .post('/api/leave')
      .send({
        staff_id: testStaffId,
        start_date: '2026-09-16',
        end_date: '2026-09-16',
        leave_type: 'ANNUAL',
        day_part: 'SECOND_HALF',
        days_requested: 0.5,
        reason: 'Nghỉ nửa ngày buổi chiều'
      });
    assert('POST /api/leave supports 0.5 days half-day leave and returns 201', submitHalfDayRes.status === 201 && submitHalfDayRes.body.data.days_requested === 0.5);

    const getLeaveHistRes = await request(app).get(`/api/leave/${testStaffId}`);
    assert('GET /api/leave/:staff_id returns 200 leave history', getLeaveHistRes.status === 200 && getLeaveHistRes.body.data.length >= 2);

    const setBalanceRes = await request(app)
      .post('/api/leave-balances')
      .send({
        staff_id: testStaffId,
        accrual_year: 2026,
        leave_type: 'ANNUAL',
        total_days: 25,
        used_days: 3
      });
    assert('POST /api/leave-balances sets quota and returns 201 (22 remaining)', setBalanceRes.status === 201 && setBalanceRes.body.data.remaining_days === 22);

    const getBalanceRes = await request(app).get(`/api/leave/balances/${testStaffId}/2026`);
    assert('GET /api/leave/balances/:staff_id/:year returns 200 quota records', getBalanceRes.status === 200 && getBalanceRes.body.data[0].remaining_days === 22);

    // ------------------------------------------------------------------------
    // 6. Payroll & Compensation Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [6. Payroll & Compensation Endpoints] ---');
    const createPayrollRunRes = await request(app)
      .post('/api/payroll/runs')
      .send({
        start_date: '2026-08-01',
        end_date: '2026-08-15',
        status: 'PROCESSING'
      });
    assert('POST /api/payroll/runs creates payroll cycle and returns 201', createPayrollRunRes.status === 201 && createPayrollRunRes.body.data.status === 'PROCESSING');
    const createdRunId = createPayrollRunRes.body.data.id;

    const createPaySlipRes = await request(app)
      .post('/api/payroll/payslips')
      .send({
        run_id: createdRunId,
        staff_id: testStaffId,
        base_pay: 7600.00,
        night_differential: 350.00,
        overtime_pay: 712.50,
        net_pay: 6950.00,
        status: 'CALCULATED'
      });
    assert('POST /api/payroll/payslips creates pay slip item and returns 201', createPaySlipRes.status === 201 && createPaySlipRes.body.data.net_pay === 6950.00);

    const getPaySlipsRes = await request(app).get(`/api/payroll/payslips/${testStaffId}`);
    assert('GET /api/payroll/payslips/:staff_id returns 200 pay slips', getPaySlipsRes.status === 200 && getPaySlipsRes.body.data.length >= 1);

    const addElectionRes = await request(app)
      .post('/api/payroll/elections')
      .send({
        staff_id: testStaffId,
        bank_name: 'Citibank Healthcare Direct',
        account_number: '123456789012',
        routing_number: '021000089',
        is_primary: true
      });
    assert('POST /api/payroll/elections adds direct deposit election and returns 201', addElectionRes.status === 201 && addElectionRes.body.data.bank_name === 'Citibank Healthcare Direct');

    const getElectionsRes = await request(app).get(`/api/payroll/elections/${testStaffId}`);
    assert('GET /api/payroll/elections/:staff_id returns 200 elections list', getElectionsRes.status === 200 && getElectionsRes.body.data.length >= 1);

    // ------------------------------------------------------------------------
    // 7. Notifications & Alerts Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [7. Notifications & Alerts Endpoints] ---');
    const createNotifRes = await request(app)
      .post('/api/notifications')
      .send({
        target_staff_id: testStaffId,
        title: 'Trauma Surgery Roster Confirmed',
        message: 'Your shift on Aug 25 has been confirmed by Emergency Dept Head.',
        type: 'ALERT'
      });
    assert('POST /api/notifications creates notification and returns 201', createNotifRes.status === 201 && createNotifRes.body.data.type === 'ALERT');
    const createdNotifId = createNotifRes.body.data.id;

    const getNotifsRes = await request(app).get(`/api/notifications/${testStaffId}`);
    assert('GET /api/notifications/:staff_id returns 200 notifications list', getNotifsRes.status === 200 && getNotifsRes.body.data.length >= 1);

    const markReadRes = await request(app).patch(`/api/notifications/${createdNotifId}/read`);
    assert('PATCH /api/notifications/:id/read marks notification as read and returns 200', markReadRes.status === 200 && markReadRes.body.is_read === true);

    // ------------------------------------------------------------------------
    // 8. Daily Tasks Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [8. Daily Tasks Endpoints] ---');
    const createTaskRes = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Trauma Resuscitation Bay Prep',
        description: 'Ensure airway equipment and rapid infuser are operational.',
        assigned_to: testStaffId,
        assigned_by: 'EMP-DOC-001',
        shift_id: createdShiftId,
        status: 'PENDING',
        due_date: '2026-08-25 10:00:00'
      });
    assert('POST /api/tasks creates daily task and returns 201', createTaskRes.status === 201 && createTaskRes.body.data.assigned_to === testStaffId);
    const createdTaskId = createTaskRes.body.data.id;

    const getTasksRes = await request(app).get(`/api/tasks?assigned_to=${testStaffId}`);
    assert('GET /api/tasks returns 200 with tasks array', getTasksRes.status === 200 && getTasksRes.body.data.length >= 1);

    const getTaskByIdRes = await request(app).get(`/api/tasks/${createdTaskId}`);
    assert('GET /api/tasks/:id returns 200 single task', getTaskByIdRes.status === 200 && getTaskByIdRes.body.data.id === createdTaskId);

    const updateTaskRes = await request(app)
      .patch(`/api/tasks/${createdTaskId}`)
      .send({ status: 'COMPLETED' });
    assert('PATCH /api/tasks/:id updates status and returns 200', updateTaskRes.status === 200 && updateTaskRes.body.data.status === 'COMPLETED');

    // ------------------------------------------------------------------------
    // 9. Clinical Shift Handovers Endpoints
    // ------------------------------------------------------------------------
    console.log('\n--- [9. Clinical Shift Handovers Endpoints] ---');
    const createHandoverRes = await request(app)
      .post('/api/handovers')
      .send({
        outgoing_shift_id: createdShiftId,
        critical_notes: 'Patient in Trauma Bay 1 awaiting CT results. Transferred airway responsibilities.',
        status: 'DRAFT',
        logged_by: testStaffId,
        checklists: [
          { item_description: 'Controlled substances verified in safe', is_verified: true },
          { item_description: 'Pending arterial blood gas labs reviewed', is_verified: false }
        ]
      });
    assert('POST /api/handovers creates handover report and returns 201', createHandoverRes.status === 201 && createHandoverRes.body.data.checklists.length === 2);
    const createdHandoverId = createHandoverRes.body.data.id;

    const getHandoversRes = await request(app).get(`/api/handovers?logged_by=${testStaffId}`);
    assert('GET /api/handovers returns 200 handovers list', getHandoversRes.status === 200 && getHandoversRes.body.data.length >= 1);

    const getHandoverByIdRes = await request(app).get(`/api/handovers/${createdHandoverId}`);
    assert('GET /api/handovers/:id returns 200 with checklists', getHandoverByIdRes.status === 200 && getHandoverByIdRes.body.data.checklists.length === 2);

    const addChkRes = await request(app)
      .post(`/api/handovers/${createdHandoverId}/checklists`)
      .send({ item_description: 'Crash cart defibrillator battery check', is_verified: true });
    assert('POST /api/handovers/:id/checklists adds item and returns 201', addChkRes.status === 201 && addChkRes.body.data.is_verified === true);
    const newChkId = addChkRes.body.data.id;

    const updateChkRes = await request(app)
      .patch(`/api/handovers/checklists/${newChkId}`)
      .send({ is_verified: true });
    assert('PATCH /api/handovers/checklists/:itemId updates verification and returns 200', updateChkRes.status === 200 && updateChkRes.body.data.is_verified === true);

    const signHandoverRes = await request(app)
      .post(`/api/handovers/${createdHandoverId}/sign`)
      .send({ acknowledged_by: 'EMP-DOC-001' });
    assert('POST /api/handovers/:id/sign acknowledges handover and returns 200', signHandoverRes.status === 200 && signHandoverRes.body.data.status === 'COMPLETED');

    // ------------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log(` [LIVE TEST SUMMARY]`);
    console.log(` Total Checks: ${passed + failed} | \x1b[32mPassed: ${passed}\x1b[0m | \x1b[31mFailed: ${failed}\x1b[0m`);
    console.log('======================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('[Live Test Exception]:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testAllEndpointsLive();
