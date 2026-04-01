from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    note: str | None = Field(default=None, max_length=4000)
    source_cms: str | None = Field(default=None, max_length=64)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("Name is required")
        return name

    @field_validator("note")
    @classmethod
    def normalize_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        note = value.strip()
        return note or None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    note: str | None = Field(default=None, max_length=4000)
    status: str | None = Field(default=None, max_length=32)
    source_cms: str | None = Field(default=None, max_length=64)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        name = value.strip()
        if not name:
            raise ValueError("Name is required")
        return name


class DirectusTargetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    url: str = Field(min_length=1, max_length=512)
    token: str = Field(min_length=1, max_length=512)
    make_active: bool = False

    @field_validator("name", "url", "token")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Value is required")
        return cleaned


class DirectusTargetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    url: str | None = Field(default=None, min_length=1, max_length=512)
    token: str | None = Field(default=None, min_length=1, max_length=512)
    summary: str | None = Field(default=None, max_length=512)
    make_active: bool | None = None


class DirectusTargetOut(BaseModel):
    id: int
    project_id: int
    name: str
    url: str
    is_active: bool
    summary: str | None
    token_hint: str
    last_test_ok: bool | None
    last_test_detail: str | None
    last_tested_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectUploadOut(BaseModel):
    id: int
    project_id: int
    original_name: str
    stored_name: str
    size_bytes: int
    content_type: str | None
    status: str
    error_detail: str | None = None
    extracted_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectSourceFileOut(BaseModel):
    id: int
    project_id: int
    upload_id: int
    relative_path: str
    original_name: str
    kind: str
    size_bytes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PrepareAssetsRequest(BaseModel):
    """Build prepared/target_{id}/ from an extracted media folder."""

    upload_id: int
    folder_path: str = Field(
        default="",
        max_length=1024,
        description="Relative path under extracted/upload_{id}/ (e.g. export1/files)",
    )
    mode: str = Field(default="generate", pattern="^(directus|map|generate)$")
    placeholders: bool = True
    metadata_file_id: int | None = None

    @field_validator("folder_path")
    @classmethod
    def normalize_folder_path(cls, value: str) -> str:
        return value.replace("\\", "/").strip().strip("/")


class PrepareAssetsOut(BaseModel):
    output_path: str
    mode: str
    records: int
    copied: int
    placeholders: int
    skipped: int
    missing: int
    folders: int


class PrepareSchemaRequest(BaseModel):
    """Copy Directus schema/ from extracted into prepared/target_{id}/schema/."""

    upload_id: int
    folder_path: str = Field(
        default="",
        max_length=1024,
        description="Relative path under extracted/upload_{id}/ (e.g. export1)",
    )
    dry_run: bool = False

    @field_validator("folder_path")
    @classmethod
    def normalize_folder_path(cls, value: str) -> str:
        return value.replace("\\", "/").strip().strip("/")


class SchemaFileRow(BaseModel):
    name: str
    role: str
    detail: str
    status: str


class PrepareSchemaOut(BaseModel):
    compatible: bool
    json_files: int
    schema_folder: str | None = None
    collections: int = 0
    fields: int = 0
    relations: int = 0
    schema_files: list[SchemaFileRow] = []
    deferred_files: list[SchemaFileRow] = []
    source_label: str = ""
    output_path: str | None = None
    copied_files: list[str] = []
    copied: int = 0


class PrepareDataRequest(BaseModel):
    """Copy Directus data/ from extracted into prepared/target_{id}/data/."""

    upload_id: int
    folder_path: str = Field(
        default="",
        max_length=1024,
        description="Relative path under extracted/upload_{id}/ (e.g. export1 or export1/data)",
    )
    dry_run: bool = False

    @field_validator("folder_path")
    @classmethod
    def normalize_folder_path(cls, value: str) -> str:
        return value.replace("\\", "/").strip().strip("/")


class DataFileRow(BaseModel):
    name: str
    role: str
    detail: str
    status: str
    rows: int = 0


class PrepareDataOut(BaseModel):
    compatible: bool
    json_files: int
    data_folder: str | None = None
    collections: int = 0
    rows: int = 0
    data_files: list[DataFileRow] = []
    deferred_files: list[DataFileRow] = []
    source_label: str = ""
    output_path: str | None = None
    copied_files: list[str] = []
    copied: int = 0


class PreparedStatusOut(BaseModel):
    """What is already on disk under prepared/target_{id}/."""

    path: str
    exists: bool
    has_schema: bool = False
    has_data: bool = False
    has_files: bool = False
    has_flows: bool = False
    schema_files: int = 0
    data_files: int = 0
    data_file_names: list[str] = []
    collections: int = 0
    rows: int = 0


class MigrationStart(BaseModel):
    """Select which import phases to run (defaults: all)."""

    schema: bool = True
    data: bool = True
    files: bool = True
    flows: bool = True
    # start = from scratch; resume = skip completed data JSON files;
    # restart = ignore checkpoint and re-import all data files.
    mode: Literal["start", "resume", "restart"] = "start"


class MigrationRunOut(BaseModel):
    id: int
    project_id: int
    target_id: int
    status: str
    phases: str
    error_detail: str | None = None
    summary: dict | None = None
    progress: dict | None = None
    log: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: int
    name: str
    note: str | None
    status: str
    source_cms: str | None
    created_at: datetime
    updated_at: datetime
    target_count: int = 0
    upload_count: int = 0
    source_file_count: int = 0

    model_config = {"from_attributes": True}


class ProjectDetail(ProjectOut):
    targets: list[DirectusTargetOut] = []
    uploads: list[ProjectUploadOut] = []
    source_files: list[ProjectSourceFileOut] = []
