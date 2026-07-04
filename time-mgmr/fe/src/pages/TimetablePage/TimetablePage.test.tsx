import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TimetablePage from './TimetablePage';

const mockBlocks = [
  {
    id: 'block-1',
    taskId: 'task-1',
    blockType: 'focus' as const,
    activityId: 'activity-1',
    title: 'Deep work',
    date: '2026-07-19',
    plannedStart: '09:00',
    plannedEnd: '11:00',
    categoryId: 'deep_work' as const,
    notes: '',
    status: 'planned' as const,
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  },
  {
    id: 'break-1',
    blockType: 'short_break' as const,
    activityId: 'pomodoro-breaks',
    title: 'Short Break',
    date: '2026-07-19',
    plannedStart: '11:00',
    plannedEnd: '11:05',
    timeEstimationSeconds: 300,
    categoryId: 'break' as const,
    notes: '',
    status: 'planned' as const,
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  },
];

let mockRunningEntry: {
  id: string;
  taskId: string;
  startAt: string;
  endAt: null;
  durationMinutes: null;
  source: 'timer';
  createdAt: string;
  updatedAt: string;
} | null = null;
const mockCompleteMutation = vi.fn();
const mockCompleteBlockMutation = vi.fn();
const mockDismissReminder = vi.fn();
let mockShouldPrompt = false;
const mockStopTimerMutation = vi.fn(async (entryId: string) => ({
  ...mockRunningEntry!,
  id: entryId,
  endAt: '2026-07-19T10:00:00.000Z',
  durationMinutes: 60,
  updatedAt: '2026-07-19T10:00:00.000Z',
}));

