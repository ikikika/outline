"""
Directus import library (vendored from directus-scripts/import_directus.py).

Expects a prepared export directory:
    schema/, data/, files/, flows/, files_metadata.json, folders.json

Call configure(url, token) before run_import(), or pass url/token to run_import().
"""

from __future__ import annotations

import io
import json
import logging
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

# Module-level target config (required so ThreadPoolExecutor workers see auth).
# Callers should hold import_lock while running an import.
_url: str = ""
_headers: Dict[str, str] = {}
import_lock = threading.Lock()


class DirectusImportError(Exception):
    """Raised when import cannot proceed (missing path, connection, etc.)."""


def configure(url: str, token: str) -> None:
    """Set Directus URL + bearer token for this process."""
    global _url, _headers
    base = (url or "").strip().rstrip("/")
    tok = (token or "").strip()
    _url = base
    _headers = {
        "Authorization": f"Bearer {tok}",
        "Content-Type": "application/json",
    }


def get_directus_url() -> str:
    if not _url:
        raise DirectusImportError("Directus URL not configured — call configure() first")
    return _url


def get_headers() -> Dict[str, str]:
    if not _headers:
        raise DirectusImportError("Directus token not configured — call configure() first")
    return _headers


# CLI defaults only
DIRECTUS_URL = "http://localhost:8055"
ACCESS_TOKEN = "your-access-token-here"

MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds

# Collections to skip during import (system collections)
SYSTEM_COLLECTIONS = [
    "directus_access",
    "directus_activity",
    "directus_collections",
    "directus_comments",
    "directus_dashboards",
    "directus_extensions",
    "directus_fields",
    "directus_files",
    "directus_flows",
    "directus_folders",
    "directus_migrations",
    "directus_notifications",
    "directus_operations",
    "directus_panels",
    "directus_permissions",
    "directus_policies",
    "directus_presets",
    "directus_relations",
    "directus_revisions",
    "directus_roles",
    "directus_sessions",
    "directus_settings",
    "directus_shares",
    "directus_translations",
    "directus_users",
    "directus_versions",
    "directus_webhooks",
]


def load_json(filepath: str) -> Any:
    """Load data from a JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_placeholder_upload(filename: str, mime_type: str) -> Tuple[io.BytesIO, str, str]:
    """Build a small valid placeholder payload that Directus can process."""
    normalized_mime = (mime_type or "application/octet-stream").lower()

    # Valid 1x1 PNG so Directus/sharp can extract image metadata.
    png_placeholder = bytes.fromhex(
        "89504E470D0A1A0A"
        "0000000D49484452000000010000000108060000001F15C489"
        "0000000D49444154789C6360606060000000050001A5F64540"
        "0000000049454E44AE426082"
    )
    svg_placeholder = b'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
    pdf_placeholder = b'%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'
    text_placeholder = f"Placeholder asset for {filename}\n".encode("utf-8")

    if normalized_mime == "image/svg+xml":
        return io.BytesIO(svg_placeholder), filename, "image/svg+xml"

    if normalized_mime.startswith("image/"):
        return io.BytesIO(png_placeholder), filename, "image/png"

    if normalized_mime == "application/pdf":
        return io.BytesIO(pdf_placeholder), filename, "application/pdf"

    if normalized_mime.startswith("text/") or normalized_mime in {"application/json", "application/xml"}:
        return io.BytesIO(text_placeholder), filename, normalized_mime

    return io.BytesIO(text_placeholder), filename, "application/octet-stream"


def api_request(method: str, url: str, **kwargs) -> Tuple[bool, Any]:
    """
    Make an API request with retry logic.
    
    Returns:
        Tuple of (success, response_data_or_error)
    """
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.request(method, url, headers=get_headers(), **kwargs)
            
            if response.status_code in [200, 201, 204]:
                if response.content:
                    return True, response.json()
                return True, {}
            
            # Handle specific error codes
            if response.status_code == 409:  # Conflict - item already exists
                logging.error("API conflict %s %s -> %s", method, url, response.text[:1000])
                return False, {"error": "already_exists", "message": response.text}
            
            if response.status_code == 403:
                logging.error("API forbidden %s %s -> %s", method, url, response.text[:1000])
                return False, {"error": "forbidden", "message": response.text}
            
            if response.status_code == 404:
                logging.error("API not_found %s %s -> %s", method, url, response.text[:1000])
                return False, {"error": "not_found", "message": response.text}
            
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                logging.error("API error %s %s -> %s", method, url, response.text[:2000])
                return False, {"error": response.status_code, "message": response.text}
                
        except Exception as e:
            logging.exception("Exception during API request %s %s", method, url)
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (attempt + 1))
            else:
                return False, {"error": "exception", "message": str(e)}
    
    return False, {"error": "max_retries", "message": "Max retries exceeded"}


def get_existing_collections() -> List[str]:
    """Get list of existing collection names."""
    success, data = api_request("GET", f"{get_directus_url()}/collections")
    if success:
        return [c.get("collection") for c in data.get("data", [])]
    return []


def get_existing_fields(collection: str) -> List[str]:
    """Get list of existing field names for a collection."""
    success, data = api_request("GET", f"{get_directus_url()}/fields/{collection}")
    if success:
        return [f.get("field") for f in data.get("data", [])]
    return []


def get_field_types(collection: str) -> Dict[str, str]:
    """Get field types for a collection."""
    success, data = api_request("GET", f"{get_directus_url()}/fields/{collection}")
    if success:
        return {f.get("field"): f.get("type") for f in data.get("data", [])}
    return {}


def disable_field_validation(collections: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Temporarily disable validation and required rules on all fields for the given collections.
    Returns a dict of {collection: {field: {"validation": ..., "required": ...}}} to restore later.
    """
    saved = {}
    for collection in collections:
        success, data = api_request("GET", f"{get_directus_url()}/fields/{collection}")
        if not success:
            continue
        for field_data in data.get("data", []):
            field_name = field_data.get("field")
            meta = field_data.get("meta") or {}
            validation = meta.get("validation")
            required = meta.get("required")
            if validation is not None or required:
                saved.setdefault(collection, {})[field_name] = {
                    "validation": validation,
                    "required": required,
                }
                patch = {"meta": {"validation": None, "required": False}}
                api_request("PATCH", f"{get_directus_url()}/fields/{collection}/{field_name}", json=patch)
    if saved:
        total = sum(len(f) for f in saved.values())
        print(f"  🔓 Temporarily disabled validation on {total} fields across {len(saved)} collections")
    return saved


def restore_field_validation(saved: Dict[str, Dict[str, Any]]) -> None:
    """Restore previously saved validation and required rules on fields."""
    if not saved:
        return
    for collection, fields in saved.items():
        for field_name, rules in fields.items():
            patch = {"meta": {"validation": rules["validation"], "required": rules["required"]}}
            api_request("PATCH", f"{get_directus_url()}/fields/{collection}/{field_name}", json=patch)
    total = sum(len(f) for f in saved.values())
    print(f"  🔒 Restored validation on {total} fields across {len(saved)} collections")


