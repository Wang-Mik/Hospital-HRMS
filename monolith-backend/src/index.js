import app from './app.js';
import { testConnection } from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 4000;

async function bootstrap() {
  console.log('====================================================');
  console.log(' Starting Hospital HRMS Unified Monolithic Service');
  console.log('====================================================');

  // Verify MySQL Connection Pool
  await testConnection();

  app.listen(PORT, () => {
    console.log(`[Monolith Server] Listening on http://localhost:${PORT}`);
    console.log(`[Swagger UI] API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`[Health Probe] System Liveness endpoint at http://localhost:${PORT}/health`);
  });
}

bootstrap().catch((err) => {
  console.error('[Fatal Bootstrap Error]:', err);
  process.exit(1);
});
