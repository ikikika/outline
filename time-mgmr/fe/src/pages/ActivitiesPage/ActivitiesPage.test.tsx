import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { manualScheduleSchema, autoScheduleSchema, activityCatalogImportSchema, createAutoScheduleSchema, needsFirstDayStart } from '@/features/activities/schemas';
import ActivitiesPage from './ActivitiesPage';

const mockActivities = [
  {
    id: 'act-1',
    title: 'Deep Learning',
    categoryId: 'deep_work' as const,
    notes: '',
    sortOrder: 0,
    archivedAt: null,
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
        status: 'done' as const,
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
    archivedAt: null,
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    tasks: [],
  },
  {
    id: 'act-3',
    title: 'Finished Project',
    categoryId: 'work' as const,
    notes: '',
    sortOrder: 2,
    archivedAt: null,
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    tasks: [
      {
        id: 'task-3',
        activityId: 'act-3',
        title: 'Ship release',
        categoryId: 'work' as const,
        notes: '',
        status: 'done' as const,
        sortOrder: 0,
      },
    ],
  },
  {
    id: 'act-4',
    title: 'Old Launch',
    categoryId: 'work' as const,
    notes: '',
    sortOrder: 3,
    archivedAt: '2026-07-20T00:00:00.000Z',
    createdAt: '2026-07-10T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
    tasks: [
      {
        id: 'task-4',
        activityId: 'act-4',
        title: 'Announce',
        categoryId: 'work' as const,
        notes: '',
        status: 'done' as const,
        sortOrder: 0,
      },
    ],
  },
];

const mockReorderActivities = { mutate: vi.fn(), isPending: false, error: null };
const mockReorderTasks = { mutate: vi.fn(), isPending: false, error: null };
const mockCreateActivity = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  error: null,
};
const mockImportActivityCatalog = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  isPending: false,
  error: null as Error | null,
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
const mockArchiveActivity = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  error: null,
};
const mockRestoreActivity = {
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
const mockPreviewAutoSchedule = {
  mutateAsync: vi.fn().mockResolvedValue({
    previewToken: 'token-1',
    days: [
      {
        date: '2026-07-21',
        blocks: [
          {
            id: 'task-task-1',
            taskId: 'task-1',
            blockType: 'focus',
            plannedStart: '2026-07-21T09:00:00.000Z',
            plannedEnd: '2026-07-21T09:10:00.000Z',
          },
        ],
      },
    ],
    replacedBlockIds: [],
    warnings: [],
    canConfirm: true,
    unplacedTaskIds: [],
  }),
  reset: vi.fn(),
  isPending: false,
  error: null,
};
const mockConfirmAutoSchedule = {
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  isPending: false,
  error: null,
};

vi.mock('@/features/activities/hooks/useActivities', () => ({
  useResolvedTimeZone: () => 'UTC',
}));

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
  useImportActivityCatalog: () => mockImportActivityCatalog,
  useCreateCatalogTask: () => mockCreateTask,
  useDeleteActivity: () => mockDeleteActivity,
  useArchiveActivity: () => mockArchiveActivity,
  useRestoreActivity: () => mockRestoreActivity,
  useDeleteCatalogTask: () => mockDeleteTask,
  useScheduleCatalogTask: () => mockScheduleTask,
  usePreviewAutoSchedule: () => mockPreviewAutoSchedule,
  useConfirmAutoSchedule: () => mockConfirmAutoSchedule,
  useReorderActivities: () => mockReorderActivities,
  useReorderTasks: () => mockReorderTasks,
  canArchiveActivity: (tasks: Array<{ status: string }>) =>
    tasks.length > 0 && tasks.every((task) => task.status === 'done'),
  isActivityArchived: (archivedAt: string | null | undefined) =>
    typeof archivedAt === 'string' && archivedAt.length > 0,
  todayKey: () => '2026-07-21',
  manualScheduleSchema,
  autoScheduleSchema,
  createAutoScheduleSchema,
  needsFirstDayStart,
  activityCatalogImportSchema,
  formatMinutes: (minutes: number) => `${minutes}m`,
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
    work: { id: 'work', label: 'Work', color: '#2563eb' },
    break: { id: 'break', label: 'Break', color: '#d97706' },
  },
}));

