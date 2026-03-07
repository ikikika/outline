import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AuthSession, User


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(
    db: Session,
    user: User,
    *,
    remember: bool = False,
) -> tuple[str, AuthSession]:
    token = secrets.token_urlsafe(32)
    max_age = (
        settings.session_remember_max_age_seconds
        if remember
        else settings.session_max_age_seconds
    )
    session = AuthSession(
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=datetime.now(UTC) + timedelta(seconds=max_age),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return token, session


def get_session_by_token(db: Session, token: str) -> AuthSession | None:
    if not token:
        return None
    session = (
        db.query(AuthSession)
        .filter(AuthSession.token_hash == hash_session_token(token))
        .first()
    )
    if session is None:
        return None
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at < datetime.now(UTC):
        db.delete(session)
        db.commit()
        return None
    return session


def revoke_session(db: Session, token: str) -> None:
    session = get_session_by_token(db, token)
    if session is not None:
        db.delete(session)
        db.commit()
