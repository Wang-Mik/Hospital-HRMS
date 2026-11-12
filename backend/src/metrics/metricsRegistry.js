import client from 'prom-client';
import { getPoolStats } from '../db.js';

// Dedicated Prometheus registry for HRMS-WPT
export const register = new client.Registry();

// Add default system metrics (CPU, RAM, Event Loop lag, File descriptors)
client.collectDefaultMetrics({
  register,
  prefix: 'hospital_hrm_'
});

// Custom Metrics: HTTP Request Counter
export const httpRequestsTotal = new client.Counter({
  name: 'hospital_hrm_http_requests_total',
  help: 'Total number of HTTP requests processed by HRMS-WPT backend',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Custom Metrics: HTTP Request Duration Histogram
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'hospital_hrm_http_request_duration_seconds',
  help: 'Histogram of HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

// Custom Metrics: In-flight Active HTTP Requests
export const httpActiveRequests = new client.Gauge({
  name: 'hospital_hrm_http_active_requests',
  help: 'Number of currently active in-flight HTTP requests',
  labelNames: ['method'],
  registers: [register]
});

// Custom Metrics: MySQL Connection Pool
export const mysqlPoolGauge = new client.Gauge({
  name: 'hospital_hrm_mysql_pool_connections',
  help: 'Real-time state of the MySQL single connection pool',
  labelNames: ['state'], // 'active', 'free', 'queued'
  registers: [register]
});

/**
 * Normalizes dynamic paths to prevent Prometheus high-cardinality label explosion
 * e.g., /api/v1/employees/12 -> /api/v1/employees/:id
 * e.g., /api/v1/attendance/550e8400-e29b-41d4-a716-446655440000 -> /api/v1/attendance/:id
 * @param {import('express').Request} req
 * @returns {string}
 */
export function normalizeRoute(req) {
  if (req.route?.path) {
    const base = req.baseUrl || '';
    return `${base}${req.route.path}`;
  }

  const rawUrl = (req.originalUrl || req.url || '/').split('?')[0];

  return rawUrl
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/\d{4}-\d{2}-\d{2}(?=\/|$)/g, '/:date');
}

/**
 * Update MySQL connection pool gauges prior to Prometheus scrape
 */
export function updatePoolMetrics() {
  try {
    const stats = getPoolStats();
    const active = Math.max(0, stats.all - stats.free);
    mysqlPoolGauge.set({ state: 'active' }, active);
    mysqlPoolGauge.set({ state: 'free' }, stats.free);
    mysqlPoolGauge.set({ state: 'queued' }, stats.queued);
  } catch (err) {
    // Non-fatal: in mock/test environment stats might not exist
  }
}

/**
 * Express middleware to record HTTP metrics
 */
export function metricsMiddleware(req, res, next) {
  // Exclude scraping endpoint itself to prevent skewing
  if (req.path === '/metrics' || req.originalUrl === '/metrics') {
    return next();
  }

  const startTime = process.hrtime();
  httpActiveRequests.inc({ method: req.method });

  res.on('finish', () => {
    httpActiveRequests.dec({ method: req.method });

    const diff = process.hrtime(startTime);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const route = normalizeRoute(req);
    const statusCode = String(res.statusCode);

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: statusCode
    });

    httpRequestDurationSeconds.observe(
      {
        method: req.method,
        route,
        status_code: statusCode
      },
      durationSeconds
    );
  });

  next();
}

/**
 * Returns formatted Prometheus text snapshot
 * @returns {Promise<string>}
 */
export async function getMetricsSnapshot() {
  updatePoolMetrics();
  return register.metrics();
}

/**
 * Returns Prometheus content type header
 * @returns {string}
 */
export function getMetricsContentType() {
  return register.contentType;
}
