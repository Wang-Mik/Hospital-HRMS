import { z } from 'zod';
import { clinicalDateTimeSchema, clinicalDateOnlySchema } from './commonValidation.js';

export const scheduleShiftSchema = z
  .object({
    staff_id: z.string({ required_error: 'staff_id is mandatory' }).trim().min(1, 'staff_id is mandatory'),
    department_code: z.string().trim().optional(),
    department_id: z.union([z.string().trim(), z.number().int()]).optional(),
    start_time: clinicalDateTimeSchema,
    end_time: clinicalDateTimeSchema,
    shift_type: z
      .enum(['MORNING', 'AFTERNOON', 'NIGHT', 'SWING', 'ON_CALL', 'EMERGENCY_COVER'], {
        errorMap: () => ({ message: 'Invalid shift_type' })
      })
      .default('MORNING'),
    on_call_tier: z
      .enum(['LEADERSHIP', 'CLINICAL', 'PARACLINICAL', 'LOGISTICS'], {
        errorMap: () => ({ message: 'Invalid on_call_tier' })
      })
      .default('CLINICAL'),
    team_code: z
      .enum(['TEAM_A', 'TEAM_B', 'TEAM_C', 'TEAM_D', 'GENERAL'], {
        errorMap: () => ({ message: 'Invalid team_code' })
      })
      .default('GENERAL'),
    is_24h_on_call: z.boolean().default(false),
    status: z
      .enum(
        [
          'SCHEDULED',
          'PENDING_APPROVAL',
          'IN_PROGRESS',
          'COMPLETED',
          'CANCELLED',
          'SWAPPED',
          'ON_CALL',
          'EMERGENCY_ACTIVE',
          'RESTING_POST_NIGHT'
        ],
        { errorMap: () => ({ message: 'Invalid shift status' }) }
      )
      .default('SCHEDULED'),
    requires_handover: z.boolean().default(true),
    // Emergency & Gating Flags (Must NOT be stripped)
    allow_insufficient_rest: z.boolean().default(false),
    allow_unverified_license: z.boolean().default(false)
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.start_time).getTime();
    const end = new Date(data.end_time).getTime();
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'start_time must be earlier than end_time'
      });
    }
  });

export const createShiftSchema = scheduleShiftSchema;

export const updateShiftSchema = z
  .object({
    staff_id: z.string().trim().optional(),
    department_code: z.string().trim().optional(),
    department_id: z.union([z.string().trim(), z.number().int()]).optional(),
    start_time: clinicalDateTimeSchema.optional(),
    end_time: clinicalDateTimeSchema.optional(),
    shift_type: z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'SWING', 'ON_CALL', 'EMERGENCY_COVER']).optional(),
    on_call_tier: z.enum(['LEADERSHIP', 'CLINICAL', 'PARACLINICAL', 'LOGISTICS']).optional(),
    team_code: z.enum(['TEAM_A', 'TEAM_B', 'TEAM_C', 'TEAM_D', 'GENERAL']).optional(),
    is_24h_on_call: z.boolean().optional(),
    status: z.enum([
      'SCHEDULED',
      'PENDING_APPROVAL',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'SWAPPED',
      'ON_CALL',
      'EMERGENCY_ACTIVE',
      'RESTING_POST_NIGHT'
    ]).optional(),
    requires_handover: z.boolean().optional(),
    allow_insufficient_rest: z.boolean().optional(),
    allow_unverified_license: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (data.start_time && data.end_time) {
      const start = new Date(data.start_time).getTime();
      const end = new Date(data.end_time).getTime();
      if (start >= end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['end_time'],
          message: 'start_time must be before end_time'
        });
      }
    }
  });

export const recordOverrunSchema = z
  .object({
    overrun_minutes: z.coerce
      .number({ required_error: 'overrun_minutes is required' })
      .int()
      .positive('overrun_minutes must be greater than 0')
      .max(720, 'Không thể vượt trực quá 12 giờ'),
    overrun_reason: z.string().trim().max(255).optional(),
    reason: z.string().trim().max(255).optional(),
    clinical_case_ref: z.string().trim().max(100).optional().nullable(),
    overrun_notes: z.string().trim().max(5000).optional().nullable()
  });

export const approveOverrunSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED'], {
      errorMap: () => ({ message: 'decision must be APPROVED or REJECTED' })
    }),
    rejection_reason: z.string().trim().max(500).optional()
  })
  .superRefine((data, ctx) => {
    if (data.decision === 'REJECTED' && (!data.rejection_reason || data.rejection_reason.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rejection_reason'],
        message: 'Vui lòng cung cấp lý do từ chối phê duyệt giờ vượt trực.'
      });
    }
  });

export const publishRosterSchema = z.object({
  department_code: z.string({ required_error: 'department_code is required' }).trim().min(1),
  start_date: clinicalDateOnlySchema,
  end_date: clinicalDateOnlySchema
});

export const delegationSchema = z.object({
  department_code: z.string().trim().optional(),
  department_id: z.union([z.string().trim(), z.number().int()]).optional(),
  delegatee_id: z.string({ required_error: 'delegatee_id is required' }).trim().min(1),
  delegated_by: z.string().trim().optional(),
  start_date: clinicalDateOnlySchema,
  end_date: clinicalDateOnlySchema,
  permissions: z.any().optional()
});
