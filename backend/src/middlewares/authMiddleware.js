import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware: Verify JSON Web Token (JWT)
 * Protects clinical shift and schedule rostering endpoints
 */
export function verifyToken(req, res, next) {
  // Allow test environments to bypass if needed
  if (process.env.NODE_ENV === 'test' && !req.headers.authorization) {
    req.user = { role: 'SUPER_ADMIN', username: 'test_admin', employee_code: 'EMP-ADM-001' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In local development, if a valid session exists via x-staff-id header, permit for seamless DX
    if (process.env.NODE_ENV === 'development' && req.headers['x-staff-id']) {
      req.user = { role: 'STAFF', employee_code: req.headers['x-staff-id'] };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Yêu cầu đăng nhập: Không tìm thấy Access Token xác thực.'
    });
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env.JWT_SECRET || 'hospital-hrms-backend-secret-key-2026';

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
