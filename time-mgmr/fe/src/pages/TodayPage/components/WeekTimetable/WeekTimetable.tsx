import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatWeekdayShort,
  minutesToTime,
  plannedDurationMinutes,
  snapMinutes,
  timeToMinutes,
  todayKey,
  type ITask,
} from '@/features/activities';
import {
  assignOverlapColumns,
  overlapColumnStyle,
  visualOverlapEnd,
} from '../../utils/overlapLayout/overlapLayout';
import { getTaskBlockColor } from '../../utils/taskBlockColor/taskBlockColor';
import styles from './WeekTimetable.module.scss';

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const PX_PER_MINUTE = 1.2;
const MIN_BLOCK_HEIGHT_PX = 22;
const SNAP_MINUTES = 15;
/** Ignore pointer jitter below this before treating a gesture as a drag. */
const DRAG_THRESHOLD_PX = 8;
const NOW_TICK_MS = 30_000;

interface WeekTimetableProps {
  days: string[];
  activities: ITask[];
  selectedDate: string;
  onSelectDate?: (date: string) => void;
  onReschedule: (id: string, plannedStart: string, plannedEnd: string) => void;
  onSelect?: (activity: ITask) => void;
  disabled?: boolean;
  toolbar?: React.ReactNode;
}

interface DragState {
  id: string;
  date: string;
  duration: number;
  offsetY: number;
  previewStart: number;
  originStart: number;
  originClientY: number;
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

export const WeekTimetable: React.FC<WeekTimetableProps> = ({
  days,
  activities,
  selectedDate,
  onSelectDate,
  onReschedule,
  onSelect,
  disabled = false,
  toolbar,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayTrackRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrolledForWeekRef = useRef<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [nowMinutes, setNowMinutes] = useState(currentMinutesOfDay);

  const dayStartMinutes = DAY_START_HOUR * 60;
  const dayEndMinutes = DAY_END_HOUR * 60;
  const totalMinutes = dayEndMinutes - dayStartMinutes;
  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i),
    []
  );

  const today = todayKey();
  const weekContainsToday = days.includes(today);
  const weekKey = `${days[0]}_${days[days.length - 1] ?? days[0]}`;

  useEffect(() => {
    if (!weekContainsToday) return;
    setNowMinutes(currentMinutesOfDay());
    const id = window.setInterval(() => {
      setNowMinutes(currentMinutesOfDay());
    }, NOW_TICK_MS);
    return () => window.clearInterval(id);
  }, [weekContainsToday, weekKey]);

