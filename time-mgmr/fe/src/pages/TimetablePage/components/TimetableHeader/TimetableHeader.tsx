import React from 'react';
import { Button, Input } from '@/components/ui';
import { addDays, todayKey } from '@/features/activities';
import styles from './TimetableHeader.module.scss';

export type TimetableView = 'day' | 'week';

interface TimetableHeaderProps {
  view: TimetableView;
  onViewChange: (view: TimetableView) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  dateLabel: string;
}

export const TimetableHeader: React.FC<TimetableHeaderProps> = ({
  view,
  onViewChange,
  selectedDate,
  onSelectedDateChange,
  dateLabel,
}) => {
  const stepDays = view === 'week' ? 7 : 1;

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{dateLabel}</h1>
      <div className={styles.actions}>
        <div className={styles.viewToggle} role="group" aria-label="Timetable view">
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${view === 'day' ? styles.viewToggleBtnActive : ''}`}
            aria-pressed={view === 'day'}
            onClick={() => onViewChange('day')}
          >
            Day
          </button>
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${view === 'week' ? styles.viewToggleBtnActive : ''}`}
            aria-pressed={view === 'week'}
            onClick={() => onViewChange('week')}
          >
            Week
          </button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectedDateChange(addDays(selectedDate, -stepDays))}
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectedDateChange(todayKey())}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSelectedDateChange(addDays(selectedDate, stepDays))}
        >
          Next
        </Button>
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => onSelectedDateChange(e.target.value)}
          aria-label="Select date"
          className={styles.dateInput}
        />
      </div>
    </div>
  );
};
