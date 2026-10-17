import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MySQL Connection Pool Configuration for Monolith HRMS Application
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrm_db',
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS === 'false' ? false : true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 15,
  queueLimit: Number(process.env.DB_QUEUE_LIMIT) || 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4',
  dateStrings: true
});

/**
 * Test database connectivity
 * @returns {Promise<boolean>}
 */
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[Monolith DB] Connected to MySQL database "${process.env.DB_NAME || 'hrm_db'}" on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    connection.release();
    return true;
  } catch (error) {
    console.warn(`[Monolith DB] Connection warning: ${error.message}`);
    return false;
  }
}

export default pool;