vi.mock('@/app/providers/auth', () => ({
  useAuthContext: () => ({
    user: {
      id: 'u1',
      name: 'Test',
      email: 'test@example.com',
      role: 'user',
      timetableVisibleStart: '08:00',
      timetableVisibleEnd: '20:00',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    setUser: vi.fn(),
  }),
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/features/activities', () => ({
  ACTIVITY_QUERY_KEYS: { all: ['activities'] },
  SCHEDULE_BLOCK_QUERY_KEYS: { all: ['schedule-blocks'] },
  addDays: (date: string, amount: number) => {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + amount);
    return next.toISOString().slice(0, 10);
  },
  formatDisplayDate: (date: string) => date,
  formatMinutes: (minutes: number) => `${minutes}m`,
  formatSignedMinutes: (minutes: number) => `${minutes}m`,
  formatWeekdayShort: (date: string) => date,
  todayKey: () => '2026-07-19',
  weekDateKeys: (date: string) => [date],
  CATEGORY_MAP: {
    deep_work: { id: 'deep_work', label: 'Deep work', color: '#7c3aed' },
    break: { id: 'break', label: 'Break', color: '#22c55e' },
  },
  minutesToTime: (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  },
  plannedDurationMinutes: () => 120,
  snapMinutes: (m: number) => m,
  timeToMinutes: (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  },
  useTimetableBlocksByDate: () => ({ data: mockBlocks, isLoading: false, error: null }),
  useTimetableBlocksByRange: () => ({ data: mockBlocks, isLoading: false, error: null }),
  useActivityById: () => ({
    data: { id: 'activity-1', title: 'AI course' },
  }),
  useTaskById: () => ({
    data: mockRunningEntry
      ? { id: 'task-1', title: 'Deep work', activityId: 'activity-1' }
      : undefined,
    isPending: false,
  }),
  useTimetableBlocksByTask: () => ({
    data: mockRunningEntry ? [mockBlocks[0]] : [],
    isPending: false,
  }),
  useResolvedTimeZone: () => 'UTC',
  useTimetableBlocksForCatalog: () => ({ data: mockBlocks }),
  useActivityMutations: () => ({
    update: { isPending: false, mutateAsync: vi.fn() },
    updateBlock: { isPending: false, mutateAsync: vi.fn() },
    remove: { isPending: false, mutateAsync: vi.fn() },
    setStatus: { isPending: false, mutateAsync: vi.fn() },
    skip: { isPending: false, mutateAsync: vi.fn() },
    completeBlock: { isPending: false, mutateAsync: mockCompleteBlockMutation },
    complete: { isPending: false, mutateAsync: mockCompleteMutation },
  }),
  workSessionBounds: (
    entries: Array<{ startAt: string; endAt: string | null }>
  ) => {
    let startAt: string | null = null;
    let endAt: string | null = null;
    for (const e of entries) {
      if (e.startAt && (startAt === null || e.startAt < startAt)) startAt = e.startAt;
      if (e.endAt && (endAt === null || e.endAt > endAt)) endAt = e.endAt;
    }
    return startAt && endAt ? { startAt, endAt } : null;
  },
  closedWorkSessions: (
    entries: Array<{ startAt: string; endAt: string | null }>
  ) =>
    entries
      .filter((e): e is { startAt: string; endAt: string } => Boolean(e.endAt))
      .map((e) => ({ startAt: e.startAt, endAt: e.endAt })),
  visibleTimetableBlocks: <T,>(blocks: T[]) => blocks,
  useRunningTimer: () => ({ data: mockRunningEntry }),
  useTimeEntriesByTask: () => ({
    data: mockRunningEntry ? [mockRunningEntry] : [],
  }),
  useTimeEntryMutations: () => ({
    startTimer: { isPending: false, mutateAsync: vi.fn() },
    stopTimer: { isPending: false, mutateAsync: mockStopTimerMutation },
    pauseTimer: { isPending: false, mutateAsync: vi.fn() },
    addManual: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

vi.mock('./hooks/usePomodoroReminder/usePomodoroReminder', () => ({
  usePomodoroReminder: () => ({
    breakBlock: mockShouldPrompt ? mockBlocks[1] : null,
    shouldPrompt: mockShouldPrompt,
    dismiss: mockDismissReminder,
  }),
}));

vi.mock('./components/AdhocBlockModal/AdhocBlockModal', () => ({
  AdhocBlockModal: () => <div data-testid="adhoc-block-modal" />,
}));

vi.mock('./components/ActivityForm/ActivityForm', () => ({
  ActivityForm: () => <div data-testid="activity-form" />,
}));

vi.mock('./components/TaskDetailModal/TaskDetailModal', () => ({
  TaskDetailModal: ({
    block,
    activityTitle,
    onCompleteBlock,
    onCompleteTask,
  }: {
    block: { id: string; taskId?: string; title: string };
    activityTitle?: string;
    onCompleteBlock: (block: { id: string; taskId?: string; title: string }) => void;
    onCompleteTask: (taskId: string) => void;
  }) => (
    <div data-testid="task-detail-modal">
      {activityTitle} · {block.title}
      <button type="button" onClick={() => onCompleteBlock(block)}>
        Finish session
      </button>
      <button
        type="button"
        onClick={() => {
          if (block.taskId) onCompleteTask(block.taskId);
        }}
      >
        Finish task
      </button>
    </div>
  ),
}));

describe('TimetablePage', () => {
  const renderPage = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>
        <TimetablePage />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockRunningEntry = null;
    mockShouldPrompt = false;
    mockCompleteMutation.mockClear();
    mockCompleteBlockMutation.mockClear();
    mockDismissReminder.mockClear();
    mockStopTimerMutation.mockClear();
  });

  it('renders timetable blocks', () => {
    renderPage();

    expect(screen.getByText('Deep work')).toBeInTheDocument();
    expect(screen.getByText('Short Break')).toBeInTheDocument();
  });

  it('shows a running timer notice for a different task', () => {
    mockRunningEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:00.000Z',
    };

    renderPage();

    expect(screen.getByText('Timer still running')).toBeInTheDocument();
    expect(screen.getByText(/Deep work started at/)).toBeInTheDocument();
  });

  it('opens the break prompt and can stop the timer then open the break', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    mockShouldPrompt = true;
    mockRunningEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:00.000Z',
    };

    renderPage();

    expect(screen.getByText(/Ready for a short break/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Open break/i }));

    expect(mockStopTimerMutation).toHaveBeenCalledWith('entry-1');
    expect(mockDismissReminder).toHaveBeenCalled();
    expect(screen.getByTestId('task-detail-modal')).toHaveTextContent('Short Break');
  });

  it('finishes a session with block id and stops a running timer first', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    mockRunningEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:00.000Z',
    };

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    await user.click(screen.getByRole('button', { name: 'Finish session' }));

    expect(mockStopTimerMutation).toHaveBeenCalledWith('entry-1');
    expect(mockCompleteBlockMutation).toHaveBeenCalledWith({
      blockId: 'block-1',
      taskId: 'task-1',
      sessions: [
        {
          startAt: '2026-07-19T09:00:00.000Z',
          endAt: '2026-07-19T10:00:00.000Z',
        },
      ],
    });
  });

  it('finishes the whole task and stops a running timer first', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    mockRunningEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:00.000Z',
    };

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Open task' }));
    await user.click(screen.getByRole('button', { name: 'Finish task' }));

    expect(mockStopTimerMutation).toHaveBeenCalledWith('entry-1');
    expect(mockCompleteMutation).toHaveBeenCalledWith({
      taskId: 'task-1',
      sessions: [
        {
          startAt: '2026-07-19T09:00:00.000Z',
          endAt: '2026-07-19T10:00:00.000Z',
        },
      ],
    });
  });

  it('opens the adhoc block modal from the header', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Add adhoc' }));
    expect(screen.getByTestId('adhoc-block-modal')).toBeInTheDocument();
  });
});
