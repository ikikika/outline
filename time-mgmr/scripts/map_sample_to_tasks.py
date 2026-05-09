#!/usr/bin/env python3
"""Map Udemy-style sample.json lectures into tempo tasks.json format.

Runs outside the frontend app. Example:

  python map_sample_to_tasks.py \\
    --input ../fe/public/sample.json \\
    --output ../fe/public/tasks.json \\
    --activity-id the-complete-agentic-ai-engineering-course
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_ACTIVITY_ID = "the-complete-agentic-ai-engineering-course"


def lecture_to_task(lecture: dict[str, Any], activity_id: str) -> dict[str, Any]:
    asset = lecture.get("asset") or {}
    time_estimation = asset.get("time_estimation", 0)
    try:
        time_estimation_seconds = int(time_estimation)
    except (TypeError, ValueError):
        time_estimation_seconds = 0

    return {
        "id": str(lecture["id"]),
        "activityId": activity_id,
        "title": str(lecture.get("title") or ""),
        "plannedStart": "",
        "plannedEnd": "",
        "timeEstimationSeconds": time_estimation_seconds,
    }


def map_sample_to_tasks(
    sample: dict[str, Any],
    *,
    activity_id: str,
) -> dict[str, Any]:
    results = sample.get("results")
    if not isinstance(results, list):
        raise ValueError("sample.json must contain a top-level 'results' array")

    tasks = [
        lecture_to_task(item, activity_id)
        for item in results
        if isinstance(item, dict) and item.get("_class") == "lecture"
    ]

    return {
        "version": 1,
        "exportedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "tasks": tasks,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert sample.json lectures into tasks.json entries."
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
        help="Path to write tasks.json",
    )
    parser.add_argument(
        "--activity-id",
        default=DEFAULT_ACTIVITY_ID,
        help=f"activityId for every task (default: {DEFAULT_ACTIVITY_ID})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    sample = json.loads(args.input.read_text(encoding="utf-8"))
    payload = map_sample_to_tasks(sample, activity_id=args.activity_id)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(payload['tasks'])} tasks to {args.output}")


if __name__ == "__main__":
    main()
