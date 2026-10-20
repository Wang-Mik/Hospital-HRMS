import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import setupSwagger from './swagger.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Global Error Handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Unhandled Backend Error]:', err);
  }
  res.status(err.status || err.statusCode || 500).json({
    status: err.status || err.statusCode || 500,
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred on the HRMS Service'
  });
});

export default app;
