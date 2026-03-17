"""Safe zip extraction and source-file indexing for project uploads."""

from __future__ import annotations

import shutil
import threading
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.project import ProjectSourceFile, ProjectUpload
from app.services.uploads import project_upload_dir

MAX_UNCOMPRESSED_BYTES = 10 * 1024 * 1024 * 1024  # 10 GB
MAX_ZIP_FILES = 50_000
# Extract in-request when the pack is small enough for snappy UX.
INLINE_EXTRACT_MAX_BYTES = 64 * 1024 * 1024
_CHUNK = 1024 * 1024

_SKIP_PREFIXES = ("__macosx/",)
_SKIP_NAMES = {".ds_store", "thumbs.db"}

_DATA_EXTS = {".json": "json", ".ndjson": "ndjson"}
_MEDIA_EXTS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".pdf",
    ".mp4",
    ".mov",
    ".mp3",
    ".wav",
    ".avi",
    ".webm",
    ".tif",
    ".tiff",
    ".bmp",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
}


def extract_dir_for_upload(project_id: int, upload_id: int) -> Path:
    path = project_upload_dir(project_id) / "extracted" / f"upload_{upload_id}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def stored_path(upload: ProjectUpload) -> Path:
    return project_upload_dir(upload.project_id) / upload.stored_name


def classify_kind(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in _DATA_EXTS:
        return _DATA_EXTS[ext]
    if ext in _MEDIA_EXTS:
        return "media"
    return "other"


def _should_skip_member(name: str) -> bool:
    lowered = name.replace("\\", "/").lower()
    if any(lowered.startswith(p) for p in _SKIP_PREFIXES):
        return True
    base = Path(lowered).name
    return base in _SKIP_NAMES


def _safe_member_path(dest: Path, member_name: str) -> Path:
    name = member_name.replace("\\", "/")
    if name.startswith("/") or name.startswith("../") or "/../" in f"/{name}/":
        raise ValueError(f"Unsafe path in zip: {member_name}")
    parts = Path(name).parts
    if any(p == ".." for p in parts):
        raise ValueError(f"Unsafe path in zip: {member_name}")
    target = (dest / name).resolve()
    dest_resolved = dest.resolve()
    if not target.is_relative_to(dest_resolved):
        raise ValueError(f"Path escapes extract dir: {member_name}")
    return target


def _clear_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def _index_file(
    db: Session,
    upload: ProjectUpload,
    *,
    relative_path: str,
    abs_path: Path,
) -> ProjectSourceFile:
    size = abs_path.stat().st_size if abs_path.is_file() else 0
    row = ProjectSourceFile(
        project_id=upload.project_id,
        upload_id=upload.id,
        relative_path=relative_path.replace("\\", "/"),
        original_name=Path(relative_path).name,
        kind=classify_kind(relative_path),
        size_bytes=size,
    )
    db.add(row)
    return row


def _extract_zip(zip_path: Path, dest: Path) -> list[Path]:
    _clear_dir(dest)
    written = 0
    count = 0
    extracted: list[Path] = []

    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            name = info.filename.replace("\\", "/")
            if _should_skip_member(name):
                continue
            if info.file_size < 0:
                raise ValueError("Invalid zip entry size")
            written += info.file_size
            count += 1
            if written > MAX_UNCOMPRESSED_BYTES:
                raise ValueError("Zip uncompressed size exceeds limit")
            if count > MAX_ZIP_FILES:
                raise ValueError("Zip contains too many files")

            target = _safe_member_path(dest, name)
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, target.open("wb") as out:
                shutil.copyfileobj(src, out, length=_CHUNK)
            extracted.append(target)

    return extracted


def process_upload(db: Session, upload_id: int) -> None:
    """Extract (if zip) or register loose files, then index source files."""
    upload = db.get(ProjectUpload, upload_id)
    if upload is None:
        return

    upload.status = "extracting"
    upload.error_detail = None
    db.commit()

    src = stored_path(upload)
    dest = extract_dir_for_upload(upload.project_id, upload.id)

    try:
        if not src.is_file():
            raise ValueError("Uploaded file missing on disk")

        # Replace prior source-file rows for this upload (re-run safe).
        db.query(ProjectSourceFile).filter(
            ProjectSourceFile.upload_id == upload.id
        ).delete(synchronize_session=False)

        suffix = Path(upload.original_name).suffix.lower()
        if suffix == ".zip":
            files = _extract_zip(src, dest)
            db.add_all(
                [
                    ProjectSourceFile(
                        project_id=upload.project_id,
                        upload_id=upload.id,
                        relative_path=(rel := abs_path.relative_to(dest).as_posix()),
                        original_name=Path(rel).name,
                        kind=classify_kind(rel),
                        size_bytes=abs_path.stat().st_size,
                    )
                    for abs_path in files
                ]
            )
        elif suffix in {".json", ".ndjson"}:
            _clear_dir(dest)
            target = dest / Path(upload.original_name).name
            shutil.copyfile(src, target)
            _index_file(
                db,
                upload,
                relative_path=target.name,
                abs_path=target,
            )
        else:
            raise ValueError(f"Unsupported upload type: {suffix or '(none)'}")

        upload.status = "ready"
        upload.error_detail = None
        upload.extracted_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:  # noqa: BLE001 — persist failure for UI
        db.rollback()
        upload = db.get(ProjectUpload, upload_id)
        if upload is None:
            return
        upload.status = "failed"
        upload.error_detail = str(exc)[:500]
        db.commit()


def run_extract_job(upload_id: int) -> None:
    """Worker entrypoint with its own DB session."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        process_upload(db, upload_id)
    finally:
        db.close()


def schedule_extract(upload_id: int) -> None:
    """
    Start extract immediately in a daemon thread.

    FastAPI BackgroundTasks can be dropped under uvicorn --reload / long
    uploads; a thread starts as soon as the upload row is committed.
    """
    thread = threading.Thread(
        target=run_extract_job,
        args=(upload_id,),
        name=f"extract-upload-{upload_id}",
        daemon=True,
    )
    thread.start()


def process_or_schedule(db: Session, upload: ProjectUpload) -> ProjectUpload:
    """Inline extract for small packs; thread for larger ones."""
    if upload.size_bytes <= INLINE_EXTRACT_MAX_BYTES:
        process_upload(db, upload.id)
        db.refresh(upload)
        return upload
    schedule_extract(upload.id)
    return upload


def delete_upload_artifacts(upload: ProjectUpload) -> None:
    """Remove the stored original and its extracted/ folder from disk."""
    original = stored_path(upload)
    if original.is_file():
        original.unlink(missing_ok=True)

    extracted = (
        project_upload_dir(upload.project_id) / "extracted" / f"upload_{upload.id}"
    )
    if extracted.exists():
        shutil.rmtree(extracted, ignore_errors=True)
