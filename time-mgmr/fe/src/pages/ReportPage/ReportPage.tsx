import React, { useId, useState } from 'react';
import { Button } from '@/components/ui';
import {
  formatDisplayDate,
  formatMinutes,
  formatSignedMinutes,
  todayKey,
} from '@/features/activities';
import {
  exportDayReportCsv,
  exportRangeReportCsv,
  exportReportJson,
  useDayReport,
  useWeekReport,
  type IActivityMetrics,
} from '@/features/reports';
import styles from './ReportPage.module.scss';

type ReportMode = 'day' | 'week';

const VARIANCE_LABELS = {
  over: 'Over',
  under: 'Under',
  on_target: 'On target',
  untracked: 'Untracked',
} as const;

const METRIC_EXPLANATIONS = {
  planned:
    'The time you expected your activities to take. Comparing this with actual time helps you build realistic plans.',
  actual:
    'The time you actually logged. This shows where your time went, regardless of what was planned.',
  variance:
    'Actual time minus planned time. Repeated positive or negative variance reveals estimates that need adjusting.',
  accuracy:
    'Actual time as a percentage of planned time. A value near 100% means your overall estimate matched reality.',
  completion:
    'The percentage of planned activities marked done. It separates finishing work from merely spending time on it.',
  coverage:
    'The percentage of planned activities with logged time. High coverage makes the rest of your report more trustworthy.',
  deepWork:
    'The share of actual time spent on deep work. Tracking it helps protect focused time for demanding, high-value work.',
  admin:
    'The share of actual time spent on administration. Watching it helps prevent support work from crowding out priorities.',
  break:
    'The share of actual time spent on breaks. It helps you balance recovery with productive time.',
  daysLogged:
    'The number of days with a plan or logged activity. Consistent logging makes weekly patterns more reliable.',
  estimateCalibration:
    'Shows how often activity estimates were over, under, on target, or untracked. Use it to improve future estimates.',
  over:
    'Activities whose actual time exceeded the estimate by more than 10%. These often signal hidden scope or interruptions.',
  under:
    'Activities whose actual time was more than 10% below the estimate. These may have excess buffer or unclear scope.',
  onTarget:
    'Activities completed within 10% of their estimate. A growing share means your planning is becoming more predictable.',
  untracked:
    'Planned activities with no actual time logged. Too many untracked blocks make accuracy and category insights less reliable.',
  categoryMix:
    'Compares planned and actual time by category. It reveals whether your real allocation matched your priorities.',
  biggestOverruns:
    'The activities that exceeded their estimates by the most time. Reviewing them exposes recurring time sinks.',
  biggestUnderruns:
    'The activities that used much less time than planned. Reviewing them helps recover excess buffer in future plans.',
  mostFragmented:
    'Activities split across multiple time entries. High fragmentation can indicate interruptions or costly context switching.',
  busyButUnfinished:
    'Activities with logged time that are not done. This highlights effort that has not yet produced closure.',
  byDay:
    'Compares daily plans and outcomes. It helps identify which days or routines consistently work better.',
  category:
    'This category’s share of planned and actual time. The gap shows whether your schedule matched how you really worked.',
} as const;

function MetricLabel({
  children,
  explanation,
  className,
}: {
  children: React.ReactNode;
  explanation: string;
  className?: string;
}) {
  const tooltipId = useId();

  return (
    <span
      className={`${styles.metricLabel}${className ? ` ${className}` : ''}`}
      tabIndex={0}
      aria-describedby={tooltipId}
    >
      {children}
      <span id={tooltipId} role="tooltip" className={styles.tooltip}>
        {explanation}
      </span>
    </span>
  );
}

function ActivityInsightList({
  items,
  empty,
  detail,
}: {
  items: IActivityMetrics[];
  empty: string;
  detail: (m: IActivityMetrics) => string;
}) {
  if (items.length === 0) {
    return <p className={styles.muted}>{empty}</p>;
  }
  return (
    <ul className={styles.overrunList}>
      {items.map((m) => (
        <li key={m.activity.id} className={styles.overrunItem}>
          <div className={styles.mixRow}>
            <strong>{m.activity.title}</strong>
            <span>{formatSignedMinutes(m.varianceMinutes)}</span>
          </div>
          <span className={styles.muted}>{detail(m)}</span>
        </li>
      ))}
    </ul>
  );
}

