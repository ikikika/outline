export type {
  ActivityStatus,
  TaskStatus,
  ActivityCategoryId,
  IActivity,
  IActivityCategory,
  IActivityScheduleSlot,
  IActivityInput,
  ITask,
  ITaskInput,
  ITimeEntry,
  IManualTimeEntryInput,
  IActivityTemplate,
  TimeEntrySource,
} from './types';

export {
  ACTIVITY_CATEGORIES,
  CATEGORY_MAP,
  ACTIVITY_QUERY_KEYS,
  TIME_ENTRY_QUERY_KEYS,
  TEMPLATE_QUERY_KEYS,
  ON_TARGET_TOLERANCE,
} from './constants';

export {
  activityFormSchema,
  manualTimeEntrySchema,
  type ActivityFormValues,
  type ManualTimeEntryFormValues,
} from './schemas';

export {
  fetchActivities,
  fetchCatalogTasks,
  fetchTasksByActivityId,
  fetchTasksByDate,
  fetchTasksByDateRange,
  createTaskApi,
  patchActivityApi,
  patchTaskApi,
  isActivitiesApiEnabled,
  type IActivityPatch,
  type ITaskPatch,
} from './api/activitiesApi';
export type { IApiTask } from './api/mapApiTask';
export { activityRepository, taskRepository } from './repository/activityRepository';
export { activityCatalogRepository } from './repository/activityCatalogRepository';
export { timeEntryRepository } from './repository/timeEntryRepository';

export {
  useActivitiesByDate,
  useActivitiesByRange,
  useTimeEntriesByRange,
  useRunningTimer,
  useActivityMutations,
  useTimeEntryMutations,
  useTemplates,
  useTemplateMutations,
  useCopyYesterdayPlan,
  useApplyTemplate,
  useSaveDayAsTemplate,
} from './hooks/useActivities';

export { useJsonBackup } from './hooks/useJsonBackup';

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
  createId,
} from './utils/dateUtils';

export { splitActivitiesIntoTasks } from './utils/splitActivitiesIntoTasks';

export {
  ACTIVITIES_JSON_FILENAME,
  TASKS_JSON_FILENAME,
  buildDataSnapshot,
  persistTasksJsonSnapshot,
  saveTasksToJsonFile,
  loadTasksFromJsonFile,
  loadSampleDataFromPublic,
  reloadSampleDataFromPublic,
  hydrateFromPublicJson,
  ensureTasksSeeded,
  type ITasksJsonFile,
  type IActivitiesJsonFile,
} from './repository/jsonBackup';
