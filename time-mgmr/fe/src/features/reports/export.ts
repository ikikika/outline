import type { IDayReport, IRangeReport } from './metrics';
import { formatMinutes, formatSignedMinutes } from '@/features/activities/utils/dateUtils';

function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportReportJson(report: IDayReport | IRangeReport, filename: string): void {
  downloadBlob(filename, JSON.stringify(report, null, 2), 'application/json');
}

export function exportDayReportCsv(report: IDayReport): void {
  const headers = [
    'title',
    'date',
    'category',
    'status',
    'planned_start',
    'planned_end',
    'planned_minutes',
    'actual_minutes',
    'variance_minutes',
    'variance_kind',
    'entries',
  ];
  const rows = report.activities.map((m) =>
    [
      csvEscape(m.activity.title),
      m.activity.date,
      m.activity.categoryId,
      m.activity.status,
      m.activity.plannedStart,
      m.activity.plannedEnd,
      m.plannedMinutes,
      m.actualMinutes,
      m.varianceMinutes,
      m.varianceKind,
      m.entryCount,
    ].join(',')
  );
  const summary = [
    `# planned=${formatMinutes(report.plannedMinutes)}`,
    `# actual=${formatMinutes(report.actualMinutes)}`,
    `# variance=${formatSignedMinutes(report.varianceMinutes)}`,
    `# completion=${Math.round(report.completionRate * 100)}%`,
  ];
  downloadBlob(
    `tempo-${report.date}.csv`,
    [...summary, headers.join(','), ...rows].join('\n'),
    'text/csv'
  );
}

export function exportRangeReportCsv(report: IRangeReport): void {
  const headers = [
    'title',
    'date',
    'category',
    'status',
    'planned_minutes',
    'actual_minutes',
    'variance_minutes',
    'variance_kind',
  ];
  const rows = report.byDay.flatMap((day) =>
    day.activities.map((m) =>
      [
        csvEscape(m.activity.title),
        m.activity.date,
        m.activity.categoryId,
        m.activity.status,
        m.plannedMinutes,
        m.actualMinutes,
        m.varianceMinutes,
        m.varianceKind,
      ].join(',')
    )
  );
  downloadBlob(
    `tempo-${report.from}_to_${report.to}.csv`,
    [headers.join(','), ...rows].join('\n'),
    'text/csv'
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
