import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import {
  didReschedule,
  dragThresholdPx,
  LONG_PRESS_CANCEL_SLOP_PX,
  LONG_PRESS_MS,
  pointerNeedsLongPress,
} from '../../utils/blockDragGesture/blockDragGesture';
import { useFitPxPerMinute } from '../../hooks/useFitPxPerMinute/useFitPxPerMinute';
import { getTaskBlockColor } from '../../utils/taskBlockColor/taskBlockColor';
import styles from './DayTimetable.module.scss';

const MIN_BLOCK_HEIGHT_PX = 16;
const COMPACT_BLOCK_HEIGHT_PX = 28;
const SNAP_MINUTES = 15;
const NOW_TICK_MS = 30_000;

interface DayTimetableProps {
  date: string;
  blocks: ITimetableBlock[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  /** When false, use fixed density and allow vertical scrolling (all-hours mode). */
  fitToWindow?: boolean;
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
  pointerType: string;
  /** False until mouse arms immediately or touch completes long-press. */
  armed: boolean;
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
  dayStartMinutes,
  dayEndMinutes,
  fitToWindow = true,
  onReschedule,
  onSelect,
  disabled = false,
  toolbar,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const centeredForDateRef = useRef<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [nowMinutes, setNowMinutes] = useState(currentMinutesOfDay);

  const totalMinutes = Math.max(1, dayEndMinutes - dayStartMinutes);
  const pxPerMinute = useFitPxPerMinute(scrollRef, totalMinutes, undefined, fitToWindow);
  const hours = useMemo(
    () => hoursForDayBounds(dayStartMinutes, dayEndMinutes),
    [dayStartMinutes, dayEndMinutes]
  );

  const isToday = date === todayKey();

  useEffect(() => {
    centeredForDateRef.current = null;
  }, [dayStartMinutes, dayEndMinutes]);

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
  const nowTop = (nowMinutes - dayStartMinutes) * pxPerMinute;

  const visibleBlocks = useMemo(() => {
    return blocks.filter((a) => {
      const window = blockDisplayWindow(a);
      const start = timeToMinutes(window.start);
      const end = timeToMinutes(window.end);
      return end > dayStartMinutes && start < dayEndMinutes;
    });
  }, [blocks, dayStartMinutes, dayEndMinutes]);

  const earliestBlockTop = useMemo(() => {
    if (visibleBlocks.length === 0) return null;
    let earliestStart = Infinity;
    for (const activity of visibleBlocks) {
      earliestStart = Math.min(
        earliestStart,
        timeToMinutes(blockDisplayWindow(activity).start)
      );
    }
    return (earliestStart - dayStartMinutes) * pxPerMinute;
  }, [visibleBlocks, dayStartMinutes, pxPerMinute]);

  useEffect(() => {
    if (centeredForDateRef.current === date) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    let scrollTopTarget: number | null = null;
    if (isToday && showNowLine) {
      scrollTopTarget = nowTop;
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
      const isDragging = drag?.id === activity.id && drag.armed;
      const window = blockDisplayWindow(activity);
      const start =
        isDragging && drag ? drag.previewStart : timeToMinutes(window.start);
      const end =
        isDragging && drag ? drag.previewEnd : timeToMinutes(window.end);
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
      const raw = dayStartMinutes + y / pxPerMinute;
      return snapMinutes(raw, SNAP_MINUTES);
    },
    [dayStartMinutes, pxPerMinute]
  );

  const clampStart = useCallback(
    (start: number, duration: number) => {
      const maxStart = dayEndMinutes - duration;
      return Math.max(dayStartMinutes, Math.min(maxStart, start));
    },
    [dayStartMinutes, dayEndMinutes]
  );

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => {
      setDrag((current) => {
        if (!current || current.armed) return current;
        clearLongPressTimer();
        return null;
      });
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [clearLongPressTimer]);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLElement>,
    activity: ITimetableBlock,
    mode: DragState['mode'] = 'move'
  ) => {
    if (disabled || activity.status === 'done' || event.button !== 0) return;
    if (mode !== 'move') event.stopPropagation();

    const start = timeToMinutes(activity.plannedStart);
    const end = timeToMinutes(activity.plannedEnd);
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const blockTop = (start - dayStartMinutes) * pxPerMinute;
    const offsetY = event.clientY - rect.top + track.scrollTop - blockTop;
    const needsLongPress = pointerNeedsLongPress(event.pointerType);
    const target = event.currentTarget;

    clearLongPressTimer();

    const baseDrag: DragState = {
      id: activity.id,
      mode,
      offsetY,
      previewStart: start,
      previewEnd: end,
      originStart: start,
      originEnd: end,
      originClientY: event.clientY,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      armed: !needsLongPress,
      moved: false,
    };

    if (!needsLongPress) {
      event.preventDefault();
      target.setPointerCapture(event.pointerId);
      setDrag(baseDrag);
      return;
    }

    setDrag(baseDrag);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        /* pointer may already be up */
      }
      setDrag((current) =>
        current && current.pointerId === event.pointerId
          ? { ...current, armed: true }
          : current
      );
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;

    const distance = Math.abs(event.clientY - drag.originClientY);

    if (!drag.armed) {
      if (distance > LONG_PRESS_CANCEL_SLOP_PX) {
        clearLongPressTimer();
        setDrag(null);
      }
      return;
    }

    const threshold = dragThresholdPx(drag.pointerType);
    if (!drag.moved && distance < threshold) {
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
    clearLongPressTimer();
    const id = drag.id;
    const activity = blocks.find((item) => item.id === id);
    const nextStart = drag.previewStart;
    const nextEnd = drag.previewEnd;
    const scheduleChanged =
      drag.armed &&
      drag.moved &&
      didReschedule(drag.originStart, drag.originEnd, nextStart, nextEnd);
    setDrag(null);

    if (!scheduleChanged) {
      if (activity) onSelect?.(activity);
      return;
    }

    onReschedule(id, minutesToTime(nextStart), minutesToTime(nextEnd));
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    setDrag(null);
  };

  return (
    <section
      className={styles.timetable}
      style={{ ['--slot-height' as string]: `${60 * pxPerMinute}px` }}
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
            style={{ height: totalMinutes * pxPerMinute }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
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
              const window = blockDisplayWindow(activity);
              const baseStart = timeToMinutes(window.start);
              const duration = plannedDurationMinutes(
                window.start,
                window.end
              );
              const isDragging = drag?.id === activity.id && drag.armed;
              const start = isDragging && drag ? drag.previewStart : baseStart;
              const end = isDragging && drag ? drag.previewEnd : baseStart + duration;
              const top = (start - dayStartMinutes) * pxPerMinute;
              const nextStart = columnNextStart.get(activity.id) ?? Infinity;
              const gapToNextPx = (nextStart - start) * pxPerMinute;
              const height = Math.min(
                Math.max((end - start) * pxPerMinute, MIN_BLOCK_HEIGHT_PX),
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
