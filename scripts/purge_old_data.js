import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../monolith-backend/.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_USER = process.env.DB_USER || 'admin';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
const DB_NAME = process.env.DB_NAME || 'hrm_db';

async function purgeData() {
  console.log('====================================================================');
  console.log(`🧹 Purging old database records from "${DB_NAME}" (Keeping Admin only)`);
  console.log(`📡 Connecting to MySQL Server at ${DB_HOST}:${DB_PORT} as '${DB_USER}'...`);
  console.log('====================================================================');

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
    dateStrings: true
  });

  try {
    // 1. Locate Admin Account & Employee
    const [adminAccounts] = await conn.query("SELECT * FROM Accounts WHERE username = 'admin'");
    if (adminAccounts.length === 0) {
      throw new Error("Admin account ('admin') not found in Accounts table!");
    }
    const adminAccount = adminAccounts[0];
    const adminEmployeeId = adminAccount.employee_id;
    console.log(`[Admin Account] ID=${adminAccount.id}, employee_id=${adminEmployeeId}`);

    const [adminEmployees] = await conn.query("SELECT * FROM Employees WHERE id = ?", [adminEmployeeId]);
    if (adminEmployees.length === 0) {
      throw new Error(`Admin employee record (ID=${adminEmployeeId}) not found in Employees table!`);
    }
    const adminEmp = adminEmployees[0];
    console.log(`[Admin Employee] Code=${adminEmp.employee_code}, Name=${adminEmp.last_name} ${adminEmp.first_name}, Role=${adminEmp.role}`);

    // 2. Disable Foreign Key Checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 3. Purge all operational and transactional tables
    const operationalTables = [
      'Handover_Checklists',
      'Shift_Handovers',
      'Daily_Tasks',
      'Notifications',
      'Payment_Elections',
      'Pay_Slips',
      'Payroll_Runs',
      'Pay_Rates',
      'Leave_Balances',
      'Leave_Requests',
      'Attendances',
      'Shifts',
      'Documents',
      'Emergency_Contacts',
      'Medical_Licenses'
    ];

    console.log('\n[1/3] Truncating operational and transactional tables...');
    for (const table of operationalTables) {
      await conn.query(`TRUNCATE TABLE \`${table}\`;`);
      console.log(`  ✔ Purged table: ${table}`);
    }

    // 4. Delete non-admin accounts
    console.log('\n[2/3] Purging non-admin accounts...');
    const [delAccounts] = await conn.query("DELETE FROM Accounts WHERE username != 'admin'");
    console.log(`  ✔ Deleted ${delAccounts.affectedRows} non-admin accounts.`);

    // 5. Delete non-admin employees
    console.log('\n[3/3] Purging non-admin employees...');
    const [delEmployees] = await conn.query("DELETE FROM Employees WHERE id != ?", [adminEmployeeId]);
    console.log(`  ✔ Deleted ${delEmployees.affectedRows} non-admin employees.`);

    // 6. Re-enable Foreign Key Checks
    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');

    // 7. Verify row counts across all tables
    console.log('\n================ Verified Database Status ================');
    const [allTables] = await conn.query('SHOW TABLES');
    const tableNames = allTables.map(t => Object.values(t)[0]);
    for (const t of tableNames) {
      const [[{ count }]] = await conn.query(`SELECT COUNT(*) as count FROM \`${t}\``);
      console.log(`  ${t.padEnd(24)}: ${count} rows`);
    }
    console.log('==========================================================');

    console.log('\n✨ Database purge completed successfully! Only the admin account remains intact.');
  } catch (error) {
    console.error('❌ Purge failed:', error);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

purgeData();
