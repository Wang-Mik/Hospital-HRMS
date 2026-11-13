import { Router } from 'express';
import { surgeDispatchController } from '../controllers/surgeDispatchController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createDispatchSchema,
  logCallSchema,
  resolveDispatchSchema
} from '../validations/surgeDispatchValidation.js';

const router = Router();

// Candidate recommendation query
router.get(
  '/candidates/:departmentCode',
  verifyToken,
  requireRole('DEPARTMENT_HEAD', 'DOCTOR', 'CHIEF_NURSE', 'SUPER_ADMIN', 'HR_MANAGER'),
  surgeDispatchController.getCandidates
);

// Create surge dispatch session
router.post(
  '/',
  verifyToken,
  requireRole('DEPARTMENT_HEAD', 'DOCTOR', 'CHIEF_NURSE', 'SUPER_ADMIN', 'HR_MANAGER'),
  validateRequest({ body: createDispatchSchema }),
  surgeDispatchController.createDispatch
);

// Get active surge dispatches
router.get(
  '/active',
  verifyToken,
  surgeDispatchController.getActiveDispatches
);

// Dispatcher logs call result from Cockpit
router.post(
  '/:id/log-call',
  verifyToken,
  requireRole('DEPARTMENT_HEAD', 'DOCTOR', 'CHIEF_NURSE', 'SUPER_ADMIN', 'HR_MANAGER'),
  validateRequest({ body: logCallSchema }),
  surgeDispatchController.logCallResult
);

// Resolve surge dispatch session
router.post(
  '/:id/resolve',
  verifyToken,
  requireRole('DEPARTMENT_HEAD', 'DOCTOR', 'CHIEF_NURSE', 'SUPER_ADMIN', 'HR_MANAGER'),
  validateRequest({ body: resolveDispatchSchema }),
  surgeDispatchController.resolveDispatch
);

export default router;
