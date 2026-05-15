import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import {
  ACTIVITY_CATEGORIES,
  activityFormSchema,
  type ActivityFormValues,
  type ITask,
} from '@/features/activities';
import styles from './ActivityForm.module.scss';

interface ActivityFormProps {
  date: string;
  initial?: ITask | null;
  onSubmit: (values: ActivityFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  date,
  initial,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      title: initial?.title ?? '',
      date: initial?.date ?? date,
      plannedStart: initial?.plannedStart ?? '09:00',
      plannedEnd: initial?.plannedEnd ?? '10:00',
      categoryId: initial?.categoryId ?? 'work',
      notes: initial?.notes ?? '',
    },
  });

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className={styles.formTitle}>{initial ? 'Edit activity' : 'New activity'}</h2>

      <div className={styles.grid}>
        <div className={`${styles.field} ${styles.full}`}>
          <label className={styles.label} htmlFor="activity-title">
            Title
          </label>
          <Input id="activity-title" placeholder="What will you do?" {...register('title')} />
          {errors.title && <span className={styles.error}>{errors.title.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="activity-date">
            Date
          </label>
          <Input id="activity-date" type="date" {...register('date')} />
          {errors.date && <span className={styles.error}>{errors.date.message}</span>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="activity-category">
            Category
          </label>
          <select
            id="activity-category"
            className={styles.select}
            {...register('categoryId')}
          >
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <span className={styles.error}>{errors.categoryId.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="activity-start">
            Planned start
          </label>
          <Input id="activity-start" type="time" {...register('plannedStart')} />
          {errors.plannedStart && (
            <span className={styles.error}>{errors.plannedStart.message}</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="activity-end">
            Planned end
          </label>
          <Input id="activity-end" type="time" {...register('plannedEnd')} />
          {errors.plannedEnd && (
            <span className={styles.error}>{errors.plannedEnd.message}</span>
          )}
        </div>

        <div className={`${styles.field} ${styles.full}`}>
          <label className={styles.label} htmlFor="activity-notes">
            Notes
          </label>
          <textarea
            id="activity-notes"
            className={styles.textarea}
            placeholder="Optional context"
            {...register('notes')}
          />
          {errors.notes && <span className={styles.error}>{errors.notes.message}</span>}
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : initial ? 'Save changes' : 'Add activity'}
        </Button>
      </div>
    </form>
  );
};
