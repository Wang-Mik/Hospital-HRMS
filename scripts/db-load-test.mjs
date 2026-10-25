import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read cloud configuration
const envPath = path.resolve(__dirname, '../.env.vercel');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      if (k && v.length) env[k] = v.join('=');
    }
  });
}

const DB_HOST = env.DB_HOST || process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com';
const DB_PORT = Number(env.DB_PORT || process.env.DB_PORT || 4000);
const DB_USER = env.DB_USER || process.env.DB_USER || '3RudpjDsQ3n2ty4.root';
const DB_PASSWORD = env.DB_PASSWORD || process.env.DB_PASSWORD || 'Ps24s7QdFmqEWw1X';
const DB_NAME = env.DB_NAME || process.env.DB_NAME || 'hrm_db';

console.log('='.repeat(75));
console.log('       HOSPITAL HRMS - DATABASE BENCHMARK & LOAD TESTING REPORT');
console.log('='.repeat(75));
console.log(`Target Host    : ${DB_HOST}:${DB_PORT}`);
console.log(`Database Name  : ${DB_NAME}`);
console.log(`User Identity  : ${DB_USER}`);
console.log(`Engine Type    : TiDB Cloud Serverless (Distributed Cloud MySQL Engine)`);
console.log(`Timestamp      : ${new Date().toISOString()}`);
console.log('='.repeat(75));

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 0,
  enableKeepAlive: true
});

function calculateStats(latencies) {
  if (latencies.length === 0) return { min: 0, avg: 0, med: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const p = (pct) => sorted[Math.floor(sorted.length * (pct / 100))];

  return {
    min: sorted[0],
    avg: Number(avg.toFixed(2)),
    med: Number(p(50).toFixed(2)),
    p90: Number(p(90).toFixed(2)),
    p95: Number(p(95).toFixed(2)),
    p99: Number(p(99).toFixed(2)),
    max: sorted[sorted.length - 1]
  };
}

function printStats(title, totalOps, durationSec, latencies, errors, lastErrMsg = '') {
  const stats = calculateStats(latencies);
  const qps = (totalOps / durationSec).toFixed(1);

  console.log(`\n--- [${title}] ---`);
  console.log(`  Tổng số truy vấn : ${totalOps.toLocaleString()} requests`);
  console.log(`  Thời gian đo     : ${durationSec.toFixed(2)}s`);
  console.log(`  Thông lượng (QPS): ${qps} queries/giây`);
  console.log(`  Thành công / Lỗi : ${(totalOps - errors).toLocaleString()} OK / ${errors} FAIL (${((errors / (totalOps || 1)) * 100).toFixed(2)}% lỗi)`);
  if (errors > 0 && lastErrMsg) {
    console.log(`  Thông báo lỗi gần nhất: ${lastErrMsg}`);
  }
  console.log(`  Chỉ số độ trễ (Latency Distribution):`);
  console.log(`    - Thấp nhất (Min) : ${stats.min} ms`);
  console.log(`    - Trung bình (Avg): ${stats.avg} ms`);
  console.log(`    - Trung vị (p50)  : ${stats.med} ms`);
  console.log(`    - Phân vị p90     : ${stats.p90} ms`);
  console.log(`    - Phân vị p95     : ${stats.p95} ms (Tiêu chuẩn SLA < 500ms: ${stats.p95 < 500 ? 'ĐẠT CHUẨN (PASS)' : 'CẢNH BÁO (WARN)'})`);
  console.log(`    - Phân vị p99     : ${stats.p99} ms`);
  console.log(`    - Cao nhất (Max)  : ${stats.max} ms`);
}

// ----------------------------------------------------
// STAGE 1: Network Roundtrip & Health Check
// ----------------------------------------------------
async function testStage1() {
  console.log('\n[Giai Đoạn 1]: Kiểm tra kết nối mạng & độ trễ Ping cơ sở dữ liệu...');
  const pingLatencies = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await pool.query('SELECT 1');
    const cost = Math.round(performance.now() - start);
    pingLatencies.push(cost);
  }
  const avgPing = (pingLatencies.reduce((a, b) => a + b, 0) / pingLatencies.length).toFixed(1);
  console.log(`  Độ trễ trung bình mạng (VN -> AWS Singapore TiDB Cloud): ${avgPing} ms`);
}

