from datetime import datetime

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
