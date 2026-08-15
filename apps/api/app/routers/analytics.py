from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.analytics import AnalyticsSummaryOut, FunnelOut
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Matches the mockup's default "Last 8 weeks" window.
DEFAULT_WINDOW_DAYS = 56


def _window(from_: datetime | None, to: datetime | None) -> tuple[datetime, datetime]:
    end = to or datetime.now(UTC)
    start = from_ or (end - timedelta(days=DEFAULT_WINDOW_DAYS))
    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)
    if end.tzinfo is None:
        end = end.replace(tzinfo=UTC)
    return start, end


@router.get("/summary", response_model=AnalyticsSummaryOut)
def summary(
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = Query(default=None),
    source: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AnalyticsSummaryOut:
    """Applications, response rate, interviews, offers over a date range."""
    start, end = _window(from_, to)
    return analytics_service.summary(db, user.id, start, end, source)


@router.get("/funnel", response_model=FunnelOut)
def funnel(
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = Query(default=None),
    source: str | None = Query(default=None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FunnelOut:
    """Conversion funnel across CRM statuses (cumulative "reached stage")."""
    start, end = _window(from_, to)
    return analytics_service.funnel(db, user.id, start, end, source)
