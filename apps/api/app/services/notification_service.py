import uuid
from datetime import UTC

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.pagination import cursor_page
from app.models import Notification, User


def notify(
    db: Session,
    user_id: uuid.UUID,
    type_: str,
    title: str,
    body: str | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> Notification:
    row = Notification(
        user_id=user_id,
        type=type_,
        title=title,
        body=body,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(row)
    return row


def list_notifications(
    db: Session,
    user: User,
    cursor: str | None,
    limit: int,
) -> tuple[list[Notification], str | None]:
    stmt = select(Notification).where(Notification.user_id == user.id)
    return cursor_page(db, stmt, Notification.created_at, Notification.id, cursor, limit)


def unread_count(db: Session, user: User) -> int:
    return db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == user.id, Notification.read_at.is_(None)
        )
    ) or 0


def mark_read(db: Session, user: User, notification_id: uuid.UUID) -> Notification:
    row = db.get(Notification, notification_id)
    if row is None or row.user_id != user.id:
        from app.core.errors import ScoutError

        raise ScoutError("NOTIFICATION_NOT_FOUND", "No notification found with that id.", status_code=404)
    if row.read_at is None:
        from datetime import datetime

        row.read_at = datetime.now(UTC)
    return row


def mark_all_read(db: Session, user: User) -> int:
    from datetime import datetime

    result = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.read_at.is_(None)
    ).update({"read_at": datetime.now(UTC)})
    return result or 0