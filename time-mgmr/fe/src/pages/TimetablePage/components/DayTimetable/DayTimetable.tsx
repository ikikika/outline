import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  minutesToTime,
  plannedDurationMinutes,
  snapMinutes,
  timeToMinutes,
  todayKey,
  type ITimetableBlock,
} from '@/features/activities';
import {
  assignOverlapColumns,
  computeColumnNextStart,
  overlapColumnStyle,
} from '../../utils/overlapLayout/overlapLayout';
import { getTaskBlockColor } from '../../utils/taskBlockColor/taskBlockColor';
import styles from './DayTimetable.module.scss';

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const PX_PER_MINUTE = 1.2;
const MIN_BLOCK_HEIGHT_PX = 16;
const COMPACT_BLOCK_HEIGHT_PX = 28;
const SNAP_MINUTES = 15;
/** Ignore pointer jitter below this before treating a gesture as a drag. */
const DRAG_THRESHOLD_PX = 8;
const NOW_TICK_MS = 30_000;

interface DayTimetableProps {
  date: string;
  blocks: ITimetableBlock[];
  onReschedule: (id: string, plannedStart: string, plannedEnd: string) => void;
  onSelect?: (block: ITimetableBlock) => void;
  disabled?: boolean;
  toolbar?: React.ReactNode;
}

interface DragState {
  id: string;
  mode: 'move' | 'resize-start' | 'resize-end';
  offsetY: number;
  previewStart: number;
  previewEnd: number;
  originStart: number;
  originEnd: number;
  originClientY: number;
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
  blocks,
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

  const visibleBlocks = useMemo(() => {
    return blocks.filter((a) => {
      const start = timeToMinutes(a.plannedStart);
      const end = timeToMinutes(a.plannedEnd);
      return end > dayStartMinutes && start < dayEndMinutes;
    });
  }, [blocks, dayStartMinutes, dayEndMinutes]);

  const earliestBlockTop = useMemo(() => {
    if (visibleBlocks.length === 0) return null;
    let earliestStart = Infinity;
    for (const activity of visibleBlocks) {
      earliestStart = Math.min(earliestStart, timeToMinutes(activity.plannedStart));
    }
    return (earliestStart - dayStartMinutes) * PX_PER_MINUTE;
  }, [visibleBlocks, dayStartMinutes]);

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

  const { overlapLayout, columnNextStart } = useMemo(() => {
    const intervals = visibleBlocks.map((activity) => {
      const isDragging = drag?.id === activity.id;
      const start =
        isDragging && drag ? drag.previewStart : timeToMinutes(activity.plannedStart);
      const end =
        isDragging && drag ? drag.previewEnd : timeToMinutes(activity.plannedEnd);
      return { id: activity.id, start, end };
    });
    const layout = assignOverlapColumns(intervals);
    return {
      overlapLayout: layout,
      columnNextStart: computeColumnNextStart(intervals, layout),
    };
  }, [visibleBlocks, drag]);

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
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const blockTop = (start - dayStartMinutes) * PX_PER_MINUTE;
    const offsetY = event.clientY - rect.top + track.scrollTop - blockTop;

    setDrag({
      id: activity.id,
      mode,
      offsetY,
      previewStart: start,
      previewEnd: end,
      originStart: start,
      originEnd: end,
      originClientY: event.clientY,
      pointerId: event.pointerId,
      moved: false,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;

    const distance = Math.abs(event.clientY - drag.originClientY);
    if (!drag.moved && distance < DRAG_THRESHOLD_PX) {
      return;
    }

    if (drag.mode === 'resize-start') {
      const nextStart = Math.max(
        dayStartMinutes,
        Math.min(
          drag.originEnd - SNAP_MINUTES,
          snapMinutes(
            drag.originStart + (event.clientY - drag.originClientY) / PX_PER_MINUTE,
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
            drag.originEnd + (event.clientY - drag.originClientY) / PX_PER_MINUTE,
            SNAP_MINUTES
          )
        )
      );
      setDrag({ ...drag, previewEnd: nextEnd, moved: true });
      return;
    }

    const duration = drag.originEnd - drag.originStart;
    const nextStart = clampStart(clientYToStartMinutes(event.clientY, drag.offsetY), duration);
    setDrag({
      ...drag,
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
    setDrag(null);

    if (!didDrag) {
      if (activity) onSelect?.(activity);
      return;
    }

    onReschedule(id, minutesToTime(nextStart), minutesToTime(nextEnd));
  };

  return (
    <section
      className={styles.timetable}
      style={{ ['--slot-height' as string]: `${60 * PX_PER_MINUTE}px` }}
      aria-label="Day timetable"
    >
      <div className={styles.header}>{toolbar}</div>

      {visibleBlocks.length === 0 ? (
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

            {visibleBlocks.map((activity) => {
              const baseStart = timeToMinutes(activity.plannedStart);
              const duration = plannedDurationMinutes(
                activity.plannedStart,
                activity.plannedEnd
              );
              const isDragging = drag?.id === activity.id;
              const start = isDragging && drag ? drag.previewStart : baseStart;
              const end = isDragging && drag ? drag.previewEnd : baseStart + duration;
              const top = (start - dayStartMinutes) * PX_PER_MINUTE;
              const nextStart = columnNextStart.get(activity.id) ?? Infinity;
              const gapToNextPx = (nextStart - start) * PX_PER_MINUTE;
              const height = Math.min(
                Math.max((end - start) * PX_PER_MINUTE, MIN_BLOCK_HEIGHT_PX),
                gapToNextPx
              );
              const isCompact = height < COMPACT_BLOCK_HEIGHT_PX;
              const placement = overlapLayout.get(activity.id) ?? {
                column: 0,
                columnCount: 1,
              };
              const { left, width } = overlapColumnStyle(placement);

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
        </div>
      </div>
    </section>
  );
};
