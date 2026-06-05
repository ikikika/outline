import React, { useMemo, useState } from 'react';
import { MainLayout } from '@/layouts';
import {
  useActivityCatalog,
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
  useScheduleCatalogTask,
  isActivityArchived,
  todayKey,
  type IActivityWithTasks,
  type IApiTask,
  type IAutoSchedulePreviewResponse,
  type IAutoScheduleRequest,
} from '@/features/activities';
import { AddActivityForm } from './components/AddActivityForm/AddActivityForm';
import { ActivityPriorityList } from './components/ActivityPriorityList/ActivityPriorityList';
import { AutoScheduleModal } from './components/AutoScheduleModal/AutoScheduleModal';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { ImportActivityForm } from './components/ImportActivityForm/ImportActivityForm';
import { ManualScheduleModal } from './components/ManualScheduleModal/ManualScheduleModal';
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
  const [autoScheduleTarget, setAutoScheduleTarget] =
    useState<IActivityWithTasks | null>(null);
  const [autoSchedulePreview, setAutoSchedulePreview] =
    useState<IAutoSchedulePreviewResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
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

  const visibleActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter((activity) => {
      const archived = isActivityArchived(activity.archivedAt);
      return listView === 'archived' ? archived : !archived;
    });
  }, [activities, listView]);

  const busy =
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
  const mutationError =
    importError ??
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

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    try {
      if (confirmTarget.kind === 'activity') {
        await deleteActivity.mutateAsync(confirmTarget.id);
      } else if (confirmTarget.kind === 'task') {
        await deleteTask.mutateAsync(confirmTarget.id);
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
    <MainLayout>
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
          defaultDate={todayKey()}
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
          defaultDate={todayKey()}
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
    </MainLayout>
  );
};

export default ActivitiesPage;
