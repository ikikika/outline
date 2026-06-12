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
  'unplanned',
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

export const manualScheduleSchema = z
  .object({
    date: z.string().regex(datePattern, 'Enter a valid date.'),
    plannedStart: z.string().regex(timePattern, 'Use HH:mm format.'),
    plannedEnd: z.string().regex(timePattern, 'Use HH:mm format.'),
  })
  .refine(
    (data) => timeToMinutes(data.plannedEnd) > timeToMinutes(data.plannedStart),
    {
      message: 'End time must be after start time.',
      path: ['plannedEnd'],
    }
  );

export const manualTimeEntrySchema = z.object({
  durationMinutes: z
    .number()
    .int('Use whole minutes.')
    .min(1, 'At least 1 minute.')
    .max(24 * 60, 'Cannot exceed 24 hours.'),
});

export const autoScheduleObjectSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'Select at least one task.'),
  earliestDate: z.string().regex(datePattern, 'Enter a valid date.'),
  deadline: z
    .string()
    .regex(datePattern, 'Enter a valid date.')
    .optional()
    .or(z.literal('')),
  workStart: z.string().regex(timePattern, 'Use HH:mm format.'),
  workEnd: z.string().regex(timePattern, 'Use HH:mm format.'),
  firstDayStart: z
    .string()
    .regex(timePattern, 'Use HH:mm format.')
    .optional()
    .or(z.literal('')),
  sessionMinutes: z
    .number()
    .int('Use whole minutes.')
    .min(5, 'At least 5 minutes.')
    .max(120, 'Cannot exceed 120 minutes.'),
  shortBreakMinutes: z
    .number()
    .int('Use whole minutes.')
    .min(1, 'At least 1 minute.')
    .max(60, 'Cannot exceed 60 minutes.'),
  longBreakMinutes: z
    .number()
    .int('Use whole minutes.')
    .min(1, 'At least 1 minute.')
    .max(60, 'Cannot exceed 60 minutes.'),
  estimateBuffer: z
    .number()
    .min(1, 'At least 1× the estimate.')
    .max(5, 'Cannot exceed 5× the estimate.'),
  allowSplitAcrossDays: z.boolean(),
});

export type AutoScheduleSchemaContext = {
  /** Local calendar date YYYY-MM-DD in the user's timezone. */
  today: string;
  /** Current local HH:mm in the user's timezone. */
  nowTime: string;
};

export function needsFirstDayStart(
  earliestDate: string,
  workStart: string,
  ctx: AutoScheduleSchemaContext
): boolean {
  return (
    earliestDate === ctx.today &&
    timeToMinutes(workStart) < timeToMinutes(ctx.nowTime)
  );
}

export function createAutoScheduleSchema(ctx: AutoScheduleSchemaContext) {
  return autoScheduleObjectSchema
    .refine(
      (data) => timeToMinutes(data.workEnd) > timeToMinutes(data.workStart),
      {
        message: 'Work end must be after work start.',
        path: ['workEnd'],
      }
    )
    .refine(
      (data) =>
        !data.deadline ||
        data.deadline.localeCompare(data.earliestDate) >= 0,
      {
        message: 'Deadline must be on or after the earliest date.',
        path: ['deadline'],
      }
    )
    .superRefine((data, refineCtx) => {
      if (!needsFirstDayStart(data.earliestDate, data.workStart, ctx)) {
        return;
      }
      if (!data.firstDayStart || !timePattern.test(data.firstDayStart)) {
        refineCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose when to start today.',
          path: ['firstDayStart'],
        });
        return;
      }
      if (timeToMinutes(data.firstDayStart) < timeToMinutes(ctx.nowTime)) {
        refineCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start time today cannot be earlier than now.',
          path: ['firstDayStart'],
        });
      }
      if (timeToMinutes(data.firstDayStart) >= timeToMinutes(data.workEnd)) {
        refineCtx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start time today must be before work end.',
          path: ['firstDayStart'],
        });
      }
    });
}

/** Static schema without a live clock (firstDayStart never required). */
export const autoScheduleSchema = createAutoScheduleSchema({
  today: '1970-01-01',
  nowTime: '00:00',
});


const optionalIdSchema = z
  .string()
  .trim()
  .min(1, 'id must be a non-empty string when provided.')
  .optional();

export const activityCatalogImportSchema = z
  .object({
    activity: z.object({
      title: z.string().trim().min(1, 'Activity title is required.'),
      categoryId: activityCategorySchema,
      notes: z.string().optional(),
      id: optionalIdSchema,
      sortOrder: z.number().finite().optional(),
    }),
    tasks: z.array(
      z
        .object({
          title: z.string().trim().min(1, 'Task title is required.'),
          timeEstimationSeconds: z.number().finite().optional(),
          categoryId: activityCategorySchema.optional(),
          notes: z.string().optional(),
          status: activityStatusSchema.optional(),
          sortOrder: z.number().finite().optional(),
          id: optionalIdSchema,
          activityId: z.string().optional(),
          plannedStart: z.unknown().optional(),
          plannedEnd: z.unknown().optional(),
          date: z.unknown().optional(),
        })
        .superRefine((task, ctx) => {
          if (
            task.plannedStart !== undefined ||
            task.plannedEnd !== undefined ||
            task.date !== undefined
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                'Task scheduling fields are not supported in catalog import.',
            });
          }
        })
    ),
    scheduleBlocks: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scheduleBlocks !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'scheduleBlocks are not supported; import is catalog-only.',
        path: ['scheduleBlocks'],
      });
    }
  });

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
export type ManualScheduleValues = z.infer<typeof manualScheduleSchema>;
export type ManualTimeEntryFormValues = z.infer<typeof manualTimeEntrySchema>;
export type AutoScheduleFormValues = z.infer<typeof autoScheduleObjectSchema>;
export type ActivityCatalogImportValues = z.infer<
  typeof activityCatalogImportSchema
>;
