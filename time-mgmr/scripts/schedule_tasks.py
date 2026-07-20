#!/usr/bin/env python3
"""Schedule tasks.json lectures into plannedStart / plannedEnd.

Rules:
  - Workdays only, daily window 09:00–17:00 (ISO timestamps with Z)
  - Lunch 12:00–13:00 (no scheduling)
  - Duration = timeEstimationSeconds × 1.5 (round half up)
  - Do not split a segment across lunch, breaks, or days
  - Oversized lectures (longer than one focus block and too long for a single
    work window, e.g. the YouTube lecture) are split at focus boundaries
  - Pomodoro: ~25 min focus blocks; 5 min short break; every 4th focus → 15 min
  - Lunch resets the current focus accumulation; a new day resets the pomodoro count
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any


FOCUS_TARGET_SECONDS = 25 * 60
SHORT_BREAK_SECONDS = 5 * 60
LONG_BREAK_SECONDS = 15 * 60

DAY_START = (9, 0)
LUNCH_START = (12, 0)
LUNCH_END = (13, 0)
DAY_END = (17, 0)

# Afternoon is the longest contiguous window (13:00–17:00 = 4h)
MAX_WINDOW_SECONDS = 4 * 60 * 60

PART_ID_RE = re.compile(r"^(?P<base>.+)-p(?P<n>\d+)$")
PART_TITLE_RE = re.compile(r"^(?P<title>.*) \(\d+/\d+\)$")

# Explicitly split these, or any lecture that cannot fit in one work window.
SPLIT_ACTIVITY_IDS = frozenset(
    {
        "how-senior-devs-build-with-ai-2026-youtube",
    }
)


def round_half_up(value: float) -> int:
    return int(value + 0.5)


def lecture_duration_seconds(time_estimation_seconds: int) -> int:
    return round_half_up(time_estimation_seconds * 1.5)


def at_time(d: date, hour_minute: tuple[int, int]) -> datetime:
    hour, minute = hour_minute
    return datetime(d.year, d.month, d.day, hour, minute, 0, 0, tzinfo=timezone.utc)


def format_iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5  # Saturday=5, Sunday=6


def next_workday(d: date) -> date:
    nxt = d + timedelta(days=1)
    while is_weekend(nxt):
        nxt += timedelta(days=1)
    return nxt


def slot_end(cursor: datetime) -> datetime:
    """End of the current contiguous work window (lunch start or day end)."""
    d = cursor.date()
    lunch_start = at_time(d, LUNCH_START)
    if cursor < lunch_start:
        return lunch_start
    return at_time(d, DAY_END)


def strip_part_title(title: str) -> str:
    match = PART_TITLE_RE.match(title)
    return match.group("title") if match else title


def collapse_split_tasks(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Merge previously split `-pN` rows back into a single lecture for re-scheduling."""
    collapsed: list[dict[str, Any]] = []
    pending_base: str | None = None
    pending_parts: list[dict[str, Any]] = []

    def flush() -> None:
        nonlocal pending_base, pending_parts
        if not pending_parts:
            return
        base = dict(pending_parts[0])
        base["id"] = pending_base
        base["title"] = strip_part_title(str(base.get("title") or ""))
        base["timeEstimationSeconds"] = sum(
            int(p.get("timeEstimationSeconds") or 0) for p in pending_parts
        )
        base["plannedStart"] = ""
        base["plannedEnd"] = ""
        collapsed.append(base)
        pending_base = None
        pending_parts = []

    for task in tasks:
        task_id = str(task.get("id") or "")
        match = PART_ID_RE.match(task_id)
        if match:
            base_id = match.group("base")
            if pending_base is not None and base_id != pending_base:
                flush()
            pending_base = base_id
            pending_parts.append(task)
            continue
        flush()
        collapsed.append(task)

    flush()
    return collapsed


