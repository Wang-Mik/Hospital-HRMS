import { z } from 'zod';

const VALID_ALERT_LEVELS = ['LEVEL_1_SURGE', 'LEVEL_2_SURGE', 'LEVEL_3_SURGE', 'CODE_RED'];
const VALID_CALL_OUTCOMES = [
  'ACCEPTED_15M',
  'ACCEPTED_30M',
  'ACCEPTED',
  'UNREACHABLE',
  'REFUSED_VALID',
  'REFUSED_INVALID',
  'REJECTED'
];

export const createDispatchSchema = z.object({
  department_code: z
    .string({ required_error: 'Mã khoa phòng (department_code) là bắt buộc' })
    .trim()
    .min(1, 'Mã khoa phòng (department_code) là bắt buộc'),
  reason: z
    .string({ required_error: 'Lý do điều động (reason) là bắt buộc' })
    .trim()
    .min(1, 'Lý do điều động (reason) là bắt buộc'),
  alert_level: z
    .enum(VALID_ALERT_LEVELS, {
      errorMap: () => ({ message: `alert_level must be one of: ${VALID_ALERT_LEVELS.join(', ')}` })
    })
    .optional()
    .default('LEVEL_1_SURGE'),
  selected_staff_id: z.string().trim().optional().nullable(),
  selected_candidate_id: z.string().trim().optional().nullable(),
  clinical_notes: z.string().trim().max(2000).optional().nullable(),
  required_role: z.string().trim().optional().nullable(),
  staff_type: z.string().trim().optional().nullable()
});

export const logCallSchema = z
  .object({
    call_outcome: z.string().trim().optional(),
    call_result: z.string().trim().optional(),
    note: z.string().trim().max(1000).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    call_notes: z.string().trim().max(1000).optional().nullable()
  })
  .superRefine((data, ctx) => {
    const outcome = data.call_outcome || data.call_result;
    if (!outcome) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['call_outcome'],
        message: 'Kết quả cuộc gọi (call_result / call_outcome) là bắt buộc.'
      });
    } else if (!VALID_CALL_OUTCOMES.includes(outcome)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['call_outcome'],
        message: `call_outcome must be one of: ${VALID_CALL_OUTCOMES.join(', ')}`
      });
    }
  });

export const resolveDispatchSchema = z.object({
  resolution_notes: z.string().trim().max(2000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable()
});
