import { Router } from 'express';
import { kpiController } from '../controllers/kpiController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/my-history', verifyToken, kpiController.getMyKpiHistory);
router.post('/auto-compute', verifyToken, requireRole('HR_MANAGER', 'SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'HEAD_OF_HR', 'DEPARTMENT_HEAD', 'CHIEF_NURSE'), kpiController.autoComputeMonthlyKpi);
router.post('/evaluate', verifyToken, requireRole('HR_MANAGER', 'SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'HEAD_OF_HR', 'DEPARTMENT_HEAD', 'CHIEF_NURSE'), kpiController.saveKpiEvaluation);
router.get('/', verifyToken, kpiController.getMonthlyKpis);

export default router;
