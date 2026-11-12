#!/usr/bin/env node

/**
 * Hospital HRMS - Automated Database Restoration Engine
 * Decompresses and imports a snapshot (.sql.gz) into MySQL 'hrm_db'.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import dotenv from 'dotenv';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment configuration
dotenv.config({ path: path.join(projectRoot, 'backend', '.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'hrm_db';

const BACKUP_DIR = path.join(projectRoot, 'backups');

/**
 * Locates the mysql CLI client executable on the host system
 * @returns {string} Path or command name for mysql
 */
export function findMysqlPath() {
  if (process.env.MYSQL_PATH && fs.existsSync(process.env.MYSQL_PATH)) {
    return process.env.MYSQL_PATH;
  }

  const candidatePaths = [
    'mysql',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin\\mysql.exe',
    'C:\\xampp\\mysql\\bin\\mysql.exe',
    '/usr/bin/mysql',
    '/usr/local/bin/mysql',
    '/usr/local/mysql/bin/mysql'
  ];

  for (const p of candidatePaths) {
    if (p === 'mysql') continue;
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'mysql';
}

/**
 * Finds the most recent backup file in the backups folder
 * @param {string} dir
 * @returns {string|null}
 */
export function getLatestBackupFile(dir = BACKUP_DIR) {
  if (!fs.existsSync(dir)) return null;

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('hrm_db_backup_') && f.endsWith('.sql.gz'))
    .map((f) => ({
      fullPath: path.join(dir, f),
      time: fs.statSync(path.join(dir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  return files.length > 0 ? files[0].fullPath : null;
}

/**
 * Asks for user confirmation in interactive terminal
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Executes database restore from a compressed backup file
 * @param {object} options
 * @returns {Promise<{ success: boolean, targetFile: string, durationMs: number }>}
 */
export async function restoreDatabase(options = {}) {
  const startTime = Date.now();
  const mysqlBin = options.mysqlPath || findMysqlPath();
  const targetFile = options.targetFile || getLatestBackupFile(options.backupDir || BACKUP_DIR);

  if (!targetFile || !fs.existsSync(targetFile)) {
    throw new Error(`Backup snapshot file not found: ${targetFile || '(no backups available)'}`);
  }

  const isForce = Boolean(options.force || options.yes);

  console.log(`[Restore Engine] Selected snapshot: ${targetFile}`);
  console.log(`[Restore Engine] Target database: "${DB_NAME}" on ${DB_HOST}:${DB_PORT}`);
  console.log(`[Restore Engine] Executable: ${mysqlBin}`);

  if (!isForce && process.stdin.isTTY) {
    const confirmed = await askConfirmation(
      `[CAUTION] Restoring will overwrite existing data in "${DB_NAME}". Proceed? (y/N): `
    );
    if (!confirmed) {
      console.log(`[Restore Engine] Operation cancelled by user.`);
      return { success: false, targetFile, durationMs: 0, cancelled: true };
    }
  }

  const args = [
    `--host=${DB_HOST}`,
    `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    '--default-character-set=utf8mb4',
    DB_NAME
  ];

  if (DB_PASSWORD) {
    args.splice(3, 0, `--password=${DB_PASSWORD}`);
  }

  return new Promise((resolve, reject) => {
    const mysqlProcess = spawn(mysqlBin, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });

    const fileStream = fs.createReadStream(targetFile);
    const gunzip = zlib.createGunzip();

    let stderrData = '';

    mysqlProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    mysqlProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn mysql process: ${err.message}`));
    });

    mysqlProcess.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      if (code !== 0) {
        return reject(
          new Error(`mysql process exited with code ${code}. Stderr: ${stderrData}`)
        );
      }

      console.log(`[Restore Engine] Database restoration completed successfully in ${durationMs}ms`);
      resolve({
        success: true,
        targetFile,
        durationMs
      });
    });

    fileStream.pipe(gunzip).pipe(mysqlProcess.stdin);

    fileStream.on('error', (err) => reject(new Error(`Read stream error: ${err.message}`)));
    gunzip.on('error', (err) => reject(new Error(`Decompression error: ${err.message}`)));
  });
}

// Direct CLI Execution Handler
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
  const targetFile = fileArg ? fileArg.split('=')[1] : null;
  const isForce = process.argv.includes('--force') || process.argv.includes('--yes') || process.argv.includes('-y');

  restoreDatabase({ targetFile, force: isForce })
    .then((result) => {
      if (result.cancelled) {
        process.exit(0);
      }
      console.log(`[Restore Engine] Finished with exit code 0.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Restore Engine Error]:`, err.message);
      process.exit(1);
    });
}
