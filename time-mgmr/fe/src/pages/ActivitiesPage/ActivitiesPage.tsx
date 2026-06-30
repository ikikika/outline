import React, { useMemo, useState } from 'react';
import {
  useActivityCatalog,
  useActivityMutations,
  useArchiveActivity,
  useConfirmAutoSchedule,
  useCreateActivity,
  useCreateCatalogTask,
  useDeleteActivity,
  useDeleteCatalogTask,
  useImportActivityCatalog,
  usePreviewAutoSchedule,
  useReorderActivities,
  useReorderTasks,
  useRestoreActivity,
  useRunningTimer,
  useScheduleCatalogTask,
  useTimeEntriesByTask,
  useTimeEntryMutations,
  useTimetableBlocksByTask,
  isActivityArchived,
  todayKey,
  workSessionBounds,
  type ActivityFormValues,
  type IActivityWithTasks,
  type IApiTask,
  type IAutoSchedulePreviewResponse,
  type IAutoScheduleRequest,
  type ITimetableBlock,
} from '@/features/activities';
import { TaskDetailModal } from '@/pages/TimetablePage/components/TaskDetailModal/TaskDetailModal';
import { ActivityForm } from '@/pages/TimetablePage/components/ActivityForm/ActivityForm';
import { scheduledFocusSeconds } from '@/pages/TimetablePage/utils/ensureBreakTask/ensureBreakTask';
import { AddActivityForm } from './components/AddActivityForm/AddActivityForm';
import { ActivityPriorityList } from './components/ActivityPriorityList/ActivityPriorityList';
import { AutoScheduleModal } from './components/AutoScheduleModal/AutoScheduleModal';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { ImportActivityForm } from './components/ImportActivityForm/ImportActivityForm';
import { ManualScheduleModal } from './components/ManualScheduleModal/ManualScheduleModal';
import {
  isUnscheduledDetailBlock,
  pickDetailBlockForTask,
} from './utils/detailBlockForCatalogTask/detailBlockForCatalogTask';
import styles from './ActivitiesPage.module.scss';

type ListView = 'active' | 'archived';

type ConfirmTarget =
  | { kind: 'activity'; id: string; title: string; taskCount: number }
  | { kind: 'task'; id: string; title: string }
  | { kind: 'archive'; id: string; title: string; taskCount: number }
  | { kind: 'restore'; id: string; title: string }
  | null;