def create_collection(collection_data: Dict, minimal: bool = True, id_field: Dict = None) -> bool:
    """
    Create a collection in Directus.
    
    Args:
        collection_data: Collection definition from export
        minimal: If True, create with minimal schema (no FK constraints)
        id_field: Optional id field definition from exported fields (to preserve PK type like uuid)
    
    Returns:
        True if successful or already exists
    """
    collection_name = collection_data.get("collection")
    
    # Get schema - if minimal mode, strip out foreign key constraints
    schema = collection_data.get("schema")
    if minimal and schema:
        # Create a basic schema without foreign key references
        # This allows collection creation even if related collections don't exist yet
        schema = {} if schema else None
    
    # Get meta - if minimal mode, strip out fields that reference other collections
    meta = collection_data.get("meta", {})
    if minimal and meta:
        # Remove meta fields that might reference other collections
        meta = {k: v for k, v in meta.items() if k not in [
            "group",  # References parent collection (folder)
        ]}
    
    payload = {
        "collection": collection_name,
        "meta": meta,
        "schema": schema
    }
    
    # If we have an id field definition, include it so the PK type (e.g. uuid) is preserved
    if id_field:
        id_meta = id_field.get("meta", {})
        if id_meta and "id" in id_meta:
            id_meta = {k: v for k, v in id_meta.items() if k != "id"}
        pk_field = {
            "field": "id",
            "type": id_field.get("type"),
            "meta": id_meta,
            "schema": id_field.get("schema")
        }
        payload["fields"] = [pk_field]
    
    success, response = api_request("POST", f"{get_directus_url()}/collections", json=payload)
    
    if success:
        print(f"  ✅ Collection created: {collection_name}")
        return True
    elif response.get("error") == "already_exists":
        print(f"  ⏭️ Collection already exists: {collection_name}")
        return True
    else:
        print(f"  ❌ Failed to create collection '{collection_name}': {response}")
        return False


def create_field(collection_name: str, field_data: Dict) -> bool:
    """
    Create a field in a collection.
    
    Args:
        collection_name: Name of the collection
        field_data: Field definition from export
    
    Returns:
        True if successful or already exists
    """
    field_name = field_data.get("field")
    
    # Skip primary key fields - they're created with the collection
    if field_name == "id":
        return True
    
    # Strip 'id' from meta to avoid conflicts with existing directus_fields IDs
    meta = field_data.get("meta")
    if meta and "id" in meta:
        meta = {k: v for k, v in meta.items() if k != "id"}
    
    payload = {
        "field": field_name,
        "type": field_data.get("type"),
        "meta": meta,
        "schema": field_data.get("schema")
    }
    
    success, response = api_request("POST", f"{get_directus_url()}/fields/{collection_name}", json=payload)
    
    if success:
        print(f"    ✅ Field created: {collection_name}.{field_name}")
        return True
    elif response.get("error") == "already_exists":
        print(f"    ⏭️ Field already exists: {collection_name}.{field_name}")
        return True
    else:
        print(f"    ❌ Failed to create field '{field_name}': {response}")
        return False


def create_relation(relation_data: Dict) -> bool:
    """
    Create a relation in Directus.
    
    Args:
        relation_data: Relation definition from export
    
    Returns:
        True if successful or already exists
    """
    payload = {
        "collection": relation_data.get("collection"),
        "field": relation_data.get("field"),
        "related_collection": relation_data.get("related_collection")
    }
    
    # Add optional meta if present
    if relation_data.get("meta"):
        payload["meta"] = relation_data.get("meta")
    
    success, response = api_request("POST", f"{get_directus_url()}/relations", json=payload)
    
    collection = relation_data.get("collection")
    field = relation_data.get("field")
    related = relation_data.get("related_collection")
    
    if success:
        print(f"  ✅ Relation created: {collection}.{field} -> {related}")
        return True
    elif response.get("error") == "already_exists":
        print(f"  ⏭️ Relation already exists: {collection}.{field} -> {related}")
        return True
    else:
        print(f"  ❌ Failed to create relation: {response}")
        return False


def sort_collections_by_dependency(collections: List[Dict], relations: List[Dict]) -> List[Dict]:
    """
    Sort collections so that referenced collections are created first.
    
    This ensures that M2O relations can be created properly.
    """
    # Build dependency graph
    dependencies = {}
    collection_names = {c.get("collection") for c in collections}
    
    for collection in collections:
        name = collection.get("collection")
        dependencies[name] = set()
    
    for relation in relations:
        collection = relation.get("collection")
        related = relation.get("related_collection")
        
        if collection in dependencies and related in collection_names:
            dependencies[collection].add(related)
    
    # Topological sort
    sorted_collections = []
    visited = set()
    temp_visited = set()
    
    def visit(name):
        if name in temp_visited:
            return  # Circular dependency, skip
        if name in visited:
            return
        
        temp_visited.add(name)
        
        for dep in dependencies.get(name, set()):
            visit(dep)
        
        temp_visited.remove(name)
        visited.add(name)
        
        # Find the collection data
        for c in collections:
            if c.get("collection") == name:
                sorted_collections.append(c)
                break
    
    for collection in collections:
        visit(collection.get("collection"))
    
    return sorted_collections


