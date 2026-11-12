import { Router } from 'express';
import pool, { testConnection } from '../db.js';
import { getMetricsSnapshot, getMetricsContentType } from '../metrics/metricsRegistry.js';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: System Health & Database Liveness Probe
 *     description: Checks the status of the Backend Service and MySQL database connection pool.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: System and database are fully operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: UP
 *                 service:
 *                   type: string
 *                   example: backend
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: connected
 *                     name:
 *                       type: string
 *                       example: hrm_db
 *       503:
 *         description: Database connectivity check failed
 */
router.get('/health', async (req, res) => {
  const isDbConnected = await testConnection();

  if (!isDbConnected) {
    return res.status(503).json({
      status: 'DOWN',
      service: 'backend',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        name: process.env.DB_NAME || 'hrm_db'
      }
    });
  }

  return res.status(200).json({
    status: 'UP',
    service: 'backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: 'connected',
      name: process.env.DB_NAME || 'hrm_db'
    }
  });
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus Monitoring & Metrics Scraping Endpoint
 *     description: Returns application and database performance metrics in Prometheus exposition format.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Metrics data in Prometheus text format
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/metrics', async (req, res) => {
  try {
    const metricsData = await getMetricsSnapshot();
    res.setHeader('Content-Type', getMetricsContentType());
    return res.status(200).send(metricsData);
  } catch (error) {
    console.error('[Metrics Scrape Error]:', error);
    return res.status(500).send('# Error collecting Prometheus metrics\n');
  }
});

export default router;
