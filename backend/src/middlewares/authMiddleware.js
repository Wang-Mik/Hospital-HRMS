import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware: Verify JSON Web Token (JWT)
 * Protects clinical shift and schedule rostering endpoints
 */
export function verifyToken(req, res, next) {
  // Allow test environments to provide default admin context ONLY for functional unit tests
  // When x-enforce-auth header is present or ENFORCE_AUTH is enabled, strictly require valid tokens
  if (
    process.env.NODE_ENV === 'test' &&
    !req.headers.authorization &&
    req.headers['x-enforce-auth'] !== 'true' &&
    process.env.ENFORCE_AUTH !== 'true'
  ) {
    req.user = { role: 'SUPER_ADMIN', username: 'test_admin', employee_code: 'EMP-ADM-001' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Yêu cầu đăng nhập: Không tìm thấy Access Token xác thực.'
    });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret-key-at-least-32-chars-long' : null);

  if (!jwtSecret) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi cấu hình bảo mật máy chủ: JWT_SECRET chưa được thiết lập.'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Phiên làm việc đã hết hạn hoặc mã xác thực không hợp lệ. Vui lòng đăng nhập lại.'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware: Restrict endpoint access to specific roles
 * @param  {...string} allowedRoles Allowed role codes (e.g. 'HR_MANAGER', 'SUPER_ADMIN')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Yêu cầu đăng nhập để thực hiện thao tác này.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối: Chỉ cán bộ nhân sự (HR) hoặc Ban Giám Đốc mới có quyền thực hiện thao tác này.'
      });
    }

    next();
  };
}

export default verifyToken;