def import_schema(schema_path: str, include_collections: Optional[List[str]] = None,
                  exclude_collections: Optional[List[str]] = None) -> Dict:
    """
    Import schema (collections, fields, relations) from export.
    
    Args:
        schema_path: Path to schema directory or schema_complete.json
        include_collections: Only import schema for these collections
        exclude_collections: Skip schema for these collections
    
    Returns:
        Summary dict
    """
    print("\n📋 Importing schema...")
    
    # Load schema
    schema_file = os.path.join(schema_path, "schema_complete.json")
    if os.path.exists(schema_file):
        schema = load_json(schema_file)
    else:
        schema = {
            "collections": load_json(os.path.join(schema_path, "collections.json")),
            "fields": load_json(os.path.join(schema_path, "fields.json")),
            "relations": load_json(os.path.join(schema_path, "relations.json"))
        }
    
    collections = schema.get("collections", [])
    fields = schema.get("fields", [])
    relations = schema.get("relations", [])
    
    # Filter by include/exclude
    if include_collections:
        # Auto-include parent group/folder collections so group structure is preserved
        include_set = set(include_collections)
        all_collections_map = {c.get("collection"): c for c in collections}
        for name in list(include_set):
            col = all_collections_map.get(name)
            if col:
                group = (col.get("meta") or {}).get("group")
                while group and group not in include_set:
                    include_set.add(group)
                    parent = all_collections_map.get(group)
                    group = (parent.get("meta") or {}).get("group") if parent else None
        if include_set - set(include_collections):
            print(f"  📂 Auto-including parent groups: {', '.join(include_set - set(include_collections))}")
        collections = [c for c in collections if c.get("collection") in include_set]
        fields = [f for f in fields if f.get("collection") in include_set]
        relations = [r for r in relations if r.get("collection") in include_set]
        print(f"  🔍 Filtering to collections: {', '.join(sorted(include_set))}")
    if exclude_collections:
        collections = [c for c in collections if c.get("collection") not in exclude_collections]
        fields = [f for f in fields if f.get("collection") not in exclude_collections]
        relations = [r for r in relations if r.get("collection") not in exclude_collections]
        print(f"  🔍 Excluding collections: {', '.join(exclude_collections)}")
    
    # Get existing collections to avoid duplicates
    existing_collections = get_existing_collections()
    
    # Sort collections by dependency
    sorted_collections = sort_collections_by_dependency(collections, relations)
    
    summary = {
        "collections": {"created": 0, "skipped": 0, "failed": 0},
        "fields": {"created": 0, "skipped": 0, "failed": 0},
        "relations": {"created": 0, "skipped": 0, "failed": 0}
    }
    
    # Build a set of collection names that will be created
    collection_names = {c.get("collection") for c in collections}
    
    # Identify relational fields (M2O fields that reference other collections)
    def is_relational_field(field: Dict) -> bool:
        """Check if field is a relational field (M2O, O2M, M2A, M2M)"""
        special = (field.get("meta") or {}).get("special") or []
        if isinstance(special, str):
            special = [special]
        relational_specials = ["m2o", "o2m", "m2m", "m2a", "file", "files"]
        return any(s in relational_specials for s in special)
    
    # Separate folder collections (no schema) from regular collections
    folder_collections = [c for c in sorted_collections if c.get("schema") is None]
    regular_collections = [c for c in sorted_collections if c.get("schema") is not None]
    
    # Build lookup of id fields by collection (to preserve PK type like uuid)
    id_fields_by_collection = {}
    for field in fields:
        if field.get("field") == "id":
            id_fields_by_collection[field.get("collection")] = field
    
    # 1a. Create folder/group collections first (they have no schema)
    if folder_collections:
        print("\n  📂 Creating folder collections...")
        for collection in folder_collections:
            collection_name = collection.get("collection")
            
            if collection_name in SYSTEM_COLLECTIONS:
                continue
            
            if collection_name in existing_collections:
                print(f"  ⏭️ Collection already exists: {collection_name}")
                summary["collections"]["skipped"] += 1
            else:
                if create_collection(collection, minimal=True):
                    summary["collections"]["created"] += 1
                else:
                    summary["collections"]["failed"] += 1
    
    # 1b. Create regular collections (with minimal schema - no FK constraints)
    print("\n  📁 Creating collections...")
    for collection in regular_collections:
        collection_name = collection.get("collection")
        
        if collection_name in SYSTEM_COLLECTIONS:
            continue
        
        if collection_name in existing_collections:
            print(f"  ⏭️ Collection already exists: {collection_name}")
            summary["collections"]["skipped"] += 1
        else:
            id_field = id_fields_by_collection.get(collection_name)
            if create_collection(collection, minimal=True, id_field=id_field):
                summary["collections"]["created"] += 1
            else:
                summary["collections"]["failed"] += 1
    
    # 2. Create fields for each collection - non-relational first, then relational
    print("\n  📝 Creating fields...")
    fields_by_collection = {}
    for field in fields:
        collection = field.get("collection")
        if collection not in fields_by_collection:
            fields_by_collection[collection] = []
        fields_by_collection[collection].append(field)
    
    # First pass: create non-relational fields
    print("\n    Phase 1: Non-relational fields...")
    for collection_name, collection_fields in fields_by_collection.items():
        if collection_name in SYSTEM_COLLECTIONS:
            continue
        
        # Get existing fields
        existing_fields = get_existing_fields(collection_name)
        
        # Only non-relational fields in this pass
        non_relational = [f for f in collection_fields if not is_relational_field(f)]
        
        for field in non_relational:
            field_name = field.get("field")
            
            if field_name in existing_fields:
                summary["fields"]["skipped"] += 1
                continue
            
            if create_field(collection_name, field):
                summary["fields"]["created"] += 1
            else:
                summary["fields"]["failed"] += 1
    
    # Second pass: create relational fields (all collections now exist)
    print("\n    Phase 2: Relational fields...")
    for collection_name, collection_fields in fields_by_collection.items():
        if collection_name in SYSTEM_COLLECTIONS:
            continue
        
        print(f"  📋 Relational fields for: {collection_name}")
        
        # Get existing fields (refresh after first pass)
        existing_fields = get_existing_fields(collection_name)
        
        # Only relational fields in this pass
        relational = [f for f in collection_fields if is_relational_field(f)]
        
        for field in relational:
            field_name = field.get("field")
            
            if field_name in existing_fields:
                summary["fields"]["skipped"] += 1
                continue
            
            if create_field(collection_name, field):
                summary["fields"]["created"] += 1
            else:
                summary["fields"]["failed"] += 1
    
    # 3. Create relations
    print("\n  🔗 Creating relations...")
    # Allow relations to directus_files (needed for file/image fields)
    allowed_system_targets = {"directus_files"}
    for relation in relations:
        if relation.get("collection") in SYSTEM_COLLECTIONS:
            continue
        related = relation.get("related_collection")
        if related in SYSTEM_COLLECTIONS and related not in allowed_system_targets:
            continue
        
        if create_relation(relation):
            summary["relations"]["created"] += 1
        else:
            summary["relations"]["failed"] += 1
    
    # 4. Update collection groups (now that all collections exist)
    print("\n  📂 Updating collection groups...")
    # Refresh existing collections (includes both pre-existing and newly created)
    all_target_collections = set(get_existing_collections())
    for collection in collections:
        collection_name = collection.get("collection")
        group = (collection.get("meta") or {}).get("group")
        
        if collection_name in SYSTEM_COLLECTIONS:
            continue
        
        if group and group in all_target_collections:
            # Update the collection's group
            url = f"{get_directus_url()}/collections/{collection_name}"
            payload = {"meta": {"group": group}}
            success, response = api_request("PATCH", url, json=payload)
            if success:
                print(f"  ✅ Set group for '{collection_name}' -> '{group}'")
            else:
                print(f"  ⚠️ Failed to set group for '{collection_name}': {response}")
    
    return summary


def get_m2o_fields(collection: str) -> set:
    """Get field names that are M2O (foreign key) relations for a collection."""
    success, data = api_request("GET", f"{get_directus_url()}/relations")
    if not success:
        return set()
    m2o_fields = set()
    for rel in data.get("data", []):
        if rel.get("collection") == collection and rel.get("related_collection"):
            field = rel.get("field")
            if field:
                m2o_fields.add(field)
    return m2o_fields


