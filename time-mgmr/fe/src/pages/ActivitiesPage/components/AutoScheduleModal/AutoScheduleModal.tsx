import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input } from '@/components/ui';
import { utcToZonedParts } from '@/core/utils/timeZone/timeZone';
import {
  createAutoScheduleSchema,
  formatMinutes,
  needsFirstDayStart,
  type AutoScheduleFormValues,
  type IActivityWithTasks,
  type IAutoSchedulePreviewResponse,
  type IAutoScheduleRequest,
} from '@/features/activities';
import { useResolvedTimeZone } from '@/features/activities/hooks/useActivities';
import styles from './AutoScheduleModal.module.scss';

type ModalStep = 'configure' | 'preview';

interface AutoScheduleModalProps {
  activity: IActivityWithTasks;
  defaultDate: string;
  busy?: boolean;
  error?: string | null;
  preview: IAutoSchedulePreviewResponse | null;
  onCancel: () => void;
  onPreview: (request: IAutoScheduleRequest) => Promise<void>;
  onConfirm: (request: IAutoScheduleRequest & { previewToken: string }) => Promise<void>;
  onBack: () => void;
}

function defaultSelectedTaskIds(tasks: IActivityWithTasks['tasks']): string[] {
  const unplanned = tasks.filter((task) => task.status === 'unplanned');
  return (unplanned.length > 0 ? unplanned : tasks).map((task) => task.id);
}

function blockLabel(
  blockType: IAutoSchedulePreviewResponse['days'][number]['blocks'][number]['blockType']
): string {
  if (blockType === 'focus') return 'Focus';
  if (blockType === 'long_break') return 'Long break';
  return 'Short break';
}

function currentLocalParts(timeZone: string): { date: string; time: string } {
  return utcToZonedParts(new Date().toISOString(), timeZone);
}

