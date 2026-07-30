import unittest
from datetime import date, datetime, timezone

from schedule_tasks import (
    Scheduler,
    at_time,
    schedule_tasks,
)


EXPORTED_AT = datetime(2026, 7, 21, 0, 0, tzinfo=timezone.utc)


def focus_task(
    task_id: str, estimation_seconds: int, **extra: object
) -> dict[str, object]:
    return {
        "id": task_id,
        "activityId": "focus-activity",
        "title": task_id,
        "timeEstimationSeconds": estimation_seconds,
        "sortOrder": 0,
        **extra,
    }


class SchedulePomodoroBreaksTest(unittest.TestCase):
    def test_short_tasks_run_back_to_back_before_break(self) -> None:
        output = schedule_tasks(
            [
                focus_task("one", 400),
                focus_task("two", 400),
                focus_task("three", 400),
            ],
            start_date=date(2026, 7, 21),
            exported_at=EXPORTED_AT,
        )

        breaks = [
            block
            for block in output["scheduleBlocks"]
            if block["blockType"] != "focus"
        ]
        self.assertEqual(len(breaks), 1)
        self.assertEqual(breaks[0]["blockType"], "short_break")
        self.assertNotIn("taskId", breaks[0])
        focus_blocks = [
            block
            for block in output["scheduleBlocks"]
            if block["blockType"] == "focus"
        ]
        self.assertEqual(
            focus_blocks[0]["plannedEnd"], focus_blocks[1]["plannedStart"]
        )

    def test_every_fourth_break_is_long(self) -> None:
        output = schedule_tasks(
            [focus_task(f"focus-{index}", 1000) for index in range(4)],
            start_date=date(2026, 7, 21),
            exported_at=EXPORTED_AT,
        )
        breaks = [
            block
            for block in output["scheduleBlocks"]
            if block["blockType"] != "focus"
        ]

        self.assertEqual(
            [block["blockType"] for block in breaks],
            ["short_break", "short_break", "short_break", "long_break"],
        )

    def test_break_is_not_emitted_across_lunch(self) -> None:
        scheduler = Scheduler(date(2026, 7, 21))
        scheduler.cursor = at_time(date(2026, 7, 21), (11, 35))

        start, end, break_placement = scheduler.place(25 * 60)

        self.assertEqual(start, at_time(date(2026, 7, 21), (11, 35)))
        self.assertEqual(end, at_time(date(2026, 7, 21), (12, 0)))
        self.assertIsNone(break_placement)

    def test_rerun_of_canonical_output_keeps_all_ids_stable(self) -> None:
        original = [focus_task(f"focus-{index}", 1000) for index in range(2)]
        first = schedule_tasks(
            original, start_date=date(2026, 7, 21), exported_at=EXPORTED_AT
        )
        second = schedule_tasks(
            first, start_date=date(2026, 7, 21), exported_at=EXPORTED_AT
        )

        self.assertEqual(second, first)

    def test_long_task_stays_one_task_with_many_focus_blocks(self) -> None:
        output = schedule_tasks(
            [
                focus_task(
                    "long-video",
                    10560,
                    activityId="how-senior-devs-build-with-ai-2026-youtube",
                    title="Long Video",
                )
            ],
            start_date=date(2026, 7, 21),
            exported_at=EXPORTED_AT,
        )

        self.assertEqual(
            output["tasks"],
            [
                focus_task(
                    "long-video",
                    10560,
                    activityId="how-senior-devs-build-with-ai-2026-youtube",
                    title="Long Video",
                    status="planned",
                )
            ],
        )
        focus_blocks = [
            block
            for block in output["scheduleBlocks"]
            if block["blockType"] == "focus"
        ]
        self.assertEqual(len(focus_blocks), 11)
        self.assertEqual({block["taskId"] for block in focus_blocks}, {"long-video"})
        self.assertEqual(
            [block["id"] for block in focus_blocks],
            [f"task-long-video-focus-{index}" for index in range(1, 12)],
        )

    def test_legacy_split_rows_collapse_into_one_catalog_task(self) -> None:
        legacy = [
            focus_task(
                "video-p1",
                1000,
                activityId="how-senior-devs-build-with-ai-2026-youtube",
                title="Video (1/2)",
                plannedStart="2026-07-20T09:00:00.000Z",
                plannedEnd="2026-07-20T09:25:00.000Z",
            ),
            {
                "id": "pomodoro-break-old",
                "activityId": "pomodoro-breaks",
                "title": "Short Break",
                "plannedStart": "2026-07-20T09:25:00.000Z",
                "plannedEnd": "2026-07-20T09:30:00.000Z",
                "timeEstimationSeconds": 300,
            },
            focus_task(
                "video-p2",
                560,
                activityId="how-senior-devs-build-with-ai-2026-youtube",
                title="Video (2/2)",
                plannedStart="2026-07-20T09:30:00.000Z",
                plannedEnd="2026-07-20T09:44:00.000Z",
            ),
        ]

        output = schedule_tasks(
            legacy, start_date=date(2026, 7, 21), exported_at=EXPORTED_AT
        )

        self.assertEqual(len(output["tasks"]), 1)
        task = output["tasks"][0]
        self.assertEqual(task["id"], "video")
        self.assertEqual(task["title"], "Video")
        self.assertEqual(task["timeEstimationSeconds"], 1560)
        self.assertNotIn("plannedStart", task)
        self.assertNotIn("plannedEnd", task)

    def test_output_has_only_canonical_top_level_fields(self) -> None:
        output = schedule_tasks(
            {"version": 99, "tasks": [focus_task("one", 100)]},
            start_date=date(2026, 7, 21),
            exported_at=EXPORTED_AT,
        )

        self.assertEqual(
            list(output), ["version", "exportedAt", "tasks", "scheduleBlocks"]
        )
        self.assertEqual(output["version"], 1)
        self.assertEqual(output["exportedAt"], "2026-07-21T00:00:00.000Z")
        self.assertEqual(
            set(output["scheduleBlocks"][0]),
            {"id", "taskId", "blockType", "plannedStart", "plannedEnd"},
        )

    def test_rejects_payload_without_tasks(self) -> None:
        with self.assertRaisesRegex(ValueError, "top-level 'tasks' array"):
            schedule_tasks(
                {"version": 1},
                start_date=date(2026, 7, 21),
                exported_at=EXPORTED_AT,
            )


if __name__ == "__main__":
    unittest.main()
