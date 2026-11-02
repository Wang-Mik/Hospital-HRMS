import employeeService from '../services/employeeService.js';

export const employeeController = {
  /**
   * GET /api/employees
   */
  async getAllEmployees(req, res) {
    try {
      const filters = {
        department_code: req.query.department_code,
        department_id: req.query.department_id,
        role: req.query.role,
        status: req.query.status,
        search: req.query.search
      };
      const employees = await employeeService.getAllEmployees(filters);
      return res.status(200).json({
        success: true,
        count: employees.length,
        data: employees
      });
    } catch (error) {
      console.error('[employeeController.getAllEmployees Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve employees',
        error: error.message
      });
    }
  },

  /**
   * GET /api/employees/:id
   */
  async getEmployeeWithActiveLicenses(req, res) {
    const { id } = req.params;
    try {
      const result = await employeeService.getEmployeeById(id);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: `Employee not found with ID: ${id}`
        });
      }
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error(`[employeeController.getEmployeeWithActiveLicenses Error] ID ${id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve employee record',
        error: error.message
      });
    }
  },

  /**
   * POST /api/employees
   */
  async createEmployee(req, res) {
    const { employee_code, first_name, last_name, email } = req.body;

    if (!employee_code || !first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employee_code, first_name, last_name, and email are mandatory.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format.'
      });
    }

    try {
      const newEmployee = await employeeService.createEmployee(req.body);
      return res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: newEmployee
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      console.error('[employeeController.createEmployee Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create employee record',
        error: error.message
      });
    }
  },

  /**
   * POST /api/employees/:staff_id/emergency-contacts or /api/employees/emergency-contacts
   */
  async addEmergencyContact(req, res) {
    const staff_id = req.params.staff_id || req.params.id || req.body.staff_id;
    const { contact_name, relationship, phone_number } = req.body;

    if (!staff_id || !contact_name || !relationship || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staff_id, contact_name, relationship, and phone_number are mandatory.'
      });
    }

    try {
      const data = await employeeService.addEmergencyContact({
        staff_id,
        contact_name,
        relationship,
        phone_number
      });
      return res.status(201).json({
        success: true,
        message: 'Emergency contact added successfully',
        data
      });
    } catch (error) {
      console.error('[employeeController.addEmergencyContact Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add emergency contact',
        error: error.message
      });
    }
  },

  /**
   * GET /api/employees/:staff_id/emergency-contacts
   */
  async getEmergencyContactsByStaffId(req, res) {
    const staff_id = req.params.staff_id || req.params.id;

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'staff_id parameter is required.'
      });
    }

    try {
      const rows = await employeeService.getEmergencyContacts(staff_id);
      return res.status(200).json({
        success: true,
        staff_id,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error(`[employeeController.getEmergencyContactsByStaffId Error] staff_id ${staff_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve emergency contacts',
        error: error.message
      });
    }
  },

  /**
   * POST /api/employees/:staff_id/documents or /api/employees/documents
   */
  async uploadDocument(req, res) {
    const staff_id = req.params.staff_id || req.params.id || req.body.staff_id;
    const { document_name, document_type = 'OTHER', file_url } = req.body;

    if (!staff_id || !document_name || !file_url) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staff_id, document_name, and file_url are mandatory.'
      });
    }

    const validDocTypes = ['RESUME', 'CONTRACT', 'CERTIFICATE', 'IDENTIFICATION', 'TAX_FORM', 'OTHER'];
    if (!validDocTypes.includes(document_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document_type. Must be one of: ${validDocTypes.join(', ')}`
      });
    }

    try {
      const data = await employeeService.uploadDocument({
        staff_id,
        document_name,
        document_type,
        file_url
      });
      return res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data
      });
    } catch (error) {
      console.error('[employeeController.uploadDocument Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload document',
        error: error.message
      });
    }
  },

  /**
   * GET /api/employees/:staff_id/documents
   */
  async getDocumentsByStaffId(req, res) {
    const staff_id = req.params.staff_id || req.params.id;

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'staff_id parameter is required.'
      });
    }

    try {
      const rows = await employeeService.getDocuments(staff_id);
      return res.status(200).json({
        success: true,
        staff_id,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error(`[employeeController.getDocumentsByStaffId Error] staff_id ${staff_id}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve documents',
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/employees/:staff_id/profile
   */
  async updateProfile(req, res) {
    const staff_id = req.params.staff_id || req.params.id;
    try {
      const updated = await employeeService.updateProfile(staff_id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Hồ sơ cá nhân đã được lưu thành công vào cơ sở dữ liệu.',
        data: updated
      });
    } catch (error) {
      console.error('[employeeController.updateProfile Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật hồ sơ cá nhân',
        error: error.message
      });
    }
  },

  /**
   * POST /api/employees/:staff_id/avatar
   */
  async updateAvatar(req, res) {
    const staff_id = req.params.staff_id || req.params.id;
    const { avatar_url } = req.body;
    if (!avatar_url) {
      return res.status(400).json({
        success: false,
        message: 'avatar_url is required.'
      });
    }
    try {
      const updated = await employeeService.updateAvatar(staff_id, avatar_url);
      return res.status(200).json({
        success: true,
        message: 'Ảnh đại diện đã được lưu thành công vào cơ sở dữ liệu.',
        data: updated
      });
    } catch (error) {
      console.error('[employeeController.updateAvatar Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lưu ảnh đại diện',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/employees/:staff_id/emergency-contacts/:contact_id
   */
  async deleteEmergencyContact(req, res) {
    const { staff_id, contact_id } = req.params;
    try {
      const result = await employeeService.deleteEmergencyContact(contact_id, staff_id);
      return res.status(200).json({
        success: true,
        message: 'Đã xóa người liên hệ khẩn cấp.',
        data: result
      });
    } catch (error) {
      console.error('[employeeController.deleteEmergencyContact Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa người liên hệ khẩn cấp',
        error: error.message
      });
    }
  },

  /**
   * GET /api/employees/licenses or GET /api/licenses
   */
  async getAllLicenses(req, res) {
    try {
      const filters = {
        status: req.query.status,
        employee_id: req.query.employee_id,
        search: req.query.search
      };
      const licenses = await employeeService.getAllLicenses(filters);
      return res.status(200).json({
        success: true,
        count: licenses.length,
        data: licenses
      });
    } catch (error) {
      console.error('[employeeController.getAllLicenses Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve medical licenses',
        error: error.message
      });
    }
  },

  /**
   * POST /api/employees/licenses or POST /api/licenses
   */
  async createLicense(req, res) {
    try {
      const license = await employeeService.createLicense(req.body);
      return res.status(201).json({
        success: true,
        message: 'Chứng chỉ hành nghề y tế đã được lưu thành công.',
        data: license
      });
    } catch (error) {
      console.error('[employeeController.createLicense Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create medical license',
        error: error.message
      });
    }
  },

  /**
   * PATCH /api/licenses/:id/status or /api/employees/licenses/:id/status
   */
  async updateLicenseStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        message: 'id and status are required fields.'
      });
    }

    try {
      const updated = await employeeService.updateLicenseStatus(id, status);
      return res.status(200).json({
        success: true,
        message: `Trạng thái chứng chỉ hành nghề đã được cập nhật thành ${status}.`,
        data: updated
      });
    } catch (error) {
      console.error('[employeeController.updateLicenseStatus Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update license status'
      });
    }
  },

  /**
   * PATCH /api/employees/:id/admin-update
   */
  async adminUpdateEmployee(req, res) {
    const { id } = req.params;
    try {
      const updated = await employeeService.adminUpdateEmployee(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Hồ sơ nhân viên đã được cập nhật toàn diện thành công.',
        data: updated
      });
    } catch (error) {
      console.error('[employeeController.adminUpdateEmployee Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật hồ sơ nhân viên',
        error: error.message
      });
    }
  },

  /**
   * GET /api/employees/:id/dossier
   * Return full personnel dossier (Degrees, CCHN, CME, Contracts, Insurances, Commendations/Disciplines, KPIs, Pay)
   */
  async getEmployeeFullDossier(req, res) {
    const { id } = req.params;
    try {
      const dossier = await employeeService.getEmployeeFullDossier(id);
      if (!dossier) {
        return res.status(404).json({
          success: false,
          message: `Không tìm thấy hồ sơ cán bộ nhân sự với mã ${id}`
        });
      }
      return res.status(200).json({
        success: true,
        data: dossier
      });
    } catch (error) {
      console.error('[employeeController.getEmployeeFullDossier Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tải toàn bộ hồ sơ nhân sự',
        error: error.message
      });
    }
  },

  /**
   * POST /api/employees/:staff_id/degrees
   */
  async addAcademicDegree(req, res) {
    const { staff_id } = req.params;
    try {
      const degree = await employeeService.addAcademicDegree(staff_id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Thêm văn bằng học vị thành công.',
        data: degree
      });
    } catch (error) {
      console.error('[employeeController.addAcademicDegree Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi thêm văn bằng'
      });
    }
  },

  /**
   * DELETE /api/employees/:staff_id/degrees/:degree_id
   */
  async deleteAcademicDegree(req, res) {
    const { staff_id, degree_id } = req.params;
    try {
      const success = await employeeService.deleteAcademicDegree(staff_id, degree_id);
      return res.status(200).json({
        success,
        message: success ? 'Đã xóa văn bằng học vị.' : 'Không tìm thấy văn bằng cần xóa.'
      });
    } catch (error) {
      console.error('[employeeController.deleteAcademicDegree Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa văn bằng'
      });
    }
  },

  /**
   * POST /api/employees/:staff_id/certifications
   */
  async addSpecializedCertification(req, res) {
    const { staff_id } = req.params;
    try {
      const cert = await employeeService.addSpecializedCertification(staff_id, req.body);
      return res.status(201).json({
        success: true,
        message: 'Thêm chứng chỉ chuyên môn thành công.',
        data: cert
      });
    } catch (error) {
      console.error('[employeeController.addSpecializedCertification Error]:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi thêm chứng chỉ chuyên môn'
      });
    }
  },

  /**
   * DELETE /api/employees/:staff_id/certifications/:cert_id
   */
  async deleteSpecializedCertification(req, res) {
    const { staff_id, cert_id } = req.params;
    try {
      const success = await employeeService.deleteSpecializedCertification(staff_id, cert_id);
      return res.status(200).json({
        success,
        message: success ? 'Đã xóa chứng chỉ chuyên môn.' : 'Không tìm thấy chứng chỉ cần xóa.'
      });
    } catch (error) {
      console.error('[employeeController.deleteSpecializedCertification Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa chứng chỉ chuyên môn'
      });
    }
  }
};

export default employeeController;
