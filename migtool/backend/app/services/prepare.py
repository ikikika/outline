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


_SCHEMA_COMPLETE = "schema_complete.json"
_SCHEMA_SIDECARS = ("collections.json", "fields.json", "relations.json")


def _count_json_array(path: Path) -> int | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict):
        for key in ("collections", "fields", "relations", "data"):
            val = data.get(key)
            if isinstance(val, list):
                return len(val)
    return None


def _schema_counts(schema_dir: Path) -> dict[str, int]:
    """Read collection / field / relation counts from a Directus schema folder."""
    complete = schema_dir / _SCHEMA_COMPLETE
    if complete.is_file():
        try:
            data = json.loads(complete.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError, UnicodeDecodeError):
            data = None
        if isinstance(data, dict):
            return {
                "collections": len(data.get("collections") or [])
                if isinstance(data.get("collections"), list)
                else 0,
                "fields": len(data.get("fields") or [])
                if isinstance(data.get("fields"), list)
                else 0,
                "relations": len(data.get("relations") or [])
                if isinstance(data.get("relations"), list)
                else 0,
            }

    return {
        "collections": _count_json_array(schema_dir / "collections.json") or 0,
        "fields": _count_json_array(schema_dir / "fields.json") or 0,
        "relations": _count_json_array(schema_dir / "relations.json") or 0,
    }


def _find_schema_dir(pack_dir: Path) -> Path | None:
    """Locate a Directus schema/ directory under the selected pack folder."""
    direct = pack_dir / "schema"
    if direct.is_dir():
        return direct
    # Selected the schema folder itself.
    if pack_dir.name.lower() == "schema" and pack_dir.is_dir():
        return pack_dir
    # One-level search for nested export packs.
    try:
        for child in sorted(pack_dir.iterdir()):
            if child.is_dir() and child.name.lower() == "schema":
                return child
            nested = child / "schema"
            if nested.is_dir():
                return nested
    except OSError:
        return None
    return None


def _is_directus_schema(schema_dir: Path) -> bool:
    if (schema_dir / _SCHEMA_COMPLETE).is_file():
        return True
    return all((schema_dir / name).is_file() for name in _SCHEMA_SIDECARS)


