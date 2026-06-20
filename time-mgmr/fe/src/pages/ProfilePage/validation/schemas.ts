import { z } from 'zod';

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
