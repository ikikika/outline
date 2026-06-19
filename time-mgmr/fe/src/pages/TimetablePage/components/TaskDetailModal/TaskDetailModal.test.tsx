import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  elapsedSecondsForEntries,
  formatClock,
  sessionDurationSeconds,
  TaskDetailModal,
} from './TaskDetailModal';
import type { ITimetableBlock, ITimeEntry } from '@/features/activities';

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/features/reports', () => ({
  buildActivityMetrics: () => ({
    plannedMinutes: 120,
    actualMinutes: 0,
    varianceMinutes: -120,
    accuracyRatio: null,
    varianceKind: 'untracked',
    entryCount: 0,
  }),
  classifyVariance: () => 'untracked',
}));

vi.mock('../../utils/taskBlockColor/taskBlockColor', () => ({
  getTaskBlockColor: () => '#2563eb',
}));

const block: ITimetableBlock = {
  id: 'block-1',
  taskId: 'task-1',
  blockType: 'focus',
  activityId: 'activity-1',
  title: 'Deep work',
  date: '2026-07-19',
  plannedStart: '09:00',
  plannedEnd: '11:00',
  timeEstimationSeconds: 120 * 60,
  categoryId: 'deep_work',
  notes: '',
  status: 'planned',
  createdAt: '2026-07-19T00:00:00.000Z',
  updatedAt: '2026-07-19T00:00:00.000Z',
};

const baseProps = {
  block,
  activityTitle: 'Agentic AI course',
  entries: [] as ITimeEntry[],
  runningEntry: null as ITimeEntry | null,
  onClose: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onStatus: vi.fn(),
  onStart: vi.fn(),
  onStop: vi.fn(),
  onLogManual: vi.fn(),
};

describe('formatClock', () => {
  it('formats under an hour as M:SS', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(5)).toBe('0:05');
  });

  it('formats hours as H:MM:SS', () => {
    expect(formatClock(3723)).toBe('1:02:03');
  });
});

describe('elapsedSecondsForEntries', () => {
  it('sums completed minutes and live running seconds', () => {
    const now = Date.parse('2026-07-19T10:00:30.000Z');
    const entries: ITimeEntry[] = [
      {
        id: 'e1',
        taskId: 'task-1',
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T09:30:00.000Z',
        durationMinutes: 30,
        source: 'timer',
        createdAt: '2026-07-19T09:00:00.000Z',
        updatedAt: '2026-07-19T09:30:00.000Z',
      },
      {
        id: 'e2',
        taskId: 'task-1',
        startAt: '2026-07-19T09:59:00.000Z',
        endAt: null,
        durationMinutes: null,
        source: 'timer',
        createdAt: '2026-07-19T09:59:00.000Z',
        updatedAt: '2026-07-19T09:59:00.000Z',
      },
    ];
    expect(elapsedSecondsForEntries(entries, now)).toBe(30 * 60 + 90);
  });
});

describe('work session log', () => {
  it('shows recorded start and stop times with the precise duration', () => {
    const entry: ITimeEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: '2026-07-19T09:00:30.000Z',
      durationMinutes: 1,
      source: 'timer',
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:30.000Z',
    };

    render(<TaskDetailModal {...baseProps} entries={[entry]} />);

    expect(screen.getByRole('heading', { name: 'Work sessions' })).toBeInTheDocument();
    expect(document.querySelectorAll('time')).toHaveLength(2);
    expect(screen.getAllByText('0:30')).toHaveLength(2);
    expect(sessionDurationSeconds(entry, Date.now())).toBe(30);
  });

  it('shows an active session as in progress', () => {
    const entry: ITimeEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: new Date().toISOString(),
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(<TaskDetailModal {...baseProps} entries={[entry]} runningEntry={entry} />);

    expect(screen.getByText('In progress')).toBeInTheDocument();
  });
});

describe('completed task actions', () => {
  it('replaces Done with an action that restores in-progress status', async () => {
    const user = userEvent.setup();
    const onStatus = vi.fn();

    render(
      <TaskDetailModal
        {...baseProps}
        block={{ ...block, status: 'done' }}
        onStatus={onStatus}
      />
    );

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark in progress' }));

    expect(onStatus).toHaveBeenCalledWith('task-1', 'in_progress');
  });

  it('does not allow a completed task to enter focus mode', async () => {
    const user = userEvent.setup();

    render(
      <TaskDetailModal
        {...baseProps}
        block={{ ...block, status: 'done' }}
      />
    );

    const focusButton = screen.getByRole('button', {
      name: 'Expand to full screen',
    });
    expect(focusButton).toBeDisabled();
    expect(focusButton).toHaveAttribute(
      'title',
      'Mark this task in progress before entering focus mode'
    );

    await user.click(focusButton);

    expect(
      screen.queryByRole('button', { name: 'Exit focus mode' })
    ).not.toBeInTheDocument();
  });
});

