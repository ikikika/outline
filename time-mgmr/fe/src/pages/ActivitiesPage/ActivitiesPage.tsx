import React from 'react';
import { MainLayout } from '@/layouts';
import {
  useActivityCatalog,
  useReorderActivities,
  useReorderTasks,
} from '@/features/activities';
import { ActivityPriorityList } from './components/ActivityPriorityList/ActivityPriorityList';
import styles from './ActivitiesPage.module.scss';

export const ActivitiesPage: React.FC = () => {
  const { data: activities, isLoading, error } = useActivityCatalog();
  const reorderActivities = useReorderActivities();
  const reorderTasks = useReorderTasks();

  const busy = reorderActivities.isPending || reorderTasks.isPending;
  const mutationError = reorderActivities.error ?? reorderTasks.error;

  return (
    <MainLayout>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Activities</h1>
          <p className={styles.subtitle}>
            Drag to set priority. Expand to reorder tasks within an activity.
          </p>
        </header>

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
          />
        ) : (
          <p className={styles.empty}>No activities found.</p>
        )}
      </div>
    </MainLayout>
  );
};

export default ActivitiesPage;
