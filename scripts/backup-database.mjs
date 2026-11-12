#!/usr/bin/env node

/**
 * Hospital HRMS - Automated Database Backup Engine
 * Dumps MySQL 'hrm_db' into compressed GZIP format (.sql.gz) with automatic retention rotation.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import dotenv from 'dotenv';
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
const DEFAULT_RETENTION_COUNT = 14; // Retain last 14 backup snapshots

/**
 * Locates the mysqldump binary executable on the host system
 * @returns {string} Path or command name for mysqldump
 */
export function findMysqldumpPath() {
  if (process.env.MYSQLDUMP_PATH && fs.existsSync(process.env.MYSQLDUMP_PATH)) {
    return process.env.MYSQLDUMP_PATH;
  }

  // Windows standard installation paths
  const candidatePaths = [
    'mysqldump',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.1\\bin\\mysqldump.exe',
    'C:\\Program Files\\MySQL\\MySQL Workbench 8.0\\mysqldump.exe',
    'C:\\xampp\\mysql\\bin\\mysqldump.exe',
    '/usr/bin/mysqldump',
    '/usr/local/bin/mysqldump',
    '/usr/local/mysql/bin/mysqldump'
  ];

  for (const p of candidatePaths) {
    if (p === 'mysqldump') continue;
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return 'mysqldump';
}

/**
 * Format bytes into human-readable string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Prunes backups older than the retention threshold
 * @param {string} dir
 * @param {number} maxRetained
 */
export function pruneOldBackups(dir, maxRetained = DEFAULT_RETENTION_COUNT) {
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('hrm_db_backup_') && f.endsWith('.sql.gz'))
    .map((f) => ({
      name: f,
      fullPath: path.join(dir, f),
      time: fs.statSync(path.join(dir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Newest first

  const pruned = [];
  if (files.length > maxRetained) {
    const toRemove = files.slice(maxRetained);
    for (const file of toRemove) {
      try {
        fs.unlinkSync(file.fullPath);
        pruned.push(file.name);
      } catch (err) {
        console.warn(`[Backup Rotation Warning]: Failed to delete ${file.name}: ${err.message}`);
      }
    }
  }

  return pruned;
}

/**
 * Executes a full database backup with gzip compression
 * @param {object} options
 * @returns {Promise<{ success: boolean, filePath: string, sizeBytes: number, durationMs: number }>}
 */
export async function backupDatabase(options = {}) {
  const startTime = Date.now();
  const mysqldumpBin = options.mysqldumpPath || findMysqldumpPath();
  const targetDir = options.backupDir || BACKUP_DIR;
  const retentionCount = options.retentionCount ?? DEFAULT_RETENTION_COUNT;

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
  const fileName = `hrm_db_backup_${timestamp}.sql.gz`;
  const targetPath = path.join(targetDir, fileName);

  console.log(`[Backup Engine] Starting backup of database "${DB_NAME}" on ${DB_HOST}:${DB_PORT}...`);
  console.log(`[Backup Engine] Executable: ${mysqldumpBin}`);

  const args = [
    `--host=${DB_HOST}`,
    `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    '--single-transaction',
    '--quick',
    '--routines',
    '--triggers',
    '--default-character-set=utf8mb4',
    DB_NAME
  ];

  if (DB_PASSWORD) {
    args.splice(3, 0, `--password=${DB_PASSWORD}`);
  }

  return new Promise((resolve, reject) => {
    const dumpProcess = spawn(mysqldumpBin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    const gzip = zlib.createGzip({ level: 9 });
    const outputStream = fs.createWriteStream(targetPath);

    let stderrData = '';

    dumpProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    dumpProcess.stdout.pipe(gzip).pipe(outputStream);

    dumpProcess.on('error', (err) => {
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      reject(new Error(`Failed to spawn mysqldump process: ${err.message}`));
    });

    outputStream.on('finish', () => {
      const stats = fs.statSync(targetPath);
      const durationMs = Date.now() - startTime;

      if (stats.size === 0) {
        fs.unlinkSync(targetPath);
        return reject(new Error(`Backup generated empty file. Stderr: ${stderrData}`));
      }

      console.log(`[Backup Engine] Backup completed successfully in ${durationMs}ms`);
      console.log(`[Backup Engine] Snapshot file: ${targetPath} (${formatBytes(stats.size)})`);

      const pruned = pruneOldBackups(targetDir, retentionCount);
      if (pruned.length > 0) {
        console.log(`[Backup Engine] Rotation cleaned up ${pruned.length} outdated snapshot(s):`, pruned);
      }

      resolve({
        success: true,
        filePath: targetPath,
        fileName,
        sizeBytes: stats.size,
        durationMs,
        pruned
      });
    });

    outputStream.on('error', (err) => {
      reject(new Error(`Write stream failure: ${err.message}`));
    });
  });
}

// Direct CLI Execution Handler
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  backupDatabase()
    .then((result) => {
      console.log(`[Backup Engine] Finished with exit code 0.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Backup Engine Error]:`, err.message);
      process.exit(1);
    });
}