export function AutoScheduleModal({
  activity,
  defaultDate,
  busy = false,
  error = null,
  preview,
  onCancel,
  onPreview,
  onConfirm,
  onBack,
}: AutoScheduleModalProps) {
  const timeZone = useResolvedTimeZone();
  const step: ModalStep = preview ? 'preview' : 'configure';
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(() =>
    defaultSelectedTaskIds(activity.tasks)
  );
  const [clock, setClock] = useState(() => currentLocalParts(timeZone));
  const clockRef = useRef(clock);
  clockRef.current = clock;

  useEffect(() => {
    setClock(currentLocalParts(timeZone));
    const intervalId = window.setInterval(() => {
      setClock(currentLocalParts(timeZone));
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [timeZone]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm<AutoScheduleFormValues>({
    resolver: async (values, context, options) => {
      const dynamicSchema = createAutoScheduleSchema({
        today: clockRef.current.date,
        nowTime: clockRef.current.time,
      });
      return zodResolver(dynamicSchema)(values, context, options);
    },
    defaultValues: {
      taskIds: defaultSelectedTaskIds(activity.tasks),
      earliestDate: defaultDate,
      deadline: '',
      workStart: '09:00',
      workEnd: '17:00',
      firstDayStart: '',
      sessionMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      estimateBuffer: 1.5,
      allowSplitAcrossDays: false,
    },
  });

  const earliestDate = watch('earliestDate');
  const workStart = watch('workStart');
  const showFirstDayStart = needsFirstDayStart(earliestDate, workStart, {
    today: clock.date,
    nowTime: clock.time,
  });

  useEffect(() => {
    if (!showFirstDayStart) {
      setValue('firstDayStart', '');
      return;
    }
    const current = getValues('firstDayStart');
    if (!current) {
      setValue('firstDayStart', clock.time);
    }
  }, [showFirstDayStart, clock.time, getValues, setValue]);

  const taskTitleById = useMemo(
    () => new Map(activity.tasks.map((task) => [task.id, task.title])),
    [activity.tasks]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  const buildRequest = (values: AutoScheduleFormValues): IAutoScheduleRequest => ({
    activityId: activity.id,
    taskIds: selectedTaskIds,
    earliestDate: values.earliestDate,
    ...(values.deadline ? { deadline: values.deadline } : {}),
    workStart: values.workStart,
    workEnd: values.workEnd,
    ...(values.firstDayStart ? { firstDayStart: values.firstDayStart } : {}),
    sessionMinutes: values.sessionMinutes,
    shortBreakMinutes: values.shortBreakMinutes,
    longBreakMinutes: values.longBreakMinutes,
    estimateBuffer: values.estimateBuffer,
    allowSplitAcrossDays: values.allowSplitAcrossDays,
  });

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((current) => {
      const next = current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId];
      return next;
    });
  };

  const handlePreviewSubmit = handleSubmit(async (values) => {
    if (selectedTaskIds.length === 0) return;
    await onPreview(buildRequest({ ...values, taskIds: selectedTaskIds }));
  });

  const handleConfirm = async () => {
    if (!preview) return;
    const values = getValues();
    await onConfirm({
      ...buildRequest({ ...values, taskIds: selectedTaskIds }),
      previewToken: preview.previewToken,
    });
  };

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
        aria-labelledby="auto-schedule-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="auto-schedule-title" className={styles.title}>
          Auto-schedule {activity.title}
        </h2>
        <p className={styles.description}>
          {step === 'configure'
            ? 'Select tasks and work constraints, then preview the Pomodoro plan.'
            : 'Review the proposed timetable before confirming.'}
        </p>

        {step === 'configure' ? (
          <form onSubmit={handlePreviewSubmit} noValidate>
            <fieldset className={styles.taskFieldset} disabled={busy}>
              <legend className={styles.legend}>Tasks</legend>
              {activity.tasks.length === 0 ? (
                <p className={styles.emptyTasks}>No tasks to schedule.</p>
              ) : (
                <ul className={styles.taskList}>
                  {activity.tasks.map((task) => {
                    const checked = selectedTaskIds.includes(task.id);
                    const estimateLabel = task.timeEstimationSeconds
                      ? formatMinutes(Math.round(task.timeEstimationSeconds / 60))
                      : 'No estimate';
                    return (
                      <li key={task.id}>
                        <label className={styles.taskOption}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTask(task.id)}
                          />
                          <span className={styles.taskOptionTitle}>{task.title}</span>
                          <span className={styles.taskOptionMeta}>{task.status}</span>
                          <span className={styles.taskOptionMeta}>{estimateLabel}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              {selectedTaskIds.length === 0 ? (
                <p className={styles.error} role="alert">
                  Select at least one task.
                </p>
              ) : null}
            </fieldset>

            <div className={styles.fields}>
              <div className={styles.field}>
                <label htmlFor="auto-earliest-date">Earliest date</label>
                <Input
                  id="auto-earliest-date"
                  type="date"
                  {...register('earliestDate')}
                />
                {errors.earliestDate ? (
                  <span className={styles.error}>{errors.earliestDate.message}</span>
                ) : null}
              </div>
              <div className={styles.field}>
                <label htmlFor="auto-deadline">Deadline (optional)</label>
                <Input id="auto-deadline" type="date" {...register('deadline')} />
                {errors.deadline ? (
                  <span className={styles.error}>{errors.deadline.message}</span>
                ) : null}
              </div>
              <div className={styles.field}>
                <label htmlFor="auto-work-start">Work start</label>
                <Input
                  id="auto-work-start"
                  type="time"
                  {...register('workStart')}
                />
                {errors.workStart ? (
                  <span className={styles.error}>{errors.workStart.message}</span>
                ) : null}
              </div>
              <div className={styles.field}>
                <label htmlFor="auto-work-end">Work end</label>
                <Input id="auto-work-end" type="time" {...register('workEnd')} />
                {errors.workEnd ? (
                  <span className={styles.error}>{errors.workEnd.message}</span>
                ) : null}
              </div>
              {showFirstDayStart ? (
                <div className={styles.field}>
                  <label htmlFor="auto-first-day-start">Start time today</label>
                  <Input
                    id="auto-first-day-start"
                    type="time"
                    {...register('firstDayStart')}
                  />
                  {errors.firstDayStart ? (
                    <span className={styles.error}>
                      {errors.firstDayStart.message}
                    </span>
                  ) : (
                    <span className={styles.hint}>
                      Work start is already past; later days still use work start.
                    </span>
                  )}
                </div>
              ) : null}
              <div className={styles.field}>
                <label htmlFor="auto-session">Session (min)</label>
                <Input
                  id="auto-session"
                  type="number"
                  min={5}
                  max={120}
                  {...register('sessionMinutes', { valueAsNumber: true })}
                />
                {errors.sessionMinutes ? (
                  <span className={styles.error}>
                    {errors.sessionMinutes.message}
                  </span>
                ) : null}
              </div>
              <div className={styles.field}>
                <label htmlFor="auto-short-break">Short break (min)</label>
                <Input
                  id="auto-short-break"
                  type="number"
                  min={1}
                  max={60}
                  {...register('shortBreakMinutes', { valueAsNumber: true })}
                />
                {errors.shortBreakMinutes ? (
                  <span className={styles.error}>
                    {errors.shortBreakMinutes.message}
                  </span>
                ) : null}
              </div>
              <div className={styles.field}>
                <label htmlFor="auto-long-break">Long break (min)</label>
                <Input
                  id="auto-long-break"
                  type="number"
                  min={1}
                  max={60}
                  {...register('longBreakMinutes', { valueAsNumber: true })}
                />
                {errors.longBreakMinutes ? (
                  <span className={styles.error}>
                    {errors.longBreakMinutes.message}
                  </span>
                ) : null}
              </div>
              <div className={styles.field}>
                <label htmlFor="auto-estimate-buffer">Estimate buffer</label>
                <Input
                  id="auto-estimate-buffer"
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  {...register('estimateBuffer', { valueAsNumber: true })}
                />
                {errors.estimateBuffer ? (
                  <span className={styles.error}>
                    {errors.estimateBuffer.message}
                  </span>
                ) : (
                  <span className={styles.hint}>
                    Multiplier on each task&apos;s time estimate (e.g. 1.5 =
                    50% extra).
                  </span>
                )}
              </div>
              <div className={`${styles.field} ${styles.checkboxField}`}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" {...register('allowSplitAcrossDays')} />
                  Allow tasks to span multiple days
                </label>
              </div>
            </div>

            {error ? (
              <p className={styles.submitError} role="alert">
                {error}
              </p>
            ) : null}

            <div className={styles.actions}>
              <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy || activity.tasks.length === 0 || selectedTaskIds.length === 0}
              >
                {busy ? 'Generating…' : 'Preview schedule'}
              </Button>
            </div>
          </form>
        ) : preview ? (
          <>
            {preview.replacedBlockIds.length > 0 ? (
              <p className={styles.notice}>
                Replaces {preview.replacedBlockIds.length} existing future block
                {preview.replacedBlockIds.length === 1 ? '' : 's'} for selected tasks.
              </p>
            ) : null}

            {preview.warnings.length > 0 ? (
              <ul className={styles.warnings} role="alert">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}

            <div className={styles.previewDays}>
              {preview.days.map((day) => (
                <section key={day.date} className={styles.previewDay}>
                  <h3 className={styles.previewDayTitle}>{day.date}</h3>
                  <ul className={styles.previewBlocks}>
                    {day.blocks.map((block) => {
                      const start = utcToZonedParts(block.plannedStart, timeZone);
                      const end = utcToZonedParts(block.plannedEnd, timeZone);
                      const title =
                        block.taskId && taskTitleById.get(block.taskId)
                          ? taskTitleById.get(block.taskId)
                          : blockLabel(block.blockType);
                      return (
                        <li key={block.id} className={styles.previewBlock}>
                          <span className={styles.previewBlockLabel}>{title}</span>
                          <span className={styles.previewBlockMeta}>
                            {blockLabel(block.blockType)} · {start.time}–{end.time}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
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
                onClick={() => {
                  onBack();
                }}
              >
                Back
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy || !preview.canConfirm}
                onClick={() => void handleConfirm()}
              >
                {busy ? 'Confirming…' : 'Confirm schedule'}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
