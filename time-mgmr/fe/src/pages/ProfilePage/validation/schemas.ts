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

export const workInfoSchema = z.object({
  company: z.string().trim().min(2, 'Company must be at least 2 characters.').max(100, 'Company is too long.'),
  linkedinLink: z.string().trim().url('Enter a valid LinkedIn URL.'),
  githubLink: z.string().trim().url('Enter a valid GitHub URL.'),
});

export const interestItemSchema = z.object({
  value: z.string().trim().min(1, 'Interest cannot be empty.').max(50, 'Interest is too long.'),
});

export const interestsSchema = z.object({
  interests: z.array(interestItemSchema).min(1, 'Add at least one interest.'),
});

export type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;
export type WorkInfoFormValues = z.infer<typeof workInfoSchema>;
export type InterestsFormValues = z.infer<typeof interestsSchema>;
