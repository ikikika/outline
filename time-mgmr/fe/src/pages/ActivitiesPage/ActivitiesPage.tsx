import React, { useState } from 'react';
import { MainLayout } from '@/layouts';
import {
  useActivityCatalog,
  useConfirmAutoSchedule,
  useCreateActivity,
  useCreateCatalogTask,
  useDeleteActivity,
  useDeleteCatalogTask,
  useImportActivityCatalog,
  usePreviewAutoSchedule,
  useReorderActivities,
  useReorderTasks,
  useScheduleCatalogTask,
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

type DeleteTarget =
  | { kind: 'activity'; id: string; title: string; taskCount: number }
  | { kind: 'task'; id: string; title: string }
  | null;

export const ActivitiesPage: React.FC = () => {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
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
  const deleteTask = useDeleteCatalogTask();
  const scheduleTask = useScheduleCatalogTask();
  const previewAutoSchedule = usePreviewAutoSchedule();
  const confirmAutoSchedule = useConfirmAutoSchedule();
  const reorderActivities = useReorderActivities();
  const reorderTasks = useReorderTasks();

  const busy =
    createActivity.isPending ||
    importActivityCatalog.isPending ||
    createTask.isPending ||
    deleteActivity.isPending ||
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
    deleteTask.error ??
    scheduleTask.error ??
    previewAutoSchedule.error ??
    confirmAutoSchedule.error ??
    reorderActivities.error ??
    reorderTasks.error;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === 'activity') {
        await deleteActivity.mutateAsync(deleteTarget.id);
      } else {
        await deleteTask.mutateAsync(deleteTarget.id);
      }
      setDeleteTarget(null);
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

  return (
    <MainLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Activities</h1>
          <p className={styles.subtitle}>
            Drag to set priority. Expand to reorder tasks within an activity.
          </p>
        </header>

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
        ) : activities && activities.length > 0 ? (
          <ActivityPriorityList
            activities={activities}
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
              setDeleteTarget({
                kind: 'activity',
                id: activity.id,
                title: activity.title,
                taskCount: activity.tasks.length,
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
              setDeleteTarget({
                kind: 'task',
                id: task.id,
                title: task.title,
              })
            }
          />
        ) : (
          <p className={styles.empty}>No activities found.</p>
        )}
      </div>
      {deleteTarget ? (
        <ConfirmationModal
          title={`Delete ${deleteTarget.kind}?`}
          message={
            deleteTarget.kind === 'activity'
              ? `Delete “${deleteTarget.title}” and its ${deleteTarget.taskCount} ${
                  deleteTarget.taskCount === 1 ? 'task' : 'tasks'
                }? This cannot be undone.`
              : `Delete “${deleteTarget.title}”? This cannot be undone.`
          }
          confirmLabel={`Delete ${deleteTarget.kind}`}
          busy={deleteActivity.isPending || deleteTask.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
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
