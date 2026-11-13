import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string({ required_error: 'username and password are required.' })
    .trim()
    .min(1, 'username and password are required.'),
  password: z
    .string({ required_error: 'username and password are required.' })
    .min(1, 'username and password are required.')
});

export const registerSchema = z.object({
  employee_id: z.union([z.number().int().positive(), z.string().trim().min(1)], {
    required_error: 'employee_id is mandatory.'
  }),
  username: z
    .string({ required_error: 'username is mandatory.' })
    .trim()
    .min(3, 'Tên đăng nhập tối thiểu 3 ký tự'),
  password: z
    .string({ required_error: 'password is mandatory.' })
    .min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  role_code: z.string().trim().optional()
});

export const changePasswordSchema = z.object({
  oldPassword: z.string({ required_error: 'Mật khẩu cũ là bắt buộc' }).min(1, 'Mật khẩu cũ là bắt buộc'),
  newPassword: z.string({ required_error: 'Mật khẩu mới là bắt buộc' }).min(6, 'Mật khẩu mới tối thiểu 6 ký tự')
});
