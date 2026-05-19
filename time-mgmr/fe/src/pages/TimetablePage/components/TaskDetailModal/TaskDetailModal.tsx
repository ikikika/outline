import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  CATEGORY_MAP,
  formatDisplayDate,
  formatMinutes,
  formatSignedMinutes,
  manualTimeEntrySchema,
  plannedDurationMinutes,
  type ITask,
  type ITimeEntry,
  type ManualTimeEntryFormValues,
} from '@/features/activities';
import { buildActivityMetrics, type VarianceKind } from '@/features/reports';
import { useSidebarLayout } from '@/components/organisms/Sidebar/SidebarLayoutContext';
import { getTaskBlockColor } from '../../utils/taskBlockColor/taskBlockColor';
import styles from './TaskDetailModal.module.scss';

interface TaskDetailModalProps {
  task: ITask;
  entries: ITimeEntry[];
  runningEntry: ITimeEntry | null;
  busy?: boolean;
  onClose: () => void;
  onEdit: (task: ITask) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, status: ITask['status']) => void;
  onStart: (taskId: string) => void;
  onStop: (entryId: string) => void;
  onLogManual: (taskId: string, durationMinutes: number) => Promise<void> | void;
}

function varianceClass(kind: VarianceKind): string {
  if (kind === 'over') return styles.over;
  if (kind === 'under') return styles.under;
  if (kind === 'on_target') return styles.onTarget;
  return '';
}

