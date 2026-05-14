import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/layouts';
import {
  formatDisplayDate,
  todayKey,
  useActivitiesByRange,
  useActivityMutations,
  useRunningTimer,
  useTimeEntryMutations,
  weekDateKeys,
  type ActivityFormValues,
  type ITask,
} from '@/features/activities';
import { useDayReport } from '@/features/reports';
import { ActivityForm } from './components/ActivityForm/ActivityForm';
import { DayTimetable } from './components/DayTimetable/DayTimetable';
import { TaskDetailModal } from './components/TaskDetailModal/TaskDetailModal';
import { TimetableHeader, type TimetableView } from './components/TimetableHeader/TimetableHeader';
import { WeekTimetable } from './components/WeekTimetable/WeekTimetable';
import styles from './TodayPage.module.scss';

export const TodayPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [timetableView, setTimetableView] = useState<TimetableView>('day');
  const [detailTask, setDetailTask] = useState<ITask | null>(null);
  const [editing, setEditing] = useState<ITask | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const week = weekDateKeys(selectedDate);
  const { activities, entries, isLoading: dayLoading, error: dayError } = useDayReport(selectedDate);
  const weekActivitiesQuery = useActivitiesByRange(week[0], week[week.length - 1]);
  const weekActivities = weekActivitiesQuery.data ?? [];
  const { data: runningEntry = null } = useRunningTimer();
  const { update, remove, setStatus } = useActivityMutations(selectedDate);
  const { startTimer, stopTimer, addManual } = useTimeEntryMutations(selectedDate);

  const isLoading =
    dayLoading || (timetableView === 'week' && weekActivitiesQuery.isLoading);
  const loadError =
    dayError ?? (timetableView === 'week' ? weekActivitiesQuery.error : null);

  const busy =
    update.isPending ||
    remove.isPending ||
    setStatus.isPending ||
    startTimer.isPending ||
    stopTimer.isPending ||
    addManual.isPending;

  const detailEntries = useMemo(() => {
    if (!detailTask) return [];
    return entries.filter((entry) => entry.taskId === detailTask.id);
  }, [detailTask, entries]);

  useEffect(() => {
    if (!detailTask) return;
    const next =
      activities.find((task) => task.id === detailTask.id) ??
      weekActivities.find((task) => task.id === detailTask.id);
    if (!next) {
      setDetailTask(null);
      return;
    }
    if (
      next.status !== detailTask.status ||
      next.title !== detailTask.title ||
      next.notes !== detailTask.notes ||
      next.plannedStart !== detailTask.plannedStart ||
      next.plannedEnd !== detailTask.plannedEnd ||
      next.updatedAt !== detailTask.updatedAt
    ) {
      setDetailTask(next);
    }
  }, [activities, weekActivities, detailTask]);

  const openDetails = (item: ITask) => {
    setSelectedDate(item.date);
    setDetailTask(item);
    setEditing(null);
  };

  const handleSubmit = async (values: ActivityFormValues) => {
    if (!editing) return;
    setActionError(null);
    try {
      await update.mutateAsync({ id: editing.id, patch: values });
      setEditing(null);
      setDetailTask(null);
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
      <div className={styles.today}>
        {actionError && <div className={styles.error}>{actionError}</div>}
        {loadError && (
          <div className={styles.error}>
            {loadError instanceof Error ? loadError.message : 'Failed to load tasks from API.'}
          </div>
        )}
        {isLoading && !loadError ? <div className={styles.loading}>Loading timetable…</div> : null}

        {timetableView === 'week' ? (
          <WeekTimetable
            days={week}
            activities={weekActivities}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            disabled={busy}
            toolbar={toolbar}
            onSelect={openDetails}
            onReschedule={(id, plannedStart, plannedEnd) =>
              runAction(() => update.mutateAsync({ id, patch: { plannedStart, plannedEnd } }))
            }
          />
        ) : (
          <DayTimetable
            date={selectedDate}
            activities={activities}
            disabled={busy}
            toolbar={toolbar}
            onSelect={openDetails}
            onReschedule={(id, plannedStart, plannedEnd) =>
              runAction(() => update.mutateAsync({ id, patch: { plannedStart, plannedEnd } }))
            }
          />
        )}

        {detailTask && !editing ? (
          <TaskDetailModal
            task={detailTask}
            entries={detailEntries}
            runningEntry={runningEntry}
            busy={busy}
            onClose={() => setDetailTask(null)}
            onEdit={(task) => setEditing(task)}
            onDelete={(id) =>
              runAction(async () => {
                await remove.mutateAsync(id);
                setDetailTask(null);
              })
            }
            onStatus={(id, status) => runAction(() => setStatus.mutateAsync({ id, status }))}
            onStart={(id) => runAction(() => startTimer.mutateAsync(id))}
            onStop={(id) => runAction(() => stopTimer.mutateAsync(id))}
            onLogManual={(id, minutes) =>
              runAction(() => addManual.mutateAsync({ activityId: id, durationMinutes: minutes }))
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
                  setDetailTask(null);
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

export default TodayPage;