class Scheduler:
    def __init__(self, start_date: date):
        while is_weekend(start_date):
            start_date += timedelta(days=1)
        self.cursor = at_time(start_date, DAY_START)
        self.focus_accumulated = 0
        self.completed_focus_blocks = 0
        self.pending_break = 0

    def _reset_day(self, d: date) -> None:
        self.cursor = at_time(d, DAY_START)
        self.focus_accumulated = 0
        self.completed_focus_blocks = 0
        self.pending_break = 0

    def _move_to_next_window(self) -> None:
        """Advance cursor to the next schedulable window; apply lunch/day resets."""
        d = self.cursor.date()
        lunch_end = at_time(d, LUNCH_END)
        day_end = at_time(d, DAY_END)

        if self.cursor < at_time(d, LUNCH_START):
            self.cursor = lunch_end
            self.focus_accumulated = 0
            self.pending_break = 0
            return

        if lunch_end <= self.cursor < day_end:
            # Still inside afternoon but caller asked to move on → next day
            self._reset_day(next_workday(d))
            return

        # At/after lunch start without being in afternoon slot, or at/after day end
        if self.cursor < lunch_end:
            self.cursor = lunch_end
            self.focus_accumulated = 0
            self.pending_break = 0
            return

        self._reset_day(next_workday(d))

    def _normalize_cursor(self) -> None:
        """Snap cursor onto a valid work instant (no weekend/lunch/after-hours)."""
        while True:
            d = self.cursor.date()
            if is_weekend(d):
                self._reset_day(next_workday(d))
                continue

            day_start = at_time(d, DAY_START)
            lunch_start = at_time(d, LUNCH_START)
            lunch_end = at_time(d, LUNCH_END)
            day_end = at_time(d, DAY_END)

            if self.cursor < day_start:
                self.cursor = day_start
                continue
            if lunch_start <= self.cursor < lunch_end:
                self.cursor = lunch_end
                self.focus_accumulated = 0
                self.pending_break = 0
                continue
            if self.cursor >= day_end:
                self._reset_day(next_workday(d))
                continue
            break

    def _complete_focus_if_needed(self, duration: int) -> None:
        self.focus_accumulated += duration
        if self.focus_accumulated >= FOCUS_TARGET_SECONDS:
            self.completed_focus_blocks += 1
            self.focus_accumulated = 0
            if self.completed_focus_blocks % 4 == 0:
                self.pending_break = LONG_BREAK_SECONDS
            else:
                self.pending_break = SHORT_BREAK_SECONDS

    def place(self, duration: int) -> tuple[datetime, datetime]:
        """Place a contiguous segment that must fit inside one work window."""
        while True:
            self._normalize_cursor()

            candidate_start = self.cursor + timedelta(seconds=self.pending_break)
            probe = candidate_start
            d = self.cursor.date()
            lunch_start = at_time(d, LUNCH_START)
            day_end = at_time(d, DAY_END)

            if lunch_start <= probe < at_time(d, LUNCH_END) or probe >= day_end:
                self.cursor = probe
                self._move_to_next_window()
                continue

            # Break must not cross lunch boundary
            if self.cursor < lunch_start <= probe:
                self.cursor = lunch_start
                self._move_to_next_window()
                continue

            window_limit = slot_end(probe)
            end = probe + timedelta(seconds=duration)

            if end <= window_limit:
                start = probe
                self.cursor = end
                self.pending_break = 0
                self._complete_focus_if_needed(duration)
                return start, end

            # Does not fit in remaining window — move on, drop pending break
            self.cursor = window_limit
            self._move_to_next_window()


def estimation_for_chunk(chunk_seconds: int) -> int:
    """Inverse of duration = round_half_up(est * 1.5)."""
    return round_half_up(chunk_seconds / 1.5)


