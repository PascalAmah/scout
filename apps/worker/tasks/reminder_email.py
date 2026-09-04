"""Opt-in reminder email task (Phase 4).

``send_reminder_emails`` (Celery Beat) turns a user's unread notifications into
a daily digest email, but only for users who opted in via
Settings → Account → "Email me a daily digest". Notifications are marked read
once the email is handed off, so the digest never repeats an item.
"""

import logging
from datetime import UTC, datetime

from celery import shared_task
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _session():
    from app.db.session import SessionLocal

    return SessionLocal()


@shared_task(name="send_reminder_emails")
def send_reminder_emails() -> dict:
    from app.models import Notification, User
    from app.services.email import digest_email_html, send_email

    db = _session()
    try:
        users = db.scalars(
            select(User).where(User.email_reminders_enabled.is_(True))
        ).all()
        sent = skipped = 0
        for user in users:
            notifications = db.scalars(
                select(Notification)
                .where(
                    Notification.user_id == user.id,
                    Notification.read_at.is_(None),
                )
                .order_by(Notification.created_at.asc())
            ).all()
            if not notifications:
                skipped += 1
                continue

            items = [(n.title, n.body or "") for n in notifications]
            send_email(
                user.email,
                "Your Scout digest",
                digest_email_html(items),
            )
            now = datetime.now(UTC)
            for n in notifications:
                n.read_at = now
            db.commit()
            logger.info("digest emailed to %s (%d items)", user.email, len(items))
            sent += 1
        return {"status": "succeeded", "sent": sent, "no_items": skipped}
    except Exception as exc:
        logger.exception("send_reminder_emails failed")
        db.rollback()
        return {"status": "failed", "error": str(exc)[:500]}
    finally:
        db.close()
