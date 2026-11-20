import { z } from 'zod';
import { clinicalDateOnlySchema } from './commonValidation.js';

const VALID_PAYROLL_STATUSES = ['DRAFT', 'PROCESSING', 'APPROVED', 'COMPLETED', 'CANCELLED'];
const VALID_PAYSLIP_STATUSES = ['DRAFT', 'CALCULATED', 'PAID', 'CANCELLED'];
const VALID_IMPORT_SOURCES = ['SYSTEM_AUTO', 'ACCOUNTING_IMPORT', 'MANUAL'];

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

export const generatePayrollRunSchema = z
  .object({
    start_date: clinicalDateOnlySchema,
    end_date: clinicalDateOnlySchema
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

export const updatePayRateSchema = z.object({
  base_hourly_rate: z.coerce
    .number({ required_error: 'base_hourly_rate is mandatory' })
    .min(0, 'base_hourly_rate must be >= 0'),
  tax_tier: z.string().trim().max(50).optional().default('TIER_1')
});

export const reportPaySlipIssueSchema = z.object({
  message: z
    .string({ required_error: 'Vui lòng mô tả nội dung cần đối soát' })
    .trim()
    .min(5, 'Nội dung phản ánh tối thiểu 5 ký tự')
    .max(500, 'Nội dung phản ánh tối đa 500 ký tự')
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
  on_call_allowance: z.coerce.number().min(0).optional().default(0),
  surgery_allowance: z.coerce.number().min(0).optional().default(0),
  kpi_bonus: z.coerce.number().min(0).optional().default(0),
  social_insurance: z.coerce.number().min(0).optional().default(0),
  tax_deductions: z.coerce.number().min(0).optional().default(0),
  other_deductions: z.coerce.number().min(0).optional().default(0),
  net_pay: z.coerce.number().min(0).optional().default(0),
  status: z
    .enum(VALID_PAYSLIP_STATUSES, {
      errorMap: () => ({ message: `Invalid pay slip status. Must be one of: ${VALID_PAYSLIP_STATUSES.join(', ')}` })
    })
    .optional()
    .default('DRAFT'),
  import_source: z.enum(VALID_IMPORT_SOURCES).optional().default('MANUAL'),
  notes: z.string().trim().max(500).optional().nullable()
});

const importPaySlipRowSchema = z.object({
  staff_id: z
    .string({ required_error: 'staff_id is mandatory' })
    .trim()
    .min(1, 'staff_id is mandatory'),
  base_pay: z.coerce.number().min(0, 'base_pay must be >= 0').optional().default(0),
  night_differential: z.coerce.number().min(0, 'night_differential must be >= 0').optional().default(0),
  overtime_pay: z.coerce.number().min(0, 'overtime_pay must be >= 0').optional().default(0),
  on_call_allowance: z.coerce.number().min(0, 'on_call_allowance must be >= 0').optional().default(0),
  surgery_allowance: z.coerce.number().min(0, 'surgery_allowance must be >= 0').optional().default(0),
  kpi_bonus: z.coerce.number().min(0, 'kpi_bonus must be >= 0').optional().default(0),
  social_insurance: z.coerce.number().min(0, 'social_insurance must be >= 0').optional().default(0),
  tax_deductions: z.coerce.number().min(0, 'tax_deductions must be >= 0').optional().default(0),
  other_deductions: z.coerce.number().min(0, 'other_deductions must be >= 0').optional().default(0),
  net_pay: z.coerce.number().min(0, 'net_pay must be >= 0').optional(),
  status: z
    .enum(VALID_PAYSLIP_STATUSES, {
      errorMap: () => ({ message: `Invalid pay slip status. Must be one of: ${VALID_PAYSLIP_STATUSES.join(', ')}` })
    })
    .optional()
    .default('CALCULATED'),
  notes: z.string().trim().max(500).optional().nullable()
});

export const importPaySlipsSchema = z.object({
  mode: z.enum(['UPSERT', 'REPLACE_RUN_SLIPS']).optional().default('UPSERT'),
  source_filename: z.string().trim().max(255).optional().nullable(),
  slips: z
    .array(importPaySlipRowSchema, { required_error: 'slips array is mandatory' })
    .min(1, 'Danh sách bảng lương phải có ít nhất 1 nhân viên')
    .max(2000, 'Tối đa 2000 nhân viên cho mỗi lần nhập')
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
