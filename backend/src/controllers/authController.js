import authService from '../services/authService.js';

export const authController = {
  /**
   * POST /api/auth/register
   * Create an account tied to an employee
   */
  async register(req, res) {
    const { employee_id, username, password } = req.body;

    if (!employee_id || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employee_id, username, and password are mandatory.'
      });
    }

    try {
      const account = await authService.register({
        employee_id: Number(employee_id),
        username: String(username).trim(),
        password: String(password)
      });

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data: account
      });
    } catch (error) {
      console.error('[authController.register Error]:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to register account',
        error: error.message
      });
    }
  },

  /**
   * POST /api/auth/login
   * Authenticate employee credentials and return JWT
   */
  async login(req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing credentials: username and password are required.'
      });
    }

    try {
      const result = await authService.login({
        username: String(username).trim(),
        password: String(password)
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      console.error('[authController.login Error]:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Authentication failed',
        error: error.message
      });
    }
  }
};

export default authController;
