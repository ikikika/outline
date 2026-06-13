import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { useAuthContext } from '@/app/providers/auth';
import {
  isValidTimetableVisibleRange,
  resolveTimetableVisibleRange,
  updateCurrentUserRequest,
  writeStoredTimetableVisibleRange,
} from '@/features/auth';
import styles from '../ProfilePage.module.scss';

const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === 'true';

export const ScheduleTab: React.FC = () => {
  const { user, setUser } = useAuthContext();
  const resolved = resolveTimetableVisibleRange(user);
  const [start, setStart] = useState(resolved.start);
  const [end, setEnd] = useState(resolved.end);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = resolveTimetableVisibleRange(user);
    setStart(next.start);
    setEnd(next.end);
  }, [user]);

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    if (!isValidTimetableVisibleRange(start, end)) {
      setError('End time must be after start time (HH:mm).');
      return;
    }

    setBusy(true);
    try {
      writeStoredTimetableVisibleRange({ start, end });
      if (!AUTH_DISABLED) {
        const updated = await updateCurrentUserRequest({
          timetableVisibleStart: start,
          timetableVisibleEnd: end,
        });
        setUser(updated);
      }
      setMessage('Timetable hours saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save timetable hours.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={styles.section}>
      <CardHeader>
        <CardTitle>Timetable hours</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={styles.value}>
          The day and week grids default to this range. You can still expand to all
          24 hours from the timetable toolbar.
        </p>

        <div className={styles.infoField}>
          <label className={styles.label} htmlFor="timetable-visible-start">
            Visible from
          </label>
          <Input
            id="timetable-visible-start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className={styles.infoField}>
          <label className={styles.label} htmlFor="timetable-visible-end">
            Visible until
          </label>
          <Input
            id="timetable-visible-end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            disabled={busy}
          />
        </div>

        {error ? <p className={styles.statusError}>{error}</p> : null}
        {message ? <p className={styles.statusOk}>{message}</p> : null}

        <Button type="button" onClick={() => void handleSave()} disabled={busy}>
          {busy ? 'Saving…' : 'Save hours'}
        </Button>
      </CardContent>
    </Card>
  );
};
