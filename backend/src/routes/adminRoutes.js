import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// Enterprise System Admin Routes - Protected by JWT
router.use(verifyToken);

// Allow both Executive Board (SUPER_ADMIN) and HR Director (HR_MANAGER) to read system overview statistics for Dashboard
router.get('/overview', requireRole('SUPER_ADMIN', 'HR_MANAGER'), adminController.getOverview);

// Strictly protect all administrative operations, IAM accounts, and role modifications for SUPER_ADMIN only
router.use(requireRole('SUPER_ADMIN'));

router.get('/accounts', adminController.getAllAccounts);
router.patch('/accounts/:id/lock', adminController.toggleAccountLock);
router.patch('/accounts/:id/role', adminController.updateAccountRole);
router.post('/accounts/:id/reset-password', adminController.resetPassword);
router.get('/roles', adminController.getAllRoles);
router.post('/broadcast', adminController.broadcastNotification);
router.post('/onboard', adminController.adminOnboardStaff);

export default router;