def import_collection_data(collection_name: str, items: List[Dict], 
                           id_mapping: Dict[str, Dict[int, int]] = None,
                           upsert: bool = False,
                           quiet: bool = False,
                           keep_nulls: bool = False) -> Tuple[int, int, Dict[int, int], List[Dict]]:
    """
    Import items into a collection.
    
    Args:
        collection_name: Name of the collection
        items: List of items to import
        id_mapping: Optional mapping of old IDs to new IDs for relations
        upsert: If True, update existing items; if False, skip them
    
    Returns:
        Tuple of (success_count, failed_count, new_id_mapping, deferred_fks)
        deferred_fks is a list of dicts: {"collection", "item_id", "fk_fields": {field: value}}
    """
    success = 0
    failed = 0
    new_id_mapping = {}
    deferred_fks = []  # Track FK fields stripped on retry for second-pass patching
    
    # Get field types to distinguish JSON fields from relation fields
    field_types = get_field_types(collection_name)
    
    # Get M2O (foreign key) fields for this collection — used for FK-error retry
    m2o_fields = get_m2o_fields(collection_name)
    
    # Detect ID type mismatch: if export has UUID IDs but target has integer PKs (or vice versa),
    # strip the id field to let Directus auto-generate new IDs
    strip_id = False
    target_id_type = field_types.get("id")
    if items and items[0].get("id") is not None and target_id_type:
        sample_id = items[0]["id"]
        # UUID string IDs into integer PK collection (or vice versa) => strip
        if isinstance(sample_id, str) and target_id_type == "integer":
            strip_id = True
            print(f"    ⚠️ ID type mismatch (export=uuid, target=integer) — stripping IDs, Directus will auto-generate")
        elif isinstance(sample_id, int) and target_id_type == "uuid":
            strip_id = True
            print(f"    ⚠️ ID type mismatch (export=integer, target=uuid) — stripping IDs, Directus will auto-generate")
    
    total_items = len(items)
    
    for index, item in enumerate(items, start=1):
        old_id = item.get("id")
        item_name = item.get("name")
        item_label = item_name or old_id or f"item_{index}"
        status_prefix = f"      [{index}/{total_items}]"
        if not quiet:
            print(f"{status_prefix} Processing {item_label}")
        
        # Keep the original ID to maintain relations (unless type mismatch)
        item_to_insert = item.copy()
        if strip_id:
            item_to_insert.pop("id", None)
        
        # Strip out fields that might cause issues:
        # - O2M/M2A fields (arrays with type 'alias') - these are alias fields populated via junction tables
        # - user_created/user_updated - might reference non-existent users
        # - null values: stripping them avoids triggering Directus validation rules on nullable fields;
        #   Directus defaults nullable fields to null anyway
        # BUT keep JSON fields (type 'json') even if they contain arrays
        fields_to_strip = []
        for key, value in item_to_insert.items():
            # Strip array fields ONLY if they are alias fields (O2M, M2A relations)
            # JSON fields with arrays should be kept
            if isinstance(value, list):
                field_type = field_types.get(key)
                # Only strip if it's an alias field (relation) or type is unknown
                # Keep if it's a JSON field
                if field_type != "json":
                    fields_to_strip.append(key)
            # Strip user reference fields
            elif key in ["user_created", "user_updated"]:
                fields_to_strip.append(key)
            # Strip null values to avoid triggering validation on nullable fields
            # But keep nulls when upserting — user may intentionally want to clear fields
            elif value is None and not keep_nulls:
                fields_to_strip.append(key)
        
        for field in fields_to_strip:
            del item_to_insert[field]
        
        # Update foreign key references using id_mapping
        if id_mapping:
            for key, value in item_to_insert.items():
                if isinstance(value, int) and key.endswith("_id"):
                    # This might be a foreign key
                    related_collection = key[:-3]  # Remove '_id' suffix
                    if related_collection in id_mapping and value in id_mapping[related_collection]:
                        item_to_insert[key] = id_mapping[related_collection][value]
        
        url = f"{get_directus_url()}/items/{collection_name}"
        
        if upsert and old_id:
            # Try to update first — verify response has data to confirm item actually exists
            item_for_patch = {k: v for k, v in item_to_insert.items() if k != "id"}
            success_flag, response = api_request("PATCH", f"{url}/{old_id}", json=item_for_patch)
            if success_flag and response and response.get("data"):
                # PATCH succeeded and returned item data — confirmed update
                success += 1
                new_id_mapping[old_id] = old_id
                if not quiet:
                    print(f"{status_prefix} 🔄 Updated existing item: {item_label}")
                continue
            # PATCH failed or returned empty — item doesn't exist, fall through to POST
        
        # Create new item
        success_flag, response = api_request("POST", url, json=item_to_insert)
        
        if success_flag:
            success += 1
            new_id = response.get("data", {}).get("id", old_id)
            if old_id:
                new_id_mapping[old_id] = new_id
            if not quiet:
                print(f"{status_prefix} ✅ Created item: {item_label}")
        else:
            # If duplicate/unique error, the item exists — update it via PATCH
            error_msg_lower = str(response).lower()
            if old_id and ("duplicate" in error_msg_lower or "record_not_unique" in error_msg_lower or "unique" in error_msg_lower):
                item_for_patch = {k: v for k, v in item_to_insert.items() if k != "id"}
                success_flag, response = api_request("PATCH", f"{url}/{old_id}", json=item_for_patch)
                if success_flag:
                    success += 1
                    new_id_mapping[old_id] = old_id
                    if not quiet:
                        print(f"{status_prefix} 🔄 Updated existing item after duplicate check: {item_label}")
                else:
                    failed += 1
                    print(f"{status_prefix} ⚠️ Failed to import item {item_label}: {response}")
            else:
                # Check if this is a foreign key / relational error — retry without FK fields
                error_msg = str(response).lower()
                is_fk_error = any(kw in error_msg for kw in [
                    "foreign", "constraint", "violates", "invalid foreign key",
                    "related values are not allowed", "field_invalid",
                ])
                
                if is_fk_error and m2o_fields:
                    # Strip M2O FK fields that have values and retry
                    stripped_fks = {}
                    item_no_fk = item_to_insert.copy()
                    for fk_field in m2o_fields:
                        if fk_field in item_no_fk and item_no_fk[fk_field] is not None:
                            stripped_fks[fk_field] = item_no_fk.pop(fk_field)
                    
                    if stripped_fks:
                        if not quiet:
                            print(f"{status_prefix} 🔄 FK error for {item_label}, retrying without: {', '.join(stripped_fks.keys())}")
                        success_flag, response = api_request("POST", url, json=item_no_fk)
                        if success_flag:
                            success += 1
                            new_id = response.get("data", {}).get("id", old_id)
                            if old_id:
                                new_id_mapping[old_id] = new_id
                            # Track deferred FK values for second-pass patching
                            deferred_fks.append({
                                "collection": collection_name,
                                "item_id": new_id,
                                "fk_fields": stripped_fks
                            })
                            if not quiet:
                                print(f"{status_prefix} ✅ Created item with deferred FKs: {item_label}")
                        else:
                            failed += 1
                            print(f"{status_prefix} ⚠️ Failed to import item {item_label} even without FKs: {response}")
                    else:
                        failed += 1
                        print(f"{status_prefix} ⚠️ Failed to import item {item_label}: {response}")
                else:
                    failed += 1
                    print(f"{status_prefix} ⚠️ Failed to import item {item_label}: {response}")
    
    return success, failed, new_id_mapping, deferred_fks


