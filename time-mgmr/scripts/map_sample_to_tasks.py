#!/usr/bin/env python3
"""Map Udemy-style sample.json lectures into an activity catalog import JSON.

Output matches the import format used by files like
how-senior-devs-build-with-ai-2026-youtube.json:

  { "activity": { title, categoryId, notes, id }, "tasks": [{ title, timeEstimationSeconds }] }

Example:

  python map_sample_to_tasks.py \\
    --input sample.json \\
    --output the-complete-agentic-ai-engineering-course.json \\
    --activity-id the-complete-agentic-ai-engineering-course \\
    --activity-title "Master AI Agents in 30 days: build 8 real-world projects with OpenAI Agents SDK, CrewAI, LangGraph, AutoGen and MCP."
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


DEFAULT_ACTIVITY_ID = "the-complete-agentic-ai-engineering-course"
DEFAULT_CATEGORY_ID = "admin"


def lecture_to_task(lecture: dict[str, Any], index: int) -> dict[str, Any]:
    asset = lecture.get("asset") or {}
    time_estimation = asset.get("time_estimation", 0)
    try:
        time_estimation_seconds = int(time_estimation)
    except (TypeError, ValueError):
        time_estimation_seconds = 0

    title = str(lecture.get("title") or "").strip()
    object_index = lecture.get("object_index")
    try:
        n = int(object_index) if object_index is not None else index
    except (TypeError, ValueError):
        n = index

    return {
        "title": f"{n}. {title}" if title else str(n),
        "timeEstimationSeconds": time_estimation_seconds,
    }


def map_sample_to_tasks(
    sample: dict[str, Any],
    *,
    activity_id: str,
    activity_title: str,
    category_id: str = DEFAULT_CATEGORY_ID,
    notes: str = "",
) -> dict[str, Any]:
    results = sample.get("results")
    if not isinstance(results, list):
        raise ValueError("sample.json must contain a top-level 'results' array")

    tasks: list[dict[str, Any]] = []
    lecture_index = 0
    for item in results:
        if not isinstance(item, dict) or item.get("_class") != "lecture":
            continue
        lecture_index += 1
        tasks.append(lecture_to_task(item, lecture_index))

    return {
        "activity": {
            "title": activity_title,
            "categoryId": category_id,
            "notes": notes,
            "id": activity_id,
        },
        "tasks": tasks,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Convert sample.json lectures into an activity catalog import JSON "
            "(activity + tasks)."
        )
    )
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        required=True,
        help="Path to sample.json",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        required=True,
        help="Path to write the catalog import JSON",
    )
    parser.add_argument(
        "--activity-id",
        default=DEFAULT_ACTIVITY_ID,
        help=f"activity.id (default: {DEFAULT_ACTIVITY_ID})",
    )
    parser.add_argument(
        "--activity-title",
        required=True,
        help="activity.title for the imported catalog",
    )
    parser.add_argument(
        "--category-id",
        default=DEFAULT_CATEGORY_ID,
        help=f"activity.categoryId (default: {DEFAULT_CATEGORY_ID})",
    )
    parser.add_argument(
        "--notes",
        default="",
        help="activity.notes (default: empty string)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    sample = json.loads(args.input.read_text(encoding="utf-8"))
    payload = map_sample_to_tasks(
        sample,
        activity_id=args.activity_id,
        activity_title=args.activity_title,
        category_id=args.category_id,
        notes=args.notes,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(payload['tasks'])} tasks to {args.output}")


if __name__ == "__main__":
    main()
