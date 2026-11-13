import { z } from 'zod';
import { clinicalDateOnlySchema } from './commonValidation.js';

const VALID_PAYROLL_STATUSES = ['DRAFT', 'PROCESSING', 'APPROVED', 'COMPLETED', 'CANCELLED'];

export const createPayrollRunSchema = z
  .object({
    start_date: clinicalDateOnlySchema,
    end_date: clinicalDateOnlySchema,
    run_name: z.string().trim().optional(),
    status: z
      .enum(VALID_PAYROLL_STATUSES, {
        errorMap: () => ({ message: `Invalid status. Must be one of: ${VALID_PAYROLL_STATUSES.join(', ')}` })
      })
      .optional()
      .default('DRAFT')
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

export const updatePayrollRunStatusSchema = z.object({
  status: z.enum(VALID_PAYROLL_STATUSES, {
    errorMap: () => ({ message: `Invalid status. Must be one of: ${VALID_PAYROLL_STATUSES.join(', ')}` })
  })
});

export const createPaySlipSchema = z.object({
  run_id: z.union([z.string().trim().min(1, 'run_id is mandatory'), z.number().int()], {
    required_error: 'run_id is mandatory'
  }),
  staff_id: z
    .string({ required_error: 'staff_id is mandatory' })
    .trim()
    .min(1, 'staff_id is mandatory'),
  base_pay: z.coerce.number().min(0).optional().default(0),
  night_differential: z.coerce.number().min(0).optional().default(0),
  overtime_pay: z.coerce.number().min(0).optional().default(0),
  net_pay: z.coerce.number().min(0).optional().default(0),
  status: z.string().trim().optional().default('DRAFT'),
  base_salary: z.coerce.number().min(0).optional(),
  night_shift_allowance: z.coerce.number().min(0).optional(),
  surgery_allowance: z.coerce.number().min(0).optional(),
  deductions: z.coerce.number().min(0).optional()
});

export const paymentElectionSchema = z.object({
  staff_id: z
    .string({ required_error: 'staff_id is mandatory' })
    .trim()
    .min(1, 'staff_id is mandatory'),
  bank_name: z
    .string({ required_error: 'bank_name is mandatory' })
    .trim()
    .min(1, 'bank_name is mandatory'),
  account_number: z
    .string({ required_error: 'account_number is mandatory' })
    .trim()
    .min(1, 'account_number is mandatory'),
  routing_number: z
    .string({ required_error: 'routing_number is mandatory' })
    .trim()
    .min(1, 'routing_number is mandatory'),
  is_primary: z.boolean().optional().default(true),
  account_holder_name: z.string().trim().optional()
});
