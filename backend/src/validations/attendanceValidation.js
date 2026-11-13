import { z } from 'zod';
import { clinicalDateTimeSchema } from './commonValidation.js';

export const clockInSchema = z.object({
  staff_id: z.string({ required_error: 'staff_id is mandatory' }).trim().min(1, 'staff_id is mandatory'),
  shift_id: z.union([z.string().trim(), z.number().int()]).optional().nullable(),
  clock_in_method: z
    .enum(
      ['BIOMETRIC', 'RFID_CARD', 'MOBILE_GEOFENCE', 'KIOSK_TERMINAL', 'MANUAL_OVERRIDE', 'WEB', 'KIOSK', 'RFID'],
      {
        errorMap: () => ({ message: 'Invalid clock_in_method' })
      }
    )
    .default('KIOSK_TERMINAL'),
  clock_in_time: clinicalDateTimeSchema.optional().nullable()
});

export const clockOutSchema = z.object({
  clock_out_time: clinicalDateTimeSchema.optional(),
  handover_notes: z.string().trim().max(5000).optional().nullable(),
  is_overrun: z.boolean().default(false),
  overrun_minutes: z.coerce.number().int().min(0).default(0),
  overrun_reason: z.string().trim().max(255).optional().nullable(),
  clinical_case_ref: z.string().trim().max(100).optional().nullable()
});

export const kioskCheckoutSchema = z.object({
  staff_id: z.string({ required_error: 'staff_id is mandatory' }).trim().min(1, 'staff_id is mandatory'),
  shift_id: z.union([z.string().trim(), z.number().int()], {
    required_error: 'shift_id is mandatory'
  }),
  is_overrun: z.boolean().default(false),
  overrun_minutes: z.coerce.number().int().min(0).default(0),
  overrun_reason: z.string().trim().max(255).optional().nullable(),
  clinical_case_ref: z.string().trim().max(100).optional().nullable()
});
