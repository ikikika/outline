import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical } from 'lucide-react';
import {
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
  onToggle: () => void;
  onAddTask: (
    input: Pick<ICatalogTaskCreateInput, 'title' | 'timeEstimationSeconds'>
  ) => Promise<void>;
  disabled?: boolean;
}

export const ActivityPriorityRow: React.FC<ActivityPriorityRowProps> = ({
  activity,
  expanded,
  onToggle,
  onAddTask,
  disabled = false,
}) => {
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
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const category = CATEGORY_MAP[activity.categoryId];
  const taskCount = activity.tasks.length;
  const panelId = `activity-tasks-${activity.id}`;

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
        <span
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </span>
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
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {expanded ? (
        <div id={panelId} role="region" aria-label={`Tasks for ${activity.title}`}>
          {taskCount > 0 ? (
            <TaskPriorityList tasks={activity.tasks} disabled={disabled} />
          ) : (
            <p className={styles.emptyTasks}>No tasks yet</p>
          )}
          <AddTaskForm
            activityId={activity.id}
            disabled={disabled}
            onAdd={onAddTask}
          />
        </div>
      ) : null}
    </div>
  );
};
