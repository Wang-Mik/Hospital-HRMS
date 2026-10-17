import attendanceService from '../services/attendanceService.js';

export const attendanceController = {
  /**
   * POST /api/attendance/clock-in
   */
  async clockIn(req, res) {
    const {
      staff_id,
      shift_id = null,
      clock_in_method = 'KIOSK_TERMINAL',
      clock_in_time = null
    } = req.body;

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'staff_id is mandatory for clock-in.'
      });
    }

    const validMethods = ['BIOMETRIC', 'RFID_CARD', 'MOBILE_GEOFENCE', 'KIOSK_TERMINAL', 'MANUAL_OVERRIDE'];
    if (!validMethods.includes(clock_in_method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid clock_in_method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    try {
      const data = await attendanceService.clockIn({
        staff_id,
        shift_id,
        clock_in_method,
        clock_in_time
      });

      return res.status(201).json({
        success: true,
        message: 'Clock-in recorded successfully',
        data
      });
    } catch (error) {
      if (error.statusCode) {
        const resp = {
          success: false,
          message: error.message
        };
        if (error.active_attendance) {
          resp.active_attendance = error.active_attendance;
        }
        return res.status(error.statusCode).json(resp);
      }
      console.error('[attendanceController.clockIn Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record clock-in',
        error: error.message
      });
    }
  },

  /**
   * POST /api/attendance/:id/clock-out
   */
  async clockOut(req, res) {
    const { id } = req.params;
    const { clock_out_time = null, handover_notes = null } = req.body;

    try {
      const data = await attendanceService.clockOut(id, { clock_out_time, handover_notes });
      return res.status(200).json({
        success: true,
        message: 'Clock-out recorded successfully',
        data
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message
        });
      }
      console.error('[attendanceController.clockOut Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record clock-out',
        error: error.message
      });
    }
  },

  /**
   * GET /api/attendance
   */
  async getAllAttendances(req, res) {
    try {
      const { staff_id, shift_id, status, date } = req.query;
      const rows = await attendanceService.getAllAttendances({ staff_id, shift_id, status, date });

      return res.status(200).json({
        success: true,
        count: rows.length,
        data: rows
      });
    } catch (error) {
      console.error('[attendanceController.getAllAttendances Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve attendance records',
        error: error.message
      });
    }
  },

  /**
   * GET /api/attendance/:id
   */
  async getAttendanceById(req, res) {
    const { id } = req.params;
    try {
      const record = await attendanceService.getAttendanceById(id);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: `Attendance record not found with ID: ${id}`
        });
      }

      return res.status(200).json({
        success: true,
        data: record
      });
    } catch (error) {
      console.error('[attendanceController.getAttendanceById Error]:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve attendance record',
        error: error.message
      });
    }
  }
};

export default attendanceController;
