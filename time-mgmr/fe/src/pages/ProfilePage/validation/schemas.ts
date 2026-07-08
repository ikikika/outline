import { z } from 'zod';
import { VALIDATION_RULES } from '@/core/constants/app';

const phonePattern = /^[+\d\s().-]{7,20}$/;

export const basicInfoSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100, 'Name is too long.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z
    .string()
    .trim()
    .min(7, 'Phone number is too short.')
    .max(20, 'Phone number is too long.')
    .regex(phonePattern, 'Enter a valid phone number.'),
});

export type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(
        VALIDATION_RULES.PASSWORD_MIN_LENGTH,
        `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters.`
      ),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: 'New password must be different from current password.',
    path: ['newPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
