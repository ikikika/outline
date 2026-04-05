"""Orchestrate Directus import jobs against prepared target directories."""

from __future__ import annotations

import json
import logging
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TextIO

from sqlalchemy.orm import Session

from app.core.secrets import decrypt_secret
from app.models.project import DirectusTarget, MigrationRun
from app.services.directus import resolve_directus_base_url
from app.services.directus_import import (
    DirectusImportCancelled,
    DirectusImportError,
    import_lock,
    run_import,
)
from app.services.uploads import project_upload_dir

logger = logging.getLogger(__name__)

VALID_PHASES = frozenset({"schema", "data", "files", "flows"})
ACTIVE_STATUSES = frozenset({"pending", "running", "stopping"})
_LOG_MAX_CHARS = 200_000
_LOG_FLUSH_INTERVAL_S = 0.4

_cancel_events: dict[int, threading.Event] = {}
_cancel_lock = threading.Lock()


def prepared_dir(project_id: int, target_id: int) -> Path:
    return project_upload_dir(project_id) / "prepared" / f"target_{target_id}"


def inspect_prepared(project_id: int, target_id: int) -> dict[str, Any]:
    """Summarize what already exists under prepared/target_{id}/."""
    root = prepared_dir(project_id, target_id)
    schema_dir = root / "schema"
    data_dir = root / "data"
    flows_dir = root / "flows"
    has_files = (root / "files_metadata.json").is_file() or (root / "files").is_dir()

    data_files: list[str] = []
    data_rows = 0
    if data_dir.is_dir():
        for path in sorted(data_dir.glob("*.json")):
            if path.name.startswith("_"):
                continue
            data_files.append(path.name)
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if isinstance(payload, list):
                data_rows += len(payload)
            elif isinstance(payload, dict):
                data_rows += 1

    schema_files = 0
    if schema_dir.is_dir():
        schema_files = sum(
            1 for p in schema_dir.glob("*.json") if not p.name.startswith("_")
        )

    return {
        "path": f"uploads/project_{project_id}/prepared/target_{target_id}/",
        "exists": root.is_dir(),
        "has_schema": schema_dir.is_dir() and schema_files > 0,
        "has_data": len(data_files) > 0,
        "has_files": has_files,
        "has_flows": flows_dir.is_dir(),
        "schema_files": schema_files,
        "data_files": len(data_files),
        "data_file_names": data_files[:200],
        "collections": len(data_files),
        "rows": data_rows,
    }


def encode_phases(
    *,
    schema: bool = True,
    data: bool = True,
    files: bool = True,
    flows: bool = True,
) -> str:
    parts = []
    if schema:
        parts.append("schema")
    if data:
        parts.append("data")
    if files:
        parts.append("files")
    if flows:
        parts.append("flows")
    return ",".join(parts) if parts else ""


def parse_phases(phases: str) -> dict[str, bool]:
    selected = {p.strip() for p in (phases or "").split(",") if p.strip()}
    unknown = selected - VALID_PHASES
    if unknown:
        raise ValueError(f"Unknown phases: {', '.join(sorted(unknown))}")
    return {name: name in selected for name in ("schema", "data", "files", "flows")}


def validate_prepared(path: Path) -> None:
    if not path.is_dir():
        raise FileNotFoundError(
            f"Prepared directory not found: {path.as_posix()}"
        )
    # Accept either full export layout or files-only (assets step).
    has_schema = (path / "schema").is_dir()
    has_data = (path / "data").is_dir()
    has_files = (path / "files_metadata.json").is_file() or (path / "files").is_dir()
    has_flows = (path / "flows").is_dir()
    if not any((has_schema, has_data, has_files, has_flows)):
        raise FileNotFoundError(
            "Prepared directory is empty — expected schema/, data/, files/, or flows/"
        )


def register_cancel(run_id: int) -> threading.Event:
    event = threading.Event()
    with _cancel_lock:
        _cancel_events[run_id] = event
    return event


def clear_cancel(run_id: int) -> None:
    with _cancel_lock:
        _cancel_events.pop(run_id, None)


def has_active_worker(run_id: int) -> bool:
    """True while a migrate thread still holds a cancel event for this run."""
    with _cancel_lock:
        return run_id in _cancel_events


def request_migrate_stop(run_id: int) -> bool:
    """Signal a running migrate job to stop after the current row."""
    with _cancel_lock:
        event = _cancel_events.get(run_id)
        if event is None:
            return False
        event.set()
        return True


def is_cancel_requested(run_id: int) -> bool:
    with _cancel_lock:
        event = _cancel_events.get(run_id)
        return bool(event and event.is_set())


