import { Router } from 'express';
import { hrController } from '../controllers/hrController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';
import { ROLE_GROUPS } from '../constants/roles.js';

const router = Router();

const hrManagementRoles = ROLE_GROUPS.HR_OPERATIONS;
const hrApproverRoles = ROLE_GROUPS.HOSPITAL_APPROVERS;

router.get('/contracts', verifyToken, requireRole(...hrManagementRoles, 'DEPARTMENT_HEAD'), hrController.getContracts);
router.post('/contracts', verifyToken, requireRole(...hrManagementRoles), hrController.saveContract);

router.get('/insurances', verifyToken, requireRole(...hrManagementRoles), hrController.getInsurances);
router.put('/insurances/:staff_id', verifyToken, requireRole(...hrManagementRoles), hrController.updateInsurance);

router.get('/rewards-disciplines', verifyToken, hrController.getCommendationsDisciplines);
router.post('/rewards-disciplines', verifyToken, requireRole(...hrManagementRoles, 'DEPARTMENT_HEAD'), hrController.createCommendationDiscipline);

router.patch('/salary-increment/:staff_id', verifyToken, requireRole(...hrApproverRoles), hrController.updateSalaryIncrement);

export default router;
