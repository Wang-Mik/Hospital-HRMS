import { Router } from 'express';
import departmentController from '../controllers/departmentController.js';

const router = Router();

/**
 * @openapi
 * /api/departments:
 *   get:
 *     summary: Retrieve list of all active departments
 *     tags: [Departments]
 *     responses:
 *       200:
 *         description: List of active hospital departments
 */
router.get('/', departmentController.getAllDepartments);
router.post('/', departmentController.createDepartment);
router.get('/:code', departmentController.getDepartmentByCode);
router.patch('/:code', departmentController.updateDepartment);
router.put('/:code', departmentController.updateDepartment);

export default router;
