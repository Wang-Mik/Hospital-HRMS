import { z } from 'zod';

const VALID_HANDOVER_STATUSES = ['DRAFT', 'PENDING_SIGNATURE', 'COMPLETED'];

export const createHandoverSchema = z.object({
  outgoing_shift_id: z
    .string({ required_error: 'outgoing_shift_id is mandatory' })
    .trim()
    .min(1, 'outgoing_shift_id is mandatory'),
  logged_by: z
    .string({ required_error: 'logged_by is mandatory' })
    .trim()
    .min(1, 'logged_by is mandatory'),
  incoming_shift_id: z.string().trim().optional().nullable(),
  department_code: z.string().trim().optional().nullable(),
  handover_category: z.string().trim().optional().default('SHIFT_HANDOVER'),
  doc_type: z.string().trim().optional().default('PHYSICAL_BOOK'),
  file_url: z.string().trim().optional().nullable(),
  external_link: z.string().trim().optional().nullable(),
  physical_book_name: z.string().trim().optional().nullable(),
  physical_book_page: z.string().trim().optional().nullable(),
  physical_storage_location: z.string().trim().optional().nullable(),
  summary_metrics: z.any().optional().nullable(),
  critical_notes: z.string().trim().optional().nullable(),
  status: z
    .enum(VALID_HANDOVER_STATUSES, {
      errorMap: () => ({ message: `Invalid status. Must be one of: ${VALID_HANDOVER_STATUSES.join(', ')}` })
    })
    .optional()
    .default('COMPLETED'),
  acknowledged_by: z.string().trim().optional().nullable(),
  checklists: z
    .array(
      z.object({
        item_description: z.string().trim().min(1, 'item_description is mandatory'),
        is_verified: z.boolean().optional().default(false)
      })
    )
    .optional()
    .default([]),
  situation: z.string().trim().optional().nullable(),
  background: z.string().trim().optional().nullable(),
  assessment: z.string().trim().optional().nullable(),
  recommendation: z.string().trim().optional().nullable(),
  critical_patients: z.array(z.any()).optional().default([]),
  biomedical_equipment: z.array(z.any()).optional().default([]),
  pending_tasks: z.array(z.any()).optional().default([])
});

export const updateHandoverSchema = createHandoverSchema.partial();

export const signHandoverSchema = z.object({
  acknowledged_by: z
    .string({ required_error: 'acknowledged_by is mandatory to sign handover' })
    .trim()
    .min(1, 'acknowledged_by is mandatory to sign handover'),
  signer_role: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable()
});

export const createChecklistItemSchema = z.object({
  item_description: z
    .string({ required_error: 'item_description is mandatory' })
    .trim()
    .min(1, 'item_description is mandatory'),
  is_verified: z.boolean().optional().default(false)
});