  const showNowLine =
    weekContainsToday && nowMinutes >= dayStartMinutes && nowMinutes <= dayEndMinutes;
  const nowTop = (nowMinutes - dayStartMinutes) * PX_PER_MINUTE;

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, ITask[]>();
    for (const day of days) map.set(day, []);
    for (const activity of activities) {
      const list = map.get(activity.date);
      if (!list) continue;
      const start = timeToMinutes(activity.plannedStart);
      const end = timeToMinutes(activity.plannedEnd);
      if (end > dayStartMinutes && start < dayEndMinutes) {
        list.push(activity);
      }
    }
    return map;
  }, [activities, days, dayStartMinutes, dayEndMinutes]);

  const layoutsByDate = useMemo(() => {
    const layouts = new Map<string, ReturnType<typeof assignOverlapColumns>>();
    for (const day of days) {
      const dayActivities = activitiesByDate.get(day) ?? [];
      const intervals = dayActivities.map((activity) => {
        const duration = plannedDurationMinutes(activity.plannedStart, activity.plannedEnd);
        const isDragging = drag?.id === activity.id;
        const start =
          isDragging && drag ? drag.previewStart : timeToMinutes(activity.plannedStart);
        return {
          id: activity.id,
          start,
          end: visualOverlapEnd(start, duration, MIN_BLOCK_HEIGHT_PX, PX_PER_MINUTE),
        };
      });
      layouts.set(day, assignOverlapColumns(intervals));
    }
    return layouts;
  }, [days, activitiesByDate, drag]);

  const earliestBlockTop = useMemo(() => {
    let earliestStart = Infinity;
    for (const day of days) {
      for (const activity of activitiesByDate.get(day) ?? []) {
        earliestStart = Math.min(earliestStart, timeToMinutes(activity.plannedStart));
      }
    }
    if (!Number.isFinite(earliestStart)) return null;
    return (earliestStart - dayStartMinutes) * PX_PER_MINUTE;
  }, [days, activitiesByDate, dayStartMinutes]);

  useEffect(() => {
    if (scrolledForWeekRef.current === weekKey) return;
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    let anchorTop: number | null = null;
    if (weekContainsToday && showNowLine) {
      anchorTop = nowTop;
    } else if (earliestBlockTop != null) {
      anchorTop = earliestBlockTop;
    } else {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const viewportHeight = scrollEl.clientHeight;
      if (viewportHeight <= 0) return;
      const maxScroll = Math.max(0, scrollEl.scrollHeight - viewportHeight);
      const nextScrollTop =
        weekContainsToday && showNowLine
          ? anchorTop! - viewportHeight / 2
          : Math.max(0, anchorTop! - 8);
      scrollEl.scrollTop = Math.max(0, Math.min(maxScroll, nextScrollTop));
      scrolledForWeekRef.current = weekKey;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [weekKey, weekContainsToday, showNowLine, nowTop, earliestBlockTop]);

  const clampStart = useCallback(
    (start: number, duration: number) => {
      const maxStart = dayEndMinutes - duration;
      return Math.max(dayStartMinutes, Math.min(maxStart, start));
    },
    [dayStartMinutes, dayEndMinutes]
  );

  const clientYToStartMinutes = useCallback(
    (clientY: number, offsetY: number, date: string) => {
      const track = dayTrackRefs.current.get(date);
      if (!track) return dayStartMinutes;
      const rect = track.getBoundingClientRect();
      const y = clientY - rect.top - offsetY;
      const raw = dayStartMinutes + y / PX_PER_MINUTE;
      return snapMinutes(raw, SNAP_MINUTES);
    },
    [dayStartMinutes]
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
    const track = dayTrackRefs.current.get(activity.date);
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const blockTop = (start - dayStartMinutes) * PX_PER_MINUTE;
    const offsetY = event.clientY - rect.top - blockTop;

    setDrag({
      id: activity.id,
      date: activity.date,
      duration,
      offsetY,
      previewStart: start,
      originStart: start,
      originClientY: event.clientY,
      moved: false,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;

    const distance = Math.abs(event.clientY - drag.originClientY);
    if (!drag.moved && distance < DRAG_THRESHOLD_PX) {
      return;
    }

    const nextStart = clampStart(
      clientYToStartMinutes(event.clientY, drag.offsetY, drag.date),
      drag.duration
    );
    setDrag({ ...drag, previewStart: nextStart, moved: true });
  };

  const handlePointerUp = () => {
    if (!drag) return;
    const id = drag.id;
    const activity = activities.find((item) => item.id === id);
    const didDrag = drag.moved;
    const nextStart = drag.previewStart;
    const duration = drag.duration;
    setDrag(null);

    if (!didDrag) {
      if (activity) onSelect?.(activity);
      return;
    }

    onReschedule(id, minutesToTime(nextStart), minutesToTime(nextStart + duration));
  };

  const setDayTrackRef = (date: string, node: HTMLDivElement | null) => {
    if (node) dayTrackRefs.current.set(date, node);
    else dayTrackRefs.current.delete(date);
  };

  return (
    <section
      className={styles.timetable}
      style={{ ['--slot-height' as string]: `${60 * PX_PER_MINUTE}px` }}
      aria-label="Week timetable"
    >
      <div className={styles.header}>{toolbar}</div>

      <div className={styles.scroll} ref={scrollRef}>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(4.5rem, 1fr))` }}
        >
          <div className={styles.corner} />
          {days.map((day) => (
            <button
              key={`head-${day}`}
              type="button"
              className={`${styles.dayHeader} ${day === selectedDate ? styles.dayHeaderActive : ''} ${day === today ? styles.dayHeaderToday : ''}`}
              onClick={() => onSelectDate?.(day)}
            >
              <span className={styles.dayHeaderLabel}>{formatWeekdayShort(day)}</span>
              <span className={styles.dayHeaderNum}>{Number(day.slice(-2))}</span>
            </button>
          ))}

          <div className={styles.hourColumn}>
            {hours.map((hour) => (
              <div key={hour} className={styles.hourLabel}>
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayActivities = activitiesByDate.get(day) ?? [];
            const layout = layoutsByDate.get(day);
            const isTodayColumn = day === today;

            return (
              <div
                key={day}
                ref={(node) => setDayTrackRef(day, node)}
                className={`${styles.track} ${day === selectedDate ? styles.trackSelected : ''}`}
                style={{ height: totalMinutes * PX_PER_MINUTE }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => setDrag(null)}
              >
                {hours.map((hour) => (
                  <div key={hour} className={styles.hourLine} />
                ))}

                {showNowLine && isTodayColumn ? (
                  <div className={styles.nowLine} style={{ top: nowTop }} aria-hidden="true">
                    <span className={styles.nowDot} />
                  </div>
                ) : null}

                {dayActivities.map((activity) => {
                  const baseStart = timeToMinutes(activity.plannedStart);
                  const duration = plannedDurationMinutes(
                    activity.plannedStart,
                    activity.plannedEnd
                  );
                  const isDragging = drag?.id === activity.id;
                  const start = isDragging && drag ? drag.previewStart : baseStart;
                  const top = (start - dayStartMinutes) * PX_PER_MINUTE;
                  const height = Math.max(duration * PX_PER_MINUTE, MIN_BLOCK_HEIGHT_PX);
                  const placement = layout?.get(activity.id) ?? { column: 0, columnCount: 1 };
                  const { left, width } = overlapColumnStyle(placement, 2);

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
            );
          })}
        </div>
      </div>
    </section>
  );
};
