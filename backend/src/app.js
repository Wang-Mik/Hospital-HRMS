import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import setupSwagger from './swagger.js';

dotenv.config();

const app = express();

// Security: Disable Express fingerprint header
app.disable('x-powered-by');

// Security: Helmet HTTP Headers (nosniff, frameguard, xssFilter)
app.use(
  helmet({
    contentSecurityPolicy: false, // Permit Swagger UI and local dashboard assets
    crossOriginEmbedderPolicy: false
  })
);

// Security: Dynamic & Strict CORS Configuration for Hospital Internal Services & Cloud Deployments
const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'https://hospital-hrms.vercel.app'
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

const allowedOrigins = [...defaultOrigins, ...envOrigins];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., unit test runners, server-to-server, curl)
      if (!origin) {
        return callback(null, true);
      }

      // Allow exact match or official Vercel preview domains (*.vercel.app)
      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/([a-z0-9-]+)\.vercel\.app$/i.test(origin)
      ) {
        return callback(null, true);
      }

      const corsError = new Error('Yêu cầu bị chặn bởi chính sách CORS của Bệnh viện');
      corsError.statusCode = 403;
      return callback(corsError);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-enforce-auth']
  })
);

// Security: Cookie Parser for HttpOnly Session Management
app.use(cookieParser());

// Security: Payload size limits to mitigate JSON DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Swagger OpenAPI Documentation
setupSwagger(app);

// Mount All Backend Routes
app.use('/', routes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler (Sanitizes SQL error leakages in production)
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Unhandled Backend Error]:', err);
  }
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: statusCode,
    error: err.name || 'InternalServerError',
    message: isProd && statusCode === 500
      ? 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng liên hệ bộ phận hỗ trợ kỹ thuật.'
      : (err.message || 'An unexpected error occurred on the HRMS Service')
  });
});

export default app;
