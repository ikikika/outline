import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { manualScheduleSchema } from '@/features/activities/schemas';
import ActivitiesPage from './ActivitiesPage';

const mockActivities = [
  {
    id: 'act-1',
    title: 'Deep Learning',
    categoryId: 'deep_work' as const,
    notes: '',
    sortOrder: 0,
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    tasks: [
      {
        id: 'task-1',
        activityId: 'act-1',
        title: 'Lesson 1',
        categoryId: 'deep_work' as const,
        notes: '',
        status: 'unplanned' as const,
        sortOrder: 0,
      },
      {
        id: 'task-2',
        activityId: 'act-1',
        title: 'Lesson 2',
        categoryId: 'deep_work' as const,
        notes: '',
        status: 'in_progress' as const,
        sortOrder: 1,
      },
    ],
  },
  {
    id: 'act-2',
    title: 'Admin Tasks',
    categoryId: 'admin' as const,
    notes: '',
    sortOrder: 1,
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    tasks: [],
  },
];

const mockReorderActivities = { mutate: vi.fn(), isPending: false, error: null };
const mockReorderTasks = { mutate: vi.fn(), isPending: false, error: null };
const mockCreateActivity = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  error: null,
};
const mockCreateTask = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  error: null,
};
const mockDeleteActivity = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  error: null,
};
const mockDeleteTask = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  error: null,
};
const mockScheduleTask = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  isPending: false,
  error: null,
};

vi.mock('@/layouts', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/features/activities', () => ({
  useActivityCatalog: () => ({
    data: mockActivities,
    isLoading: false,
    error: null,
  }),
  useCreateActivity: () => mockCreateActivity,
  useCreateCatalogTask: () => mockCreateTask,
  useDeleteActivity: () => mockDeleteActivity,
  useDeleteCatalogTask: () => mockDeleteTask,
  useScheduleCatalogTask: () => mockScheduleTask,
  useReorderActivities: () => mockReorderActivities,
  useReorderTasks: () => mockReorderTasks,
  todayKey: () => '2026-07-21',
  manualScheduleSchema,
  ACTIVITY_CATEGORIES: [
    { id: 'work', label: 'Work', color: '#2563eb' },
    { id: 'deep_work', label: 'Deep work', color: '#7c3aed' },
    { id: 'admin', label: 'Admin', color: '#64748b' },
    { id: 'personal', label: 'Personal', color: '#059669' },
    { id: 'break', label: 'Break', color: '#d97706' },
  ],
  CATEGORY_MAP: {
    deep_work: { id: 'deep_work', label: 'Deep work', color: '#7c3aed' },
    admin: { id: 'admin', label: 'Admin', color: '#64748b' },
    break: { id: 'break', label: 'Break', color: '#d97706' },
  },
}));

describe('ActivitiesPage', () => {
  beforeEach(() => {
    mockReorderActivities.mutate.mockClear();
    mockReorderTasks.mutate.mockClear();
    mockCreateActivity.mutateAsync.mockClear();
    mockCreateTask.mutateAsync.mockClear();
    mockDeleteActivity.mutateAsync.mockClear();
    mockDeleteTask.mutateAsync.mockClear();
    mockScheduleTask.mutateAsync.mockClear();
    mockScheduleTask.reset.mockClear();
  });

  it('renders activity rows sorted by priority', () => {
    render(<ActivitiesPage />);
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
    expect(screen.getByText('Admin Tasks')).toBeInTheDocument();
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
    expect(screen.getByText('0 tasks')).toBeInTheDocument();
  });

  it('expands an activity to show its tasks', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    expect(screen.queryByText('Lesson 1')).not.toBeInTheDocument();

    await user.click(screen.getByText('Deep Learning'));

    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
    expect(screen.getByText('Lesson 2')).toBeInTheDocument();
    expect(screen.getByText('Unplanned')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('collapses an expanded activity on second click', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(screen.getByText('Deep Learning'));
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();

    await user.click(screen.getByText('Deep Learning'));
    expect(screen.queryByText('Lesson 1')).not.toBeInTheDocument();
  });

  it('shows empty state for activity with no tasks', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(screen.getByText('Admin Tasks'));
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('adds a new activity', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.type(screen.getByLabelText('Activity title'), 'Exercise');
    await user.selectOptions(screen.getByLabelText('Category'), 'personal');
    await user.click(screen.getByRole('button', { name: 'Add activity' }));

    expect(mockCreateActivity.mutateAsync).toHaveBeenCalledWith({
      title: 'Exercise',
      categoryId: 'personal',
    });
  });

  it('adds a task to an expanded activity', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(screen.getByText('Admin Tasks'));
    await user.type(screen.getByLabelText('Task title'), 'Review inbox');
    await user.clear(screen.getByLabelText('Minutes'));
    await user.type(screen.getByLabelText('Minutes'), '15');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(mockCreateTask.mutateAsync).toHaveBeenCalledWith({
      activityId: 'act-2',
      title: 'Review inbox',
      categoryId: 'admin',
      timeEstimationSeconds: 900,
    });
  });

  it('confirms before deleting an activity and its tasks', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(
      screen.getByRole('button', { name: 'Delete activity Deep Learning' })
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(
      screen.getByText(/Delete “Deep Learning” and its 2 tasks/)
    ).toBeInTheDocument();
    expect(mockDeleteActivity.mutateAsync).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: /^Delete activity$/ })
    );

    expect(mockDeleteActivity.mutateAsync).toHaveBeenCalledWith('act-1');
  });

  it('can cancel or confirm task deletion', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(screen.getByText('Deep Learning'));
    await user.click(
      screen.getByRole('button', { name: 'Delete task Lesson 1' })
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockDeleteTask.mutateAsync).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'Delete task Lesson 1' })
    );
    await user.click(
      screen.getByRole('button', { name: /^Delete task$/ })
    );

    expect(mockDeleteTask.mutateAsync).toHaveBeenCalledWith('task-1');
  });

  it('manually schedules an unplanned task', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(screen.getByText('Deep Learning'));
    await user.click(screen.getByRole('button', { name: 'Schedule' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Schedule Lesson 1');
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2026-07-22');
    await user.clear(screen.getByLabelText('Start time'));
    await user.type(screen.getByLabelText('Start time'), '10:00');
    await user.clear(screen.getByLabelText('End time'));
    await user.type(screen.getByLabelText('End time'), '10:30');
    await user.click(
      screen.getByRole('button', { name: 'Add to timetable' })
    );

    expect(mockScheduleTask.mutateAsync).toHaveBeenCalledWith({
      id: 'task-1',
      schedule: {
        date: '2026-07-22',
        plannedStart: '10:00',
        plannedEnd: '10:30',
      },
    });
  });
});
