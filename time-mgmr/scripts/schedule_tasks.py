#!/usr/bin/env python3
"""Schedule task catalog entries into canonical tasks + scheduleBlocks JSON.

Rules:
  - Workdays only, daily window 09:00–17:00 (ISO timestamps with Z)
  - Lunch 12:00–13:00 (no scheduling)
  - Duration = timeEstimationSeconds × 1.5 (round half up)
  - Do not split a segment across lunch, breaks, or days
  - Oversized lectures (longer than one focus block and too long for a single
    work window, e.g. the YouTube lecture) use multiple focus schedule blocks
  - Pomodoro: ~25 min focus blocks; 5 min short break; every 4th focus → 15 min
  - Lunch resets the current focus accumulation; a new day resets the pomodoro count
  - Input may be a legacy timed-task array or the canonical object; output is
    always the canonical object
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
POMODORO_BREAK_ACTIVITY_ID = "pomodoro-breaks"
EXPORT_VERSION = 1

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

    def _place_pending_break(self) -> tuple[datetime, datetime] | None:
        if self.pending_break <= 0:
            return None

        break_start = self.cursor
        break_end = break_start + timedelta(seconds=self.pending_break)
        self.pending_break = 0

        # Lunch/end-of-day already provides a longer natural break.
        lunch_start = at_time(break_start.date(), LUNCH_START)
        lunch_end = at_time(break_start.date(), LUNCH_END)
        if lunch_start <= break_start < lunch_end:
            return None
        if break_end > slot_end(break_start):
            return None

        self.cursor = break_end
        return break_start, break_end

    def place(
        self, duration: int
    ) -> tuple[datetime, datetime, tuple[datetime, datetime] | None]:
        """Place a contiguous segment that must fit inside one work window."""
        while True:
            self._normalize_cursor()

            probe = self.cursor
            d = self.cursor.date()
            lunch_start = at_time(d, LUNCH_START)
            day_end = at_time(d, DAY_END)

            if lunch_start <= probe < at_time(d, LUNCH_END) or probe >= day_end:
                self.cursor = probe
                self._move_to_next_window()
                continue

            window_limit = slot_end(probe)
            end = probe + timedelta(seconds=duration)

            if end <= window_limit:
                start = probe
                self.cursor = end
                self.pending_break = 0
                self._complete_focus_if_needed(duration)
                return start, end, self._place_pending_break()

            # Does not fit in remaining window — move on, drop pending break
            self.cursor = window_limit
            self._move_to_next_window()


def catalog_task(task: dict[str, Any]) -> dict[str, Any]:
    """Return task metadata without legacy schedule fields."""
    result = {
        key: value
        for key, value in task.items()
        if key not in {"plannedStart", "plannedEnd"}
    }
    if result.get("status") in {None, "unplanned"}:
        result["status"] = "planned"
    return result


def make_break_block(placement: tuple[datetime, datetime]) -> dict[str, Any]:
    start, end = placement
    duration = int((end - start).total_seconds())
    timestamp_id = start.strftime("%Y%m%dT%H%M%S")
    return {
        "id": f"pomodoro-break-{timestamp_id}",
        "blockType": (
            "long_break" if duration == LONG_BREAK_SECONDS else "short_break"
        ),
        "plannedStart": format_iso(start),
        "plannedEnd": format_iso(end),
    }


def schedule_task(
    scheduler: Scheduler,
    task: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
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
        start, end, break_placement = scheduler.place(duration)
        updated = catalog_task(task)
        updated["id"] = task_id
        updated["title"] = title
        updated["timeEstimationSeconds"] = est
        blocks = [
            {
                "id": f"task-{task_id}",
                "taskId": task_id,
                "blockType": "focus",
                "plannedStart": format_iso(start),
                "plannedEnd": format_iso(end),
            }
        ]
        if break_placement:
            blocks.append(make_break_block(break_placement))
        return updated, blocks

    # Keep one catalog task while splitting its schedule at focus boundaries.
    remaining = duration
    placements: list[
        tuple[datetime, datetime, tuple[datetime, datetime] | None]
    ] = []

    while remaining > 0:
        room = FOCUS_TARGET_SECONDS - scheduler.focus_accumulated
        if room <= 0:
            room = FOCUS_TARGET_SECONDS
        chunk = min(remaining, room)
        start, end, break_placement = scheduler.place(chunk)
        placements.append((start, end, break_placement))
        remaining -= chunk

    updated = catalog_task(task)
    updated["id"] = task_id
    updated["title"] = title
    updated["timeEstimationSeconds"] = est
    blocks: list[dict[str, Any]] = []
    for index, (start, end, break_placement) in enumerate(placements, start=1):
        blocks.append(
            {
                "id": f"task-{task_id}-focus-{index}",
                "taskId": task_id,
                "blockType": "focus",
                "plannedStart": format_iso(start),
                "plannedEnd": format_iso(end),
            }
        )
        if break_placement:
            blocks.append(make_break_block(break_placement))
    return updated, blocks


def schedule_tasks(
    payload: list[dict[str, Any]] | dict[str, Any],
    *,
    start_date: date,
    exported_at: datetime | None = None,
) -> dict[str, Any]:
    raw_tasks = payload if isinstance(payload, list) else payload.get("tasks")
    if not isinstance(raw_tasks, list):
        raise ValueError(
            "tasks.json must be an array or contain a top-level 'tasks' array"
        )
    if not all(isinstance(task, dict) for task in raw_tasks):
        raise ValueError("Every task must be a JSON object")

    scheduler = Scheduler(start_date)
    tasks: list[dict[str, Any]] = []
    schedule_blocks: list[dict[str, Any]] = []
    focus_tasks = [
        task
        for task in raw_tasks
        if str(task.get("activityId") or "") != POMODORO_BREAK_ACTIVITY_ID
    ]
    for task in collapse_split_tasks(focus_tasks):
        catalog_entry, blocks = schedule_task(scheduler, task)
        tasks.append(catalog_entry)
        schedule_blocks.extend(blocks)
    return {
        "version": EXPORT_VERSION,
        "exportedAt": format_iso(exported_at or datetime.now(timezone.utc)),
        "tasks": tasks,
        "scheduleBlocks": schedule_blocks,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate canonical tasks + scheduleBlocks JSON"
    )
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=Path(__file__).resolve().parent / "tasks.json",
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
    try:
        output_payload = schedule_tasks(payload, start_date=start_date)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(output_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    tasks = output_payload["tasks"]
    blocks = output_payload["scheduleBlocks"]
    yt_blocks = [
        block for block in blocks if block.get("taskId") == "89ehfj9hfw"
    ]
    first = blocks[0]["plannedStart"] if blocks else "-"
    last = blocks[-1]["plannedEnd"] if blocks else "-"
    print(f"Wrote {len(tasks)} tasks and {len(blocks)} schedule blocks to {output_path}")
    print(f"Range: {first} → {last}")
    print(f"YouTube focus blocks: {len(yt_blocks)}")


if __name__ == "__main__":
    main()
