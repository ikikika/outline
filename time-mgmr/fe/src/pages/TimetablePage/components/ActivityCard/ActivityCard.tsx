import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui';
import {
  CATEGORY_MAP,
  formatMinutes,
  formatSignedMinutes,
  manualTimeEntrySchema,
  type ITimetableBlock,
  type ITimeEntry,
  type ManualTimeEntryFormValues,
} from '@/features/activities';
import {
  buildActivityMetrics,
  type VarianceKind,
} from '@/features/reports';
import styles from './ActivityCard.module.scss';

interface ActivityCardProps {
  activity: ITimetableBlock;
  entries: ITimeEntry[];
  runningEntry: ITimeEntry | null;
  onEdit: (activity: ITimetableBlock) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, status: ITimetableBlock['status']) => void;
  onStart: (activityId: string) => void;
  onStop: (entryId: string) => void;
  onPause: (entryId: string) => void;
  onLogManual: (activityId: string, durationMinutes: number) => Promise<void> | void;
  busy?: boolean;
}

function varianceClass(kind: VarianceKind): string {
  if (kind === 'over') return styles.over;
  if (kind === 'under') return styles.under;
  if (kind === 'on_target') return styles.onTarget;
  return '';
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  entries,
  runningEntry,
  onEdit,
  onDelete,
  onStatus,
  onStart,
  onStop,
  onPause,
  onLogManual,
  busy = false,
}) => {
  const [showManual, setShowManual] = useState(false);
  const category = CATEGORY_MAP[activity.categoryId];
  const metrics = buildActivityMetrics(activity, entries);
  const taskId = activity.taskId ?? activity.id;
  const isRunningHere = runningEntry?.taskId === taskId;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualTimeEntryFormValues>({
    resolver: zodResolver(manualTimeEntrySchema),
    defaultValues: { durationMinutes: 30 },
  });

  const submitManual = handleSubmit(async (values) => {
    await onLogManual(taskId, values.durationMinutes);
    reset({ durationMinutes: 30 });
    setShowManual(false);
  });

  return (
    <article className={styles.card} data-testid={`activity-${activity.id}`}>
      <div className={styles.top}>
        <div className={styles.identity}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{activity.title}</h3>
            <span
              className={styles.badge}
              style={{ background: `${category.color}22`, color: category.color }}
            >
              <span className={styles.badgeDot} style={{ background: category.color }} />
              {category.label}
            </span>
            <span className={styles.badge} style={{ background: '#f3f4f6', color: '#374151' }}>
              {activity.status.replace('_', ' ')}
            </span>
            {isRunningHere && <span className={styles.running}>Timer running</span>}
          </div>
          <div className={styles.meta}>
            <span>
              Planned {activity.plannedStart}–{activity.plannedEnd}
            </span>
            <span>{formatMinutes(metrics.plannedMinutes)} planned</span>
          </div>
        </div>
      </div>

      <div className={styles.metrics}>
        <span>
          Actual{' '}
          <span className={styles.metricStrong}>{formatMinutes(metrics.actualMinutes)}</span>
        </span>
        <span className={varianceClass(metrics.varianceKind)}>
          Variance {formatSignedMinutes(metrics.varianceMinutes)}
        </span>
        {metrics.entryCount > 0 && <span>{metrics.entryCount} time entries</span>}
      </div>

      {activity.notes ? <p className={styles.notes}>{activity.notes}</p> : null}

      {entries.length > 0 && (
        <ul className={styles.entries}>
          {entries.map((entry) => (
            <li key={entry.id}>
              {entry.source} ·{' '}
              {entry.durationMinutes != null
                ? formatMinutes(entry.durationMinutes)
                : 'in progress'}
              {entries.length > 1 ? ` · ${new Date(entry.startAt).toLocaleTimeString()}` : ''}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        {isRunningHere && runningEntry ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onPause(runningEntry.id)}
            >
              Pause
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onStop(runningEntry.id)}>
              Stop
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            disabled={busy || Boolean(runningEntry)}
            onClick={() => onStart(taskId)}
            title={runningEntry ? 'Stop the current timer first' : undefined}
          >
            Start
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowManual((v) => !v)}>
          Log time
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onStatus(taskId, 'done')}
        >
          Done
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => onStatus(taskId, 'skipped')}
        >
          Skip
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onEdit(activity)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => onDelete(taskId)}
        >
          Delete
        </Button>
      </div>

      {showManual && (
        <form className={styles.manualRow} onSubmit={submitManual}>
          <input
            className={styles.manualInput}
            type="number"
            min={1}
            step={1}
            aria-label="Minutes spent"
            {...register('durationMinutes', { valueAsNumber: true })}
          />
          <Button size="sm" type="submit" disabled={busy}>
            Add minutes
          </Button>
          {errors.durationMinutes && (
            <span className={styles.over}>{errors.durationMinutes.message}</span>
          )}
        </form>
      )}
    </article>
  );
};
