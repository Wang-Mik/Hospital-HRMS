import shiftService from '../services/shiftService.js';

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
      requires_handover = true
    } = req.body;

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
        requires_handover
      });

      return res.status(201).json({
        success: true,
        message: 'Shift scheduled successfully',
        data
      });
    } catch (error) {
      if (error.statusCode === 409) {
        return res.status(409).json({
          success: false,
          message: error.message,
          conflicting_shift: error.conflicting_shift
        });
      }
      console.error('[shiftController.scheduleShift Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to schedule shift',
        error: error.message
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
  }
};

export default shiftController;
