import { z } from 'zod';

const VALID_TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'title is mandatory' })
    .trim()
    .min(1, 'title is mandatory'),
  assigned_to: z
    .string({ required_error: 'assigned_to is mandatory' })
    .trim()
    .min(1, 'assigned_to is mandatory'),
  assigned_by: z.string().trim().optional().nullable(),
  shift_id: z.string().trim().optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  status: z
    .enum(VALID_TASK_STATUSES, {
      errorMap: () => ({ message: `Invalid status. Must be one of: ${VALID_TASK_STATUSES.join(', ')}` })
    })
    .optional()
    .default('PENDING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  due_date: z.string().trim().optional().nullable(),
  department_code: z.string().trim().optional().nullable()
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateTaskStatusSchema = z.object({
  status: z.enum(VALID_TASK_STATUSES, {
    errorMap: () => ({ message: `Invalid status. Must be one of: ${VALID_TASK_STATUSES.join(', ')}` })
  })
});