describe('ActivitiesPage', () => {
  beforeEach(() => {
    mockReorderActivities.mutate.mockClear();
    mockReorderTasks.mutate.mockClear();
    mockCreateActivity.mutateAsync.mockClear();
    mockImportActivityCatalog.mutateAsync.mockClear();
    mockImportActivityCatalog.reset.mockClear();
    mockImportActivityCatalog.error = null;
    mockCreateTask.mutateAsync.mockClear();
    mockDeleteActivity.mutateAsync.mockClear();
    mockArchiveActivity.mutateAsync.mockClear();
    mockRestoreActivity.mutateAsync.mockClear();
    mockDeleteTask.mutateAsync.mockClear();
    mockScheduleTask.mutateAsync.mockClear();
    mockScheduleTask.reset.mockClear();
    mockPreviewAutoSchedule.mutateAsync.mockClear();
    mockPreviewAutoSchedule.reset.mockClear();
    mockConfirmAutoSchedule.mutateAsync.mockClear();
    mockConfirmAutoSchedule.reset.mockClear();
  });

  it('renders activity rows sorted by priority', () => {
    render(<ActivitiesPage />);
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
    expect(screen.getByText('Admin Tasks')).toBeInTheDocument();
    expect(screen.getByText('Finished Project')).toBeInTheDocument();
    expect(screen.queryByText('Old Launch')).not.toBeInTheDocument();
    expect(screen.getByText('1/2 tasks')).toBeInTheDocument();
    expect(screen.getByText('0/0 tasks')).toBeInTheDocument();
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
    expect(screen.getByText('Done')).toBeInTheDocument();
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

  it('shows archive only when every task is done', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    expect(
      screen.queryByRole('button', { name: 'Archive activity Deep Learning' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Archive activity Admin Tasks' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Archive activity Finished Project' })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Archive activity Finished Project' })
    );
    expect(
      screen.getByText(/Archive “Finished Project” and its 1 completed task/)
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /^Archive activity$/ })
    );
    expect(mockArchiveActivity.mutateAsync).toHaveBeenCalledWith('act-3');
  });

  it('shows archived activities and restores them', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(screen.getByRole('button', { name: 'Archived' }));

    expect(screen.getByText('Old Launch')).toBeInTheDocument();
    expect(screen.queryByText('Deep Learning')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Auto-schedule Old Launch' })
    ).not.toBeInTheDocument();

    await user.click(screen.getByText('Old Launch'));
    expect(screen.getByText('Announce')).toBeInTheDocument();
    expect(screen.queryByLabelText('Task title')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete task Announce' })
    ).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: 'Restore activity Old Launch' })
    );
    await user.click(
      screen.getByRole('button', { name: /^Restore activity$/ })
    );
    expect(mockRestoreActivity.mutateAsync).toHaveBeenCalledWith('act-4');
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

  it('opens auto-schedule modal from activity header', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(
      screen.getByRole('button', { name: 'Auto-schedule Deep Learning' })
    );

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Auto-schedule Deep Learning'
    );
    expect(screen.getByLabelText(/Lesson 1/)).toBeChecked();
  });

  it('previews and confirms auto-schedule', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(
      screen.getByRole('button', { name: 'Auto-schedule Deep Learning' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Preview schedule' })
    );

    expect(mockPreviewAutoSchedule.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'act-1',
        taskIds: ['task-1'],
        earliestDate: '2026-07-21',
      })
    );
    expect(await screen.findByText('2026-07-21')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Confirm schedule' })
    );

    expect(mockConfirmAutoSchedule.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'act-1',
        previewToken: 'token-1',
      })
    );
  });

  it('returns to configuration from preview', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(
      screen.getByRole('button', { name: 'Auto-schedule Deep Learning' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Preview schedule' })
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(
      screen.getByRole('button', { name: 'Preview schedule' })
    ).toBeInTheDocument();
  });

  it('imports an activity and tasks from a valid JSON file', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    const payload = {
      activity: {
        title: 'Imported Course',
        categoryId: 'admin',
        notes: '',
        id: 'imported-course',
      },
      tasks: [
        {
          title: 'Lesson A',
          timeEstimationSeconds: 600,
          sortOrder: 0,
          id: 'lesson-a',
        },
      ],
    };
    const file = new File([JSON.stringify(payload)], 'import.json', {
      type: 'application/json',
    });

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    await user.upload(input, file);

    expect(mockImportActivityCatalog.mutateAsync).toHaveBeenCalledWith({
      activity: {
        title: 'Imported Course',
        categoryId: 'admin',
        notes: '',
        id: 'imported-course',
      },
      tasks: [
        {
          title: 'Lesson A',
          timeEstimationSeconds: 600,
          sortOrder: 0,
          id: 'lesson-a',
        },
      ],
    });
  });

  it('shows an error for invalid import JSON', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    const file = new File(['{not-json'], 'bad.json', {
      type: 'application/json',
    });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(input, file);

    expect(mockImportActivityCatalog.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Import file must be valid JSON.'
    );
  });

  it('shows an error for import files that fail schema validation', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    const file = new File(
      [JSON.stringify({ activity: { title: 'Missing category' }, tasks: [] })],
      'invalid.json',
      { type: 'application/json' }
    );
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    await user.upload(input, file);

    expect(mockImportActivityCatalog.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('disables confirm when preview reports unplaced tasks', async () => {
    mockPreviewAutoSchedule.mutateAsync.mockResolvedValueOnce({
      previewToken: 'token-2',
      days: [],
      replacedBlockIds: [],
      warnings: ['Could not schedule "Lesson 1" within constraints.'],
      canConfirm: false,
      unplacedTaskIds: ['task-1'],
    });

    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<ActivitiesPage />);

    await user.click(
      screen.getByRole('button', { name: 'Auto-schedule Deep Learning' })
    );
    await user.click(
      screen.getByRole('button', { name: 'Preview schedule' })
    );

    expect(
      screen.getByRole('button', { name: 'Confirm schedule' })
    ).toBeDisabled();
  });
});
