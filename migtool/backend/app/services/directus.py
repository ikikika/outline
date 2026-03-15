"""Live probes against a Directus instance."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import httpx

_LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


@dataclass(frozen=True)
class DirectusProbeResult:
    ok: bool
    detail: str
    summary: str


def _running_in_container() -> bool:
    return Path("/.dockerenv").exists()


def _normalize_base_url(url: str) -> str:
    """Strip trailing slash and common Directus admin UI suffixes."""
    base = url.strip().rstrip("/")
    for suffix in ("/admin", "/admin/login"):
        if base.lower().endswith(suffix):
            base = base[: -len(suffix)].rstrip("/")
            break
    return base


def _probe_url(url: str) -> str:
    """
    When the API runs in Docker, localhost points at the container itself.
    Rewrite loopback hosts to the Docker Desktop / compose host gateway.
    """
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if not (_running_in_container() and host in _LOOPBACK_HOSTS):
        return url

    port = f":{parts.port}" if parts.port else ""
    netloc = f"host.docker.internal{port}"
    if parts.username is not None:
        userinfo = parts.username
        if parts.password is not None:
            userinfo = f"{userinfo}:{parts.password}"
        netloc = f"{userinfo}@{netloc}"
    return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))


def probe_directus(url: str, token: str, *, timeout: float = 10.0) -> DirectusProbeResult:
    """Validate URL + static token by calling GET /users/me."""
    base = _normalize_base_url(url)
    if not base.startswith(("http://", "https://")):
        return DirectusProbeResult(
            ok=False,
            detail="URL must start with http:// or https://",
            summary="Connection check failed",
        )
    if not token.strip():
        return DirectusProbeResult(
            ok=False,
            detail="Missing static token",
            summary="Connection check failed",
        )

    request_base = _probe_url(base)
    endpoint = f"{request_base}/users/me"
    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Accept": "application/json",
    }

    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            response = client.get(endpoint, headers=headers)
    except httpx.TimeoutException:
        return DirectusProbeResult(
            ok=False,
            detail="Timed out reaching Directus",
            summary="Connection check failed",
        )
    except httpx.RequestError as exc:
        hint = ""
        host = (urlsplit(base).hostname or "").lower()
        if host in _LOOPBACK_HOSTS and _running_in_container():
            hint = " · use host.docker.internal if this persists"
        return DirectusProbeResult(
            ok=False,
            detail=f"Unreachable · {exc.__class__.__name__}{hint}",
            summary="Connection check failed",
        )

    if response.status_code == 200:
        email = None
        try:
            data = response.json().get("data") or {}
            email = data.get("email") or data.get("first_name")
        except Exception:
            email = None
        who = f" as {email}" if email else ""
        return DirectusProbeResult(
            ok=True,
            detail=f"Authenticated{who}",
            summary="Connection ok · ready for setup",
        )

    if response.status_code in (401, 403):
        return DirectusProbeResult(
            ok=False,
            detail="Invalid or unauthorized static token",
            summary="Connection check failed",
        )

    if response.status_code == 404:
        return DirectusProbeResult(
            ok=False,
            detail="Not a Directus API ( /users/me returned 404 )",
            summary="Connection check failed",
        )

    return DirectusProbeResult(
        ok=False,
        detail=f"Directus responded HTTP {response.status_code}",
        summary="Connection check failed",
    )
