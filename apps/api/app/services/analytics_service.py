"""analytics_service — Insight Layer (Phase 5) queries.

Metrics are snapshot-based, computed from the current ``applications`` rows
(no status-history table exists yet). Two state-machine facts keep the
snapshot honest:

- ``rejected`` is only reachable from ``interview``, so a rejected
  application counts as having reached the interview stage.
- ``archived`` is reachable from any state, and its deepest reached stage
  isn't recorded, so archived applications are excluded from the funnel and
  from response-rate denominators.

Period membership is by ``created_at`` (an application "enters the period"
when it's created); the response-rate series buckets by ``applied_at``.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Application, Outreach
from app.schemas.analytics import (
    AnalyticsSummaryOut,
    FunnelConversionOut,
    FunnelOut,
    FunnelStageOut,
    RatePoint,
    StageResponseTime,
)

_STATUS_ORDER = ("saved", "interested", "applied", "interview", "offer", "rejected")

# Deepest stage each status is known to have reached. ``rejected`` is only
# reachable from ``interview`` (state machine), so it ranks as interview.
_REACHED_RANK = {
    "saved": 0,
    "interested": 1,
    "applied": 2,
    "interview": 3,
    "offer": 4,
    "rejected": 3,
}
_APPLIED_RANK = _REACHED_RANK["applied"]
_INTERVIEW_RANK = _REACHED_RANK["interview"]
_OFFER_RANK = _REACHED_RANK["offer"]
_FUNNEL_STAGES = ("saved", "interested", "applied", "interview", "offer")

_WEEK = timedelta(days=7)


def _reached(status: str, rank: int) -> bool:
    current = _REACHED_RANK.get(status)
    return current is not None and current >= rank


def _pct(part: int, whole: int) -> float | None:
    if whole <= 0:
        return None
    return round(part / whole * 100, 1)


def _utc(dt: datetime) -> datetime:
    # SQLite drops tzinfo on read; the app writes UTC, so treat naive as UTC.
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


def _period_applications(
    db: Session,
    user_id,
    start: datetime,
    end: datetime,
    source: str | None,
) -> list[Application]:
    """Applications relevant to [start, end): created in-period, or applied
    in-period (the series needs apps created earlier that were applied to
    during the window)."""
    start, end = _utc(start), _utc(end)
    stmt = (
        select(Application)
        .where(Application.user_id == user_id, Application.status != "archived")
        .options(selectinload(Application.startup))
        .where(
            or_(
                and_(Application.created_at >= start, Application.created_at < end),
                and_(
                    Application.applied_at.is_not(None),
                    Application.applied_at >= start,
                    Application.applied_at < end,
                ),
            )
        )
    )
    rows = list(db.scalars(stmt).all())
    if source:
        rows = [row for row in rows if row.startup is not None and row.startup.source == source]
    return rows


@dataclass
class _Metrics:
    applied: int
    interview: int
    offer: int
    responses: int
    by_status: dict[str, int]


def _metrics(apps: list[Application]) -> _Metrics:
    counter = Counter(row.status for row in apps if row.status != "archived")
    # Always emit every status key so the client gets a stable shape.
    by_status = {status: counter.get(status, 0) for status in _STATUS_ORDER}
    applied = sum(1 for row in apps if _reached(row.status, _APPLIED_RANK))
    interview = sum(1 for row in apps if _reached(row.status, _INTERVIEW_RANK))
    offer = sum(1 for row in apps if _reached(row.status, _OFFER_RANK))
    return _Metrics(
        applied=applied,
        interview=interview,
        offer=offer,
        responses=interview,
        by_status=dict(by_status),
    )


def _rate_series(apps: list[Application], start: datetime, end: datetime) -> list[RatePoint]:
    start, end = _utc(start), _utc(end)
    if end <= start:
        return []
    points: list[RatePoint] = []
    cursor = start
    while cursor < end:
        bucket_end = min(cursor + _WEEK, end)
        in_bucket: list[Application] = []
        for row in apps:
            applied_at = row.applied_at
            if applied_at is None:
                continue
            applied_at = _utc(applied_at)
            if cursor <= applied_at < bucket_end:
                in_bucket.append(row)
        applied = len(in_bucket)
        responses = sum(1 for row in in_bucket if _reached(row.status, _INTERVIEW_RANK))
        points.append(
            RatePoint(
                bucket=cursor.date().isoformat(),
                applied=applied,
                responses=responses,
                rate=_pct(responses, applied),
            )
        )
        cursor = bucket_end
    return points


def summary(
    db: Session,
    user_id,
    start: datetime,
    end: datetime,
    source: str | None,
) -> AnalyticsSummaryOut:
    start, end = _utc(start), _utc(end)
    span = end - start
    prev_start = start - span

    cur = _metrics(_period_applications(db, user_id, start, end, source))
    prev = _metrics(_period_applications(db, user_id, prev_start, start, source))

    return AnalyticsSummaryOut(
        period_start=start,
        period_end=end,
        applications_sent=cur.applied,
        applications_sent_prev=prev.applied,
        response_rate=_pct(cur.responses, cur.applied),
        response_rate_prev=_pct(prev.responses, prev.applied),
        applied_to_interview=_pct(cur.interview, cur.applied),
        applied_to_interview_prev=_pct(prev.interview, prev.applied),
        offers=cur.offer,
        offers_prev=prev.offer,
        by_status=cur.by_status,
        response_rate_series=_rate_series(_period_applications(db, user_id, start, end, source), start, end),
    )


def funnel(
    db: Session,
    user_id,
    start: datetime,
    end: datetime,
    source: str | None,
) -> FunnelOut:
    start, end = _utc(start), _utc(end)
    apps: list[Application] = []
    for row in _period_applications(db, user_id, start, end, source):
        created_at = _utc(row.created_at)
        if start <= created_at < end:
            apps.append(row)

    counts = {stage: 0 for stage in _FUNNEL_STAGES}
    for row in apps:
        rank = _REACHED_RANK.get(row.status)
        if rank is None:
            continue
        for stage, stage_rank in (
            ("saved", 0),
            ("interested", 1),
            ("applied", 2),
            ("interview", 3),
            ("offer", 4),
        ):
            if rank >= stage_rank:
                counts[stage] += 1

    stages = [
        FunnelStageOut(stage=stage, count=counts[stage]) for stage in _FUNNEL_STAGES
    ]
    conversions = [
        FunnelConversionOut(
            from_stage="saved",
            to_stage="interested",
            rate=_pct(counts["interested"], counts["saved"]),
        ),
        FunnelConversionOut(
            from_stage="interested",
            to_stage="applied",
            rate=_pct(counts["applied"], counts["interested"]),
        ),
        FunnelConversionOut(
            from_stage="applied",
            to_stage="interview",
            rate=_pct(counts["interview"], counts["applied"]),
        ),
        FunnelConversionOut(
            from_stage="interview",
            to_stage="offer",
            rate=_pct(counts["offer"], counts["interview"]),
        ),
    ]
    return FunnelOut(stages=stages, conversions=conversions)


def response_times(
    db: Session,
    user_id,
    start: datetime,
    end: datetime,
    source: str | None,
) -> list[StageResponseTime]:
    """Average time from first outreach to a recorded reply, grouped by company
    stage ("Time to first response"). Reply time is the replied outreach's
    ``updated_at`` — the moment the user marked it replied (no explicit reply
    timestamp exists). Contact time is the earliest ``sent_at``, falling back
    to ``applied_at``. Stages without any recorded reply are omitted."""
    apps = _period_applications(db, user_id, start, end, source)
    buckets: dict[str, list[float]] = defaultdict(list)

    for app in apps:
        if app.startup is None or not app.startup.stage:
            continue
        replied = db.scalars(
            select(Outreach).where(
                Outreach.application_id == app.id, Outreach.status == "replied"
            )
        ).all()
        if not replied:
            continue
        contact = db.scalar(
            select(func.min(Outreach.sent_at)).where(
                Outreach.application_id == app.id, Outreach.sent_at.is_not(None)
            )
        )
        base = _utc(contact) if contact else (_utc(app.applied_at) if app.applied_at else None)
        if base is None:
            continue
        reply_ts = min(_utc(r.updated_at) for r in replied)
        days = (reply_ts - base).total_seconds() / 86_400
        if days >= 0:
            buckets[app.startup.stage].append(days)

    rows = [
        StageResponseTime(
            stage=stage, avg_days=round(sum(values) / len(values), 1), sample=len(values)
        )
        for stage, values in buckets.items()
    ]
    rows.sort(key=lambda row: row.avg_days)
    return rows
