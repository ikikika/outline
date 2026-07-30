import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { ModalShell } from '@/components/molecules/ModalShell/ModalShell';
import {
  ADHOC_WEEKDAY_OPTIONS,
  addDays,
  adhocBlockSchema,
  parseDateKey,
  type AdhocBlockValues,
} from '@/features/activities';
import styles from './AdhocBlockModal.module.scss';

interface AdhocBlockModalProps {
  defaultDate: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: AdhocBlockValues) => Promise<void>;
}

export function AdhocBlockModal({
  defaultDate,
  busy = false,
  error = null,
  onCancel,
  onSubmit,
}: AdhocBlockModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AdhocBlockValues>({
    resolver: zodResolver(adhocBlockSchema),
    defaultValues: {
      title: '',
      date: defaultDate,
      plannedStart: '09:00',
      plannedEnd: '10:00',
      repeating: false,
      repeatEndDate: '',
      repeatWeekdays: [],
    },
  });

  const repeating = watch('repeating');
  const startDate = watch('date');
  const repeatWeekdays = watch('repeatWeekdays') ?? [];
  const wasRepeatingRef = useRef(false);

  useEffect(() => {
    if (repeating && !wasRepeatingRef.current) {
      const anchor = startDate || defaultDate;
      setValue('repeatEndDate', addDays(anchor, 28), { shouldDirty: true });
      setValue('repeatWeekdays', [parseDateKey(anchor).getDay()], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    wasRepeatingRef.current = Boolean(repeating);
  }, [repeating, startDate, defaultDate, setValue]);

  const toggleWeekday = (day: number) => {
    const next = repeatWeekdays.includes(day)
      ? repeatWeekdays.filter((value) => value !== day)
      : [...repeatWeekdays, day].sort((a, b) => a - b);
    setValue('repeatWeekdays', next, { shouldValidate: true, shouldDirty: true });
  };

  return (
    <ModalShell
      onDismiss={onCancel}
      dismissDisabled={busy}
      backdropClassName={styles.backdrop}
      panelClassName={styles.modal}
      labelledBy="adhoc-block-title"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <h2 id="adhoc-block-title" className={styles.title}>
          Add adhoc block
        </h2>
        <p className={styles.description}>
          Reserve time on your timetable. Adhoc blocks are excluded from reports.
        </p>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label htmlFor="adhoc-title">Title</label>
            <Input
              id="adhoc-title"
              type="text"
              placeholder="e.g. Doctor appointment"
              {...register('title')}
            />
            {errors.title ? (
              <span className={styles.error}>{errors.title.message}</span>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="adhoc-date">{repeating ? 'Start date' : 'Date'}</label>
            <Input id="adhoc-date" type="date" {...register('date')} />
            {errors.date ? (
              <span className={styles.error}>{errors.date.message}</span>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor="adhoc-start">Start time</label>
            <Input
              id="adhoc-start"
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
            <label htmlFor="adhoc-end">End time</label>
            <Input id="adhoc-end" type="time" {...register('plannedEnd')} />
            {errors.plannedEnd ? (
              <span className={styles.error}>{errors.plannedEnd.message}</span>
            ) : null}
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label className={styles.checkLabel} htmlFor="adhoc-repeating">
              <input
                id="adhoc-repeating"
                type="checkbox"
                className={styles.checkbox}
                {...register('repeating')}
              />
              Repeating task
            </label>
          </div>

          {repeating ? (
            <>
              <div className={styles.field}>
                <label htmlFor="adhoc-repeat-end">Repeat until</label>
                <Input
                  id="adhoc-repeat-end"
                  type="date"
                  min={watch('date')}
                  {...register('repeatEndDate')}
                />
                {errors.repeatEndDate ? (
                  <span className={styles.error}>
                    {errors.repeatEndDate.message}
                  </span>
                ) : null}
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <span className={styles.weekdaysLabel} id="adhoc-weekdays-label">
                  Days of the week
                </span>
                <div
                  className={styles.weekdays}
                  role="group"
                  aria-labelledby="adhoc-weekdays-label"
                >
                  {ADHOC_WEEKDAY_OPTIONS.map((day) => {
                    const selected = repeatWeekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`${styles.weekdayBtn} ${
                          selected ? styles.weekdayBtnActive : ''
                        }`}
                        aria-pressed={selected}
                        onClick={() => toggleWeekday(day.value)}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
                {errors.repeatWeekdays ? (
                  <span className={styles.error}>
                    {errors.repeatWeekdays.message}
                  </span>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {error ? <p className={styles.submitError}>{error}</p> : null}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? 'Adding…' : repeating ? 'Add repeats' : 'Add block'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
