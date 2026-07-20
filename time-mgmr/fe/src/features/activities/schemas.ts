import { z } from 'zod';

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const activityCategorySchema = z.enum([
  'work',
  'deep_work',
  'admin',
  'personal',
  'break',
]);

export const activityStatusSchema = z.enum([
  'planned',
  'in_progress',
  'done',
  'skipped',
]);

function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export const activityFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(120, 'Title is too long.'),
    date: z.string().regex(datePattern, 'Enter a valid date.'),
    plannedStart: z.string().regex(timePattern, 'Use HH:mm format.'),
    plannedEnd: z.string().regex(timePattern, 'Use HH:mm format.'),
    categoryId: activityCategorySchema,
    notes: z.string().max(500, 'Notes are too long.'),
  })
  .refine((data) => timeToMinutes(data.plannedEnd) > timeToMinutes(data.plannedStart), {
    message: 'End time must be after start time.',
    path: ['plannedEnd'],
  });

export const manualTimeEntrySchema = z.object({
  durationMinutes: z
    .number()
    .int('Use whole minutes.')
    .min(1, 'At least 1 minute.')
    .max(24 * 60, 'Cannot exceed 24 hours.'),
});

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
export type ManualTimeEntryFormValues = z.infer<typeof manualTimeEntrySchema>;