// ----------------------------------------------------
// STAGE 2: High Concurrency Read Stress Test
// ----------------------------------------------------
async function testStage2(concurrency = 20, totalRequests = 300) {
  console.log(`\n[Giai Đoạn 2]: Chạy thử tải đọc đồng thời (Concurrency: ${concurrency} luồng, Tổng: ${totalRequests} truy vấn)...`);
  const latencies = [];
  let errors = 0;
  let lastErrMsg = '';

  const staffCodes = ['EMP-ADM-001', 'EMP-DIR-001', 'EMP-DOC-001', 'EMP-DOC-002', 'EMP-NUR-001'];
  const queries = [
    // 1. Indexed Point lookup
    (code) => pool.query('SELECT * FROM Employees WHERE employee_code = ?', [code]),
    // 2. Relational 3-table JOIN (Employees + Departments + Roles)
    () => pool.query('SELECT e.id, e.employee_code, e.first_name, e.last_name, d.name as dept_name, r.name as role_name FROM Employees e LEFT JOIN Departments d ON e.department_code = d.department_code LEFT JOIN Roles r ON e.role = r.role_code LIMIT 20'),
    // 3. Range scan with sorting on Attendances
    () => pool.query('SELECT * FROM Attendances ORDER BY clock_in_time DESC LIMIT 15')
  ];

  let completed = 0;
  const startTime = performance.now();

  async function worker() {
    while (completed < totalRequests) {
      const currentIdx = completed++;
      if (currentIdx >= totalRequests) break;

      const code = staffCodes[currentIdx % staffCodes.length];
      const qFn = queries[currentIdx % queries.length];

      const qStart = performance.now();
      try {
        await qFn(code);
        const duration = Math.round(performance.now() - qStart);
        latencies.push(duration);
      } catch (err) {
        errors++;
        lastErrMsg = err.message;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const totalDuration = (performance.now() - startTime) / 1000;
  printStats('KẾT QUẢ ĐỌC ĐỒNG THỜI (CONCURRENT READ STRESS TEST)', totalRequests, totalDuration, latencies, errors, lastErrMsg);
}

// ----------------------------------------------------
// STAGE 3: Concurrent Write & Transaction Stress Test
// ----------------------------------------------------
async function testStage3(concurrency = 15, totalWrites = 100) {
  console.log(`\n[Giai Đoạn 3]: Chạy thử tải ghi & giao dịch ACID (Concurrency: ${concurrency} luồng, Tổng: ${totalWrites} bản ghi)...`);
  const latencies = [];
  let errors = 0;
  let lastErrMsg = '';
  const insertedIds = [];

  let completed = 0;
  const startTime = performance.now();

  async function writerWorker() {
    while (completed < totalWrites) {
      const currentIdx = completed++;
      if (currentIdx >= totalWrites) break;

      const id = randomUUID();
      const qStart = performance.now();
      try {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query(
            'INSERT INTO Notifications (id, target_staff_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, ?)',
            [id, 'EMP-DOC-001', `[LoadTest] Cảnh báo hệ thống ${currentIdx}`, `Dữ liệu kiểm thử tải áp lực #${currentIdx}`, 'ALERT', 0]
          );
          await conn.commit();
          insertedIds.push(id);
          const duration = Math.round(performance.now() - qStart);
          latencies.push(duration);
        } catch (innerErr) {
          await conn.rollback();
          errors++;
          lastErrMsg = innerErr.message;
        } finally {
          conn.release();
        }
      } catch (poolErr) {
        errors++;
        lastErrMsg = poolErr.message;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => writerWorker());
  await Promise.all(workers);

  const totalDuration = (performance.now() - startTime) / 1000;
  printStats('KẾT QUẢ GHI GIAO DỊCH (ACID TRANSACTION STRESS TEST)', totalWrites, totalDuration, latencies, errors, lastErrMsg);

  // Cleanup test data
  if (insertedIds.length > 0) {
    console.log(`  Dọn dẹp ${insertedIds.length} bản ghi test trong cơ sở dữ liệu...`);
    const placeholders = insertedIds.map(() => '?').join(',');
    await pool.query(`DELETE FROM Notifications WHERE id IN (${placeholders})`, insertedIds);
    console.log('  [OK] Dọn dẹp hoàn tất, cơ sở dữ liệu sạch sẽ 100%.');
  }
}

// ----------------------------------------------------
// STAGE 4: Mixed Real-world Workload (80% Read / 20% Write)
// ----------------------------------------------------
async function testStage4(concurrency = 20, durationSeconds = 8) {
  console.log(`\n[Giai Đoạn 4]: Chạy mô phỏng tải hỗn hợp thực tế giờ cao điểm (80% Đọc, 20% Ghi trong ${durationSeconds} giây)...`);
  const latencies = [];
  let errors = 0;
  let lastErrMsg = '';
  let totalOps = 0;
  const insertedIds = [];

  const stopTime = Date.now() + durationSeconds * 1000;
  const startTime = performance.now();

  async function mixedWorker(workerId) {
    while (Date.now() < stopTime) {
      totalOps++;
      const isWrite = Math.random() < 0.2; // 20% writes
      const qStart = performance.now();

      try {
        if (isWrite) {
          const id = randomUUID();
          await pool.query(
            'INSERT INTO Notifications (id, target_staff_id, title, message, type, is_read) VALUES (?, ?, ?, ?, ?, ?)',
            [id, 'EMP-DOC-002', `[MixedTest] Worker ${workerId}`, 'Tin nhắn thử tải hỗn hợp', 'ANNOUNCEMENT', 0]
          );
          insertedIds.push(id);
        } else {
          await pool.query(
            'SELECT e.id, e.employee_code, e.first_name, e.last_name, d.name as dept_name FROM Employees e LEFT JOIN Departments d ON e.department_code = d.department_code LIMIT 10'
          );
        }
        const cost = Math.round(performance.now() - qStart);
        latencies.push(cost);
      } catch (err) {
        errors++;
        lastErrMsg = err.message;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => mixedWorker(i));
  await Promise.all(workers);

  const realDuration = (performance.now() - startTime) / 1000;
  printStats('KẾT QUẢ TẢI HỖN HỢP GIỜ CAO ĐIỂM (MIXED WORKLOAD 80/20)', totalOps, realDuration, latencies, errors, lastErrMsg);

  // Cleanup
  if (insertedIds.length > 0) {
    console.log(`  Dọn dẹp ${insertedIds.length} bản ghi test hỗn hợp...`);
    const placeholders = insertedIds.map(() => '?').join(',');
    await pool.query(`DELETE FROM Notifications WHERE id IN (${placeholders})`, insertedIds);
    console.log('  [OK] Đã dọn dẹp sạch sẽ 100%.');
  }
}

// ----------------------------------------------------
// RUNNER
// ----------------------------------------------------
async function runAll() {
  try {
    await testStage1();
    await testStage2(20, 300);
    await testStage3(15, 100);
    await testStage4(20, 8);

    console.log('\n' + '='.repeat(75));
    console.log('  TẤT CẢ CÁC GIAI ĐOẠN KIỂM THỬ CHỊU TẢI DATABASE ĐÃ HOÀN TẤT THÀNH CÔNG!');
    console.log('='.repeat(75));
  } catch (fatalErr) {
    console.error('Fatal load test error:', fatalErr);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runAll();
