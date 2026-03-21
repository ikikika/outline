"""Build prepared/target_{id}/ from extracted source files."""

from __future__ import annotations

import json
import mimetypes
import re
import shutil
import uuid
from pathlib import Path
from typing import Any, Literal

from app.services.extract import extract_dir_for_upload
from app.services.migrate import prepared_dir

MetaMode = Literal["directus", "map", "generate"]

_UUID_RE = re.compile(
    r"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"
)
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
_SKIP_NAMES = {".ds_store", "thumbs.db", "files_metadata.json", "folders.json"}

# Valid 1x1 PNG so Directus/sharp can extract image metadata.
_PNG_PLACEHOLDER = bytes.fromhex(
    "89504E470D0A1A0A"
    "0000000D49484452000000010000000108060000001F15C489"
    "0000000D49444154789C6360606060000000050001A5F64540"
    "0000000049454E44AE426082"
)
_SVG_PLACEHOLDER = b'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
_PDF_PLACEHOLDER = b"%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


class PrepareError(ValueError):
    """User-facing prepare failure."""


def _safe_under(root: Path, relative: str) -> Path:
    rel = (relative or "").replace("\\", "/").strip("/")
    if rel.startswith("../") or "/../" in f"/{rel}/" or rel == "..":
        raise PrepareError("Invalid folder path")
    target = (root / rel).resolve() if rel else root.resolve()
    root_resolved = root.resolve()
    if not target.is_relative_to(root_resolved):
        raise PrepareError("Folder path escapes extract directory")
    return target


def _guess_mime(name: str) -> str:
    mime, _ = mimetypes.guess_type(name)
    return mime or "application/octet-stream"


def _title_from_name(name: str) -> str:
    stem = Path(name).stem
    # Strip leading UUID_ prefix if present.
    m = _UUID_RE.match(stem)
    if m and len(stem) > len(m.group(1)) + 1 and stem[len(m.group(1))] in "_-":
        stem = stem[len(m.group(1)) + 1 :]
    cleaned = stem.replace("_", " ").replace("-", " ").strip()
    return cleaned.title() if cleaned else name


def _parse_uuid_prefix(name: str) -> str | None:
    m = _UUID_RE.match(Path(name).stem)
    return m.group(1).lower() if m else None


def _nested_get(obj: dict[str, Any], dotted: str) -> Any:
    cur: Any = obj
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _load_json_records(path: Path) -> list[dict[str, Any]]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PrepareError(f"Could not read metadata JSON: {exc}") from exc
    if isinstance(raw, dict):
        for key in ("data", "files", "items", "results"):
            if isinstance(raw.get(key), list):
                raw = raw[key]
                break
        else:
            raise PrepareError("Metadata JSON must be an array of file records")
    if not isinstance(raw, list):
        raise PrepareError("Metadata JSON must be an array of file records")
    out: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            out.append(item)
    return out


def _normalize_directus_record(rec: dict[str, Any]) -> dict[str, Any]:
    file_id = str(rec.get("id") or "").strip()
    if not file_id:
        raise PrepareError("Directus metadata record missing id")
    download = (
        str(rec.get("filename_download") or rec.get("filename_disk") or file_id).strip()
    )
    disk = str(rec.get("filename_disk") or "").strip()
    if not disk:
        ext = Path(download).suffix
        disk = f"{file_id}{ext}"
    mime = str(rec.get("type") or _guess_mime(download))
    filesize = rec.get("filesize")
    try:
        filesize_int = int(filesize) if filesize is not None else None
    except (TypeError, ValueError):
        filesize_int = None
    return {
        "id": file_id,
        "storage": rec.get("storage") or "local",
        "filename_disk": disk,
        "filename_download": download,
        "title": rec.get("title") or _title_from_name(download),
        "type": mime,
        "folder": rec.get("folder"),
        "filesize": filesize_int,
        "width": rec.get("width"),
        "height": rec.get("height"),
        "description": rec.get("description"),
        "tags": rec.get("tags"),
        "metadata": rec.get("metadata") if isinstance(rec.get("metadata"), dict) else {},
    }


