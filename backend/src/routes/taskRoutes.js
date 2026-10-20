import { Router } from 'express';
import { taskController } from '../controllers/taskController.js';

const router = Router();

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new daily clinical or administrative task
 *     tags:
 *       - Daily Tasks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - assigned_to
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Morning ICU Ventilator Checks"
 *               description:
 *                 type: string
 *                 example: "Perform morning calibration across all 12 beds in ICU."
 *               assigned_to:
 *                 type: string
 *                 example: "EMP-DOC-002"
 *               assigned_by:
 *                 type: string
 *                 example: "EMP-DOC-001"
 *               shift_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-4111-8111-111111111111"
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELLED]
 *                 example: "PENDING"
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-20 10:00:00"
 *     responses:
 *       201:
 *         description: Daily task created successfully
 *       400:
 *         description: Validation error
 *   get:
 *     summary: List all daily tasks with filters
 *     tags:
 *       - Daily Tasks
 *     parameters:
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *         description: Staff code assigned to task
 *       - in: query
 *         name: assigned_by
 *         schema:
 *           type: string
 *         description: Staff code who assigned the task
 *       - in: query
 *         name: shift_id
 *         schema:
 *           type: string
 *         description: Associated shift ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Task list retrieved successfully
 */
router.post('/', taskController.createTask);
router.get('/', taskController.getAllTasks);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get daily task by ID
 *     tags:
 *       - Daily Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task record retrieved
 *       404:
 *         description: Task not found
 *   put:
 *     summary: Update daily task
 *     tags:
 *       - Daily Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELLED]
 *               due_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 *   patch:
 *     summary: Partially update daily task
 *     tags:
 *       - Daily Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 *   delete:
 *     summary: Delete daily task by ID
 *     tags:
 *       - Daily Tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

export default router;
