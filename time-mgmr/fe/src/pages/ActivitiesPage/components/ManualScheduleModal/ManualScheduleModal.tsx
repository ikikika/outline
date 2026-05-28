import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import {
  manualScheduleSchema,
  type IApiTask,
  type ManualScheduleValues,
} from '@/features/activities';
import styles from './ManualScheduleModal.module.scss';

interface ManualScheduleModalProps {
  task: IApiTask;
  defaultDate: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: ManualScheduleValues) => Promise<void>;
}

function defaultEndTime(estimationSeconds?: number): string {
  const startMinutes = 9 * 60;
  const durationMinutes = Math.max(
    1,
    Math.round((estimationSeconds ?? 25 * 60) / 60)
  );
  const endMinutes = Math.min(startMinutes + durationMinutes, 23 * 60 + 59);
  return `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(
    endMinutes % 60
  ).padStart(2, '0')}`;
}

export function ManualScheduleModal({
  task,
  defaultDate,
  busy = false,
  error = null,
  onCancel,
  onSubmit,
}: ManualScheduleModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManualScheduleValues>({
    resolver: zodResolver(manualScheduleSchema),
    defaultValues: {
      date: defaultDate,
      plannedStart: '09:00',
      plannedEnd: defaultEndTime(task.timeEstimationSeconds),
    },
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-schedule-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <h2 id="manual-schedule-title" className={styles.title}>
            Schedule {task.title}
          </h2>
          <p className={styles.description}>
            Choose when this task should appear on your timetable.
          </p>

          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="schedule-date">Date</label>
              <Input id="schedule-date" type="date" {...register('date')} />
              {errors.date ? (
                <span className={styles.error}>{errors.date.message}</span>
              ) : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="schedule-start">Start time</label>
              <Input
                id="schedule-start"
                type="time"
                {...register('plannedStart')}
              />
              {errors.plannedStart ? (
                <span className={styles.error}>
                  {errors.plannedStart.message}
                </span>
              ) : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="schedule-end">End time</label>
              <Input
                id="schedule-end"
                type="time"
                {...register('plannedEnd')}
              />
              {errors.plannedEnd ? (
                <span className={styles.error}>
                  {errors.plannedEnd.message}
                </span>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className={styles.submitError} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Scheduling…' : 'Add to timetable'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