def _map_record(rec: dict[str, Any]) -> dict[str, Any]:
    """Best-effort map of common CMS / WP-shaped keys → Directus file fields."""
    file_id = (
        _nested_get(rec, "id")
        or _nested_get(rec, "uuid")
        or _nested_get(rec, "guid")
    )
    if file_id is not None:
        file_id = str(file_id).strip()
    else:
        file_id = str(uuid.uuid4())

    download = (
        _nested_get(rec, "filename_download")
        or _nested_get(rec, "source_url")
        or _nested_get(rec, "url")
        or _nested_get(rec, "guid.rendered")
        or _nested_get(rec, "slug")
        or _nested_get(rec, "title.rendered")
        or _nested_get(rec, "title")
    )
    if isinstance(download, str) and ("/" in download or download.startswith("http")):
        download = Path(download.split("?")[0]).name
    download = str(download or f"{file_id}").strip() or f"{file_id}"

    title = (
        _nested_get(rec, "title.rendered")
        or _nested_get(rec, "title")
        or _title_from_name(download)
    )
    mime = (
        _nested_get(rec, "mime_type")
        or _nested_get(rec, "type")
        or _nested_get(rec, "media_type")
        or _guess_mime(download)
    )
    filesize = (
        _nested_get(rec, "media_details.filesize")
        or _nested_get(rec, "filesize")
        or _nested_get(rec, "size")
    )
    width = _nested_get(rec, "media_details.width") or _nested_get(rec, "width")
    height = _nested_get(rec, "media_details.height") or _nested_get(rec, "height")

    ext = Path(download).suffix
    disk = str(_nested_get(rec, "filename_disk") or f"{file_id}{ext}")

    try:
        filesize_int = int(filesize) if filesize is not None else None
    except (TypeError, ValueError):
        filesize_int = None

    return {
        "id": file_id,
        "storage": "local",
        "filename_disk": disk,
        "filename_download": download,
        "title": str(title) if title else _title_from_name(download),
        "type": str(mime),
        "folder": None,
        "filesize": filesize_int,
        "width": width if isinstance(width, int) else None,
        "height": height if isinstance(height, int) else None,
        "description": None,
        "tags": None,
        "metadata": {},
    }


def _list_media_files(folder: Path) -> list[Path]:
    if not folder.is_dir():
        raise PrepareError(f"Files folder not found: {folder.as_posix()}")
    files: list[Path] = []
    for path in sorted(folder.iterdir()):
        if not path.is_file():
            continue
        name = path.name.lower()
        if name in _SKIP_NAMES or name.startswith("."):
            continue
        if path.suffix.lower() in _MEDIA_EXTS:
            files.append(path)
    return files


