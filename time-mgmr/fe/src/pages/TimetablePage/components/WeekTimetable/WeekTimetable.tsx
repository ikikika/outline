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
import {
  didReschedule,
  dragThresholdPx,
  LONG_PRESS_CANCEL_SLOP_PX,
  LONG_PRESS_MS,
  pointerNeedsLongPress,
} from '../../utils/blockDragGesture/blockDragGesture';
import {
  clampStartInDay,
  computeBlockGeometry,
  formatHourLabel,
  MIN_BLOCK_HEIGHT_WEEK_PX,
  previewResizeEnd,
  previewResizeStart,
  SNAP_MINUTES,
} from '../../utils/timetableGrid/timetableGrid';
import { useFitPxPerMinute } from '../../hooks/useFitPxPerMinute/useFitPxPerMinute';
import { useNowMinutes } from '../../hooks/useNowMinutes/useNowMinutes';
import { useTimetableScrollAnchor } from '../../hooks/useTimetableScrollAnchor/useTimetableScrollAnchor';
import { getTaskBlockColor } from '../../utils/taskBlockColor/taskBlockColor';
import { TimetableBlock } from '../shared/TimetableBlock/TimetableBlock';
import { TimetableNowLine } from '../shared/TimetableNowLine/TimetableNowLine';
import styles from './WeekTimetable.module.scss';

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
  pointerId: number;
  pointerType: string;
  /** False until mouse arms immediately or touch completes long-press. */
  armed: boolean;
  moved: boolean;
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
  const longPressTimerRef = useRef<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

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
  const nowMinutes = useNowMinutes(weekContainsToday);
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
        const isDragging = drag?.id === activity.id && drag.armed;
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

  const scrollAnchorTop =
    weekContainsToday && showNowLine ? nowTop : earliestBlockTop;

  useTimetableScrollAnchor({
    scrollRef,
    anchorKey: weekKey,
    anchorTop: scrollAnchorTop,
    center: Boolean(weekContainsToday && showNowLine),
    resetKey: `${dayStartMinutes}_${dayEndMinutes}`,
  });

  const clampStart = useCallback(
    (start: number, duration: number) =>
      clampStartInDay(start, duration, dayStartMinutes, dayEndMinutes),
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
    const track = dayTrackRefs.current.get(activity.date);
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const blockTop = (start - dayStartMinutes) * pxPerMinute;
    const offsetY = event.clientY - rect.top - blockTop;
    const needsLongPress = pointerNeedsLongPress(event.pointerType);
    const target = event.currentTarget;

    clearLongPressTimer();

    const baseDrag: DragState = {
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

    const distance = Math.hypot(
      event.clientX - drag.originClientX,
      event.clientY - drag.originClientY
    );

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
      setDrag({
        ...drag,
        previewStart: previewResizeStart({
          originStart: drag.originStart,
          originEnd: drag.originEnd,
          originClientY: drag.originClientY,
          clientY: event.clientY,
          pxPerMinute,
          dayStartMinutes,
        }),
        moved: true,
      });
      return;
    }

    if (drag.mode === 'resize-end') {
      setDrag({
        ...drag,
        previewEnd: previewResizeEnd({
          originStart: drag.originStart,
          originEnd: drag.originEnd,
          originClientY: drag.originClientY,
          clientY: event.clientY,
          pxPerMinute,
          dayEndMinutes,
        }),
        moved: true,
      });
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

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!drag) return;
    clearLongPressTimer();
    const id = drag.id;
    const activity = blocks.find((item) => item.id === id);
    const nextStart = drag.previewStart;
    const nextEnd = drag.previewEnd;
    const nextDate = drag.previewDate;
    const scheduleChanged =
      drag.armed &&
      drag.moved &&
      didReschedule(
        drag.originStart,
        drag.originEnd,
        nextStart,
        nextEnd,
        drag.originDate,
        nextDate
      );
    setDrag(null);

    if (!scheduleChanged) {
      if (activity) {
        // Suppress the synthetic mouse click that would hit the newly opened modal backdrop.
        event.preventDefault();
        onSelect?.(activity);
      }
      return;
    }

    onReschedule(id, minutesToTime(nextStart), minutesToTime(nextEnd), nextDate);
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
    setDrag(null);
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
                onPointerCancel={handlePointerCancel}
              >
                {hours.map((hour) => (
                  <div key={hour} className={styles.hourLine} />
                ))}

                {showNowLine && isTodayColumn ? (
                  <TimetableNowLine top={nowTop} density="week" />
                ) : null}

                {dayBlocks.map((activity) => {
                  const window = blockDisplayWindow(activity);
                  const baseStart = timeToMinutes(window.start);
                  const duration = plannedDurationMinutes(
                    window.start,
                    window.end
                  );
                  const isDragging = drag?.id === activity.id && drag.armed;
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
                  const nextStart = columnNextStart?.get(activity.id) ?? Infinity;
                  const { top, height, isCompact } = computeBlockGeometry({
                    start,
                    end,
                    dayStartMinutes,
                    pxPerMinute,
                    nextStart,
                    minHeightPx: MIN_BLOCK_HEIGHT_WEEK_PX,
                  });
                  const placement = layout?.get(activity.id) ?? {
                    column: 0,
                    columnCount: 1,
                  };
                  const { left, width } = overlapColumnStyle(placement, 2);
                  const startLabel = minutesToTime(start);
                  const endLabel = minutesToTime(end);

                  return (
                    <TimetableBlock
                      key={activity.id}
                      title={activity.title}
                      startLabel={startLabel}
                      endLabel={endLabel}
                      top={top}
                      height={height}
                      left={left}
                      width={width}
                      background={getTaskBlockColor(
                        activity.activityId,
                        activity.status,
                        activity.color
                      )}
                      isCompact={isCompact}
                      isLocked={activity.status === 'done'}
                      isDragging={Boolean(isDragging)}
                      density="week"
                      transform={
                        dragOffsetX ? `translateX(${dragOffsetX}px)` : undefined
                      }
                      onPointerDown={(e) => handlePointerDown(e, activity)}
                      onResizeStartPointerDown={(e) =>
                        handlePointerDown(e, activity, 'resize-start')
                      }
                      onResizeEndPointerDown={(e) =>
                        handlePointerDown(e, activity, 'resize-end')
                      }
                      onClick={
                        activity.status === 'done'
                          ? () => onSelect?.(activity)
                          : undefined
                      }
                      onKeyActivate={() => onSelect?.(activity)}
                    />
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
