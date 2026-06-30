import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, ArchiveRestore, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import {
  canArchiveActivity,
  CATEGORY_MAP,
  type ICatalogTaskCreateInput,
  type IActivityWithTasks,
} from '@/features/activities';
import { AddTaskForm } from '../AddTaskForm/AddTaskForm';
import { TaskPriorityList } from '../TaskPriorityList/TaskPriorityList';
import styles from '../../ActivitiesPage.module.scss';

interface ActivityPriorityRowProps {
  activity: IActivityWithTasks;
  expanded: boolean;
  archivedView?: boolean;
  onToggle: () => void;
  onAddTask: (
    input: Pick<ICatalogTaskCreateInput, 'title' | 'timeEstimationSeconds'>
  ) => Promise<void>;
  onDeleteActivity: () => void;
  onArchiveActivity?: () => void;
  onRestoreActivity?: () => void;
  onAutoScheduleActivity: () => void;
  onSelectTask: (task: IActivityWithTasks['tasks'][number]) => void;
  onScheduleTask: (task: IActivityWithTasks['tasks'][number]) => void;
  onDeleteTask: (task: IActivityWithTasks['tasks'][number]) => void;
  disabled?: boolean;
}

export const ActivityPriorityRow: React.FC<ActivityPriorityRowProps> = ({
  activity,
  expanded,
  archivedView = false,
  onToggle,
  onAddTask,
  onDeleteActivity,
  onArchiveActivity,
  onRestoreActivity,
  onAutoScheduleActivity,
  onSelectTask,
  onScheduleTask,
  onDeleteTask,
  disabled = false,
}) => {
  const readOnly = archivedView || disabled;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: activity.id,
    data: { type: 'activity' },
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const category = CATEGORY_MAP[activity.categoryId];
  const taskCount = activity.tasks.length;
  const completedTaskCount = activity.tasks.filter(
    (task) => task.status === 'done'
  ).length;
  const panelId = `activity-tasks-${activity.id}`;
  const showArchive = !archivedView && canArchiveActivity(activity.tasks);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.activityRow} ${isDragging ? styles.dragging : ''}`}
    >
      <div
        className={styles.activityHeader}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={panelId}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {!archivedView ? (
          <span
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </span>
        ) : (
          <span className={styles.dragHandleSpacer} aria-hidden />
        )}
        <span
          className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
        >
          <ChevronRight size={16} />
        </span>
        <span className={styles.activityTitle}>{activity.title}</span>
        {category ? (
          <span
            className={styles.badge}
            style={{ background: category.color }}
          >
            {category.label}
          </span>
        ) : null}
        <span className={styles.taskCount}>
          {completedTaskCount}/{taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
        {!archivedView ? (
          <button
            type="button"
            className={styles.autoScheduleButton}
            aria-label={`Auto-schedule ${activity.title}`}
            disabled={disabled || taskCount === 0}
            onClick={(event) => {
              event.stopPropagation();
              onAutoScheduleActivity();
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            Auto-schedule
          </button>
        ) : null}
        {showArchive && onArchiveActivity ? (
          <button
            type="button"
            className={styles.softIconButton}
            aria-label={`Archive activity ${activity.title}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onArchiveActivity();
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Archive size={15} aria-hidden />
          </button>
        ) : null}
        {archivedView && onRestoreActivity ? (
          <button
            type="button"
            className={styles.softIconButton}
            aria-label={`Restore activity ${activity.title}`}
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onRestoreActivity();
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <ArchiveRestore size={15} aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Delete activity ${activity.title}`}
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onDeleteActivity();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </div>

      {expanded ? (
        <div id={panelId} role="region" aria-label={`Tasks for ${activity.title}`}>
          {taskCount > 0 ? (
            <TaskPriorityList
              tasks={activity.tasks}
              disabled={readOnly}
              onSelectTask={onSelectTask}
              onScheduleTask={onScheduleTask}
              onDeleteTask={onDeleteTask}
            />
          ) : (
            <p className={styles.emptyTasks}>No tasks yet</p>
          )}
          {!archivedView ? (
            <AddTaskForm
              activityId={activity.id}
              disabled={disabled}
              onAdd={onAddTask}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