export const ActivitiesPage: React.FC = () => {
  const [listView, setListView] = useState<ListView>('active');
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [scheduleTarget, setScheduleTarget] = useState<IApiTask | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<ITimetableBlock | null>(null);
  const [detailActionError, setDetailActionError] = useState<string | null>(null);
  const [autoScheduleTarget, setAutoScheduleTarget] =
    useState<IActivityWithTasks | null>(null);
  const [autoSchedulePreview, setAutoSchedulePreview] =
    useState<IAutoSchedulePreviewResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const selectedDate = todayKey();
  const { data: activities, isLoading, error } = useActivityCatalog();
  const createActivity = useCreateActivity();
  const importActivityCatalog = useImportActivityCatalog();
  const createTask = useCreateCatalogTask();
  const deleteActivity = useDeleteActivity();
  const archiveActivity = useArchiveActivity();
  const restoreActivity = useRestoreActivity();
  const deleteTask = useDeleteCatalogTask();
  const scheduleTask = useScheduleCatalogTask();
  const previewAutoSchedule = usePreviewAutoSchedule();
  const confirmAutoSchedule = useConfirmAutoSchedule();
  const reorderActivities = useReorderActivities();
  const reorderTasks = useReorderTasks();
  const { data: runningEntry = null } = useRunningTimer();
  const { data: detailEntries = [] } = useTimeEntriesByTask(detailTaskId);
  const detailBlocksQuery = useTimetableBlocksByTask(detailTaskId);
  const { update, updateTask, remove, setStatus, complete } = useActivityMutations(selectedDate);
  const { startTimer, stopTimer, addManual } = useTimeEntryMutations(selectedDate);

  const visibleActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter((activity) => {
      const archived = isActivityArchived(activity.archivedAt);
      return listView === 'archived' ? archived : !archived;
    });
  }, [activities, listView]);

  const detailContext = useMemo(() => {
    if (!detailTaskId || !activities) return null;
    for (const activity of activities) {
      const task = activity.tasks.find((item) => item.id === detailTaskId);
      if (task) return { activity, task };
    }
    return null;
  }, [activities, detailTaskId]);

  const detailBlock = useMemo(() => {
    if (!detailContext) return null;
    // Wait for the first schedule-block fetch so we don't flash a stand-in.
    if (detailBlocksQuery.isLoading && detailBlocksQuery.data === undefined) {
      return null;
    }
    return pickDetailBlockForTask(
      detailContext.task,
      detailBlocksQuery.data,
      selectedDate
    );
  }, [detailContext, detailBlocksQuery.data, detailBlocksQuery.isLoading, selectedDate]);

  const detailPlannedFocusSeconds = useMemo(() => {
    const blocks = detailBlocksQuery.data;
    if (!blocks || blocks.length === 0) return undefined;
    const total = scheduledFocusSeconds(blocks);
    return total > 0 ? total : undefined;
  }, [detailBlocksQuery.data]);

  const catalogBusy =
    createActivity.isPending ||
    importActivityCatalog.isPending ||
    createTask.isPending ||
    deleteActivity.isPending ||
    archiveActivity.isPending ||
    restoreActivity.isPending ||
    deleteTask.isPending ||
    scheduleTask.isPending ||
    previewAutoSchedule.isPending ||
    confirmAutoSchedule.isPending ||
    reorderActivities.isPending ||
    reorderTasks.isPending;

  const detailBusy =
    update.isPending ||
    updateTask.isPending ||
    remove.isPending ||
    setStatus.isPending ||
    complete.isPending ||
    startTimer.isPending ||
    stopTimer.isPending ||
    addManual.isPending;

  const busy = catalogBusy || detailBusy;
  const mutationError =
    importError ??
    detailActionError ??
    (importActivityCatalog.error instanceof Error
      ? importActivityCatalog.error.message
      : null) ??
    createActivity.error ??
    createTask.error ??
    deleteActivity.error ??
    archiveActivity.error ??
    restoreActivity.error ??
    deleteTask.error ??
    scheduleTask.error ??
    previewAutoSchedule.error ??
    confirmAutoSchedule.error ??
    reorderActivities.error ??
    reorderTasks.error;

  const closeDetails = () => {
    setDetailTaskId(null);
    setEditingBlock(null);
    setDetailActionError(null);
  };

  const runDetailAction = async (fn: () => Promise<unknown>) => {
    setDetailActionError(null);
    try {
      await fn();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setDetailActionError(
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    }
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.kind === 'activity') {
        await deleteActivity.mutateAsync(confirmTarget.id);
      } else if (confirmTarget.kind === 'task') {
        await deleteTask.mutateAsync(confirmTarget.id);
        if (detailTaskId === confirmTarget.id) closeDetails();
      } else if (confirmTarget.kind === 'archive') {
        await archiveActivity.mutateAsync(confirmTarget.id);
      } else {
        await restoreActivity.mutateAsync(confirmTarget.id);
      }
      setConfirmTarget(null);
    } catch {
      // Mutation errors are presented above the list.
    }
  };

  const closeAutoScheduleModal = () => {
    previewAutoSchedule.reset();
    confirmAutoSchedule.reset();
    setAutoSchedulePreview(null);
    setAutoScheduleTarget(null);
  };

  const handleAutoSchedulePreview = async (request: IAutoScheduleRequest) => {
    previewAutoSchedule.reset();
    confirmAutoSchedule.reset();
    const preview = await previewAutoSchedule.mutateAsync(request);
    setAutoSchedulePreview(preview);
  };

  const handleAutoScheduleConfirm = async (
    request: IAutoScheduleRequest & { previewToken: string }
  ) => {
    await confirmAutoSchedule.mutateAsync(request);
    closeAutoScheduleModal();
  };

  const handleEditSubmit = async (values: ActivityFormValues) => {
    if (!editingBlock?.taskId) return;
    setDetailActionError(null);
    try {
      if (isUnscheduledDetailBlock(editingBlock)) {
        await updateTask.mutateAsync({
          id: editingBlock.taskId,
          patch: {
            title: values.title,
            categoryId: values.categoryId,
            notes: values.notes,
          },
        });
      } else {
        await update.mutateAsync({
          blockId: editingBlock.id,
          taskId: editingBlock.taskId,
          patch: values,
        });
      }
      setEditingBlock(null);
      closeDetails();
    } catch (err) {
      setDetailActionError(
        err instanceof Error ? err.message : 'Failed to save task.'
      );
    }
  };

  const autoScheduleError =
    previewAutoSchedule.error instanceof Error
      ? previewAutoSchedule.error.message
      : confirmAutoSchedule.error instanceof Error
        ? confirmAutoSchedule.error.message
        : previewAutoSchedule.error || confirmAutoSchedule.error
          ? 'Failed to auto-schedule activity.'
          : null;

  const confirmCopy = (() => {
    if (!confirmTarget) return null;
    if (confirmTarget.kind === 'activity') {
      return {
        title: 'Delete activity?',
        message: `Delete “${confirmTarget.title}” and its ${confirmTarget.taskCount} ${
          confirmTarget.taskCount === 1 ? 'task' : 'tasks'
        }? This cannot be undone.`,
        confirmLabel: 'Delete activity',
        busyLabel: 'Deleting…',
        confirmVariant: 'danger' as const,
      };
    }
    if (confirmTarget.kind === 'task') {
      return {
        title: 'Delete task?',
        message: `Delete “${confirmTarget.title}”? This cannot be undone.`,
        confirmLabel: 'Delete task',
        busyLabel: 'Deleting…',
        confirmVariant: 'danger' as const,
      };
    }
    if (confirmTarget.kind === 'archive') {
      return {
        title: 'Archive activity?',
        message: `Archive “${confirmTarget.title}” and its ${confirmTarget.taskCount} completed ${
          confirmTarget.taskCount === 1 ? 'task' : 'tasks'
        }? You can restore it later. History and reports stay intact.`,
        confirmLabel: 'Archive activity',
        busyLabel: 'Archiving…',
        confirmVariant: 'primary' as const,
      };
    }
    return {
      title: 'Restore activity?',
      message: `Restore “${confirmTarget.title}” to your active list?`,
      confirmLabel: 'Restore activity',
      busyLabel: 'Restoring…',
      confirmVariant: 'primary' as const,
    };
  })();

  return (
    <>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Activities</h1>
            <p className={styles.subtitle}>
              {listView === 'active'
                ? 'Drag to set priority. Expand to reorder tasks within an activity.'
                : 'Review completed work. Restore an activity to edit or schedule again.'}
            </p>
          </div>
          <div className={styles.viewToggle} role="group" aria-label="Activity list">
            <button
              type="button"
              className={listView === 'active' ? styles.viewToggleActive : undefined}
              aria-pressed={listView === 'active'}
              onClick={() => setListView('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={listView === 'archived' ? styles.viewToggleActive : undefined}
              aria-pressed={listView === 'archived'}
              onClick={() => setListView('archived')}
            >
              Archived
            </button>
          </div>
        </header>

        {listView === 'active' ? (
          <>
            <AddActivityForm
              disabled={busy}
              onAdd={async (input) => {
                setImportError(null);
                await createActivity.mutateAsync(input);
              }}
            />

            <ImportActivityForm
              disabled={busy}
              onError={(message) => {
                importActivityCatalog.reset();
                setImportError(message);
              }}
              onImport={async (input) => {
                setImportError(null);
                importActivityCatalog.reset();
                await importActivityCatalog.mutateAsync(input);
              }}
            />
          </>
        ) : null}

        {mutationError ? (
          <div className={styles.error} role="alert">
            {typeof mutationError === 'string'
              ? mutationError
              : mutationError instanceof Error
                ? mutationError.message
                : 'Failed to save new order.'}
          </div>
        ) : null}

        {isLoading ? (
          <div className={styles.loading}>Loading activities…</div>
        ) : error ? (
          <div className={styles.error}>
            {error instanceof Error
              ? error.message
              : 'Failed to load activities.'}
          </div>
        ) : visibleActivities.length > 0 ? (
          <ActivityPriorityList
            activities={visibleActivities}
            archivedView={listView === 'archived'}
            disabled={busy}
            onReorderActivities={(ids) => reorderActivities.mutate(ids)}
            onReorderTasks={(activityId, taskIds) =>
              reorderTasks.mutate({ activityId, orderedTaskIds: taskIds })
            }
            onAddTask={async (activity, input) => {
              await createTask.mutateAsync({
                ...input,
                activityId: activity.id,
                categoryId: activity.categoryId,
              });
            }}
            onDeleteActivity={(activity) =>
              setConfirmTarget({
                kind: 'activity',
                id: activity.id,
                title: activity.title,
                taskCount: activity.tasks.length,
              })
            }
            onArchiveActivity={(activity) =>
              setConfirmTarget({
                kind: 'archive',
                id: activity.id,
                title: activity.title,
                taskCount: activity.tasks.length,
              })
            }
            onRestoreActivity={(activity) =>
              setConfirmTarget({
                kind: 'restore',
                id: activity.id,
                title: activity.title,
              })
            }
            onAutoScheduleActivity={(activity) => {
              previewAutoSchedule.reset();
              confirmAutoSchedule.reset();
              setAutoSchedulePreview(null);
              setAutoScheduleTarget(activity);
            }}
            onSelectTask={(task) => {
              setDetailActionError(null);
              setEditingBlock(null);
              setDetailTaskId(task.id);
            }}
            onScheduleTask={(task) => {
              scheduleTask.reset();
              setScheduleTarget(task);
            }}
            onDeleteTask={(task) =>
              setConfirmTarget({
                kind: 'task',
                id: task.id,
                title: task.title,
              })
            }
          />
        ) : (
          <p className={styles.empty}>
            {listView === 'archived'
              ? 'No archived activities yet. Archive an activity when all of its tasks are done.'
              : 'No activities found.'}
          </p>
        )}
      </div>
      {confirmTarget && confirmCopy ? (
        <ConfirmationModal
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.confirmLabel}
          busyLabel={confirmCopy.busyLabel}
          confirmVariant={confirmCopy.confirmVariant}
          busy={
            deleteActivity.isPending ||
            deleteTask.isPending ||
            archiveActivity.isPending ||
            restoreActivity.isPending
          }
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => void handleConfirm()}
        />
      ) : null}
      {scheduleTarget ? (
        <ManualScheduleModal
          task={scheduleTarget}
          defaultDate={selectedDate}
          busy={scheduleTask.isPending}
          error={
            scheduleTask.error instanceof Error
              ? scheduleTask.error.message
              : scheduleTask.error
                ? 'Failed to schedule task.'
                : null
          }
          onCancel={() => {
            scheduleTask.reset();
            setScheduleTarget(null);
          }}
          onSubmit={async (schedule) => {
            try {
              await scheduleTask.mutateAsync({
                id: scheduleTarget.id,
                schedule,
              });
              setScheduleTarget(null);
            } catch {
              // Mutation errors are presented above the list.
            }
          }}
        />
      ) : null}
      {autoScheduleTarget ? (
        <AutoScheduleModal
          activity={autoScheduleTarget}
          defaultDate={selectedDate}
          busy={previewAutoSchedule.isPending || confirmAutoSchedule.isPending}
          error={autoScheduleError}
          preview={autoSchedulePreview}
          onCancel={closeAutoScheduleModal}
          onBack={() => {
            previewAutoSchedule.reset();
            confirmAutoSchedule.reset();
            setAutoSchedulePreview(null);
          }}
          onPreview={handleAutoSchedulePreview}
          onConfirm={handleAutoScheduleConfirm}
        />
      ) : null}
      {detailBlock && detailContext && !editingBlock ? (
        <TaskDetailModal
          block={detailBlock}
          activityTitle={detailContext.activity.title}
          entries={detailEntries}
          runningEntry={runningEntry}
          plannedFocusSeconds={detailPlannedFocusSeconds}
          busy={detailBusy}
          onClose={closeDetails}
          onEdit={(block) => {
            setEditingBlock(block);
          }}
          onDelete={(block) => {
            if (!block.taskId) return;
            setConfirmTarget({
              kind: 'task',
              id: block.taskId,
              title: block.title,
            });
          }}
          onStatus={(taskId, status) =>
            runDetailAction(async () => {
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
                  blockId: isUnscheduledDetailBlock(detailBlock)
                    ? undefined
                    : detailBlock.id,
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
            runDetailAction(async () => {
              if (!block.taskId) return;
              await startTimer.mutateAsync(block.taskId);
            })
          }
          onStop={(entryId) => runDetailAction(() => stopTimer.mutateAsync(entryId))}
          onLogManual={(taskId, minutes) =>
            runDetailAction(() =>
              addManual.mutateAsync({ activityId: taskId, durationMinutes: minutes })
            )
          }
        />
      ) : null}
      {editingBlock ? (
        <div
          className={styles.formBackdrop}
          role="presentation"
          onClick={() => setEditingBlock(null)}
        >
          <div
            className={styles.formModal}
            role="dialog"
            aria-modal="true"
            aria-label="Edit task"
            onClick={(e) => e.stopPropagation()}
          >
            <ActivityForm
              date={editingBlock.date}
              initial={editingBlock}
              includeScheduleFields={!isUnscheduledDetailBlock(editingBlock)}
              isSubmitting={update.isPending || updateTask.isPending}
              onCancel={() => setEditingBlock(null)}
              onSubmit={handleEditSubmit}
            />
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ActivitiesPage;
