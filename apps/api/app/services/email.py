import logging

import resend

from app.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html: str) -> None:
    """Send a transactional email via Resend.

    No-op with a log line if RESEND_API_KEY is not configured, so local dev
    never hard-fails on signup. Phase 1 wraps this in a Celery task.
    """
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not configured — skipping email to %s (%s)", to, subject)
        return
    resend.api_key = settings.resend_api_key
    try:
        resend.Emails.send(
            {"from": settings.email_from, "to": [to], "subject": subject, "html": html}
        )
    except Exception:
        logger.exception("Failed to send email to %s", to)


def _shell(title: str, body: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#FAFAF8;font-family:Inter,Arial,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E5E3DC;border-radius:14px;padding:32px;">
        <tr><td style="padding-bottom:16px;font-family:Fraunces,Georgia,serif;font-size:20px;font-weight:600;">Scout</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;">{body}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
""".strip()


def welcome_email_html(full_name: str | None) -> str:
    greeting = full_name or "there"
    return _shell(
        "Welcome to Scout",
        f"""
        <p style="margin:0 0 12px;">Hi {greeting},</p>
        <p style="margin:0 0 12px;">Your Scout workspace is ready. Install the browser extension, then
        save your first startup — Scout will research it for you while you do something else.</p>
        <p style="margin:0;"><a href="{settings.web_app_url}" style="background:#1F2937;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;">Open your workspace</a></p>
        """,
    )


def reset_password_html(reset_url: str) -> str:
    return _shell(
        "Reset your Scout password",
        f"""
        <p style="margin:0 0 12px;">You asked to reset your password. This link is valid for one hour:</p>
        <p style="margin:0 0 12px;"><a href="{reset_url}" style="background:#1F2937;color:#FFFFFF;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;">Reset password</a></p>
        <p style="margin:0;color:#6B7280;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        """,
    )


def digest_email_html(items: list[tuple[str, str]]) -> str:
    """Daily reminder digest rendered from ``notifications`` rows.

    ``items`` is a list of ``(title, body)`` pairs; opt-in only via the worker.
    """
    if not items:
        body = "<p>You're all caught up — nothing needs your attention today.</p>"
    else:
        bullets = "".join(
            f'<li style="margin:10px 0;"><strong>{title}</strong><br>'
            f'<span style="color:#6B7280;font-size:14px;">{body}</span></li>'
            for title, body in items
        )
        body = (
            "<p>Here's what's happening in your Scout workspace:</p>"
            f'<ul style="list-style:none;padding:0;margin:0;">{bullets}</ul>'
        )
    return _shell("Your Scout digest", body)