def reclaim_orphaned_run(run: MigrationRun) -> bool:
    """
    If this run looks active but has no live worker (API restart, crashed thread),
    mark it stopped so the UI can resume/restart.
    """
    if run.status not in ACTIVE_STATUSES:
        return False
    if has_active_worker(run.id):
        return False
    run.status = "stopped"
    run.error_detail = None
    if run.finished_at is None:
        run.finished_at = datetime.now(timezone.utc)
    return True


def reclaim_orphaned_migrate_runs(db: Session) -> int:
    """Mark all orphaned active migration runs as stopped. Returns count updated."""
    orphans = (
        db.query(MigrationRun)
        .filter(MigrationRun.status.in_(tuple(ACTIVE_STATUSES)))
        .all()
    )
    count = 0
    for run in orphans:
        if reclaim_orphaned_run(run):
            count += 1
    if count:
        db.commit()
        logger.info("Reclaimed %s orphaned migration run(s) as stopped", count)
    return count


def _data_block_from_summary(run: MigrationRun) -> dict[str, Any] | None:
    """Return the per-collection data summary dict from a run, if present."""
    if not run.summary_json:
        return None
    try:
        summary = json.loads(run.summary_json)
    except json.JSONDecodeError:
        return None
    if not isinstance(summary, dict):
        return None
    data = summary.get("data")
    if isinstance(data, dict):
        return data
    # Flat summary (data-only) may store collection keys at the top level.
    if any(
        isinstance(v, dict) and ("success" in v or "failed" in v)
        for k, v in summary.items()
        if k not in ("schema", "files", "flows", "_deferred_fks")
    ):
        return summary
    return None


def failed_data_files_from_run(run: MigrationRun) -> list[str]:
    """
    Data JSON filenames that finished with row failures.

    Prefer progress.failed_files; fall back to summary collections with failed > 0
    (covers older runs that still marked those files completed).
    """
    names: list[str] = []
    if run.progress_json:
        try:
            progress = json.loads(run.progress_json)
        except json.JSONDecodeError:
            progress = None
        if isinstance(progress, dict):
            listed = progress.get("failed_files") or []
            if isinstance(listed, list):
                names = [
                    str(f)
                    for f in listed
                    if isinstance(f, str) and f.endswith(".json")
                ]
    if names:
        return names

    data = _data_block_from_summary(run)
    if not data:
        return []
    out: list[str] = []
    for key, val in data.items():
        if key == "_deferred_fks" or not isinstance(val, dict):
            continue
        if int(val.get("failed") or 0) > 0:
            out.append(f"{key}.json" if not key.endswith(".json") else key)
    return out


def _progress_failed_count(run: MigrationRun) -> int:
    if not run.progress_json:
        return 0
    try:
        progress = json.loads(run.progress_json)
    except json.JSONDecodeError:
        return 0
    if not isinstance(progress, dict):
        return 0
    try:
        return int(progress.get("failed") or 0)
    except (TypeError, ValueError):
        return 0


def _log_has_import_failures(run: MigrationRun) -> bool:
    text = run.log_text or ""
    if not text:
        return False
    for line in text.splitlines():
        lower = line.lower()
        if "❌ 0 failed" in lower or "❌ 0 " in lower:
            continue
        if (
            "failed to import" in lower
            or "failed to upsert" in lower
            or "migration failed" in lower
            or "⚠️ failed" in lower
            or ("❌" in line and "failed" in lower)
        ):
            return True
    return False


def run_has_data_failures(run: MigrationRun) -> bool:
    """True when the run recorded row failures (progress, summary, or log)."""
    if failed_data_files_from_run(run):
        return True
    if _progress_failed_count(run) > 0:
        return True
    data = _data_block_from_summary(run)
    if data:
        for key, val in data.items():
            if key == "_deferred_fks" or not isinstance(val, dict):
                continue
            if int(val.get("failed") or 0) > 0:
                return True
    return _log_has_import_failures(run)


def completed_data_files_from_run(run: MigrationRun) -> list[str]:
    """
    Extract completed data/*.json filenames from a prior run's progress.

    Files with row failures are excluded so resume can retry-upsert them.
    When failures are known but not attributable to specific files, returns []
    so resume re-upserts everything (safe with upsert-by-PK).
    """
    if not run.progress_json:
        return []
    try:
        progress = json.loads(run.progress_json)
    except json.JSONDecodeError:
        return []
    if not isinstance(progress, dict):
        return []
    files = progress.get("completed_files") or []
    if not isinstance(files, list):
        return []
    failed = set(failed_data_files_from_run(run))
    if not failed and run_has_data_failures(run):
        # Failures recorded but files unknown — do not skip any collection.
        return []
    return [
        str(f)
        for f in files
        if isinstance(f, str) and f.endswith(".json") and f not in failed
    ]


