import { useEffect, useState } from 'react';
import {
  currentMinutesOfDay,
  NOW_TICK_MS,
} from '../../utils/timetableGrid/timetableGrid';

/** Ticks current minutes-of-day while `enabled` is true. */
export function useNowMinutes(enabled: boolean): number {
  const [nowMinutes, setNowMinutes] = useState(currentMinutesOfDay);

  useEffect(() => {
    if (!enabled) return;
    setNowMinutes(currentMinutesOfDay());
    const id = window.setInterval(() => {
      setNowMinutes(currentMinutesOfDay());
    }, NOW_TICK_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  return nowMinutes;
}
