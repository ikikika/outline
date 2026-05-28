import React, { useState } from 'react';
import { MainLayout } from '@/layouts';
import {
  useActivityCatalog,
  useCreateActivity,
  useCreateCatalogTask,
  useDeleteActivity,
  useDeleteCatalogTask,
  useReorderActivities,
  useReorderTasks,
  useScheduleCatalogTask,
  todayKey,
  type IApiTask,
} from '@/features/activities';
import { AddActivityForm } from './components/AddActivityForm/AddActivityForm';
import { ActivityPriorityList } from './components/ActivityPriorityList/ActivityPriorityList';
import { ConfirmationModal } from './components/ConfirmationModal/ConfirmationModal';
import { ManualScheduleModal } from './components/ManualScheduleModal/ManualScheduleModal';
import styles from './ActivitiesPage.module.scss';

type DeleteTarget =
  | { kind: 'activity'; id: string; title: string; taskCount: number }
  | { kind: 'task'; id: string; title: string }
  | null;

export const ActivitiesPage: React.FC = () => {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [scheduleTarget, setScheduleTarget] = useState<IApiTask | null>(null);
  const { data: activities, isLoading, error } = useActivityCatalog();
  const createActivity = useCreateActivity();
  const createTask = useCreateCatalogTask();
  const deleteActivity = useDeleteActivity();
  const deleteTask = useDeleteCatalogTask();
  const scheduleTask = useScheduleCatalogTask();
  const reorderActivities = useReorderActivities();
  const reorderTasks = useReorderTasks();

  const busy =
    createActivity.isPending ||
    createTask.isPending ||
    deleteActivity.isPending ||
    deleteTask.isPending ||
    scheduleTask.isPending ||
    reorderActivities.isPending ||
    reorderTasks.isPending;
  const mutationError =
    createActivity.error ??
    createTask.error ??
    deleteActivity.error ??
    deleteTask.error ??
    scheduleTask.error ??
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
            await createActivity.mutateAsync(input);
          }}
        />

        {mutationError ? (
          <div className={styles.error} role="alert">
            {mutationError instanceof Error
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
    </MainLayout>
  );
};

export default ActivitiesPage;