def find_resume_checkpoint(
    db: Session,
    target_id: int,
    *,
    phases: str,
) -> tuple[MigrationRun | None, list[str]]:
    """
    Latest stopped/failed (or completed-with-row-failures) run that can be resumed.

    Returns the prior run even when completed_files is empty (stopped mid-first
    file) so callers can still continue the job.
    """
    candidates = (
        db.query(MigrationRun)
        .filter(
            MigrationRun.target_id == target_id,
            MigrationRun.phases == phases,
            MigrationRun.status.in_(("stopped", "failed", "completed")),
        )
        .order_by(MigrationRun.id.desc())
        .limit(20)
        .all()
    )
    for prior in candidates:
        has_failures = run_has_data_failures(prior)
        # Fully successful completed runs are not resume targets.
        if prior.status == "completed" and not has_failures:
            continue
        # Prefer a run that has data-phase progress (or any stopped data job).
        completed = completed_data_files_from_run(prior)
        failed_files = failed_data_files_from_run(prior)
        if completed or failed_files or has_failures:
            return prior, completed
        if prior.progress_json:
            try:
                progress = json.loads(prior.progress_json)
            except json.JSONDecodeError:
                progress = None
            if isinstance(progress, dict) and progress.get("phase") in (
                "data",
                "stopped",
                "queued",
                "starting",
                "data_done",
                "done",
            ):
                return prior, completed
        # Data-only phases with no progress still count as resumable.
        if phases == "data" or "data" in {p.strip() for p in phases.split(",")}:
            return prior, completed
    return None, []


def _write_progress(run_id: int, progress: dict[str, Any]) -> None:
    """Persist a progress checkpoint with a short-lived DB session."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        run = db.get(MigrationRun, run_id)
        if run is None:
            return
        # Preserve mode from prior progress when emitters omit it.
        prior_mode = None
        if run.progress_json:
            try:
                prior = json.loads(run.progress_json)
                if isinstance(prior, dict):
                    prior_mode = prior.get("mode")
            except json.JSONDecodeError:
                prior_mode = None
        payload = dict(progress)
        if prior_mode and "mode" not in payload:
            payload["mode"] = prior_mode
        run.progress_json = json.dumps(payload, default=str)[:50_000]
        db.commit()
    except Exception:  # noqa: BLE001 — never fail the import on progress I/O
        logger.exception("Failed to persist progress for run %s", run_id)
        db.rollback()
    finally:
        db.close()


def _write_log(run_id: int, text: str) -> None:
    """Persist captured terminal output."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        run = db.get(MigrationRun, run_id)
        if run is None:
            return
        run.log_text = text[-_LOG_MAX_CHARS:] if text else None
        db.commit()
    except Exception:  # noqa: BLE001 — never fail the import on log I/O
        logger.exception("Failed to persist log for run %s", run_id)
        db.rollback()
    finally:
        db.close()


class _TerminalCapture:
    """Tee stdout/stderr into a buffer persisted on the migration run."""

    def __init__(self, run_id: int, mirror: TextIO):
        self.run_id = run_id
        self._mirror = mirror
        self._chunks: list[str] = []
        self._chars = 0
        self._lock = threading.Lock()
        self._dirty = False
        self._last_flush = 0.0

    def write(self, data: str) -> int:
        if not isinstance(data, str):
            data = str(data)
        try:
            self._mirror.write(data)
        except Exception:  # noqa: BLE001
            pass
        if not data:
            return 0
        with self._lock:
            self._chunks.append(data)
            self._chars += len(data)
            if self._chars > _LOG_MAX_CHARS * 2:
                text = "".join(self._chunks)[-_LOG_MAX_CHARS:]
                self._chunks = [text]
                self._chars = len(text)
            self._dirty = True
        now = time.monotonic()
        if now - self._last_flush >= _LOG_FLUSH_INTERVAL_S:
            self.flush_to_db()
        return len(data)

    def flush(self) -> None:
        try:
            self._mirror.flush()
        except Exception:  # noqa: BLE001
            pass

    def isatty(self) -> bool:
        return False

    def fileno(self) -> int:
        return self._mirror.fileno()

    def text(self) -> str:
        with self._lock:
            return "".join(self._chunks)[-_LOG_MAX_CHARS:]

    def flush_to_db(self) -> None:
        with self._lock:
            if not self._dirty:
                return
            payload = "".join(self._chunks)[-_LOG_MAX_CHARS:]
            self._dirty = False
            self._last_flush = time.monotonic()
        _write_log(self.run_id, payload)


