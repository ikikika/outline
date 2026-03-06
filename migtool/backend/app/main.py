from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, engine, get_db
from app.models import HealthCheck


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


@app.get("/")
def root():
    return {"name": settings.app_name, "docs": "/docs"}


@app.post("/health/ping")
def ping_db(db: Session = Depends(get_db)):
    row = HealthCheck(note="ping")
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "note": row.note, "created_at": row.created_at}
