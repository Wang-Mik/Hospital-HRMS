import { z } from 'zod';

export const employeeBaseSchema = z.object({
  employee_code: z
    .string({ required_error: 'employee_code is mandatory' })
    .trim()
    .min(1, 'employee_code is mandatory'),
  first_name: z
    .string({ required_error: 'first_name is mandatory' })
    .trim()
    .min(1, 'first_name is mandatory'),
  last_name: z
    .string({ required_error: 'last_name is mandatory' })
    .trim()
    .min(1, 'last_name is mandatory'),
  email: z
    .string({ required_error: 'email is mandatory' })
    .trim()
    .email('Email format is invalid'),
  phone: z.string().trim().optional().nullable(),
  department_code: z.string().trim().optional().nullable(),
  department_id: z.union([z.string().trim(), z.number().int()]).optional().nullable(),
  role: z.string().trim().optional().default('STAFF'),
  specialty: z.string().trim().optional().nullable(),
  dob: z.string().trim().optional().nullable(),
  hire_date: z.string().trim().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).optional().default('ACTIVE'),
  national_id: z.string().trim().optional().nullable(),
  personal_email: z.string().trim().email().optional().nullable(),
  personal_phone: z.string().trim().optional().nullable(),
  medical_licenses: z.array(z.any()).optional().default([])
});

export const createEmployeeSchema = employeeBaseSchema;
export const updateEmployeeSchema = employeeBaseSchema.partial();

export const emergencyContactSchema = z.object({
  contact_name: z
    .string({ required_error: 'contact_name is mandatory' })
    .trim()
    .min(1, 'contact_name is mandatory'),
  relationship: z
    .string({ required_error: 'relationship is mandatory' })
    .trim()
    .min(1, 'relationship is mandatory'),
  phone_number: z
    .string({ required_error: 'phone_number is mandatory' })
    .trim()
    .min(1, 'phone_number is mandatory')
});

export const documentUploadSchema = z.object({
  document_name: z
    .string({ required_error: 'document_name is mandatory' })
    .trim()
    .min(1, 'document_name is mandatory'),
  document_type: z
    .enum(
      ['RESUME', 'CONTRACT', 'CERTIFICATE', 'IDENTIFICATION', 'TAX_FORM', 'OTHER'],
      { errorMap: () => ({ message: 'Invalid document_type' }) }
    )
    .default('OTHER'),
  file_url: z
    .string({ required_error: 'file_url is mandatory' })
    .trim()
    .min(1, 'file_url is mandatory'),
  staff_id: z.string().trim().optional()
});
