import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { ROUTES } from '@/app/routes/routes';
import { APP_NAME } from '@/core/constants/app';
import styles from './LandingPage.module.scss';

export const LandingPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <span className={styles.navLogo}>{APP_NAME}</span>
        <div className={styles.navLinks}>
          <Link to={ROUTES.LOGIN} className={styles.navGhost}>
            Sign In
          </Link>
          <Link to={ROUTES.TIMETABLE}>
            <Button variant="default" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <section className={styles.hero} aria-label="Introduction">
        <div className={styles.heroBackdrop} aria-hidden="true">
          <div className={styles.heroGrid}>
            {HERO_BLOCKS.map((block) => (
              <div
                key={block.id}
                className={styles.heroBlock}
                data-tone={block.tone}
                style={
                  {
                    '--col': block.col,
                    '--row': block.row,
                    '--span': block.span,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        </div>

        <div className={styles.heroInner}>
          <p className={styles.brand}>{APP_NAME}</p>
          <h1 className={styles.heroTitle}>Your day, planned and proven.</h1>
          <p className={styles.heroSubtitle}>
            Schedule focus on a living timetable, start timers when you work, and
            review how estimates held up — including schedule fit and unplanned
            interruptions.
          </p>
          <div className={styles.heroActions}>
            <Link to={ROUTES.TIMETABLE}>
              <Button variant="default" size="lg">
                Open Timetable
              </Button>
            </Link>
            <Link to={ROUTES.LOGIN} className={styles.secondaryLink}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.feature} aria-labelledby="feature-timetable">
        <div className={styles.featureCopy}>
          <p className={styles.featureLabel}>Timetable</p>
          <h2 id="feature-timetable" className={styles.featureTitle}>
            Block the day. Keep the rhythm.
          </h2>
          <p className={styles.featureBody}>
            Plan focus in day or week view, drag and resize blocks, and drop in
            short rests when you need them. Start a five-minute break from the
            header when the next focus can wait.
          </p>
        </div>
        <div className={styles.featureVisual} aria-hidden="true">
          <div className={styles.timetableMock}>
            <div className={styles.mockHeader}>
              <span>Today</span>
              <span className={styles.mockMeta}>Week · Zoom</span>
            </div>
            <div className={styles.mockRows}>
              {TIMETABLE_MOCK.map((row) => (
                <div key={row.time} className={styles.mockRow}>
                  <span className={styles.mockTime}>{row.time}</span>
                  <div
                    className={styles.mockSlot}
                    data-tone={row.tone}
                    style={{ width: row.width }}
                  >
                    {row.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.feature} ${styles.featureAlt}`} aria-labelledby="feature-activities">
        <div className={styles.featureCopy}>
          <p className={styles.featureLabel}>Activities & focus</p>
          <h2 id="feature-activities" className={styles.featureTitle}>
            Catalog work. Protect the calendar.
          </h2>
          <p className={styles.featureBody}>
            Keep courses and projects in a prioritized activity list, auto-schedule
            unplanned tasks into open slots, and mark adhoc blockers — one-off or
            repeating — so meetings and errands stay out of your reports.
          </p>
        </div>
        <div className={styles.featureVisual} aria-hidden="true">
          <ul className={styles.activityList}>
            {ACTIVITY_MOCK.map((item) => (
              <li key={item.title} className={styles.activityItem}>
                <span className={styles.activityDot} data-tone={item.tone} />
                <div>
                  <p className={styles.activityTitle}>{item.title}</p>
                  <p className={styles.activityMeta}>{item.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.feature} aria-labelledby="feature-track">
        <div className={styles.featureCopy}>
          <p className={styles.featureLabel}>Tracking</p>
          <h2 id="feature-track" className={styles.featureTitle}>
            Start when you work. Finish when you’re done.
          </h2>
          <p className={styles.featureBody}>
            Open a block, start the timer, and log interruptions as separate
            sessions. Finish a task and Tempo cleans up leftover focus plans —
            including unused Pomodoro rests that would otherwise clutter the day.
          </p>
        </div>
        <div className={styles.featureVisual} aria-hidden="true">
          <div className={styles.timerMock}>
            <p className={styles.timerLabel}>Deep work · in progress</p>
            <p className={styles.timerClock}>01:24:08</p>
            <div className={styles.timerBar}>
              <span className={styles.timerFill} />
            </div>
            <p className={styles.timerHint}>Planned 90m · on track</p>
          </div>
        </div>
      </section>

      <section className={`${styles.feature} ${styles.featureAlt}`} aria-labelledby="feature-reports">
        <div className={styles.featureCopy}>
          <p className={styles.featureLabel}>Reports</p>
          <h2 id="feature-reports" className={styles.featureTitle}>
            Estimates meet reality.
          </h2>
          <p className={styles.featureBody}>
            Compare planned estimates to logged time, see schedule fit inside your
            timetable windows, and surface unplanned work that started before it was
            ever scheduled. Export a CSV when you want a deeper weekly review.
          </p>
        </div>
        <div className={styles.featureVisual} aria-hidden="true">
          <div className={styles.reportMock}>
            {REPORT_METRICS.map((metric) => (
              <div key={metric.label} className={styles.reportMetric}>
                <span className={styles.reportValue}>{metric.value}</span>
                <span className={styles.reportLabel}>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.install} aria-labelledby="feature-pwa">
        <div className={styles.installInner}>
          <p className={styles.featureLabel}>On your phone</p>
          <h2 id="feature-pwa" className={styles.featureTitle}>
            Install Tempo. Get nudge when a block starts.
          </h2>
          <p className={styles.featureBody}>
            Add Tempo to your Home Screen as a PWA, then enable push from Profile so
            focus and breaks show up even when the browser tab is closed.
          </p>
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Plan the next block.</h2>
        <p className={styles.ctaSubtitle}>
          Open the timetable, drop in today’s focus, and start the timer when you
          begin.
        </p>
        <Link to={ROUTES.TIMETABLE}>
          <Button variant="default" size="lg">
            Start planning
          </Button>
        </Link>
      </section>

      <footer className={styles.footer}>
        <p>
          &copy; {new Date().getFullYear()} {APP_NAME}. Plan honestly. Track simply.
          Improve weekly.
        </p>
      </footer>
    </div>
  );
};

const HERO_BLOCKS = [
  { id: 'a', col: 2, row: 2, span: 3, tone: 'focus' },
  { id: 'b', col: 5, row: 2, span: 1, tone: 'rest' },
  { id: 'c', col: 6, row: 2, span: 2, tone: 'focus' },
  { id: 'd', col: 3, row: 4, span: 2, tone: 'adhoc' },
  { id: 'e', col: 5, row: 4, span: 3, tone: 'focus' },
  { id: 'f', col: 2, row: 6, span: 4, tone: 'focus' },
  { id: 'g', col: 6, row: 6, span: 1, tone: 'rest' },
  { id: 'h', col: 4, row: 8, span: 3, tone: 'adhoc' },
] as const;

const TIMETABLE_MOCK = [
  { time: '09:00', label: 'Course focus', tone: 'focus', width: '72%' },
  { time: '10:30', label: 'Short break', tone: 'rest', width: '18%' },
  { time: '10:35', label: 'Deep work', tone: 'focus', width: '64%' },
  { time: '12:00', label: 'Lunch · adhoc', tone: 'adhoc', width: '40%' },
  { time: '13:30', label: 'Project sprint', tone: 'focus', width: '78%' },
] as const;

const ACTIVITY_MOCK = [
  { title: 'Agentic AI course', meta: '4 tasks · planned', tone: 'focus' },
  { title: 'Client delivery', meta: '2 tasks · in progress', tone: 'focus' },
  { title: 'Adhoc blockers', meta: 'Repeating · excluded from reports', tone: 'adhoc' },
  { title: 'Pomodoro rests', meta: 'Auto-suggested after focus', tone: 'rest' },
] as const;

const REPORT_METRICS = [
  { value: '92%', label: 'Schedule fit' },
  { value: '−12m', label: 'Estimate variance' },
  { value: '18%', label: 'Unplanned share' },
  { value: '6/7', label: 'Blocks covered' },
] as const;

export default LandingPage;
