import { Router } from 'express';
import payrollController from '../controllers/payrollController.js';

const router = Router();

/**
 * @swagger
 * /api/payroll/runs:
 *   post:
 *     summary: Initiate a payroll run
 *     tags:
 *       - Payroll Runs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start_date
 *               - end_date
 *     responses:
 *       201:
 *         description: Payroll run created successfully
 *       400:
 *         description: Missing mandatory dates
 *   get:
 *     summary: List all payroll runs
 *     tags:
 *       - Payroll Runs
 *     responses:
 *       200:
 *         description: Payroll run list retrieved successfully
 */
router.post('/runs', payrollController.createPayrollRun);
router.post('/run', payrollController.createPayrollRun);
router.get('/runs', payrollController.getAllPayrollRuns);
router.patch('/runs/:id/status', payrollController.updatePayrollRunStatus);
router.post('/runs/generate', payrollController.generatePayrollRun);

/**
 * @swagger
 * /api/payroll/runs/{id}:
 *   get:
 *     summary: Get payroll run by ID
 *     tags:
 *       - Payroll Runs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payroll run details
 *       404:
 *         description: Payroll run not found
 */
router.get('/runs/:id', payrollController.getPayrollRunById);

/**
 * @swagger
 * /api/payroll/payslips/{staff_id}:
 *   get:
 *     summary: Get pay slips for staff member
 *     tags:
 *       - Pay Slips
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pay slip history
 */
router.get('/payslips/:staff_id', payrollController.getPaySlipsByStaffId);
router.get('/staff/:staff_id/payslips', payrollController.getPaySlipsByStaffId);
router.get('/rates', payrollController.getAllPayRates);
router.get('/rates/:staff_id', payrollController.getPayRateByStaffId);
router.put('/rates/:staff_id', payrollController.updatePayRate);

/**
 * @swagger
 * /api/payroll/payslips:
 *   post:
 *     summary: Create pay slip record
 *     tags:
 *       - Pay Slips
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - run_id
 *               - staff_id
 *     responses:
 *       201:
 *         description: Pay slip created successfully
 *       400:
 *         description: Missing run_id or staff_id
 */
router.post('/payslips', payrollController.createPaySlip);

/**
 * @swagger
 * /api/payroll/elections:
 *   post:
 *     summary: Add payment election (direct deposit)
 *     tags:
 *       - Payment Elections
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - bank_name
 *               - account_number
 *               - routing_number
 *     responses:
 *       201:
 *         description: Payment election created successfully
 *       400:
 *         description: Missing mandatory bank election fields
 * 
 * /api/payroll/elections/{staff_id}:
 *   get:
 *     summary: Get payment elections for staff member
 *     tags:
 *       - Payment Elections
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment elections list
 */
router.post('/elections', payrollController.addPaymentElection);
router.get('/elections/:staff_id', payrollController.getPaymentElectionsByStaffId);

export default router;
