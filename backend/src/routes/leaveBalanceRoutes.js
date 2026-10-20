import { Router } from 'express';
import leaveController from '../controllers/leaveController.js';

const router = Router();

/**
 * @swagger
 * /api/leave-balances/{staff_id}/{year}:
 *   get:
 *     summary: Get leave balance by staff ID and year
 *     tags:
 *       - Leave Balances
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
 *         description: Leave balance data
 */
router.get('/:staff_id/:year', leaveController.getLeaveBalancesByStaffIdAndYear);
router.get('/:staff_id', leaveController.getLeaveBalancesByStaffIdAndYear);

/**
 * @swagger
 * /api/leave-balances:
 *   post:
 *     summary: Set or update leave balance quota
 *     tags:
 *       - Leave Balances
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - accrual_year
 *               - total_days
 *     responses:
 *       201:
 *         description: Leave balance quota saved
 *       400:
 *         description: Missing mandatory fields
 */
router.post('/', leaveController.setLeaveBalance);

export default router;