def patch_deferred_fks(all_deferred: List[Dict], quiet: bool = False) -> Tuple[int, int]:
    """
    Second pass: patch deferred FK values back onto items that were created without them.
    
    Args:
        all_deferred: List of dicts with {"collection", "item_id", "fk_fields": {field: value}}
    
    Returns:
        Tuple of (patched_count, failed_count)
    """
    if not all_deferred:
        return 0, 0
    
    print(f"\n  🔗 Patching {len(all_deferred)} deferred FK references...")
    patched = 0
    failed = 0
    
    for entry in all_deferred:
        collection = entry["collection"]
        item_id = entry["item_id"]
        fk_fields = entry["fk_fields"]
        
        url = f"{get_directus_url()}/items/{collection}/{item_id}"
        success_flag, response = api_request("PATCH", url, json=fk_fields)
        
        if success_flag:
            patched += 1
        else:
            failed += 1
            print(f"      ⚠️ Failed to patch FKs on {collection}/{item_id}: {response}")
    
    if not quiet:
        print(f"    ✅ {patched} patched, ❌ {failed} failed")
    return patched, failed


def sort_data_by_dependency(data_files: List[str], relations: List[Dict]) -> List[str]:
    """
    Sort data files so that referenced collections are imported first.
    
    Args:
        data_files: List of JSON filenames (e.g., ['posts.json', 'authors.json'])
        relations: List of relation definitions from schema
    
    Returns:
        Sorted list of filenames
    """
    # Build dependency graph from relations
    # If collection A has M2O to collection B, then B must be imported before A
    dependencies = {}
    collection_names = {f.replace('.json', '') for f in data_files}
    
    for name in collection_names:
        dependencies[name] = set()
    
    for relation in relations:
        collection = relation.get("collection")  # The "many" side
        related = relation.get("related_collection")  # The "one" side
        
        # collection depends on related (related should be imported first)
        if collection in dependencies and related in collection_names:
            dependencies[collection].add(related)
    
    # Topological sort
    sorted_names = []
    visited = set()
    temp_visited = set()
    
    def visit(name):
        if name in temp_visited:
            return  # Circular dependency, skip
        if name in visited:
            return
        
        temp_visited.add(name)
        
        for dep in dependencies.get(name, set()):
            visit(dep)
        
        temp_visited.remove(name)
        visited.add(name)
        sorted_names.append(name)
    
    for name in collection_names:
        visit(name)
    
    # Convert back to filenames
    return [f"{name}.json" for name in sorted_names]


def import_data(data_path: str, include_collections: Optional[List[str]] = None,
                exclude_collections: Optional[List[str]] = None,
                upsert: bool = False,
                source_path: str = None,
                skip_validation: bool = False,
                quiet: bool = False) -> Dict:
    """
    Import collection data from export.
    
    Args:
        data_path: Path to data directory
        include_collections: Only import these collections
        exclude_collections: Skip these collections
        upsert: Update existing items instead of skipping
        source_path: Base export path (for loading relations)
    
    Returns:
        Summary dict
    """
    print("\n📦 Importing collection data...")
    
    summary = {}
    id_mapping = {}  # Track ID changes for maintaining relations
    all_deferred_fks = []  # Collect deferred FK patches across all collections
    
    # Get list of data files
    data_files = [f for f in os.listdir(data_path) if f.endswith('.json') and not f.startswith('_')]
    
    # Try to load relations for dependency sorting
    relations = []
    if source_path:
        schema_path = os.path.join(source_path, "schema")
        relations_file = os.path.join(schema_path, "relations.json")
        if os.path.exists(relations_file):
            relations = load_json(relations_file)
        else:
            # Try schema_complete.json
            schema_complete_file = os.path.join(schema_path, "schema_complete.json")
            if os.path.exists(schema_complete_file):
                schema = load_json(schema_complete_file)
                relations = schema.get("relations", [])
    
    # Sort by FK dependencies if we have relations
    if relations:
        print("  🔗 Sorting collections by FK dependencies...")
        data_files = sort_data_by_dependency(data_files, relations)
    else:
        # Fall back to manifest order if available
        manifest_path = os.path.join(data_path, "_manifest.json")
        if os.path.exists(manifest_path):
            manifest = load_json(manifest_path)
            collection_order = list(manifest.get("collections_exported", {}).keys())
            data_files = sorted(data_files, key=lambda x: (
                collection_order.index(x.replace('.json', '')) 
                if x.replace('.json', '') in collection_order else 999
            ))
    
    # Determine which collections will actually be imported
    collections_to_import = []
    for data_file in data_files:
        collection_name = data_file.replace('.json', '')
        if include_collections and collection_name not in include_collections:
            continue
        if exclude_collections and collection_name in exclude_collections:
            continue
        if collection_name in SYSTEM_COLLECTIONS:
            continue
        collections_to_import.append(collection_name)

    # Temporarily disable validation if requested
    saved_validation = {}
    if skip_validation and collections_to_import:
        print("  🔓 Disabling field validation for import...")
        saved_validation = disable_field_validation(collections_to_import)

    try:
        for data_file in data_files:
            collection_name = data_file.replace('.json', '')
            
            # Apply filters
            if collection_name not in collections_to_import:
                continue
            
            filepath = os.path.join(data_path, data_file)
            items = load_json(filepath)
            
            if not items:
                print(f"  ⏭️ No data in: {collection_name}")
                continue
            
            # Singleton collections may be exported as a single object — wrap in a list
            if isinstance(items, dict):
                items = [items]
            
            # Validate that items are dictionaries (not strings or other types)
            if not isinstance(items, list) or (items and not isinstance(items[0], dict)):
                print(f"  ⚠️ Invalid data format in {collection_name}, skipping (expected list of objects)")
                continue
            
            print(f"  📥 Importing {len(items)} items into: {collection_name}")
            
            success, failed, new_mapping, deferred_fks = import_collection_data(
                collection_name, items, id_mapping, upsert, quiet=quiet,
                keep_nulls=upsert
            )
            
            id_mapping[collection_name] = new_mapping
            all_deferred_fks.extend(deferred_fks)
            
            deferred_count = len(deferred_fks)
            deferred_note = f", 🔄 {deferred_count} deferred" if deferred_count else ""
            summary[collection_name] = {"success": success, "failed": failed, "total": len(items), "deferred": deferred_count}
            print(f"    ✅ {success} imported, ❌ {failed} failed{deferred_note}")
        # Second pass: patch deferred FK references now that all collections have data
        if all_deferred_fks:
            fk_patched, fk_failed = patch_deferred_fks(all_deferred_fks, quiet=quiet)
            summary["_deferred_fks"] = {"patched": fk_patched, "failed": fk_failed, "total": len(all_deferred_fks)}
    finally:
        # Always restore validation rules, even if import fails
        if saved_validation:
            print("  🔒 Restoring field validation...")
            restore_field_validation(saved_validation)
    
    return summary


