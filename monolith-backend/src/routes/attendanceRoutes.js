import { Router } from 'express';
import { attendanceController } from '../controllers/attendanceController.js';

const router = Router();

/**
 * @swagger
 * /api/attendance/clock-in:
 *   post:
 *     summary: Clock in staff member
 *     tags:
 *       - Attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *             properties:
 *               staff_id:
 *                 type: string
 *                 example: EMP-DOC-001
 *               shift_id:
 *                 type: string
 *               clock_in_method:
 *                 type: string
 *                 default: KIOSK_TERMINAL
 *     responses:
 *       201:
 *         description: Clock-in recorded successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Staff member not assigned to shift
 *       404:
 *         description: Shift not found
 *       409:
 *         description: Active clock-in session exists
 */
router.post('/clock-in', attendanceController.clockIn);

/**
 * @swagger
 * /api/attendance/{id}/clock-out:
 *   post:
 *     summary: Clock out staff member
 *     tags:
 *       - Attendance
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clock-out recorded successfully
 *       400:
 *         description: Already clocked out
 *       404:
 *         description: Attendance record not found
 */
router.post('/:id/clock-out', attendanceController.clockOut);

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: List attendance records
 *     tags:
 *       - Attendance
 *     responses:
 *       200:
 *         description: List of attendance records
 */
router.get('/', attendanceController.getAllAttendances);

/**
 * @swagger
 * /api/attendance/{id}:
 *   get:
 *     summary: Get attendance record by ID
 *     tags:
 *       - Attendance
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attendance record details
 *       404:
 *         description: Attendance record not found
 */
router.get('/:id', attendanceController.getAttendanceById);

export default router;
