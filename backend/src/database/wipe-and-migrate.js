import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function wipeAndMigrate() {
  console.log('======================================================================');
  console.log(' [DB RESET] Wiping and Re-creating HRMS Database...');
  console.log('======================================================================');

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT) || 3306;
  const dbUser = process.env.DB_USER || 'admin';
  const dbPassword = process.env.DB_PASSWORD || 'admin';
  const dbName = process.env.DB_NAME || 'hrm_db';

  console.log(`Connecting to MySQL at ${dbHost}:${dbPort} as user "${dbUser}"...`);

  const rootConn = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true
  });

  try {
    // 1. Drop all old microservice databases and legacy DB
    const oldDatabases = [
      'hrm_core_hr_db',
      'hrm_workforce_db',
      'hrm_payroll_db',
      'hrm_portal_db',
      dbName
    ];

    console.log(`[1/3] Dropping old databases and wiping legacy data: ${oldDatabases.join(', ')}...`);
    for (const oldDb of oldDatabases) {
      await rootConn.query(`DROP DATABASE IF EXISTS \`${oldDb}\`;`);
    }
    console.log(`[+] Legacy databases wiped cleanly.`);

    // 2. Create fresh unified database (hrm_db)
    console.log(`[2/3] Creating fresh unified database "${dbName}"...`);
    await rootConn.query(`
      CREATE DATABASE \`${dbName}\`
        DEFAULT CHARACTER SET utf8mb4
        DEFAULT COLLATE utf8mb4_unicode_ci;
    `);
    console.log(`[+] Database "${dbName}" created successfully.`);

    // 3. Read and execute unified schema.sql
    const schemaPath = path.join(__dirname, '../../schema.sql');
    console.log(`[3/3] Applying unified schema DDL from: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await rootConn.query(`USE \`${dbName}\`;`);
    await rootConn.query(sql);

    // Verify all tables created
    const [tables] = await rootConn.query('SHOW TABLES;');
    const tableNames = tables.map((t) => Object.values(t)[0]);

    console.log('\n======================================================================');
    console.log(` [SUCCESS] Backend DB "${dbName}" initialized!`);
    console.log(` Total Tables Created: ${tableNames.length}`);
    console.log('======================================================================');
    tableNames.forEach((t, i) => console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${t}`));
    console.log('======================================================================\n');
  } catch (error) {
    console.error('[DB Reset Failed]:', error);
    process.exit(1);
  } finally {
    await rootConn.end();
  }
}

wipeAndMigrate();
