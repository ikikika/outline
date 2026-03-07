from datetime import UTC, datetime

from fastapi import Response

from app.core.config import settings
from app.models import AuthSession


def set_session_cookie(response: Response, token: str, session: AuthSession) -> None:
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    max_age = int((expires_at - datetime.now(UTC)).total_seconds())
    if max_age < 0:
        max_age = 0

    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=max_age,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
    )
