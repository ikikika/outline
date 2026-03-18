"""Orchestrate Directus import jobs against prepared target directories."""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

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
    db.commit()

    source = prepared_dir(run.project_id, run.target_id)
    try:
        validate_prepared(source)
        flags = parse_phases(run.phases)
        if not any(flags.values()):
            raise ValueError("No import phases selected")

        plaintext = decrypt_secret(target.token)
        url = resolve_directus_base_url(target.url)

        # Serialize imports: module-level auth is shared with ThreadPoolExecutor workers.
        with import_lock:
            summary = run_import(
                export_path=str(source),
                import_schema_flag=flags["schema"],
                import_data_flag=flags["data"],
                import_files_flag=flags["files"],
                import_flows_flag=flags["flows"],
                quiet=True,
                url=url,
                token=plaintext,
            )

        run.status = "completed"
        run.summary_json = json.dumps(summary, default=str)[:100_000]
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
