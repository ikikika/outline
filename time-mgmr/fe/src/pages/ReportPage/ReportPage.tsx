import React, { useState } from 'react';
import { MainLayout } from '@/layouts';
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
} from '@/features/reports';
import styles from './ReportPage.module.scss';

type ReportMode = 'day' | 'week';

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
    <MainLayout>
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
                <span className={styles.summaryLabel}>Planned</span>
                <span className={styles.summaryValue}>
                  {formatMinutes(report.plannedMinutes)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Actual</span>
                <span className={styles.summaryValue}>
                  {formatMinutes(report.actualMinutes)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Variance</span>
                <span className={styles.summaryValue}>
                  {formatSignedMinutes(report.varianceMinutes)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Accuracy</span>
                <span className={styles.summaryValue}>
                  {report.accuracyRatio == null
                    ? '—'
                    : `${Math.round(report.accuracyRatio * 100)}%`}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Completion</span>
                <span className={styles.summaryValue}>
                  {Math.round(report.completionRate * 100)}%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Coverage</span>
                <span className={styles.summaryValue}>
                  {Math.round(report.coverageRate * 100)}%
                </span>
              </div>
              {'daysLogged' in report && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Days logged</span>
                  <span className={styles.summaryValue}>
                    {report.daysLogged}/{report.dayCount}
                  </span>
                </div>
              )}
            </div>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Category mix</h2>
              {report.categoryMix.length === 0 ? (
                <p className={styles.muted}>No actual time logged yet.</p>
              ) : (
                <ul className={styles.mixList}>
                  {report.categoryMix.map((item) => (
                    <li key={item.categoryId} className={styles.mixItem}>
                      <div className={styles.mixRow}>
                        <span>{item.label}</span>
                        <span>
                          {formatMinutes(item.actualMinutes)} · {Math.round(item.percent)}%
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${item.percent}%`, background: item.color }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Biggest overruns</h2>
              {report.biggestOverruns.length === 0 ? (
                <p className={styles.muted}>No overruns in this range.</p>
              ) : (
                <ul className={styles.overrunList}>
                  {report.biggestOverruns.map((m) => (
                    <li key={m.activity.id} className={styles.overrunItem}>
                      <div className={styles.mixRow}>
                        <strong>{m.activity.title}</strong>
                        <span>{formatSignedMinutes(m.varianceMinutes)}</span>
                      </div>
                      <span className={styles.muted}>
                        {m.activity.date} · planned {formatMinutes(m.plannedMinutes)} · actual{' '}
                        {formatMinutes(m.actualMinutes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {mode === 'week' && week.report && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>By day</h2>
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
                        Variance {formatSignedMinutes(d.varianceMinutes)} ·{' '}
                        {d.activities.length} activities
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
            Nothing to report yet. Plan activities on Today and log actual time.
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ReportPage;
