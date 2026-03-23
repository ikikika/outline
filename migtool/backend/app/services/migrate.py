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
from app.services.directus_import import DirectusImportError, import_lock, run_import
from app.services.uploads import project_upload_dir

logger = logging.getLogger(__name__)

VALID_PHASES = frozenset({"schema", "data", "files", "flows"})
_LOG_MAX_CHARS = 200_000
_LOG_FLUSH_INTERVAL_S = 0.4


def prepared_dir(project_id: int, target_id: int) -> Path:
    return project_upload_dir(project_id) / "prepared" / f"target_{target_id}"


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


def _write_progress(run_id: int, progress: dict[str, Any]) -> None:
    """Persist a progress checkpoint with a short-lived DB session."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        run = db.get(MigrationRun, run_id)
        if run is None:
            return
        run.progress_json = json.dumps(progress, default=str)[:50_000]
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
        return

    target = db.get(DirectusTarget, run.target_id)
    if target is None:
        run.status = "failed"
        run.error_detail = "Target not found"
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        return

    run.status = "running"
    run.error_detail = None
    run.log_text = None
    run.started_at = datetime.now(timezone.utc)
    run.progress_json = json.dumps(
        {
            "phase": "starting",
            "total": 0,
            "processed": 0,
            "uploaded": 0,
            "failed": 0,
            "skipped": 0,
            "placeholders": 0,
            "folders_created": 0,
            "folders_failed": 0,
            "current_file": None,
            "current_file_id": None,
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
                skip_existing_files=True,
                progress_callback=on_progress if flags["files"] else None,
                url=url,
                token=plaintext,
            )

        capture.flush_to_db()

        run = db.get(MigrationRun, run_id)
        if run is None:
            return
        run.status = "completed"
        run.summary_json = json.dumps(summary, default=str)[:100_000]
        run.log_text = capture.text() or run.log_text
        # Final progress snapshot from files summary when present.
        files_block = summary.get("files") if isinstance(summary, dict) else None
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
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                default=str,
            )[:50_000]
        run.error_detail = None
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


def run_migrate_job(run_id: int) -> None:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        process_migrate(db, run_id)
    finally:
        db.close()


def schedule_migrate(run_id: int) -> None:
    """Start import in a daemon thread (same pattern as extract)."""
    thread = threading.Thread(
        target=run_migrate_job,
        args=(run_id,),
        name=f"migrate-run-{run_id}",
        daemon=True,
    )
    thread.start()
