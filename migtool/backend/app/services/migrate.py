"""Orchestrate Directus import jobs against prepared target directories."""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.secrets import decrypt_secret
from app.models.project import DirectusTarget, MigrationRun
from app.services.directus import resolve_directus_base_url
from app.services.directus_import import DirectusImportError, import_lock, run_import
from app.services.uploads import project_upload_dir

logger = logging.getLogger(__name__)

VALID_PHASES = frozenset({"schema", "data", "files", "flows"})


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
    try:
        validate_prepared(source)
        flags = parse_phases(run.phases)
        if not any(flags.values()):
            raise ValueError("No import phases selected")

        plaintext = decrypt_secret(target.token)
        url = resolve_directus_base_url(target.url)

        def on_progress(progress: dict[str, Any]) -> None:
            _write_progress(run_id, progress)

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

        run = db.get(MigrationRun, run_id)
        if run is None:
            return
        run.status = "completed"
        run.summary_json = json.dumps(summary, default=str)[:100_000]
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
        db.rollback()
        run = db.get(MigrationRun, run_id)
        if run is None:
            return
        detail = str(exc)
        if isinstance(exc, DirectusImportError):
            detail = str(exc)
        run.status = "failed"
        run.error_detail = detail[:500]
        run.finished_at = datetime.now(timezone.utc)
        db.commit()


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
