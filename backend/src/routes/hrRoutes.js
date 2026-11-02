import { Router } from 'express';
import { hrController } from '../controllers/hrController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

const hrManagementRoles = [
  'SUPER_ADMIN',
  'HR_MANAGER',
  'HOSPITAL_DIRECTOR',
  'VICE_DIRECTOR',
  'HEAD_OF_HR'
];

router.get('/contracts', verifyToken, requireRole(...hrManagementRoles, 'DEPARTMENT_HEAD'), hrController.getContracts);
router.post('/contracts', verifyToken, requireRole(...hrManagementRoles), hrController.saveContract);

router.get('/insurances', verifyToken, requireRole(...hrManagementRoles), hrController.getInsurances);
router.put('/insurances/:staff_id', verifyToken, requireRole(...hrManagementRoles), hrController.updateInsurance);

router.get('/rewards-disciplines', verifyToken, hrController.getCommendationsDisciplines);
router.post('/rewards-disciplines', verifyToken, requireRole(...hrManagementRoles, 'DEPARTMENT_HEAD'), hrController.createCommendationDiscipline);

router.patch('/salary-increment/:staff_id', verifyToken, requireRole(...hrManagementRoles), hrController.updateSalaryIncrement);

export default router;
