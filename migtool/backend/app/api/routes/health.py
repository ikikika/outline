from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import HealthCheck

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


@router.get("/")
def root():
    return {"name": settings.app_name, "docs": "/docs"}


@router.post("/health/ping")
def ping_db(db: Session = Depends(get_db)):
    row = HealthCheck(note="ping")
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "note": row.note, "created_at": row.created_at}
