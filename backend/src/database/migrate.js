import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('====================================================');
  console.log(' Running Database Migration...');
  console.log('====================================================');

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbName = process.env.DB_NAME || 'hrm_db';
  const isCloudSsl =
    process.env.DB_SSL === 'true' ||
    /tidbcloud\.com|aivencloud\.com|clever-cloud\.com|psdb\.cloud/i.test(dbHost);

  const connection = await mysql.createConnection({
    host: dbHost,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    ...(isCloudSsl ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false } } : {})
  });

  try {
    const schemaPath = path.join(__dirname, '../../schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');
    if (dbName !== 'hrm_db') {
      sql = sql.replace(/`hrm_db`/g, `\`${dbName}\``);
    }

    console.log(`[Migration] Executing schema statements on database "${dbName}" (${dbHost})...`);
    await connection.query(sql);
    console.log('[Migration] Backend database migrated successfully!');
  } catch (error) {
    console.error('[Migration Failed]:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