def process_migrate(db: Session, run_id: int) -> None:
    run = db.get(MigrationRun, run_id)
    if run is None:
        clear_cancel(run_id)
        return

    target = db.get(DirectusTarget, run.target_id)
    if target is None:
        run.status = "failed"
        run.error_detail = "Target not found"
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        clear_cancel(run_id)
        return

    prior_progress: dict[str, Any] = {}
    if run.progress_json:
        try:
            loaded = json.loads(run.progress_json)
            if isinstance(loaded, dict):
                prior_progress = loaded
        except json.JSONDecodeError:
            prior_progress = {}

    skip_data_files = [
        str(f)
        for f in (prior_progress.get("completed_files") or [])
        if isinstance(f, str) and f.endswith(".json")
    ]
    mode = str(prior_progress.get("mode") or "start")

    if is_cancel_requested(run_id) or run.status == "stopping":
        run.status = "stopped"
        run.error_detail = None
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        clear_cancel(run_id)
        return

    run.status = "running"
    run.error_detail = None
    run.log_text = None
    run.started_at = datetime.now(timezone.utc)
    run.progress_json = json.dumps(
        {
            "phase": "starting",
            "total": 0,
            "processed": len(skip_data_files),
            "uploaded": 0,
            "failed": 0,
            "skipped": len(skip_data_files),
            "placeholders": 0,
            "folders_created": 0,
            "folders_failed": 0,
            "completed_files": skip_data_files,
            "current_file": None,
            "current_collection": None,
            "current_file_id": None,
            "mode": mode,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    db.commit()

    source = prepared_dir(run.project_id, run.target_id)
    capture = _TerminalCapture(run_id, sys.__stdout__)
    old_out, old_err = sys.stdout, sys.stderr
    try:
        validate_prepared(source)
        flags = parse_phases(run.phases)
        if not any(flags.values()):
            raise ValueError("No import phases selected")

        plaintext = decrypt_secret(target.token)
        url = resolve_directus_base_url(target.url)

        def on_progress(progress: dict[str, Any]) -> None:
            capture.flush_to_db()
            _write_progress(run_id, progress)

        def should_cancel() -> bool:
            return is_cancel_requested(run_id)

        sys.stdout = capture  # type: ignore[assignment]
        sys.stderr = capture  # type: ignore[assignment]

        # Serialize imports: module-level auth is shared with ThreadPoolExecutor workers.
        with import_lock:
            summary = run_import(
                export_path=str(source),
                import_schema_flag=flags["schema"],
                import_data_flag=flags["data"],
                import_files_flag=flags["files"],
                import_flows_flag=flags["flows"],
                quiet=True,
                # Collection apply is always upsert-by-PK so resume/retry of
                # failed collections updates rows already created.
                upsert=True if flags["data"] else False,
                skip_existing_files=True,
                skip_data_files=skip_data_files if flags["data"] else None,
                progress_callback=on_progress
                if (flags["files"] or flags["data"])
                else None,
                should_cancel=should_cancel if flags["data"] else None,
                url=url,
                token=plaintext,
            )

        capture.flush_to_db()

        run = db.get(MigrationRun, run_id)
        if run is None:
            return

        if is_cancel_requested(run_id):
            run.status = "stopped"
            run.error_detail = None
            run.summary_json = json.dumps(summary, default=str)[:100_000]
            run.log_text = capture.text() or run.log_text
            run.finished_at = datetime.now(timezone.utc)
            db.commit()
            return

        # Final progress snapshot from files summary when present.
        files_block = summary.get("files") if isinstance(summary, dict) else None
        data_block = summary.get("data") if isinstance(summary, dict) else None
        data_row_failures = 0
        failed_files: list[str] = []
        if isinstance(data_block, dict):
            collections = {
                k: v
                for k, v in data_block.items()
                if k != "_deferred_fks" and isinstance(v, dict)
            }
            data_row_failures = sum(
                int(v.get("failed") or 0) for v in collections.values()
            )
            failed_files = [
                f"{name}.json"
                for name, v in collections.items()
                if int(v.get("failed") or 0) > 0
            ]

        # Row-level collection failures → failed so UI can retry upsert.
        if data_row_failures > 0:
            run.status = "failed"
            run.error_detail = (
                f"{data_row_failures} row failure"
                f"{'' if data_row_failures == 1 else 's'} across "
                f"{len(failed_files)} collection"
                f"{'' if len(failed_files) == 1 else 's'}; retry to upsert"
            )[:500]
        else:
            run.status = "completed"
            run.error_detail = None

        run.summary_json = json.dumps(summary, default=str)[:100_000]
        run.log_text = capture.text() or run.log_text
        if isinstance(files_block, dict):
            file_stats = files_block.get("files") or {}
            folder_stats = files_block.get("folders") or {}
            uploaded = int(file_stats.get("uploaded") or 0)
            failed = int(file_stats.get("failed") or 0)
            skipped = int(file_stats.get("skipped") or 0)
            run.progress_json = json.dumps(
                {
                    "phase": "done",
                    "total": uploaded + failed + skipped,
                    "processed": uploaded + failed + skipped,
                    "uploaded": uploaded,
                    "failed": failed,
                    "skipped": skipped,
                    "placeholders": int(file_stats.get("placeholder") or 0),
                    "folders_created": int(folder_stats.get("created") or 0),
                    "folders_failed": int(folder_stats.get("failed") or 0),
                    "current_file": None,
                    "current_file_id": None,
                    "mode": mode,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                default=str,
            )[:50_000]
        elif isinstance(data_block, dict):
            # Prefer last progress_json (has completed_files); mark phase done.
            completed = completed_data_files_from_run(run)
            # Re-read after ensure failed files are not in completed.
            completed = [f for f in completed if f not in set(failed_files)]
            collections = {
                k: v
                for k, v in data_block.items()
                if k != "_deferred_fks" and isinstance(v, dict)
            }
            success = sum(int(v.get("success") or 0) for v in collections.values())
            failed = data_row_failures
            # Pack-scoped total: completed + still-failed (not this-run summary length).
            prior_total = 0
            if run.progress_json:
                try:
                    prior_prog = json.loads(run.progress_json)
                    if isinstance(prior_prog, dict):
                        prior_total = int(prior_prog.get("total") or 0)
                except (json.JSONDecodeError, TypeError, ValueError):
                    prior_total = 0
            total = max(
                prior_total,
                len(completed) + len(failed_files),
                len(skip_data_files) + len(collections),
            ) or len(collections)
            run.progress_json = json.dumps(
                {
                    "phase": "done" if failed == 0 else "data_done",
                    "total": total,
                    "processed": len(completed),
                    "uploaded": success,
                    "failed": failed,
                    "skipped": len(skip_data_files),
                    "completed_files": completed,
                    "failed_files": failed_files,
                    "current_file": None,
                    "current_collection": None,
                    "current_file_id": None,
                    "mode": mode,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                default=str,
            )[:50_000]
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
    except DirectusImportCancelled as exc:
        logger.info("Migration run %s stopped by user", run_id)
        try:
            print(f"⏹️ Migration stopped: {exc}", file=sys.stderr)
        except Exception:  # noqa: BLE001
            pass
        try:
            capture.flush_to_db()
        except Exception:  # noqa: BLE001
            pass
        db.rollback()
        run = db.get(MigrationRun, run_id)
        if run is None:
            return
        summary = exc.full_summary
        run.status = "stopped"
        run.error_detail = None
        if summary:
            run.summary_json = json.dumps(summary, default=str)[:100_000]
        run.log_text = capture.text() or run.log_text
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:  # noqa: BLE001 — persist failure for UI
        logger.exception("Migration run %s failed", run_id)
        try:
            print(f"❌ Migration failed: {exc}", file=sys.stderr)
        except Exception:  # noqa: BLE001
            pass
        try:
            capture.flush_to_db()
        except Exception:  # noqa: BLE001
            pass
        db.rollback()
        run = db.get(MigrationRun, run_id)
        if run is None:
            return
        detail = str(exc)
        if isinstance(exc, DirectusImportError):
            detail = str(exc)
        run.status = "failed"
        run.error_detail = detail[:500]
        run.log_text = capture.text() or run.log_text
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
    finally:
        sys.stdout = old_out
        sys.stderr = old_err
        clear_cancel(run_id)


def run_migrate_job(run_id: int) -> None:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        process_migrate(db, run_id)
    finally:
        db.close()


def schedule_migrate(run_id: int) -> None:
    """Start import in a daemon thread (same pattern as extract)."""
    register_cancel(run_id)
    thread = threading.Thread(
        target=run_migrate_job,
        args=(run_id,),
        name=f"migrate-run-{run_id}",
        daemon=True,
    )
    thread.start()