def create_folder(folder_data: Dict, folder_mapping: Dict[str, str]) -> Tuple[bool, Optional[str]]:
    """
    Create a folder in Directus, preserving original ID.
    
    Returns:
        Tuple of (success, new_folder_id)
    """
    old_id = folder_data.get("id")
    
    payload = {
        "id": old_id,  # Preserve original UUID
        "name": folder_data.get("name"),
    }
    
    # Map parent folder if exists
    parent = folder_data.get("parent")
    if parent and parent in folder_mapping:
        payload["parent"] = folder_mapping[parent]
    elif parent:
        payload["parent"] = parent
    
    success, response = api_request("POST", f"{get_directus_url()}/folders", json=payload)
    
    if success:
        new_id = response.get("data", {}).get("id", old_id)
        return True, new_id
    elif response.get("error") == "already_exists":
        return True, old_id
    
    return False, None


def upload_file(file_info: Dict, files_path: str, folder_mapping: Dict[str, str],
                placeholder_files: bool = False) -> Tuple[bool, bool]:
    """
    Upload a file to Directus, preserving original ID and filename.
    
    Args:
        file_info: File metadata
        files_path: Path to files directory
        folder_mapping: Mapping of old folder IDs to new folder IDs
        placeholder_files: If True, upload a zero-byte placeholder when source file is missing
    
    Returns:
        Tuple of (success, used_placeholder)
    """
    file_id = file_info.get("id")
    filename_download = file_info.get("filename_download", f"{file_id}")
    filename_disk = file_info.get("filename_disk", filename_download)
    mime_type = file_info.get("type", "application/octet-stream")
    used_placeholder = False
    
    # Find the file
    folder_id = file_info.get("folder")
    if folder_id:
        file_dir = os.path.join(files_path, str(folder_id))
    else:
        file_dir = files_path
    
    filepath = os.path.join(file_dir, f"{file_id}_{filename_download}")
    
    if not os.path.exists(filepath):
        # Try without the ID prefix
        filepath = os.path.join(file_dir, filename_download)
        if not os.path.exists(filepath):
            if not placeholder_files:
                logging.error("File not found: %s", filename_download)
                print(f"    ⚠️ File not found: {filename_download}")
                return False, False
            used_placeholder = True
    
    # Prepare metadata - include original ID and filename_disk
    metadata = {
        "id": file_id,  # Preserve original UUID
        "filename_disk": filename_disk,  # Preserve storage filename
        "filename_download": filename_download,  # Preserve download filename
        "title": file_info.get("title", ""),
        "description": file_info.get("description", ""),
    }
    
    # Map folder
    if folder_id and folder_id in folder_mapping:
        metadata["folder"] = folder_mapping[folder_id]
    elif folder_id:
        metadata["folder"] = folder_id
    
    # Upload file
    url = f"{get_directus_url()}/files"
    
    try:
        if used_placeholder:
            file_handle, upload_filename, upload_mime_type = build_placeholder_upload(
                filename_disk,
                mime_type
            )
            if filename_download:
                print(f"    📝 Uploading placeholder file for missing asset: {filename_download}")
        else:
            file_handle = open(filepath, 'rb')
            upload_filename = filename_disk
            upload_mime_type = mime_type

        with file_handle as f:
            # Include MIME type to ensure correct file type detection
            # Use filename_disk as the upload filename to preserve it
            files = {'file': (upload_filename, f, upload_mime_type)}
            data = {k: v for k, v in metadata.items() if v}
            
            # Remove Content-Type header for multipart upload
            upload_headers = {"Authorization": get_headers()["Authorization"]}
            
            response = requests.post(url, headers=upload_headers, files=files, data=data)
            
            if response.status_code in [200, 201]:
                return True, used_placeholder
            else:
                logging.error("Failed to upload %s: %s - %s", filename_download, response.status_code, response.text[:2000])
                print(f"    ⚠️ Failed to upload {filename_download}: {response.status_code} - {response.text[:200]}")
                return False, used_placeholder
    except Exception as e:
        logging.exception("Error uploading %s", filename_download)
        print(f"    ⚠️ Error uploading {filename_download}: {str(e)}")
        return False, used_placeholder


def import_files(export_path: str, max_workers: int = 3,
                 placeholder_files: bool = False) -> Dict:
    """
    Import folders and files from export.
    
    Args:
        export_path: Base export path
        max_workers: Number of parallel upload threads
        placeholder_files: If True, create placeholder assets for missing source files
    
    Returns:
        Summary dict
    """
    print("\n📁 Importing files...")
    
    summary = {
        "folders": {"created": 0, "failed": 0},
        "files": {"uploaded": 0, "failed": 0, "placeholder": 0}
    }
    
    # 1. Import folders first
    folders_file = os.path.join(export_path, "folders.json")
    folder_mapping = {}
    
    if os.path.exists(folders_file):
        folders = load_json(folders_file)
        print(f"  📂 Creating {len(folders)} folders...")
        
        # Topological sort: create parent folders before children at any depth
        folder_by_id = {f.get("id"): f for f in folders}
        sorted_folders = []
        visited = set()
        
        def visit_folder(fid):
            if fid in visited or fid not in folder_by_id:
                return
            parent = folder_by_id[fid].get("parent")
            if parent and parent in folder_by_id:
                visit_folder(parent)
            visited.add(fid)
            sorted_folders.append(folder_by_id[fid])
        
        for f in folders:
            visit_folder(f.get("id"))
        
        for folder in sorted_folders:
            success, new_id = create_folder(folder, folder_mapping)
            if success:
                folder_mapping[folder.get("id")] = new_id
                summary["folders"]["created"] += 1
            else:
                summary["folders"]["failed"] += 1
    
    # 2. Import files
    files_metadata_path = os.path.join(export_path, "files_metadata.json")
    files_path = os.path.join(export_path, "files")
    
    if os.path.exists(files_metadata_path) and (os.path.exists(files_path) or placeholder_files):
        files_metadata = load_json(files_metadata_path)
        print(f"  📄 Uploading {len(files_metadata)} files...")
        
        uploaded = 0
        failed = 0
        placeholders = 0
        
        for file_info in files_metadata:
            success, used_placeholder = upload_file(
                file_info,
                files_path,
                folder_mapping,
                placeholder_files=placeholder_files
            )
            if success:
                uploaded += 1
                if used_placeholder:
                    placeholders += 1
            else:
                failed += 1
            
            total = uploaded + failed
            if total % 10 == 0:
                print(f"    📤 Progress: {total}/{len(files_metadata)} files...")
        
        summary["files"]["uploaded"] = uploaded
        summary["files"]["failed"] = failed
        summary["files"]["placeholder"] = placeholders
    
    return summary


