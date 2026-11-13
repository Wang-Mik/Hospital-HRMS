import { z } from 'zod';
import { clinicalDateOnlySchema } from './commonValidation.js';

export const LEAVE_TYPES = ['ANNUAL', 'SICK', 'MATERNITY', 'UNPAID', 'POST_NIGHT_REST', 'BEREAVEMENT'];
export const LEAVE_STATUSES = ['PENDING', 'DEPT_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED'];

export const submitLeaveSchema = z
  .object({
    staff_id: z.string({ required_error: 'staff_id is mandatory' }).trim().min(1, 'staff_id is mandatory'),
    leave_type: z.enum(LEAVE_TYPES, {
      errorMap: () => ({ message: 'Invalid leave_type. Must be one of: SICK, ANNUAL, UNPAID, MATERNITY' })
    }).optional().default('ANNUAL'),
    start_date: clinicalDateOnlySchema,
    end_date: clinicalDateOnlySchema,
    reason: z.string().trim().max(1000).optional().nullable(),
    day_part: z.enum(['FULL', 'FIRST_HALF', 'SECOND_HALF', 'MORNING', 'AFTERNOON']).optional().default('FULL'),
    days_requested: z.coerce.number().positive().optional().nullable(),
    days_count: z.coerce.number().positive().optional().nullable(),
    is_half_day: z.boolean().optional().default(false),
    half_day_type: z.enum(['MORNING', 'AFTERNOON', 'FIRST_HALF', 'SECOND_HALF']).optional().nullable()
  })
  .superRefine((data, ctx) => {
    if (data.start_date && data.end_date && data.start_date > data.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'start_date must be earlier than or equal to end_date.'
      });
    }
  });

export const updateLeaveStatusSchema = z.object({
  status: z.enum(LEAVE_STATUSES, {
    errorMap: () => ({ message: `status must be one of: ${LEAVE_STATUSES.join(', ')}` })
  }),
  approval_notes: z.string().trim().max(1000).optional().nullable(),
  rejection_reason: z.string().trim().max(1000).optional().nullable()
});

export const leaveBalanceSchema = z.object({
  staff_id: z.string({ required_error: 'staff_id is mandatory' }).trim().min(1, 'staff_id is mandatory'),
  accrual_year: z.coerce.number().int().min(2000).max(2100).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  leave_type: z.enum(LEAVE_TYPES, {
    errorMap: () => ({ message: 'Invalid leave_type' })
  }).optional().default('ANNUAL'),
  total_days: z.coerce.number({ required_error: 'total_days is mandatory' }).min(0, 'total_days must be non-negative'),
  used_days: z.coerce.number().min(0).default(0)
}).transform((data) => {
  const year = data.accrual_year || data.year || new Date().getFullYear();
  return {
    ...data,
    accrual_year: year,
    year
  };
});
