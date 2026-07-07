export {
  classifyVariance,
  buildActivityMetrics,
  buildDayReport,
  buildRangeReport,
  scheduleOverlapForBlock,
  type VarianceKind,
  type IActivityMetrics,
  type ICategoryMixItem,
  type IVarianceBreakdown,
  type IScheduleAdherenceSummary,
  type IDayReport,
  type IRangeReport,
} from './metrics';

export {
  exportReportJson,
  exportDayReportCsv,
  exportRangeReportCsv,
} from './export';

export { useDayReport, useWeekReport } from './hooks/useReports';
