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
  console.log(' Running Monolith Database Migration...');
  console.log('====================================================');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const schemaPath = path.join(__dirname, '../schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`[Migration] Executing schema statements from: ${schemaPath}`);
    await connection.query(sql);
    console.log('[Migration] Unified monolithic database migrated successfully!');
  } catch (error) {
    console.error('[Migration Failed]:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
