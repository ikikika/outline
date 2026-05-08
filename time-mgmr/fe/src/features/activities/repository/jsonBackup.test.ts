import { describe, expect, it } from 'vitest';
import { loadTasksFromJsonFile, normalizeImportedTasks } from './jsonBackup';

describe('jsonBackup', () => {
  it('rejects unrecognized json payloads', async () => {
    const file = {
      text: async () => '{"version":2}',
    } as File;
    await expect(loadTasksFromJsonFile(file)).rejects.toThrow(/Unrecognized JSON/);
  });

  it('normalizes public tasks.json entries into timetable-friendly task objects', () => {
    const normalized = normalizeImportedTasks(
      [
        {
          id: 'task01',
          activityId: 'ai-agents',
          title: 'AI agent vid 01',
          plannedStart: '2026-07-19T08:00:00.000Z',
          plannedEnd: '2026-07-19T10:15:00.000Z',
          categoryId: 'admin',
          notes: '',
        },
        {
          id: 'task05',
          activityId: 'ai-agents',
          title: 'AI agent vid 05',
          plannedStart: '2026-07-20T09:00:00.000Z',
          plannedEnd: '2026-07-20T13:15:00.000Z',
          categoryId: 'admin',
          notes: '',
        },
      ],
      '2026-07-19'
    );

    expect(normalized).toHaveLength(2);
    expect(normalized[0]).toMatchObject({
      id: 'task01',
      activityId: 'ai-agents',
      title: 'AI agent vid 01',
      date: '2026-07-19',
      plannedStart: '08:00',
      plannedEnd: '10:15',
      categoryId: 'admin',
      notes: '',
      status: 'planned',
    });
    expect(normalized[1]).toMatchObject({
      id: 'task05',
      activityId: 'ai-agents',
      date: '2026-07-20',
      plannedStart: '09:00',
      plannedEnd: '13:15',
    });
  });
});
