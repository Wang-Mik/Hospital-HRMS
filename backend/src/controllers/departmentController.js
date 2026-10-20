import departmentService from '../services/departmentService.js';

export const departmentController = {
  /**
   * GET /api/departments
   */
  async getAllDepartments(req, res) {
    try {
      const departments = await departmentService.getAllDepartments();
      return res.status(200).json({
        success: true,
        count: departments.length,
        data: departments
      });
    } catch (error) {
      console.error('[departmentController.getAllDepartments Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve departments',
        error: error.message
      });
    }
  },

  /**
   * GET /api/departments/:code
   */
  async getDepartmentByCode(req, res) {
    try {
      const { code } = req.params;
      const department = await departmentService.getDepartmentByCode(code);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: `Department not found with identifier: ${code}`
        });
      }
      return res.status(200).json({
        success: true,
        data: department
      });
    } catch (error) {
      console.error('[departmentController.getDepartmentByCode Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve department',
        error: error.message
      });
    }
  },

  /**
   * POST /api/departments
   */
  async createDepartment(req, res) {
    try {
      const { department_code, name, description, location, status } = req.body;
      const dept = await departmentService.createDepartment({ department_code, name, description, location, status });
      return res.status(201).json({
        success: true,
        message: 'Khoa phòng mới đã được thêm thành công.',
        data: dept
      });
    } catch (error) {
      console.error('[departmentController.createDepartment Error]:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Lỗi khi tạo khoa phòng mới',
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/departments/:code
   */
  async updateDepartment(req, res) {
    try {
      const { code } = req.params;
      const dept = await departmentService.updateDepartment(code, req.body);
      return res.status(200).json({
        success: true,
        message: 'Thông tin khoa phòng đã được cập nhật.',
        data: dept
      });
    } catch (error) {
      console.error('[departmentController.updateDepartment Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật khoa phòng',
        error: error.message
      });
    }
  }
};

export default departmentController;
