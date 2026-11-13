import { z } from 'zod';

const VALID_NOTIFICATION_TYPES = [
  'ALERT',
  'ANNOUNCEMENT',
  'TASK',
  'SHIFT_ASSIGNED',
  'SHIFT_SWAPPED',
  'EMERGENCY_DISPATCH',
  'SURGE_REQUEST',
  'URGENT_HANDOVER',
  'REST_VIOLATION_ALERT',
  'GENERAL',
  'SYSTEM'
];

export const createNotificationSchema = z
  .object({
    target_staff_id: z.string().trim().optional(),
    staff_id: z.string().trim().optional(),
    title: z
      .string({ required_error: 'title is mandatory' })
      .trim()
      .min(1, 'title is mandatory'),
    message: z
      .string({ required_error: 'message is mandatory' })
      .trim()
      .min(1, 'message is mandatory'),
    type: z
      .enum(VALID_NOTIFICATION_TYPES, {
        errorMap: () => ({ message: 'Invalid notification type. Must be one of: ALERT, ANNOUNCEMENT, TASK' })
      })
      .optional()
      .default('ANNOUNCEMENT')
  })
  .superRefine((data, ctx) => {
    const target = data.target_staff_id || data.staff_id;
    if (!target) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['target_staff_id'],
        message: 'Missing required fields: target_staff_id is mandatory.'
      });
    }
  })
  .transform((data) => ({
    ...data,
    target_staff_id: data.target_staff_id || data.staff_id
  }));
