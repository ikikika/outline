from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.router import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app import models  # noqa: F401 — register ORM models on Base.metadata

STATIC_DIR = Path(__file__).resolve().parents[1] / "static"


def _ensure_token_column_width() -> None:
    """Widen directus_targets.token so Fernet ciphertext fits (idempotent)."""
    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT DATA_TYPE
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'directus_targets'
                  AND COLUMN_NAME = 'token'
                """
            )
        ).first()
        if row is None:
            return
        if str(row[0]).lower() != "text":
            conn.execute(
                text("ALTER TABLE directus_targets MODIFY token TEXT NOT NULL")
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.token_encryption_key.strip():
        raise RuntimeError(
            "TOKEN_ENCRYPTION_KEY is required. Add it to .env "
            '(python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())").'
        )
    Base.metadata.create_all(bind=engine)
    _ensure_token_column_width()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

if STATIC_DIR.is_dir():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        if full_path:
            candidate = (STATIC_DIR / full_path).resolve()
            if candidate.is_relative_to(STATIC_DIR.resolve()) and candidate.is_file():
                return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
