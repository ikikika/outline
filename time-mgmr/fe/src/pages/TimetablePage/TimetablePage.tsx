import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/layouts';
import {
  formatDisplayDate,
  todayKey,
  useTimetableBlocksByRange,
  useActivityMutations,
  useActivityById,
  useRunningTimer,
  useResolvedTimeZone,
  useTimetableBlocksForCatalog,
  useTaskById,
  useTimetableBlocksByTask,
  useTimeEntriesByTask,
  useTimeEntryMutations,
  weekDateKeys,
  type ActivityFormValues,
  type ITimetableBlock,
} from '@/features/activities';
import { useDayReport } from '@/features/reports';
import { ActivityForm } from './components/ActivityForm/ActivityForm';
import { DayTimetable } from './components/DayTimetable/DayTimetable';
import { PomodoroBreakPrompt } from './components/PomodoroBreakPrompt/PomodoroBreakPrompt';
import { TaskDetailModal } from './components/TaskDetailModal/TaskDetailModal';
import { TimetableHeader, type TimetableView } from './components/TimetableHeader/TimetableHeader';
import { WeekTimetable } from './components/WeekTimetable/WeekTimetable';
import { usePomodoroReminder } from './hooks/usePomodoroReminder/usePomodoroReminder';
import styles from './TimetablePage.module.scss';

