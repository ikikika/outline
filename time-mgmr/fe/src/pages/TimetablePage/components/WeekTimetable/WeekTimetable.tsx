import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatWeekdayShort,
  minutesToTime,
  plannedDurationMinutes,
  snapMinutes,
  timeToMinutes,
  todayKey,
  type ITimetableBlock,
} from '@/features/activities';
import { hoursForDayBounds } from '@/features/auth';
import {
  assignOverlapColumns,
  computeColumnNextStart,
  overlapColumnStyle,
} from '../../utils/overlapLayout/overlapLayout';
import { blockDisplayWindow } from '../../utils/blockDisplayWindow/blockDisplayWindow';
import { useFitPxPerMinute } from '../../hooks/useFitPxPerMinute/useFitPxPerMinute';
import { getTaskBlockColor } from '../../utils/taskBlockColor/taskBlockColor';
import styles from './WeekTimetable.module.scss';

const MIN_BLOCK_HEIGHT_PX = 14;
const COMPACT_BLOCK_HEIGHT_PX = 28;
const SNAP_MINUTES = 15;
/** Ignore pointer jitter below this before treating a gesture as a drag. */
const DRAG_THRESHOLD_PX = 8;
const NOW_TICK_MS = 30_000;

interface WeekTimetableProps {
  days: string[];
  blocks: ITimetableBlock[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  /** When false, use fixed density and allow vertical scrolling (all-hours mode). */
  fitToWindow?: boolean;
  selectedDate: string;
  onSelectDate?: (date: string) => void;
  onReschedule: (
    id: string,
    plannedStart: string,
    plannedEnd: string,
    date?: string
  ) => void;
  onSelect?: (block: ITimetableBlock) => void;
  disabled?: boolean;
  toolbar?: React.ReactNode;
}

interface DragState {
  id: string;
  originDate: string;
  previewDate: string;
  mode: 'move' | 'resize-start' | 'resize-end';
  offsetY: number;
  previewStart: number;
  previewEnd: number;
  originStart: number;
  originEnd: number;
  originClientX: number;
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
  blocks,
  dayStartMinutes,
  dayEndMinutes,
  fitToWindow = true,
  selectedDate,
  onSelectDate,
  onReschedule,
  onSelect,
  disabled = false,
  toolbar,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekHeaderRef = useRef<HTMLDivElement>(null);
  const dayTrackRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrolledForWeekRef = useRef<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [nowMinutes, setNowMinutes] = useState(currentMinutesOfDay);

  const totalMinutes = Math.max(1, dayEndMinutes - dayStartMinutes);
  const pxPerMinute = useFitPxPerMinute(
    scrollRef,
    totalMinutes,
    weekHeaderRef,
    fitToWindow
  );
  const hours = useMemo(
    () => hoursForDayBounds(dayStartMinutes, dayEndMinutes),
    [dayStartMinutes, dayEndMinutes]
  );

  const today = todayKey();
  const weekContainsToday = days.includes(today);
  const weekKey = `${days[0]}_${days[days.length - 1] ?? days[0]}`;

  useEffect(() => {
    scrolledForWeekRef.current = null;
  }, [dayStartMinutes, dayEndMinutes]);

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
  const nowTop = (nowMinutes - dayStartMinutes) * pxPerMinute;

  const blocksByDate = useMemo(() => {
    const map = new Map<string, ITimetableBlock[]>();
    for (const day of days) map.set(day, []);
    for (const activity of blocks) {
      const window = blockDisplayWindow(activity);
      const list = map.get(window.date);
      if (!list) continue;
      const start = timeToMinutes(window.start);
      const end = timeToMinutes(window.end);
      if (end > dayStartMinutes && start < dayEndMinutes) {
        list.push(activity);
      }
    }
    return map;
  }, [blocks, days, dayStartMinutes, dayEndMinutes]);

  const { layoutsByDate, nextStartByDate } = useMemo(() => {
    const layouts = new Map<string, ReturnType<typeof assignOverlapColumns>>();
    const nextStarts = new Map<string, Map<string, number>>();
    for (const day of days) {
      const dayBlocks = blocksByDate.get(day) ?? [];
      const intervals = dayBlocks.map((activity) => {
        const isDragging = drag?.id === activity.id;
        const window = blockDisplayWindow(activity);
        const start =
          isDragging && drag ? drag.previewStart : timeToMinutes(window.start);
        const end =
          isDragging && drag ? drag.previewEnd : timeToMinutes(window.end);
        return { id: activity.id, start, end };
      });
      const layout = assignOverlapColumns(intervals);
      layouts.set(day, layout);
      nextStarts.set(day, computeColumnNextStart(intervals, layout));
    }
    return { layoutsByDate: layouts, nextStartByDate: nextStarts };
  }, [days, blocksByDate, drag]);

