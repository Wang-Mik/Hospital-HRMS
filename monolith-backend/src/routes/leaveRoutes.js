import { Router } from 'express';
import leaveController from '../controllers/leaveController.js';

const router = Router();

/**
 * @swagger
 * /api/leave:
 *   post:
 *     summary: Submit leave request
 *     tags:
 *       - Leave Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - start_date
 *               - end_date
 *             properties:
 *               staff_id:
 *                 type: string
 *               start_date:
 *                 type: string
 *               end_date:
 *                 type: string
 *               leave_type:
 *                 type: string
 *                 default: ANNUAL
 *     responses:
 *       201:
 *         description: Leave request submitted
 *       400:
 *         description: Missing fields or invalid date range
 *   get:
 *     summary: List all leave requests
 *     tags:
 *       - Leave Management
 *     responses:
 *       200:
 *         description: Leave request list
 */
router.post('/', leaveController.submitLeaveRequest);
router.get('/', leaveController.getAllLeaveRequests);
router.patch('/requests/:id/status', leaveController.updateLeaveRequestStatus);
router.patch('/:id/status', leaveController.updateLeaveRequestStatus);

/**
 * @swagger
 * /api/leave/{staff_id}:
 *   get:
 *     summary: Get leave history for a staff member
 *     tags:
 *       - Leave Management
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Staff leave history
 */
router.get('/:staff_id', leaveController.getLeaveHistoryByStaffId);

/**
 * @swagger
 * /api/leave/balances/{staff_id}/{year}:
 *   get:
 *     summary: Get staff leave balances by year
 *     tags:
 *       - Leave Management
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Leave balance records
 */
router.get('/balances/:staff_id/:year', leaveController.getLeaveBalancesByStaffIdAndYear);
router.get('/balances/:staff_id', leaveController.getLeaveBalancesByStaffIdAndYear);

export default router;
