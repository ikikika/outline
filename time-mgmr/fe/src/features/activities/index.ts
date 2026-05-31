export type {
  ActivityStatus,
  TaskStatus,
  ActivityCategoryId,
  ScheduleBlockType,
  IActivity,
  IActivityCategory,
  IActivityInput,
  IApiTask,
  ITimetableBlock,
  ITimeEntry,
  IManualTimeEntryInput,
  TimeEntrySource,
} from './types';

export {
  ACTIVITY_CATEGORIES,
  CATEGORY_MAP,
  ACTIVITY_QUERY_KEYS,
  SCHEDULE_BLOCK_QUERY_KEYS,
  TIME_ENTRY_QUERY_KEYS,
  ON_TARGET_TOLERANCE,
} from './constants';

export {
  activityFormSchema,
  manualScheduleSchema,
  manualTimeEntrySchema,
  autoScheduleSchema,
  activityCatalogImportSchema,
  type ActivityFormValues,
  type ManualScheduleValues,
  type ManualTimeEntryFormValues,
  type AutoScheduleFormValues,
  type ActivityCatalogImportValues,
} from './schemas';

export {
  fetchActivities,
  fetchActivityById,
  fetchCatalogTasks,
  fetchTasksByActivityId,
  fetchTaskById,
  createActivityApi,
  createCatalogTaskApi,
  importActivityCatalogApi,
  deleteActivityApi,
  deleteTaskApi,
  updateTaskApi,
  patchActivityApi,
  patchTaskApi,
  isActivitiesApiEnabled,
  type IActivityPatch,
  type IActivityCreateInput,
  type ICatalogTaskCreateInput,
  type IActivityCatalogImportInput,
  type IActivityCatalogImportResponse,
  type ITaskPatch,
} from './api/activitiesApi';

export {
  fetchScheduleBlocks,
  fetchScheduleBlockById,
  createScheduleBlockApi,
  patchScheduleBlockApi,
  deleteScheduleBlockApi,
  fetchTimetableBlocksByDate,
  fetchTimetableBlocksByDateRange,
  fetchTimetableBlocksByTaskId,
  scheduleTaskApi,
  updateScheduleBlockApi,
  previewAutoScheduleApi,
  confirmAutoScheduleApi,
  type IManualScheduleInput,
  type ITimetableBlockPatch,
  type IAutoScheduleRequest,
  type IAutoSchedulePreviewResponse,
  type IAutoSchedulePreviewDay,
  type IAutoScheduleConfirmResponse,
} from './api/scheduleBlocksApi';

export {
  fetchTimeEntriesByTask,
  fetchTimeEntryById,
  fetchTimeEntriesByRange,
  fetchRunningTimeEntries,
  createTimeEntryApi,
  patchTimeEntryApi,
  deleteTimeEntryApi,
  type ITimeEntryCreateBody,
  type ITimeEntryPatchBody,
} from './api/timeEntriesApi';

export type { IApiScheduleBlock } from './api/mapApiScheduleBlock';
export {
  apiScheduleBlockToTimetableBlock,
  timetableTimesToIso,
  breakFallbackMeta,
} from './api/mapApiScheduleBlock';

export { timeEntryRepository } from './repository/timeEntryRepository';

export {
  useTimetableBlocksByDate,
  useTimetableBlocksByRange,
  useActivitiesByDate,
  useActivitiesByRange,
  useActivityById,
  useTimetableBlocksForCatalog,
  useTaskCatalog,
  useResolvedTimeZone,
  useTaskById,
  useTimetableBlocksByTask,
  useTimeEntriesByRange,
  useTimeEntriesByTask,
  useRunningTimer,
  useActivityMutations,
  useTimeEntryMutations,
} from './hooks/useActivities';

export {
  useActivityCatalog,
  useCreateActivity,
  useImportActivityCatalog,
  useCreateCatalogTask,
  useDeleteActivity,
  useDeleteCatalogTask,
  useScheduleCatalogTask,
  usePreviewAutoSchedule,
  useConfirmAutoSchedule,
  useReorderActivities,
  useReorderTasks,
  type IActivityWithTasks,
} from './hooks/useActivityCatalog';

export { sortBySortOrder } from './utils/sortBySortOrder/sortBySortOrder';

export {
  formatDateKey,
  parseDateKey,
  todayKey,
  addDays,
  startOfWeek,
  weekDateKeys,
  formatDisplayDate,
  formatWeekdayShort,
  timeToMinutes,
  minutesToTime,
  snapMinutes,
  plannedDurationMinutes,
  formatMinutes,
  formatSignedMinutes,
  combineDateAndTime,
  minutesBetween,
} from './utils/dateUtils';