  const earliestBlockTop = useMemo(() => {
    let earliestStart = Infinity;
    for (const day of days) {
      for (const activity of blocksByDate.get(day) ?? []) {
        earliestStart = Math.min(
          earliestStart,
          timeToMinutes(blockDisplayWindow(activity).start)
        );
      }
    }
    if (!Number.isFinite(earliestStart)) return null;
    return (earliestStart - dayStartMinutes) * pxPerMinute;
  }, [days, blocksByDate, dayStartMinutes, pxPerMinute]);

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
      const raw = dayStartMinutes + y / pxPerMinute;
      return snapMinutes(raw, SNAP_MINUTES);
    },
    [dayStartMinutes, pxPerMinute]
  );

  const clientXToDate = useCallback(
    (clientX: number, fallbackDate: string) => {
      let nearestDate = fallbackDate;
      let nearestDistance = Infinity;

      for (const day of days) {
        const track = dayTrackRefs.current.get(day);
        if (!track) continue;
        const rect = track.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right) return day;

        const distance = Math.abs(clientX - (rect.left + rect.right) / 2);
        if (distance < nearestDistance) {
          nearestDate = day;
          nearestDistance = distance;
        }
      }

      return nearestDate;
    },
    [days]
  );

  const handlePointerDown = (
    event: React.PointerEvent<HTMLElement>,
    activity: ITimetableBlock,
    mode: DragState['mode'] = 'move'
  ) => {
    if (disabled || activity.status === 'done' || event.button !== 0) return;
    event.preventDefault();
    if (mode !== 'move') event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const start = timeToMinutes(activity.plannedStart);
    const end = timeToMinutes(activity.plannedEnd);
    const track = dayTrackRefs.current.get(activity.date);
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const blockTop = (start - dayStartMinutes) * pxPerMinute;
    const offsetY = event.clientY - rect.top - blockTop;

    setDrag({
      id: activity.id,
      originDate: activity.date,
      previewDate: activity.date,
      mode,
      offsetY,
      previewStart: start,
      previewEnd: end,
      originStart: start,
      originEnd: end,
      originClientX: event.clientX,
      originClientY: event.clientY,
      moved: false,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;

    const distance = Math.hypot(
      event.clientX - drag.originClientX,
      event.clientY - drag.originClientY
    );
    if (!drag.moved && distance < DRAG_THRESHOLD_PX) {
      return;
    }

    if (drag.mode === 'resize-start') {
      const nextStart = Math.max(
        dayStartMinutes,
        Math.min(
          drag.originEnd - SNAP_MINUTES,
          snapMinutes(
            drag.originStart + (event.clientY - drag.originClientY) / pxPerMinute,
            SNAP_MINUTES
          )
        )
      );
      setDrag({ ...drag, previewStart: nextStart, moved: true });
      return;
    }

    if (drag.mode === 'resize-end') {
      const nextEnd = Math.max(
        drag.originStart + SNAP_MINUTES,
        Math.min(
          dayEndMinutes,
          snapMinutes(
            drag.originEnd + (event.clientY - drag.originClientY) / pxPerMinute,
            SNAP_MINUTES
          )
        )
      );
      setDrag({ ...drag, previewEnd: nextEnd, moved: true });
      return;
    }

    const duration = drag.originEnd - drag.originStart;
    const previewDate = clientXToDate(event.clientX, drag.previewDate);
    const nextStart = clampStart(
      clientYToStartMinutes(event.clientY, drag.offsetY, previewDate),
      duration
    );
    setDrag({
      ...drag,
      previewDate,
      previewStart: nextStart,
      previewEnd: nextStart + duration,
      moved: true,
    });
  };

  const handlePointerUp = () => {
    if (!drag) return;
    const id = drag.id;
    const activity = blocks.find((item) => item.id === id);
    const didDrag = drag.moved;
    const nextStart = drag.previewStart;
    const nextEnd = drag.previewEnd;
    const nextDate = drag.previewDate;
    setDrag(null);

    if (!didDrag) {
      if (activity) onSelect?.(activity);
      return;
    }

    onReschedule(id, minutesToTime(nextStart), minutesToTime(nextEnd), nextDate);
  };

  const setDayTrackRef = (date: string, node: HTMLDivElement | null) => {
    if (node) dayTrackRefs.current.set(date, node);
    else dayTrackRefs.current.delete(date);
  };

  return (
    <section
      className={styles.timetable}
      style={{ ['--slot-height' as string]: `${60 * pxPerMinute}px` }}
      aria-label="Week timetable"
    >
      <div className={styles.header}>{toolbar}</div>

      <div className={styles.scroll} ref={scrollRef}>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(4.5rem, 1fr))` }}
        >
          <div className={styles.corner} ref={weekHeaderRef} />
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
            const dayBlocks = blocksByDate.get(day) ?? [];
            const layout = layoutsByDate.get(day);
            const columnNextStart = nextStartByDate.get(day);
            const isTodayColumn = day === today;

            return (
              <div
                key={day}
                ref={(node) => setDayTrackRef(day, node)}
                className={`${styles.track} ${day === selectedDate ? styles.trackSelected : ''}`}
                style={{ height: totalMinutes * pxPerMinute }}
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

                {dayBlocks.map((activity) => {
                  const window = blockDisplayWindow(activity);
                  const baseStart = timeToMinutes(window.start);
                  const duration = plannedDurationMinutes(
                    window.start,
                    window.end
                  );
                  const isDragging = drag?.id === activity.id;
                  const start = isDragging && drag ? drag.previewStart : baseStart;
                  const end = isDragging && drag ? drag.previewEnd : baseStart + duration;
                  const sourceTrack = dayTrackRefs.current.get(window.date);
                  const targetTrack =
                    isDragging && drag
                      ? dayTrackRefs.current.get(drag.previewDate)
                      : undefined;
                  const dragOffsetX =
                    sourceTrack && targetTrack
                      ? targetTrack.getBoundingClientRect().left -
                        sourceTrack.getBoundingClientRect().left
                      : 0;
                  const top = (start - dayStartMinutes) * pxPerMinute;
                  const nextStart = columnNextStart?.get(activity.id) ?? Infinity;
                  const gapToNextPx = (nextStart - start) * pxPerMinute;
                  const height = Math.min(
                    Math.max((end - start) * pxPerMinute, MIN_BLOCK_HEIGHT_PX),
                    gapToNextPx
                  );
                  const isCompact = height < COMPACT_BLOCK_HEIGHT_PX;
                  const placement = layout?.get(activity.id) ?? { column: 0, columnCount: 1 };
                  const { left, width } = overlapColumnStyle(placement, 2);

                  return (
                    <div
                      key={activity.id}
                      className={`${styles.block} ${
                        activity.status === 'done' ? styles.blockLocked : ''
                      } ${isCompact ? styles.blockCompact : ''} ${
                        isDragging ? styles.blockDragging : ''
                      }`}
                      style={{
                        top,
                        height,
                        left,
                        width,
                        background: getTaskBlockColor(
                          activity.activityId,
                          activity.status,
                          activity.color
                        ),
                        transform: dragOffsetX ? `translateX(${dragOffsetX}px)` : undefined,
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${activity.title}, ${minutesToTime(start)} to ${minutesToTime(end)}`}
                      onPointerDown={(e) => handlePointerDown(e, activity)}
                      onClick={
                        activity.status === 'done'
                          ? () => onSelect?.(activity)
                          : undefined
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect?.(activity);
                        }
                      }}
                    >
                      {!isCompact && activity.status !== 'done' ? (
                        <div
                          className={`${styles.resizeHandle} ${styles.resizeHandleTop}`}
                          aria-label={`Change start time for ${activity.title}`}
                          onPointerDown={(e) => handlePointerDown(e, activity, 'resize-start')}
                        />
                      ) : null}
                      <p className={styles.blockTitle}>{activity.title}</p>
                      <p className={styles.blockMeta}>
                        {minutesToTime(start)}–{minutesToTime(end)}
                      </p>
                      {!isCompact && activity.status !== 'done' ? (
                        <div
                          className={`${styles.resizeHandle} ${styles.resizeHandleBottom}`}
                          aria-label={`Change end time for ${activity.title}`}
                          onPointerDown={(e) => handlePointerDown(e, activity, 'resize-end')}
                        />
                      ) : null}
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
