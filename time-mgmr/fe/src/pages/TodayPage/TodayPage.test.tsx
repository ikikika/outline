import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TodayPage from './TodayPage';

const mockActivities = [
  {
    id: 'task-1',
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
];

vi.mock('@/layouts', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/features/activities', () => ({
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
  useActivitiesByRange: () => ({ data: mockActivities, isLoading: false, error: null }),
  useActivityMutations: () => ({
    update: { isPending: false, mutateAsync: vi.fn() },
    remove: { isPending: false, mutateAsync: vi.fn() },
    setStatus: { isPending: false, mutateAsync: vi.fn() },
  }),
  useRunningTimer: () => ({ data: null }),
  useTimeEntryMutations: () => ({
    startTimer: { isPending: false, mutateAsync: vi.fn() },
    stopTimer: { isPending: false, mutateAsync: vi.fn() },
    pauseTimer: { isPending: false, mutateAsync: vi.fn() },
    addManual: { isPending: false, mutateAsync: vi.fn() },
  }),
}));

vi.mock('@/features/reports', () => ({
  useDayReport: () => ({
    report: {
      plannedMinutes: 240,
      actualMinutes: 180,
      varianceMinutes: -60,
      completionRate: 0.75,
    },
    isLoading: false,
    error: null,
    activities: mockActivities,
    entries: [],
  }),
}));

vi.mock('./components/ActivityForm/ActivityForm', () => ({
  ActivityForm: () => <div data-testid="activity-form" />,
}));

describe('TodayPage', () => {
  it('renders timetable blocks', () => {
    render(<TodayPage />);

    expect(screen.getByLabelText('Day timetable')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2026-07-19' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Deep work/i })).toBeInTheDocument();
  });

  it('switches to week timetable view', async () => {
    const { userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<TodayPage />);

    await user.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByLabelText('Week timetable')).toBeInTheDocument();
  });
});
