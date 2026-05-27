import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { IApiTask } from '@/features/activities';
import styles from '../../ActivitiesPage.module.scss';

interface TaskPriorityRowProps {
  task: IApiTask;
  disabled?: boolean;
  onDelete: () => void;
}

function formatEstimation(seconds?: number): string | null {
  if (!seconds) return null;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'unplanned':
      return 'Unplanned';
    case 'in_progress':
      return 'In progress';
    case 'done':
      return 'Done';
    case 'skipped':
      return 'Skipped';
    default:
      return 'Planned';
  }
}

export const TaskPriorityRow: React.FC<TaskPriorityRowProps> = ({
  task,
  disabled = false,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', activityId: task.activityId },
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const est = formatEstimation(task.timeEstimationSeconds);
  const statusClass =
    task.status === 'done'
      ? styles.statusDone
      : task.status === 'in_progress'
        ? styles.statusInProgress
        : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.taskRow} ${isDragging ? styles.dragging : ''}`}
    >
      <span className={styles.dragHandle} {...attributes} {...listeners}>
        <GripVertical size={14} />
      </span>
      <span className={styles.taskTitle}>{task.title}</span>
      {est ? <span className={styles.taskMeta}>{est}</span> : null}
      <span className={`${styles.statusChip} ${statusClass}`}>
        {statusLabel(task.status)}
      </span>
      <button
        type="button"
        className={styles.iconButton}
        aria-label={`Delete task ${task.title}`}
        disabled={disabled}
        onClick={onDelete}
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </div>
  );
};