def _generate_records(folder: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in _list_media_files(folder):
        parsed = _parse_uuid_prefix(path.name)
        file_id = parsed or str(uuid.uuid4())
        # Prefer original basename after UUID_ prefix for download name.
        download = path.name
        if parsed and download.lower().startswith(parsed.lower()):
            rest = download[len(parsed) :]
            if rest[:1] in "_-":
                download = rest[1:] or path.name
        mime = _guess_mime(download)
        ext = Path(download).suffix or path.suffix
        records.append(
            {
                "id": file_id,
                "storage": "local",
                "filename_disk": f"{file_id}{ext}",
                "filename_download": download,
                "title": _title_from_name(download),
                "type": mime,
                "folder": None,
                "filesize": path.stat().st_size,
                "width": None,
                "height": None,
                "description": None,
                "tags": None,
                "metadata": {},
                "_source_path": str(path),
            }
        )
    return records


def _find_source_binary(
    files_dir: Path,
    record: dict[str, Any],
) -> Path | None:
    explicit = record.get("_source_path")
    if explicit:
        p = Path(explicit)
        if p.is_file():
            return p

    file_id = str(record["id"])
    download = str(record.get("filename_download") or "")
    disk = str(record.get("filename_disk") or "")
    candidates = [
        files_dir / f"{file_id}_{download}",
        files_dir / download,
        files_dir / disk,
        files_dir / f"{file_id}_{disk}",
        files_dir / f"{file_id}{Path(download).suffix}",
    ]
    for c in candidates:
        if c.is_file():
            return c
    prefix = f"{file_id}_"
    try:
        for p in files_dir.iterdir():
            if p.is_file() and p.name.startswith(prefix):
                return p
    except OSError:
        return None
    return None


def _placeholder_bytes(filename: str, mime: str) -> bytes:
    normalized = (mime or "application/octet-stream").lower()
    if normalized == "image/svg+xml":
        return _SVG_PLACEHOLDER
    if normalized.startswith("image/"):
        return _PNG_PLACEHOLDER
    if normalized == "application/pdf":
        return _PDF_PLACEHOLDER
    if normalized.startswith("text/") or normalized in {
        "application/json",
        "application/xml",
    }:
        return f"Placeholder asset for {filename}\n".encode("utf-8")
    return f"Placeholder asset for {filename}\n".encode("utf-8")


def _find_folders_json(files_dir: Path, meta_path: Path | None) -> Path | None:
    candidates: list[Path] = []
    if meta_path is not None:
        candidates.append(meta_path.parent / "folders.json")
    candidates.extend(
        [
            files_dir.parent / "folders.json",
            files_dir / "folders.json",
        ]
    )
    for c in candidates:
        if c.is_file():
            return c
    return None


def build_prepared(
    *,
    project_id: int,
    target_id: int,
    upload_id: int,
    folder_path: str,
    mode: MetaMode,
    placeholders: bool = True,
    metadata_abs_path: Path | None = None,
) -> dict[str, Any]:
    """
    Write prepared/target_{target_id}/ with files/, files_metadata.json, folders.json.

    Returns a summary dict for the API response.
    """
    extract_root = extract_dir_for_upload(project_id, upload_id)
    if not extract_root.is_dir():
        raise PrepareError("Upload has not been extracted yet")

    files_dir = _safe_under(extract_root, folder_path)
    if not files_dir.is_dir():
        raise PrepareError(f"Files folder not found: {folder_path or '(upload root)'}")

    if mode == "generate":
        records = _generate_records(files_dir)
    elif mode in ("directus", "map"):
        if metadata_abs_path is None or not metadata_abs_path.is_file():
            raise PrepareError("Metadata JSON is required for this mode")
        raw = _load_json_records(metadata_abs_path)
        if mode == "directus":
            records = [_normalize_directus_record(r) for r in raw]
        else:
            records = [_map_record(r) for r in raw]
    else:
        raise PrepareError(f"Unknown mode: {mode}")

    out_root = prepared_dir(project_id, target_id)
    out_files = out_root / "files"
    if out_files.exists():
        shutil.rmtree(out_files)
    out_files.mkdir(parents=True, exist_ok=True)
    out_root.mkdir(parents=True, exist_ok=True)

    written_meta: list[dict[str, Any]] = []
    copied = 0
    placeholder_count = 0
    skipped = 0
    missing = 0

    for record in records:
        src = _find_source_binary(files_dir, record)
        download = str(record["filename_download"])
        dest_name = f"{record['id']}_{download}"
        dest = out_files / dest_name
        # Keep folder layout flat in prepared (import looks under files/ or files/{folder}/).
        folder_id = record.get("folder")
        if folder_id:
            dest = out_files / str(folder_id) / dest_name
            dest.parent.mkdir(parents=True, exist_ok=True)

        clean = {k: v for k, v in record.items() if not k.startswith("_")}

        if src is not None:
            shutil.copy2(src, dest)
            if clean.get("filesize") is None:
                clean["filesize"] = src.stat().st_size
            written_meta.append(clean)
            copied += 1
            continue

        missing += 1
        if placeholders:
            mime = str(clean.get("type") or _guess_mime(download))
            data = _placeholder_bytes(download, mime)
            dest.write_bytes(data)
            clean["filesize"] = len(data)
            # Placeholders are often PNG stubs even when original was another image type.
            if mime.startswith("image/") and mime != "image/svg+xml":
                clean["type"] = "image/png"
                clean["width"] = 1
                clean["height"] = 1
                stem_disk = Path(str(clean.get("filename_disk") or download)).stem
                clean["filename_disk"] = f"{stem_disk}.png"
            written_meta.append(clean)
            placeholder_count += 1
        else:
            skipped += 1

    meta_out = out_root / "files_metadata.json"
    meta_out.write_text(
        json.dumps(written_meta, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    folders_src = _find_folders_json(files_dir, metadata_abs_path)
    folders_out = out_root / "folders.json"
    if folders_src is not None:
        shutil.copy2(folders_src, folders_out)
        try:
            folders_data = json.loads(folders_src.read_text(encoding="utf-8"))
            folders_count = len(folders_data) if isinstance(folders_data, list) else 0
        except (OSError, json.JSONDecodeError):
            folders_count = 0
    else:
        folders_out.write_text("[]\n", encoding="utf-8")
        folders_count = 0

    return {
        "output_path": f"uploads/project_{project_id}/prepared/target_{target_id}/",
        "mode": mode,
        "records": len(written_meta),
        "copied": copied,
        "placeholders": placeholder_count,
        "skipped": skipped,
        "missing": missing,
        "folders": folders_count,
    }