describe('TaskDetailModal focus mode', () => {
  it('ignores backdrop clicks briefly after open (mobile ghost click)', () => {
    vi.useFakeTimers();
    try {
      const onClose = vi.fn();
      const { container } = render(<TaskDetailModal {...baseProps} onClose={onClose} />);
      const backdrop = container.querySelector('[role="presentation"]');
      expect(backdrop).toBeTruthy();

      fireEvent.click(backdrop!);
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(400);
      });
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the parent activity title in task details', () => {
    render(<TaskDetailModal {...baseProps} />);

    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Agentic AI course')).toBeInTheDocument();
  });

  it('expands to full screen with a Start button and times', async () => {
    const user = userEvent.setup();
    render(<TaskDetailModal {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Expand to full screen' }));

    expect(screen.getByRole('heading', { name: 'Deep work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByText('Elapsed')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exit focus mode' })).toBeInTheDocument();
  });

  it('calculates remaining time from timeEstimationSeconds', async () => {
    const user = userEvent.setup();
    render(
      <TaskDetailModal
        {...baseProps}
        block={{ ...block, timeEstimationSeconds: 45 * 60 }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand to full screen' }));

    expect(screen.getByText('45:00')).toBeInTheDocument();
  });

  it('exits focus mode back to the detail modal', async () => {
    const user = userEvent.setup();
    render(<TaskDetailModal {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Expand to full screen' }));
    await user.click(screen.getByRole('button', { name: 'Exit focus mode' }));

    expect(screen.getByRole('heading', { name: 'Deep work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand to full screen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exit focus mode' })).not.toBeInTheDocument();
  });

  it('shows Stop when the timer is running for this task', async () => {
    const user = userEvent.setup();
    const runningEntry: ITimeEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:00.000Z',
    };

    render(
      <TaskDetailModal
        {...baseProps}
        entries={[runningEntry]}
        runningEntry={runningEntry}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand to full screen' }));
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  });

  it('shows a remaining-time ring around Stop while the timer is running', async () => {
    const user = userEvent.setup();
    const runningEntry: ITimeEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:00.000Z',
    };

    render(
      <TaskDetailModal
        {...baseProps}
        block={{ ...block, timeEstimationSeconds: 45 * 60 }}
        entries={[runningEntry]}
        runningEntry={runningEntry}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand to full screen' }));

    const ring = screen.getByRole('progressbar', { name: 'Remaining time' });
    expect(ring).toHaveAttribute('aria-valuemax', String(45 * 60));
    expect(Number(ring.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(0);
    expect(Number(ring.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(45 * 60);
  });

  it('hides the remaining-time ring before the timer starts', async () => {
    const user = userEvent.setup();
    render(
      <TaskDetailModal
        {...baseProps}
        block={{ ...block, timeEstimationSeconds: 45 * 60 }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand to full screen' }));

    expect(screen.queryByRole('progressbar', { name: 'Remaining time' })).not.toBeInTheDocument();
  });

  it('calls onStart from the focus Start button', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<TaskDetailModal {...baseProps} onStart={onStart} />);

    await user.click(screen.getByRole('button', { name: 'Expand to full screen' }));
    await user.click(screen.getByRole('button', { name: 'Start' }));

    expect(onStart).toHaveBeenCalledWith('task-1');
  });

  it('calls onStop from the focus Stop button', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const runningEntry: ITimeEntry = {
      id: 'entry-1',
      taskId: 'task-1',
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: '2026-07-19T09:00:00.000Z',
      updatedAt: '2026-07-19T09:00:00.000Z',
    };

    render(
      <TaskDetailModal
        {...baseProps}
        entries={[runningEntry]}
        runningEntry={runningEntry}
        onStop={onStop}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Expand to full screen' }));
    await user.click(screen.getByRole('button', { name: 'Stop' }));

    expect(onStop).toHaveBeenCalledWith('entry-1');
  });
});
