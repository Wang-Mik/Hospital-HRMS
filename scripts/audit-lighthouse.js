import { spawn, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PAGES = [
  { name: 'Login Page', path: '/login', isPublic: true },
  { name: 'Dashboard', path: '/', isPublic: false },
  { name: 'System Management', path: '/admin', isPublic: false },
  { name: 'HR Management', path: '/hr', isPublic: false },
  { name: 'Notifications', path: '/notifications', isPublic: false },
  { name: 'Personal Profile', path: '/profile', isPublic: false },
  { name: 'Shift Rostering', path: '/shifts', isPublic: false },
  { name: 'Attendance Clock', path: '/attendance', isPublic: false },
  { name: 'Shift Handovers', path: '/handovers', isPublic: false },
  { name: 'Daily Briefings', path: '/briefings', isPublic: false },
  { name: 'Daily Tasks', path: '/tasks', isPublic: false },
  { name: 'Time Off Leaves', path: '/leave', isPublic: false },
  { name: 'Staff Directory', path: '/employees', isPublic: false },
  { name: 'Medical Licenses', path: '/licenses', isPublic: false },
  { name: 'Payroll Management', path: '/payroll', isPublic: false }
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const CDP_PORT = 9222;

const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCdp(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      // retry
    }
    await sleep(200);
  }
  throw new Error('Chrome CDP failed to respond on port ' + CDP_PORT);
}

async function injectAuth(token, user) {
  const newTabRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${BASE_URL}/login`, { method: 'PUT' });
  const tab = await newTabRes.json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await sleep(1000);

  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user))});
    `
  });

  await send('Network.clearBrowserCache');
  ws.close();
}

async function clearHttpCache() {
  try {
    const tabsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
    const tabs = await tabsRes.json();
    const targetTab = tabs.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!targetTab) return;
    const ws = new WebSocket(targetTab.webSocketDebuggerUrl);
    await new Promise((resolve) => {
      ws.onopen = resolve;
    });
    await new Promise((resolve) => {
      const handler = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === 99) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: 99, method: 'Network.clearBrowserCache', params: {} }));
    });
    ws.close();
  } catch {
    // ignore
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log(' HOSPITAL HRMS - MULTI-PAGE LIGHTHOUSE AUDIT RUNNER');
  console.log(' Base URL:', BASE_URL);
  console.log(' Backend URL:', BACKEND_URL);
  console.log('='.repeat(70));

  // 1. Get IAM Admin Auth Token
  console.log('\n[1/4] Authenticating with Hospital IAM...');
  let token = null;
  let user = null;
  try {
    const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    token = loginData.data.token;
    user = {
      employee_code: loginData.data.employee.employee_code,
      role: loginData.data.employee.role,
      name: `${loginData.data.employee.last_name} ${loginData.data.employee.first_name}`.trim()
    };
    console.log(` Authenticated as: ${user.name} (${user.role})`);
  } catch (err) {
    console.error(' Failed to authenticate with backend:', err.message);
    process.exit(1);
  }

  // 2. Launch Dedicated Headless Chrome for Auditing
  console.log('\n[2/4] Spawning Headless Chrome for CDP...');
  const tmpProfile = path.join(os.tmpdir(), `lh_audit_profile_${Date.now()}`);
  fs.mkdirSync(tmpProfile, { recursive: true });

  const chromeProc = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      '--headless=new',
      `--user-data-dir=${tmpProfile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--window-size=1440,900'
    ],
    { stdio: 'ignore' }
  );

  const results = [];
  const reportPath = path.resolve('docs', 'reports', 'lighthouse_report.json');

  try {
    await waitForCdp();
    console.log(' Chrome DevTools Protocol is ready on port', CDP_PORT);

    // 3. Inject IAM Token
    console.log('\n[3/4] Injecting authentication credentials into Chrome session...');
    await injectAuth(token, user);
    console.log(' Credentials stored in browser session.');

    // 4. Audit each page sequentially
    console.log('\n[4/4] Executing Lighthouse audits across all 15 pages...\n');
    console.log(
      '┌────┬─────────────────────────────┬──────────┬──────────┬──────────┬──────────┬────────┐'
    );
    console.log(
      '│ STT│ Trang Nghiệp Vụ             │  Perf    │  A11y    │  B.Pract │   SEO    │ Status │'
    );
    console.log(
      '├────┼─────────────────────────────┼──────────┼──────────┼──────────┼──────────┼────────┤'
    );

    for (let i = 0; i < PAGES.length; i++) {
      const page = PAGES[i];
      const targetUrl = `${BASE_URL}${page.path}`;
      const tempOut = path.join(os.tmpdir(), `lh_res_${Date.now()}_${i}.json`);

      await clearHttpCache();

      const cmd = `npx lighthouse ${targetUrl} --port=${CDP_PORT} --disable-storage-reset --preset=desktop --only-categories=performance,accessibility,best-practices,seo --output=json --output-path="${tempOut}" --quiet`;

      try {
        execSync(cmd, { stdio: 'pipe' });
        const data = JSON.parse(fs.readFileSync(tempOut, 'utf8'));
        try { fs.unlinkSync(tempOut); } catch {}

        const perf = Math.round(data.categories.performance?.score * 100 || 0);
        const a11y = Math.round(data.categories.accessibility?.score * 100 || 0);
        const bp = Math.round(data.categories['best-practices']?.score * 100 || 0);
        const seo = Math.round(data.categories.seo?.score * 100 || 0);

        const fcp = data.audits['first-contentful-paint']?.displayValue || '';
        const lcp = data.audits['largest-contentful-paint']?.displayValue || '';
        const tbt = data.audits['total-blocking-time']?.displayValue || '';
        const cls = data.audits['cumulative-layout-shift']?.displayValue || '';

        const isGreen = perf >= 90 && a11y >= 90 && bp >= 90 && seo >= 90;
        const status = isGreen ? ' PASS ' : ' CHECK';

        const row = `│ ${String(i + 1).padStart(2, ' ')} │ ${page.name.padEnd(27, ' ')} │   ${String(perf).padStart(3, ' ')}%   │   ${String(a11y).padStart(3, ' ')}%   │   ${String(bp).padStart(3, ' ')}%   │   ${String(seo).padStart(3, ' ')}%   │ ${status} │`;
        console.log(row);

        results.push({
          index: i + 1,
          name: page.name,
          path: page.path,
          scores: { performance: perf, accessibility: a11y, bestPractices: bp, seo },
          metrics: { fcp, lcp, tbt, cls },
          auditsFailed: Object.values(data.audits)
            .filter((a) => a.score !== null && a.score < 0.9)
            .map((a) => ({ id: a.id, title: a.title, score: a.score, displayValue: a.displayValue }))
        });
      } catch (err) {
        console.log(
          `│ ${String(i + 1).padStart(2, ' ')} │ ${page.name.padEnd(27, ' ')} │  ERR     │  ERR     │  ERR     │  ERR     │  FAIL  │`
        );
        results.push({
          index: i + 1,
          name: page.name,
          path: page.path,
          error: err.message
        });
      }
    }

    console.log(
      '└────┴─────────────────────────────┴──────────┴──────────┴──────────┴──────────┴────────┘'
    );

    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n Audit report saved to: ${reportPath}`);

  } finally {
    try {
      chromeProc.kill();
    } catch {}
    try {
      fs.rmSync(tmpProfile, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
