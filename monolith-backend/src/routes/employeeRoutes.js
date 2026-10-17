import { Router } from 'express';
import { employeeController } from '../controllers/employeeController.js';

const router = Router();

/**
 * @swagger
 * /api/employees/emergency-contacts:
 *   post:
 *     summary: Add an emergency contact for an employee
 *     tags:
 *       - Emergency Contacts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - contact_name
 *               - relationship
 *               - phone_number
 *             properties:
 *               staff_id:
 *                 type: string
 *                 example: EMP-DOC-001
 *               contact_name:
 *                 type: string
 *                 example: Jane Doe
 *               relationship:
 *                 type: string
 *                 example: Spouse
 *               phone_number:
 *                 type: string
 *                 example: +1-555-0188
 *     responses:
 *       201:
 *         description: Emergency contact created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/emergency-contacts', employeeController.addEmergencyContact);

/**
 * @swagger
 * /api/employees/{staff_id}/emergency-contacts:
 *   post:
 *     summary: Add an emergency contact by staff ID
 *     tags:
 *       - Emergency Contacts
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Emergency contact created successfully
 *   get:
 *     summary: Get emergency contacts by staff ID
 *     tags:
 *       - Emergency Contacts
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of emergency contacts
 */
router.post('/:staff_id/emergency-contacts', employeeController.addEmergencyContact);
router.get('/:staff_id/emergency-contacts', employeeController.getEmergencyContactsByStaffId);

/**
 * @swagger
 * /api/employees/documents:
 *   post:
 *     summary: Upload and attach a document to an employee
 *     tags:
 *       - Employee Documents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staff_id
 *               - document_name
 *               - file_url
 *             properties:
 *               staff_id:
 *                 type: string
 *                 example: EMP-DOC-001
 *               document_name:
 *                 type: string
 *                 example: ACLS_Certification_Card.pdf
 *               document_type:
 *                 type: string
 *                 enum: [RESUME, CONTRACT, CERTIFICATE, IDENTIFICATION, TAX_FORM, OTHER]
 *                 default: OTHER
 *               file_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document attached successfully
 *       400:
 *         description: Missing required fields or invalid document type
 */
router.post('/documents', employeeController.uploadDocument);

/**
 * @swagger
 * /api/employees/{staff_id}/documents:
 *   post:
 *     summary: Upload and attach a document by staff ID
 *     tags:
 *       - Employee Documents
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Document attached successfully
 *   get:
 *     summary: Get all documents for a staff member
 *     tags:
 *       - Employee Documents
 *     parameters:
 *       - in: path
 *         name: staff_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of documents attached to staff
 */
router.post('/:staff_id/documents', employeeController.uploadDocument);
router.get('/:staff_id/documents', employeeController.getDocumentsByStaffId);

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee with active medical licenses
 *     tags:
 *       - Employees
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee profile with active licenses
 *       404:
 *         description: Employee not found
 * 
 * /api/employees:
 *   post:
 *     summary: Create new employee
 *     tags:
 *       - Employees
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_code
 *               - first_name
 *               - last_name
 *               - email
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Missing required fields or validation error
 *       409:
 *         description: Employee code or email already exists
 */
router.get('/', employeeController.getAllEmployees);
router.get('/licenses', employeeController.getAllLicenses);
router.post('/licenses', employeeController.createLicense);
router.patch('/licenses/:id/status', employeeController.updateLicenseStatus);
router.get('/:id', employeeController.getEmployeeWithActiveLicenses);
router.post('/', employeeController.createEmployee);
router.patch('/:id/admin-update', employeeController.adminUpdateEmployee);
router.patch('/:staff_id/profile', employeeController.updateProfile);
router.post('/:staff_id/avatar', employeeController.updateAvatar);
router.delete('/:staff_id/emergency-contacts/:contact_id', employeeController.deleteEmergencyContact);

export default router;
