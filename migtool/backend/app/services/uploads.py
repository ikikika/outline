"""Persist project source uploads under backend/uploads/."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import UploadFile

# backend/uploads — sibling of app/
UPLOADS_ROOT = Path(__file__).resolve().parents[2] / "uploads"

ALLOWED_EXTENSIONS = frozenset({".zip", ".json", ".ndjson"})
# Soft cap matching the create-project UI copy (2 GB).
MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024
_CHUNK = 1024 * 1024

_SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def project_upload_dir(project_id: int) -> Path:
    path = UPLOADS_ROOT / f"project_{project_id}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def sanitize_filename(name: str) -> str:
    base = Path(name).name.strip() or "upload"
    cleaned = _SAFE_NAME.sub("_", base).strip("._") or "upload"
    return cleaned[:180]


def extension_allowed(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


async def save_upload(project_id: int, upload: UploadFile) -> tuple[str, str, int]:
    """
    Write an uploaded file to disk.

    Returns (original_name, stored_name, size_bytes).
    """
    original = (upload.filename or "upload").strip() or "upload"
    if not extension_allowed(original):
        raise ValueError("Only .zip, .json, and .ndjson files are allowed")

    safe = sanitize_filename(original)
    stored = f"{uuid.uuid4().hex}_{safe}"
    dest = project_upload_dir(project_id) / stored

    size = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await upload.read(_CHUNK)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise ValueError("File exceeds the 2 GB limit")
                out.write(chunk)
    except Exception:
        if dest.exists():
            dest.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    return original, stored, size
