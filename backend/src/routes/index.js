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

const router = Router();

// System Health Probe
router.use('/', healthRoutes);

// Licenses Direct Routes
router.get('/api/licenses', employeeController.getAllLicenses);
router.post('/api/licenses', employeeController.createLicense);
router.get('/api/v1/licenses', employeeController.getAllLicenses);
router.post('/api/v1/licenses', employeeController.createLicense);

// Department Catalog & Details Routes
router.use('/api/departments', departmentRoutes);
router.use('/api/v1/departments', departmentRoutes);

// Employee & Credentialing Routes
router.use('/api/employees', employeeRoutes);
router.use('/api/v1/employees', employeeRoutes);

// 24/7 Rostering & Shift Management Routes
router.use('/api/shifts', shiftRoutes);
router.use('/api/v1/shifts', shiftRoutes);

// Attendance & Clock-In/Out Routes
router.use('/api/attendance', attendanceRoutes);
router.use('/api/v1/attendance', attendanceRoutes);

// Leave Requests Management
router.use('/api/leave', leaveRoutes);
router.use('/api/v1/leave', leaveRoutes);

// Leave Balance Quotas
router.use('/api/leave-balances', leaveBalanceRoutes);
router.use('/api/v1/leave-balances', leaveBalanceRoutes);

// Payroll, Differentials & Direct Deposit Elections
router.use('/api/payroll', payrollRoutes);
router.use('/api/v1/payroll', payrollRoutes);

// Notifications & Clinical Broadcast Feeds
router.use('/api/notifications', notificationRoutes);
router.use('/api/v1/notifications', notificationRoutes);

// Daily Task Management Routes
router.use('/api/tasks', taskRoutes);
router.use('/api/v1/tasks', taskRoutes);

// Clinical Shift Handover & Checklist Routes
router.use('/api/handovers', handoverRoutes);
router.use('/api/v1/handovers', handoverRoutes);

// Authentication & Account Management Routes
router.use('/api/auth', authRoutes);
router.use('/api/v1/auth', authRoutes);

// Hospital HR & Enterprise System Admin Routes
router.use('/api/admin', adminRoutes);
router.use('/api/v1/admin', adminRoutes);

export default router;
