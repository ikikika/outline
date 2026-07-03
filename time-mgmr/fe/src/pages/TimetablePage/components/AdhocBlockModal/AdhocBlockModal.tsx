import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { ModalShell } from '@/components/molecules/ModalShell/ModalShell';
import {
  adhocBlockSchema,
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
    formState: { errors },
  } = useForm<AdhocBlockValues>({
    resolver: zodResolver(adhocBlockSchema),
    defaultValues: {
      title: '',
      date: defaultDate,
      plannedStart: '09:00',
      plannedEnd: '10:00',
    },
  });

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
            <label htmlFor="adhoc-date">Date</label>
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
            {busy ? 'Adding…' : 'Add block'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
