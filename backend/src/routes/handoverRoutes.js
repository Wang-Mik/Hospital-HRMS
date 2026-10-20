import { Router } from 'express';
import { handoverController } from '../controllers/handoverController.js';

const router = Router();

/**
 * @swagger
 * /api/handovers:
 *   post:
 *     summary: Create a new clinical shift handover report
 *     tags:
 *       - Shift Handovers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outgoing_shift_id
 *               - logged_by
 *             properties:
 *               outgoing_shift_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-4111-8111-111111111111"
 *               incoming_shift_id:
 *                 type: string
 *                 format: uuid
 *                 example: "22222222-2222-4222-8222-222222222222"
 *               critical_notes:
 *                 type: string
 *                 example: "Transferred 4 ICU admissions. Patient in Bed 4 scheduled for abdominal CT at 16:00."
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PENDING_SIGNATURE, COMPLETED]
 *                 example: "DRAFT"
 *               logged_by:
 *                 type: string
 *                 example: "EMP-DOC-001"
 *               acknowledged_by:
 *                 type: string
 *                 example: "EMP-NUR-001"
 *               checklists:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     item_description:
 *                       type: string
 *                       example: "Controlled substances count verified against safe log"
 *                     is_verified:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       201:
 *         description: Shift handover report created successfully
 *       400:
 *         description: Validation error
 *   get:
 *     summary: List all shift handover reports with filters
 *     tags:
 *       - Shift Handovers
 *     parameters:
 *       - in: query
 *         name: outgoing_shift_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: incoming_shift_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: logged_by
 *         schema:
 *           type: string
 *       - in: query
 *         name: acknowledged_by
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING_SIGNATURE, COMPLETED]
 *     responses:
 *       200:
 *         description: Handover reports list retrieved
 */
router.post('/', handoverController.createHandover);
router.get('/', handoverController.getAllHandovers);

/**
 * @swagger
 * /api/handovers/checklists/{itemId}:
 *   patch:
 *     summary: Update checklist item verification state
 *     tags:
 *       - Shift Handovers
 *     parameters:
 *       - in: path
 *         name: itemId
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
 *               is_verified:
 *                 type: boolean
 *               item_description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checklist item updated
 *       404:
 *         description: Item not found
 *   delete:
 *     summary: Delete checklist item
 *     tags:
 *       - Shift Handovers
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checklist item deleted
 *       404:
 *         description: Item not found
 */
router.patch('/checklists/:itemId', handoverController.updateChecklistItem);
router.delete('/checklists/:itemId', handoverController.deleteChecklistItem);

/**
 * @swagger
 * /api/handovers/{id}:
 *   get:
 *     summary: Get shift handover report by ID (including checklists)
 *     tags:
 *       - Shift Handovers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Handover report retrieved
 *       404:
 *         description: Handover not found
 *   put:
 *     summary: Update shift handover report
 *     tags:
 *       - Shift Handovers
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
 *               critical_notes:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PENDING_SIGNATURE, COMPLETED]
 *               incoming_shift_id:
 *                 type: string
 *               acknowledged_by:
 *                 type: string
 *     responses:
 *       200:
 *         description: Handover updated
 *       404:
 *         description: Handover not found
 *   patch:
 *     summary: Partially update shift handover report
 *     tags:
 *       - Shift Handovers
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
 *                 enum: [DRAFT, PENDING_SIGNATURE, COMPLETED]
 *     responses:
 *       200:
 *         description: Handover updated
 *       404:
 *         description: Handover not found
 *   delete:
 *     summary: Delete shift handover report
 *     tags:
 *       - Shift Handovers
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Handover deleted
 *       404:
 *         description: Handover not found
 */
router.get('/:id', handoverController.getHandoverById);
router.put('/:id', handoverController.updateHandover);
router.patch('/:id', handoverController.updateHandover);
router.delete('/:id', handoverController.deleteHandover);

/**
 * @swagger
 * /api/handovers/{id}/sign:
 *   post:
 *     summary: Acknowledge and sign a shift handover report
 *     tags:
 *       - Shift Handovers
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
 *             required:
 *               - acknowledged_by
 *             properties:
 *               acknowledged_by:
 *                 type: string
 *                 example: "EMP-NUR-001"
 *     responses:
 *       200:
 *         description: Shift handover acknowledged and completed
 *       400:
 *         description: Missing acknowledged_by
 *       404:
 *         description: Handover not found
 */
router.post('/:id/sign', handoverController.signHandover);

/**
 * @swagger
 * /api/handovers/{id}/checklists:
 *   post:
 *     summary: Add a safety verification checklist item to a handover
 *     tags:
 *       - Shift Handovers
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
 *             required:
 *               - item_description
 *             properties:
 *               item_description:
 *                 type: string
 *                 example: "Defibrillator and crash cart battery verified"
 *               is_verified:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Checklist item created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Handover not found
 */
router.post('/:id/checklists', handoverController.addChecklistItem);

export default router;
