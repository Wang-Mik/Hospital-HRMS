import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const isCloudSsl =
  process.env.DB_SSL === 'true' ||
  /tidbcloud\.com|aivencloud\.com|clever-cloud\.com|psdb\.cloud/i.test(dbHost);

/**
 * MySQL Connection Pool Configuration for HRMS Application
 */
const pool = mysql.createPool({
  host: dbHost,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrm_db',
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS === 'false' ? false : true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || (process.env.VERCEL ? 5 : 50)),
  queueLimit: Number(process.env.DB_QUEUE_LIMIT || 0),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  dateStrings: true,
  ...(isCloudSsl ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false } } : {})
});

/**
 * Test database connectivity
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Backend DB] Connected to MySQL database "${process.env.DB_NAME || 'hrm_db'}" on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    connection.release();
    return true;
  } catch (error) {
    console.warn(`[Backend DB] Connection warning: ${error.message}`);
    return false;
  }
}

export default pool;
