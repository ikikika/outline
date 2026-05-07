import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  minutesToTime,
  plannedDurationMinutes,
  snapMinutes,
  timeToMinutes,
  todayKey,
  type ITask,
} from '@/features/activities';
import { assignOverlapColumns, overlapColumnStyle } from '../../utils/overlapLayout/overlapLayout';
import { getTaskBlockColor } from '../../utils/taskBlockColor/taskBlockColor';
import styles from './DayTimetable.module.scss';

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const PX_PER_MINUTE = 1.2;
const SNAP_MINUTES = 15;
const NOW_TICK_MS = 30_000;

interface DayTimetableProps {
  date: string;
  activities: ITask[];
  onReschedule: (id: string, plannedStart: string, plannedEnd: string) => void;
  onSelect?: (activity: ITask) => void;
  disabled?: boolean;
  toolbar?: React.ReactNode;
}

interface DragState {
  id: string;
  duration: number;
  offsetY: number;
  previewStart: number;
  originStart: number;
  pointerId: number;
  moved: boolean;
}

function formatHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const period = normalized >= 12 ? 'PM' : 'AM';
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display}:00 ${period}`;
}

function currentMinutesOfDay(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

export const DayTimetable: React.FC<DayTimetableProps> = ({
  date,
  activities,
  onReschedule,
  onSelect,
  disabled = false,
  toolbar,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const centeredForDateRef = useRef<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [nowMinutes, setNowMinutes] = useState(currentMinutesOfDay);

  const dayStartMinutes = DAY_START_HOUR * 60;
  const dayEndMinutes = DAY_END_HOUR * 60;
  const totalMinutes = dayEndMinutes - dayStartMinutes;
  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i),
    []
  );

  const isToday = date === todayKey();

  useEffect(() => {
    if (!isToday) return;
    setNowMinutes(currentMinutesOfDay());
    const id = window.setInterval(() => {
      setNowMinutes(currentMinutesOfDay());
    }, NOW_TICK_MS);
    return () => window.clearInterval(id);
  }, [isToday, date]);

  const showNowLine =
    isToday && nowMinutes >= dayStartMinutes && nowMinutes <= dayEndMinutes;
  const nowTop = (nowMinutes - dayStartMinutes) * PX_PER_MINUTE;

  const visibleActivities = useMemo(() => {
    return activities.filter((a) => {
      const start = timeToMinutes(a.plannedStart);
      const end = timeToMinutes(a.plannedEnd);
      return end > dayStartMinutes && start < dayEndMinutes;
    });
  }, [activities, dayStartMinutes, dayEndMinutes]);

  const earliestBlockTop = useMemo(() => {
    if (visibleActivities.length === 0) return null;
    let earliestStart = Infinity;
    for (const activity of visibleActivities) {
      earliestStart = Math.min(earliestStart, timeToMinutes(activity.plannedStart));
    }
    return (earliestStart - dayStartMinutes) * PX_PER_MINUTE;
  }, [visibleActivities, dayStartMinutes]);

  useEffect(() => {
    if (centeredForDateRef.current === date) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    let scrollTopTarget: number | null = null;
    if (isToday && showNowLine) {
      scrollTopTarget = nowTop; // centered below using viewport
    } else if (!isToday && earliestBlockTop != null) {
      scrollTopTarget = earliestBlockTop;
    } else {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const viewportHeight = scrollEl.clientHeight;
      if (viewportHeight <= 0) return;
      const maxScroll = Math.max(0, scrollEl.scrollHeight - viewportHeight);
      const nextScrollTop = isToday
        ? scrollTopTarget! - viewportHeight / 2
        : Math.max(0, scrollTopTarget! - 8);
      scrollEl.scrollTop = Math.max(0, Math.min(maxScroll, nextScrollTop));
      centeredForDateRef.current = date;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [date, isToday, showNowLine, nowTop, earliestBlockTop]);

  const overlapLayout = useMemo(() => {
    const intervals = visibleActivities.map((activity) => {
      const duration = plannedDurationMinutes(activity.plannedStart, activity.plannedEnd);
      const isDragging = drag?.id === activity.id;
      const start =
        isDragging && drag ? drag.previewStart : timeToMinutes(activity.plannedStart);
      return {
        id: activity.id,
        start,
        end: start + duration,
      };
    });
    return assignOverlapColumns(intervals);
  }, [visibleActivities, drag]);

  const clientYToStartMinutes = useCallback(
    (clientY: number, offsetY: number) => {
      const track = trackRef.current;
      if (!track) return dayStartMinutes;
      const rect = track.getBoundingClientRect();
      const y = clientY - rect.top - offsetY + track.scrollTop;
      const raw = dayStartMinutes + y / PX_PER_MINUTE;
      return snapMinutes(raw, SNAP_MINUTES);
    },
    [dayStartMinutes]
  );

  const clampStart = useCallback(
    (start: number, duration: number) => {
      const maxStart = dayEndMinutes - duration;
      return Math.max(dayStartMinutes, Math.min(maxStart, start));
    },
    [dayStartMinutes, dayEndMinutes]
  );

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    activity: ITask
  ) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const start = timeToMinutes(activity.plannedStart);
    const duration = plannedDurationMinutes(activity.plannedStart, activity.plannedEnd);
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const blockTop = (start - dayStartMinutes) * PX_PER_MINUTE;
    const offsetY = event.clientY - rect.top + track.scrollTop - blockTop;

    setDrag({
      id: activity.id,
      duration,
      offsetY,
      previewStart: start,
      originStart: start,
      pointerId: event.pointerId,
      moved: false,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const nextStart = clampStart(
      clientYToStartMinutes(event.clientY, drag.offsetY),
      drag.duration
    );
    const moved = drag.moved || Math.abs(nextStart - drag.originStart) > 0;
    setDrag({ ...drag, previewStart: nextStart, moved });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const nextStart = clampStart(
      clientYToStartMinutes(event.clientY, drag.offsetY),
      drag.duration
    );
    const id = drag.id;
    const wasClick = !drag.moved && nextStart === drag.originStart;
    const activity = activities.find((item) => item.id === id);
    setDrag(null);

    if (wasClick) {
      if (activity) onSelect?.(activity);
      return;
    }

    onReschedule(id, minutesToTime(nextStart), minutesToTime(nextStart + drag.duration));
  };

  return (
    <section
      className={styles.timetable}
      style={{ ['--slot-height' as string]: `${60 * PX_PER_MINUTE}px` }}
      aria-label="Day timetable"
    >
      <div className={styles.header}>{toolbar}</div>

      {visibleActivities.length === 0 ? (
        <p className={styles.empty}>No planned blocks for this day yet.</p>
      ) : null}

      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.grid}>
          <div>
            {hours.map((hour) => (
              <div key={hour} className={styles.hourLabel}>
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          <div
            ref={trackRef}
            className={styles.track}
            style={{ height: totalMinutes * PX_PER_MINUTE }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => setDrag(null)}
          >
            {hours.map((hour) => (
              <div key={hour} className={styles.hourLine} />
            ))}

            {showNowLine ? (
              <div
                className={styles.nowLine}
                style={{ top: nowTop }}
                aria-hidden="true"
              >
                <span className={styles.nowDot} />
              </div>
            ) : null}

            {visibleActivities.map((activity) => {
              const baseStart = timeToMinutes(activity.plannedStart);
              const duration = plannedDurationMinutes(
                activity.plannedStart,
                activity.plannedEnd
              );
              const isDragging = drag?.id === activity.id;
              const start = isDragging && drag ? drag.previewStart : baseStart;
              const top = (start - dayStartMinutes) * PX_PER_MINUTE;
              const height = Math.max(duration * PX_PER_MINUTE, 28);
              const placement = overlapLayout.get(activity.id) ?? {
                column: 0,
                columnCount: 1,
              };
              const { left, width } = overlapColumnStyle(placement);

              return (
                <div
                  key={activity.id}
                  className={`${styles.block} ${isDragging ? styles.blockDragging : ''}`}
                  style={{
                    top,
                    height,
                    left,
                    width,
                    background: activity.color ?? getTaskBlockColor(activity.activityId),
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${activity.title}, ${minutesToTime(start)} to ${minutesToTime(start + duration)}`}
                  onPointerDown={(e) => handlePointerDown(e, activity)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect?.(activity);
                    }
                  }}
                >
                  <p className={styles.blockTitle}>{activity.title}</p>
                  <p className={styles.blockMeta}>
                    {minutesToTime(start)}–{minutesToTime(start + duration)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
