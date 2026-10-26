import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import shiftRoutes from './shiftRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import leaveBalanceRoutes from './leaveBalanceRoutes.js';
import payrollRoutes from './payrollRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import taskRoutes from './taskRoutes.js';
import handoverRoutes from './handoverRoutes.js';
import authRoutes from './authRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import adminRoutes from './adminRoutes.js';
import { employeeController } from '../controllers/employeeController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// Public Routes: System Health Probe & Authentication
router.use('/', healthRoutes);
router.use('/api/auth', authRoutes);
router.use('/api/v1/auth', authRoutes);

// Protected Clinical & Operational Routes (Requiring Valid JWT Token)
// Licenses Direct Routes
router.get('/api/licenses', verifyToken, employeeController.getAllLicenses);
router.post('/api/licenses', verifyToken, employeeController.createLicense);
router.get('/api/v1/licenses', verifyToken, employeeController.getAllLicenses);
router.post('/api/v1/licenses', verifyToken, employeeController.createLicense);

// Department Catalog & Details Routes
router.use('/api/departments', verifyToken, departmentRoutes);
router.use('/api/v1/departments', verifyToken, departmentRoutes);

// Employee & Credentialing Routes
router.use('/api/employees', verifyToken, employeeRoutes);
router.use('/api/v1/employees', verifyToken, employeeRoutes);

// 24/7 Rostering & Shift Management Routes
router.use('/api/shifts', shiftRoutes);
router.use('/api/v1/shifts', shiftRoutes);

// Attendance & Clock-In/Out Routes
router.use('/api/attendance', verifyToken, attendanceRoutes);
router.use('/api/v1/attendance', verifyToken, attendanceRoutes);

// Leave Requests Management
router.use('/api/leave', verifyToken, leaveRoutes);
router.use('/api/v1/leave', verifyToken, leaveRoutes);

// Leave Balance Quotas
router.use('/api/leave-balances', verifyToken, leaveBalanceRoutes);
router.use('/api/v1/leave-balances', verifyToken, leaveBalanceRoutes);

// Payroll, Differentials & Direct Deposit Elections
router.use('/api/payroll', verifyToken, payrollRoutes);
router.use('/api/v1/payroll', verifyToken, payrollRoutes);

// Notifications & Clinical Broadcast Feeds
router.use('/api/notifications', verifyToken, notificationRoutes);
router.use('/api/v1/notifications', verifyToken, notificationRoutes);

// Daily Task Management Routes
router.use('/api/tasks', verifyToken, taskRoutes);
router.use('/api/v1/tasks', verifyToken, taskRoutes);

// Clinical Shift Handover & Checklist Routes
router.use('/api/handovers', verifyToken, handoverRoutes);
router.use('/api/v1/handovers', verifyToken, handoverRoutes);

// Hospital HR & Enterprise System Admin Routes (Restricted to SUPER_ADMIN)
router.use('/api/admin', verifyToken, requireRole('SUPER_ADMIN'), adminRoutes);
router.use('/api/v1/admin', verifyToken, requireRole('SUPER_ADMIN'), adminRoutes);

export default router;
