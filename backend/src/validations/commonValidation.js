import { z } from 'zod';

/**
 * Helper function to parse and format any valid Date/ISO/SQL string into standard MySQL DATETIME 'YYYY-MM-DD HH:mm:ss'
 * Immune to timezone shifts for GMT+7
 *
 * @param {string|Date} val
 * @returns {string}
 */
export function parseToClinicalDateTime(val) {
  if (!val) return '';
  if (typeof val === 'string') {
    const sqlMatch = val.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/);
    if (sqlMatch) {
      const sec = sqlMatch[3] || '00';
      return `${sqlMatch[1]} ${sqlMatch[2]}:${sec}`;
    }
  }

  const parsedDate = new Date(val);
  if (isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date-time format. Expected YYYY-MM-DD HH:mm:ss or ISO 8601');
  }

  const pad = (n) => String(n).padStart(2, '0');
  return `${parsedDate.getFullYear()}-${pad(parsedDate.getMonth() + 1)}-${pad(parsedDate.getDate())} ${pad(parsedDate.getHours())}:${pad(parsedDate.getMinutes())}:${pad(parsedDate.getSeconds())}`;
}

/**
 * Normalizes any valid Date/ISO/SQL string into standard MySQL DATETIME 'YYYY-MM-DD HH:mm:ss'
 */
export const clinicalDateTimeSchema = z
  .string({ required_error: 'Thời gian là bắt buộc' })
  .trim()
  .min(1, 'Thời gian không được để trống')
  .transform((val, ctx) => {
    try {
      return parseToClinicalDateTime(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Định dạng thời gian không hợp lệ. Yêu cầu format YYYY-MM-DD HH:mm:ss hoặc ISO 8601'
      });
      return z.NEVER;
    }
  });

/**
 * Validates 'YYYY-MM-DD' calendar date
 */
export const clinicalDateOnlySchema = z
  .string({ required_error: 'Ngày là bắt buộc' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD');

/**
 * Validates hospital employee code (EMP-...)
 */
export const employeeCodeSchema = z
  .string({ required_error: 'Mã cán bộ là bắt buộc' })
  .trim()
  .regex(/^EMP-[A-Z0-9-]+$/i, 'Mã cán bộ phải có định dạng EMP-xxx');

/**
 * Validates hospital department code (DEP-...)
 */
export const departmentCodeSchema = z
  .string({ required_error: 'Mã khoa phòng là bắt buộc' })
  .trim()
  .regex(/^DEP-[A-Z0-9-]+$/i, 'Mã khoa phòng phải có định dạng DEP-xxx');

/**
 * Validates standard UUID v4 identifier
 */
export const uuidSchema = z
  .string({ required_error: 'UUID là bắt buộc' })
  .trim()
  .uuid('Định dạng UUID không hợp lệ');

/**
 * Validates Ministry of Health BHYT Case Reference format (10-20 uppercase alphanumeric)
 */
export const bhytCaseRefSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9]{10,20}$/, 'Mã hồ sơ bệnh án BHYT không hợp lệ (10-20 ký tự in hoa/chữ số)');

/**
 * Generic route param :id validation (accepts numeric ID, string code, or UUID)
 */
export const idParamSchema = z.object({
  id: z.string().trim().min(1, 'ID là bắt buộc')
});

/**
 * Generic pagination and query filter schema with type coercion
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  search: z.string().trim().optional(),
  department_code: z.string().trim().optional(),
  status: z.string().trim().optional()
});