def _list_schema_files(schema_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    preferred = (_SCHEMA_COMPLETE, *_SCHEMA_SIDECARS)
    seen: set[str] = set()
    for name in preferred:
        path = schema_dir / name
        if not path.is_file():
            continue
        seen.add(name)
        count = _count_json_array(path)
        role = "primary" if name == _SCHEMA_COMPLETE else "sidecar"
        detail = ""
        if name == _SCHEMA_COMPLETE and count is not None:
            detail = f"{count} collections"
        elif count is not None:
            detail = f"{count} rows"
        rows.append(
            {
                "name": name,
                "role": role,
                "detail": detail or "present",
                "status": "compatible",
            }
        )
    try:
        for path in sorted(schema_dir.iterdir()):
            if not path.is_file() or path.name in seen:
                continue
            if path.suffix.lower() != ".json":
                continue
            rows.append(
                {
                    "name": path.name,
                    "role": "extra",
                    "detail": "json",
                    "status": "compatible",
                }
            )
    except OSError:
        pass
    return rows


def _list_deferred_json(pack_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        for path in sorted(pack_dir.rglob("*.json")):
            if not path.is_file():
                continue
            rel = path.relative_to(pack_dir).as_posix()
            if "/schema/" in f"/{rel}" or rel.startswith("schema/"):
                continue
            count = _count_json_array(path)
            lower = path.name.lower()
            if "media" in lower or "file" in lower:
                status = "assets"
                note = "use Prepare assets"
                role = "not schema"
            else:
                status = "deferred"
                note = "content" if count else "json"
                role = "handle later"
            rows.append(
                {
                    "name": path.name,
                    "role": role,
                    "detail": f"{count:,} records" if count is not None else note,
                    "status": status,
                }
            )
    except OSError:
        pass
    return rows[:40]


def analyze_schema_pack(
    *,
    project_id: int,
    upload_id: int,
    folder_path: str,
) -> dict[str, Any]:
    """Detect Directus-compatible schema under an extracted pack folder."""
    extract_root = extract_dir_for_upload(project_id, upload_id)
    if not extract_root.is_dir():
        raise PrepareError("Upload has not been extracted yet")

    pack_dir = _safe_under(extract_root, folder_path)
    if not pack_dir.is_dir():
        raise PrepareError(f"Folder not found: {folder_path or '(upload root)'}")

    json_files = 0
    try:
        json_files = sum(1 for p in pack_dir.rglob("*.json") if p.is_file())
    except OSError:
        json_files = 0

    schema_dir = _find_schema_dir(pack_dir)
    compatible = bool(schema_dir and _is_directus_schema(schema_dir))
    counts = _schema_counts(schema_dir) if compatible and schema_dir else {
        "collections": 0,
        "fields": 0,
        "relations": 0,
    }
    schema_rel = ""
    if schema_dir is not None:
        try:
            schema_rel = schema_dir.relative_to(extract_root).as_posix()
        except ValueError:
            schema_rel = schema_dir.name

    return {
        "compatible": compatible,
        "json_files": json_files,
        "schema_folder": schema_rel if schema_dir else None,
        "collections": counts["collections"],
        "fields": counts["fields"],
        "relations": counts["relations"],
        "schema_files": _list_schema_files(schema_dir) if compatible and schema_dir else [],
        "deferred_files": [] if compatible else _list_deferred_json(pack_dir),
        "source_label": pack_dir.name or f"upload_{upload_id}",
    }


def build_prepared_schema(
    *,
    project_id: int,
    target_id: int,
    upload_id: int,
    folder_path: str,
) -> dict[str, Any]:
    """
    Copy Directus schema/ into prepared/target_{target_id}/schema/.

    Foreign packs raise PrepareError — they stay under extracted.
    """
    analysis = analyze_schema_pack(
        project_id=project_id,
        upload_id=upload_id,
        folder_path=folder_path,
    )
    if not analysis["compatible"]:
        raise PrepareError(
            "No Directus-compatible schema/ found — foreign JSON stays in extracted"
        )

    extract_root = extract_dir_for_upload(project_id, upload_id)
    pack_dir = _safe_under(extract_root, folder_path)
    schema_dir = _find_schema_dir(pack_dir)
    if schema_dir is None:
        raise PrepareError("Schema folder missing on disk")

    out_root = prepared_dir(project_id, target_id)
    out_schema = out_root / "schema"
    if out_schema.exists():
        shutil.rmtree(out_schema)
    out_schema.mkdir(parents=True, exist_ok=True)

    copied: list[str] = []
    for path in sorted(schema_dir.iterdir()):
        if not path.is_file():
            continue
        dest = out_schema / path.name
        shutil.copy2(path, dest)
        copied.append(path.name)

    if not copied:
        raise PrepareError("Schema folder is empty")

    return {
        **analysis,
        "output_path": f"uploads/project_{project_id}/prepared/target_{target_id}/schema/",
        "copied_files": copied,
        "copied": len(copied),
    }


def _count_data_rows(path: Path) -> int | None:
    """Count items in a Directus collection data file (array or singleton object)."""
    if not path.is_file() or path.name.startswith("_"):
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    if isinstance(data, list):
        if data and not isinstance(data[0], dict):
            return None
        return len(data)
    if isinstance(data, dict):
        # Singleton collection export, or reject manifest-like blobs.
        if "collections_exported" in data or (
            "collections" in data and "fields" in data
        ):
            return None
        return 1
    return None


def _find_data_dir(pack_dir: Path) -> Path | None:
    """Locate a Directus data/ directory under the selected pack folder."""
    direct = pack_dir / "data"
    if direct.is_dir():
        return direct
    if pack_dir.name.lower() == "data" and pack_dir.is_dir():
        return pack_dir
    try:
        for child in sorted(pack_dir.iterdir()):
            if child.is_dir() and child.name.lower() == "data":
                return child
            nested = child / "data"
            if nested.is_dir():
                return nested
    except OSError:
        return None
    return None


def _list_data_files(data_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        paths = sorted(
            p for p in data_dir.iterdir() if p.is_file() and p.suffix.lower() == ".json"
        )
    except OSError:
        return []

    for path in paths:
        if path.name.startswith("_"):
            rows.append(
                {
                    "name": path.name,
                    "role": "sidecar",
                    "detail": "export order" if "manifest" in path.name.lower() else "sidecar",
                    "status": "sidecar",
                    "rows": 0,
                }
            )
            continue
        count = _count_data_rows(path)
        if count is None:
            rows.append(
                {
                    "name": path.name,
                    "role": path.stem,
                    "detail": "unreadable",
                    "status": "deferred",
                    "rows": 0,
                }
            )
            continue
        rows.append(
            {
                "name": path.name,
                "role": path.stem,
                "detail": f"{count:,} rows" if count != 1 else "1 row",
                "status": "compatible",
                "rows": count,
            }
        )
    return rows


def _list_deferred_data_json(pack_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        for path in sorted(pack_dir.rglob("*.json")):
            if not path.is_file():
                continue
            rel = path.relative_to(pack_dir).as_posix()
            if "/data/" in f"/{rel}" or rel.startswith("data/"):
                continue
            if "/schema/" in f"/{rel}" or rel.startswith("schema/"):
                continue
            count = _count_json_array(path)
            lower = path.name.lower()
            if "media" in lower or "file" in lower:
                status = "assets"
                role = "not data"
            else:
                status = "deferred"
                role = "handle later"
            rows.append(
                {
                    "name": path.name,
                    "role": role,
                    "detail": f"{count:,} records" if count is not None else "json",
                    "status": status,
                    "rows": count or 0,
                }
            )
    except OSError:
        pass
    return rows[:40]


def analyze_data_pack(
    *,
    project_id: int,
    upload_id: int,
    folder_path: str,
) -> dict[str, Any]:
    """Detect Directus-compatible collection data under an extracted pack folder."""
    extract_root = extract_dir_for_upload(project_id, upload_id)
    if not extract_root.is_dir():
        raise PrepareError("Upload has not been extracted yet")

    pack_dir = _safe_under(extract_root, folder_path)
    if not pack_dir.is_dir():
        raise PrepareError(f"Folder not found: {folder_path or '(upload root)'}")

    json_files = 0
    try:
        json_files = sum(1 for p in pack_dir.rglob("*.json") if p.is_file())
    except OSError:
        json_files = 0

    data_dir = _find_data_dir(pack_dir)
    data_files = _list_data_files(data_dir) if data_dir else []
    compatible_files = [f for f in data_files if f["status"] == "compatible"]
    compatible = bool(compatible_files)
    total_rows = sum(int(f.get("rows") or 0) for f in compatible_files)

    data_rel = None
    if data_dir is not None:
        try:
            data_rel = data_dir.relative_to(extract_root).as_posix()
        except ValueError:
            data_rel = data_dir.name

    return {
        "compatible": compatible,
        "json_files": json_files,
        "data_folder": data_rel,
        "collections": len(compatible_files),
        "rows": total_rows,
        "data_files": data_files if compatible else [],
        "deferred_files": [] if compatible else _list_deferred_data_json(pack_dir),
        "source_label": (data_dir.name if data_dir else pack_dir.name)
        or f"upload_{upload_id}",
    }


def build_prepared_data(
    *,
    project_id: int,
    target_id: int,
    upload_id: int,
    folder_path: str,
) -> dict[str, Any]:
    """
    Copy Directus data/ into prepared/target_{target_id}/data/.

    Foreign packs raise PrepareError — they stay under extracted.
    """
    analysis = analyze_data_pack(
        project_id=project_id,
        upload_id=upload_id,
        folder_path=folder_path,
    )
    if not analysis["compatible"]:
        raise PrepareError(
            "No Directus-compatible data/ found — foreign JSON stays in extracted"
        )

    extract_root = extract_dir_for_upload(project_id, upload_id)
    pack_dir = _safe_under(extract_root, folder_path)
    data_dir = _find_data_dir(pack_dir)
    if data_dir is None:
        raise PrepareError("Data folder missing on disk")

    out_root = prepared_dir(project_id, target_id)
    out_data = out_root / "data"
    if out_data.exists():
        shutil.rmtree(out_data)
    out_data.mkdir(parents=True, exist_ok=True)

    copied: list[str] = []
    for path in sorted(data_dir.iterdir()):
        if not path.is_file():
            continue
        if path.suffix.lower() != ".json":
            continue
        dest = out_data / path.name
        shutil.copy2(path, dest)
        copied.append(path.name)

    if not copied:
        raise PrepareError("Data folder is empty")

    return {
        **analysis,
        "output_path": f"uploads/project_{project_id}/prepared/target_{target_id}/data/",
        "copied_files": copied,
        "copied": len(copied),
    }
