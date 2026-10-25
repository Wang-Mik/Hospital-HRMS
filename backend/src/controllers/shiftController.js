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
      allow_insufficient_rest = false
    } = req.body;

    // RBAC Scope Check: Only HR_MANAGER or SUPER_ADMIN can schedule shifts
    if (req.user && req.user.role !== 'HR_MANAGER' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Quyền truy cập bị từ chối: Chỉ nhân sự (HR) hoặc Quản trị viên mới có quyền phân công lịch làm việc và ca trực.'
      });
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
        allow_insufficient_rest: Boolean(allow_insufficient_rest)
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

      // RBAC Scope Check: Only HR_MANAGER or SUPER_ADMIN can delete shifts
      if (req.user && req.user.role !== 'HR_MANAGER' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Quyền truy cập bị từ chối: Chỉ nhân sự (HR) hoặc Quản trị viên mới có quyền hủy ca trực.'
        });
      }

      const success = await shiftService.deleteShift(id);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Ca trực không tồn tại hoặc đã được xóa trước đó.'
        });
      }
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
  }
};

export default shiftController;
