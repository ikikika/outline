import unittest
from datetime import date

from schedule_tasks import (
    POMODORO_BREAK_ACTIVITY_ID,
    Scheduler,
    at_time,
    schedule_tasks,
)


def focus_task(task_id: str, estimation_seconds: int) -> dict[str, object]:
    return {
        "id": task_id,
        "activityId": "focus-activity",
        "title": task_id,
        "plannedStart": "",
        "plannedEnd": "",
        "timeEstimationSeconds": estimation_seconds,
        "sortOrder": 0,
    }


class SchedulePomodoroBreaksTest(unittest.TestCase):
    def test_short_tasks_run_back_to_back_before_break(self) -> None:
        scheduled = schedule_tasks(
            [
                focus_task("one", 400),
                focus_task("two", 400),
                focus_task("three", 400),
            ],
            start_date=date(2026, 7, 21),
        )

        breaks = [
            task
            for task in scheduled
            if task["activityId"] == POMODORO_BREAK_ACTIVITY_ID
        ]
        self.assertEqual(len(breaks), 1)
        self.assertEqual(breaks[0]["title"], "Short Break")
        self.assertEqual(breaks[0]["timeEstimationSeconds"], 300)
        self.assertEqual(scheduled[0]["plannedEnd"], scheduled[1]["plannedStart"])

    def test_every_fourth_break_is_long(self) -> None:
        scheduled = schedule_tasks(
            [focus_task(f"focus-{index}", 1000) for index in range(4)],
            start_date=date(2026, 7, 21),
        )
        breaks = [
            task
            for task in scheduled
            if task["activityId"] == POMODORO_BREAK_ACTIVITY_ID
        ]

        self.assertEqual(
            [task["timeEstimationSeconds"] for task in breaks],
            [300, 300, 300, 900],
        )

    def test_break_is_not_emitted_across_lunch(self) -> None:
        scheduler = Scheduler(date(2026, 7, 21))
        scheduler.cursor = at_time(date(2026, 7, 21), (11, 35))

        start, end, break_placement = scheduler.place(25 * 60)

        self.assertEqual(start, at_time(date(2026, 7, 21), (11, 35)))
        self.assertEqual(end, at_time(date(2026, 7, 21), (12, 0)))
        self.assertIsNone(break_placement)

    def test_rerun_replaces_generated_breaks_without_duplicates(self) -> None:
        original = [focus_task(f"focus-{index}", 1000) for index in range(2)]
        first = schedule_tasks(original, start_date=date(2026, 7, 21))
        second = schedule_tasks(first, start_date=date(2026, 7, 21))

        first_break_ids = [
            task["id"]
            for task in first
            if task["activityId"] == POMODORO_BREAK_ACTIVITY_ID
        ]
        second_break_ids = [
            task["id"]
            for task in second
            if task["activityId"] == POMODORO_BREAK_ACTIVITY_ID
        ]
        self.assertEqual(second_break_ids, first_break_ids)


if __name__ == "__main__":
    unittest.main()
