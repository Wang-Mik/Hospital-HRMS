import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController.js';

const router = Router();

// Security: Rate limiter on authentication to prevent brute-force attacks and DoS
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: process.env.NODE_ENV === 'test' && !process.env.ENFORCE_RATE_LIMIT ? 200 : 15, // 15 attempts in production/dev
  message: {
    success: false,
    message: 'Quá nhiều lần thử đăng nhập không thành công từ địa chỉ IP này. Vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new authentication account for an employee
 *     tags:
 *       - Authentication & Accounts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - username
 *               - password
 *             properties:
 *               employee_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID of existing employee in Employees table
 *               username:
 *                 type: string
 *                 example: "dr.wright"
 *                 description: Unique account username
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass2026!"
 *                 description: Raw password to be securely hashed
 *     responses:
 *       201:
 *         description: Account successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account registered successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       400:
 *         description: Missing mandatory fields or invalid foreign key
 *       409:
 *         description: Username already exists
 *       500:
 *         description: Internal server error
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate employee credentials and issue JSON Web Token (JWT)
 *     tags:
 *       - Authentication & Accounts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "dr.wright"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePass2026!"
 *     responses:
 *       200:
 *         description: Authentication successful, returns JWT bearer token and user claims
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     account:
 *                       $ref: '#/components/schemas/Account'
 *                     employee:
 *                       $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Missing username or password
 *       401:
 *         description: Invalid username or password
 *       403:
 *         description: Account is locked
 *       500:
 *         description: Internal server error
 */
router.post('/login', authLimiter, authController.login);

export default router;
