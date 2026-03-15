from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user
from app.core.secrets import decrypt_secret, encrypt_secret
from app.db.session import get_db
from app.models import DirectusTarget, Project, ProjectSourceFile, ProjectUpload, User
from app.schemas import (
    DirectusTargetCreate,
    DirectusTargetOut,
    DirectusTargetUpdate,
    ProjectCreate,
    ProjectDetail,
    ProjectOut,
    ProjectSourceFileOut,
    ProjectUpdate,
    ProjectUploadOut,
)
from app.services.directus import probe_directus
from app.services.extract import process_or_schedule
from app.services.uploads import save_upload

router = APIRouter(prefix="/projects", tags=["projects"])


def _token_hint(plaintext: str) -> str:
    if len(plaintext) <= 4:
        return "••••"
    return f"••••{plaintext[-4:]}"


def _target_out(target: DirectusTarget) -> DirectusTargetOut:
    plaintext = decrypt_secret(target.token)
    return DirectusTargetOut(
        id=target.id,
        project_id=target.project_id,
        name=target.name,
        url=target.url,
        is_active=target.is_active,
        summary=target.summary,
        token_hint=_token_hint(plaintext),
        last_test_ok=target.last_test_ok,
        last_test_detail=target.last_test_detail,
        last_tested_at=target.last_tested_at,
        created_at=target.created_at,
    )


def _upload_out(upload: ProjectUpload) -> ProjectUploadOut:
    return ProjectUploadOut.model_validate(upload)


def _source_file_out(row: ProjectSourceFile) -> ProjectSourceFileOut:
    return ProjectSourceFileOut.model_validate(row)


def _project_out(project: Project) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        name=project.name,
        note=project.note,
        status=project.status,
        source_cms=project.source_cms,
        created_at=project.created_at,
        updated_at=project.updated_at,
        target_count=len(project.targets) if project.targets is not None else 0,
        upload_count=len(project.uploads) if project.uploads is not None else 0,
        source_file_count=(
            len(project.source_files) if project.source_files is not None else 0
        ),
    )


def _project_detail(project: Project) -> ProjectDetail:
    base = _project_out(project)
    return ProjectDetail(
        **base.model_dump(),
        targets=[_target_out(t) for t in (project.targets or [])],
        uploads=[_upload_out(u) for u in (project.uploads or [])],
        source_files=[_source_file_out(s) for s in (project.source_files or [])],
    )


def _get_owned_project(
    db: Session,
    user: User,
    project_id: int,
    *,
    with_targets: bool = False,
    with_uploads: bool = False,
    with_source_files: bool = False,
) -> Project:
    query = db.query(Project).filter(
        Project.id == project_id,
        Project.owner_id == user.id,
    )
    options = []
    if with_targets:
        options.append(joinedload(Project.targets))
    if with_uploads:
        options.append(joinedload(Project.uploads))
    if with_source_files:
        options.append(joinedload(Project.source_files))
    if options:
        query = query.options(*options)
    project = query.first()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


