import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { IApiTask } from '@/features/activities';
import { TaskPriorityRow } from '../TaskPriorityRow/TaskPriorityRow';
import styles from '../../ActivitiesPage.module.scss';

interface TaskPriorityListProps {
  tasks: IApiTask[];
  disabled?: boolean;
  onScheduleTask: (task: IApiTask) => void;
  onDeleteTask: (task: IApiTask) => void;
}

export const TaskPriorityList: React.FC<TaskPriorityListProps> = ({
  tasks,
  disabled = false,
  onScheduleTask,
  onDeleteTask,
}) => {
  const ids = tasks.map((t) => t.id);

  return (
    <div className={styles.taskList}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <TaskPriorityRow
            key={task.id}
            task={task}
            disabled={disabled}
            onSchedule={() => onScheduleTask(task)}
            onDelete={() => onDeleteTask(task)}
          />
        ))}
      </SortableContext>
    </div>
  );
};