def import_flow(flow_data: Dict) -> bool:
    """
    Import a single flow into Directus.
    
    Args:
        flow_data: Flow definition from export
    
    Returns:
        True if successful or already exists
    """
    flow_id = flow_data.get("id")
    flow_name = flow_data.get("name", flow_id)
    
    # Remove operation field - operations are imported separately
    payload = {k: v for k, v in flow_data.items() if k != "operations"}
    
    success, response = api_request("POST", f"{get_directus_url()}/flows", json=payload)
    
    if success:
        print(f"  ✅ Flow created: {flow_name}")
        return True
    elif response.get("error") == "already_exists":
        print(f"  ⏭️ Flow already exists: {flow_name}")
        return True
    else:
        print(f"  ❌ Failed to create flow '{flow_name}': {response}")
        return False


def import_operation(operation_data: Dict, skip_references: bool = False) -> bool:
    """
    Import a single operation into Directus.
    
    Args:
        operation_data: Operation definition from export
        skip_references: If True, omit resolve/reject fields (for first pass)
    
    Returns:
        True if successful or already exists
    """
    op_id = operation_data.get("id")
    op_name = operation_data.get("name", op_id)
    
    # If skip_references, remove resolve/reject to avoid FK errors
    if skip_references:
        payload = {k: v for k, v in operation_data.items() if k not in ["resolve", "reject"]}
    else:
        payload = operation_data
    
    success, response = api_request("POST", f"{get_directus_url()}/operations", json=payload)
    
    if success:
        print(f"    ✅ Operation created: {op_name}")
        return True
    elif response.get("error") == "already_exists":
        print(f"    ⏭️ Operation already exists: {op_name}")
        return True
    else:
        print(f"    ❌ Failed to create operation '{op_name}': {response}")
        return False


def update_operation_references(operation_data: Dict) -> bool:
    """
    Update an operation's resolve/reject references.
    
    Args:
        operation_data: Operation definition with resolve/reject fields
    
    Returns:
        True if successful
    """
    op_id = operation_data.get("id")
    op_name = operation_data.get("name", op_id)
    
    resolve = operation_data.get("resolve")
    reject = operation_data.get("reject")
    
    if not resolve and not reject:
        return True  # Nothing to update
    
    payload = {}
    if resolve:
        payload["resolve"] = resolve
    if reject:
        payload["reject"] = reject
    
    success, response = api_request("PATCH", f"{get_directus_url()}/operations/{op_id}", json=payload)
    
    if success:
        print(f"    🔗 Operation references updated: {op_name}")
        return True
    else:
        print(f"    ⚠️ Failed to update references for '{op_name}': {response}")
        return False


def import_flows(export_path: str) -> Dict:
    """
    Import flows and operations from export.
    
    Args:
        export_path: Base export path
    
    Returns:
        Summary dict
    """
    print("\n⚡ Importing flows...")
    
    summary = {
        "flows": {"created": 0, "skipped": 0, "failed": 0},
        "operations": {"created": 0, "skipped": 0, "failed": 0}
    }
    
    flows_path = os.path.join(export_path, "flows")
    
    # Try complete file first, then individual files
    flows_complete_file = os.path.join(flows_path, "flows_complete.json")
    flows_file = os.path.join(flows_path, "flows.json")
    operations_file = os.path.join(flows_path, "operations.json")
    
    flows = []
    operations = []
    
    if os.path.exists(flows_complete_file):
        data = load_json(flows_complete_file)
        flows = data.get("flows", [])
        operations = data.get("operations", [])
    else:
        if os.path.exists(flows_file):
            flows = load_json(flows_file)
        if os.path.exists(operations_file):
            operations = load_json(operations_file)
    
    if not flows and not operations:
        print("  ℹ️ No flows found to import")
        return summary
    
    # 1. Import flows first
    print(f"  ⚡ Creating {len(flows)} flows...")
    for flow in flows:
        result = import_flow(flow)
        if result:
            summary["flows"]["created"] += 1
        else:
            summary["flows"]["failed"] += 1
    
    # 2. Import operations (they reference flows)
    # Two-pass approach to handle operation dependencies (resolve/reject references)
    if operations:
        print(f"  ⚙️ Creating {len(operations)} operations...")
        
        # First pass: create all operations WITHOUT resolve/reject references
        for op in operations:
            result = import_operation(op, skip_references=True)
            if result:
                summary["operations"]["created"] += 1
            else:
                summary["operations"]["failed"] += 1
        
        # Second pass: update resolve/reject references now that all operations exist
        ops_with_references = [op for op in operations if op.get("resolve") or op.get("reject")]
        if ops_with_references:
            print(f"  🔗 Updating {len(ops_with_references)} operation references...")
            for op in ops_with_references:
                update_operation_references(op)
    
    return summary


