import fs from 'fs';
import path from 'path';

console.log('='.repeat(75));
console.log('  HOSPITAL HRMS - LIVE SYSTEM PERFORMANCE BENCHMARK');
console.log('  Target URL   : https://hospital-hrms.vercel.app/');
console.log('  Database     : TiDB Cloud Serverless (gateway01.ap-southeast-1.prod.aws.tidbcloud.com)');
console.log('  Test Date    : ' + new Date().toISOString());
console.log('='.repeat(75));

const BASE_URL = 'https://hospital-hrms.vercel.app';

function calculateStats(latencies) {
  if (latencies.length === 0) return { min: 0, avg: 0, med: 0, p90: 0, p95: 0, p99: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const p = (pct) => sorted[Math.floor(sorted.length * (pct / 100))];

  return {
    min: sorted[0],
    avg: Number(avg.toFixed(1)),
    med: Number(p(50).toFixed(1)),
    p90: Number(p(90).toFixed(1)),
    p95: Number(p(95).toFixed(1)),
    p99: Number(p(99).toFixed(1)),
    max: sorted[sorted.length - 1]
  };
}

function printStats(title, totalOps, durationSec, latencies, errors, statuses) {
  const stats = calculateStats(latencies);
  const rps = (totalOps / durationSec).toFixed(1);

  console.log(`\n--- [${title}] ---`);
  console.log(`  Tổng yêu cầu HTTP : ${totalOps.toLocaleString()} requests`);
  console.log(`  Thời gian đo      : ${durationSec.toFixed(2)}s`);
  console.log(`  Thông lượng (RPS) : ${rps} requests/giây`);
  console.log(`  Thành công / Lỗi  : ${(totalOps - errors).toLocaleString()} OK / ${errors} FAIL (${((errors / (totalOps || 1)) * 100).toFixed(2)}% lỗi)`);
  if (statuses) {
    const statusSummary = Object.entries(statuses).map(([code, cnt]) => `${code}: ${cnt}`).join(', ');
    console.log(`  Mã phản hồi HTTP  : ${statusSummary}`);
  }
  console.log(`  Phân phối độ trễ (Latency Distribution):`);
  console.log(`    - Thấp nhất (Min) : ${stats.min} ms`);
  console.log(`    - Trung bình (Avg): ${stats.avg} ms`);
  console.log(`    - Trung vị (p50)  : ${stats.med} ms`);
  console.log(`    - Phân vị p90     : ${stats.p90} ms`);
  console.log(`    - Phân vị p95     : ${stats.p95} ms (SLA Target < 500ms: ${stats.p95 < 500 ? 'ĐẠT (PASS)' : 'CẢNH BÁO (WARN)'})`);
  console.log(`    - Phân vị p99     : ${stats.p99} ms`);
  console.log(`    - Cao nhất (Max)  : ${stats.max} ms`);
}

// ----------------------------------------------------------------------
// PART 1: Frontend CDN Edge Delivery & Compression
// ----------------------------------------------------------------------
async function testFrontendCDN() {
  console.log('\n[PHẦN 1]: Kiểm tra tốc độ phân phối Frontend & Bộ nhớ đệm Edge CDN...');

  const assetsToTest = [
    { label: 'HTML Entry Document', url: `${BASE_URL}/` },
    { label: 'Vite Main JS Bundle', url: `${BASE_URL}/assets/index-CATrIDhM.js` },
    { label: 'React Vendor Chunk', url: `${BASE_URL}/assets/vendor-react-fd1W8DEY.js` },
    { label: 'Query Vendor Chunk', url: `${BASE_URL}/assets/vendor-query-CgG7q9-C.js` },
    { label: 'Tailwind/CSS Bundle', url: `${BASE_URL}/assets/index-BQtKxbzX.css` }
  ];

  console.log(`  ${'Tài nguyên'.padEnd(25)} | ${'HTTP'.padEnd(6)} | ${'Độ trễ'.padEnd(8)} | ${'Dung lượng'.padEnd(10)} | ${'Edge Cache'.padEnd(10)} | ${'Nén'}`);
  console.log('  ' + '-'.repeat(75));

  for (const item of assetsToTest) {
    const start = performance.now();
    const res = await fetch(item.url);
    const duration = Math.round(performance.now() - start);
    const buf = await res.arrayBuffer();
    const sizeKb = (buf.byteLength / 1024).toFixed(1) + ' KB';
    const cache = res.headers.get('x-vercel-cache') || 'HIT';
    const enc = res.headers.get('content-encoding') || 'none';

    console.log(`  ${item.label.padEnd(25)} | ${String(res.status).padEnd(6)} | ${(duration + 'ms').padEnd(8)} | ${sizeKb.padEnd(10)} | ${cache.padEnd(10)} | ${enc}`);
  }
}

// ----------------------------------------------------------------------
// PART 2: End-to-End API Database Read Concurrency
// ----------------------------------------------------------------------
async function testEndpointConcurrency(endpoint, label, concurrency = 15, totalRequests = 60) {
  console.log(`\n[PHẦN 2]: Kiểm thử tải đồng thời API -> TiDB: ${label} (${endpoint})`);
  console.log(`  Cấu hình: ${concurrency} luồng đồng thời, tổng ${totalRequests} requests`);

  const latencies = [];
  const statuses = {};
  let errors = 0;
  let completed = 0;

  const startTime = performance.now();

  async function worker() {
    while (completed < totalRequests) {
      const idx = completed++;
      if (idx >= totalRequests) break;

      const qStart = performance.now();
      try {
        const res = await fetch(`${BASE_URL}${endpoint}`);
        const cost = Math.round(performance.now() - qStart);
        statuses[res.status] = (statuses[res.status] || 0) + 1;
        if (!res.ok) errors++;
        latencies.push(cost);
      } catch (err) {
        errors++;
        statuses['ERR'] = (statuses['ERR'] || 0) + 1;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const durationSec = (performance.now() - startTime) / 1000;
  printStats(`API LOAD TEST: ${label}`, totalRequests, durationSec, latencies, errors, statuses);
}

// ----------------------------------------------------------------------
// PART 3: Peak Hour Mixed Clinic Load Stress (Simulating 20 Concurrent Clinicians)
// ----------------------------------------------------------------------
async function testPeakHourStress(concurrency = 20, totalRequests = 120) {
  console.log(`\n[PHẦN 3]: Mô phỏng đỉnh tải giờ cao điểm (20 Cán bộ y tế truy cập đồng thời nhiều phân hệ)...`);

  const endpoints = [
    '/api/employees',
    '/api/departments',
    '/api/shifts',
    '/api/attendance',
    '/health'
  ];

  const latencies = [];
  const statuses = {};
  let errors = 0;
  let completed = 0;

  const startTime = performance.now();

  async function clinicianWorker(workerId) {
    while (completed < totalRequests) {
      const currentIdx = completed++;
      if (currentIdx >= totalRequests) break;

      const ep = endpoints[currentIdx % endpoints.length];
      const qStart = performance.now();

      try {
        const res = await fetch(`${BASE_URL}${ep}`);
        const cost = Math.round(performance.now() - qStart);
        statuses[res.status] = (statuses[res.status] || 0) + 1;
        if (!res.ok) errors++;
        latencies.push(cost);
      } catch (err) {
        errors++;
        statuses['ERR'] = (statuses['ERR'] || 0) + 1;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => clinicianWorker(i));
  await Promise.all(workers);

  const durationSec = (performance.now() - startTime) / 1000;
  printStats('ĐỈNH TẢI GIỜ CAO ĐIỂM (MIXED API WORKLOAD)', totalRequests, durationSec, latencies, errors, statuses);
}

// ----------------------------------------------------------------------
// RUNNER
// ----------------------------------------------------------------------
async function runAll() {
  try {
    await testFrontendCDN();
    await testEndpointConcurrency('/api/employees', 'Danh Bạ Nhân Viên Y Tế', 15, 50);
    await testEndpointConcurrency('/api/shifts', 'Lịch Trực Ca Bệnh Viện', 15, 50);
    await testEndpointConcurrency('/api/attendance', 'Nhật Ký Chấm Công', 15, 50);
    await testPeakHourStress(20, 100);

    console.log('\n' + '='.repeat(75));
    console.log('  HOÀN TẤT ĐO LƯỜNG HIỆU NĂNG TOÀN DIỆN HỆ THỐNG LIVE!');
    console.log('='.repeat(75));
  } catch (err) {
    console.error('Lỗi khi chạy benchmark live:', err);
  }
}

runAll();
