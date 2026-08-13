import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.common import Page
from app.schemas.notification import NotificationOut, UnreadCountOut
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=Page[NotificationOut])
def list_notifications(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    rows, next_cursor = notification_service.list_notifications(db, user, cursor, limit)
    return {"data": rows, "next_cursor": next_cursor}


@router.get("/unread-count", response_model=UnreadCountOut)
def unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return {"count": notification_service.unread_count(db, user)}


@router.post("/read-all", status_code=204)
def mark_all_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    notification_service.mark_all_read(db, user)
    db.commit()


@router.post("/{notification_id}/read", status_code=204)
def mark_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    notification_service.mark_read(db, user, notification_id)
    db.commit()