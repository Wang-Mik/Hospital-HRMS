import { Router } from 'express';
import { shiftController } from '../controllers/shiftController.js';
import { verifyToken, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

/**
 * @swagger
 * /api/shifts:
 *   post:
 *     summary: Schedule a new shift
 *     tags:
 *       - Shifts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - department_id
 *               - start_time
 *               - end_time
 *             properties:
 *               staff_id:
 *                 type: string
 *                 example: EMP-DOC-001
 *               department_id:
 *                 type: integer
 *                 example: 1
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-20 07:00:00"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-20 15:30:00"
 *     responses:
 *       201:
 *         description: Shift scheduled successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Shift conflict
 *   get:
 *     summary: List all shifts
 *     tags:
 *       - Shifts
 *     parameters:
 *       - in: query
 *         name: staff_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: department_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shift list retrieved successfully
 */
router.post('/auto-rotate', verifyToken, requireRole('HR_MANAGER', 'SUPER_ADMIN'), shiftController.autoRotateTeams);
router.post('/batch', verifyToken, requireRole('HR_MANAGER', 'SUPER_ADMIN'), shiftController.batchScheduleShifts);
router.get('/departments/:code/delegate', verifyToken, shiftController.getDepartmentRosterDelegate);
router.post('/departments/:code/delegate', verifyToken, requireRole('DEPARTMENT_HEAD', 'HR_MANAGER', 'SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'HEAD_OF_HR'), shiftController.setDepartmentRosterDelegate);
router.post('/approve-batch', verifyToken, requireRole('DEPARTMENT_HEAD', 'HR_MANAGER', 'SUPER_ADMIN', 'HOSPITAL_DIRECTOR', 'HEAD_OF_HR'), shiftController.approveDepartmentShifts);
router.get('/fill-gap/candidates', verifyToken, requireRole('DEPARTMENT_HEAD', 'HR_MANAGER', 'SUPER_ADMIN'), shiftController.getFillGapCandidates);
router.post('/fill-gap/dispatch', verifyToken, requireRole('DEPARTMENT_HEAD', 'HR_MANAGER', 'SUPER_ADMIN'), shiftController.dispatchSurgeCover);
router.post('/:id/overrun', verifyToken, requireRole('DOCTOR', 'NURSE', 'DEPARTMENT_HEAD', 'HR_MANAGER', 'SUPER_ADMIN'), shiftController.recordShiftOverrun);
router.post('/', verifyToken, shiftController.scheduleShift);
router.get('/', verifyToken, shiftController.getAllShifts);

/**
 * @swagger
 * /api/shifts/{id}:
 *   get:
 *     summary: Get shift by ID
 *     tags:
 *       - Shifts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shift record retrieved
 *       404:
 *         description: Shift not found
 */
router.get('/:id', verifyToken, shiftController.getShiftById);
router.delete('/:id', verifyToken, requireRole('HR_MANAGER', 'SUPER_ADMIN'), shiftController.deleteShift);

export default router;
