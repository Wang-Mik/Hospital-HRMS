import { Router } from 'express';
import adminController from '../controllers/adminController.js';

const router = Router();

router.get('/overview', adminController.getOverview);
router.get('/accounts', adminController.getAllAccounts);
router.patch('/accounts/:id/lock', adminController.toggleAccountLock);
router.patch('/accounts/:id/role', adminController.updateAccountRole);
router.post('/accounts/:id/reset-password', adminController.resetPassword);
router.get('/roles', adminController.getAllRoles);
router.post('/broadcast', adminController.broadcastNotification);
router.post('/onboard', adminController.adminOnboardStaff);

export default router;
