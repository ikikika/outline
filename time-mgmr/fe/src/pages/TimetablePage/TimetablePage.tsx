import React, { useEffect, useMemo, useState } from 'react';
import { useAuthContext } from '@/app/providers/auth';
import {
  formatDisplayDate,
  todayKey,
  useTimetableBlocksByDate,
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
  workSessionBounds,
  type ActivityFormValues,
  type ITimetableBlock,
} from '@/features/activities';
import {
  resolveTimetableDayBounds,
  resolveTimetableVisibleRange,
} from '@/features/auth';
import { ActivityForm } from './components/ActivityForm/ActivityForm';
import { DayTimetable } from './components/DayTimetable/DayTimetable';
import { PomodoroBreakPrompt } from './components/PomodoroBreakPrompt/PomodoroBreakPrompt';
import { TaskDetailModal } from './components/TaskDetailModal/TaskDetailModal';
import { TimetableHeader, type TimetableView } from './components/TimetableHeader/TimetableHeader';
import { WeekTimetable } from './components/WeekTimetable/WeekTimetable';
import { usePomodoroReminder } from './hooks/usePomodoroReminder/usePomodoroReminder';
import { blockDisplayWindow } from './utils/blockDisplayWindow/blockDisplayWindow';
import {
  ensureBreakTaskForBlock,
  scheduledFocusSeconds,
} from './utils/ensureBreakTask/ensureBreakTask';
import styles from './TimetablePage.module.scss';

export const TimetablePage: React.FC = () => {
  const { user } = useAuthContext();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [timetableView, setTimetableView] = useState<TimetableView>('day');
  const [showAllHours, setShowAllHours] = useState(false);
  const [detailBlockId, setDetailBlockId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ITimetableBlock | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const week = useMemo(() => weekDateKeys(selectedDate), [selectedDate]);
  const detailOpen = detailBlockId != null;

  const dayBlocksQuery = useTimetableBlocksByDate(selectedDate, {
    enabled: timetableView === 'day' || detailOpen,
  });
  const weekBlocksQuery = useTimetableBlocksByRange(week[0], week[week.length - 1], {
    enabled: timetableView === 'week' || detailOpen,
  });
  const dayBlocks = dayBlocksQuery.data ?? [];
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

  const detailBlock = useMemo(() => {
    if (!detailBlockId) return null;
    return (
      dayBlocks.find((block) => block.id === detailBlockId) ??
      weekBlocks.find((block) => block.id === detailBlockId) ??
      (runningBlock?.id === detailBlockId ? runningBlock : null)
    );
  }, [detailBlockId, dayBlocks, weekBlocks, runningBlock]);

  const { data: detailActivity = null } = useActivityById(
    detailBlock?.activityId ?? null
  );
  const { data: detailEntries = [] } = useTimeEntriesByTask(
    detailBlock?.taskId ?? null
  );
  const detailTaskBlocksQuery = useTimetableBlocksByTask(
    detailBlock?.taskId ?? null
  );
  const detailPlannedFocusSeconds = useMemo(() => {
    const blocks = detailTaskBlocksQuery.data;
    if (!blocks || blocks.length === 0) return undefined;
    const total = scheduledFocusSeconds(blocks);
    return total > 0 ? total : undefined;
  }, [detailTaskBlocksQuery.data]);
  const { update, updateBlock, remove, setStatus, complete } =
    useActivityMutations(selectedDate);
  const { startTimer, stopTimer, addManual } = useTimeEntryMutations(selectedDate);

  const visibleRange = useMemo(
    () => resolveTimetableVisibleRange(user),
    [user?.timetableVisibleStart, user?.timetableVisibleEnd]
  );

  const rangeBlocks = timetableView === 'week' ? weekBlocks : dayBlocks;

  const { dayStartMinutes, dayEndMinutes } = useMemo(() => {
    const blockWindows = rangeBlocks.map((block) => {
      const window = blockDisplayWindow(block);
      return { start: window.start, end: window.end };
    });
    return resolveTimetableDayBounds({
      showAllHours,
      visibleStart: visibleRange.start,
      visibleEnd: visibleRange.end,
      blockWindows,
    });
  }, [showAllHours, visibleRange.start, visibleRange.end, rangeBlocks]);

  const isLoading =
    timetableView === 'week'
      ? weekBlocksQuery.isLoading
      : dayBlocksQuery.isLoading;
  const loadError =
    timetableView === 'week' ? weekBlocksQuery.error : dayBlocksQuery.error;

  const busy =
    update.isPending ||
    updateBlock.isPending ||
    remove.isPending ||
    setStatus.isPending ||
    complete.isPending ||
    startTimer.isPending ||
    stopTimer.isPending ||
    addManual.isPending;

  // Close the modal once caches have settled and the block is gone.
  useEffect(() => {
    if (!detailBlockId || detailBlock) return;
    if (isLoading || runningBlocksQuery.isPending) return;
    setDetailBlockId(null);
  }, [detailBlockId, detailBlock, isLoading, runningBlocksQuery.isPending]);

  const openDetails = (item: ITimetableBlock) => {
    setSelectedDate(item.date);
    setDetailBlockId(item.id);
    setEditing(null);
  };

  const closeDetails = () => setDetailBlockId(null);

  const resolveTrackableTaskId = async (block: ITimetableBlock): Promise<string> =>
    ensureBreakTaskForBlock(block);

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
      closeDetails();
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
      showAllHours={showAllHours}
      onShowAllHoursChange={setShowAllHours}
    />
  );

  return (
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
          dayStartMinutes={dayStartMinutes}
          dayEndMinutes={dayEndMinutes}
          fitToWindow={!showAllHours}
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
          dayStartMinutes={dayStartMinutes}
          dayEndMinutes={dayEndMinutes}
          fitToWindow={!showAllHours}
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
          plannedFocusSeconds={detailPlannedFocusSeconds}
          busy={busy}
          onClose={closeDetails}
          onEdit={(block) => setEditing(block)}
          onDelete={(block) =>
            runAction(async () => {
              await remove.mutateAsync({
                blockId: block.id,
                taskId: block.taskId,
              });
              closeDetails();
            })
          }
          onStatus={(taskId, status) =>
            runAction(async () => {
              if (status === 'done') {
                let sessions = detailEntries;
                if (runningEntry?.taskId === taskId) {
                  const stopped = await stopTimer.mutateAsync(runningEntry.id);
                  const endAt = stopped?.endAt ?? new Date().toISOString();
                  sessions = detailEntries.some((e) => e.id === runningEntry.id)
                    ? detailEntries.map((e) =>
                        e.id === runningEntry.id ? { ...e, endAt } : e
                      )
                    : [...detailEntries, { ...runningEntry, endAt }];
                }
                const bounds = workSessionBounds(sessions);
                await complete.mutateAsync({
                  taskId,
                  blockId: detailBlock.id,
                  sessionStartAt: bounds?.startAt,
                  sessionEndAt: bounds?.endAt,
                });
                closeDetails();
                return;
              }

              await setStatus.mutateAsync({ taskId, status });
            })
          }
          onStart={(block) =>
            runAction(async () => {
              const taskId = await resolveTrackableTaskId(block);
              await startTimer.mutateAsync(taskId);
            })
          }
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
                closeDetails();
              }}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TimetablePage;
