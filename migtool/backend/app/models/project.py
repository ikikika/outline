from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    source_cms: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    targets: Mapped[list["DirectusTarget"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="DirectusTarget.id",
    )
    uploads: Mapped[list["ProjectUpload"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectUpload.id",
    )
    source_files: Mapped[list["ProjectSourceFile"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectSourceFile.id",
    )
    migration_runs: Mapped[list["MigrationRun"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="MigrationRun.id",
    )


class ProjectUpload(Base):
    __tablename__ = "project_uploads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    original_name: Mapped[str] = mapped_column(String(255))
    stored_name: Mapped[str] = mapped_column(String(255))
    size_bytes: Mapped[int] = mapped_column(Integer)
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # pending | extracting | ready | failed
    status: Mapped[str] = mapped_column(String(32), default="pending")
    error_detail: Mapped[str | None] = mapped_column(String(512), nullable=True)
    extracted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    project: Mapped[Project] = relationship(back_populates="uploads")
    source_files: Mapped[list["ProjectSourceFile"]] = relationship(
        back_populates="upload",
        cascade="all, delete-orphan",
        order_by="ProjectSourceFile.id",
    )


class ProjectSourceFile(Base):
    __tablename__ = "project_source_files"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    upload_id: Mapped[int] = mapped_column(
        ForeignKey("project_uploads.id", ondelete="CASCADE"),
        index=True,
    )
    relative_path: Mapped[str] = mapped_column(String(1024))
    original_name: Mapped[str] = mapped_column(String(255))
    # json | ndjson | media | other
    kind: Mapped[str] = mapped_column(String(32), default="other")
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    project: Mapped[Project] = relationship(back_populates="source_files")
    upload: Mapped[ProjectUpload] = relationship(back_populates="source_files")


class DirectusTarget(Base):
    __tablename__ = "directus_targets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128))
    url: Mapped[str] = mapped_column(String(512))
    token: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    summary: Mapped[str | None] = mapped_column(String(512), nullable=True)
    last_test_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    last_test_detail: Mapped[str | None] = mapped_column(String(512), nullable=True)
    last_tested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    project: Mapped[Project] = relationship(back_populates="targets")
    migration_runs: Mapped[list["MigrationRun"]] = relationship(
        back_populates="target",
        cascade="all, delete-orphan",
        order_by="MigrationRun.id",
    )


class MigrationRun(Base):
    """One Directus import job against a prepared target directory."""

    __tablename__ = "migration_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
    )
    target_id: Mapped[int] = mapped_column(
        ForeignKey("directus_targets.id", ondelete="CASCADE"),
        index=True,
    )
    # pending | running | stopping | stopped | completed | failed
    status: Mapped[str] = mapped_column(String(32), default="pending")
    # Comma-separated phases requested: schema,data,files,flows
    phases: Mapped[str] = mapped_column(String(64), default="schema,data,files,flows")
    error_detail: Mapped[str | None] = mapped_column(String(512), nullable=True)
    summary_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Live checkpoint while running (processed/total, current file, …).
    progress_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Captured stdout/stderr from the import process (terminal output for UI).
    log_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    project: Mapped[Project] = relationship(back_populates="migration_runs")
    target: Mapped[DirectusTarget] = relationship(back_populates="migration_runs")
