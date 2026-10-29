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
   * Authenticate employee credentials, set secure HttpOnly cookie, and return user profile
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

      // Security: Set JWT in HttpOnly Cookie to conceal token from client-side XSS
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 3 * 60 * 60 * 1000, // 3 hours in ms
        path: '/'
      });

      // Conceal raw JWT token from client response in production/browser environments
      const responseData = {
        account: result.account,
        employee: result.employee,
        permissions: result.permissions
      };

      // Retain token in payload for Jest test suites or explicit API callers
      if (process.env.NODE_ENV === 'test' || req.query.include_token === 'true') {
        responseData.token = result.token;
      }

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: responseData
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
  },

  /**
   * POST /api/auth/logout
   * Invalidate session by clearing HttpOnly authentication cookie
   */
  async logout(req, res) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: 'Đăng xuất thành công. Phiên làm việc đã kết thúc.'
    });
  },

  /**
   * GET /api/auth/me
   * Retrieve active session user claims from verified token
   */
  async me(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  }
};

export default authController;