def schedule_task(
    scheduler: Scheduler,
    task: dict[str, Any],
) -> list[dict[str, Any]]:
    est = int(task.get("timeEstimationSeconds") or 0)
    duration = lecture_duration_seconds(est)
    title = strip_part_title(str(task.get("title") or ""))
    base_id = PART_ID_RE.match(str(task.get("id") or ""))
    task_id = base_id.group("base") if base_id else str(task.get("id") or "")

    activity_id = str(task.get("activityId") or "")
    should_split = (
        activity_id in SPLIT_ACTIVITY_IDS
        or duration > MAX_WINDOW_SECONDS
    ) and duration > FOCUS_TARGET_SECONDS

    # Normal lectures: never interrupt (may push the focus block past 25 min)
    if not should_split:
        start, end = scheduler.place(duration)
        updated = dict(task)
        updated["id"] = task_id
        updated["title"] = title
        updated["plannedStart"] = format_iso(start)
        updated["plannedEnd"] = format_iso(end)
        updated["timeEstimationSeconds"] = est
        return [updated]

    # Split long / oversized lectures at focus-block boundaries
    remaining = duration
    chunk_sizes: list[int] = []
    placements: list[tuple[datetime, datetime]] = []

    while remaining > 0:
        room = FOCUS_TARGET_SECONDS - scheduler.focus_accumulated
        if room <= 0:
            room = FOCUS_TARGET_SECONDS
        chunk = min(remaining, room)
        start, end = scheduler.place(chunk)
        chunk_sizes.append(chunk)
        placements.append((start, end))
        remaining -= chunk

    total_parts = len(placements)
    # Allocate estimations so they sum to the original
    estimations: list[int] = []
    allocated = 0
    for i, chunk in enumerate(chunk_sizes):
        if i == total_parts - 1:
            estimations.append(est - allocated)
        else:
            part_est = estimation_for_chunk(chunk)
            estimations.append(part_est)
            allocated += part_est

    parts: list[dict[str, Any]] = []
    for i, ((start, end), part_est) in enumerate(zip(placements, estimations), start=1):
        part = dict(task)
        part["id"] = f"{task_id}-p{i}"
        part["title"] = f"{title} ({i}/{total_parts})"
        part["plannedStart"] = format_iso(start)
        part["plannedEnd"] = format_iso(end)
        part["timeEstimationSeconds"] = part_est
        parts.append(part)
    return parts


def schedule_tasks(
    tasks: list[dict[str, Any]],
    *,
    start_date: date,
) -> list[dict[str, Any]]:
    scheduler = Scheduler(start_date)
    scheduled: list[dict[str, Any]] = []
    for task in collapse_split_tasks(tasks):
        scheduled.extend(schedule_task(scheduler, task))
    return scheduled


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fill plannedStart/plannedEnd on tasks.json")
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=Path(__file__).resolve().parent / "../fe/public/tasks.json",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=None,
        help="Defaults to --input (in-place)",
    )
    parser.add_argument(
        "--start-date",
        default="2026-07-21",
        help="First scheduling day (YYYY-MM-DD)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = args.input.resolve()
    output_path = (args.output or args.input).resolve()
    start_date = date.fromisoformat(args.start_date)

    payload = json.loads(input_path.read_text(encoding="utf-8"))
    tasks = payload.get("tasks")
    if not isinstance(tasks, list):
        raise SystemExit("tasks.json must contain a top-level 'tasks' array")

    scheduled = schedule_tasks(tasks, start_date=start_date)
    payload["tasks"] = scheduled
    payload["exportedAt"] = format_iso(datetime.now(timezone.utc))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    yt_parts = [t for t in scheduled if str(t.get("id", "")).startswith("89ehfj9hfw")]
    first = scheduled[0]["plannedStart"] if scheduled else "-"
    last = scheduled[-1]["plannedEnd"] if scheduled else "-"
    print(f"Wrote {len(scheduled)} tasks to {output_path}")
    print(f"Range: {first} → {last}")
    print(f"YouTube parts: {len(yt_parts)}")
    for part in yt_parts:
        print(f"  {part['plannedStart']} → {part['plannedEnd']}  {part['title'][-8:]}")


if __name__ == "__main__":
    main()
