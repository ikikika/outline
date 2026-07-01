import React from 'react';
import { Button, Input } from '@/components/ui';
import { addDays, todayKey } from '@/features/activities';
import {
  TIMETABLE_ZOOM_MAX,
  TIMETABLE_ZOOM_MIN,
  TIMETABLE_ZOOM_STEP,
} from '../../hooks/useFitPxPerMinute/useFitPxPerMinute';
import styles from './TimetableHeader.module.scss';

export type TimetableView = 'day' | 'week';

interface TimetableHeaderProps {
  view: TimetableView;
  onViewChange: (view: TimetableView) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  dateLabel: string;
  showAllHours: boolean;
  onShowAllHoursChange: (showAllHours: boolean) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

function formatZoomLabel(zoom: number): string {
  const rounded = Math.round(zoom * 100) / 100;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : String(rounded)}×`;
}

export const TimetableHeader: React.FC<TimetableHeaderProps> = ({
  view,
  onViewChange,
  selectedDate,
  onSelectedDateChange,
  dateLabel,
  showAllHours,
  onShowAllHoursChange,
  zoom,
  onZoomChange,
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
        <button
          type="button"
          className={`${styles.hoursToggle} ${showAllHours ? styles.hoursToggleActive : ''}`}
          aria-pressed={showAllHours}
          onClick={() => onShowAllHoursChange(!showAllHours)}
        >
          {showAllHours ? 'Profile hours' : 'All hours'}
        </button>
        <label className={styles.zoomControl}>
          <span className={styles.zoomLabel}>Zoom</span>
          <input
            type="range"
            className={styles.zoomSlider}
            min={TIMETABLE_ZOOM_MIN}
            max={TIMETABLE_ZOOM_MAX}
            step={TIMETABLE_ZOOM_STEP}
            value={zoom}
            aria-valuetext={formatZoomLabel(zoom)}
            onChange={(e) => onZoomChange(Number(e.target.value))}
          />
          <span className={styles.zoomValue} aria-hidden="true">
            {formatZoomLabel(zoom)}
          </span>
        </label>
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
