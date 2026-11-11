import pool from '../db.js';
import shiftService from '../services/shiftService.js';

async function getStaffDepartment(employeeCode) {
  if (!employeeCode) return null;
  try {
    const [rows] = await pool.query('SELECT department_code FROM Employees WHERE employee_code = ? LIMIT 1', [employeeCode]);
    return rows[0]?.department_code || null;
  } catch {
    return null;
  }
}

export const shiftController = {
  /**
   * POST /api/shifts
   */
  async scheduleShift(req, res) {
    const {
      staff_id,
      department_code,
      department_id,
      start_time,
      end_time,
      shift_type = 'MORNING',
      on_call_tier = 'CLINICAL',
      team_code = 'GENERAL',
      is_24h_on_call = false,
      status = 'SCHEDULED',
      requires_handover = true,
      allow_insufficient_rest = false,
      allow_unverified_license = false
    } = req.body;

    // RBAC Scope Check: Hospital Admin, Department Head (within their department), or Delegated Ward Secretary
    let approvalStatus = 'APPROVED';
    if (req.user) {
      const isHospitalWideAdmin = [
        'SUPER_ADMIN',
        'HR_MANAGER',
        'HOSPITAL_DIRECTOR',
        'VICE_DIRECTOR',
        'HEAD_OF_GENERAL_PLANNING',
        'HEAD_OF_HR'
      ].includes(req.user.role);

      const resolvedDept = department_code || department_id;
      const isHeadOfDept = req.user.role === 'DEPARTMENT_HEAD' && req.user.department_code && req.user.department_code === resolvedDept;

      // Check if user is delegated secretary for this department
      let isDelegatedSecretary = false;
      if (!isHospitalWideAdmin && !isHeadOfDept && resolvedDept) {
        try {
          const [delRows] = await pool.query(
            `SELECT id FROM Department_Roster_Delegations WHERE department_code = ? AND delegated_staff_id = ? AND is_active = TRUE LIMIT 1`,
            [resolvedDept, req.user.employee_code]
          );
          if (delRows && delRows.length > 0) {
            isDelegatedSecretary = true;
            approvalStatus = 'PENDING_APPROVAL';
          }
        } catch {
          isDelegatedSecretary = false;
        }
      }

      if (!isHospitalWideAdmin && !isHeadOfDept && !isDelegatedSecretary) {
        return res.status(403).json({
          success: false,
          message: 'Quyền truy cập bị từ chối: Chỉ nhân sự (HR), Trưởng khoa hoặc Thư ký khoa được ủy quyền mới có quyền phân công lịch làm việc và ca trực.'
        });
      }
    }

    const deptParam = department_code || department_id;
    if (!staff_id || !deptParam || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staff_id, department_code (or department_id), start_time, and end_time are mandatory.'
      });
    }

    const startDate = new Date(start_time);
    const endDate = new Date(end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date-time format for start_time or end_time.'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'start_time must be strictly earlier than end_time.'
      });
    }

    const validShiftTypes = ['MORNING', 'AFTERNOON', 'NIGHT', 'SWING', 'ON_CALL', 'EMERGENCY_COVER'];
    if (!validShiftTypes.includes(shift_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid shift_type. Must be one of: ${validShiftTypes.join(', ')}`
      });
    }

    try {
      const data = await shiftService.scheduleShift({
        staff_id,
        department_code,
        department_id,
        start_time,
        end_time,
        shift_type,
        on_call_tier,
        team_code,
        is_24h_on_call,
        status,
        requires_handover,
        allow_insufficient_rest: Boolean(allow_insufficient_rest),
        allow_unverified_license: Boolean(allow_unverified_license),
        approval_status: approvalStatus,
        submitted_by: req.user?.employee_code || staff_id
      });

      return res.status(201).json({
        success: true,
        message: 'Shift scheduled successfully',
        data
      });
    } catch (error) {
      if (error.code === 'INSUFFICIENT_REST_INTERVAL' || error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          code: error.code || 'SHIFT_CONFLICT',
          message: error.message,
          rest_hours: error.rest_hours,
          required_rest_hours: error.required_rest_hours || 24,
          requires_confirmation: Boolean(error.requires_confirmation),
          conflicting_shift: error.conflicting_shift,
          violating_shift: error.violating_shift
        });
      }
      if (error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      console.error('[shiftController.scheduleShift Error]:', error);
      const isFk = error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452;
      return res.status(isFk ? 400 : 500).json({
        success: false,
        message: isFk ? 'Cán bộ y tế hoặc khoa phòng không tồn tại trong hệ thống.' : (error.message || 'Failed to schedule shift')
      });
    }
  },

  /**
   * POST /api/shifts/batch
   * Batch schedule recurring work days / shifts
   */
  async batchScheduleShifts(req, res) {
    try {
      const {
        staff_id,
        department_code,
        department_id,
        work_type,
        custom_start_time,
        custom_end_time,
        start_date,
        end_date,
        days_of_week,
        shift_type,
        on_call_tier,
        team_code,
        requires_handover
      } = req.body;

      if (!staff_id || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: staff_id, start_date, and end_date are mandatory.'
        });
      }

      const result = await shiftService.batchScheduleWorkShifts({
        staff_id,
        department_code,
        department_id,
        work_type,
        custom_start_time,
        custom_end_time,
        start_date,
        end_date,
        days_of_week,
        shift_type,
        on_call_tier,
        team_code,
        requires_handover
      });

      return res.status(201).json({
        success: true,
        message: `Đã phân bổ thành công ${result.count} buổi làm việc (Bỏ qua ${result.conflicts_count} buổi trùng lịch).`,
        data: result
      });
    } catch (error) {
      console.error('[shiftController.batchScheduleShifts Error]:', error);
      const isFk = error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452;
      return res.status(error.statusCode || (isFk ? 400 : 500)).json({
        success: false,
        message: isFk ? 'Cán bộ y tế hoặc khoa phòng không tồn tại trong hệ thống.' : (error.message || 'Failed to batch schedule shifts')
      });
    }
  },

  /**
   * POST /api/shifts/auto-rotate
   * Auto-rotate shifts across 4 teams for a department (3 ca 4 kip)
   */
  async autoRotateTeams(req, res) {
    try {
      const {
        department_code,
        department_id,
        start_date,
        end_date,
        teams,
        staff_ids,
        rotation_model = '3CA_4KIP',
        preview_only = false
      } = req.body;
      const dept = department_code || department_id;
      if (!dept || !start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ: department_code (hoặc department_id), start_date, và end_date.'
        });
      }

      const result = await shiftService.autoRotateDepartmentTeams({
        department_code,
        department_id,
        start_date,
        end_date,
        teams,
        staff_ids,
        rotation_model,
        preview_only
      });

      return res.status(preview_only ? 200 : 201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      console.error('[shiftController.autoRotateTeams Error]:', error);
      const isFk = error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452;
      return res.status(error.statusCode || (isFk ? 400 : 500)).json({
        success: false,
        message: isFk ? 'Khoa phòng hoặc cán bộ không tồn tại trong hệ thống.' : (error.message || 'Không thể tự động xoay kíp trực.')
      });
    }
  },

  /**
   * GET /api/shifts
   */
  async getAllShifts(req, res) {
    try {
      const {
        staff_id,
        department_code,
        department_id,
        status,
        shift_type,
        on_call_tier,
        team_code,
        date
      } = req.query;

      const rows = await shiftService.getAllShifts({
        staff_id,
        department_code,
        department_id,
        status,
        shift_type,
        on_call_tier,
        team_code,
        date
      });

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error('[shiftController.getAllShifts Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve shifts',
        error: error.message
      });
    }
  },

  /**
   * GET /api/shifts/:id
   */
  async getShiftById(req, res) {
    const { id } = req.params;
    try {
      const shift = await shiftService.getShiftById(id);
      if (!shift) {
        return res.status(404).json({
          success: false,
          message: `Shift not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        data: shift
      });
    } catch (error) {
      console.error('[shiftController.getShiftById Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve shift',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/shifts/:id
   */
  async deleteShift(req, res) {
    try {
      const { id } = req.params;

      // Scoped authorization: DEPARTMENT_HEAD can only cancel shifts in their own department.
      // HR_MANAGER and SUPER_ADMIN have hospital-wide authority.
      if (req.user && req.user.role === 'DEPARTMENT_HEAD') {
        const shift = await shiftService.getShiftById(id);
        if (!shift) {
          return res.status(404).json({
            success: false,
            message: 'Ca trực không tồn tại hoặc đã được xóa trước đó.'
          });
        }

        const isDeptHeadOfShift = req.user.department_code && (req.user.department_code === shift.department_code || req.user.department_code === shift.department_id);
        if (!isDeptHeadOfShift) {
          return res.status(403).json({
            success: false,
            message: 'Quyền truy cập bị từ chối: Trưởng khoa chỉ có quyền hủy ca trực thuộc khoa phụ trách của mình.'
          });
        }
      }

      const success = await shiftService.deleteShift(id);
      return res.status(200).json({
        success: true,
        message: 'Đã hủy bỏ ca trực thành công.'
      });
    } catch (error) {
      console.error('[shiftController.deleteShift Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Không thể xóa ca trực.',
        error: error.message
      });
    }
  },

  /**
   * GET /api/shifts/fill-gap/candidates
   * Query recommended staff to cover an emergency gap or surge
   */
  async getFillGapCandidates(req, res) {
    try {
      const { department_code, department_id, shift_date, shift_type, required_role } = req.query;

      // Allow DEPARTMENT_HEAD to default to their own department if not passed
      let targetDept = department_code || department_id;
      if (!targetDept && req.user && req.user.role === 'DEPARTMENT_HEAD') {
        targetDept = await getStaffDepartment(req.user.employee_code);
      }

      const result = await shiftService.getFillGapCandidates({
        department_code: targetDept,
        shift_date,
        shift_type,
        required_role
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[shiftController.getFillGapCandidates Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Không thể tìm ứng viên lấp khoảng trống ca trực.'
      });
    }
  },

  /**
   * POST /api/shifts/fill-gap/dispatch
   * Dispatch selected candidate for emergency cover
   */
  async dispatchSurgeCover(req, res) {
    try {
      const {
        staff_id,
        department_code,
        department_id,
        shift_date,
        start_time,
        end_time,
        shift_type = 'EMERGENCY_COVER',
        reason,
        on_call_tier = 'CLINICAL'
      } = req.body;

      let targetDept = department_code || department_id;
      if (!targetDept && req.user && req.user.role === 'DEPARTMENT_HEAD') {
        targetDept = await getStaffDepartment(req.user.employee_code);
      }

      const result = await shiftService.dispatchSurgeCover(
        {
          staff_id,
          department_code: targetDept,
          shift_date,
          start_time,
          end_time,
          shift_type,
          reason,
          on_call_tier
        },
        req.user
      );

      return res.status(201).json(result);
    } catch (error) {
      console.error('[shiftController.dispatchSurgeCover Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        code: error.code,
        message: error.message || 'Không thể phát lệnh điều động cấp cứu khẩn cấp.'
      });
    }
  },

  /**
   * POST /api/shifts/:id/overrun
   * Record shift overrun when doctor/nurse stays late for resuscitation / surgery
   */
  async recordShiftOverrun(req, res) {
    try {
      const { id } = req.params;
      const {
        overrun_minutes = 60,
        reason,
        clinical_case_ref = null,
        overrun_notes = null
      } = req.body;

      const result = await shiftService.recordShiftOverrun(
        id,
        { overrun_minutes, reason, clinical_case_ref, overrun_notes },
        req.user
      );

      return res.status(200).json({
        success: true,
        message: `Đã ghi nhận ca trực kéo dài thêm ${overrun_minutes} phút thành công.`,
        data: result
      });
    } catch (error) {
      console.error('[shiftController.recordShiftOverrun Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Không thể ghi nhận ca trực kéo dài.'
      });
    }
  },

  /**
   * POST /api/shifts/:id/overrun/approve
   * Trưởng khoa / Quản lý ký duyệt giờ vượt trực
   */
  async approveShiftOverrun(req, res) {
    try {
      const { id } = req.params;
      const { decision = 'APPROVED', adjusted_minutes = null, notes = null } = req.body;

      const result = await shiftService.approveShiftOverrun(
        id,
        { decision, adjusted_minutes, notes },
        req.user
      );

      return res.status(200).json({
        success: true,
        message: decision === 'REJECTED' ? 'Đã từ chối giờ vượt trực của ca.' : 'Đã phê duyệt giờ vượt trực thành công.',
        data: result
      });
    } catch (error) {
      console.error('[shiftController.approveShiftOverrun Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Không thể phê duyệt giờ vượt trực.'
      });
    }
  },

  /**
   * GET /api/shifts/overrun/pending
   * Lấy danh sách ca vượt trực chờ duyệt
   */
  async getPendingOverrunShifts(req, res) {
    try {
      const { department_code } = req.query;
      const effectiveDept = (req.user?.role === 'DEPARTMENT_HEAD' && req.user?.department_code)
        ? req.user.department_code
        : department_code;

      const result = await shiftService.getPendingOverrunShifts(effectiveDept);

      return res.status(200).json({
        success: true,
        count: result.length,
        data: result
      });
    } catch (error) {
      console.error('[shiftController.getPendingOverrunShifts Error]:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tải danh sách ca vượt trực chờ duyệt.'
      });
    }
  },

  /**
   * GET /api/shifts/departments/:code/delegate
   */
  async getDepartmentRosterDelegate(req, res) {
    try {
      const { code } = req.params;
      const delegate = await shiftService.getDepartmentRosterDelegate(code);
      return res.status(200).json({
        success: true,
        data: delegate
      });
    } catch (error) {
      console.error('[shiftController.getDepartmentRosterDelegate Error]:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi tải thông tin thư ký khoa'
      });
    }
  },

  /**
   * POST /api/shifts/departments/:code/delegate
   */
  async setDepartmentRosterDelegate(req, res) {
    try {
      const { code } = req.params;
      const { notes } = req.body;
      const delegated_staff_id = req.body.delegated_staff_id || req.body.secretary_id;
      if (!delegated_staff_id) {
        return res.status(400).json({
          success: false,
          message: 'Mã cán bộ được ủy quyền là bắt buộc.'
        });
      }

      const result = await shiftService.setDepartmentRosterDelegate(
        code,
        delegated_staff_id,
        notes,
        req.user
      );

      return res.status(200).json({
        success: true,
        message: `Đã chỉ định cán bộ ${delegated_staff_id} làm Thư ký lập lịch cho khoa ${code}.`,
        data: result
      });
    } catch (error) {
      console.error('[shiftController.setDepartmentRosterDelegate Error]:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Lỗi khi chỉ định thư ký khoa'
      });
    }
  },

  /**
   * POST /api/shifts/approve-batch
   */
  async approveDepartmentShifts(req, res) {
    try {
      const result = await shiftService.approveDepartmentShifts(req.body, req.user);
      return res.status(200).json({
        success: true,
        message: `Đã phê duyệt thành công ${result.approved_count} ca trực của khoa.`,
        data: result
      });
    } catch (error) {
      console.error('[shiftController.approveDepartmentShifts Error]:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi phê duyệt ca trực'
      });
    }
  }
};

export default shiftController;
