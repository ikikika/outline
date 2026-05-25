import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
        plannedStart: '2026-07-21T01:00:00.000Z',
        plannedEnd: '2026-07-21T01:25:00.000Z',
        categoryId: 'deep_work' as const,
        notes: '',
        status: 'planned' as const,
        sortOrder: 0,
      },
      {
        id: 'task-2',
        activityId: 'act-1',
        title: 'Lesson 2',
        plannedStart: '2026-07-21T01:25:00.000Z',
        plannedEnd: '2026-07-21T01:50:00.000Z',
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
  useReorderActivities: () => mockReorderActivities,
  useReorderTasks: () => mockReorderTasks,
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
    expect(screen.getByText('No tasks')).toBeInTheDocument();
  });
});
