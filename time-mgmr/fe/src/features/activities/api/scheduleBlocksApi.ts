import { API_BASE_URL } from '@/core/constants/app';
import {
  localDateRangeToUtcRange,
  localDayToUtcRange,
} from '@/core/utils/timeZone/timeZone';
import {
  deleteJsonAuth,
  getJsonAuth,
  patchJsonAuth,
  postJsonAuth,
} from '@/services/httpClient';
import type { IApiTask, ITimetableBlock, ScheduleBlockType } from '../types';
import { fetchCatalogTasks, requireApiBaseUrl } from './activitiesApi';
import {
  apiScheduleBlockToTimetableBlock,
  timetableTimesToIso,
  type IApiScheduleBlock,
  type IScheduleBlockCreateBody,
  type IScheduleBlockPatchBody,
} from './mapApiScheduleBlock';

const SCHEDULE_BLOCKS_BASE_URL = `${API_BASE_URL}/schedule-blocks`;

export async function fetchScheduleBlocks(params: {
  date?: string;
  from?: string;
  to?: string;
  taskId?: string;
  timeZone?: string;
}): Promise<IApiScheduleBlock[]> {
  requireApiBaseUrl();
  const search = new URLSearchParams();

  if (params.taskId) {
    search.set('taskId', params.taskId);
  } else if (params.date && params.timeZone) {
    const { from, to } = localDayToUtcRange(params.date, params.timeZone);
    search.set('from', from);
    search.set('to', to);
  } else if (params.from && params.to && params.timeZone) {
    const { from, to } = localDateRangeToUtcRange(
      params.from,
      params.to,
      params.timeZone
    );
    search.set('from', from);
    search.set('to', to);
  } else if (params.date) {
    search.set('date', params.date);
  } else if (params.from && params.to) {
    search.set('from', params.from);
    search.set('to', params.to);
  }

  const qs = search.toString();
  const url = qs ? `${SCHEDULE_BLOCKS_BASE_URL}?${qs}` : SCHEDULE_BLOCKS_BASE_URL;
  return getJsonAuth<IApiScheduleBlock[]>(url);
}

export async function fetchScheduleBlockById(
  id: string
): Promise<IApiScheduleBlock> {
  requireApiBaseUrl();
  return getJsonAuth<IApiScheduleBlock>(
    `${SCHEDULE_BLOCKS_BASE_URL}/${encodeURIComponent(id)}`
  );
}

export async function createScheduleBlockApi(
  body: IScheduleBlockCreateBody
): Promise<IApiScheduleBlock> {
  requireApiBaseUrl();
  return postJsonAuth<IApiScheduleBlock>(SCHEDULE_BLOCKS_BASE_URL, body);
}

export async function patchScheduleBlockApi(
  id: string,
  patch: IScheduleBlockPatchBody
): Promise<IApiScheduleBlock> {
  requireApiBaseUrl();
  return patchJsonAuth<IApiScheduleBlock>(
    `${SCHEDULE_BLOCKS_BASE_URL}/${encodeURIComponent(id)}`,
    patch
  );
}

export async function deleteScheduleBlockApi(id: string): Promise<void> {
  requireApiBaseUrl();
  await deleteJsonAuth(`${SCHEDULE_BLOCKS_BASE_URL}/${encodeURIComponent(id)}`);
}

function taskMapFromCatalog(tasks: IApiTask[]): Map<string, IApiTask> {
  return new Map(tasks.map((task) => [task.id, task]));
}

export async function fetchTimetableBlocksByDate(
  date: string,
  timeZone: string
): Promise<ITimetableBlock[]> {
  const [blocks, tasks] = await Promise.all([
    fetchScheduleBlocks({ date, timeZone }),
    fetchCatalogTasks(),
  ]);
  const byId = taskMapFromCatalog(tasks);
  return blocks.map((block) =>
    apiScheduleBlockToTimetableBlock(
      block,
      block.taskId ? byId.get(block.taskId) : undefined,
      date,
      timeZone
    )
  );
}

export async function fetchTimetableBlocksByDateRange(
  fromDate: string,
  toDate: string,
  timeZone: string
): Promise<ITimetableBlock[]> {
  const [blocks, tasks] = await Promise.all([
    fetchScheduleBlocks({ from: fromDate, to: toDate, timeZone }),
    fetchCatalogTasks(),
  ]);
  const byId = taskMapFromCatalog(tasks);
  return blocks.map((block) =>
    apiScheduleBlockToTimetableBlock(
      block,
      block.taskId ? byId.get(block.taskId) : undefined,
      fromDate,
      timeZone
    )
  );
}

export async function fetchTimetableBlocksByTaskId(
  taskId: string,
  timeZone: string,
  fallbackDate: string
): Promise<ITimetableBlock[]> {
  const [blocks, tasks] = await Promise.all([
    fetchScheduleBlocks({ taskId }),
    fetchCatalogTasks(),
  ]);
  const byId = taskMapFromCatalog(tasks);
  return blocks.map((block) =>
    apiScheduleBlockToTimetableBlock(
      block,
      block.taskId ? byId.get(block.taskId) : undefined,
      fallbackDate,
      timeZone
    )
  );
}