def _load_project_detail(db: Session, user: User, project_id: int) -> ProjectDetail:
    project = _get_owned_project(
        db,
        user,
        project_id,
        with_targets=True,
        with_uploads=True,
        with_source_files=True,
    )
    return _project_detail(project)


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectOut]:
    projects = (
        db.query(Project)
        .options(
            joinedload(Project.targets),
            joinedload(Project.uploads),
            joinedload(Project.source_files),
        )
        .filter(Project.owner_id == user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )
    return [_project_out(p) for p in projects]


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectDetail:
    project = Project(
        owner_id=user.id,
        name=payload.name,
        note=payload.note,
        source_cms=payload.source_cms,
        status="draft",
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _load_project_detail(db, user, project.id)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectDetail:
    return _load_project_detail(db, user, project_id)


@router.patch("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectDetail:
    project = _get_owned_project(db, user, project_id)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(project, key, value)
    db.commit()
    return _load_project_detail(db, user, project_id)


@router.post(
    "/{project_id}/uploads",
    response_model=list[ProjectUploadOut],
    status_code=status.HTTP_201_CREATED,
)
async def upload_project_files(
    project_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectUploadOut]:
    project = _get_owned_project(db, user, project_id)
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files provided",
        )

    saved: list[ProjectUpload] = []
    for upload in files:
        try:
            original_name, stored_name, size_bytes = await save_upload(
                project.id, upload
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

        row = ProjectUpload(
            project_id=project.id,
            original_name=original_name,
            stored_name=stored_name,
            size_bytes=size_bytes,
            content_type=upload.content_type,
            status="pending",
        )
        db.add(row)
        saved.append(row)

    db.commit()
    results: list[ProjectUploadOut] = []
    for row in saved:
        db.refresh(row)
        process_or_schedule(db, row)
        db.refresh(row)
        results.append(_upload_out(row))
    return results


@router.get("/{project_id}/uploads", response_model=list[ProjectUploadOut])
def list_project_uploads(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectUploadOut]:
    project = _get_owned_project(db, user, project_id, with_uploads=True)
    return [_upload_out(u) for u in project.uploads]


@router.get("/{project_id}/source-files", response_model=list[ProjectSourceFileOut])
def list_source_files(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ProjectSourceFileOut]:
    project = _get_owned_project(db, user, project_id, with_source_files=True)
    return [_source_file_out(s) for s in project.source_files]


@router.post(
    "/{project_id}/uploads/{upload_id}/extract",
    response_model=ProjectUploadOut,
)
def reextract_upload(
    project_id: int,
    upload_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProjectUploadOut:
    project = _get_owned_project(db, user, project_id, with_uploads=True)
    upload = next((u for u in project.uploads if u.id == upload_id), None)
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found",
        )
    if upload.status == "extracting":
        return _upload_out(upload)
    upload.status = "pending"
    upload.error_detail = None
    db.commit()
    db.refresh(upload)
    process_or_schedule(db, upload)
    db.refresh(upload)
    return _upload_out(upload)


@router.get("/{project_id}/targets", response_model=list[DirectusTargetOut])
def list_targets(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DirectusTargetOut]:
    project = _get_owned_project(db, user, project_id, with_targets=True)
    return [_target_out(t) for t in project.targets]


@router.post(
    "/{project_id}/targets",
    response_model=DirectusTargetOut,
    status_code=status.HTTP_201_CREATED,
)
def create_target(
    project_id: int,
    payload: DirectusTargetCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DirectusTargetOut:
    project = _get_owned_project(db, user, project_id, with_targets=True)
    make_active = payload.make_active or len(project.targets) == 0
    if make_active:
        for existing in project.targets:
            existing.is_active = False

    target = DirectusTarget(
        project_id=project.id,
        name=payload.name,
        url=payload.url.rstrip("/"),
        token=encrypt_secret(payload.token),
        is_active=make_active,
        summary="Not tested yet",
    )
    db.add(target)
    db.commit()
    db.refresh(target)
    return _target_out(target)


@router.patch(
    "/{project_id}/targets/{target_id}",
    response_model=DirectusTargetOut,
)
def update_target(
    project_id: int,
    target_id: int,
    payload: DirectusTargetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DirectusTargetOut:
    project = _get_owned_project(db, user, project_id, with_targets=True)
    target = next((t for t in project.targets if t.id == target_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target not found",
        )

    data = payload.model_dump(exclude_unset=True)
    make_active = data.pop("make_active", None)
    if "url" in data and data["url"] is not None:
        data["url"] = data["url"].rstrip("/")
    if "token" in data and data["token"] is not None:
        data["token"] = encrypt_secret(data["token"])
    for key, value in data.items():
        if value is not None:
            setattr(target, key, value)

    if make_active:
        for existing in project.targets:
            existing.is_active = existing.id == target.id

    db.commit()
    db.refresh(target)
    return _target_out(target)


@router.delete(
    "/{project_id}/targets/{target_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_target(
    project_id: int,
    target_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    project = _get_owned_project(db, user, project_id, with_targets=True)
    target = next((t for t in project.targets if t.id == target_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target not found",
        )

    was_active = target.is_active
    db.delete(target)
    db.flush()

    if was_active:
        remaining = (
            db.query(DirectusTarget)
            .filter(DirectusTarget.project_id == project.id)
            .order_by(DirectusTarget.id)
            .all()
        )
        if remaining:
            remaining[0].is_active = True

    db.commit()


@router.post(
    "/{project_id}/targets/{target_id}/activate",
    response_model=DirectusTargetOut,
)
def activate_target(
    project_id: int,
    target_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DirectusTargetOut:
    project = _get_owned_project(db, user, project_id, with_targets=True)
    target = next((t for t in project.targets if t.id == target_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target not found",
        )
    for existing in project.targets:
        existing.is_active = existing.id == target.id
    db.commit()
    db.refresh(target)
    return _target_out(target)


@router.post(
    "/{project_id}/targets/{target_id}/test",
    response_model=DirectusTargetOut,
)
def test_target(
    project_id: int,
    target_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DirectusTargetOut:
    """Probe Directus with the stored static token (GET /users/me)."""
    project = _get_owned_project(db, user, project_id, with_targets=True)
    target = next((t for t in project.targets if t.id == target_id), None)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target not found",
        )

    plaintext = decrypt_secret(target.token)
    result = probe_directus(target.url, plaintext)
    target.last_test_ok = result.ok
    target.last_tested_at = datetime.now(timezone.utc)
    target.last_test_detail = result.detail
    target.summary = result.summary
    db.commit()
    db.refresh(target)
    return _target_out(target)