export const TimetablePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [timetableView, setTimetableView] = useState<TimetableView>('day');
  const [detailBlock, setDetailBlock] = useState<ITimetableBlock | null>(null);
  const [editing, setEditing] = useState<ITimetableBlock | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const week = weekDateKeys(selectedDate);
  const { activities: dayBlocks, isLoading: dayLoading, error: dayError } =
    useDayReport(selectedDate);
  const weekBlocksQuery = useTimetableBlocksByRange(week[0], week[week.length - 1]);
  const weekBlocks = weekBlocksQuery.data ?? [];
  const { data: runningEntry = null } = useRunningTimer();
  const runningTaskQuery = useTaskById(runningEntry?.taskId ?? null);
  const runningTask = runningTaskQuery.data ?? null;
  const runningBlocksQuery = useTimetableBlocksByTask(runningEntry?.taskId ?? null);
  const runningBlock = runningBlocksQuery.data?.[0] ?? null;
  const timeZone = useResolvedTimeZone();
  const blockCatalogQuery = useTimetableBlocksForCatalog(Boolean(runningEntry));
  const pomodoroReminder = usePomodoroReminder({
    runningBlock,
    runningEntry,
    blocks: blockCatalogQuery.data ?? [],
    timeZone,
  });
  const { data: detailActivity = null } = useActivityById(
    detailBlock?.activityId ?? null
  );
  const { data: detailEntries = [] } = useTimeEntriesByTask(
    detailBlock?.taskId ?? null
  );
  const { update, updateBlock, remove, setStatus, complete } =
    useActivityMutations(selectedDate);
  const { startTimer, stopTimer, addManual } = useTimeEntryMutations(selectedDate);

  const isLoading =
    dayLoading || (timetableView === 'week' && weekBlocksQuery.isLoading);
  const loadError =
    dayError ?? (timetableView === 'week' ? weekBlocksQuery.error : null);

  const busy =
    update.isPending ||
    updateBlock.isPending ||
    remove.isPending ||
    setStatus.isPending ||
    complete.isPending ||
    startTimer.isPending ||
    stopTimer.isPending ||
    addManual.isPending;

  useEffect(() => {
    if (!detailBlock) return;
    const next =
      dayBlocks.find((block) => block.id === detailBlock.id) ??
      weekBlocks.find((block) => block.id === detailBlock.id) ??
      (runningBlock?.id === detailBlock.id ? runningBlock : undefined);
    if (!next) {
      if (dayLoading) return;
      setDetailBlock(null);
      return;
    }
    if (
      next.status !== detailBlock.status ||
      next.title !== detailBlock.title ||
      next.notes !== detailBlock.notes ||
      next.plannedStart !== detailBlock.plannedStart ||
      next.plannedEnd !== detailBlock.plannedEnd ||
      next.updatedAt !== detailBlock.updatedAt
    ) {
      setDetailBlock(next);
    }
  }, [dayBlocks, weekBlocks, runningBlock, detailBlock, dayLoading]);

  const openDetails = (item: ITimetableBlock) => {
    setSelectedDate(item.date);
    setDetailBlock(item);
    setEditing(null);
  };

  const handleSubmit = async (values: ActivityFormValues) => {
    if (!editing) return;
    setActionError(null);
    try {
      await update.mutateAsync({
        blockId: editing.id,
        taskId: editing.taskId,
        patch: values,
      });
      setEditing(null);
      setDetailBlock(null);
      if (values.date !== selectedDate) {
        setSelectedDate(values.date);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save activity.');
    }
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setActionError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const dateLabel =
    timetableView === 'week'
      ? `${formatDisplayDate(week[0])} – ${formatDisplayDate(week[week.length - 1])}`
      : formatDisplayDate(selectedDate);

  const toolbar = (
    <TimetableHeader
      view={timetableView}
      onViewChange={setTimetableView}
      selectedDate={selectedDate}
      onSelectedDateChange={setSelectedDate}
      dateLabel={dateLabel}
    />
  );

  return (
    <MainLayout>
      <div className={styles.timetable}>
        {runningEntry && detailBlock?.taskId !== runningEntry.taskId ? (
          <aside className={styles.runningNotice} aria-live="polite">
            <div className={styles.runningNoticeText}>
              <strong>Timer still running</strong>
              <span>
                {runningTask
                  ? `${runningTask.title} started at ${new Date(
                      runningEntry.startAt
                    ).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}.`
                  : 'Loading the active task…'}
              </span>
            </div>
            <button
              type="button"
              className={styles.runningNoticeAction}
              disabled={!runningBlock || runningBlocksQuery.isPending}
              onClick={() => {
                if (runningBlock) openDetails(runningBlock);
              }}
            >
              Open task
            </button>
          </aside>
        ) : null}
        {pomodoroReminder.shouldPrompt &&
        runningTask &&
        runningEntry &&
        pomodoroReminder.breakBlock ? (
          <PomodoroBreakPrompt
            focusTitle={runningTask.title}
            breakTitle={pomodoroReminder.breakBlock.title}
            isOpening={stopTimer.isPending}
            onContinueWorking={pomodoroReminder.dismiss}
            onOpenBreak={() =>
              runAction(async () => {
                await stopTimer.mutateAsync(runningEntry.id);
                pomodoroReminder.dismiss();
                openDetails(pomodoroReminder.breakBlock!);
              })
            }
          />
        ) : null}
        {actionError && <div className={styles.error}>{actionError}</div>}
        {loadError && (
          <div className={styles.error}>
            {loadError instanceof Error
              ? loadError.message
              : 'Failed to load schedule blocks from API.'}
          </div>
        )}
        {isLoading && !loadError ? <div className={styles.loading}>Loading timetable…</div> : null}

        {timetableView === 'week' ? (
          <WeekTimetable
            days={week}
            blocks={weekBlocks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            disabled={busy}
            toolbar={toolbar}
            onSelect={openDetails}
            onReschedule={(id, plannedStart, plannedEnd, date) =>
              runAction(() =>
                updateBlock.mutateAsync({
                  id,
                  patch: { plannedStart, plannedEnd, ...(date ? { date } : {}) },
                })
              )
            }
          />
        ) : (
          <DayTimetable
            date={selectedDate}
            blocks={dayBlocks}
            disabled={busy}
            toolbar={toolbar}
            onSelect={openDetails}
            onReschedule={(id, plannedStart, plannedEnd) =>
              runAction(() =>
                updateBlock.mutateAsync({ id, patch: { plannedStart, plannedEnd } })
              )
            }
          />
        )}

        {detailBlock && !editing ? (
          <TaskDetailModal
            block={detailBlock}
            activityTitle={detailActivity?.title}
            entries={detailEntries}
            runningEntry={runningEntry}
            busy={busy}
            onClose={() => setDetailBlock(null)}
            onEdit={(block) => setEditing(block)}
            onDelete={(block) =>
              runAction(async () => {
                await remove.mutateAsync({
                  blockId: block.id,
                  taskId: block.taskId,
                });
                setDetailBlock(null);
              })
            }
            onStatus={(taskId, status) =>
              runAction(async () => {
                if (status === 'done') {
                  if (runningEntry?.taskId === taskId) {
                    await stopTimer.mutateAsync(runningEntry.id);
                  }
                  await complete.mutateAsync({ taskId });
                  setDetailBlock(null);
                  return;
                }

                await setStatus.mutateAsync({ taskId, status });
              })
            }
            onStart={(taskId) => runAction(() => startTimer.mutateAsync(taskId))}
            onStop={(entryId) => runAction(() => stopTimer.mutateAsync(entryId))}
            onLogManual={(taskId, minutes) =>
              runAction(() =>
                addManual.mutateAsync({ activityId: taskId, durationMinutes: minutes })
              )
            }
          />
        ) : null}

        {editing ? (
          <div className={styles.formBackdrop} role="presentation" onClick={() => setEditing(null)}>
            <div
              className={styles.formModal}
              role="dialog"
              aria-modal="true"
              aria-label="Edit activity"
              onClick={(e) => e.stopPropagation()}
            >
              <ActivityForm
                date={selectedDate}
                initial={editing}
                isSubmitting={update.isPending}
                onCancel={() => {
                  setEditing(null);
                  setDetailBlock(null);
                }}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
};

export default TimetablePage;
