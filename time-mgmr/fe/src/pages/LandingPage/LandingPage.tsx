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
          <Link to={ROUTES.LOGIN}>
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to={ROUTES.TIMETABLE}>
            <Button variant="default" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>Personal time management</span>
          <h1 className={styles.heroTitle}>
            Plan your day.
            <br />
            Track what you spend.
          </h1>
          <p className={styles.heroSubtitle}>
            {APP_NAME} helps you list daily activities, compare planned vs actual time,
            and see how effectively you use your hours.
          </p>
          <div className={styles.heroActions}>
            <Link to={ROUTES.TIMETABLE}>
              <Button variant="default" size="lg">
                Open Timetable
              </Button>
            </Link>
            <Link to={ROUTES.LOGIN}>
              <Button variant="ghost" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.codeBlock}>
            <span className={styles.codeLine}>
              <em>plan</em> → deep work 09:00–11:00
            </span>
            <span className={styles.codeLine}>
              <em>track</em> → timer 2h 18m actual
            </span>
            <span className={styles.codeLine}>&nbsp;</span>
            <span className={styles.codeLine}>
              <em>report</em> → +18m overrun · 92% coverage
            </span>
            <span className={styles.codeLine}>
              <em>improve</em> → tighten estimates tomorrow
            </span>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>The plan → track → review loop</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to reclaim your day?</h2>
        <p className={styles.ctaSubtitle}>
          Jump into the Timetable, plan a few blocks, and start the timer.
        </p>
        <Link to={ROUTES.TIMETABLE}>
          <Button variant="default" size="lg">
            Start planning
          </Button>
        </Link>
      </section>

      <footer className={styles.footer}>
        <p>
          &copy; 2026 {APP_NAME}. Plan honestly. Track simply. Improve weekly.
        </p>
      </footer>
    </div>
  );
};

const FEATURES = [
  {
    icon: '📅',
    title: 'Daily planning',
    description:
      'List activities with planned start and end times so every hour has an intention.',
  },
  {
    icon: '⏱️',
    title: 'Actual time tracking',
    description:
      'Start a live timer or log minutes manually — including multiple entries when you get interrupted.',
  },
  {
    icon: '📊',
    title: 'Effectiveness reports',
    description:
      'See planned vs actual, variance, completion, coverage, and where time really went by category.',
  },
  {
    icon: '📋',
    title: 'Week view & exports',
    description:
      'Browse your schedule across the week and export reports for deeper review.',
  },
  {
    icon: '☁️',
    title: 'Synced planning',
    description:
      'Your activities, schedule, and tracked time stay available across signed-in sessions.',
  },
  {
    icon: '✨',
    title: 'Built to last',
    description:
      'Feature modules, React Query, and typed forms so the product can grow without a rewrite.',
  },
];

export default LandingPage;
