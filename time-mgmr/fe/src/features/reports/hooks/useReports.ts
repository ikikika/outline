import { useMemo } from 'react';
import {
  useTimetableBlocksByDate,
  useTimetableBlocksByRange,
  useTimeEntriesByRange,
} from '@/features/activities/hooks/useActivities';
import { weekDateKeys } from '@/features/activities/utils/dateUtils';
import { buildDayReport, buildRangeReport } from '../metrics';

export function useDayReport(date: string) {
  const blocksQuery = useTimetableBlocksByDate(date);
  const entriesQuery = useTimeEntriesByRange(date, date);

  const report = useMemo(() => {
    if (!blocksQuery.data || !entriesQuery.data) return null;
    return buildDayReport(date, blocksQuery.data, entriesQuery.data);
  }, [blocksQuery.data, entriesQuery.data, date]);

  return {
    report,
    isLoading: blocksQuery.isLoading || entriesQuery.isLoading,
    error: blocksQuery.error ?? entriesQuery.error,
    activities: blocksQuery.data ?? [],
    entries: entriesQuery.data ?? [],
  };
}

export function useWeekReport(anchorDate: string) {
  const days = useMemo(() => weekDateKeys(anchorDate), [anchorDate]);
  const from = days[0];
  const to = days[6];
  const blocksQuery = useTimetableBlocksByRange(from, to);
  const entriesQuery = useTimeEntriesByRange(from, to);

  const report = useMemo(() => {
    if (!blocksQuery.data || !entriesQuery.data) return null;
    return buildRangeReport(from, to, blocksQuery.data, entriesQuery.data, days);
  }, [blocksQuery.data, entriesQuery.data, from, to, days]);

  return {
    report,
    days,
    from,
    to,
    isLoading: blocksQuery.isLoading || entriesQuery.isLoading,
    error: blocksQuery.error ?? entriesQuery.error,
  };
}