export interface IManualScheduleInput {
  date: string;
  plannedStart: string;
  plannedEnd: string;
  blockType?: ScheduleBlockType;
}

export interface IAutoScheduleRequest {
  activityId: string;
  taskIds: string[];
  earliestDate: string;
  deadline?: string;
  workStart?: string;
  workEnd?: string;
  /** HH:mm start for the first workday only; later days use workStart. */
  firstDayStart?: string;
  sessionMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
  /** Multiplier on timeEstimationSeconds (default 1.5). */
  estimateBuffer?: number;
  allowSplitAcrossDays?: boolean;
  /** When true, do not place blocks on Sat/Sun. Default false. */
  skipWeekends?: boolean;
}

export interface IAutoSchedulePreviewBlock {
  id: string;
  taskId?: string;
  blockType: ScheduleBlockType;
  plannedStart: string;
  plannedEnd: string;
}

export interface IAutoSchedulePreviewDay {
  date: string;
  blocks: IAutoSchedulePreviewBlock[];
}

export interface IAutoSchedulePreviewResponse {
  previewToken: string;
  days: IAutoSchedulePreviewDay[];
  replacedBlockIds: string[];
  warnings: string[];
  canConfirm: boolean;
  unplacedTaskIds: string[];
}

export interface IAutoScheduleConfirmResponse {
  createdBlockIds: string[];
  replacedBlockIds: string[];
  scheduledTaskIds: string[];
}

const AUTO_SCHEDULE_BASE_URL = `${API_BASE_URL}/schedule-blocks/auto`;

export async function previewAutoScheduleApi(
  body: IAutoScheduleRequest
): Promise<IAutoSchedulePreviewResponse> {
  requireApiBaseUrl();
  return postJsonAuth<IAutoSchedulePreviewResponse>(
    `${AUTO_SCHEDULE_BASE_URL}/preview`,
    body
  );
}

export async function confirmAutoScheduleApi(
  body: IAutoScheduleRequest & { previewToken: string }
): Promise<IAutoScheduleConfirmResponse> {
  requireApiBaseUrl();
  return postJsonAuth<IAutoScheduleConfirmResponse>(
    `${AUTO_SCHEDULE_BASE_URL}/confirm`,
    body
  );
}

/** Place an unplanned task on the timetable by creating a schedule block. */
export async function scheduleTaskApi(
  taskId: string,
  input: IManualScheduleInput,
  timeZone: string
): Promise<IApiScheduleBlock> {
  const times = timetableTimesToIso(
    input.date,
    input.plannedStart,
    input.plannedEnd,
    timeZone
  );
  return createScheduleBlockApi({
    taskId,
    blockType: input.blockType ?? 'focus',
    plannedStart: times.plannedStart,
    plannedEnd: times.plannedEnd,
  });
}

export type ITimetableBlockPatch = Partial<
  Pick<ITimetableBlock, 'date' | 'plannedStart' | 'plannedEnd' | 'blockType'>
>;

export async function updateScheduleBlockApi(
  id: string,
  patch: ITimetableBlockPatch,
  timeZone: string,
  fallback?: Pick<ITimetableBlock, 'date' | 'plannedStart' | 'plannedEnd'>
): Promise<ITimetableBlock> {
  requireApiBaseUrl();

  const date = patch.date ?? fallback?.date;
  const plannedStart = patch.plannedStart ?? fallback?.plannedStart;
  const plannedEnd = patch.plannedEnd ?? fallback?.plannedEnd;

  const apiPatch: IScheduleBlockPatchBody = {};
  if (patch.blockType !== undefined) apiPatch.blockType = patch.blockType;

  const timesChanging =
    patch.plannedStart !== undefined ||
    patch.plannedEnd !== undefined ||
    patch.date !== undefined;

  if (timesChanging) {
    if (!date || !plannedStart || !plannedEnd) {
      throw new Error(
        'date, plannedStart, and plannedEnd are required when rescheduling a block'
      );
    }
    const times = timetableTimesToIso(date, plannedStart, plannedEnd, timeZone);
    apiPatch.plannedStart = times.plannedStart;
    apiPatch.plannedEnd = times.plannedEnd;
  }

  if (Object.keys(apiPatch).length === 0) {
    throw new Error('At least one field is required to update a schedule block');
  }

  const updated = await patchScheduleBlockApi(id, apiPatch);
  const tasks = await fetchCatalogTasks();
  const task = updated.taskId
    ? tasks.find((t) => t.id === updated.taskId)
    : undefined;
  return apiScheduleBlockToTimetableBlock(
    updated,
    task,
    date ?? fallback?.date ?? '',
    timeZone
  );
}
