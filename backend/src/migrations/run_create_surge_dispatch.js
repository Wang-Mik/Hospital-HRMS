import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runSurgeDispatchMigration() {
  console.log('[Migration] Starting Surge_Dispatches schema migration on local MySQL hrm_db...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hrm_db',
    port: Number(process.env.DB_PORT) || 3306,
    multipleStatements: true
  });

  try {
    const sqlPath = path.resolve(__dirname, 'create_surge_dispatch_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await connection.query(sqlContent);
    console.log('[Migration] Successfully executed create_surge_dispatch_schema.sql!');

    const [descRows] = await connection.query('DESCRIBE Surge_Dispatches');
    console.log('[Migration] Surge_Dispatches columns count:', descRows.length);

    const [shiftCols] = await connection.query("SHOW COLUMNS FROM Shifts WHERE Field = 'status'");
    console.log('[Migration] Shifts.status column type:', shiftCols[0]?.Type);

    console.log('[Migration] Surge Dispatch Migration completed successfully!');
  } catch (err) {
    console.error('[Migration Error]:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSurgeDispatchMigration();
