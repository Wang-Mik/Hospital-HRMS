import { Router } from 'express';
import { kpiController } from '../controllers/kpiController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';
import { ROLE_GROUPS } from '../constants/roles.js';

const router = Router();

router.get('/my-history', verifyToken, kpiController.getMyKpiHistory);
router.post('/auto-compute', verifyToken, requireRole(...ROLE_GROUPS.KPI_EVALUATORS), kpiController.autoComputeMonthlyKpi);
router.post('/evaluate', verifyToken, requireRole(...ROLE_GROUPS.KPI_EVALUATORS), kpiController.saveKpiEvaluation);
router.get('/', verifyToken, kpiController.getMonthlyKpis);

export default router;
