import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment configuration
dotenv.config({ path: path.join(projectRoot, 'backend', '.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const LOCAL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hrm_db',
  charset: 'utf8mb4',
  dateStrings: true
};

const TIDB_CLOUD_CONFIG = {
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '3RudpjDsQ3n2ty4.root',
  password: 'Ps24s7QdFmqEWw1X',
  database: 'hrm_db',
  charset: 'utf8mb4',
  dateStrings: true,
  ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
};

/**
 * Clean and normalize CREATE TABLE DDL for TiDB compatibility
 */
function cleanDdlForTiDB(ddl) {
  return ddl
    .replace(/\/\*!500\d+[^;]*\*\//gi, '') // Remove MySQL specific version comments
    .replace(/COLLATE\s*=\s*[^\s;]+/gi, '') // Standardize collations
    .replace(/ROW_FORMAT\s*=\s*[^\s;]+/gi, '');
}

/**
 * Format date values safely for MySQL insert
 */
function sanitizeValue(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (Buffer.isBuffer(val)) {
    return val;
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return val;
}

async function syncAllToTiDBCloud() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log(' FULL DATABASE SYNCHRONIZATION: LOCAL MYSQL -> TIDB CLOUD');
  console.log('================================================================');
  console.log(`[Source] Local Database: ${LOCAL_CONFIG.host}:${LOCAL_CONFIG.port}/${LOCAL_CONFIG.database}`);
  console.log(`[Target] TiDB Cloud:     ${TIDB_CLOUD_CONFIG.host}:${TIDB_CLOUD_CONFIG.port}/${TIDB_CLOUD_CONFIG.database}`);

  let localConn, cloudConn;

  try {
    localConn = await mysql.createConnection(LOCAL_CONFIG);
    console.log('[Connection] Connected to Local MySQL successfully.');

    cloudConn = await mysql.createConnection(TIDB_CLOUD_CONFIG);
    console.log('[Connection] Connected to TiDB Cloud successfully.');

    // Disable foreign key checks on TiDB Cloud during schema rebuild and data population
    await cloudConn.query('SET FOREIGN_KEY_CHECKS = 0;');

    // 1. Get all tables in local database
    const [localTablesRaw] = await localConn.query('SHOW TABLES;');
    const localTables = localTablesRaw.map((t) => Object.values(t)[0]);
    console.log(`\n[Scan] Detected ${localTables.length} tables in Local Database:`, localTables);

    // 2. Sync schema and data for each table
    const syncSummary = [];

    for (const tableName of localTables) {
      console.log(`\n--- Processing Table: \`${tableName}\` ---`);

      // A. Extract Schema DDL from Local
      const [createRes] = await localConn.query(`SHOW CREATE TABLE \`${tableName}\`;`);
      const rawDdl = createRes[0]['Create Table'];
      const tidbDdl = cleanDdlForTiDB(rawDdl);

      // B. Drop existing table on TiDB Cloud and recreate
      await cloudConn.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      await cloudConn.query(tidbDdl);
      console.log(`[Schema] Table \`${tableName}\` recreated on TiDB Cloud.`);

      // C. Extract Data from Local
      const [rows] = await localConn.query(`SELECT * FROM \`${tableName}\`;`);
      const rowCount = rows.length;

      if (rowCount > 0) {
        const columns = Object.keys(rows[0]);
        const columnNamesSql = columns.map((col) => `\`${col}\``).join(', ');

        const batchSize = 100;
        let insertedCount = 0;

        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const values = batch.map((row) => columns.map((col) => sanitizeValue(row[col])));

          await cloudConn.query(
            `INSERT INTO \`${tableName}\` (${columnNamesSql}) VALUES ?`,
            [values]
          );
          insertedCount += batch.length;
        }

        console.log(`[Data] Migrated ${insertedCount}/${rowCount} rows to TiDB Cloud.`);
      } else {
        console.log(`[Data] Table is empty in Local. Recreated empty table on TiDB Cloud.`);
      }

      // D. Verify count on TiDB Cloud
      const [verifyRes] = await cloudConn.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\`;`);
      const cloudCount = verifyRes[0].cnt;

      syncSummary.push({
        table: tableName,
        localRows: rowCount,
        cloudRows: cloudCount,
        synced: rowCount === cloudCount
      });
    }

    // Re-enable foreign key checks on TiDB Cloud
    await cloudConn.query('SET FOREIGN_KEY_CHECKS = 1;');

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n================================================================');
    console.log(' SYNCHRONIZATION VERIFICATION REPORT (LOCAL vs TIDB CLOUD):');
    console.log('================================================================');
    console.log('Table Name'.padEnd(35) + 'Local Rows'.padStart(12) + 'TiDB Rows'.padStart(12) + 'Status'.padStart(10));
    console.log('-'.repeat(69));

    let allMatched = true;
    for (const item of syncSummary) {
      const status = item.synced ? 'OK' : 'MISMATCH';
      if (!item.synced) allMatched = false;
      console.log(
        item.table.padEnd(35) +
          String(item.localRows).padStart(12) +
          String(item.cloudRows).padStart(12) +
          status.padStart(10)
      );
    }
    console.log('-'.repeat(69));
    console.log(`Total Tables Processed: ${syncSummary.length}`);
    console.log(`Overall Sync Status:    ${allMatched ? 'ALL 100% MATCHED' : 'SOME MISMATCHES'}`);
    console.log(`Total Elapsed Time:     ${totalDuration}s`);
    console.log('================================================================\n');

    if (!allMatched) {
      throw new Error('Database sync completed with row count mismatches.');
    }

    console.log('Synchronization completed successfully!');
  } catch (error) {
    console.error('\n[Sync Failure Error]:', error);
    process.exit(1);
  } finally {
    if (localConn) await localConn.end();
    if (cloudConn) await cloudConn.end();
  }
}

syncAllToTiDBCloud()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal sync error:', err);
    process.exit(1);
  });
