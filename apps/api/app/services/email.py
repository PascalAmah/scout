import logging

import httpx

from app.config import settings
from app.services.email_templates import (
    digest_email_html,
    reset_password_html,
    welcome_email_html,
)

__all__ = ["send_email", "welcome_email_html", "reset_password_html", "digest_email_html"]

logger = logging.getLogger(__name__)


_SENDLIB_HEADERS = {"Content-Type": "application/json"}


def _sendlib_headers() -> dict[str, str]:
    return {**_SENDLIB_HEADERS, "Authorization": f"Bearer {settings.sendlib_api_key}"}


def send_email(to: str, subject: str, html: str) -> None:
    """Send a transactional email via Sendlib's REST API.

    No-op with a log line if SENDLIB_API_KEY is not configured, so local dev
    never hard-fails on signup. Uses httpx (not the stdlib urllib) because
    Sendlib sits behind a Cloudflare bot-check that blocks urllib's TLS
    fingerprint; httpx passes cleanly. HTML templates live in
    ``email_templates.py``.
    """
    if not settings.sendlib_api_key:
        logger.warning("SENDLIB_API_KEY not configured — skipping email to %s (%s)", to, subject)
        return
    payload = {
        "from": settings.email_from,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    try:
        resp = httpx.post(
            settings.sendlib_api_url,
            json=payload,
            headers=_sendlib_headers(),
            timeout=15,
        )
    except httpx.HTTPError as exc:
        logger.exception("Failed to reach Sendlib for %s: %s", to, exc)
        return
    if not resp.is_success:
        logger.error(
            "Failed to send email to %s — Sendlib responded HTTP %s %s. Body: %s",
            to,
            resp.status_code,
            resp.reason_phrase,
            resp.text[:500],
        )