def run_import(
    export_path: str,
    import_schema_flag: bool = True,
    import_data_flag: bool = True,
    import_files_flag: bool = True,
    import_flows_flag: bool = True,
    include_collections: Optional[List[str]] = None,
    exclude_collections: Optional[List[str]] = None,
    upsert: bool = False,
    skip_validation: bool = False,
    quiet: bool = False,
    placeholder_files: bool = False,
    *,
    url: Optional[str] = None,
    token: Optional[str] = None,
) -> Dict:
    """
    Run the complete import process.

    Args:
        export_path: Path to export directory
        import_schema_flag: Import schema (collections, fields, relations)
        import_data_flag: Import collection data
        import_files_flag: Import files
        import_flows_flag: Import flows and operations
        include_collections: Only import these collections
        exclude_collections: Skip these collections
        upsert: Update existing items instead of skipping
        url: Optional Directus base URL (sets thread config with token)
        token: Optional static token

    Returns:
        Summary dict
    """
    if url is not None or token is not None:
        if not url or not token:
            raise DirectusImportError(
                "Both url and token are required when overriding config"
            )
        configure(url, token)

    target = get_directus_url()
    print("=" * 60)
    print("🚀 DIRECTUS IMPORT")
    print(f"   Target: {target}")
    print(f"   Source: {export_path}")
    print(f"   Time: {datetime.now().isoformat()}")
    print("=" * 60)

    if not os.path.exists(export_path):
        raise DirectusImportError(f"Export path not found: {export_path}")

    try:
        response = requests.get(
            f"{target}/server/info",
            headers=get_headers(),
            timeout=30,
        )
        if response.status_code != 200:
            raise DirectusImportError(
                f"Cannot connect to Directus: HTTP {response.status_code}"
            )
        print("✅ Connected to Directus")
    except DirectusImportError:
        raise
    except Exception as e:
        raise DirectusImportError(f"Connection error: {e}") from e

    summary = {
        "export_path": export_path,
        "target_url": target,
        "import_date": datetime.now().isoformat(),
    }

    if import_schema_flag:
        schema_path = os.path.join(export_path, "schema")
        if os.path.exists(schema_path):
            schema_summary = import_schema(
                schema_path, include_collections, exclude_collections
            )
            summary["schema"] = schema_summary
        else:
            print("⚠️ Schema directory not found, skipping...")

    if import_data_flag:
        data_path = os.path.join(export_path, "data")
        if os.path.exists(data_path):
            data_summary = import_data(
                data_path,
                include_collections,
                exclude_collections,
                upsert,
                source_path=export_path,
                skip_validation=skip_validation,
                quiet=quiet,
            )
            summary["data"] = data_summary
        else:
            print("⚠️ Data directory not found, skipping...")

    if import_files_flag:
        files_summary = import_files(
            export_path, placeholder_files=placeholder_files
        )
        summary["files"] = files_summary

    if import_flows_flag:
        flows_path = os.path.join(export_path, "flows")
        if os.path.exists(flows_path):
            flows_summary = import_flows(export_path)
            summary["flows"] = flows_summary
        else:
            print("⚠️ Flows directory not found, skipping...")

    print("\n" + "=" * 60)
    print("✅ IMPORT COMPLETE")
    print("=" * 60)

    if "schema" in summary:
        s = summary["schema"]
        print(f"\n📋 Schema:")
        print(
            f"   Collections: {s['collections']['created']} created, "
            f"{s['collections']['skipped']} skipped"
        )
        print(
            f"   Fields: {s['fields']['created']} created, "
            f"{s['fields']['skipped']} skipped"
        )
        print(f"   Relations: {s['relations']['created']} created")

    if "data" in summary:
        data_collections = {
            k: v for k, v in summary["data"].items() if k != "_deferred_fks"
        }
        total_success = sum(c.get("success", 0) for c in data_collections.values())
        total_failed = sum(c.get("failed", 0) for c in data_collections.values())
        total_deferred = sum(c.get("deferred", 0) for c in data_collections.values())
        deferred_info = ""
        if "_deferred_fks" in summary["data"]:
            dfk = summary["data"]["_deferred_fks"]
            deferred_info = (
                f"\n   Deferred FKs: {dfk['patched']} patched, "
                f"{dfk['failed']} failed (of {dfk['total']} total)"
            )
        print(
            f"\n📦 Data: {total_success} items imported, {total_failed} failed, "
            f"{total_deferred} deferred FK retries{deferred_info}"
        )

    if "files" in summary:
        f = summary["files"]
        placeholder_info = ""
        if f["files"].get("placeholder"):
            placeholder_info = f", {f['files']['placeholder']} placeholders"
        print(
            f"\n📁 Files: {f['files']['uploaded']} uploaded, "
            f"{f['files']['failed']} failed{placeholder_info}"
        )
        print(f"   Folders: {f['folders']['created']} created")

    if "flows" in summary:
        fl = summary["flows"]
        print(
            f"\n⚡ Flows: {fl['flows']['created']} created, "
            f"{fl['flows']['failed']} failed"
        )
        print(
            f"   Operations: {fl['operations']['created']} created, "
            f"{fl['operations']['failed']} failed"
        )

    return summary



# CLI Configuration
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Import Directus data models, collections, and files")
    parser.add_argument("--source", required=True, help="Path to export directory")
    parser.add_argument("--url", default=DIRECTUS_URL, help="Target Directus instance URL")
    parser.add_argument("--token", default=ACCESS_TOKEN, help="Access token")
    parser.add_argument("--log-file", help="Path to log file to write errors and diagnostics")
    parser.add_argument("--no-schema", action="store_true", help="Skip schema import")
    parser.add_argument("--no-data", action="store_true", help="Skip data import")
    parser.add_argument("--no-files", action="store_true", help="Skip files import")
    parser.add_argument("--no-flows", action="store_true", help="Skip flows import")
    parser.add_argument("--schema-only", action="store_true", help="Import only schema (no data or files)")
    parser.add_argument("--data-only", action="store_true", help="Import only data (no schema or files)")
    parser.add_argument("--files-only", action="store_true", help="Import only files (no schema or data)")
    parser.add_argument("--flows-only", action="store_true", help="Import only flows (no schema, data or files)")
    parser.add_argument("--include", nargs="+", help="Only import these collections")
    parser.add_argument("--exclude", nargs="+", help="Exclude these collections")
    parser.add_argument("--upsert", action="store_true", help="Update existing items instead of skipping")
    parser.add_argument("--skip-validation", action="store_true", help="Temporarily disable field validation rules during data import")
    parser.add_argument("--quiet", action="store_true", help="Suppress per-item success/progress logging (errors still shown)")
    parser.add_argument("--placeholder-files", action="store_true", help="Upload zero-byte placeholder assets when source files are missing")
    
    args = parser.parse_args()
    
    configure(args.url, args.token)
    # Ensure logs directory exists next to the script and write logs there
    script_dir = Path(__file__).resolve().parent
    logs_dir = script_dir / "logs"
    try:
        logs_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"⚠️ Could not create logs directory {logs_dir}: {e}")

    # Determine filename: use provided basename or default timestamped name
    if getattr(args, 'log_file', None):
        log_filename = os.path.basename(args.log_file)
    else:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_filename = f"import_{ts}.log"

    log_path = logs_dir / log_filename

    # Configure logging: console + file inside logs_dir
    log_handlers = [logging.StreamHandler(sys.stdout)]
    try:
        fh = logging.FileHandler(log_path, encoding='utf-8')
        log_handlers.append(fh)
    except Exception as e:
        print(f"⚠️ Could not open log file {log_path}: {e}")

    logging.basicConfig(level=logging.INFO, handlers=log_handlers,
                        format="%(asctime)s %(levelname)s: %(message)s")
    logger = logging.getLogger(__name__)
    logging.info("Logging to %s", log_path)
    
    # Determine what to import based on flags
    do_schema = not args.no_schema
    do_data = not args.no_data
    do_files = not args.no_files
    do_flows = not args.no_flows
    
    # Handle "only" flags (mutually exclusive shortcuts)
    if args.schema_only:
        do_schema, do_data, do_files, do_flows = True, False, False, False
    elif args.data_only:
        do_schema, do_data, do_files, do_flows = False, True, False, False
    elif args.files_only:
        do_schema, do_data, do_files, do_flows = False, False, True, False
    elif args.flows_only:
        do_schema, do_data, do_files, do_flows = False, False, False, True
    
    try:
        run_import(
            export_path=args.source,
            import_schema_flag=do_schema,
            import_data_flag=do_data,
            import_files_flag=do_files,
            import_flows_flag=do_flows,
            include_collections=args.include,
            exclude_collections=args.exclude,
            upsert=args.upsert,
            skip_validation=args.skip_validation,
            quiet=args.quiet,
            placeholder_files=args.placeholder_files
        )
    except Exception:
        logging.exception("Unhandled exception during import")
        sys.exit(1)
