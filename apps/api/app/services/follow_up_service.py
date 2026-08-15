"""follow_up_service — retention-loop queries shared by the scan task and API.

Follow-up is time-since-``applied_at`` based: an application is due when it is
still active (``applied``/``interview``), ``applied_at`` is past the threshold,
and no ``follow_up_due`` notification has already been raised for it (so the
scan never spams). Suggested copy is generated on demand by the worker
(``generate_follow_up``) — never auto-sent.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import exists, select
from sqlalchemy.orm import Session, selectinload

from app.models import Application, Notification

FOLLOW_UP_STATUSES = ("applied", "interview")
FOLLOW_UP_TYPE = "follow_up_due"


def has_follow_up_notice(db: Session, application_id: uuid.UUID) -> bool:
    return bool(
        db.scalar(
            select(
                exists().where(
                    Notification.type == FOLLOW_UP_TYPE,
                    Notification.entity_type == "application",
                    Notification.entity_id == application_id,
                )
            )
        )
    )


def due_applications(
    db: Session, user_id: uuid.UUID, threshold_days: int
) -> list[Application]:
    """Active applications past the follow-up threshold with no notice yet."""
    cutoff = datetime.now(UTC) - timedelta(days=threshold_days)
    rows = db.scalars(
        select(Application)
        .options(selectinload(Application.startup), selectinload(Application.job))
        .where(
            Application.user_id == user_id,
            Application.status.in_(FOLLOW_UP_STATUSES),
            Application.applied_at.is_not(None),
            Application.applied_at <= cutoff,
        )
        .order_by(Application.applied_at.asc())
    ).all()
    return [row for row in rows if not has_follow_up_notice(db, row.id)]


def days_since(dt: datetime) -> int:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return max(0, (datetime.now(UTC) - dt).days)


def raise_follow_up_notice(db: Session, application: Application) -> Notification:
    """Insert the ``follow_up_due`` notification for a due application."""
    company = application.startup.name if application.startup else "the company"
    role = application.job.title if application.job else "the role"
    applied_at = application.applied_at
    days = days_since(applied_at) if applied_at is not None else 0
    row = Notification(
        user_id=application.user_id,
        type=FOLLOW_UP_TYPE,
        entity_type="application",
        entity_id=application.id,
        title=f"Follow up on {role} @ {company}",
        body=(
            f"You applied {days} days ago. "
            "Consider sending a follow-up message."
        ),
    )
    db.add(row)
    return row
