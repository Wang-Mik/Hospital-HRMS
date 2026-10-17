import { Router } from 'express';
import notificationController from '../controllers/notificationController.js';

const router = Router();

/**
 * @swagger
 * /api/notifications/{staff_id}:
 *   get:
 *     summary: Retrieve notifications for a staff member
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification list retrieved successfully
 */
router.get('/', notificationController.getAllNotifications);
router.patch('/:staff_id/mark-all-read', notificationController.markAllAsRead);
router.get('/:staff_id', notificationController.getNotificationsByStaffId);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', notificationController.markNotificationAsRead);

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a notification
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_staff_id
 *               - title
 *               - message
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Validation error or missing fields
 */
router.post('/', notificationController.createNotification);

export default router;
