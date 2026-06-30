import React, { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type {
  ICatalogTaskCreateInput,
  IActivityWithTasks,
} from '@/features/activities';
import { ActivityPriorityRow } from '../ActivityPriorityRow/ActivityPriorityRow';

interface ActivityPriorityListProps {
  activities: IActivityWithTasks[];
  archivedView?: boolean;
  disabled?: boolean;
  onReorderActivities: (orderedIds: string[]) => void;
  onReorderTasks: (activityId: string, orderedTaskIds: string[]) => void;
  onAddTask: (
    activity: IActivityWithTasks,
    input: Pick<ICatalogTaskCreateInput, 'title' | 'timeEstimationSeconds'>
  ) => Promise<void>;
  onDeleteActivity: (activity: IActivityWithTasks) => void;
  onArchiveActivity?: (activity: IActivityWithTasks) => void;
  onRestoreActivity?: (activity: IActivityWithTasks) => void;
  onAutoScheduleActivity: (activity: IActivityWithTasks) => void;
  onSelectTask: (task: IActivityWithTasks['tasks'][number]) => void;
  onScheduleTask: (task: IActivityWithTasks['tasks'][number]) => void;
  onDeleteTask: (task: IActivityWithTasks['tasks'][number]) => void;
}

export const ActivityPriorityList: React.FC<ActivityPriorityListProps> = ({
  activities,
  archivedView = false,
  disabled = false,
  onReorderActivities,
  onReorderTasks,
  onAddTask,
  onDeleteActivity,
  onArchiveActivity,
  onRestoreActivity,
  onAutoScheduleActivity,
  onSelectTask,
  onScheduleTask,
  onDeleteTask,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const dndDisabled = disabled || archivedView;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (dndDisabled) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeData = active.data.current as
        | { type: 'activity' }
        | { type: 'task'; activityId: string }
        | undefined;
      const overData = over.data.current as
        | { type: 'activity' }
        | { type: 'task'; activityId: string }
        | undefined;

      if (activeData?.type === 'activity' && overData?.type === 'activity') {
        const ids = activities.map((a) => a.id);
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          onReorderActivities(arrayMove(ids, oldIndex, newIndex));
        }
        return;
      }

      if (
        activeData?.type === 'task' &&
        overData?.type === 'task' &&
        activeData.activityId === overData.activityId
      ) {
        const activityId = activeData.activityId;
        const activity = activities.find((a) => a.id === activityId);
        if (!activity) return;
        const taskIds = activity.tasks.map((t) => t.id);
        const oldIndex = taskIds.indexOf(String(active.id));
        const newIndex = taskIds.indexOf(String(over.id));
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          onReorderTasks(activityId, arrayMove(taskIds, oldIndex, newIndex));
        }
      }
    },
    [activities, dndDisabled, onReorderActivities, onReorderTasks]
  );

  const activityIds = activities.map((a) => a.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={activityIds}
        strategy={verticalListSortingStrategy}
      >
        {activities.map((activity) => (
          <ActivityPriorityRow
            key={activity.id}
            activity={activity}
            archivedView={archivedView}
            expanded={expandedIds.has(activity.id)}
            onToggle={() => toggleExpand(activity.id)}
            disabled={disabled}
            onAddTask={(input) => onAddTask(activity, input)}
            onDeleteActivity={() => onDeleteActivity(activity)}
            onArchiveActivity={
              onArchiveActivity ? () => onArchiveActivity(activity) : undefined
            }
            onRestoreActivity={
              onRestoreActivity ? () => onRestoreActivity(activity) : undefined
            }
            onAutoScheduleActivity={() => onAutoScheduleActivity(activity)}
            onSelectTask={onSelectTask}
            onScheduleTask={onScheduleTask}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};