/** Format seconds as M:SS or H:MM:SS. */
export function formatClock(totalSeconds: number): string {
  const abs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${m}:${ss}`;
}

export function formatSessionTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function sessionDurationSeconds(entry: ITimeEntry, nowMs: number): number {
  if (entry.source === 'manual' && entry.durationMinutes != null) {
    return entry.durationMinutes * 60;
  }

  const startMs = new Date(entry.startAt).getTime();
  const endMs = entry.endAt ? new Date(entry.endAt).getTime() : nowMs;
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

export function elapsedSecondsForEntries(entries: ITimeEntry[], nowMs: number): number {
  return entries.reduce((sum, entry) => sum + sessionDurationSeconds(entry, nowMs), 0);
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  entries,
  runningEntry,
  busy = false,
  onClose,
  onEdit,
  onDelete,
  onStatus,
  onStart,
  onStop,
  onLogManual,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sidebarOpenRef = useRef(true);
  const [showManual, setShowManual] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { isOpen: sidebarOpen, open: openSidebar, close: closeSidebar } = useSidebarLayout();
  sidebarOpenRef.current = sidebarOpen;
  const category = CATEGORY_MAP[task.categoryId];
  const metrics = buildActivityMetrics(task, entries);
  const isRunningHere = runningEntry?.taskId === task.id;
  const accent = getTaskBlockColor(task.activityId);
  const plannedSeconds = plannedDurationMinutes(task.plannedStart, task.plannedEnd) * 60;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualTimeEntryFormValues>({
    resolver: zodResolver(manualTimeEntrySchema),
    defaultValues: { durationMinutes: 30 },
  });

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (focusMode) {
        setFocusMode(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, focusMode]);

  useEffect(() => {
    if (!focusMode && !isRunningHere) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [focusMode, isRunningHere]);

  useEffect(() => {
    if (!focusMode) return;
    const wasOpen = sidebarOpenRef.current;
    closeSidebar();
    return () => {
      if (wasOpen) openSidebar();
    };
  }, [focusMode, closeSidebar, openSidebar]);

  const elapsedSeconds = useMemo(
    () => Math.floor(elapsedSecondsForEntries(entries, nowMs)),
    [entries, nowMs]
  );
  const sessionEntries = useMemo(
    () => [...entries].sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [entries]
  );
  const remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds);

  const submitManual = handleSubmit(async (values) => {
    await onLogManual(task.id, values.durationMinutes);
    reset({ durationMinutes: 30 });
    setShowManual(false);
  });

  const handleFocusPrimary = () => {
    if (isRunningHere && runningEntry) {
      onStop(runningEntry.id);
      return;
    }
    onStart(task.id);
  };

  if (focusMode) {
    return (
      <div
        className={styles.focusBackdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-focus-title"
        style={{ ['--focus-accent' as string]: accent }}
      >
        <div className={styles.focusTop}>
          <p className={styles.focusEyebrow}>Focus</p>
        </div>

        <div className={styles.focusBody}>
          <h2 id="task-focus-title" className={styles.focusTitle}>
            {task.title}
          </h2>

          <div className={styles.focusControls}>
            <button
              type="button"
              className={`${styles.focusPrimary} ${isRunningHere ? styles.focusPrimaryStop : ''}`}
              disabled={busy || (!isRunningHere && Boolean(runningEntry))}
              title={
                !isRunningHere && runningEntry ? 'Stop the current timer first' : undefined
              }
              onClick={handleFocusPrimary}
            >
              {isRunningHere ? 'Stop' : 'Start'}
            </button>

            <div className={styles.focusSide}>
              <div className={styles.focusTimes}>
                <div className={styles.focusTimeItem}>
                  <span className={styles.focusTimeLabel}>Elapsed</span>
                  <span className={styles.focusTimeValue}>{formatClock(elapsedSeconds)}</span>
                </div>
                <div className={styles.focusTimeItem}>
                  <span className={styles.focusTimeLabel}>Remaining</span>
                  <span className={styles.focusTimeValue}>{formatClock(remainingSeconds)}</span>
                </div>
              </div>

              <button
                type="button"
                className={styles.focusExit}
                aria-label="Exit focus mode"
                onClick={() => setFocusMode(false)}
              >
                <Minimize2 size={16} strokeWidth={2} aria-hidden />
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.top}>
          <div>
            <p className={styles.eyebrow}>Task details</p>
            <h2 id="task-detail-title" className={styles.title}>
              {task.title}
            </h2>
            <div className={styles.badges}>
              <span
                className={styles.badge}
                style={{ background: `${category.color}22`, color: category.color }}
              >
                <span className={styles.badgeDot} style={{ background: category.color }} />
                {category.label}
              </span>
              <span className={styles.badge} style={{ background: '#f3f4f6', color: '#374151' }}>
                {task.status.replace('_', ' ')}
              </span>
              {isRunningHere ? <span className={styles.running}>Timer running</span> : null}
            </div>
          </div>
          <div className={styles.topActions}>
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Expand to full screen"
              onClick={() => setFocusMode(true)}
            >
              <Maximize2 size={18} strokeWidth={2} />
            </button>
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <dl className={styles.details}>
          <div className={styles.row}>
            <dt>Date</dt>
            <dd className={styles.value}>{formatDisplayDate(task.date)}</dd>
          </div>
          <div className={styles.row}>
            <dt>Planned</dt>
            <dd className={styles.value}>
              {task.plannedStart}–{task.plannedEnd} · {formatMinutes(metrics.plannedMinutes)}
            </dd>
          </div>
          <div className={styles.row}>
            <dt>Actual</dt>
            <dd className={styles.value}>{formatMinutes(metrics.actualMinutes)}</dd>
          </div>
          <div className={styles.row}>
            <dt>Variance</dt>
            <dd className={`${styles.value} ${varianceClass(metrics.varianceKind)}`}>
              {formatSignedMinutes(metrics.varianceMinutes)}
            </dd>
          </div>
          {task.notes ? (
            <div className={`${styles.row} ${styles.notes}`}>
              <dt>Notes</dt>
              <dd className={styles.value}>{task.notes}</dd>
            </div>
          ) : null}
        </dl>

        <section className={styles.sessionLog} aria-labelledby="work-session-log-title">
          <div className={styles.sessionLogHeader}>
            <h3 id="work-session-log-title">Work sessions</h3>
            <span>{sessionEntries.length}</span>
          </div>
          {sessionEntries.length > 0 ? (
            <ul className={styles.entries}>
              {sessionEntries.map((entry) => (
                <li key={entry.id} className={styles.sessionEntry}>
                  <div className={styles.sessionPeriod}>
                    <time dateTime={entry.startAt}>{formatSessionTimestamp(entry.startAt)}</time>
                    <span aria-hidden="true">–</span>
                    {entry.endAt ? (
                      <time dateTime={entry.endAt}>{formatSessionTimestamp(entry.endAt)}</time>
                    ) : (
                      <span className={styles.sessionActive}>In progress</span>
                    )}
                  </div>
                  <div className={styles.sessionSummary}>
                    <span className={styles.sessionSource}>{entry.source}</span>
                    <span>{formatClock(sessionDurationSeconds(entry, nowMs))}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.sessionEmpty}>No work sessions recorded yet.</p>
          )}
        </section>

        <div className={styles.actions}>
          {isRunningHere && runningEntry ? (
            <Button size="sm" disabled={busy} onClick={() => onStop(runningEntry.id)}>
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy || Boolean(runningEntry)}
              onClick={() => onStart(task.id)}
              title={runningEntry ? 'Stop the current timer first' : undefined}
            >
              Start
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setShowManual((v) => !v)}
          >
            Log time
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onStatus(task.id, 'done')}
          >
            Done
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onStatus(task.id, 'skipped')}
          >
            Skip
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onEdit(task)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => onDelete(task.id)}
          >
            Delete
          </Button>
        </div>

        {showManual ? (
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
            {errors.durationMinutes ? (
              <span className={styles.over}>{errors.durationMinutes.message}</span>
            ) : null}
          </form>
        ) : null}
      </div>
    </div>
  );
};
