import { useMemo } from 'react';
import {
  useActivitiesByDate,
  useActivitiesByRange,
  useTimeEntriesByRange,
} from '@/features/activities/hooks/useActivities';
import { weekDateKeys } from '@/features/activities/utils/dateUtils';
import { buildDayReport, buildRangeReport } from '../metrics';

export function useDayReport(date: string) {
  const activitiesQuery = useActivitiesByDate(date);
  const entriesQuery = useTimeEntriesByRange(date, date);

  const report = useMemo(() => {
    if (!activitiesQuery.data || !entriesQuery.data) return null;
    return buildDayReport(date, activitiesQuery.data, entriesQuery.data);
  }, [activitiesQuery.data, entriesQuery.data, date]);

  return {
    report,
    isLoading: activitiesQuery.isLoading || entriesQuery.isLoading,
    error: activitiesQuery.error ?? entriesQuery.error,
    activities: activitiesQuery.data ?? [],
    entries: entriesQuery.data ?? [],
  };
}

export function useWeekReport(anchorDate: string) {
  const days = useMemo(() => weekDateKeys(anchorDate), [anchorDate]);
  const from = days[0];
  const to = days[6];
  const activitiesQuery = useActivitiesByRange(from, to);
  const entriesQuery = useTimeEntriesByRange(from, to);

  const report = useMemo(() => {
    if (!activitiesQuery.data || !entriesQuery.data) return null;
    return buildRangeReport(from, to, activitiesQuery.data, entriesQuery.data, days);
  }, [activitiesQuery.data, entriesQuery.data, from, to, days]);

  return {
    report,
    days,
    from,
    to,
    isLoading: activitiesQuery.isLoading || entriesQuery.isLoading,
    error: activitiesQuery.error ?? entriesQuery.error,
  };
}
