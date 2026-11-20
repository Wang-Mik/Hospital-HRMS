import { Router } from 'express';
import { surgeDispatchController } from '../controllers/surgeDispatchController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';
import { ROLE_GROUPS } from '../constants/roles.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createDispatchSchema,
  logCallSchema,
  resolveDispatchSchema
} from '../validations/surgeDispatchValidation.js';

const router = Router();
const canDispatchSurge = requireRole(...ROLE_GROUPS.SURGE_DISPATCHERS);

// Candidate recommendation query
router.get(
  '/candidates/:departmentCode',
  verifyToken,
  canDispatchSurge,
  surgeDispatchController.getCandidates
);

// Create surge dispatch session
router.post(
  '/',
  verifyToken,
  canDispatchSurge,
  validateRequest({ body: createDispatchSchema }),
  surgeDispatchController.createDispatch
);

// Get active surge dispatches
router.get(
  '/active',
  verifyToken,
  surgeDispatchController.getActiveDispatches
);

// Dispatcher logs call result
router.post(
  '/:id/log-call',
  verifyToken,
  canDispatchSurge,
  validateRequest({ body: logCallSchema }),
  surgeDispatchController.logCallResult
);

// Resolve surge dispatch session
router.post(
  '/:id/resolve',
  verifyToken,
  canDispatchSurge,
  validateRequest({ body: resolveDispatchSchema }),
  surgeDispatchController.resolveDispatch
);

export default router;