export const ReportPage: React.FC = () => {
  const [mode, setMode] = useState<ReportMode>('week');
  const [anchorDate, setAnchorDate] = useState(todayKey);

  const day = useDayReport(anchorDate);
  const week = useWeekReport(anchorDate);

  const isLoading = mode === 'day' ? day.isLoading : week.isLoading;
  const report = mode === 'day' ? day.report : week.report;

  const handleExportCsv = () => {
    if (!report) return;
    if (mode === 'day' && day.report) {
      exportDayReportCsv(day.report);
    } else if (mode === 'week' && week.report) {
      exportRangeReportCsv(week.report);
    }
  };

  const handleExportJson = () => {
    if (!report) return;
    const name =
      mode === 'day'
        ? `tempo-report-${anchorDate}.json`
        : `tempo-report-${week.from}_${week.to}.json`;
    exportReportJson(report, name);
  };

  return (
    <div className={styles.report}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Report</h1>
            <p className={styles.subtitle}>
              How effectively you spent planned time
              {mode === 'week' && week.from
                ? ` · ${formatDisplayDate(week.from)} – ${formatDisplayDate(week.to)}`
                : ` · ${formatDisplayDate(anchorDate)}`}
            </p>
          </div>
          <div className={styles.controls}>
            <Button
              size="sm"
              variant={mode === 'day' ? 'default' : 'outline'}
              onClick={() => setMode('day')}
            >
              Day
            </Button>
            <Button
              size="sm"
              variant={mode === 'week' ? 'default' : 'outline'}
              onClick={() => setMode('week')}
            >
              Week
            </Button>
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
              aria-label="Report date"
            />
            <Button size="sm" variant="outline" onClick={handleExportCsv} disabled={!report}>
              Export CSV
            </Button>
            <Button size="sm" variant="ghost" onClick={handleExportJson} disabled={!report}>
              Export JSON
            </Button>
          </div>
        </header>

        {isLoading && <p className={styles.muted}>Loading report…</p>}

        {!isLoading && report && (
          <>
            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.planned}
                >
                  Planned
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {formatMinutes(report.plannedMinutes)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.actual}
                >
                  Actual
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {formatMinutes(report.actualMinutes)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.variance}
                >
                  Variance
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {formatSignedMinutes(report.varianceMinutes)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.accuracy}
                >
                  Accuracy
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {report.accuracyRatio == null
                    ? '—'
                    : `${Math.round(report.accuracyRatio * 100)}%`}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.completion}
                >
                  Completion
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {Math.round(report.completionRate * 100)}%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.coverage}
                >
                  Coverage
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {Math.round(report.coverageRate * 100)}%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.deepWork}
                >
                  Deep work
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {Math.round(report.deepWorkPercent)}%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.admin}
                >
                  Admin
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {Math.round(report.adminPercent)}%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <MetricLabel
                  className={styles.summaryLabel}
                  explanation={METRIC_EXPLANATIONS.break}
                >
                  Break
                </MetricLabel>
                <span className={styles.summaryValue}>
                  {Math.round(report.breakPercent)}%
                </span>
              </div>
              {'daysLogged' in report && (
                <div className={styles.summaryItem}>
                  <MetricLabel
                    className={styles.summaryLabel}
                    explanation={METRIC_EXPLANATIONS.daysLogged}
                  >
                    Days logged
                  </MetricLabel>
                  <span className={styles.summaryValue}>
                    {report.daysLogged}/{report.dayCount}
                  </span>
                </div>
              )}
            </div>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MetricLabel explanation={METRIC_EXPLANATIONS.estimateCalibration}>
                  Estimate calibration
                </MetricLabel>
              </h2>
              <p className={styles.sectionHint}>
                How your blocks landed vs plan (±10% counts as on target)
              </p>
              <ul className={styles.breakdownList}>
                {(
                  Object.keys(VARIANCE_LABELS) as Array<keyof typeof VARIANCE_LABELS>
                ).map((kind) => {
                  const count = report.varianceBreakdown[kind];
                  const total =
                    report.varianceBreakdown.over +
                    report.varianceBreakdown.under +
                    report.varianceBreakdown.on_target +
                    report.varianceBreakdown.untracked;
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <li key={kind} className={styles.breakdownItem}>
                      <div className={styles.mixRow}>
                        <MetricLabel
                          explanation={
                            METRIC_EXPLANATIONS[
                              kind === 'on_target'
                                ? 'onTarget'
                                : kind
                            ]
                          }
                        >
                          {VARIANCE_LABELS[kind]}
                        </MetricLabel>
                        <span>
                          {count} · {percent}%
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={`${styles.barFill} ${styles[`bar_${kind}`]}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MetricLabel explanation={METRIC_EXPLANATIONS.categoryMix}>
                  Category mix
                </MetricLabel>
              </h2>
              <p className={styles.sectionHint}>Planned vs actual share of time</p>
              {report.categoryMix.length === 0 ? (
                <p className={styles.muted}>No planned or actual time yet.</p>
              ) : (
                <ul className={styles.mixList}>
                  {report.categoryMix.map((item) => (
                    <li key={item.categoryId} className={styles.mixItem}>
                      <div className={styles.mixRow}>
                        <MetricLabel explanation={METRIC_EXPLANATIONS.category}>
                          {item.label}
                        </MetricLabel>
                        <span>
                          {formatMinutes(item.actualMinutes)} actual ·{' '}
                          {Math.round(item.percent)}%
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${item.percent}%`, background: item.color }}
                        />
                      </div>
                      <span className={styles.muted}>
                        Planned {formatMinutes(item.plannedMinutes)} ·{' '}
                        {Math.round(item.plannedPercent)}% of plan
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MetricLabel explanation={METRIC_EXPLANATIONS.biggestOverruns}>
                  Biggest overruns
                </MetricLabel>
              </h2>
              <ActivityInsightList
                items={report.biggestOverruns}
                empty="No overruns in this range."
                detail={(m) =>
                  `${m.activity.date} · planned ${formatMinutes(m.plannedMinutes)} · actual ${formatMinutes(m.actualMinutes)}${m.entryCount > 0 ? ` · ${m.entryCount} entries` : ''}`
                }
              />
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MetricLabel explanation={METRIC_EXPLANATIONS.biggestUnderruns}>
                  Biggest underruns
                </MetricLabel>
              </h2>
              <p className={styles.sectionHint}>
                Finished early or over-buffered — tighten estimates or reallocate time
              </p>
              <ActivityInsightList
                items={report.biggestUnderruns}
                empty="No underruns in this range."
                detail={(m) =>
                  `${m.activity.date} · planned ${formatMinutes(m.plannedMinutes)} · actual ${formatMinutes(m.actualMinutes)}`
                }
              />
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MetricLabel explanation={METRIC_EXPLANATIONS.mostFragmented}>
                  Most fragmented
                </MetricLabel>
              </h2>
              <p className={styles.sectionHint}>
                Multiple time entries on one block — often interruptions or context switching
              </p>
              {report.mostFragmented.length === 0 ? (
                <p className={styles.muted}>No fragmented blocks in this range.</p>
              ) : (
                <ul className={styles.overrunList}>
                  {report.mostFragmented.map((m) => (
                    <li key={m.activity.id} className={styles.overrunItem}>
                      <div className={styles.mixRow}>
                        <strong>{m.activity.title}</strong>
                        <span>{m.entryCount} entries</span>
                      </div>
                      <span className={styles.muted}>
                        {m.activity.date} · {formatMinutes(m.actualMinutes)} actual · variance{' '}
                        {formatSignedMinutes(m.varianceMinutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <MetricLabel explanation={METRIC_EXPLANATIONS.busyButUnfinished}>
                  Busy but unfinished
                </MetricLabel>
              </h2>
              <p className={styles.sectionHint}>
                Time logged without marking done — closure gap vs effort
              </p>
              {report.busyButUnfinished.length === 0 ? (
                <p className={styles.muted}>No open blocks with logged time.</p>
              ) : (
                <ul className={styles.overrunList}>
                  {report.busyButUnfinished.map((m) => (
                    <li key={m.activity.id} className={styles.overrunItem}>
                      <div className={styles.mixRow}>
                        <strong>{m.activity.title}</strong>
                        <span>{formatMinutes(m.actualMinutes)}</span>
                      </div>
                      <span className={styles.muted}>
                        {m.activity.date} · status {m.activity.status} · planned{' '}
                        {formatMinutes(m.plannedMinutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {mode === 'week' && week.report && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  <MetricLabel explanation={METRIC_EXPLANATIONS.byDay}>By day</MetricLabel>
                </h2>
                <ul className={styles.dayList}>
                  {week.report.byDay.map((d) => (
                    <li key={d.date} className={styles.dayItem}>
                      <div className={styles.mixRow}>
                        <strong>{formatDisplayDate(d.date)}</strong>
                        <span>
                          {formatMinutes(d.actualMinutes)} / {formatMinutes(d.plannedMinutes)}
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{
                            width: `${
                              d.plannedMinutes > 0
                                ? Math.min(100, (d.actualMinutes / d.plannedMinutes) * 100)
                                : d.actualMinutes > 0
                                  ? 100
                                  : 0
                            }%`,
                            background: '#2563eb',
                          }}
                        />
                      </div>
                      <span className={styles.muted}>
                        Variance {formatSignedMinutes(d.varianceMinutes)} · coverage{' '}
                        {Math.round(d.coverageRate * 100)}% · completion{' '}
                        {Math.round(d.completionRate * 100)}% · deep work{' '}
                        {Math.round(d.deepWorkPercent)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {!isLoading && report && report.plannedMinutes === 0 && report.actualMinutes === 0 && (
          <div className={styles.empty}>
            Nothing to report yet. Plan activities on Timetable and log actual time.
          </div>
        )}
      </div>
  );
};

export default ReportPage;
